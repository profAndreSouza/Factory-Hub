output "ec2_instance_id" {
  value       = aws_instance.app.id
  description = "Use este ID com aws ssm send-command."
}

output "ec2_public_ip" {
  value       = aws_instance.app.public_ip
  description = "IP público para abrir o frontend HTTP na porta 80."
}

output "frontend_url" {
  value       = "http://${aws_instance.app.public_ip}"
  description = "Endereço do portal Factory Hub."
}

output "rds_endpoint" {
  value       = aws_db_instance.factoryhub.address
  description = "Endpoint privado do PostgreSQL (porta 5432)."
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
