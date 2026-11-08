# Serviço Flask de Ciência de Dados

Microserviço de inferência usado exclusivamente pelo backend Java. O serviço gera e treina uma Random Forest no primeiro boot caso ainda não exista um artefato no volume `ml-models` do Docker.

## Origem dos dados de treino

O contrato `TrainingDataSource` em `factoryhub_ml/data_source.py` separa a consulta dos dados do treinamento. No Docker Compose, `InfluxTrainingDataSource` consulta o bucket `telemetry` do InfluxDB. O serviço `influx-seed` grava 14 dias de telemetria sintética para três máquinas antes de iniciar Flask e Java; **são dados didáticos, não medições de máquinas reais**. Fora do Compose, `MockTrainingDataSource` continua disponível como fallback.

Os rótulos (`OPERATIONAL`, `WARNING`, `CRITICAL`) são derivados dos limites de temperatura e vibração das medições consultadas. O restante do pipeline de treino mantém o mesmo formato para qualquer fonte.

O modelo divide os dados em treino e teste, calcula acurácia e F1 macro e guarda modelo, métricas, origem e data do treino em `ML_MODEL_PATH`. Um artefato só é reutilizado quando a fonte registrada coincide com a fonte configurada. No Compose, a URL interna é `http://influxdb:8086`; a interface do InfluxDB fica disponível em `http://localhost:8086`.

## Rotas

- `POST /predict`: recebe `device_id`, `temperatura`, `vibracao`, `rpm`; retorna classe prevista, probabilidade de falha, recomendação, versão do modelo, instante da análise e origem dos dados de treino.
- `GET /health`: estado de disponibilidade do serviço e do modelo carregado.
- `GET /model/info`: algoritmo, atributos, classes, métricas, tamanho e origem do conjunto de treino.
- `POST /train`: inicia um retreinamento em segundo plano usando o histórico atual do InfluxDB.
- `GET /training/status`: mostra etapa, percentual, mensagens, métricas e resultado do treinamento em andamento ou mais recente.

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
