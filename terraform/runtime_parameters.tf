locals {
  rds_parameter_prefix     = "/${var.name_prefix}/${var.environment}/rds"
  runtime_parameter_prefix = "/${var.name_prefix}/${var.environment}/runtime"
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

resource "aws_ssm_parameter" "runtime_dockerhub_username" {
  name        = "${local.runtime_parameter_prefix}/dockerhub-username"
  description = "Docker Hub namespace used by the Factory Hub Compose deployment."
  type        = "String"
  value       = var.dockerhub_username
}

resource "aws_ssm_parameter" "runtime_influx_org" {
  name        = "${local.runtime_parameter_prefix}/influx-org"
  description = "InfluxDB organization for the Factory Hub deployment."
  type        = "String"
  value       = var.influxdb_org
}

resource "aws_ssm_parameter" "runtime_influx_bucket" {
  name        = "${local.runtime_parameter_prefix}/influx-bucket"
  description = "InfluxDB bucket for the Factory Hub deployment."
  type        = "String"
  value       = var.influxdb_bucket
}

resource "aws_ssm_parameter" "runtime_influx_seed_days" {
  name        = "${local.runtime_parameter_prefix}/influx-seed-days"
  description = "Number of instructional days used to seed InfluxDB."
  type        = "String"
  value       = tostring(var.seed_telemetry_days)
}

resource "aws_ssm_parameter" "runtime_influx_token" {
  name        = "${local.runtime_parameter_prefix}/influx-token"
  description = "InfluxDB API token for Factory Hub containers."
  type        = "SecureString"
  value       = random_password.influx_token.result
}

resource "aws_ssm_parameter" "runtime_influx_password" {
  name        = "${local.runtime_parameter_prefix}/influx-password"
  description = "InfluxDB initial admin password for Factory Hub."
  type        = "SecureString"
  value       = random_password.influx_password.result
}
