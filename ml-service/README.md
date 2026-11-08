# Serviço Flask de Ciência de Dados

Microserviço de inferência usado exclusivamente pelo backend Java. O serviço gera e treina uma Random Forest no primeiro boot caso ainda não exista um artefato no volume `ml-models` do Docker.

## Origem dos dados de treino

O contrato `TrainingDataSource` em `factoryhub_ml/data_source.py` separa a consulta dos dados do treinamento. Hoje, `MockTrainingDataSource` cria 2.400 registros sintéticos de temperatura, vibração e RPM com rótulos didáticos (`OPERATIONAL`, `WARNING`, `CRITICAL`). Esses registros simulam o formato esperado de uma consulta histórica ao InfluxDB; **não são dados medidos de uma máquina real**.

Quando o InfluxDB estiver disponível, implemente outro `TrainingDataSource` que consulte as medições históricas e seus rótulos de manutenção/condição. O restante do pipeline de treino e a API de predição podem continuar usando o mesmo formato.

O modelo divide os dados em treino e teste, calcula acurácia e F1 macro e guarda modelo, métricas, origem e data do treino em `ML_MODEL_PATH`. Se o artefato já existe, a aplicação carrega-o; para gerar um novo mock, remova o volume nomeado `ml-models` (`docker compose down -v` também remove os outros volumes do Compose).

## Rotas

- `POST /predict`: recebe `device_id`, `temperatura`, `vibracao`, `rpm`; retorna classe prevista, probabilidade de falha, recomendação, versão do modelo, instante da análise e origem dos dados de treino.
- `GET /health`: estado de disponibilidade do serviço e do modelo carregado.
- `GET /model/info`: algoritmo, atributos, classes, métricas, tamanho e origem do conjunto de treino.

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
