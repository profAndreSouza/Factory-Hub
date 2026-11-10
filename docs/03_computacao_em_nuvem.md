# Referência Técnica: Computação em Nuvem (AWS Academy)

> **Unidade Curricular:** Computação em Nuvem (60 horas / 20 Semanas)  
> **Objetivo:** Provisionar e gerenciar a infraestrutura em nuvem na Amazon Web Services (AWS) utilizando Terraform sob as diretrizes do **AWS Academy Learner Lab**.

---

## 1. O Ambiente AWS Academy Learner Lab Sandbox

O AWS Academy fornece um ambiente sandbox isolado para cada estudante, com restrições técnicas específicas que orientam o desenho da arquitetura:

| Restrição do Sandbox | Consequência Técnica | Decisão de Arquitetura no Factory Hub |
|---|---|---|
| **Sem permissão `iam:CreateRole`** | O Terraform falha ao tentar criar novas IAM Roles ou Policies. | Informar perfis e roles preexistentes para EC2, IoT Rule e Lambda; verificar permissões e confiança antes do `apply`. |
| **Orcamento fixo (US$50 a US$100)** | NAT Gateway e ALB adicionam custos continuos e podem esgotar o saldo. | A topologia didatica atual inclui ambos para demonstrar EC2 privada e balanceamento; acompanhe o saldo e destrua a stack quando terminar. |
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

A topologia atual entrega o frontend via CloudFront/S3 e encaminha `/api/*` pelo ALB para a EC2 em subnet privada. O NAT Gateway fornece saida HTTPS da EC2. A EC2 nao recebe SSH; InfluxDB 8086 aceita conexoes da Lambda e RDS 5432 aceita conexoes da aplicacao.

O SSM Agent mantem conexao de saida HTTPS/443 com Systems Manager. Como a EC2 agora fica em subnet privada, o NAT Gateway fornece saida para SSM, Docker Hub, GitHub e atualizacoes de pacotes. O frontend usa CloudFront/S3 e a API chega a EC2 pelo ALB.

O AWS Academy costuma restringir criação e alteração de roles. Por isso o Terraform recebe nomes/ARNs preexistentes: `ec2_instance_profile_name`, `iot_sqs_role_arn` e `lambda_execution_role_arn`. A role do IoT precisa confiar em `iot.amazonaws.com` e permitir `sqs:SendMessage`; a role Lambda precisa confiar em `lambda.amazonaws.com` e permitir logs, ENIs de VPC e ações de consumo SQS. A simples existência da `LabRole` não comprova essas condições.

O bootstrap separado `bootstrap-state.yml` cria e configura o bucket versionado de state antes do primeiro `terraform init`; copie o nome exibido no resumo para a Repository variable `TF_STATE_BUCKET`. Depois, `terraform.yml` aplica a infraestrutura.

## 5. Implementa??o Terraform

A implementação executável, o backend S3 e o procedimento do workflow estão em [`../terraform/README.md`](../terraform/README.md). Use os arquivos dessa pasta como fonte de verdade; exemplos antigos com regra IoT direta para SQS ou acesso SSH não se aplicam ao fluxo atual. O Terraform provisiona IoT Rule → SQS → Lambda e usa roles preexistentes informadas nas Repository variables.
