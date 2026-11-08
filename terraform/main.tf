data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "random_password" "rds" {
  length  = 28
  special = false
}

resource "random_password" "influx_token" {
  length  = 48
  special = false
}

resource "random_password" "influx_password" {
  length  = 28
  special = false
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  common_tags = {
    Project     = "factoryhub"
    Environment = var.environment
  }
}
