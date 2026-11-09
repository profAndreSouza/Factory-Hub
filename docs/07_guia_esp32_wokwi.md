# Guia prático: ESP32 e AWS IoT Core no Wokwi

Este exercício monta um ESP32 com três potenciômetros para simular temperatura, vibração e RPM. O firmware publica uma leitura a cada três segundos em AWS IoT Core usando MQTT sobre TLS e QoS 1. Para o OEE didático, cada publicação com RPM acima de zero representa um ciclo/peça; vibração a partir de 7 marca a peça como refugo.

Os potenciômetros são controles didáticos: não representam sensores industriais reais. O caminho da mensagem no Factory Hub é:

```text
ESP32/Wokwi → AWS IoT Core → IoT Rule → SQS → Lambda → InfluxDB
                                                        ↓
                                          Backend Java e frontend
```

## 1. Criar a identidade IoT

No AWS Console, selecione `us-east-1` e abra **AWS IoT Core → Manage → All devices → Things → Create things**:

1. Crie um único Thing com o nome `esp32-torno-01`.
2. Gere um certificado de dispositivo.
3. Baixe o certificado, a chave privada e o **Amazon Root CA 1**.
4. Confirme que o certificado está ativo e associado ao Thing.

O endpoint de dados é específico da conta. Consulte **AWS IoT Core → Settings → Device data endpoint** ou rode:

```bash
aws iot describe-endpoint \
  --endpoint-type iot:Data-ATS \
  --query endpointAddress \
  --output text \
  --region us-east-1
```

O endpoint da conta usada neste projeto é `a3046rr82t5yg4-ats.iot.us-east-1.amazonaws.com`. Se recriar a conta/laboratório, consulte novamente o endpoint e atualize o firmware.

## 2. Criar e anexar uma política MQTT

Em **AWS IoT Core → Security → Policies**, crie uma política que permita conectar somente com o client ID deste dispositivo e publicar somente no tópico de telemetria:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:us-east-1:722369519179:client/esp32-torno-01"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": "arn:aws:iot:us-east-1:722369519179:topic/industria/smartn1/telemetria"
    }
  ]
}
```

O número da conta `722369519179` é o da conta usada no projeto. Troque-o se estiver usando outra conta. Anexe a política ao certificado em **Actions → Attach policy** e confirme que o certificado está anexado ao Thing. O Terraform deste repositório cria a IoT Rule e a fila, mas não cria certificados nem políticas para dispositivos.

## 3. Montar o circuito no Wokwi

Crie um projeto **ESP32 Arduino** e use este `diagram.json`:

```json
{
  "version": 1,
  "author": "Factory Hub",
  "editor": "wokwi",
  "parts": [
    { "type": "wokwi-esp32-devkit-v1", "id": "esp", "top": 0, "left": 0, "attrs": {} },
    { "type": "wokwi-potentiometer", "id": "temp", "top": -120, "left": -170, "attrs": { "value": "491" } },
    { "type": "wokwi-potentiometer", "id": "vib", "top": 0, "left": -170, "attrs": { "value": "50" } },
    { "type": "wokwi-potentiometer", "id": "rpm", "top": 120, "left": -170, "attrs": { "value": "358" } }
  ],
  "connections": [
    ["temp:VCC", "esp:3V3", "red", []],
    ["temp:GND", "esp:GND.1", "black", []],
    ["temp:SIG", "esp:34", "green", []],
    ["vib:VCC", "esp:3V3", "red", []],
    ["vib:GND", "esp:GND.1", "black", []],
    ["vib:SIG", "esp:35", "green", []],
    ["rpm:VCC", "esp:3V3", "red", []],
    ["rpm:GND", "esp:GND.1", "black", []],
    ["rpm:SIG", "esp:32", "green", []]
  ]
}
```

GPIO 34, 35 e 32 são canais ADC1 do ESP32 clássico e podem ser usados junto com Wi-Fi. A conversão do sketch abaixo é didática: cada potenciômetro é escalado linearmente para uma faixa de engenharia.

| Potenciômetro | Pino | Faixa simulada |
|---|---:|---:|
| Temperatura | GPIO 34 | 0 a 150 °C |
| Vibração | GPIO 35 | 0 a 10 mm/s |
| RPM | GPIO 32 | 0 a 10.000 RPM |

## 4. Adicionar a biblioteca MQTT

Adicione pelo **Library Manager** do Wokwi a biblioteca **MQTT** de Joel Gaehwiler/256dpi. O projeto deve ter um `libraries.txt` com:

```text
MQTT
```

Essa biblioteca permite informar QoS na chamada `publish(topic, payload, retained, qos)`. O firmware usa QoS 1; AWS IoT Core suporta QoS 0 e 1, não QoS 2.

## 5. Guardar certificados sem publicá-los

Crie `secrets.h` com os conteúdos dos três arquivos PEM baixados. Preserve os cabeçalhos e rodapés PEM:

```cpp
#pragma once

