# Aula 3 — Backend Java, APIs e consolidação no RDS

## Objetivos

- Diferenciar leitura bruta no InfluxDB de dados relacionais no RDS.
- Explicar a função de uma API de negócio.
- Consultar rotas Java e relacionar cada resposta ao frontend.
- Descrever o job que consolida telemetria em janelas de cinco minutos.

## Explicação para a turma

O backend Java/Spring Boot é a fronteira de negócio do sistema. Ele disponibiliza endpoints REST para máquinas, telemetria, OEE, consolidações, alertas, saúde dos serviços, treinamento e predições. Quando usa a integração cloud, busca dados brutos no InfluxDB e dados relacionais no PostgreSQL.

O InfluxDB guarda séries temporais de alta frequência. O RDS mantém registros relacionais e consolidações apropriadas para consulta e histórico operacional. A cada cinco minutos, um agendador Java lê a janela fechada no InfluxDB, calcula médias, mínimo/máximo, deltas dos contadores e estado resumido, grava no RDS e atualiza um checkpoint persistente.

O OEE reúne disponibilidade, performance e qualidade. A simulação usa uma peça por ciclo de três segundos; o resultado depende da cobertura real observada. Se a amostra for insuficiente, a API pode retornar snapshot didático identificado como `DEMO`.

## Rotas a demonstrar

- `GET /api/v1/maquinas`
- `GET /api/v1/telemetria/{deviceId}/recente`
- `GET /api/v1/indicadores/{deviceId}/oee?periodo=hoje`
- `GET /api/v1/consolidados/{deviceId}/recente?limit=10`
- `GET /api/v1/alertas`
- `GET /api/v1/health`
- `POST /api/v1/predicoes`

## Prática guiada

1. Rodar a aplicação local com Docker Compose ou acessar o ambiente de aula.
2. Consultar o Swagger/contratos no README e chamar `GET /api/v1/maquinas`.
3. Buscar telemetria bruta para um dispositivo e identificar campos e origem.
4. Consultar OEE e distinguir `LIVE_PARTIAL` de `DEMO`.
5. Consultar consolidações do RDS. Se a primeira janela ainda não fechou, explicar o agendamento e o checkpoint.
6. Seguir no código a rota do controller até o adapter PostgreSQL ou Influx.
7. Observar migrations Flyway e localizar a migração de consolidação.

## Evidência de aprendizagem

O aluno constrói uma tabela “origem → endpoint → destino” para quatro dados: catálogo, leitura recente, OEE e alerta de IA.

## Tarefa

Desenhe um endpoint de consulta para uma máquina diferente e descreva o JSON de resposta sem expor URLs internas ou credenciais.

## Referências

- [Contratos REST e esquema RDS](../docs/05_contratos_e_especificacoes.md)
- [Backend Java](../backend-java/README.md)
- [Job de consolidação](../backend-java/src/main/java/br/com/factoryhub/backend/infrastructure/postgres/TelemetryConsolidationJob.java)
