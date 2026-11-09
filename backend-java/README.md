# Backend Java — Factory Hub

API de negócio Spring Boot 3.5 / Java 17. No Compose, o perfil `postgres` usa PostgreSQL e Flyway; o perfil `influx` lê telemetria bruta do InfluxDB; as predições e o retreinamento são encaminhados ao Flask privado.

## Banco relacional

O Flyway cria `machines`, `oee_snapshots` e `alerts` na primeira inicialização. O catálogo de máquinas e snapshots iniciais de OEE são registros didáticos para manter o painel demonstrável. Predições `ATENCAO` e `RISCO_ANOMALIA` são gravadas como alertas; predições operacionais não geram alertas.

No Compose local, o serviço PostgreSQL usa volume persistente. No ambiente cloud, o Compose conecta ao RDS privado. A senha do RDS é armazenada como SecureString no Systems Manager Parameter Store e o workflow SSM a busca pela role da EC2 antes de iniciar o Compose. Portanto, a role EC2 precisa de leitura dos parâmetros do Factory Hub e de descriptografia da chave padrão do Parameter Store.

O endpoint de OEE calcula um valor parcial a partir das amostras `LIVE` do InfluxDB quando há contadores de produção/refugo e ao menos duas leituras próximas. A janela considera somente intervalos observados de até 9 segundos. Quando faltam dados, o backend devolve os valores didáticos de `oee_snapshots`, marcados `DEMO`.

## Executar localmente

```bash
docker compose up --build
```

O frontend fica em `http://localhost`; a API pode ser acessada em `http://localhost:8080`. Para executar a API sem Docker, use o perfil `mock` (sem banco) ou configure uma instância PostgreSQL e `SPRING_PROFILES_ACTIVE=postgres,influx`.

## Endpoints usados pelo frontend

| Rota | Responsabilidade | Fonte atual |
|---|---|---|
| `GET /api/v1/maquinas` | Cadastro e última leitura | Catálogo no PostgreSQL + última leitura no InfluxDB |
| `GET /api/v1/indicadores/{deviceId}/oee?periodo=hoje` | Indicadores OEE e contadores do período | InfluxDB `LIVE_PARTIAL`; fallback do PostgreSQL marcado `DEMO` |
| `GET /api/v1/alertas` | Alertas de condição/anomalia | PostgreSQL; inclui predições de risco persistidas |
| `GET /api/v1/telemetria/{deviceId}/recente` | Série recente de sensores | InfluxDB |
| `POST /api/v1/predicoes` | Predição de condição de máquina | Serviço Flask; alertas não operacionais são persistidos no PostgreSQL |
| `POST /api/v1/treinamentos` | Solicita retreinamento do modelo | Flask com histórico do InfluxDB |
| `GET /api/v1/treinamentos/status` | Etapa, mensagens e métricas do treino | Flask |
| `GET /api/v1/health` | Estado das dependências | Java, Flask, InfluxDB e PostgreSQL consultados; AWS IoT Core aparece `UNKNOWN` / `NOT_MONITORED` |

O React chama apenas `/api/...`. O Nginx encaminha as chamadas para o Java; o navegador não acessa diretamente Flask, InfluxDB ou RDS.
