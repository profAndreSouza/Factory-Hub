# ☁️ Referência Técnica: Computação em Nuvem (AWS Academy)

> **Unidade Curricular:** Computação em Nuvem (60 horas / 20 Semanas)  
> **Objetivo:** Provisionar e gerenciar a infraestrutura em nuvem na Amazon Web Services (AWS) utilizando Terraform sob as diretrizes do **AWS Academy Learner Lab**.

---

## 1. O Ambiente AWS Academy Learner Lab Sandbox

O AWS Academy fornece um ambiente sandbox isolado para cada estudante, com restrições técnicas específicas que orientam o desenho da arquitetura:

| Restrição do Sandbox | Consequência Técnica | Decisão de Arquitetura no Factory Hub |
|---|---|---|
| **Sem permissão `iam:CreateRole`** | O Terraform falha ao tentar criar novas IAM Roles ou Policies. | Informar perfis e roles preexistentes para EC2, IoT Rule e Lambda; verificar permissões e confiança antes do `apply`. |
| **Orçamento fixo (\$50 a \$100)** | Serviços caros esgotam o saldo e a conta é suspensa. | **Proibido provisionar:** NAT Gateways gerenciados (~$32/mês), AWS Timestream (tarifado por query) e Load Balancers gerenciados. |
| **Sessão STS Temporária (4 horas)** | As chaves de acesso expiram periodicamente. | Renovar as credenciais no Learner Lab e confirmar `aws sts get-caller-identity` antes do Terraform ou do pipeline. |
| **Instância Única EC2** | Múltiplas instâncias geram custo desnecessário. | Uma única instância `t3.small` hospeda todos os contêineres via Docker Compose. |

---

## 2. Topologia de Rede e Defesa em Profundidade (VPC)

A rede foi concebida para garantir isolamento e baixo custo:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Amazon VPC (10.0.0.0/16)                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Sub-rede Pública (10.0.1.0/24) + Internet Gateway                │  │
│  │                                                                  │  │
│  │   ┌───────────────────────────────────────────────────────────┐  │  │
│  │   │ Instância EC2 (t3.small) — Docker Host                    │  │  │
│  │   │ Entrada: 80 (Web); 8086 apenas da Lambda; sem SSH       │  │  │
│  │   │ • Containers: Java Backend, Flask AI, React Nginx, TSDB   │  │  │
│  │   └─────────────────────────────┬─────────────────────────────┘  │  │
│  └─────────────────────────────────┼────────────────────────────────┘  │
│                                    │ Conexão Privada (Porta 5432)      │
│  ┌─────────────────────────────────▼────────────────────────────────┐  │
│  │ Sub-rede de Banco de Dados (10.0.2.0/24)                         │  │
│  │                                                                  │  │
│  │   ┌───────────────────────────────────────────────────────────┐  │  │
│  │   │ Amazon RDS PostgreSQL (db.t3.micro - Free Tier)           │  │  │
│  │   │ • Sem IP Público / Acesso restrito ao SG da EC2           │  │  │
│  │   └───────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Ingestão e Buffer: AWS IoT Core + Amazon SQS

Para garantir alta disponibilidade sem perda de mensagens durante picos de produção:
1. **AWS IoT Topic Rule:** A regra SQL filtra os pacotes:
   ```sql
   SELECT * FROM 'industria/smartn1/telemetria'
   ```
2. **Ação da regra IoT para SQS:** O IoT Core despacha a mensagem diretamente para a fila SQS usando uma role de serviço com permissão de envio (`sqs:SendMessage`). A regra não invoca a Lambda diretamente.
3. **Consumo por Lambda:** Uma integração SQS event source mapping aciona a função Lambda, que lê e valida os lotes, trata falhas com retentativas/DLQ e grava a telemetria bruta no InfluxDB. A Lambda precisa de permissões para consumir mensagens da fila e escrever no destino de dados.
4. **Desacoplamento Assíncrono:** A SQS retém mensagens enquanto a Lambda está indisponível ou reprocessa falhas. O backend Java não consome essa fila: ele consulta as séries no InfluxDB e grava as consolidações no RDS.

---

## 4. Provisionamento e deploy sem SSH

Os recursos executáveis estão em `terraform/`. O Terraform usa as APIs AWS por HTTPS de saída; o grupo de segurança da EC2 não cria regra de entrada para a porta 22. A tela web usa HTTP na porta 80; o InfluxDB (8086) aceita conexões apenas da security group da Lambda; RDS PostgreSQL (5432) aceita conexões apenas da EC2.

O SSM Agent na EC2 mantém uma conexão de saída HTTPS/443 com Systems Manager. O deploy via GitHub Actions usa `ssm:SendCommand` com `AWS-RunShellScript`; a role/perfil preexistente da instância deve ter `AmazonSSMManagedInstanceCore` ou permissões equivalentes. Não é necessário NAT Gateway porque a EC2 está na sub-rede pública com egress HTTPS e a Lambda grava no InfluxDB pela rede privada da VPC. Um endpoint de interface de CloudWatch Logs permite logs da Lambda sem NAT.

O AWS Academy costuma restringir criação e alteração de roles. Por isso o Terraform recebe nomes/ARNs preexistentes: `ec2_instance_profile_name`, `iot_sqs_role_arn` e `lambda_execution_role_arn`. A role do IoT precisa confiar em `iot.amazonaws.com` e permitir `sqs:SendMessage`; a role Lambda precisa confiar em `lambda.amazonaws.com` e permitir logs, ENIs de VPC e ações de consumo SQS. A simples existência da `LabRole` não comprova essas condições.

O provisionamento roda pelo workflow manual `.github/workflows/terraform.yml`, com as credenciais temporárias armazenadas nos GitHub Secrets e o state no S3. Crie o bucket de state fora do Terraform, com bloqueio público, versionamento e criptografia, antes do primeiro `init`. Configure também as Repository variables IAM descritas em [`../terraform/README.md`](../terraform/README.md). Renove os Secrets AWS quando a sessão do Learner Lab expirar.

## 5. Implementa??o Terraform

A implementação executável, o backend S3 e o procedimento do workflow estão em [`../terraform/README.md`](../terraform/README.md). Use os arquivos dessa pasta como fonte de verdade; exemplos antigos com regra IoT direta para SQS ou acesso SSH não se aplicam ao fluxo atual. O Terraform provisiona IoT Rule → SQS → Lambda e usa roles preexistentes informadas nas Repository variables.
