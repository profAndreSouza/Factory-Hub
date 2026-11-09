# Tutorial Factory Hub — integração do semestre em 8 aulas

Este roteiro conecta em um projeto único os conhecimentos de Automação Industrial, Ciência de Dados, Computação em Nuvem e DevOps. A turma já trabalhou MQTT e Node-RED em Docker e já criou recursos de nuvem por interfaces gráficas; as aulas retomam essas bases e avançam com os conceitos novos necessários para integrar o sistema.

## Sequência revisada

| Aula | Tema | Foco |
|---|---|---|
| [01 — Visão geral + ESP32/MQTT](aula-01-visao-geral.md) | Projeto integrado e ponte com o que já foi estudado | Visão de arquitetura, mensagem do Wokwi e comparação MQTT/Node-RED com a nuvem. |
| [02 — AWS IoT Core, SQS e Lambda](aula-02-iot-core-lambda.md) | Ingestão gerenciada | Conceitos novos: certificado/política do IoT Core, regra, fila/DLQ, acionamento Lambda e escrita no InfluxDB. |
| [03 — Backend Java e RDS](aula-03-backend-rds.md) | API e consolidação | REST, InfluxDB versus PostgreSQL, OEE e job de cinco minutos. |
| [04 — Ciência de dados](aula-04-ciencia-de-dados.md) | CRISP-DM e Random Forest | Histórico, pares temporais, treinamento, métricas e inferência. |
| [05 — Frontend](aula-05-frontend.md) | React e integração por API | O navegador fala só com o Java e apresenta dados brutos, consolidados e predições. |
| [06 — Terraform e nuvem](aula-06-terraform-nuvem.md) | Infraestrutura como código | Da criação gráfica de EC2/Kubernetes ao plano declarativo, state remoto e provisionamento do Factory Hub. |
| [07 — Docker Hub e GitHub Actions](aula-07-dockerhub-github-actions.md) | Publicação e deploy | Imagens versionadas, quality gates, publicação manual e deploy via SSM sem SSH. |
| [08 — Integração final](aula-08-integracao-final.md) | Demonstração e troubleshooting | Percorrer o sistema, localizar falhas por camada e apresentar evidências do projeto. |

## Objetivo final

Ao concluir a trilha, os alunos devem conseguir acompanhar uma medição da máquina simulada até a interface, explicar onde os dados são armazenados, como o modelo é treinado, como a infraestrutura é criada e o que impede uma imagem defeituosa de ser publicada.

## Como conduzir

Cada aula apresenta objetivos, conceitos, roteiro para o professor, atividade, evidência e tarefa. A primeira aula é integradora e usa o ESP32/MQTT para ativar conhecimentos anteriores. A segunda desacelera o ritmo para explorar AWS IoT Core, SQS e Lambda com mais profundidade. As aulas 6 e 7 também reservam tempo específico aos conceitos novos de Terraform, Docker Hub e entrega com GitHub Actions.

O tempo de cada etapa pode ser adaptado à carga horária. A sequência suporta execução local com Docker Compose e demonstração cloud na AWS Academy. Atividades que criam recursos AWS devem ser coordenadas pelo professor.

## Materiais de referência

- [`../README.md`](../README.md): visão geral e arquitetura atual.
- [`../docs/05_contratos_e_especificacoes.md`](../docs/05_contratos_e_especificacoes.md): MQTT, APIs e esquema de dados.
- [`../docs/07_guia_esp32_wokwi.md`](../docs/07_guia_esp32_wokwi.md): circuito e firmware.
- [`../docs/02_ciencia_de_dados.md`](../docs/02_ciencia_de_dados.md): CRISP-DM e manutenção preditiva.
- [`../docs/03_computacao_em_nuvem.md`](../docs/03_computacao_em_nuvem.md) e [`../terraform/README.md`](../terraform/README.md): nuvem e Terraform.
- [`../docs/04_devops_ci_cd.md`](../docs/04_devops_ci_cd.md): testes, gates e workflows.

## Segurança e custo

- Não compartilhe chave privada, certificado privado, token ou `.env` com alunos nem com o Git.
- Credenciais do Learner Lab expiram; valide a sessão antes de executar workflows AWS.
- O bucket S3 do state é pré-requisito e deve sobreviver ao restante da infraestrutura.
- `terraform apply`, banco RDS, EC2 e demais recursos podem gerar custos. Confirme o orçamento e o processo de destruição antes da prática.
- Terraform provisiona a infraestrutura; os workflows de publicação e deploy são etapas separadas.
