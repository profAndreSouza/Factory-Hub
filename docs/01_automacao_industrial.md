# ⚡ Referência Técnica: Automação Industrial & IIoT

> **Unidade Curricular:** Automação Industrial (80 horas / 20 Semanas)  
> **Objetivo:** Projetar a coleta, tratamento preliminar e transmissão segura de sinais industriais do chão de fábrica (OT) para sistemas em nuvem (IT).

---

## 1. Convergência TI/TA e Pirâmide ISA-95

O modelo **ANSI/ISA-95** padroniza a interface entre sistemas corporativos de TI e sistemas de controle de chão de fábrica (OT):

| Nível ISA-95 | Descrição | No Ecossistema Factory Hub |
|---|---|---|
| **Nível 4** | Planejamento de Recursos Empresariais (ERP) | Nuvem AWS (EC2, RDS PostgreSQL, relatórios executivos). |
| **Nível 3** | Gerenciamento de Operações de Manufatura (MES) | Backend Java (Spring Boot) calculando indicadores OEE e consolidações. |
| **Nível 2** | Supervisão de Processo e SCADA | Gateway Node-RED realizando filtragem de histerese e observabilidade local. |
| **Nível 1** | Controle Básico e Aquisição de Dados (CLP) | Microcontrolador ESP32 processando sinais digitais e analógicos. |
| **Nível 0** | Processo Físico de Manufatura | Sensores (temperatura, vibração, RPM) e atuadores na célula de usinagem. |

---

## 2. Tipos de Sensores e Sinais Industriais

### 2.1. Classificação dos Sinais
- **Sinais Discretos (Digitais - 24V DC):**
  - Estados binários (0 ou 1, Aberto ou Fechado).
  - Exemplos: Chave fim de curso mecânica, sensor óptico de barreira (contagem de peças produzidas e refugo), botão de parada de emergência.
  - Lógica de Chaveamento: **PNP** (chaveia o polo positivo $+24\text{V}$, *sourcing*) ou **NPN** (chaveia o polo de referência $0\text{V}$, *sinking*).
- **Sinais Analógicos Contínuos:**
  - Grandezas físicas variáveis representadas por tensão ($0\text{–}10\text{V}$) ou corrente ($4\text{–}20\text{mA}$).
  - Padrão da Indústria: $4\text{–}20\text{mA}$ é imune a ruídos eletromagnéticos em longas distâncias e detecta rompimento de cabo (se a leitura for $0\text{mA}$, o cabo está rompido).
  - Sensores típicos da célula Smart N1:
    - **Temperatura:** Termoresistência PT100 ou Termopar (Mancal do torno/fuso).
    - **Vibração:** Acelerômetro piezoelétrico triaxial (Velocidade RMS em $\text{mm/s}$).
    - **Velocidade:** Encoder rotativo incremental medindo RPM da árvore de usinagem.

---

## 3. Protocolo MQTT (Message Queuing Telemetry Transport)

O MQTT é um protocolo padrão ISO/IEC 20922 para IIoT sobre TCP/IP:

### 3.1. Arquitetura Pub/Sub
- **Publisher (Publicador):** O microcontrolador ESP32 publica os dados de sensores.
- **Broker (Intermediário):** Servidor central (AWS IoT Core ou Eclipse Mosquitto) que recebe e encaminha as mensagens.
- **Subscriber (Assinante):** Backend Java, Node-RED ou regras de nuvem que assinam tópicos de interesse.

### 3.2. Tópico implantado no AWS IoT Core
O Terraform criou uma regra IoT que escuta este tópico exato e encaminha cada JSON para SQS:
```text
industria/smartn1/telemetria
```
Para publicar do ESP32/Wokwi, use o **Device data endpoint** exibido em AWS IoT Core → Settings (hostname específico da conta), porta MQTT TLS `8883`, certificado e chave privada do dispositivo e Amazon Root CA 1. O endpoint também pode ser consultado com `aws iot describe-endpoint --endpoint-type iot:Data-ATS --query endpointAddress --output text --region us-east-1`. A regra IoT não cria a identidade do dispositivo: crie/registre certificado ativo e associe uma IoT Policy limitada a `iot:Connect` e `iot:Publish` neste tópico. Não coloque chave privada em repositório público.