static const char AWS_ROOT_CA[] = R"PEM(
COLE AQUI O CONTEÚDO DO AMAZON ROOT CA 1
)PEM";

static const char DEVICE_CERT[] = R"PEM(
COLE AQUI O CONTEÚDO DO CERTIFICADO DO DISPOSITIVO
)PEM";

static const char DEVICE_PRIVATE_KEY[] = R"PEM(
COLE AQUI O CONTEÚDO DA CHAVE PRIVADA
)PEM";
```

O arquivo pode começar com `BEGIN RSA PRIVATE KEY` ou `BEGIN PRIVATE KEY`; mantenha exatamente o formato fornecido pela AWS. Não publique `secrets.h` em Git nem em um projeto Wokwi público. Para desenvolvimento local, acrescente ao `.gitignore`:

```gitignore
secrets.h
*.key
certs/
```

O `.gitignore` do Factory Hub já ignora arquivos `*.pem`; esta alteração também ignora o header e a chave privada sugeridos aqui.

## 6. Firmware (`sketch.ino`)

O código conecta ao Wi-Fi virtual do Wokwi, sincroniza a hora por NTP para validar TLS e produzir timestamp UTC, conecta com certificado de cliente e publica a cada três segundos. Atualize `AWS_ENDPOINT` se o endpoint da conta mudar.

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <MQTT.h>
#include <time.h>
#include <math.h>
#include "secrets.h"

constexpr char WIFI_SSID[] = "Wokwi-GUEST";
constexpr char WIFI_PASSWORD[] = "";
constexpr char AWS_ENDPOINT[] =
    "a3046rr82t5yg4-ats.iot.us-east-1.amazonaws.com";
constexpr char DEVICE_ID[] = "esp32-torno-01";
constexpr char TOPIC[] = "industria/smartn1/telemetria";

constexpr int TEMP_PIN = 34;
constexpr int VIB_PIN = 35;
constexpr int RPM_PIN = 32;
constexpr unsigned long PUBLISH_INTERVAL_MS = 3000;
constexpr unsigned long RECONNECT_INTERVAL_MS = 5000;

WiFiClientSecure tls;
MQTTClient mqtt(1024);

unsigned long lastPublish = 0;
unsigned long lastReconnect = 0;
uint32_t totalParts = 0;
uint32_t scrapParts = 0;

bool connectMqtt() {
  Serial.println("Conectando ao AWS IoT Core...");

  // O client ID deve coincidir com o recurso iot:Connect da política.
  if (mqtt.connect(DEVICE_ID)) {
    Serial.println("MQTT conectado.");
    return true;
  }

  Serial.printf("Falha MQTT: erro=%d, retorno=%d\n",
                mqtt.lastError(), mqtt.returnCode());
  return false;
}

bool connectWifi() {
  Serial.println("\nConectando ao Wokwi-GUEST...");

  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf(
        "Wi-Fi não conectou. Status: %d\n",
        static_cast<int>(WiFi.status())
    );
    return false;
  }

  Serial.print("Wi-Fi conectado. IP: ");
  Serial.println(WiFi.localIP());
  Serial.printf("Sinal: %d dBm\n", WiFi.RSSI());

  return true;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // leitura simulada entre 0 e 4095

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  while (!connectWifi()) {
    Serial.println("Nova tentativa em 5 segundos...");
    delay(5000);
  }

  // TLS exige relógio correto para validar a cadeia de certificados.
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Sincronizando horário UTC");
  const unsigned long ntpStart = millis();
  while (time(nullptr) < 1700000000 && millis() - ntpStart < 30000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  tls.setCACert(AWS_ROOT_CA);
  tls.setCertificate(DEVICE_CERT);
  tls.setPrivateKey(DEVICE_PRIVATE_KEY);
  tls.setHandshakeTimeout(30);

  mqtt.begin(AWS_ENDPOINT, 8883, tls);
  mqtt.setKeepAlive(30);
  mqtt.setTimeout(10000);

  connectMqtt();
  lastReconnect = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(100);
    return;
  }

  if (!mqtt.connected()) {
    if (millis() - lastReconnect >= RECONNECT_INTERVAL_MS) {
      lastReconnect = millis();
      connectMqtt();
    }
    delay(10);
    return;
  }

  mqtt.loop();
  if (millis() - lastPublish < PUBLISH_INTERVAL_MS) {
    delay(10);
    return;
  }
  lastPublish = millis();

  const time_t timestamp = time(nullptr);
  if (timestamp < 1700000000) {
    Serial.println("Aguardando sincronização NTP; leitura não publicada.");
    return;
  }

  const float temperatura = analogRead(TEMP_PIN) * (150.0f / 4095.0f);
  const float vibracao = analogRead(VIB_PIN) * (10.0f / 4095.0f);
  const int rpm = lroundf(analogRead(RPM_PIN) * (10000.0f / 4095.0f));
  const bool running = rpm > 0;
  const char* machineState = running ? "RUNNING" : "STOPPED";

  // Modelo didático: um ciclo por publicação com RPM ativo.
  // Vibração >= 7 mm/s classifica a peça do ciclo como refugo.
  if (running) {
    totalParts++;
    if (vibracao >= 7.0f) scrapParts++;
  }

  char payload[384];
  snprintf(payload, sizeof(payload),
           "{\"device_id\":\"%s\",\"machine_type\":\"USINAGEM\","
           "\"timestamp\":%lld,\"temperatura\":%.2f,"
           "\"vibracao\":%.2f,\"rpm\":%d,"
           "\"machine_state\":\"%s\","
           "\"pecas_produzidas\":%lu,\"pecas_defeito\":%lu}",
           DEVICE_ID, static_cast<long long>(timestamp),
           temperatura, vibracao, rpm, machineState,
           static_cast<unsigned long>(totalParts),
           static_cast<unsigned long>(scrapParts));

  // retained=false, QoS=1. O campo status é omitido para a Lambda calculá-lo.
  const bool published = mqtt.publish(TOPIC, payload, false, 1);
  Serial.println(payload);
  Serial.println(published
      ? "Publicação QoS 1 confirmada pelo broker."
      : "Falha na publicação MQTT.");
}
```

