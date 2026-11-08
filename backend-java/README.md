# Backend Java — Factory Hub

API de negócio em Spring Boot 3.5 / Java 17. No perfil atual, os adapters em memória fornecem os dados da interface sem depender de RDS, InfluxDB ou do serviço Flask.

## Executar

```bash
docker compose up --build
```

O frontend fica em `http://localhost`; a API pode ser acessada localmente em `http://localhost:8080`. Para desenvolvimento sem Docker, com Java 17 e Maven instalados:

```bash
mvn spring-boot:run
```

O perfil `mock` é o padrão e também é ativado explicitamente no Compose. O endpoint `/actuator/health` informa se o processo Spring está pronto.

## Endpoints usados pelo frontend

| Rota | Responsabilidade | Fonte atual | Integração prevista |
|---|---|---|---|
| `GET /api/v1/maquinas` | Cadastro e última leitura de cada máquina | `MockFactoryDataAdapter` | RDS PostgreSQL |
| `GET /api/v1/indicadores/{deviceId}/oee?periodo=hoje` | Indicadores OEE e contadores do período | `MockFactoryDataAdapter` | RDS PostgreSQL |
| `GET /api/v1/alertas` | Alertas de condição/anomalia | `MockFactoryDataAdapter` | Alertas consolidados no RDS |
| `GET /api/v1/telemetria/{deviceId}/recente` | Série recente de sensores | `MockFactoryDataAdapter` | InfluxDB no Docker |
| `POST /api/v1/predicoes` | Predição de condição de máquina | `MockPredictionAdapter` | API Flask privada (`POST /predict`) |
| `GET /api/v1/health` | Estado do backend e dependências | Backend real + `MockDependencyHealthAdapter` | Verificações ativas em cada serviço |

Os adapters ficam atrás das interfaces em `application/port`. Ao conectar os sistemas reais, implemente adapters para essas interfaces, selecione o perfil correspondente e desative o perfil `mock`. Não é necessário alterar os contratos REST consumidos pelo React.

O frontend chama apenas `/api/...`: o Vite encaminha essas rotas para `localhost:8080` no desenvolvimento e o Nginx encaminha para `backend-java:8080` no Compose. O endereço do Flask não é entregue ao navegador.
