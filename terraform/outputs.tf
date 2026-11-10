output "ec2_instance_id" {
  value       = aws_instance.app.id
  description = "Use este ID com aws ssm send-command."
}

output "ec2_private_ip" {
  value       = aws_instance.app.private_ip
  description = "Private address of the application instance."
}

output "frontend_url" {
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  description = "HTTPS URL of the Factory Hub portal."
}

output "frontend_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "Private S3 bucket used to publish frontend files."
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "Distribution ID to invalidate after publishing."
}

output "api_load_balancer_dns" {
  value       = aws_lb.application.dns_name
  description = "Public ALB forwarding API traffic to the private EC2."
}
output "rds_endpoint" {
  value       = aws_db_instance.factoryhub.address
  description = "Endpoint privado do PostgreSQL (porta 5432)."
}

output "rds_parameter_prefix" {
  value       = local.rds_parameter_prefix
  description = "SSM Parameter Store path prefix for the RDS application connection settings."
}

output "runtime_parameter_prefix" {
  value       = local.runtime_parameter_prefix
  description = "SSM Parameter Store path prefix for runtime container settings."
}

output "rds_admin_password" {
  value       = random_password.rds.result
  sensitive   = true
  description = "Senha do administrador do RDS; use apenas se for acessar o banco."
}

output "sqs_queue_url" {
  value       = aws_sqs_queue.telemetry.url
  description = "Fila de telemetria acionando a Lambda."
}

output "sqs_dlq_arn" {
  value       = aws_sqs_queue.dead_letter.arn
  description = "ARN da fila de mensagens não processadas."
}

output "lambda_function_name" {
  value       = aws_lambda_function.telemetry_consumer.function_name
  description = "Função que consome SQS e grava no InfluxDB."
}

output "vpc_id" {
  value       = aws_vpc.factoryhub.id
  description = "VPC criada para a aplicação."
}
