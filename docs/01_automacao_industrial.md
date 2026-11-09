# ⚡ Referência Técnica: Automação Industrial & IIoT

> **Unidade Curricular:** Automação Industrial (80 horas / 20 Semanas)  
> **Objetivo:** Projetar a coleta, tratamento preliminar e transmissão segura de sinais industriais do chão de fábrica (OT) para sistemas em nuvem (IT).

---

## 1. Convergência TI/TA e Pirâmide ISA-95

O modelo **ANSI/ISA-95** padroniza a interface entre sistemas corporativos de TI e sistemas de controle de chão de fábrica (OT):

| Nível ISA-95 | Descrição | No Ecossistema Factory Hub |
|---|---|---|
| **Nível 4** | Planejamento de Recursos Empresariais (ERP) | Nuvem AWS (EC2, RDS PostgreSQL, relatórios executivos). |
| **Nível 3** | Gerenciamento de Operações de Manufatura (MES) | Backend Java (Spring Boot) consulta dados operacionais e oferece APIs; OEE com dados reais ainda está em desenvolvimento. |
| **Nível 2** | Supervisão de Processo e SCADA | Não implementado como SCADA neste protótipo; o painel web apresenta a telemetria recebida. |
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
- **Consumidor:** A IoT Rule encaminha o tópico para SQS; a Lambda consome a fila e grava as medições brutas no InfluxDB. O backend Java consulta os dados para a API.

### 3.2. Tópico implantado no AWS IoT Core
O Terraform criou uma regra IoT que escuta este tópico exato e encaminha cada JSON para SQS:
```text
industria/smartn1/telemetria
```
Para publicar do ESP32/Wokwi, use o **Device data endpoint** exibido em AWS IoT Core → Settings (hostname específico da conta), porta MQTT TLS `8883`, certificado e chave privada do dispositivo e Amazon Root CA 1. O endpoint também pode ser consultado com `aws iot describe-endpoint --endpoint-type iot:Data-ATS --query endpointAddress --output text --region us-east-1`. A regra IoT não cria a identidade do dispositivo: crie/registre certificado ativo e associe uma IoT Policy limitada a `iot:Connect` e `iot:Publish` neste tópico. Não coloque chave privada em repositório público.

O `device_id` deve corresponder a um cadastro existente no RDS: `esp32-torno-01`, `esp32-torno-02` ou `esp32-fresadora-01`.

### 3.3. Níveis de Garantia de Entrega (QoS)
- **QoS 0 (At Most Once):** A mensagem é enviada sem confirmação (*fire and forget*). Ideal para leituras contínuas de sensores a cada 3 segundos.
- **QoS 1 (At Least Once):** O broker responde com `PUBACK`. A mensagem pode ser entregue mais de uma vez; consumidores devem considerar duplicatas.

O AWS IoT Core suporta QoS 0 e QoS 1 para MQTT; não suporta QoS 2. O firmware deste guia usa QoS 1. O `PUBACK` confirma recebimento pelo broker, não a gravação no InfluxDB.

---

## 4. Ingestão e classificação da telemetria

No ambiente provisionado, a cadeia de processamento é **AWS IoT Core → IoT Rule → SQS → Lambda → InfluxDB**. A Lambda valida os campos obrigatórios, define o status se o dispositivo não o enviar e grava a medição no InfluxDB. O backend Java lê a série temporal; não há Node-RED no fluxo implantado.

Os limites atuais da Lambda são simples limiares por leitura, sem histerese:

- **CRITICAL:** temperatura ≥ 90 °C ou vibração ≥ 7 mm/s.
- **WARNING:** temperatura ≥ 80 °C ou vibração ≥ 4,5 mm/s.
- **OPERATIONAL:** abaixo desses limites.

A histerese é um possível exercício de extensão: exigir várias amostras acima do limiar para entrar em alarme e um limite mais baixo para normalizar evita alternância rápida (*flapping*). Essa lógica ainda não está implementada no processamento atual.

---

## 5. Montagem do ESP32 no Wokwi

O guia completo de circuito com três potenciômetros, certificados TLS, firmware Arduino e validação da cadeia de ingestão está em [Guia ESP32 e AWS IoT Core no Wokwi](07_guia_esp32_wokwi.md). O tópico é `industria/smartn1/telemetria`; os campos obrigatórios são `device_id`, `temperatura`, `vibracao` e `rpm`.

