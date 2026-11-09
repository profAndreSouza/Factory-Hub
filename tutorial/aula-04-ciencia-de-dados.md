# Aula 4 — Ciência de dados e manutenção preditiva

## Objetivos

- Aplicar as fases do CRISP-DM ao problema de manutenção.
- Distinguir dados brutos, atributos, alvo e pares temporais.
- Explicar o treino e a validação temporal do classificador.
- Interpretar acurácia e F1 sem tratar métrica como garantia.
- Executar treino e inferência pela interface via backend.

## Explicação para a turma

O problema é estimar a condição da próxima leitura de uma máquina a partir de sinais atuais. O serviço Flask busca o histórico no InfluxDB, organiza leituras por dispositivo e horário e constrói exemplos temporais: atributos da leitura atual e rótulo da próxima leitura. Assim, o sistema não usa a classe da própria leitura para prever a mesma linha.

O projeto atual usa **Random Forest**. O aluno pode treinar com dados `DEMO`, dados `LIVE` do ESP32 ou ambos. O histórico é dividido por ordem temporal em treino e validação futura para reduzir vazamento temporal. A acurácia mede a proporção de acertos; F1 macro calcula a média de F1 por classe e dá o mesmo peso a classes diferentes. Resultados muito altos podem indicar classes fáceis, desbalanceamento, rótulos derivados das mesmas faixas dos sensores ou amostra pouco representativa.

O frontend solicita treino ao backend Java; o Java chama a API Flask. As mensagens de progresso e métricas voltam pelo Java. Para uma predição, o caminho também é React → Java → Flask → Java → React. O endereço Flask fica privado.

## Prática guiada

1. Mapear as fases CRISP-DM: objetivo, dados, preparação, modelagem, avaliação e uso.
2. Abrir a página Ciência de Dados e conferir a fonte e quantidade de amostras.
3. Iniciar treinamento pelo botão e acompanhar as etapas e o progresso.
4. Anotar número de leituras e pares temporais, acurácia, F1 macro e quantidade de validação.
5. Alterar os valores de sensores no Wokwi e publicar uma sequência com padrões diferentes.
6. Solicitar predição pela interface e conferir recomendação, classe e alerta. A inferência é sob demanda; a entrada de cada mensagem MQTT não cria automaticamente uma predição.
7. Discutir por que incluir dados novos não melhora automaticamente o modelo: ele precisa ser novamente treinado.

## Perguntas para avaliação

- Qual é a diferença entre classificação e regressão neste caso?
- Por que separar treino e teste por tempo?
- Qual é a diferença entre uma leitura bruta e um exemplo de treinamento temporal?
- O que pode explicar 100% de acurácia em um conjunto didático?
- Qual serviço salva o modelo e qual camada o navegador chama?

## Evidência de aprendizagem

Entregar um pequeno relatório com problema de negócio, atributos, variável-alvo, regra de rótulo, divisão temporal, métricas e uma limitação do conjunto de dados.

## Tarefa

Propor uma forma de medir se o modelo melhora com telemetria real, incluindo pelo menos uma métrica por classe e um conjunto de validação separado no tempo.

## Referências

- [Material de ciência de dados](../docs/02_ciencia_de_dados.md)
- [README do serviço Flask](../ml-service/README.md)
- [Implementação do treinamento](../ml-service/factoryhub_ml/training.py)
