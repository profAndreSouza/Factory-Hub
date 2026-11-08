# Backend Java — Factory Hub

API de negócio em Spring Boot 3.5 / Java 17. No Docker Compose, leituras e telemetria recente vêm do InfluxDB local; dados de cadastro de máquinas, OEE e alertas continuam em memória. As predições são encaminhadas ao serviço Flask interno, que treina com o histórico sintético semeado no InfluxDB.

## Executar

```bash
docker compose up --build
```

O frontend fica em `http://localhost`; a API pode ser acessada localmente em `http://localhost:8080`. Para desenvolvimento sem Docker, com Java 17 e Maven instalados:

```bash
mvn spring-boot:run
```

O perfil `mock` é o padrão para OEE e alertas; o Compose ativa também o perfil `influx` para telemetria. O endpoint `/actuator/health` informa se o processo Spring está pronto.

## Endpoints usados pelo frontend

| Rota | Responsabilidade | Fonte atual | Integração prevista |
|---|---|---|---|
| `GET /api/v1/maquinas` | Cadastro e última leitura de cada máquina | Cadastro em memória + última leitura do InfluxDB | RDS PostgreSQL para o cadastro |
| `GET /api/v1/indicadores/{deviceId}/oee?periodo=hoje` | Indicadores OEE e contadores do período | `MockFactoryDataAdapter` | RDS PostgreSQL |
| `GET /api/v1/alertas` | Alertas de condição/anomalia | `MockFactoryDataAdapter` | Alertas consolidados no RDS |
| `GET /api/v1/telemetria/{deviceId}/recente` | Série recente de sensores | InfluxDB no Docker | InfluxDB |
| `POST /api/v1/predicoes` | Predição de condição de máquina | Flask privado treinado com amostras sintéticas | API Flask privada (`POST /predict`) |
| `POST /api/v1/treinamentos` | Solicita retreinamento do modelo | Flask privado, com dados históricos do InfluxDB | API Flask privada (`POST /train`) |
| `GET /api/v1/treinamentos/status` | Etapa, mensagens e métricas do treino | Flask privado | API Flask privada (`GET /training/status`) |
| `GET /api/v1/health` | Estado do backend e dependências | Java + Flask reais; RDS/MQTT marcados como `MOCK` | Verificações ativas em cada serviço; InfluxDB consultado no perfil `influx` |

Os adapters ficam atrás das interfaces em `application/port`. Ao conectar RDS e outros serviços, implemente adapters para essas interfaces e selecione o perfil correspondente. Não é necessário alterar os contratos REST consumidos pelo React.

O frontend chama apenas `/api/...`: o Vite encaminha essas rotas para `localhost:8080` no desenvolvimento e o Nginx encaminha para `backend-java:8080` no Compose. O endereço do Flask não é entregue ao navegador. No Compose, Flask não publica porta no host; somente o backend acessa a rede interna na porta 5000.
