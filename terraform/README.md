# Provisionamento AWS do Factory Hub

Para a explicação completa arquivo por arquivo, com diagrama da topologia AWS, consulte o [Manual do Terraform e da infraestrutura AWS](../docs/08_manual_terraform.md).

O workflow `.github/workflows/terraform.yml` executa Terraform no GitHub Actions com credenciais temporárias do Learner Lab e state remoto no S3. O runner não depende de credenciais AWS locais. O provisionamento é iniciado manualmente em **Actions → Provisionar infraestrutura AWS → Run workflow**.

A stack cria VPC, ALB publico, NAT Gateway, RDS privado, SQS/Lambda, S3 privado e CloudFront. A EC2 roda em subnet privada sem IP publico; SSM e o canal administrativo.

O backend Java usa o RDS quando executado com o perfil `postgres`. O Terraform publica host, database, username e senha em parâmetros do Systems Manager sob `/factoryhub/academy/rds`; a senha é `SecureString`. Também publica as configurações do Docker Hub e InfluxDB sob `/factoryhub/academy/runtime`, com token e senha do InfluxDB como `SecureString`. O deployment via SSM busca esses parâmetros pela instance profile e reconstrói o `.env` da EC2 sem incluir segredos no comando enviado pelo GitHub. Isso permite recuperar a implantação mesmo quando o bootstrap da EC2 não terminou.

No Amazon Linux 2023, o bootstrap usa `curl-minimal` que já vem na AMI e não tenta instalar o pacote `curl`, que conflita com ele.

## 1. Crie o bucket do state com o bootstrap

O bucket do state precisa existir antes do primeiro `terraform init`, pois o backend S3 e inicializado antes dos recursos Terraform. O workflow separado cria esse bucket e configura a protecao necessaria.

1. Configure `AWS_REGION` e os Secrets AWS temporarios do Learner Lab em **Settings -> Secrets and variables -> Actions**.
2. Escolha um nome S3 globalmente unico que comece com `factoryhub-state-`, por exemplo `factoryhub-state-factoryhub-2026`. Use letras minusculas, numeros, pontos ou hifens.
3. Execute **Actions -> Bootstrap Terraform state bucket -> Run workflow** e informe esse nome.
4. O workflow cria o bucket na regiao `AWS_REGION` (ou atualiza a configuracao de um bucket existente seu), ativa bloqueio de acesso publico, ownership controls, criptografia SSE-S3 e versionamento.
5. Ao concluir, copie o valor exibido no resumo e cadastre a Repository variable `TF_STATE_BUCKET`. O workflow Terraform principal usa essa variavel para inicializar o backend remoto.

O bootstrap e idempotente para o bucket da mesma conta e regiao. Se o nome pertencer a outra conta ou estiver em outra regiao, o workflow falha sem adotar o bucket. Nao apague o bucket: ele contem o state necessario para atualizacoes e destruicao da stack.
A identidade AWS usada pelo bootstrap precisa de permissoes para criar e configurar buckets S3; o `GITHUB_TOKEN` nao e usado para alterar configuracoes do repositorio.

A identidade AWS precisa de `s3:CreateBucket`, `s3:ListBucket`, `s3:GetBucketLocation`, `s3:PutBucketOwnershipControls`, `s3:PutPublicAccessBlock`, `s3:PutBucketVersioning` e `s3:PutEncryptionConfiguration` no bucket. O usuario que inicia o workflow precisa poder editar Repository variables para cadastrar `TF_STATE_BUCKET`.

O backend usa a chave `factoryhub/terraform.tfstate`, criptografia e o lock nativo S3 (`use_lockfile=true`), disponivel no Terraform 1.10 ou superior.
## 2. Configure GitHub Actions

Em **Settings → Secrets and variables → Actions**, mantenha os seguintes **Secrets**:

| Nome | Uso |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | Credencial temporária do Learner Lab |
| `AWS_SECRET_ACCESS_KEY` | Credencial temporária do Learner Lab |
| `AWS_SESSION_TOKEN` | Token temporário do Learner Lab |
| `DOCKERHUB_USERNAME` | Nome do usuário/organização usado nas imagens |
| `DOCKERHUB_TOKEN` | Token para publicar imagens backend no Docker Hub |

Configure estas **Repository variables** (não são segredos):

| Nome | Uso |
| --- | --- |
| `AWS_REGION` | Região AWS, por exemplo `us-east-1` |
| `TF_STATE_BUCKET` | Nome informado no bootstrap e copiado uma vez do resumo para esta variavel |
| `EC2_INSTANCE_PROFILE_NAME` | Instance profile com permissões de SSM para a EC2 |
| `IOT_SQS_ROLE_ARN` | ARN da role confiável pelo IoT Core e autorizada a enviar para SQS |
| `LAMBDA_EXECUTION_ROLE_ARN` | ARN da role da Lambda com permissões de logs, ENI e leitura da fila |
| `FRONTEND_BUCKET_NAME` | Terraform output `frontend_bucket_name`, S3 destination for React build |
| `CLOUDFRONT_DISTRIBUTION_ID` | Terraform output `cloudfront_distribution_id`, used to invalidate cache |

