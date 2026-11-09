# Guia de Operação no AWS Academy Learner Lab

> **Manual de Sobrevivência:** Como provisionar e executar a infraestrutura do Factory Hub sem esgotar o orçamento de \$100 nem ser bloqueado pelas restrições de permissão do sandbox.

---

## 1. Passo a Passo de Inicialização do Laboratório

1. Acesse o **AWS Academy** e entre no módulo **Learner Lab**.
2. Clique no botão **"Start Lab"**. Aguarde o círculo de status ao lado do botão mudar de vermelho para **verde** com a indicação de tempo restante (geralmente 4 horas).
3. Clique em **"AWS Details"** ao lado do botão de status.
4. Na seção **AWS CLI**, copie as três credenciais temporárias para os GitHub Secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN`. Atualize os Secrets quando a sessão expirar.
5. Crie pela AWS Console o bucket S3 de state indicado pela variável `TF_STATE_BUCKET`; habilite bloqueio de acesso público, versionamento e criptografia. O bucket precisa existir antes do primeiro workflow Terraform.
6. O provisionamento ocorre pelo GitHub Actions; não é necessário configurar credenciais AWS no computador local. Não é necessário baixar chave SSH: o deploy usa Systems Manager e não abre a porta 22.

---

## 2. Regra de Ouro do IAM: perfis e roles preexistentes

> [!CRITICAL]
> No AWS Academy Learner Lab, estudantes podem não possuir permissão para criar novos perfis ou políticas IAM (`iam:CreateRole`, `iam:CreatePolicy` ou `iam:AttachRolePolicy`).
> 
> Qualquer comando `terraform apply` que tente criar uma `aws_iam_role` falhará com erro de `AccessDenied`.

### Como Resolver:
1. No console AWS, confira o instance profile da EC2 e as roles de execução da Lambda e da regra IoT.
2. Confirme que o perfil EC2 permite SSM Agent (`AmazonSSMManagedInstanceCore` ou permissões equivalentes), a role Lambda confia em `lambda.amazonaws.com` e a role IoT confia em `iot.amazonaws.com`.
3. Cadastre os valores nas Repository variables `EC2_INSTANCE_PROFILE_NAME`, `IOT_SQS_ROLE_ARN` e `LAMBDA_EXECUTION_ROLE_ARN`. O workflow os passa ao Terraform por variáveis `TF_VAR_*`.

Não presuma que `LabRole` atende todos esses serviços: a conta precisa permitir `iam:PassRole`, e as roles precisam das permissões descritas em `terraform/README.md`. Se o laboratório não fornecer perfis compatíveis nem permitir criá-los/ajustá-los, peça ao instrutor para habilitá-los antes do Terraform.

---

## 3. Guia de Economia: Como Manter o Custo Abaixo de \$5/mês

| Recurso | O Que Evitar (Alto Custo) | Solução Adotada no Factory Hub | Economia Estimada |
|---|---|---|---|
| **Rede** | Provisionar **NAT Gateway** gerenciado | EC2 em Subnet Pública com Security Group fechado | Economia de **\$32,40/mês** |
| **Balanceador** | Application Load Balancer (ALB) | Porta 80 aberta diretamente na EC2 com Nginx | Economia de **\$18,00/mês** |
| **Banco Temporal** | AWS Timestream (queries pagas) | Container InfluxDB na EC2 | Economia de **\$10,00/mês** |
| **Computação** | Várias instâncias separadas | Única instância `t3.small` com Docker Compose | Economia de **\$15,00/mês** |

---

## 4. Procedimento de Encerramento e Limpeza

Sempre que concluir os testes ou a apresentação do projeto:
1. Destrua os recursos gerenciados para interromper a cobrança:
   ```bash
   cd terraform
   terraform destroy -auto-approve
   ```
2. No painel do AWS Academy, clique no botão **"End Lab"**.
3. Isso preserva seus créditos para as semanas finais de avaliação do semestre.

