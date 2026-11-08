# 📋 Plano de Implementação Detalhado — Factory Hub

> **Guia Passo a Passo de Execução Técnica** adaptado para o ecossistema educacional do **AWS Academy Learner Lab**.

---

## 🧭 Índice do Plano
1. [Diretrizes de Economia e Restrições do AWS Academy](#1-diretrizes-de-economia-e-restrições-do-aws-academy)
2. [Fase 1: Infraestrutura como Código com Terraform](#fase-1-infraestrutura-como-código-com-terraform)
3. [Fase 2: Firmware ESP32 no Wokwi e Ingestão no AWS IoT Core](#fase-2-firmware-esp32-no-wokwi-e-ingestão-no-aws-iot-core)
4. [Fase 3: Buffer SQS, Lambda e Backend Integrador Java](#fase-3-buffer-sqs-lambda-e-backend-integrador-java)
5. [Fase 4: Ciência de Dados & API de Predição com Redes Neurais](#fase-4-ciência-de-dados--api-de-predição-com-redes-neurais)
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
O ESP32 deve publicar a cada 3 a 5 segundos um JSON com campos compatíveis com a análise de Ciência de Dados e cálculo do OEE:
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

### 2.2. Simulação no Wokwi (`firmware/esp32_wokwi/sketch.ino`)
- Para conexões em simulador no navegador, a forma mais compatível e robusta com o AWS Academy é:
  - **Opção A (Direta com AWS IoT Core):** Usar MQTT over WebSockets ou TLS com a biblioteca `PubSubClient` / `WiFiClientSecure`.
  - **Opção B (Broker Didático / Bridge Node-RED):** Publicar em um broker Mosquitto local/EC2 ou HiveMQ e usar o Node-RED para injetar no AWS IoT Core.
- **Injeção de Estados:** No código C++, incluir uma lógica para alternar entre:
  - `OPERATIONAL`: Temperatura 60–75°C, vibração 1.5–3.0 mm/s, RPM ~3500.
  - `WARNING`: Temperatura 76–89°C, vibração 3.1–5.0 mm/s.
  - `ANOMALY / CRITICAL`: Temperatura > 90°C, vibração > 6.0 mm/s.

---

## Fase 3: Buffer SQS, Lambda e Backend Integrador Java

**Meta da Fase:** Consumir a SQS de forma resiliente com Lambda, persistir telemetria bruta no InfluxDB e consolidar regras de negócio no backend Java.

### 3.1. Consumo da fila e ingestão temporal com AWS Lambda
1. **Consumo SQS pela Lambda:**
   - A IoT Topic Rule envia os eventos para `factory-telemetry-queue`; ela não invoca a Lambda diretamente.
   - Configurar um event source mapping SQS para a função Lambda, com lote controlado, visibilidade compatível com o timeout da função, retentativas e DLQ.
   - Tornar o processamento idempotente para evitar duplicidade quando a SQS entregar uma mensagem novamente.
2. **Persistência temporal:** A Lambda valida o payload e grava cada medição bruta com timestamp no InfluxDB, para consultas históricas e treinamento de modelos.

### 3.2. Arquitetura do Backend Java (Spring Boot 3)
1. **Leitura e consolidação:**
   - Consultar as séries temporais no InfluxDB; o Java não consome a fila SQS.
   - Salvar no RDS PostgreSQL as tabelas `maquina`, `turno`, `apontamento_producao` e os indicadores consolidados `indicadores_oee`.
2. **Cálculo de Indicadores OEE (Motor de Regras):**
   - **Disponibilidade ($A$):** $\frac{\text{Tempo em OPERATIONAL}}{\text{Tempo Total Programado}}$
   - **Performance ($P$):** $\frac{\text{Peças Produzidas}}{\text{Meta Teórica do Período}}$
   - **Qualidade ($Q$):** $\frac{\text{Peças Boas}}{\text{Peças Totais}}$
   - $\text{OEE} = A \times P \times Q \times 100\%$
3. **Comunicação com a API de IA:**
   - Cliente HTTP (`WebClient` ou `RestClient`) invocando `POST http://ai-flask:5000/predict` para validar se os sensores indicam falha iminente.

---

## Fase 4: Ciência de Dados & API de Predição com Redes Neurais

**Meta da Fase:** Treinar um modelo de Rede Neural com base nos dados históricos e disponibilizar inferência online.

> **Entrega disponível no protótipo:** o serviço `ml-service` oferece `/predict`, `/health` e `/model/info`. No Docker Compose, o serviço `influx-seed` grava telemetria sintética no InfluxDB; o adapter `InfluxTrainingDataSource` consulta esse histórico e o modelo treinado fica no volume `ml-models`. O backend Java consulta as leituras no InfluxDB e encaminha as predições ao Flask. A MLP descrita abaixo permanece como uma alternativa futura de modelagem.

### 4.1. Metodologia CRISP-DM Aplicada
1. **Entendimento do Negócio:** Detectar anomalias térmicas e vibrações anormais antes que ocorra quebra de rolamentos.
2. **Preparação dos Dados:** Normalização com `StandardScaler` e criação de janelas temporais de $N$ leituras consecutivas.
3. **Modelagem:**
   - Arquitetura: **MLP (Multilayer Perceptron)** com 3 camadas ocultas (`Dense(64) -> Dropout(0.2) -> Dense(32) -> Dense(1, activation='sigmoid')`).
   - Treinamento utilizando PyTorch ou TensorFlow/Keras.
4. **Avaliação:** Matriz de Confusão, F1-Score, Recall (prioridade para não deixar falhas passarem despercebidas) e ROC-AUC.

### 4.2. API Python Flask (`ml-service/app.py`)
```python
from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# Carregar modelo e scaler treinados
model = joblib.load("model/neural_network_oee.joblib")
scaler = joblib.load("model/scaler.joblib")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "UP", "service": "factoryhub-ml-service"}), 200

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    temp = float(data.get("temperatura", 0))
    vib = float(data.get("vibracao", 0))
    rpm = float(data.get("rpm", 0))

    features = scaler.transform([[temp, vib, rpm]])
    prob = float(model.predict_proba(features)[0][1])

    is_anomaly = prob >= 0.70
    status = "RISCO_ANOMALIA" if is_anomaly else "NORMAL"

    return jsonify({
        "device_id": data.get("device_id"),
        "status_previsto": status,
        "probabilidade_falha": round(prob, 4),
        "recomendacao": "Inspecionar lubrificação e fixação" if is_anomaly else "Operação regular"
    }), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

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

**Meta da Fase:** Entrega automatizada do código até a instância EC2 na AWS.

### 6.1. Orquestração com Docker Compose (`docker-compose.yml` na EC2)
```yaml
version: '3.8'

services:
  timescaledb:
    image: timescale/timescaledb:latest-pg14
    container_name: factoryhub-tsdb
    restart: always
    environment:
      POSTGRES_DB: telemetria_db
      POSTGRES_USER: factory_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - tsdb_data:/var/lib/postgresql/data

  ai-service:
    image: ${DOCKER_USER}/factoryhub-ai-service:latest
    container_name: factoryhub-ai
    restart: always
    ports:
      - "5000:5000"

  backend-java:
    image: ${DOCKER_USER}/factoryhub-backend:latest
    container_name: factoryhub-backend
    restart: always
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://${RDS_HOST}:5432/factoryhub
      SPRING_DATASOURCE_USERNAME: ${RDS_USER}
      SPRING_DATASOURCE_PASSWORD: ${RDS_PASSWORD}
      AWS_REGION: us-east-1
      SQS_QUEUE_NAME: factoryhub-telemetria-queue
      AI_SERVICE_URL: http://ai-service:5000
    ports:
      - "8080:8080"
    depends_on:
      - ai-service
      - timescaledb

  frontend:
    image: ${DOCKER_USER}/factoryhub-frontend:latest
    container_name: factoryhub-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend-java

volumes:
  tsdb_data:
```

### 6.2. Workflow do GitHub Actions (`.github/workflows/deploy-ssm.yml`)

O workflow executavel e a fonte de verdade. Ele so publica imagens quando a mensagem do commit enviado a `main` inclui `- dockerhub publish`; publica as tags `latest` e `sha-<commit>`. Com `SSM_DEPLOY_ENABLED=true`, o mesmo commit publicado e implantado via SSM. O acionamento manual reaplica a imagem `latest` existente, sem publicar uma nova. Configure `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN` como secrets. Nenhuma chave SSH ou porta 22 e necessaria.

## Critérios de Validação e Checklist Final

- [ ] **Infraestrutura:** `terraform apply` executado com sucesso no AWS Academy usando roles/perfis preexistentes compativeis, com SSM Online.
- [ ] **Simulador Wokwi:** ESP32 enviando telemetria em formato JSON estável.
- [ ] **Roteamento IoT:** IoT Topic Rule entregando mensagens na fila SQS sem rejeição.
- [ ] **Consumo SQS:** Event source mapping acionando a Lambda; mensagens processadas e removidas da fila após persistência no InfluxDB, com falhas encaminhadas à DLQ.
- [ ] **Banco Temporal:** Leituras armazenadas com timestamp correto para consultas históricas.
- [ ] **Inteligência Artificial:** Endpoint `/predict` da API Flask respondendo com probabilidade de anomalia válida.
- [ ] **Consolidação de KPIs:** Métricas de Disponibilidade, Performance, Qualidade e OEE calculadas e gravadas no PostgreSQL.
- [ ] **Visualização:** Frontend React exibindo telemetria e KPIs atualizados.
- [ ] **CI/CD:** Commit na branch `main` executa testes, gera imagens no Docker Hub e atualiza a EC2 por SSM Run Command.

