# 📋 Plano de Implementação Detalhado — Factory Hub

> **Guia Passo a Passo de Execução Técnica** adaptado para o ecossistema educacional do **AWS Academy Learner Lab**.

---

## 🧭 Índice do Plano
1. [Diretrizes de Economia e Restrições do AWS Academy](#1-diretrizes-de-economia-e-restrições-do-aws-academy)
2. [Fase 1: Infraestrutura como Código com Terraform](#fase-1-infraestrutura-como-código-com-terraform)
3. [Fase 2: Firmware ESP32 no Wokwi e Ingestão no AWS IoT Core](#fase-2-firmware-esp32-no-wokwi-e-ingestão-no-aws-iot-core)
4. [Fase 3: Buffer SQS e Backend Integrador Java](#fase-3-buffer-sqs-e-backend-integrador-java)
5. [Fase 4: Ciência de Dados & API de Predição com Redes Neurais](#fase-4-ciência-de-dados--api-de-predição-com-redes-neurais)
6. [Fase 5: Frontend Dashboard em React](#fase-5-frontend-dashboard-em-react)
7. [Fase 6: Pipeline de DevOps & CI/CD com GitHub Actions](#fase-6-pipeline-de-devops--cicd-com-github-actions)
8. [Critérios de Validação e Checklist Final](#critérios-de-validação-e-checklist-final)

---

## 1. Diretrizes de Economia e Restrições do AWS Academy

Ao executar projetos no **AWS Academy Learner Lab Sandbox**, atente-se às seguintes regras de ouro:

| Limitação do Sandbox | Impacto no Projeto | Solução Adotada |
|---|---|---|
| **Sem permissão `iam:CreateRole`** | Falha ao tentar criar IAM roles pelo Terraform | Usar a role pré-existente: `LabRole` (`arn:aws:iam::<ACCOUNT_ID>:role/LabRole`) ou `iam_instance_profile = "LabRole"`. |
| **Orçamento fixo (~$100)** | Créditos expiram e a conta é suspensa se gastar demais | Não provisionar NAT Gateways (~$32/mês), AWS Timestream ou Load Balancers gerenciados (~$20/mês). |
| **Banco de Séries Temporais** | AWS Timestream não possui Free Tier robusto e é tarifado por query | Rodar **TimescaleDB** ou **InfluxDB** em container Docker dentro da própria instância EC2 (custo zero adicional). |
| **Banco Relacional** | RDS Aurora ou instâncias grandes estouram o limite | Provisionar uma instância **Amazon RDS PostgreSQL** `db.t3.micro` Single-AZ no Free Tier. |
| **Instância Computacional** | Várias instâncias consomem créditos rapidamente | Uma única máquina virtual **Amazon EC2 `t3.small`** rodando todos os microserviços via `docker-compose`. |

---

## Fase 1: Infraestrutura como Código com Terraform

**Meta da Fase:** Criar a estrutura de nuvem completa com um único `terraform apply`.

### 1.1. Arquitetura Terraform
Na pasta `terraform/`, estruture os arquivos:
- `provider.tf`: Configuração do provider AWS (região `us-east-1`).
- `vpc.tf`: VPC, Internet Gateway, Subnet pública e Route Table.
- `security_groups.tf`: Security groups para SSH (22), Web (80, 443, 8080, 5000) e RDS (5432 apenas da EC2).
- `sqs.tf`: Fila `factory-telemetry-queue` e sua respectiva Dead Letter Queue (`factory-telemetry-dlq`).
- `iot.tf`: Regra de tópico do AWS IoT Core que encaminha dados diretamente para a fila SQS.
- `rds.tf`: Instância PostgreSQL `db.t3.micro`.
- `ec2.tf`: Instância `t3.small` associada à `LabRole`.

### 1.2. Exemplo de Configuração de Recursos Chave

#### `terraform/ec2.tf`
```hcl
resource "aws_instance" "app_server" {
  ami                  = "ami-0c7217cdde317cfec" # Amazon Linux 2023 em us-east-1
  instance_type        = "t3.small"
  iam_instance_profile = "LabRole" # Utiliza a role nativa do AWS Academy
  key_name             = var.key_pair_name
  subnet_id            = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              dnf install -y docker git
              systemctl enable --now docker
              usermod -aG docker ec2-user
              
              # Instalar Docker Compose v2
              mkdir -p /usr/local/lib/docker/cli-plugins
              curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
                -o /usr/local/lib/docker/cli-plugins/docker-compose
              chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
              EOF

  tags = {
    Name = "factoryhub-server"
  }
}
```

#### `terraform/iot_sqs_rule.tf`
```hcl
resource "aws_sqs_queue" "telemetry_queue" {
  name                      = "factoryhub-telemetria-queue"
  message_retention_seconds = 86400 # 1 dia
}

resource "aws_iot_topic_rule" "telemetry_to_sqs" {
  name        = "FactoryHubTelemetryRule"
  description = "Roteia telemetria industrial do IoT Core para a fila SQS"
  enabled     = true
  sql         = "SELECT * FROM 'industria/smartn1/telemetria'"
  sql_version = "2016-03-23"

  sqs {
    queue_url = aws_sqs_queue.telemetry_queue.id
    role_arn  = var.lab_role_arn # arn:aws:iam::<ACCOUNT_ID>:role/LabRole
    use_base64 = false
  }
}
```

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

## Fase 3: Buffer SQS e Backend Integrador Java

**Meta da Fase:** Consumir da SQS de forma resiliente, gravar histórico e consolidar regras de negócio.

### 3.1. Arquitetura do Backend Java (Spring Boot 3)
1. **Consumidor SQS:**
   - Usar `@SqsListener("factoryhub-telemetria-queue")` (via `io.awspring.cloud:spring-cloud-aws-starter-sqs`).
   - Processamento de mensagens em lotes (*batching*) para otimizar operações de I/O.
2. **Armazenamento Híbrido:**
   - **Banco Temporal (TimescaleDB / InfluxDB):** Inserir cada ponto bruto com granularidade de timestamp (para uso do time de Ciência de Dados).
   - **Banco Relacional (RDS PostgreSQL):** Salvar tabelas `maquina`, `turno`, `apontamento_producao` e a tabela consolidada `indicadores_oee`.
3. **Cálculo de Indicadores OEE (Motor de Regras):**
   - **Disponibilidade ($A$):** $\frac{\text{Tempo em OPERATIONAL}}{\text{Tempo Total Programado}}$
   - **Performance ($P$):** $\frac{\text{Peças Produzidas}}{\text{Meta Teórica do Período}}$
   - **Qualidade ($Q$):** $\frac{\text{Peças Boas}}{\text{Peças Totais}}$
   - $\text{OEE} = A \times P \times Q \times 100\%$
4. **Comunicação com a API de IA:**
   - Cliente HTTP (`WebClient` ou `RestClient`) invocando `POST http://ai-flask:5000/predict` para validar se os sensores indicam falha iminente.

---

## Fase 4: Ciência de Dados & API de Predição com Redes Neurais

**Meta da Fase:** Treinar um modelo de Rede Neural com base nos dados históricos e disponibilizar inferência online.

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

### 6.2. Workflow do GitHub Actions (`.github/workflows/ci-cd.yml`)
```yaml
name: FactoryHub CI/CD Pipeline

on:
  push:
    branches: [ "main" ]

jobs:
  test:
    name: Run Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Test Java Backend
        run: |
          cd backend-java
          mvn clean test

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Test Python AI Service
        run: |
          cd ml-service
          pip install -r requirements.txt pytest
          pytest tests/

  build-and-push:
    name: Build & Push Docker Images
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build & Push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend-java
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/factoryhub-backend:latest

      - name: Build & Push AI Service
        uses: docker/build-push-action@v5
        with:
          context: ./ml-service
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/factoryhub-ai-service:latest

      - name: Build & Push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend-react
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/factoryhub-frontend:latest

  deploy:
    name: Deploy to AWS EC2
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy Command
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/factoryhub
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
```

---

## Critérios de Validação e Checklist Final

- [ ] **Infraestrutura:** `terraform apply` executado com sucesso no AWS Academy usando a `LabRole`.
- [ ] **Simulador Wokwi:** ESP32 enviando telemetria em formato JSON estável.
- [ ] **Roteamento IoT:** IoT Topic Rule entregando mensagens na fila SQS sem rejeição.
- [ ] **Consumo SQS:** Backend Java processando mensagens e descarregando a fila.
- [ ] **Banco Temporal:** Leituras armazenadas com timestamp correto para consultas históricas.
- [ ] **Inteligência Artificial:** Endpoint `/predict` da API Flask respondendo com probabilidade de anomalia válida.
- [ ] **Consolidação de KPIs:** Métricas de Disponibilidade, Performance, Qualidade e OEE calculadas e gravadas no PostgreSQL.
- [ ] **Visualização:** Frontend React exibindo telemetria e KPIs atualizados.
- [ ] **CI/CD:** Commit na branch `main` executa testes, gera imagens no Docker Hub e atualiza a EC2 automaticamente.

