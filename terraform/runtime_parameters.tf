locals {
  rds_parameter_prefix = "/${var.name_prefix}/${var.environment}/rds"
}

resource "aws_ssm_parameter" "rds_host" {
  name        = "${local.rds_parameter_prefix}/host"
  description = "Private endpoint for the Factory Hub PostgreSQL database."
  type        = "String"
  value       = aws_db_instance.factoryhub.address
}

resource "aws_ssm_parameter" "rds_database" {
  name        = "${local.rds_parameter_prefix}/database"
  description = "Database name for the Factory Hub backend."
  type        = "String"
  value       = var.db_name
}

resource "aws_ssm_parameter" "rds_username" {
  name        = "${local.rds_parameter_prefix}/username"
  description = "Database username for the Factory Hub backend."
  type        = "String"
  value       = var.db_username
}

resource "aws_ssm_parameter" "rds_password" {
  name        = "${local.rds_parameter_prefix}/password"
  description = "Database password for the Factory Hub backend."
  type        = "SecureString"
  value       = random_password.rds.result
}
