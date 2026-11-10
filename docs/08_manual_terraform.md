# Manual do Terraform e da infraestrutura AWS

Este manual explica a configuração Terraform do Factory Hub, os arquivos do diretório, os recursos provisionados e seus fluxos. O exemplo foi preparado para o AWS Academy Learner Lab.

> A EC2 fica em subnet privada sem IP publico ou SSH. O frontend estatico e servido pelo S3 privado + CloudFront; `/api/*` passa pelo CloudFront e por um ALB publico ate o backend privado.

## Passo a passo para executar o projeto

Este roteiro cobre a primeira implantação, desde as credenciais até o teste do ESP32 no Wokwi. Use a mesma região AWS em todo o processo; o projeto e o guia IoT estão configurados para `us-east-1`. A stack atual cria NAT Gateway, ALB, CloudFront, EC2 e RDS, que podem consumir rapidamente o crédito do Learner Lab.

### 1. Prepare o AWS Academy e as roles

1. Abra o AWS Academy e clique em **Start Lab**. Aguarde o estado ficar verde.
2. Abra **AWS Details -> AWS CLI** e copie os três valores temporários: access key, secret access key e session token. Eles expiram quando a sessão do laboratório termina.
3. No AWS Console, confirme que existem recursos IAM compatíveis para a EC2, a regra IoT e a Lambda. O Terraform não cria essas roles.
   - Instance profile da EC2: acesso ao Systems Manager, leitura dos parâmetros `/factoryhub/academy/rds/*` e `/factoryhub/academy/runtime/*`, e `kms:Decrypt` para SecureStrings.
   - Role da IoT Rule: trust em `iot.amazonaws.com` e permissão `sqs:SendMessage` para a fila do projeto.
   - Role da Lambda: trust em `lambda.amazonaws.com`, logs, ENIs de VPC e consumo da fila SQS.
4. Anote o nome do instance profile e os ARNs das duas roles. Não presuma que `LabRole` atende esses requisitos; confira as permissões ou peça ao instrutor. A role IoT -> SQS usada pela infraestrutura é diferente do certificado e da IoT Policy do ESP32 criados na etapa Wokwi.

### 2. Prepare o Docker Hub e as configurações do GitHub

1. No Docker Hub, use uma conta ou organização que possa publicar imagens. Crie os repositórios públicos `factoryhub-ml-service` e `factoryhub-backend` sob esse namespace. Eles precisam ser públicos porque a EC2 baixa as imagens sem fazer login no Docker Hub.
2. Crie um Personal Access Token com permissão de leitura e escrita para publicar. Guarde-o como segredo; não use sua senha de acesso.
3. No GitHub, abra **Settings -> Secrets and variables -> Actions**. Crie ou atualize estes **Repository secrets**:

   | Secret | Valor |
   |---|---|
   | `AWS_ACCESS_KEY_ID` | Access key temporária do Learner Lab |
   | `AWS_SECRET_ACCESS_KEY` | Secret access key temporária |
   | `AWS_SESSION_TOKEN` | Session token temporário |
   | `DOCKERHUB_USERNAME` | Nome do usuário ou organização do Docker Hub |
   | `DOCKERHUB_TOKEN` | Personal Access Token do Docker Hub |

4. Em **Repository variables**, crie ou atualize as variáveis abaixo. `TF_STATE_BUCKET` será adicionada depois do bootstrap; as duas variáveis `FRONTEND_*` serão adicionadas depois do Terraform.

   | Repository variable | Valor |
   |---|---|
   | `AWS_REGION` | `us-east-1` |
   | `EC2_INSTANCE_PROFILE_NAME` | Nome do instance profile existente |
   | `IOT_SQS_ROLE_ARN` | ARN da role IoT -> SQS |
   | `LAMBDA_EXECUTION_ROLE_ARN` | ARN da role de execução Lambda |

5. Faça commit e push do projeto para `main`. O workflow de CI inicia automaticamente; corrija qualquer falha antes de publicar.

### 3. Crie o bucket remoto do Terraform

1. Abra **Actions -> Bootstrap Terraform state bucket -> Run workflow**.
2. Informe um nome S3 globalmente único começando com `factoryhub-state-`, por exemplo `factoryhub-state-factoryhub-2026`.
3. O workflow cria o bucket na região `AWS_REGION`, ativa bloqueio de acesso público, ownership controls, criptografia SSE-S3 e versionamento.
4. No resumo do workflow, copie o nome do bucket. Em **Settings -> Secrets and variables -> Actions -> Variables**, crie ou atualize `TF_STATE_BUCKET` com esse valor.

