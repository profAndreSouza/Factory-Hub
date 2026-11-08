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

### 3.2. Estrutura de Tópicos
Padrão hierárquico adotado no Factory Hub:
```text
industria/{unidade}/{celula}/{dispositivo}/{tipo_mensagem}
Exemplo:
industria/sp/smartn1/torno-01/telemetria
industria/sp/smartn1/torno-01/alarmes
industria/sp/smartn1/torno-01/comandos
```

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

## 5. Exemplo de Código do Firmware ESP32 (Wokwi)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "broker.hivemq.com"; // ou endpoint AWS IoT Core
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESP32-SmartN1-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      client.subscribe("industria/smartn1/cmd");
    } else {
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Simulação de leitura de sensores
  float temperatura = 68.0 + (random(0, 50) / 10.0);
  float vibracao = 2.0 + (random(0, 30) / 10.0);
  int rpm = 3450 + random(-50, 50);

  StaticJsonDocument<200> doc;
  doc["device_id"] = "esp32-torno-01";
  doc["timestamp"] = millis() / 1000;
  doc["temperatura"] = temperatura;
  doc["vibracao"] = vibracao;
  doc["rpm"] = rpm;
  doc["status"] = (temperatura > 85.0) ? "WARNING" : "OPERATIONAL";

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("industria/smartn1/telemetria", buffer);

  delay(4000);
}
```

