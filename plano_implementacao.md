# 📋 Plano de Implementação Detalhado — Factory Hub

> **Guia Passo a Passo de Execução Técnica** adaptado para o ecossistema educacional do **AWS Academy Learner Lab**.

---

## 🧭 Índice do Plano
1. [Diretrizes de Economia e Restrições do AWS Academy](#1-diretrizes-de-economia-e-restrições-do-aws-academy)
2. [Fase 1: Infraestrutura como Código com Terraform](#fase-1-infraestrutura-como-código-com-terraform)
3. [Fase 2: Firmware ESP32 no Wokwi e Ingestão no AWS IoT Core](#fase-2-firmware-esp32-no-wokwi-e-ingestão-no-aws-iot-core)
4. [Fase 3: Buffer SQS, Lambda e Backend Integrador Java](#fase-3-buffer-sqs-lambda-e-backend-integrador-java)
5. [Fase 4: Ciência de Dados & API de Predição com Random Forest](#fase-4-ciência-de-dados--api-de-predição-com-random-forest)
6. [Fase 5: Frontend Dashboard em React](#fase-5-frontend-dashboard-em-react)
7. [Fase 6: Pipeline de DevOps & CI/CD com GitHub Actions](#fase-6-pipeline-de-devops--cicd-com-github-actions)
8. [Critérios de Validação e Checklist Final](#critérios-de-validação-e-checklist-final)

---

## 1. Diretrizes de Economia e Restrições do AWS Academy

Ao executar projetos no **AWS Academy Learner Lab Sandbox**, atente-se às seguintes regras de ouro:

| Limitação do Sandbox | Impacto no Projeto | Solução Adotada |
|---|---|---|
| **IAM restrito** | O Learner Lab pode bloquear criacao/alteracao de roles | Informar perfis/roles preexistentes compativeis e validar `iam:PassRole`; nao assumir que `LabRole` atende todos os servicos. |
| **Orçamento fixo (~$100)** | Créditos expiram e a conta é suspensa se gastar demais | Não provisionar NAT Gateways (~$32/mês), AWS Timestream ou Load Balancers gerenciados (~$20/mês). |
| **Banco de Séries Temporais** | AWS Timestream não possui Free Tier robusto e é tarifado por query | Rodar **TimescaleDB** ou **InfluxDB** em container Docker dentro da própria instância EC2 (custo zero adicional). |
| **Banco Relacional** | RDS Aurora ou instâncias grandes estouram o limite | Provisionar uma instância **Amazon RDS PostgreSQL** `db.t3.micro` Single-AZ no Free Tier. |
| **Instância Computacional** | Várias instâncias consomem créditos rapidamente | Uma única máquina virtual **Amazon EC2 `t3.small`** rodando todos os microserviços via `docker-compose`. |

---

## Fase 1: Infraestrutura como Codigo com Terraform

**Meta:** provisionar a topologia AWS por APIs HTTPS, sem acesso SSH de entrada.

A implementacao executavel e o procedimento de revisao/aplicacao estao em [`terraform/README.md`](terraform/README.md). A pasta `terraform/` define VPC, EC2 com Docker e SSM Agent, RDS privado, SQS/DLQ, IoT Rule e Lambda consumidora. O fluxo e IoT Core -> SQS -> Lambda -> InfluxDB na EC2; Java permanece responsavel pela API e consolidacoes.

A EC2 nao recebe trafego na porta 22. A interface web usa 80; a Lambda acessa InfluxDB em 8086; PostgreSQL 5432 aceita conexoes apenas da EC2. SSM Agent inicia conexoes HTTPS/443 para Systems Manager. O Terraform recebe nomes/ARNs de perfis e roles existentes: `ec2_instance_profile_name`, `iot_sqs_role_arn` e `lambda_execution_role_arn`. Nao presuma que a `LabRole` atende os tres servicos.

Antes de qualquer `apply`, confirme credenciais validas com `aws sts get-caller-identity`, revise o plano e confirme que as roles permitem os servicos necessarios. Nao publique `terraform.tfstate`, `terraform.tfvars` ou planos.

---

## Fase 2: Firmware ESP32 no Wokwi e Ingestão no AWS IoT Core

**Meta da Fase:** Simular a máquina industrial e publicar leituras periódicas via MQTT seguro.

### 2.1. Payload Padronizado
O ESP32 deve publicar a cada 3 segundos um JSON com campos compatíveis com a análise de Ciência de Dados e cálculo do OEE:
```json
{
  "device_id": "esp32-torno-01",
  "timestamp": 1715428800,
  "temperatura": 71.5,
  "vibracao": 2.38,
  "rpm": 3480,
  "status": "OPERATIONAL",
  "pecas_produzidas": 10,
  "pecas_defeito": 0
}
```

### 2.2. Simulação no Wokwi
O circuito e firmware atuais estão em [`docs/07_guia_esp32_wokwi.md`](docs/07_guia_esp32_wokwi.md). O ESP32 publica diretamente no AWS IoT Core usando MQTTS na porta 8883, certificado do dispositivo, chave privada e Amazon Root CA 1. A IoT Rule envia para SQS; a Lambda consome a fila e grava no InfluxDB.

No modelo didático do firmware, cada publicação a cada 3 s com RPM ativo representa um ciclo/peça; `rpm == 0` representa parada; vibração ≥ 7 mm/s classifica o ciclo como refugo. Os contadores são acumulados na execução do ESP32 e reiniciam após reinício do simulador.
---

## Fase 3: Buffer SQS, Lambda e Backend Integrador Java

**Meta da Fase:** Consumir a SQS de forma resiliente com Lambda, persistir telemetria bruta no InfluxDB e consolidar regras de negócio no backend Java.

### 3.1. Consumo da fila e ingestão temporal com AWS Lambda
1. **Consumo SQS pela Lambda:**
   - A IoT Topic Rule envia os eventos para `factory-telemetry-queue`; ela não invoca a Lambda diretamente.
   - Configurar um event source mapping SQS para a função Lambda, com lote controlado, visibilidade compatível com o timeout da função, retentativas e DLQ.
   - Tornar o processamento idempotente para evitar duplicidade quando a SQS entregar uma mensagem novamente.
2. **Persistência temporal:** A Lambda valida o payload e grava cada medição bruta com timestamp no InfluxDB, para consultas históricas e treinamento de modelos.

### 3.2. Backend Java (Spring Boot 3)
- Java lê telemetria recente no InfluxDB; ele não consome a fila SQS.
- RDS PostgreSQL usa as tabelas `machines`, `oee_snapshots` e `alerts`, criadas pelo Flyway.
- O OEE cloud retorna `LIVE_PARTIAL` com dados `LIVE` quando há contadores e leituras suficientes; intervalos acima de 9 s são ignorados. O ciclo ideal didático é 3 s/peça. Sem dados suficientes, o backend usa o snapshot `DEMO` do RDS.
- O backend Java chama o Flask privado para predição e treinamento. Predições não operacionais são persistidas como alertas no RDS.
---

## Fase 4: Ciência de Dados & API de Predição com Random Forest

**Implementação atual:** o serviço Flask treina uma Random Forest com dados lidos do InfluxDB. O bucket pode conter histórico sintético de demonstração e telemetria `LIVE` recebida do ESP32. A alternativa MLP descrita em `docs/02_ciencia_de_dados.md` é conteúdo teórico, não o modelo executado.

### 4.1. Treinamento e avaliação
- `POST /train` inicia retreinamento em segundo plano com o histórico disponível no InfluxDB.
- `GET /training/status` retorna etapa, mensagens, progresso, quantidade de registros e métricas.
- O modelo atual continua atendendo inferências durante o treinamento e é substituído ao concluir.
- O botão **Treinar modelo** na página Ciência de Dados chama somente o backend Java; Java encaminha ao Flask.
- As métricas medem a classificação dos rótulos didáticos derivados das faixas de sensores; não equivalem a validação em falhas industriais reais.

### 4.2. Contrato e proxy de inferência
O endpoint Flask `POST /predict` recebe `device_id`, `temperatura`, `vibracao` e `rpm`. No navegador, a chamada é `POST /api/v1/predicoes` ao Java. O backend encaminha a inferência ao Flask privado e persiste no RDS as predições não operacionais como alertas.

Rotas auxiliares do Flask: `GET /health`, `GET /model/info` e `GET /training/status`. Consulte `ml-service/README.md` e `docs/05_contratos_e_especificacoes.md` para os contratos atuais.

---
## Fase 5: Frontend Dashboard em React

**Meta da Fase:** Interface visual intuitiva para monitoramento de chão de fábrica.

### 5.1. Recursos da Interface
- **Visão Geral em Tempo Real:** Cards com status das máquinas (Verde = Operacional, Amarelo = Atenção, Vermelho = Anomalia/Parada).
- **Gráficos Dinâmicos (Recharts / Chart.js):**
  - Gráfico de linha temporal de Temperatura e Vibração.
  - Gráfico gauge / radial de OEE (Disponibilidade, Performance, Qualidade).
- **Alertas Preditivos:** Tabela destacando máquinas sinalizadas pela API Flask com risco iminente de quebra.

---

## Fase 6: Pipeline de DevOps & CI/CD com GitHub Actions

**Implementação atual:** `docker-compose.cloud.yml` é a composição executada na EC2: InfluxDB, carga sintética inicial, Flask, Java e frontend React. Java usa RDS PostgreSQL privado; a Lambda consome SQS e grava telemetria no InfluxDB.

### 6.1. Workflows manuais
- `.github/workflows/terraform.yml`: provisiona/atualiza infraestrutura usando state remoto S3.
- `.github/workflows/publish-dockerhub.yml`: publica manualmente as imagens Flask, Java e React com tags `latest` e `sha-<commit>`.
- `.github/workflows/deploy-ssm.yml`: executa manualmente o deploy na EC2 via SSM Run Command; não depende de SSH/porta 22.

Fluxo recomendado após alterações: aplicar Terraform se houver mudanças de infraestrutura/Lambda; publicar imagens no Docker Hub; executar deploy SSM para atualizar os containers. Configure as credenciais AWS temporárias e credenciais Docker Hub nos GitHub Secrets, e região/bucket nas Variables.

### 6.2. Verificação funcional
- A página inicial recebe status do backend; dependências não monitoradas devem aparecer como `UNKNOWN` / `NOT_MONITORED`.
- Treinamento e predição passam pelo backend Java; o navegador não acessa Flask diretamente.
- Predições `ATENCAO`/`RISCO_ANOMALIA` no perfil cloud são gravadas em `alerts` no RDS.
- O OEE calculado com telemetria real é `LIVE_PARTIAL`, limitado aos intervalos observados; snapshot `DEMO` é fallback.

---
## Critérios de Validação e Checklist Final

- [ ] **Infraestrutura:** `terraform apply` executado com sucesso no AWS Academy usando roles/perfis preexistentes compativeis, com SSM Online.
- [ ] **Simulador Wokwi:** ESP32 enviando telemetria em formato JSON estável.
- [ ] **Roteamento IoT:** IoT Topic Rule entregando mensagens na fila SQS sem rejeição.
- [ ] **Consumo SQS:** Event source mapping acionando a Lambda; mensagens processadas e removidas da fila após persistência no InfluxDB, com falhas encaminhadas à DLQ.
- [ ] **Banco Temporal:** Leituras armazenadas com timestamp correto para consultas históricas.
- [ ] **Inteligência Artificial:** Endpoint Predição no frontend passando pelo Java/Flask; alerta não operacional persistido no RDS em perfil cloud.
- [ ] **Consolidação de KPIs:** OEE `LIVE_PARTIAL` calculado do InfluxDB com dados suficientes; snapshot `DEMO` identificado como fallback. Consolidação de turno integral depende de calendário e eventos operacionais.
- [ ] **Visualização:** Frontend React exibindo telemetria e KPIs atualizados.
- [ ] **CI/CD:** Workflows manuais de Terraform, publicação Docker Hub e deploy por SSM executados com sucesso.