Execute esse bootstrap uma vez. Em futuras sessões, atualize as credenciais AWS quando expirarem; não crie outro bucket para cada execução. Preserve o bucket e o state.

### 4. Provisione a infraestrutura

1. Confirme que `AWS_REGION`, `TF_STATE_BUCKET`, as três variáveis IAM e os cinco Secrets estão definidos no GitHub.
2. Abra **Actions -> Provisionar infraestrutura AWS -> Run workflow**.
3. O workflow valida e inicializa o backend S3, executa `plan` e aplica o plano na mesma execução. O disparo é manual, mas o `apply` não pede uma segunda aprovação. A stack pode gerar cobranças. Se estiver migrando uma EC2 pública já existente, o Terraform a substituirá por estar mudando de subnet; faça backup dos dados do InfluxDB nos volumes Docker antes do apply.
4. Quando terminar, abra o resumo dessa execução e copie `frontend_bucket_name` e `cloudfront_distribution_id`. Cadastre-os como Repository variables `FRONTEND_BUCKET_NAME` e `CLOUDFRONT_DISTRIBUTION_ID`. O resumo também mostra `frontend_url` e o DNS do ALB.
5. No Systems Manager, aguarde a EC2 aparecer como **Online**. Aguarde também a distribuição CloudFront ficar **Deployed** antes de validar o portal.

### 5. Publique as imagens e o frontend

1. Confirme que a execução CI está verde e que as variáveis `FRONTEND_BUCKET_NAME` e `CLOUDFRONT_DISTRIBUTION_ID` já foram configuradas. As credenciais AWS também precisam permitir upload/delete de objetos no bucket frontend e `cloudfront:CreateInvalidation` na distribuição.
2. Em **Actions -> Publish images to Docker Hub -> Run workflow**, selecione `main` e inicie a execução. O workflow executa novamente os quality gates.
3. Se os gates passarem, publica as imagens Flask e Java com tags `latest` e `sha-<commit>`, compila o React e envia os arquivos ao bucket S3; depois invalida o cache CloudFront.
4. Copie o SHA completo de 40 caracteres do commit exibido na execução. Será necessário no deploy.

A publicação é manual. Ela não atualiza os containers da EC2.

### 6. Faça o deploy do backend

1. Abra **Actions -> Deploy through SSM -> Run workflow**.
2. No campo `image_sha`, informe o SHA completo do mesmo commit que acabou de publicar. Não informe a tag `latest` nem um SHA abreviado.
3. Inicie a execução e aguarde o comando SSM terminar com sucesso. O workflow busca a configuração runtime no Parameter Store, baixa as imagens desse SHA e executa Docker Compose na EC2 privada.
4. Abra `frontend_url` no navegador. As chamadas `/api/*` vão pelo CloudFront e ALB até o backend.

### 7. Configure o AWS IoT Core e o Wokwi

Faça esta etapa após o deploy, para que o InfluxDB já esteja ativo quando começarem a chegar mensagens.

