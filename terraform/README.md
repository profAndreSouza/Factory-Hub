# Provisionamento AWS do Factory Hub

O workflow `.github/workflows/terraform.yml` executa Terraform no GitHub Actions com credenciais temporárias do Learner Lab e state remoto no S3. O runner não depende de credenciais AWS locais. O provisionamento é iniciado manualmente em **Actions → Provisionar infraestrutura AWS → Run workflow**.

O Terraform cria VPC, EC2 com Docker e SSM Agent, RDS PostgreSQL privado, SQS/DLQ, regra IoT, Lambda consumidora e rede. A EC2 não recebe conexões SSH. A configuração e o deploy SSM usam APIs HTTPS; o SSM Agent inicia conexões de saída HTTPS/443.

O backend Java usa o RDS quando executado com o perfil `postgres`. O Terraform publica host, database, username e senha em parâmetros do Systems Manager sob `/factoryhub/academy/rds`; a senha é `SecureString`. Também publica as configurações do Docker Hub e InfluxDB sob `/factoryhub/academy/runtime`, com token e senha do InfluxDB como `SecureString`. O deployment via SSM busca esses parâmetros pela instance profile e reconstrói o `.env` da EC2 sem incluir segredos no comando enviado pelo GitHub. Isso permite recuperar a implantação mesmo quando o bootstrap da EC2 não terminou.

No Amazon Linux 2023, o bootstrap usa `curl-minimal` que já vem na AMI e não tenta instalar o pacote `curl`, que conflita com ele.

## 1. Crie o bucket do state antes do primeiro workflow

O bucket S3 é um pré-requisito e fica fora dos recursos gerenciados por este Terraform. Crie-o uma única vez pela AWS Console, na mesma região configurada em `AWS_REGION`:

- O nome deve ser globalmente único. `factory-hub-example` só funcionará se esse nome estiver disponível e o bucket tiver sido criado na sua conta.
- Ative o bloqueio de acesso público.
- Ative o versionamento.
- Mantenha a criptografia padrão do S3 habilitada.

O workflow verifica se o bucket existe e se o versionamento está ativo. O backend usa criptografia e o lock nativo do S3 (`use_lockfile=true`), disponível no Terraform 1.10 ou superior. Não apague o bucket: ele contém o state necessário para futuras atualizações e destruição da infraestrutura.

## 2. Configure GitHub Actions

Em **Settings → Secrets and variables → Actions**, mantenha os seguintes **Secrets**:

| Nome | Uso |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | Credencial temporária do Learner Lab |
| `AWS_SECRET_ACCESS_KEY` | Credencial temporária do Learner Lab |
| `AWS_SESSION_TOKEN` | Token temporário do Learner Lab |
| `DOCKERHUB_USERNAME` | Nome do usuário/organização usado nas imagens |
| `DOCKERHUB_TOKEN` | Token usado para publicar imagens no Docker Hub |

Configure estas **Repository variables** (não são segredos):

| Nome | Uso |
| --- | --- |
| `AWS_REGION` | Região AWS, por exemplo `us-east-1` |
| `TF_STATE_BUCKET` | Nome do bucket S3 de state criado acima |
| `EC2_INSTANCE_PROFILE_NAME` | Instance profile com permissões de SSM para a EC2 |
| `IOT_SQS_ROLE_ARN` | ARN da role confiável pelo IoT Core e autorizada a enviar para SQS |
| `LAMBDA_EXECUTION_ROLE_ARN` | ARN da role da Lambda com permissões de logs, ENI e leitura da fila |

As três variáveis IAM correspondem aos valores requeridos em `variables.tf`. O Terraform não cria nem altera roles. O perfil EC2 deve permitir SSM e `ssm:GetParameter` nos parâmetros `/factoryhub/academy/rds/*` e `/factoryhub/academy/runtime/*`, além de `kms:Decrypt` para as SecureStrings; a role IoT deve confiar em `iot.amazonaws.com` e permitir `sqs:SendMessage`; a role Lambda deve confiar em `lambda.amazonaws.com` e permitir CloudWatch Logs, operações de ENI e leitura/deleção/consulta de atributos da fila SQS. A identidade temporária usada pelo Terraform precisa poder criar os parâmetros (`ssm:PutParameter`) e passar as roles existentes (`iam:PassRole`).

