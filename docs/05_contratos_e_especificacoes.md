# 📋 Especificação de Contratos de Dados e Interfaces

> **Documento Normativo:** Define formalmente os contratos de dados, formatos de payload, rotas REST e esquemas de banco para garantir a perfeita integração entre os microserviços do Factory Hub.

---

## 1. Contrato MQTT (Borda -> Nuvem)

### 1.1. Tópico de Telemetria
- **Tópico:** `industria/smartn1/telemetria`
- **Broker:** AWS IoT Core. Obtenha o hostname em **IoT Core → Settings → Device data endpoint** ou com `aws iot describe-endpoint --endpoint-type iot:Data-ATS --query endpointAddress --output text --region us-east-1`. Use somente o hostname, sem `https://`.
- **Protocolo:** MQTT v3.1.1 sobre TLS mútuo (MQTTS, porta 8883). O ESP32 precisa do certificado e da chave privada do dispositivo, além do Amazon Root CA 1. Configure uma IoT Policy que permita `iot:Connect` e `iot:Publish` somente para este dispositivo/tópico. O Terraform atual cria a regra MQTT, mas não cria certificados nem políticas de dispositivos.
- **QoS:** 1 recomendado para validar a entrega durante a simulação.
- **Payload JSON:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IndustrialTelemetryPayload",
  "type": "object",
  "required": ["device_id", "temperatura", "vibracao", "rpm"],
  "properties": {
    "device_id": { "type": "string", "example": "esp32-torno-01" },
    "machine_type": { "type": "string", "example": "USINAGEM" },
    "timestamp": { "type": "integer", "description": "Unix Epoch em segundos (UTC); não usar millis()/1000", "example": 1794144000 },
    "temperatura": { "type": "number", "minimum": 0, "maximum": 150, "example": 72.4 },
    "vibracao": { "type": "number", "minimum": 0, "maximum": 50, "example": 2.35 },
    "rpm": { "type": "integer", "minimum": 0, "maximum": 10000, "example": 3480 },
    "machine_state": { "type": "string", "enum": ["RUNNING", "STOPPED"], "description": "Estado operacional usado no cálculo de disponibilidade do OEE." },
    "status": { "type": "string", "enum": ["OPERATIONAL", "WARNING", "CRITICAL", "STOPPED"], "description": "Opcional; se omitido a Lambda calcula pelas faixas de temperatura e vibração." },
    "pecas_produzidas": { "type": "integer", "minimum": 0, "description": "Contador acumulado desde o início da execução do ESP32.", "example": 145 },
    "pecas_defeito": { "type": "integer", "minimum": 0, "description": "Contador acumulado de refugos desde o início da execução do ESP32.", "example": 3 }
  }
}
```

**Tópico exato:** `industria/smartn1/telemetria` (é o tópico da regra IoT que encaminha a mensagem para SQS). Para o Wokwi, configure o endpoint de dados da sua conta, porta `8883`, TLS com certificado/chave do dispositivo e Amazon Root CA 1. O `device_id` deve ser `esp32-torno-01`, `esp32-torno-02` ou `esp32-fresadora-01` para corresponder ao cadastro atual no RDS.

Exemplo de mensagem publicada:

```json
{
  "device_id": "esp32-torno-01",
  "machine_type": "USINAGEM",
  "timestamp": 1794144000,
  "temperatura": 72.8,
  "vibracao": 2.45,
  "rpm": 3480,
  "machine_state": "RUNNING",
  "status": "OPERATIONAL",
  "pecas_produzidas": 15,
  "pecas_defeito": 1
}
```

`timestamp` e Unix Epoch em segundos UTC. A Lambda preserva o instante recebido do dispositivo no campo InfluxDB `device_timestamp`, mas usa o horario de recebimento da mensagem no SQS como timestamp do ponto InfluxDB para garantir ordenacao e evitar que timestamps repetidos sobrescrevam leituras novas. Se o atributo `SentTimestamp` do SQS nao estiver disponivel, usa o timestamp enviado pelo dispositivo. `machine_state`, `status`, `machine_type`, `pecas_produzidas` e `pecas_defeito` sao opcionais para ingestao; para calcular OEE real, envie o estado e os dois contadores acumulados. A Lambda deriva `machine_state` de RPM se o campo for omitido. No firmware didatico atual, cada amostra a cada 3 s com RPM ativo representa uma peca e vibracao >= 7 mm/s marca essa peca como refugo.

Para criar o circuito com potenciômetros e publicar com TLS/QoS 1 no Wokwi, siga o [guia de montagem do ESP32](07_guia_esp32_wokwi.md).

---

## 2. Contrato da API de Ciência de Dados (Python Flask)

### 2.1. Rota de Inferência: `POST /predict`
- **Requisição:**
```json
{
  "device_id": "esp32-torno-01",
  "temperatura": 78.5,
  "vibracao": 4.2,
  "rpm": 3320
}
```
- **Resposta Sucesso (`200 OK`):**
```json
{
  "device_id": "esp32-torno-01",
  "status_previsto": "RISCO_ANOMALIA",
  "probabilidade_falha": 0.8421,
  "recomendacao": "Vibração elevada no eixo secundário. Agendar inspeção preventiva.",
  "modelo_versao": "random-forest-v1.1.0",
  "timestamp_analise": "2026-11-08T10:15:05Z",
  "source": "INFLUXDB"
}
```

### 2.2. Rota de Saúde: `GET /health`
- **Resposta Sucesso (`200 OK`):**
```json
{
  "status": "UP",
  "service": "factoryhub-ml-service",
  "uptime_seconds": 84210,
  "model_loaded": true
}
```

---

## 3. Contrato da API de Negócio (Java Spring Boot)

### 3.1. Listar Máquinas: `GET /api/v1/maquinas`
- **Resposta (`200 OK`):**
```json
[
  {
    "id": "esp32-torno-01",
    "nome": "Torno CNC Célula Smart N1",
    "tipo": "USINAGEM",
    "status_atual": "OPERATIONAL",
    "ultima_leitura": {
      "temperatura": 71.2,
      "vibracao": 2.1,
      "rpm": 3480,
      "data_hora": "2026-11-08T10:15:00Z"
    }
  }
]
```

### 3.2. Indicadores OEE: `GET /api/v1/indicadores/{deviceId}/oee?periodo=hoje`
- **Resposta (`200 OK`):**
```json
{
  "device_id": "esp32-torno-01",
  "periodo": "2026-11-08",
  "disponibilidade": 92.5,
  "performance": 96.0,
  "qualidade": 98.2,
  "oee": 87.2,
  "tempo_operando_minutos": 444,
  "tempo_parado_minutos": 36,
  "total_pecas": 480,
  "pecas_boas": 471,
  "pecas_refugo": 9,
  "origem": "LIVE_PARTIAL",
  "tempo_observado_segundos": 3600
}
```

O perfil cloud calcula o OEE a partir das leituras marcadas como `data_origin=LIVE` no InfluxDB. `LIVE_PARTIAL` significa cálculo sobre os intervalos observados no período consultado; intervalos entre amostras maiores que 9 s são excluídos das métricas. A fórmula é `OEE = disponibilidade × performance × qualidade`. O ciclo ideal didático é 3 s/peça (1.200 peças/h). Sem ao menos duas amostras próximas com contadores presentes, o backend devolve o snapshot RDS de demonstração, marcado `origem: "DEMO"`.

---

### 3.3. Proxy de Inferência: `POST /api/v1/predicoes`
O navegador envia a solicitação somente ao backend Java. O backend valida o payload, chama internamente o serviço Flask (`POST /predict`) e devolve a resposta ao frontend. O endereço do Flask não deve ser exposto nem configurado no bundle do navegador.

**Requisição:** mesmo formato do contrato Flask, com `device_id`, `temperatura`, `vibracao` e `rpm`.

**Resposta:** mesmo formato da resposta Flask, incluindo `status_previsto`, `probabilidade_falha`, `recomendacao` e `modelo_versao`.
No perfil cloud (`postgres,influx`), o adapter do backend encaminha a requisição ao Flask privado e persiste predições não operacionais como alertas no RDS. O perfil `mock` permanece disponível para desenvolvimento local offline. O modelo atual prediz a classe da proxima leitura registrada da maquina; o horario depende da frequencia de amostragem e nao representa um horizonte fixo em minutos.

### 3.4. Saúde dos Serviços: `GET /api/v1/health`
O backend agrega o estado dos componentes e fornece a lista exibida pelo frontend. Inclua pelo menos nome, estado e, quando disponível, latência. O backend é a única fonte do estado do Flask, banco, broker e demais serviços.

```json
{
  "services": [
    { "name": "Backend Java", "status": "UP", "source": "LIVE" },
    { "name": "Flask AI", "status": "UP", "latency_ms": 14, "source": "LIVE" },
    { "name": "RDS PostgreSQL", "status": "UP", "latency_ms": 8, "source": "LIVE" },
    { "name": "InfluxDB", "status": "UP", "latency_ms": 3, "source": "LIVE" },
    { "name": "AWS IoT Core / MQTT", "status": "UNKNOWN", "source": "NOT_MONITORED" }
  ]
}
```

Estados esperados: `UP`/`ONLINE`, `DEGRADED`, `DOWN`/`OFFLINE` e `UNKNOWN` quando a dependência não é monitorada. O frontend normaliza esses nomes para apresentação, sem gerar verificações de saúde locais.

No perfil cloud, Java consulta Flask, RDS e InfluxDB de verdade. O IoT Core encaminha mensagens pela regra IoT e SQS, mas seu estado de saúde não é consultado pela API e deve aparecer como `UNKNOWN` com `source: "NOT_MONITORED"`. Em execução offline, as dependências sem conexão podem aparecer como `MOCK`.

### 3.5. Adaptadores de dados no backend
No perfil cloud, os adapters ativos usam as origens abaixo:

| Dados | Destino esperado |
|---|---|
| Catálogo de máquinas, snapshots OEE e alertas | RDS PostgreSQL; OEE do dia é calculado a partir de telemetria LIVE quando há dados suficientes, com snapshot DEMO como fallback |
| Série temporal recente | InfluxDB; recebe a telemetria processada pela Lambda e também pode conter dados sintéticos de demonstração |
| Treinamento e inferência | Flask privado; treinamento lê o histórico do InfluxDB e predições são solicitadas pelo backend Java |

O perfil cloud ativa os adapters PostgreSQL, InfluxDB e Flask. Os adapters em `infrastructure/mock` são usados no perfil offline/local. Para o OEE didático, o período planejado corresponde ao intervalo coberto por amostras consecutivas (até 9 s); `RUNNING`/RPM ativo conta como tempo operando e `STOPPED`/RPM zero como parada. A capacidade ideal de 1.200 peças/hora decorre do ciclo simulado de uma peça a cada 3 s.

### 3.6. Treinamento do modelo
O frontend usa `POST /api/v1/treinamentos` para iniciar o retreino, `GET /api/v1/treinamentos/status` para acompanhar mensagens e metricas e `GET /api/v1/treinamentos/data-info` para consultar as medicoes atuais. A contagem e consultada a cada 15 segundos e retorna `raw_measurements`, `training_records`, `training_data_source` e `observed_at`. `training_records` representa pares temporais: uma leitura atual para prever a classe da proxima leitura da mesma maquina. A contagem do ultimo treino so muda quando um novo treinamento termina.

## 4. Esquema de Banco de Dados (RDS PostgreSQL)

O Flyway aplica o esquema em `backend-java/src/main/resources/db/migration/V1__operational_schema.sql`. As tabelas atuais são:

```sql
CREATE TABLE machines (
    device_id VARCHAR(120) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    machine_type VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oee_snapshots (
    device_id VARCHAR(120) NOT NULL REFERENCES machines(device_id),
    period_date DATE NOT NULL,
    availability NUMERIC(5, 2) NOT NULL CHECK (availability BETWEEN 0 AND 100),
    performance NUMERIC(5, 2) NOT NULL CHECK (performance BETWEEN 0 AND 100),
    quality NUMERIC(5, 2) NOT NULL CHECK (quality BETWEEN 0 AND 100),
    oee NUMERIC(5, 2) NOT NULL CHECK (oee BETWEEN 0 AND 100),
    operating_minutes INTEGER NOT NULL CHECK (operating_minutes >= 0),
    downtime_minutes INTEGER NOT NULL CHECK (downtime_minutes >= 0),
    total_parts INTEGER NOT NULL CHECK (total_parts >= 0),
    good_parts INTEGER NOT NULL CHECK (good_parts >= 0),
    scrap_parts INTEGER NOT NULL CHECK (scrap_parts >= 0),
    data_origin VARCHAR(20) NOT NULL DEFAULT 'MODEL',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (device_id, period_date)
);

CREATE TABLE alerts (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    device_id VARCHAR(120) NOT NULL REFERENCES machines(device_id),
    occurred_at TIMESTAMPTZ NOT NULL,
    failure_probability NUMERIC(6, 2) NOT NULL CHECK (failure_probability BETWEEN 0 AND 100),
    predicted_status VARCHAR(40) NOT NULL,
    recommendation TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    data_origin VARCHAR(20) NOT NULL DEFAULT 'MODEL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