O `device_id` deve corresponder a um cadastro existente no RDS: `esp32-torno-01`, `esp32-torno-02` ou `esp32-fresadora-01`.

### 3.3. Níveis de Garantia de Entrega (QoS)
- **QoS 0 (At Most Once):** A mensagem é enviada sem confirmação (*fire and forget*). Ideal para leituras contínuas de sensores a cada 3 segundos.
- **QoS 1 (At Least Once):** O broker responde com `PUBACK`. Garante que a mensagem chegue pelo menos uma vez (pode duplicar). Usado para contagem de peças e eventos de parada.
- **QoS 2 (Exactly Once):** Handshake de 4 vias (`PUBLISH` -> `PUBREC` -> `PUBREL` -> `PUBCOMP`). Utilizado em comandos críticos de acionamento.

---

## 4. Orquestração com Node-RED & Ciclo de Alertas

### 4.1. Papel do Node-RED na Arquitetura
O Node-RED opera como ferramenta de *flow-based programming* para:
1. Ingestão local de tópicos MQTT.
2. Tratamento de tipos de dados (conversão de strings brutas para números em JSON).
3. Injeção controlada de falhas em bancada didática para testes de estresse.

### 4.2. Processamento Stateful e Histerese
Para evitar que oscilações térmicas no limiar provoquem disparos intermitentes de alarmes (*flapping*), aplica-se a técnica de banda morta (*deadband*) com contagem de persistência:
- **Disparo de Alarme:** Se $\text{Temperatura} > 85^\circ\text{C}$ durante 3 ciclos de leitura sucessivos.
- **Normalização de Alarme:** Apenas quando $\text{Temperatura} < 78^\circ\text{C}$.

---

## 5. Payload de telemetria para o firmware ESP32 (Wokwi)

Publique no tópico `industria/smartn1/telemetria` um JSON com este formato (campos obrigatórios: `device_id`, `temperatura`, `vibracao` e `rpm`):

```json
{
  "device_id": "esp32-torno-01",
  "machine_type": "USINAGEM",
  "timestamp": 1794144000,
  "temperatura": 72.8,
  "vibracao": 2.45,
  "rpm": 3480,
  "status": "OPERATIONAL",
  "pecas_produzidas": 15,
  "pecas_defeito": 1
}
```

`timestamp` é Unix Epoch em segundos (UTC), obtido por NTP; `millis()/1000` não é um horário válido. Se omitido, a Lambda usa o instante em que recebeu a mensagem. `status`, `machine_type`, `pecas_produzidas` e `pecas_defeito` são opcionais. Se o status for omitido, a Lambda calcula `CRITICAL` com temperatura ≥ 90 °C ou vibração ≥ 7 mm/s, `WARNING` com temperatura ≥ 80 °C ou vibração ≥ 4,5 mm/s e `OPERATIONAL` nos demais casos.

O hostname do broker é específico da conta: abra **AWS IoT Core → Settings → Device data endpoint**, ou consulte via AWS CLI conforme a seção 3.2. No Wokwi, habilite a conexão TLS na porta `8883` e configure o certificado/chave do dispositivo e o Amazon Root CA 1. O sketch anterior usava HiveMQ sem TLS e `millis()/1000`; não corresponde ao pipeline AWS provisionado.

Exemplo do JSON serializado com ArduinoJson:

```cpp
#include <ArduinoJson.h>
StaticJsonDocument<256> doc;
doc["device_id"] = "esp32-torno-01";
doc["machine_type"] = "USINAGEM";
doc["timestamp"] = unixEpochSeconds; // horário UTC obtido via NTP
doc["temperatura"] = 72.8;
doc["vibracao"] = 2.45;
doc["rpm"] = 3480;
doc["status"] = "OPERATIONAL";
doc["pecas_produzidas"] = 15;
doc["pecas_defeito"] = 1;
char payload[256];
serializeJson(doc, payload);
client.publish("industria/smartn1/telemetria", payload, false);
```

