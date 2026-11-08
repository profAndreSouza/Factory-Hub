# ☁️ Referência Técnica: Computação em Nuvem (AWS Academy)

> **Unidade Curricular:** Computação em Nuvem (60 horas / 20 Semanas)  
> **Objetivo:** Provisionar e gerenciar a infraestrutura em nuvem na Amazon Web Services (AWS) utilizando Terraform sob as diretrizes do **AWS Academy Learner Lab**.

---

## 1. O Ambiente AWS Academy Learner Lab Sandbox

O AWS Academy fornece um ambiente sandbox isolado para cada estudante, com restrições técnicas específicas que orientam o desenho da arquitetura:

| Restrição do Sandbox | Consequência Técnica | Decisão de Arquitetura no Factory Hub |
|---|---|---|
| **Sem permissão `iam:CreateRole`** | O Terraform falha ao tentar criar novas IAM Roles ou Policies. | Utilizar exclusivamente a role fixa nativa: `arn:aws:iam::<ACCOUNT_ID>:role/LabRole` ou `LabInstanceProfile`. |
| **Orçamento fixo (\$50 a \$100)** | Serviços caros esgotam o saldo e a conta é suspensa. | **Proibido provisionar:** NAT Gateways gerenciados (~$32/mês), AWS Timestream (tarifado por query) e Load Balancers gerenciados. |
| **Sessão STS Temporária (4 horas)** | As chaves de acesso expiram periodicamente. | Renovar `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN` via terminal antes de rodar o Terraform. |
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
│  │   │ • Portas Abertas: 22 (SSH), 80 (Web), 8080 (API)          │  │  │
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
2. **Ação Direta para SQS:** Em vez de invocar uma função Lambda (que geraria custo por requisição), o IoT Core despacha a mensagem diretamente para a fila SQS utilizando a permissão da `LabRole`.
3. **Desacoplamento Assíncrono:** Se o backend Java for reiniciado para uma atualização de versão, a fila SQS retém as mensagens com segurança por até 24 horas.

---

## 4. Templates Terraform para AWS Academy

### `main.tf` (Exemplo com LabRole)
```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Fila SQS Principal e DLQ
resource "aws_sqs_queue" "telemetry_dlq" {
  name                      = "factoryhub-telemetria-dlq"
  message_retention_seconds = 604800 # 7 dias
}

resource "aws_sqs_queue" "telemetry_queue" {
  name                      = "factoryhub-telemetria-queue"
  message_retention_seconds = 86400  # 1 dia
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.telemetry_dlq.arn
    maxReceiveCount     = 3
  })
}

# Regra IoT Core encaminhando direto para SQS
resource "aws_iot_topic_rule" "telemetry_rule" {
  name        = "FactoryHubIoTRule"
  description = "Roteia telemetria industrial para SQS"
  enabled     = true
  sql         = "SELECT * FROM 'industria/smartn1/telemetria'"
  sql_version = "2016-03-23"

  sqs {
    queue_url  = aws_sqs_queue.telemetry_queue.id
    role_arn   = var.lab_role_arn # arn:aws:iam::<ACCOUNT_ID>:role/LabRole
    use_base64 = false
  }
}
```