Os Secrets AWS do Learner Lab expiram. Atualize os três antes de cada execução iniciada após expiração. Não cole esses valores em arquivos do repositório, issues ou mensagens.

## 3. Execute o provisionamento

1. Confirme que o bucket existe, tem bloqueio público e versionamento habilitado.
2. Confirme que os cinco Secrets e as cinco Repository variables acima estão configurados.
3. Inicie ou renove o Learner Lab e atualize os Secrets AWS se necessário.
4. Acesse **Actions → Provisionar infraestrutura AWS → Run workflow**.
5. O workflow aplica o plano criado no mesmo job.

> **Atenção:** iniciar o workflow executa o `apply` automaticamente depois do `plan`; isso cria recursos AWS e pode gerar cobranças. Confira a configuração e as permissões antes de clicar em **Run workflow**.

### Se o `apply` falhar depois de criar alguns recursos

O Terraform pode criar parte da infraestrutura antes de encontrar um erro. Corrija a causa, publique a alteração e execute novamente o workflow: ele consulta o state remoto no S3 e planeja as alterações restantes. Não apague o state nem remova manualmente os recursos já criados.

O workflow usa Terraform 1.10.5, executa `init`, `fmt -check`, `validate`, `plan` e `apply`, e impede duas execuções concorrentes. A configuração cria parâmetros SSM para RDS e runtime sem substituir a EC2. Se o bucket não existir, o versionamento estiver desativado ou faltar configuração, a execução para antes do `plan`/`apply`.

O backend guarda state e lock no S3. O principal AWS usado pelo GitHub Actions precisa de `s3:ListBucket`, `s3:GetBucketLocation`, `s3:GetBucketVersioning`, leitura/escrita do objeto `factoryhub/terraform.tfstate` e leitura/escrita/remoção do arquivo de lock `factoryhub/terraform.tfstate.tflock`, além das permissões AWS de provisionamento. Restrinja essas permissões ao bucket e aos objetos do Factory Hub quando o ambiente permitir.

> **Migração de state:** este workspace não contém um `terraform.tfstate` local. Se os recursos já tiverem sido criados por outro workspace/estado, migre esse state para o S3 antes de executar o workflow. Um state remoto vazio não deve ser usado para recriar recursos existentes.

## Custos e rede

A configuração inclui EC2 `t3.small`, RDS PostgreSQL `db.t3.micro` Single-AZ e um endpoint de interface de CloudWatch Logs, além de SQS, Lambda e rede. Esses serviços podem gerar cobrança no Learner Lab. Não há NAT Gateway nem Load Balancer.

O output `frontend_url` aponta para o portal HTTP na porta 80. InfluxDB na porta 8086 aceita tráfego da Lambda; PostgreSQL 5432 permite conexão de saída da EC2 e entrada somente do security group da aplicação. Java 8080, Flask 5000 e SSH 22 não são expostos publicamente. Não há TLS de entrada configurado.

## Deploy da aplicação via SSM

Após o provisionamento, aguarde a EC2 aparecer **Online** no Systems Manager. Execute o workflow `.github/workflows/terraform.yml` para criar os parâmetros de runtime usados pelo Compose; em seguida, inicie manualmente `.github/workflows/deploy-ssm.yml` em **Actions → Deploy through SSM → Run workflow**. Esse workflow não constrói nem publica imagens: ele baixa `latest` do Docker Hub, atualiza o `.env` com valores do SSM e inicia o Compose. Atualize as credenciais AWS temporárias no GitHub sempre que expirarem.

## Destruir a infraestrutura

A destruição deve usar o mesmo backend e state remoto. Faça backup dos dados necessários e execute um workflow próprio de destroy, ou rode localmente com as credenciais válidas, o backend inicializado e o mesmo state. A remoção apaga o RDS sem snapshot final e os dados nos volumes da EC2; o bucket de state deve ser preservado.
