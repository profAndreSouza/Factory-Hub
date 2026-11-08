variable "aws_region" {
  description = "Região da AWS usada pelo Learner Lab."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Nome curto do ambiente para tags e nomes de recursos."
  type        = string
  default     = "academy"
}

variable "ec2_instance_profile_name" {
  description = "Instance profile preexistente; precisa permitir que o SSM Agent registre a EC2."
  type        = string
}

variable "iot_sqs_role_arn" {
  description = "ARN de uma role preexistente que confia em iot.amazonaws.com e pode enviar mensagens à fila do Factory Hub."
  type        = string
}

variable "lambda_execution_role_arn" {
  description = "ARN de uma role preexistente que confia em lambda.amazonaws.com e permite logs, ENIs e consumo da fila SQS."
  type        = string
}

variable "dockerhub_username" {
  description = "Usuário/organização do Docker Hub que publica as imagens factoryhub-*."
  type        = string
}

variable "app_http_cidrs" {
  description = "CIDRs autorizados a abrir o frontend HTTP (80). Restrinja à rede da escola quando possível."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "vpc_cidr" {
  description = "Bloco CIDR da VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "instance_type" {
  description = "Tipo da única EC2 que executará Docker Compose."
  type        = string
  default     = "t3.small"
}

variable "db_instance_class" {
  description = "Classe da instância PostgreSQL RDS."
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Nome inicial do banco PostgreSQL."
  type        = string
  default     = "factoryhub"
}

variable "db_username" {
  description = "Usuário administrador do PostgreSQL RDS."
  type        = string
  default     = "factoryhub_admin"
}

variable "influxdb_org" {
  type        = string
  description = "Organização InfluxDB."
  default     = "factoryhub"
}

variable "influxdb_bucket" {
  type        = string
  description = "Bucket para telemetria industrial."
  default     = "telemetry"
}

variable "seed_telemetry_days" {
  description = "Dias de telemetria didática gravados na primeira inicialização do InfluxDB."
  type        = number
  default     = 14
}

variable "github_repository_url" {
  description = "URL HTTPS do repositório público clonado pela EC2 para obter o Compose de produção."
  type        = string
  default     = "https://github.com/profAndreSouza/Factory-Hub.git"
}

variable "name_prefix" {
  description = "Prefixo para nomes dos recursos regionais."
  type        = string
  default     = "factoryhub"
}