1. No AWS Console, selecione `us-east-1` e abra **AWS IoT Core -> Settings**. Copie o **Device data endpoint** da sua conta.
2. No menu da conta AWS, anote o ID de 12 dígitos da conta. Em **AWS IoT Core -> Manage -> All devices -> Things**, crie o Thing `esp32-torno-01` e gere um certificado. Baixe imediatamente o certificado, a chave privada e o **Amazon Root CA 1**. Ative o certificado e associe-o ao Thing.
3. Em **AWS IoT Core -> Security -> Policies**, crie a policy `factoryhub-esp32-publish` que permita `iot:Connect` somente para o client ID `esp32-torno-01` e `iot:Publish` somente para `industria/smartn1/telemetria`. Use o ID da sua própria conta AWS no ARN; não copie o ID de exemplo do guia Wokwi.
4. Anexe a policy ao certificado e confirme que o certificado está associado ao Thing. A IoT Rule que encaminha o tópico para SQS já foi criada pelo Terraform; não crie outra.
5. Abra o [projeto Factory Hub no Wokwi](https://wokwi.com/projects/480156977156775937). Atualize `AWS_ENDPOINT` no sketch se o endpoint da sua conta for diferente.
6. Atualize `secrets.h` com o conteúdo PEM do Amazon Root CA 1, do certificado do dispositivo e da chave privada. Preserve os cabeçalhos, rodapés e quebras de linha. O arquivo já está ignorado pelo Git; nunca o envie ao repositório nem deixe a chave em um projeto Wokwi público. Se o projeto Wokwi for público, execute-o de uma cópia privada/local sem compartilhar `secrets.h`.
7. Inicie a simulação. No AWS IoT Core, abra **MQTT test client**, assine `industria/smartn1/telemetria` e confirme que chegam mensagens. Depois confira os dados no portal.

O guia detalhado do certificado, policy, circuito, bibliotecas e sketch está em [Guia ESP32 e AWS IoT Core no Wokwi](07_guia_esp32_wokwi.md). Os nomes do client ID, Thing e tópico precisam corresponder à policy e ao firmware.

### Workflows: quais são automáticos e quais são manuais?

| Workflow | Disparo | Resultado |
|---|---|---|
| `ci.yml` | Automático em pull requests e pushes para `main` ou `develop`; também pode ser iniciado manualmente | Chama os quality gates. Não publica nem faz deploy. |
| `quality-gates.yml` | Chamado pelo CI e pela publicação; também tem `workflow_dispatch` | Lint, testes Flask/Java/Lambda/React, E2E e builds das imagens de serviço sem publicar. Normalmente não é necessário iniciá-lo diretamente. |
| `bootstrap-state.yml` | Manual, uma vez | Cria e protege o bucket remoto do state. |
| `terraform.yml` | Manual | Executa `init`, `plan` e `apply`; o apply ocorre dentro da execução iniciada. |
| `publish-dockerhub.yml` | Manual, na branch `main` | Repete os quality gates, publica Flask/Java no Docker Hub e React no S3. Não faz deploy na EC2. |
| `deploy-ssm.yml` | Manual, com o SHA completo já publicado | Atualiza os containers da EC2 via Systems Manager. |
| `destroy-aws.yml` | Manual e destrutivo; exige digitar `DESTROY FACTORY HUB` | Remove recursos da stack, o Thing/certificado/policy IoT informados e, por último, o bucket versionado do state. |

O fluxo normal de uma alteração é **push/PR -> CI automático -> publicação manual -> deploy manual**. O Terraform é executado manualmente quando a infraestrutura precisa ser criada ou alterada. Atualize os três Secrets AWS sempre que a sessão Learner Lab expirar; bootstrap, Terraform, publicação e deploy usam credenciais AWS.

### Encerramento e custos

NAT Gateway, ALB, EC2, RDS e outros recursos podem consumir o saldo enquanto existirem. Ao terminar a atividade, execute **Actions -> Destroy Factory Hub AWS project** conforme a seção **Destruição e state** e encerre o Learner Lab. O workflow remove também o bucket S3 do state ao final; será necessário executar novamente o bootstrap antes de provisionar outra vez.

## 1. Arquitetura AWS provisionada

Terraform cria os recursos AWS. InfluxDB, Java e Flask rodam no Docker Compose da EC2 privada. O React e compilado como arquivos estaticos, publicados no S3 privado e servidos pelo CloudFront.

~~~mermaid
flowchart TB
  USER[Browser] -->|HTTPS| CF[CloudFront]
  CF -->|Static files / OAC| S3WEB[(Private frontend bucket)]
  CF -->|/api/*| ALB[Public Application Load Balancer]
  ALB -->|8080| EC2[Private EC2: Java + Flask + InfluxDB]
  EC2 -->|5432| RDS[(Private RDS PostgreSQL)]
  LAMBDA[Lambda in private subnets] -->|8086| EC2
  IOT[AWS IoT Core] --> SQS[Amazon SQS] --> LAMBDA
  SQS -. retry limit .-> DLQ[Dead-letter queue]
  EC2 -->|Outbound HTTPS| NAT[NAT Gateway] --> IGW[Internet Gateway]
  GH[GitHub Actions] -->|Terraform| AWS[AWS APIs]
  GH -->|Publish static build| S3WEB
  GH -->|SSM Run Command| SSM[Systems Manager]
  SSM -. Agent outbound HTTPS .-> EC2
  GHB[Bootstrap workflow] -->|Create/configure| STATE[(Versioned private state bucket)]
~~~

### Fluxos principais

1. O ESP32 publica no tópico MQTT industria/smartn1/telemetria. O certificado, chave e IoT Policy do dispositivo são configurados fora desta stack.
2. A Topic Rule envia a mensagem à fila SQS. O event source mapping aciona a Lambda; após falhas repetidas, a mensagem pode ir para a DLQ.
3. CloudFront entrega o React via HTTPS a partir do S3 privado e encaminha `/api/*` ao ALB, que direciona as requisicoes a EC2 privada. A Lambda grava telemetria no InfluxDB e envia logs pelo endpoint privado do CloudWatch Logs.
4. Java, Flask e InfluxDB rodam como containers na EC2. Java acessa o RDS; as portas 8080, 5000 e 8086 nao recebem trafego publico direto.
5. A EC2 acessa Docker Hub, GitHub e APIs AWS por HTTPS via NAT Gateway. O SSM executa comandos sem abrir a porta 22.
6. Execute `bootstrap-state.yml` uma vez para criar e proteger o bucket versionado de state; copie o nome do resumo para `TF_STATE_BUCKET`.

## 2. Recursos criados e pré-requisitos externos

Terraform cria a VPC, subnets publicas e privadas, NAT Gateway, ALB, bucket S3 privado, CloudFront OAC, EC2 e RDS privados, SQS, regra IoT, Lambda, parametros SSM e endpoint de CloudWatch Logs.

São pré-requisitos, ou ficam fora do state:

- Bucket S3 de state criado pelo workflow separado `bootstrap-state.yml` antes da primeira execucao Terraform.
- Instance profile EC2, role IoT→SQS e role de execução Lambda; no Learner Lab são fornecidos como recursos IAM existentes.
- Certificado, chave e IoT Policy do ESP32.
- Secrets/variables do GitHub, imagens Docker Hub e os workflows de CI/publicação/deploy.
- Dominio e certificado TLS personalizados nao sao criados; CloudFront usa o dominio e certificado padrao da AWS.

## 3. Arquivos, um por um

Terraform carrega todos os arquivos .tf deste diretório como uma configuração raiz. A divisão abaixo ajuda a leitura; não estabelece ordem de execução. Dependências são identificadas pelas referências aos recursos.

| Arquivo | O que faz |
|---|---|
| [backend.tf](../terraform/backend.tf) | Declara backend S3 sem valores embutidos. O workflow informa bucket, chave, região, criptografia e lock no terraform init. |
| [versions.tf](../terraform/versions.tf) | Define Terraform mínimo 1.10, providers AWS 5.x, Archive 2.7.x e Random 3.6.x; configura região AWS e tags padrão. |
| [main.tf](../terraform/main.tf) | Consulta AZs disponíveis e a AMI AL2023 publicada no SSM; gera senha RDS, token InfluxDB e senha InfluxDB; define AZs e tags locais comuns. |
| [variables.tf](../terraform/variables.tf) | Documenta tipos, descrições e defaults das entradas: região, ambiente, roles IAM existentes, usuário Docker Hub, CIDR, tamanhos, banco, InfluxDB, seed, repositório e prefixo. |
| [network.tf](../terraform/network.tf) | Creates public and private subnets, NAT Gateway and ALB; private routes for the application subnet. |
| [security_groups.tf](../terraform/security_groups.tf) | Allows ALB to reach Java on EC2; permits Lambda to reach InfluxDB. EC2 has no public ingress. |
| [compute.tf](../terraform/compute.tf) | Creates EC2 in the private subnet without a public IP and registers it in the ALB target group. |
| [bootstrap.sh.tftpl](../terraform/bootstrap.sh.tftpl) | Inicializa EC2: atualiza sistema, instala Docker/Git e curl-minimal se necessário, ativa SSM Agent, instala Docker Compose, clona o repositório e escreve .env inicial. |
| [storage.tf](../terraform/storage.tf) | Cria RDS PostgreSQL privado, por padrão db.t3.micro, armazenamento gp3 criptografado e retenção de backup de um dia. A senha vem do provider Random. |
| [ingestion.tf](../terraform/ingestion.tf) | Cria SQS e DLQ, Topic Rule IoT, arquivo ZIP da Lambda, função Python 3.12 na VPC e associação entre SQS e Lambda. |
| [lambda/telemetry_consumer.py](../terraform/lambda/telemetry_consumer.py) | Código executado pela Lambda: processa mensagens recebidas da fila e grava medições no InfluxDB usando variáveis de ambiente. |
| [runtime_parameters.tf](../terraform/runtime_parameters.tf) | Cria parâmetros SSM para conexão RDS e configuração de runtime. Credenciais e tokens sensíveis são SecureString. |
| [outputs.tf](../terraform/outputs.tf) | Exposes CloudFront URL, S3 bucket/distribution IDs, ALB DNS, EC2 ID/private IP, RDS, SSM, SQS, Lambda and VPC outputs. |
| [frontend.tf](../terraform/frontend.tf) | Creates private S3 origin, CloudFront OAC/distribution, API behavior and SPA route function. |
| [terraform.tfvars.example](../terraform/terraform.tfvars.example) | Modelo de valores para execução local. Substitua placeholders; não coloque credenciais AWS ou tokens neste arquivo. |
| [.terraform.lock.hcl](../terraform/.terraform.lock.hcl) | Registra versões/checksums dos providers para instalações reproduzíveis. Deve ser versionado, não editado manualmente. |
| [README.md](../terraform/README.md) | Instruções operacionais de configuração GitHub, state remoto, provisionamento, custos e deploy SSM. |

O diretório .terraform/, __pycache__/ e o ZIP da Lambda são artefatos gerados; não são fontes a editar.

## 4. Variáveis e credenciais

| Entrada | Fonte/default | Função |
|---|---|---|
| aws_region | Repository variable AWS_REGION; default us-east-1 | Região dos recursos. |
| environment | academy | Ambiente em tags e prefixos SSM. |
| ec2_instance_profile_name | EC2_INSTANCE_PROFILE_NAME | Perfil IAM existente para SSM e leitura de parâmetros na EC2. |
| iot_sqs_role_arn | IOT_SQS_ROLE_ARN | Role IAM existente que permite à IoT Rule escrever na SQS. |
| lambda_execution_role_arn | LAMBDA_EXECUTION_ROLE_ARN | Role IAM existente para Lambda, logs, ENIs e leitura/remoção SQS. |
| dockerhub_username | Secret DOCKERHUB_USERNAME | Namespace das imagens. O token de publicação é usado pelo workflow Docker Hub. |
| app_http_cidrs | 0.0.0.0/0 | CIDRs allowed to access ALB HTTP; restrict when possible. |
| vpc_cidr | 10.40.0.0/16 | Faixa privada da VPC; evite colisão com redes conectadas. |
| instance_type, db_instance_class | t3.small, db.t3.micro | Tamanhos padrão EC2 e RDS para laboratório. |
| db_name, db_username | factoryhub, factoryhub_admin | Banco e usuário inicial; senha aleatória. |
| influxdb_org, influxdb_bucket | factoryhub, telemetry | Organização e bucket de telemetria. |
| seed_telemetry_days | 14 | Histórico didático inicial do InfluxDB. |
| github_repository_url | URL HTTPS do projeto | Repositório clonado no bootstrap. |
| name_prefix | factoryhub | Prefixo de nomes AWS e parâmetros. |

O workflow também exige TF_STATE_BUCKET como Repository variable e os Secrets temporários AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e AWS_SESSION_TOKEN. Credenciais Learner Lab expiram; atualize-as quando a sessão mudar. O Terraform não cria as roles IAM citadas: a identidade de execução também precisa poder passar essas roles (iam:PassRole).

## 5. Execução do Terraform

Execute [bootstrap-state.yml](../.github/workflows/bootstrap-state.yml) uma vez para criar o bucket do state; depois execute [terraform.yml](../.github/workflows/terraform.yml) para validar e aplicar a infraestrutura. O segundo workflow confirma que o bucket existe e tem versionamento antes de `terraform init`.

O bootstrap ativa bloqueio de acesso publico, ownership controls, criptografia SSE-S3 e versionamento. O backend usa a chave `factoryhub/terraform.tfstate` e lock nativo S3. Preserve o bucket para futuras atualizacoes da stack; o workflow manual de destruicao o remove somente depois de concluir a limpeza.

> O workflow executa apply automaticamente após gerar o plano. Uma execução pode criar recursos e gerar custos. Revise alterações e credenciais antes de iniciá-la. Se houver falha parcial, corrija a causa e rode novamente usando o mesmo state; não remova recursos do state manualmente.

## 6. Segurança, limites e custos

- EC2 fica em subnet privada sem IP publico; SSM e a saida da aplicacao usam NAT Gateway.
- CloudFront usa HTTPS para visitantes. O ALB HTTP e publico; restrinja `app_http_cidrs` quando apropriado.
- RDS e privado e aceita 5432 somente da EC2. InfluxDB aceita 8086 da Lambda; Java 8080 aceita trafego somente do ALB.
- Trust policies e permissões das roles IAM existentes não são criadas nem corrigidas por estes arquivos.
- Segredos podem residir no state. Controle acesso ao S3.
- EC2, RDS, endpoint de interface, NAT Gateway, ALB, CloudFront, S3, volumes, SQS e Lambda podem gerar custos. NAT e ALB tem custo continuo e podem esgotar o saldo do Learner Lab.

## 7. Outputs e conferência

Outputs: `frontend_url`, `frontend_bucket_name`, `cloudfront_distribution_id`, `api_load_balancer_dns`, `ec2_instance_id`, `ec2_private_ip`, RDS endpoint, SSM prefixes, SQS, Lambda and VPC.

After apply, check that EC2 is Online in Systems Manager and confirm the queues, IoT rule, Lambda, RDS, CloudFront distribution and S3 bucket. Provisioning does not publish the frontend or deploy backend images.

## 8. Ordem dos workflows

**First install or infrastructure change:** Terraform -> wait for EC2 Online -> configure frontend bucket/distribution repository variables -> CI/quality gates -> manual publish to Docker Hub and S3 -> manual SSM deploy with the full SHA.

**Normal application update:** CI/quality gates -> manual publish to Docker Hub and S3 -> manual SSM deploy with the same commit SHA. Terraform is not needed for every application release.

## 9. Destruição e state

O workflow manual **Actions -> Destroy Factory Hub AWS project** remove os recursos Terraform e os recursos IoT do dispositivo. Antes de iniciar:

1. Pare a simulação no Wokwi e faça backup dos dados que deseja manter. O RDS é apagado sem snapshot final; os dados do InfluxDB no disco da EC2, filas, parâmetros e demais recursos da stack também podem ser perdidos.
2. Inicie/renove o Learner Lab e atualize `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN` no GitHub. Confirme também as variáveis `AWS_REGION`, `TF_STATE_BUCKET`, `EC2_INSTANCE_PROFILE_NAME`, `IOT_SQS_ROLE_ARN`, `LAMBDA_EXECUTION_ROLE_ARN` e o secret `DOCKERHUB_USERNAME`, necessários para inicializar o mesmo backend e configuração Terraform.
3. Em **Actions**, selecione **Destroy Factory Hub AWS project -> Run workflow**. Informe o Thing e a policy IoT usados (padrões: `esp32-torno-01` e `factoryhub-esp32-publish`) e digite exatamente `DESTROY FACTORY HUB` no campo de confirmação.
4. Acompanhe a execução. Primeiro o Terraform destrói os recursos registrados no state, incluindo CloudFront, S3 do frontend, EC2, RDS, VPC, filas e Lambda; depois o script remove o Thing/certificado/policy IoT de dispositivo; por último, apaga todas as versões e marcadores de exclusão do bucket do state e o próprio bucket.

O workflow é exclusivamente manual e não é acionado por push. Ele não remove roles IAM nem instance profiles preexistentes. Certificados e policies IoT que ainda estejam associados a outros dispositivos são preservados. Se a execução falhar antes da última etapa, o bucket/state permanece para permitir corrigir a causa e tentar novamente. Após sucesso, a variável GitHub `TF_STATE_BUCKET` ainda guarda o nome do bucket apagado: execute **Bootstrap Terraform state bucket** e atualize a variável antes de provisionar novamente.

## 10. Glossário

- **Provider:** plugin que traduz configuração em chamadas às APIs AWS.
- **Resource:** objeto que o Terraform cria, atualiza ou remove.
- **Data source:** consulta informação existente, como AMI ou zonas disponíveis.
- **State:** registro que relaciona configuração e recursos reais.
- **Plan / apply:** previsão das mudanças / execução dessas mudanças.
- **Instance profile:** identidade IAM associada à EC2 para ela chamar serviços AWS sem guardar chaves permanentes.
