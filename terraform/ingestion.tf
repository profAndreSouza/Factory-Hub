resource "aws_sqs_queue" "dead_letter" {
  name                      = "${var.name_prefix}-telemetry-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "telemetry" {
  name                       = "${var.name_prefix}-telemetry-queue"
  message_retention_seconds  = 86400
  visibility_timeout_seconds = 180
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter.arn
    maxReceiveCount     = 5
  })
}

resource "aws_iot_topic_rule" "telemetry_to_sqs" {
  name        = "${replace(var.name_prefix, "-", "_")}_telemetry_to_sqs"
  description = "Encaminha telemetria do Factory Hub para SQS."
  enabled     = true
  sql         = "SELECT * FROM 'industria/smartn1/telemetria'"
  sql_version = "2016-03-23"

  sqs {
    queue_url  = aws_sqs_queue.telemetry.id
    role_arn   = var.iot_sqs_role_arn
    use_base64 = false
  }
}

data "archive_file" "telemetry_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda/telemetry_consumer.py"
  output_path = "${path.module}/lambda-telemetry.zip"
}

resource "aws_lambda_function" "telemetry_consumer" {
  function_name    = "${var.name_prefix}-telemetry-consumer"
  description      = "Consome SQS e grava telemetria bruta no InfluxDB da EC2."
  role             = var.lambda_execution_role_arn
  runtime          = "python3.12"
  handler          = "telemetry_consumer.lambda_handler"
  filename         = data.archive_file.telemetry_lambda.output_path
  source_code_hash = data.archive_file.telemetry_lambda.output_base64sha256
  timeout          = 30
  memory_size      = 128

  vpc_config {
    subnet_ids         = aws_subnet.database[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      INFLUX_URL    = "http://${aws_instance.app.private_ip}:8086"
      INFLUX_ORG    = var.influxdb_org
      INFLUX_BUCKET = var.influxdb_bucket
      INFLUX_TOKEN  = random_password.influx_token.result
    }
  }

  depends_on = [aws_instance.app, aws_vpc_endpoint.logs]

  tags = { Name = "${var.name_prefix}-telemetry-consumer" }
}

resource "aws_lambda_event_source_mapping" "telemetry_queue" {
  event_source_arn                   = aws_sqs_queue.telemetry.arn
  function_name                      = aws_lambda_function.telemetry_consumer.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]
  enabled                            = true
}
