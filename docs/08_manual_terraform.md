# Manual do Terraform e da infraestrutura AWS

Este manual explica a configuração Terraform do Factory Hub, os arquivos do diretório, os recursos provisionados e seus fluxos. O exemplo foi preparado para o AWS Academy Learner Lab.

> EC2 runs in a private subnet without a public IP or SSH. The static frontend is served by private S3 + CloudFront; `/api/*` goes through CloudFront and a public ALB to the private backend.

## 1. Arquitetura AWS provisionada

Terraform cria a infraestrutura AWS. InfluxDB, Java e Flask rodam no Docker Compose da EC2 privada. React e compilado como arquivos estaticos e publicado no S3 privado, servido pelo CloudFront.

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
  GH <-->|Terraform state| STATE[(Pre-created state bucket)]
~~~

### Fluxos principais

1. O ESP32 publica no tópico MQTT industria/smartn1/telemetria. O certificado, chave e IoT Policy do dispositivo são configurados fora desta stack.
2. A Topic Rule envia a mensagem à fila SQS. O event source mapping aciona a Lambda; após falhas repetidas, a mensagem pode ir para a DLQ.
3. CloudFront delivers React from private S3 and forwards `/api/*` to the ALB, which routes requests to the private EC2. Lambda writes telemetry to InfluxDB and sends logs through the private CloudWatch Logs endpoint.
4. Java, Flask and InfluxDB run as containers on EC2. Java accesses RDS; ports 8080, 5000 and 8086 have no direct public ingress.
5. EC2 accesses Docker Hub, GitHub and AWS APIs over HTTPS through NAT Gateway. SSM runs commands without opening port 22.
6. The Terraform workflow stores state and lock in the pre-created S3 bucket, outside the managed stack.

## 2. Recursos criados e pré-requisitos externos

Terraform cria VPC, subnets publicas/privadas, NAT Gateway, ALB, S3 privado, CloudFront OAC, EC2/RDS privados, SQS, IoT Rule, Lambda, parametros SSM e endpoint de CloudWatch Logs.

São pré-requisitos, ou ficam fora do state:

- Bucket S3 de state, criado antes do primeiro workflow, privado, criptografado e com versionamento.
- Instance profile EC2, role IoT→SQS e role de execução Lambda; no Learner Lab são fornecidos como recursos IAM existentes.
- Certificado, chave e IoT Policy do ESP32.
- Secrets/variables do GitHub, imagens Docker Hub e os workflows de CI/publicação/deploy.
- Custom domain and TLS certificate are not created; CloudFront uses its default domain and certificate.

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

O workflow [terraform.yml](../.github/workflows/terraform.yml) é manual: **Actions → Provisionar infraestrutura AWS → Run workflow**. Ele verifica configurações e o bucket; configura credenciais; inicializa state remoto; roda fmt -check, validate, plan e aplica o plano criado no mesmo job.

O bucket deve existir antes da execução, com bloqueio público, criptografia e versionamento. A chave do state é factoryhub/terraform.tfstate; o lock nativo usa arquivo S3. Proteja o bucket: state pode conter dados sensíveis, mesmo quando outputs estão marcados como sensitive.

> O workflow executa apply automaticamente após gerar o plano. Uma execução pode criar recursos e gerar custos. Revise alterações e credenciais antes de iniciá-la. Se houver falha parcial, corrija a causa e rode novamente usando o mesmo state; não remova recursos do state manualmente.

## 6. Segurança, limites e custos

- EC2 fica em subnet privada sem IP publico; SSM e a saida da aplicacao usam NAT Gateway.
- CloudFront usa HTTPS para visitantes. O ALB HTTP e publico; restrinja `app_http_cidrs` quando apropriado.
- RDS e privado e aceita 5432 somente da EC2. InfluxDB aceita 8086 da Lambda; Java 8080 aceita trafego somente do ALB.
- Trust policies e permissões das roles IAM existentes não são criadas nem corrigidas por estes arquivos.
- Segredos podem residir no state. Controle acesso ao S3.
- RDS e privado e aceita 5432 somente da EC2. InfluxDB aceita 8086 da Lambda; Java 8080 aceita trafego somente do ALB.
- EC2, RDS, endpoint de interface, NAT Gateway, ALB, CloudFront, S3, volumes, SQS e Lambda podem gerar custos. NAT e ALB tem custo continuo e podem esgotar o saldo do Learner Lab.

## 7. Outputs e conferência

Outputs: `frontend_url`, `frontend_bucket_name`, `cloudfront_distribution_id`, `api_load_balancer_dns`, `ec2_instance_id`, `ec2_private_ip`, RDS endpoint, SSM prefixes, SQS, Lambda and VPC.

After apply, check that EC2 is Online in Systems Manager and confirm the queues, IoT rule, Lambda, RDS, CloudFront distribution and S3 bucket. Provisioning does not publish the frontend or deploy backend images.

## 8. Ordem dos workflows

**First install or infrastructure change:** Terraform -> wait for EC2 Online -> configure frontend bucket/distribution repository variables -> CI/quality gates -> manual publish to Docker Hub and S3 -> manual SSM deploy with the full SHA.

**Normal application update:** CI/quality gates -> manual publish to Docker Hub and S3 -> manual SSM deploy with the same commit SHA. Terraform is not needed for every application release.

## 9. Destruição e state

Não há workflow de destruição nesta configuração. Para remover a stack, use as mesmas credenciais, backend e state; preserve os dados necessários antes. O RDS será apagado sem snapshot final, os dados dos containers/volume EC2 podem ser perdidos e filas também podem ser removidas. Mantenha o bucket S3 e o state até confirmar a remoção completa.

## 10. Glossário

- **Provider:** plugin que traduz configuração em chamadas às APIs AWS.
- **Resource:** objeto que o Terraform cria, atualiza ou remove.
- **Data source:** consulta informação existente, como AMI ou zonas disponíveis.
- **State:** registro que relaciona configuração e recursos reais.
- **Plan / apply:** previsão das mudanças / execução dessas mudanças.
- **Instance profile:** identidade IAM associada à EC2 para ela chamar serviços AWS sem guardar chaves permanentes.
