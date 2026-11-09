# Serviço Flask de Ciência de Dados

Microserviço de inferência usado exclusivamente pelo backend Java. O serviço gera e treina uma Random Forest no primeiro boot caso ainda não exista um artefato no volume `ml-models` do Docker.

## Origem dos dados de treino

O contrato `TrainingDataSource` em `factoryhub_ml/data_source.py` separa a consulta dos dados do treinamento. No Docker Compose, `InfluxTrainingDataSource` consulta o bucket `telemetry` do InfluxDB. O serviço `influx-seed` grava 14 dias de telemetria sintética para três máquinas antes de iniciar Flask e Java; **são dados didáticos, não medições de máquinas reais**. Fora do Compose, `MockTrainingDataSource` continua disponível como fallback.

Os rotulos didaticos (`OPERATIONAL`, `WARNING`, `CRITICAL`) sao derivados dos limites de temperatura e vibracao. O modelo usa cada medicao para prever a classe da proxima leitura da mesma maquina; a validacao e cronologica e usa um trecho posterior do historico, reduzindo vazamento entre leituras vizinhas. As metricas continuam sendo didaticas: como os rotulos sao regras aplicadas aos sensores simulados, acuracia de 100% nao comprova desempenho em falhas industriais reais.

O modelo monta pares temporais de leituras consecutivas, separa treino e validacao por tempo, calcula acuracia e F1 macro e guarda o modelo, metricas, contagem de pares e total bruto de medicoes em `ML_MODEL_PATH`. Cada nova leitura com timestamp unico entra no proximo retreino; a contagem e atualizada quando o treino consulta novamente o InfluxDB. Um artefato só é reutilizado quando a fonte registrada coincide com a fonte configurada. No Compose, a URL interna é `http://influxdb:8086`; a interface do InfluxDB fica disponível em `http://localhost:8086`.

## Rotas

- `POST /predict`: recebe `device_id`, `temperatura`, `vibracao`, `rpm`; retorna a classe prevista para a próxima leitura registrada, risco estimado, recomendação, versão do modelo, instante da análise e origem dos dados de treino.
- `GET /health`: estado de disponibilidade do serviço e do modelo carregado.
- `GET /model/info`: algoritmo, atributos, classes, métricas, tamanho e origem do conjunto de treino.
- `POST /train`: inicia um retreinamento em segundo plano usando o histórico atual do InfluxDB.
- `GET /training/status`: mostra etapa, percentual, mensagens, métricas e resultado do treinamento em andamento ou mais recente.
- `GET /training/data-info`: conta medicoes e pares temporais disponiveis no InfluxDB sem iniciar treinamento.

No frontend, a página **Ciência de Dados > Laboratório** permite iniciar esse fluxo e acompanhar as mensagens. O React chama as rotas de treinamento do backend Java; somente o backend conversa com o Flask. O modelo atual continua atendendo predições enquanto a nova versão é treinada e é substituído quando o treino termina.

O Compose mantém a porta 5000 apenas na rede interna e o backend Java usa `ML_SERVICE_BASE_URL=http://ml-service:5000`. O navegador chama somente a API Java.

## Executar localmente

Com Python 3.12:

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:ML_MODEL_PATH = ".\model\maintenance_model.joblib"
gunicorn --bind 127.0.0.1:5000 --workers 1 "factoryhub_ml:create_app()"
```

Ou execute o serviço junto do frontend e backend:

```bash
docker compose up --build
```

Para consultar diretamente `/predict` no desenvolvimento, use o endpoint interno somente em ambiente local; em execução via Compose, não há porta Flask publicada no host.


## Testes automatizados

Execute `python -m pip install -r requirements.txt pytest` e `python -m pytest -q` nesta pasta. Os testes cobrem a preparacao temporal do conjunto, treinamento e metricas, validacao das rotas Flask e retreinamento assincrono usando dados de teste, sem conectar ao InfluxDB.


Lint do servico e testes: `python -m pip install ruff pytest`, `python -m ruff check --select E4,E7,E9,F factoryhub_ml tests` e `python -m pytest -q`.
