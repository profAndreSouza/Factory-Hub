# Aula 2 — AWS IoT Core, SQS, DLQ e Lambda

## Por que esta aula merece tempo

Os alunos já conhecem MQTT e Node-RED em Docker. A novidade não é o publish/subscribe: é conectar o broker à identidade AWS do dispositivo, encaminhar mensagens por uma regra gerenciada, absorver falhas em uma fila e processá-las por uma função serverless. Ensine os conceitos em camadas, sem apresentar IoT Core, IAM, SQS e Lambda como uma única caixa-preta.

## Objetivos

- Comparar o broker MQTT do laboratório com AWS IoT Core.
- Entender endpoint, certificado X.509, IoT Policy e autorização por tópico.
- Ler a regra IoT que direciona mensagens à SQS.
- Explicar fila, visibility timeout, retry, DLQ e event source mapping.
- Acompanhar a Lambda de ingestão e localizar mensagem no InfluxDB.
- Diagnosticar em qual fronteira um evento parou.

## Parte 1 — Do MQTT conhecido ao AWS IoT Core

### O que permanece igual

- Um cliente conecta a um broker.
- O cliente publica uma mensagem em um tópico.
- Um consumidor interessado recebe ou processa a mensagem.
- O payload JSON descreve a telemetria.

### O que muda na nuvem

AWS IoT Core é um serviço gerenciado. A conta fornece um endpoint, mas cada dispositivo precisa de uma identidade e de autorização. Neste projeto, o ESP32 conecta usando certificado e chave privada do dispositivo, junto com a CA raiz da Amazon. Uma IoT Policy autoriza ações específicas como `iot:Connect` e `iot:Publish` para recursos limitados.

Apresente os três artefatos separadamente:

1. **Certificado do dispositivo:** identidade apresentada durante TLS mútuo.
2. **Chave privada:** prova de posse; permanece confidencial no dispositivo.
3. **IoT Policy:** define ações e tópicos autorizados. Certificado válido sozinho não concede permissão ampla.

No Wokwi, a conexão usa o hostname do endpoint IoT Core da conta, porta 8883 e o tópico `industria/smartn1/telemetria`. O ESP32 não usa `https://` no campo do hostname.

### Comparação com Node-RED

| Node-RED no Docker | AWS IoT Core |
|---|---|
| O aluno administra o container e os nós do fluxo. | AWS administra a disponibilidade do broker. |
| A conexão costuma usar usuário/senha, TLS ou credenciais configuradas pelo laboratório. | A identidade do dispositivo usa certificado e policy IoT. |
| O fluxo de encaminhamento é modelado visualmente em nós. | Uma IoT Rule seleciona tópico e executa uma ação AWS. |
| Escala e persistência do fluxo dependem da configuração do container. | O broker e as regras são serviços gerenciados; SQS desacopla o consumidor. |

Não diga que IoT Core é “Node-RED na AWS”: IoT Core recebe MQTT, enquanto regra, fila e Lambda são serviços separados que compõem o pipeline.

## Parte 2 — IoT Rule: encaminhamento declarativo

Uma regra IoT observa tópicos e aplica uma consulta semelhante a SQL sobre o payload. A regra atual seleciona o tópico do projeto e entrega a mensagem para uma fila SQS. A regra não executa a lógica de gravar no banco; essa responsabilidade fica na Lambda.

Explique os pontos que precisam coincidir:

- tópico publicado pelo ESP32;
- filtro/tópico configurado na regra;
- ação de destino SQS;
- role usada pela regra com permissão para enviar à fila.

Se o tópico estiver incorreto, a mensagem pode aparecer no MQTT test client e nunca chegar à regra.

## Parte 3 — SQS e DLQ: buffer e recuperação

SQS é uma fila gerenciada: o produtor envia e o consumidor busca/processa. Essa separação evita exigir que cada mensagem seja processada instantaneamente e permite desacoplar disponibilidade do broker e da função.

Conceitos para demonstrar no console:

- **mensagens visíveis:** ainda aguardam consumo;
- **mensagens em processamento:** recebidas por um consumidor, temporariamente ocultas durante o visibility timeout;
- **delete após sucesso:** confirma processamento e remove a mensagem;
- **redrive/retry:** mensagens não confirmadas podem reaparecer;
- **DLQ:** recebe mensagens que ultrapassam o número máximo de tentativas.

Uma DLQ não corrige automaticamente o payload; ela preserva evidência para investigação. O professor deve mostrar métricas e mensagem de exemplo sem expor dados sensíveis.

## Parte 4 — Lambda como consumidor

