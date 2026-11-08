# 📋 Especificação de Contratos de Dados e Interfaces

> **Documento Normativo:** Define formalmente os contratos de dados, formatos de payload, rotas REST e esquemas de banco para garantir a perfeita integração entre os microserviços do Factory Hub.

---

## 1. Contrato MQTT (Borda -> Nuvem)

### 1.1. Tópico de Telemetria
- **Tópico:** `industria/smartn1/telemetria`
- **Protocolo:** MQTT v3.1.1 / MQTTS (Porta 8883)
- **QoS:** 0 ou 1
- **Payload JSON:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IndustrialTelemetryPayload",
  "type": "object",
  "required": ["device_id", "timestamp", "temperatura", "vibracao", "rpm", "status", "pecas_produzidas", "pecas_defeito"],
  "properties": {
    "device_id": { "type": "string", "example": "esp32-torno-01" },
    "timestamp": { "type": "integer", "description": "Unix Epoch em segundos", "example": 1715428800 },
    "temperatura": { "type": "number", "minimum": 0, "maximum": 150, "example": 72.4 },
    "vibracao": { "type": "number", "minimum": 0, "maximum": 50, "example": 2.35 },
    "rpm": { "type": "integer", "minimum": 0, "maximum": 10000, "example": 3480 },
    "status": { "type": "string", "enum": ["OPERATIONAL", "WARNING", "CRITICAL", "STOPPED"] },
    "pecas_produzidas": { "type": "integer", "minimum": 0, "example": 145 },
    "pecas_defeito": { "type": "integer", "minimum": 0, "example": 3 }
  }
}
```

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
  "modelo_versao": "mlp-v1.2",
  "timestamp_analise": 1715428805
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
  "pecas_refugo": 9
}
```

---

### 3.3. Proxy de Inferência: `POST /api/v1/predicoes`
O navegador envia a solicitação somente ao backend Java. O backend valida o payload, chama internamente o serviço Flask (`POST /predict`) e devolve a resposta ao frontend. O endereço do Flask não deve ser exposto nem configurado no bundle do navegador.

**Requisição:** mesmo formato do contrato Flask, com `device_id`, `temperatura`, `vibracao` e `rpm`.

**Resposta:** mesmo formato da resposta Flask, incluindo `status_previsto`, `probabilidade_falha`, `recomendacao` e `modelo_versao`.

### 3.4. Saúde dos Serviços: `GET /api/v1/health`
O backend agrega o estado dos componentes e fornece a lista exibida pelo frontend. Inclua pelo menos nome, estado e, quando disponível, latência. O backend é a única fonte do estado do Flask, banco, broker e demais serviços.

```json
{
  "services": [
    { "name": "Backend Java", "status": "UP", "latency_ms": 12 },
    { "name": "Flask AI", "status": "DEGRADED", "latency_ms": 310 },
    { "name": "PostgreSQL", "status": "UP", "latency_ms": 8 }
  ]
}
```

Estados esperados: `UP`/`ONLINE`, `DEGRADED` e `DOWN`/`OFFLINE`. O frontend normaliza esses nomes para apresentação, sem gerar verificações de saúde locais.

## 4. Esquema de Banco de Dados (RDS PostgreSQL)

```sql
-- Cadastro de Ativos Industriais
CREATE TABLE IF NOT EXISTS maquinas (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    capacidade_nominal_hora INT NOT NULL DEFAULT 60,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Consolidações de Indicadores OEE por Turno
CREATE TABLE IF NOT EXISTS consolidados_oee (
    id BIGSERIAL PRIMARY KEY,
    maquina_id VARCHAR(50) REFERENCES maquinas(id),
    data_referencia DATE NOT NULL,
    turno INT NOT NULL,
    disponibilidade NUMERIC(5,2) NOT NULL,
    performance NUMERIC(5,2) NOT NULL,
    qualidade NUMERIC(5,2) NOT NULL,
    oee_geral NUMERIC(5,2) NOT NULL,
    pecas_produzidas INT NOT NULL,
    pecas_defeito INT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registro de Alertas e Manutenção Preditiva (Rede Neural)
CREATE TABLE IF NOT EXISTS alertas_ia (
    id BIGSERIAL PRIMARY KEY,
    maquina_id VARCHAR(50) REFERENCES maquinas(id),
    probabilidade_falha NUMERIC(5,4) NOT NULL,
    diagnostico VARCHAR(50) NOT NULL,
    recomendacao TEXT,
    reconhecido BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

