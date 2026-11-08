# 🛡️ Guia de Operação no AWS Academy Learner Lab

> **Manual de Sobrevivência:** Como provisionar e executar a infraestrutura do Factory Hub sem esgotar o orçamento de \$100 nem ser bloqueado pelas restrições de permissão do sandbox.

---

## 1. Passo a Passo de Inicialização do Laboratório

1. Acesse o **AWS Academy** e entre no módulo **Learner Lab**.
2. Clique no botão **"Start Lab"**. Aguarde o círculo de status ao lado do botão mudar de vermelho para **verde** com a indicação de tempo restante (geralmente 4 horas).
3. Clique em **"AWS Details"** ao lado do botão de status.
4. Na seção **AWS CLI**, copie o bloco de credenciais de sessão temporárias:
   ```ini
   [default]
   aws_access_key_id=ASIA...
   aws_secret_access_key=...
   aws_session_token=IQoJ...
   ```
5. No seu computador local, cole essas credenciais no arquivo `~/.aws/credentials` (no Linux/macOS) ou `%USERPROFILE%\.aws\credentials` (no Windows).
6. Faça o download da sua chave privada SSH clicando em **"Download SSH Key"** (salve como `labsuser.pem`).

---

## 2. Regra de Ouro do IAM: A `LabRole`

> [!CRITICAL]
> No AWS Academy Learner Lab, estudantes **NÃO possuem permissão** para criar novos perfis ou políticas IAM (`iam:CreateRole`, `iam:CreatePolicy` ou `iam:AttachRolePolicy`).
> 
> Qualquer comando `terraform apply` que tente criar uma `aws_iam_role` falhará com erro de `AccessDenied`.

### Como Resolver:
1. No console da AWS, acesse o serviço **IAM** e clique em **Roles**.
2. Localize a role chamada **`LabRole`** e copie seu ARN completo:
   ```text
   arn:aws:iam::123456789012:role/LabRole
   ```
3. No arquivo `terraform/terraform.tfvars`, defina:
   ```hcl
   lab_role_arn = "arn:aws:iam::123456789012:role/LabRole"
   ```
4. Na criação de instâncias EC2, utilize:
   ```hcl
   iam_instance_profile = "LabRole"
   ```

---

## 3. Guia de Economia: Como Manter o Custo Abaixo de \$5/mês

| Recurso | O Que Evitar (Alto Custo) | Solução Adotada no Factory Hub | Economia Estimada |
|---|---|---|---|
| **Rede** | Provisionar **NAT Gateway** gerenciado | EC2 em Subnet Pública com Security Group fechado | Economia de **\$32,40/mês** |
| **Balanceador** | Application Load Balancer (ALB) | Porta 80 aberta diretamente na EC2 com Nginx | Economia de **\$18,00/mês** |
| **Banco Temporal** | AWS Timestream (queries pagas) | Container TimescaleDB / InfluxDB na EC2 | Economia de **\$10,00/mês** |
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