Lambda é uma função executada sob demanda pelo serviço AWS, sem administrar um servidor de aplicação. No projeto, o event source mapping lê lotes da SQS e chama o handler Python. A função percorre os registros, interpreta JSON, verifica `device_id`, temperatura, vibração e RPM, calcula estado quando necessário e converte os campos para Line Protocol do InfluxDB.

O retorno `batchItemFailures` permite identificar mensagens que falharam em vez de repetir ou descartar o lote inteiro sem distinção. Ensine a diferenciar:

- **código da função:** validação e escrita;
- **event source mapping:** ligação e polling da SQS;
- **execution role:** autoriza Lambda a ler a fila, acessar logs e conectar aos destinos permitidos;
- **variáveis de ambiente:** endereço e parâmetros do InfluxDB; não devem guardar segredos em texto aberto quando há um mecanismo seguro disponível.

Para operação, correlacione `messageId`, logs CloudWatch, métrica da fila e resultado no InfluxDB.

## Parte 5 — Escrita no InfluxDB

O handler transforma a mensagem em um ponto de série temporal. `device_id`, `machine_type` e `data_origin` são tags; leituras numéricas e estados são fields. O timestamp de recebimento ajuda a manter a ordem de ingestão; o instante original do dispositivo fica preservado no field `device_timestamp`.

Relembre o contraste:

- MQTT é o protocolo de publicação;
- SQS é buffer de mensagens;
- Lambda processa eventos;
- InfluxDB armazena série temporal.

Cada recurso tem uma responsabilidade própria.

## Roteiro prático no ambiente AWS

1. **Publicar:** iniciar o Wokwi e observar a mensagem no IoT MQTT test client.
2. **Validar identidade:** conferir certificado ativo, policy anexada e tópico permitido. Nunca mostrar a chave privada em tela compartilhada.
3. **Validar regra:** conferir filtro de tópico e ação da IoT Rule.
4. **Validar fila:** observar mensagens visíveis e aproximadas durante publicação.
5. **Validar Lambda:** observar invocação, duração, erros e logs.
6. **Validar escrita:** consultar InfluxDB pelo `device_id` e verificar timestamp/campos.
7. **Fazer diagnóstico guiado:** professor aponta uma fronteira; grupo sugere evidência que verificaria em seguida.

## Mapa de diagnóstico

| Sintoma | Primeiro ponto para conferir |
|---|---|
| ESP32 não conecta | Wi-Fi, endpoint, relógio UTC, CA/certificado/chave e policy `iot:Connect`. |
| Conectou, mas publicação é negada | `iot:Publish`, tópico permitido e correspondência exata do tópico. |
| MQTT test client vê mensagem, fila não | IoT Rule habilitada, filtro, ação SQS e role da regra. |
| Fila acumula mensagens | Event source mapping, concorrência, erro Lambda, timeout e permissões. |
| Invocações falham | Logs CloudWatch, configuração da função, rede/SG e destino InfluxDB. |
| Lambda processa, mas não há ponto | bucket/org/token, HTTP de escrita, Line Protocol e `device_id`. |
| Mensagens aparecem na DLQ | payload, erro recorrente e redrive policy; não apagar antes de investigar. |

## Segurança e limites do Learner Lab

- A regra IoT atual e alguns recursos são provisionados pelo Terraform; certificados do ESP32 podem ter sido criados separadamente no console.
- Roles e policies preexistentes do Learner Lab podem ter permissões limitadas. Um deny explícito não é corrigido adicionando uma permissão no código Terraform do estudante.
- Use certificados exclusivos para o simulador e revogue-os quando não forem mais usados.
- Não copie o material didático com chave privada, token ou credenciais da conta.

## Atividade e evidência

Cada grupo recebe quatro capturas sem identificação do ponto de falha: IoT test client, painel SQS, CloudWatch Lambda e consulta InfluxDB. Deve ordenar evidências, desenhar o caminho e indicar a última fronteira confirmada.

## Tarefa

Escrever um cartão de troubleshooting com: sintoma, evidência coletada, hipótese, teste seguro e resultado esperado para um dos casos do mapa de diagnóstico.

## Referências

- [Contrato MQTT e ingestão](../docs/05_contratos_e_especificacoes.md)
- [Guia ESP32/Wokwi](../docs/07_guia_esp32_wokwi.md)
- [Regra, filas e Lambda no Terraform](../terraform/ingestion.tf)
- [Código da função](../terraform/lambda/telemetry_consumer.py)
- [Aula 1 — visão integrada](aula-01-visao-geral.md)
