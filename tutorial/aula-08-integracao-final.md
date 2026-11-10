# Aula 8 — Integração ponta a ponta, validação e apresentação

## Propósito

Fechar o semestre conectando as disciplinas que foram estudadas separadamente. As equipes demonstram uma mensagem, seguem o fluxo de dados, mostram uma consulta e uma predição, explicam a infraestrutura como código e apresentam como lint, testes e containers protegem a entrega.

## Objetivos

- Percorrer os fluxos de telemetria, treinamento/predição e entrega.
- Usar evidências de cada serviço para localizar uma falha.
- Distinguir indisponibilidade real de estado `UNKNOWN`/`NOT_MONITORED`.
- Apresentar decisões de arquitetura e limites didáticos do modelo.
- Demonstrar passagem pelos gates sem expor credenciais nem afetar recursos indevidamente.

## Capstone em equipes

Cada equipe recebe uma célula simulada e prepara uma demonstração curta com:

1. ESP32/Wokwi publicando um payload válido.
2. IoT Core recebendo MQTT e encaminhando por regra/fila para Lambda.
3. Registro bruto consultável no InfluxDB.
4. Endpoint Java consultando máquina/telemetria e consolidações RDS.
5. Frontend mostrando leituras e indicadores.
6. Serviço Flask treinado com histórico e uma predição retornada pela cadeia Java → Flask.
7. Explicação sobre VPC/EC2/RDS/IoT/SQS/Lambda provisionados pelo Terraform.
8. Workflow CI, quality gates, imagens Docker Hub e deploy separado via SSM.

Se a sessão AWS não estiver disponível, a equipe demonstra localmente com Docker Compose e explica a diferença entre adapter mock e dependência cloud live.

## Roteiro de demonstração

### Antes de apresentar

- Verificar que o Wokwi conecta ao endpoint correto, sem exibir a chave privada.
- Confirmar tópico, `device_id` e campos numéricos.
- Confirmar que a regra IoT está habilitada e a Lambda não apresenta erros recorrentes.
- Verificar chegada no InfluxDB e consultar dados pelo backend.
- Conferir conexão Java/Flask/RDS e última execução do job de cinco minutos.
- Conferir estado do workflow no GitHub Actions; não iniciar Apply, publish ou deploy sem autorização do professor.

### Durante a apresentação

1. Mostrar a arquitetura geral com setas e explicar uma medição.
2. Escolher um `device_id` e comparar leitura bruta e consolidação.
3. Consultar OEE e declarar se a origem é `LIVE_PARTIAL` ou `DEMO`.
4. Treinar ou consultar o estado do modelo e interpretar métricas.
5. Solicitar uma predição e mostrar a resposta/alerta na interface.
6. Mostrar CI e explicar por que cada gate existe.
7. Explicar publicação e deploy com os nomes dos workflows, sem revelar secrets.

## Desafio de troubleshooting

O docente escolhe um sintoma não destrutivo e pede que a equipe localize a última fronteira saudável:

| Sintoma | Evidência apropriada |
|---|---|
| Nada aparece no MQTT test client | Serial ESP32, TLS, certificado e policy. |
| IoT Core recebe, SQS não | IoT Rule, filtro do tópico, destino e permissão de envio. |
| Fila acumula | Métricas SQS, event source mapping, execução/erros Lambda. |
| Influx sem leitura nova | Logs Lambda, configuração/rede do Influx e resposta HTTP. |
| API Java sem dado | Health do Java, consulta do adapter e disponibilidade do Influx/RDS. |
| Frontend não carrega serviço | CloudFront/S3 para os arquivos; Network tab `/api`, comportamento do CloudFront, target group do ALB e logs do backend para a API. No local/E2E, conferir o proxy Nginx. |
| Predição indisponível | Java → Flask, health Flask, dados e modelo carregado. |
| CI verde, Docker Hub não atualizado | Workflow manual de publish, branch e tag. |
| Imagem está no Hub, EC2 antiga | Workflow SSM, comando remoto, Compose pull/up e tag. |

Uma resposta boa mostra evidência e próximo teste. Evite reiniciar tudo antes de entender em qual etapa o fluxo parou.

## Limites a declarar na apresentação

- A planta, sensores e mensagens são uma simulação didática.
- O seed histórico pode coexistir com amostras do ESP32.
- O modelo implementado é Random Forest e seus rótulos dependem das regras do conjunto didático; métricas não garantem desempenho industrial.
- O OEE pode ser parcial quando há lacunas nas leituras; snapshots demonstrativos devem ser identificados como `DEMO`.
- IoT Core/MQTT não é monitorado pelo health endpoint e pode aparecer como `UNKNOWN` sem indicar erro na ingestão.
- O workflow de deploy e o de Terraform são ações manuais e independentes.

## Avaliação sugerida

| Critério | Evidência |
|---|---|
| Integração das disciplinas | Conecta sinal industrial, dados, aplicação e operação. |
| Domínio dos serviços novos | Explica IoT Core, SQS/Lambda, Terraform, Docker Hub e GitHub Actions. |
| Rastreamento técnico | Segue um identificador e usa logs/rotas/consultas como evidência. |
| Qualidade de software | Explica lint, testes e qualidade do build de container. |
| Segurança e responsabilidade | Não expõe credenciais e reconhece custo/limites da nuvem. |
| Clareza da comunicação | Diagrama legível, papéis e fluxo apresentados em ordem. |

## Entrega da equipe

- Diagrama final de arquitetura.
- Uma evidência por camada (edge, ingestão, dados, API, UI e CI/CD).
- Registro da limitação encontrada e diagnóstico feito.
- Reflexão: qual disciplina isolada deixou de ser suficiente e qual integração foi necessária?

## Fechamento

Retome a pergunta da primeira aula: “como transformar uma leitura de sensor em uma decisão acessível à operação?”. Peça aos alunos para citar o serviço que aprenderam, uma conexão que compreenderam e uma melhoria futura que fariam no projeto.