Temperatura, vibração e RPM são obrigatórios no contrato. O firmware omite `status` para a Lambda classificá-lo: `CRITICAL` se temperatura ≥ 90 °C ou vibração ≥ 7 mm/s; `WARNING` se temperatura ≥ 80 °C ou vibração ≥ 4,5 mm/s; `OPERATIONAL` nos demais casos. `machine_state` é independente do estado de alarme: RPM acima de zero significa `RUNNING`; RPM igual a zero significa `STOPPED`. Os contadores são acumulados durante a execução do ESP32 e reiniciam quando o dispositivo reinicia.

No exercício, cada publicação de três segundos com RPM ativo representa uma peça produzida. Assim, a capacidade ideal é 1.200 peças/hora. Vibração ≥ 7 mm/s marca como refugo a peça daquele ciclo. Essa relação é uma hipótese didática do simulador, não uma regra para uma máquina industrial real.

QoS 1 e `PUBACK` confirmam que o broker AWS IoT Core recebeu a publicação. Isso **não confirma** que a regra, a fila, a Lambda ou o InfluxDB concluíram o processamento; valide essas etapas separadamente.

## 7. Validar a cadeia

1. No AWS IoT Core, abra **Test → MQTT test client** e assine `industria/smartn1/telemetria`.
2. Inicie a simulação e aguarde Wi-Fi, NTP e conexão MQTT no Serial Monitor.
3. Gire os potenciômetros e confirme mensagens no MQTT test client.
4. Confira se SQS está sendo consumida, se a Lambda executa sem falhas e se a medição aparece no InfluxDB.
5. Consulte a API Java em `/api/v1/telemetria/esp32-torno-01/recente` para verificar o caminho completo até o backend.

| Dependência | Referência |
|---|---|
| Porta MQTT TLS 8883, certificado X.509 e endpoint | [AWS IoT Core: protocolos e autenticação](https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html) |
| QoS 0/1, `PUBACK` e suporte sem QoS 2 | [AWS IoT Core: MQTT](https://docs.aws.amazon.com/iot/latest/developerguide/mqtt.html) |
| API de `MQTTClient.publish(..., retained, qos)` | [256dpi/arduino-mqtt](https://github.com/256dpi/arduino-mqtt) |
| Bibliotecas e `libraries.txt` | [Wokwi: Arduino libraries](https://docs.wokwi.com/guides/libraries) |
| Wi-Fi virtual do ESP32 no Wokwi | [Wokwi: ESP32 Wi-Fi](https://docs.wokwi.com/guides/esp32-wifi) |
| GPIO 32, 34 e 35 como canais ADC1 | [Espressif: ADC do ESP32](https://docs.espressif.com/projects/esp-idf/en/v4.4.2/esp32/api-reference/peripherals/adc.html) |