As três variáveis IAM correspondem aos valores requeridos em `variables.tf`. O Terraform não cria nem altera roles. O perfil EC2 deve permitir SSM e `ssm:GetParameter` nos parâmetros `/factoryhub/academy/rds/*` e `/factoryhub/academy/runtime/*`, além de `kms:Decrypt` para as SecureStrings; a role IoT deve confiar em `iot.amazonaws.com` e permitir `sqs:SendMessage`; a role Lambda deve confiar em `lambda.amazonaws.com` e permitir CloudWatch Logs, operações de ENI e leitura/deleção/consulta de atributos da fila SQS. A identidade temporária usada pelo Terraform precisa poder criar os parâmetros (`ssm:PutParameter`) e passar as roles existentes (`iam:PassRole`).

Os Secrets AWS do Learner Lab expiram. Atualize os três antes de cada execução iniciada após expiração. Não cole esses valores em arquivos do repositório, issues ou mensagens.

## 3. Execute o provisionamento

> **Nota de migracao:** mover a EC2 existente para uma subnet privada substitui a instancia. Faca backup dos dados InfluxDB nos volumes Docker antes do apply; o volume raiz sera excluido junto da instancia antiga.

1. Confirme que o bucket existe, tem bloqueio público e versionamento habilitado.
2. Confirme os cinco Secrets e as sete Repository variables acima.
3. Inicie ou renove o Learner Lab e atualize os Secrets AWS se necessário.
4. Acesse **Actions → Provisionar infraestrutura AWS → Run workflow**.
5. O workflow aplica o plano criado no mesmo job.

> **Atenção:** iniciar o workflow executa o `apply` automaticamente depois do `plan`; isso cria recursos AWS e pode gerar cobranças. Confira a configuração e as permissões antes de clicar em **Run workflow**.

### Se o `apply` falhar depois de criar alguns recursos

O Terraform pode criar parte da infraestrutura antes de encontrar um erro. Corrija a causa, publique a alteração e execute novamente o workflow: ele consulta o state remoto no S3 e planeja as alterações restantes. Não apague o state nem remova manualmente os recursos já criados.

O workflow usa Terraform 1.10.5, executa `init`, `fmt -check`, `validate`, `plan` e `apply`, e impede execucoes concorrentes. A primeira migracao da EC2 da subnet publica para a privada substitui a instancia; faca backup dos volumes Docker do InfluxDB antes do apply. Se o bucket nao existir, o versionamento estiver desativado ou faltar configuracao, a execucao para antes do `plan`/`apply`.

O backend guarda state e lock no S3. O principal AWS usado pelo GitHub Actions precisa de `s3:ListBucket`, `s3:GetBucketLocation`, `s3:GetBucketVersioning`, leitura/escrita do objeto `factoryhub/terraform.tfstate` e leitura/escrita/remoção do arquivo de lock `factoryhub/terraform.tfstate.tflock`, além das permissões AWS de provisionamento. Restrinja essas permissões ao bucket e aos objetos do Factory Hub quando o ambiente permitir.

> **Migração de state:** este workspace não contém um `terraform.tfstate` local. Se os recursos já tiverem sido criados por outro workspace/estado, migre esse state para o S3 antes de executar o workflow. Um state remoto vazio não deve ser usado para recriar recursos existentes.

## Custos e rede

A stack inclui EC2, RDS, endpoint de interface, NAT Gateway, ALB, CloudFront, S3, SQS, Lambda e volumes. NAT Gateway e ALB geram custos continuos; CloudFront e S3 variam conforme trafego. A arquitetura e adequada para explorar os servicos, mas pode exceder o saldo do Learner Lab.

O output `frontend_url` aponta para o CloudFront HTTPS. O frontend fica no S3 privado; `/api/*` segue pelo CloudFront e ALB ate o backend na EC2 privada. A porta 8080 da instancia aceita apenas o security group do ALB. InfluxDB 8086 aceita a Lambda e PostgreSQL 5432 aceita a aplicacao.

Depois do apply, o resumo da execucao Terraform mostra `frontend_url`, `frontend_bucket_name`, `cloudfront_distribution_id`, `api_load_balancer_dns` e `ec2_instance_id`. Use os dois outputs frontend para configurar as Repository variables do publish. O principal AWS usado para publicar tambem precisa de `s3:ListBucket`, `s3:PutObject`, `s3:DeleteObject` e `cloudfront:CreateInvalidation` nos recursos do frontend.

## Deploy da aplicacao via SSM

Apos o provisionamento, configure `FRONTEND_BUCKET_NAME` e `CLOUDFRONT_DISTRIBUTION_ID` nas Repository variables usando os outputs Terraform. A publicacao manual passa os quality gates, publica as imagens Java/Flask no Docker Hub e envia o build React ao bucket S3, depois invalida o cache CloudFront. Para atualizar o backend, execute `deploy-ssm.yml` com o SHA completo de 40 caracteres publicado. O deploy atualiza os servicos na EC2 privada por Systems Manager. Renove as credenciais AWS temporarias quando expirarem.

## Destruir a infraestrutura

Execute manualmente **Actions -> Destroy Factory Hub AWS project** e digite `DESTROY FACTORY HUB`. O workflow usa o mesmo backend/state, destrói primeiro os recursos Terraform, limpa o Thing/certificado/policy de dispositivo informados e apaga o bucket versionado do state por último. Faça backup antes: RDS não tem snapshot final e os dados dos volumes EC2 são removidos. Roles IAM e instance profiles preexistentes permanecem; recursos IoT compartilhados também são preservados. Após sucesso, rode novamente o bootstrap do state e atualize `TF_STATE_BUCKET` antes de provisionar de novo.
