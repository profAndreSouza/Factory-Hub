# Provisionamento AWS do Factory Hub

Esta pasta cria a VPC, EC2 Docker host, RDS PostgreSQL, SQS/DLQ, IoT Rule, Lambda consumidora e recursos de rede para SSM. A EC2 não recebe regra de entrada SSH: Terraform/GitHub Actions chamam APIs AWS por HTTPS e o SSM Agent abre comunicação de saída HTTPS/443.

## Pré-requisitos

- Terraform `>= 1.5`, AWS CLI v2 e Git instalados.
- Learner Lab iniciado, com credenciais temporárias atuais no perfil AWS local.
- Repositório público no GitHub e imagens públicas do Docker Hub com nomes `factoryhub-frontend`, `factoryhub-backend` e `factoryhub-ml-service`.
- Perfis e roles IAM preexistentes compatíveis com o laboratório. O módulo não cria nem altera IAM:
  - `ec2_instance_profile_name`: instance profile da EC2, com `AmazonSSMManagedInstanceCore` ou permissões SSM equivalentes.
  - `iot_sqs_role_arn`: confiança para `iot.amazonaws.com` e permissão `sqs:SendMessage` na fila criada.
  - `lambda_execution_role_arn`: confiança para `lambda.amazonaws.com`, permissões de CloudWatch Logs, ENIs de VPC e `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` para a fila.
- A identidade usada pelo Terraform precisa poder criar VPC, EC2 e RDS, criar SQS, regras IoT, Lambda, event source mapping, endpoint de VPC e passar os perfis existentes (`iam:PassRole`). O usuário de CI também precisa de `ssm:SendCommand`, `ssm:ListCommandInvocations` e `ssm:GetCommandInvocation` para a instância marcada `Project=factoryhub`.

> **AWS Academy:** não suponha que a `LabRole` sirva automaticamente aos três serviços. Ela precisa ser um instance profile utilizável pela EC2 e permitir SSM; a role Lambda precisa confiar no serviço Lambda; a role da regra IoT precisa confiar no IoT Core. Confirme essas condições no console do laboratório ou com o instrutor antes do `apply`. Se o Learner Lab não fornecer esses perfis e não permitir criá-los/alterá-los, a parte correspondente não pode ser provisionada com segurança nessa conta.

## Credenciais temporárias

Copie as credenciais atuais do AWS Academy para o perfil local `default` sem compartilhá-las no chat ou no repositório. No PowerShell, configure os campos no arquivo `%USERPROFILE%\.aws\credentials` e depois confira a identidade:

```powershell
aws sts get-caller-identity
aws configure list
```

Se `get-caller-identity` retornar `InvalidClientTokenId`, `ExpiredToken` ou erro de sessão, renove as credenciais no Learner Lab e atualize o perfil antes de continuar. A execução neste ambiente foi bloqueada por credenciais inválidas; nenhuma chamada de provisionamento foi iniciada.

## Preparar e revisar

```powershell
cd terraform
Copy-Item terraform.tfvars.example terraform.tfvars
# Edite terraform.tfvars com os ARNs/perfis reais e seu usuário Docker Hub.
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out factoryhub.tfplan
```

Revise o plano, a região, as regras de entrada e os serviços que serão cobrados. Só então aplique o plano revisado:

```powershell
terraform apply factoryhub.tfplan
terraform output
```

O plano cria uma EC2 `t3.small`, RDS PostgreSQL `db.t3.micro` Single-AZ e um endpoint de interface para CloudWatch Logs, além de SQS, Lambda, VPC/sub-redes e armazenamento. Esses serviços podem gerar cobrança contínua no Learner Lab. Não há NAT Gateway nem Load Balancer.

## Iniciar o deploy

O `user_data` instala Docker, Git e Docker Compose, habilita SSM Agent e clona o repositório para `/opt/factoryhub`. Depois que a EC2 aparecer como **Online** em Systems Manager → Fleet Manager / Managed nodes, o GitHub Actions pode executar o workflow **Build, publish and deploy through SSM** (`workflow_dispatch`; enable automatic deploy on pushes to `main` by setting the `SSM_DEPLOY_ENABLED=true` repository variable). O workflow publica imagens Docker Hub com tag do commit e envia `AWS-RunShellScript` por SSM para executar `docker compose pull` e `up -d`.

Configure no repositório GitHub:

- Secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.
- Secrets temporários `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` do Learner Lab.
- Variable opcional `AWS_REGION` (padrão `us-east-1`).

As chaves STS do Learner Lab expiram; atualize os secrets antes de cada execução se necessário. O Terraform é executado localmente porque o state é local; não publique `terraform.tfstate`, `terraform.tfplan`, `terraform.tfvars` nem os arquivos `.zip` gerados.

Após aplicar, o output `frontend_url` aponta para o portal HTTP na porta 80. A porta 8086 do InfluxDB aceita somente tráfego originado da Lambda; PostgreSQL 5432 fica restrito à EC2. Nenhum SSH, Java 8080 ou Flask 5000 é exposto publicamente. O portal ainda usa HTTP; não há certificado TLS/HTTPS de entrada configurado.

## Destruir

Para encerrar a infraestrutura e cobranças, revise e execute:

```powershell
terraform plan -destroy -out destroy.tfplan
terraform apply destroy.tfplan
```

A destruição remove o RDS sem snapshot final (`skip_final_snapshot=true`), as filas e os recursos de rede. Faça backup dos dados necessários antes. Volumes da EC2 também serão removidos.
