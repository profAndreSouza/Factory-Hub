# 🚀 Referência Técnica: Integração e Entrega Contínua (DevOps)

> **Unidade Curricular:** Integração e Entrega Contínua — DevOps (40 horas / 20 Semanas)  
> **Objetivo:** Estabelecer uma esteira automatizada de build, testes, empacotamento em contêineres versionados e entrega contínua na AWS.

---

## 1. Princípios DevOps e Cultura CALMS

O ecossistema Factory Hub é fundamentado nos cinco pilares do framework **CALMS**:
- **Culture (Cultura):** Colaboração contínua entre desenvolvedores, cientistas de dados e engenheiros de automação.
- **Automation (Automação):** Eliminação de passos manuais de build, testes e deploy através do GitHub Actions.
- **Lean (Fluxo Enxuto):** Entregas frequentes em lotes pequenos (*small batches*) reduzindo o tempo de ciclo (*lead time*).
- **Measurement (Medição):** Observabilidade em tempo real com health-checks, logs estruturados e métricas de sistema.
- **Sharing (Compartilhamento):** Rastreabilidade total entre Issues, Pull Requests, Commits e Imagens Docker imutáveis.

---

## 2. Estratégia de Versionamento e Fluxo GitFlow

### 2.1. Topologia de Branches
```
main ─────────────●──────[v1.0.0]────────────────────────●──────[v1.1.0]───
                   \                                    /
release/v1.1.0      \                             ●────● (Homologação)
                     \                           /
develop ──────────────●────────●────────────────●──────────────────────────
                       \      /                /
feature/oee-calc        ●────●                /
                               \             /
feature/neural-flask            ●───────────●
```

- **`main`:** Contém o código estável em produção na EC2. Todo merge gera uma tag SemVer imutável.
- **`develop`:** Linha de integração principal. Novos merges disparam suíte de testes de integração.
- **`feature/<nome>`:** Branches temporárias para novas funcionalidades, criadas a partir de `develop`.
- **`release/vX.Y.Z`:** Preparação e estabilização para lançamento.
- **`hotfix/<nome>`:** Correções emergenciais em produção ramificadas diretamente de `main`.

### 2.2. Conventional Commits e SemVer
Todo commit deve seguir a padronização:
```text
<tipo>[escopo opcional][! se breaking change]: <descrição no imperativo>
```
- `feat(oee): adiciona cálculo de perda por velocidade` -> Incrementa **MINOR** (`1.1.0` -> `1.2.0`).
- `fix(mqtt): corrige reconexão em caso de timeout` -> Incrementa **PATCH** (`1.1.0` -> `1.1.1`).
- `feat(api)!: altera formato do payload de predição` -> Incrementa **MAJOR** (`1.1.0` -> `2.0.0`).

---

## 3. Piramide de Testes & Quality Gates

O projeto implementa testes unitarios para componentes React e logica de treinamento Flask, testes de integracao HTTP para a API Flask e endpoints Spring MVC, e testes E2E de navegacao no Chromium. Os testes de API usam fontes/servicos substitutos para nao depender de AWS, RDS, InfluxDB ou Docker durante a validacao.

### Quality Gate Obrigatorio no CI
O workflow `ci.yml` chama o workflow reutilizavel `quality-gates.yml` em pull requests, pushes para `main`/`develop` e execucoes manuais. A publicacao manual chama os mesmos gates e so inicia o job de Docker Hub quando todos passam:

1. **Flask:** testes unitarios de preparacao temporal/treinamento e testes de integracao das rotas `/health`, `/model/info`, `/predict` e `/train`.
2. **Java:** testes de integracao HTTP e validacao dos contratos REST com MockMvc.
3. **React:** testes unitarios da navegacao, verificacao TypeScript e build de producao.
4. **E2E:** navegador Chromium abre o portal, navega entre modulos e verifica a pagina de automacao; as respostas da API sao isoladas com fixtures para testar o fluxo da interface.

Qualquer falha bloqueia o job `publish`, que depende de `quality-gates`. Configure tambem `quality-gates / Flask unit and integration tests`, `quality-gates / Java backend unit and API integration tests`, `quality-gates / React unit tests and production build` e `quality-gates / Browser end-to-end tests` como checks obrigatorios nas regras de branch se quiser bloquear merges.

---

## 4. Workflows do GitHub Actions

O repositório possui dois workflows separados:

1. `.github/workflows/deploy-ssm.yml` é acionado somente de forma manual em **Actions → Deploy through SSM → Run workflow**. Ele não constrói nem publica imagens. A EC2 baixa a tag `latest` já publicada no Docker Hub usando Systems Manager Run Command; o SSM Agent recebe o comando por conexão de saída HTTPS/443, sem abrir a porta 22. O workflow prepara Docker/Compose se necessário, clona o repositório caso `/opt/factoryhub` ainda não exista, lê os parâmetros de runtime no SSM, atualiza `.env` e executa:
   ```bash
   docker compose -f docker-compose.cloud.yml pull
   docker compose -f docker-compose.cloud.yml up -d --remove-orphans
   ```

2. `.github/workflows/terraform.yml` é iniciado manualmente e executa `init`, validação, `plan` e `apply` usando state remoto S3. O `apply` ocorre automaticamente após o `plan` dentro da mesma execução; iniciar o workflow provisiona recursos e pode gerar custos.

O deploy usa a imagem `latest` ja publicada no Docker Hub. Para publicar manualmente as imagens Flask, Java e React, execute `.github/workflows/publish-dockerhub.yml` em **Actions -> Publish images to Docker Hub -> Run workflow**, selecionando a branch `main`. Antes de publicar, o workflow executa os quatro quality gates. Somente com todos aprovados ele autentica no Docker Hub e publica `latest` e `sha-<commit>`. A publicacao nao executa o deploy; inicie `deploy-ssm.yml` depois que o build terminar. Os Secrets AWS usados no deploy incluem `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN`. As Repository variables necessarias para regiao, bucket do state e roles IAM estao documentadas em `terraform/README.md`. Renove as credenciais AWS Academy quando expirarem.
