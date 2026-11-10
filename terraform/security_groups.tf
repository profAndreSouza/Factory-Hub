resource "aws_security_group" "app" {
  name        = "${var.name_prefix}-app"
  description = "Private application services; ingress only from ALB and Lambda."
  vpc_id      = aws_vpc.factoryhub.id

  ingress {
    description     = "Java API from public ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound HTTPS for SSM, GitHub, Docker Hub and package updates"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "Application EC2 to PostgreSQL RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  tags = { Name = "${var.name_prefix}-app" }
}

resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb"
  description = "Public HTTP entry point for CloudFront API traffic."
  vpc_id      = aws_vpc.factoryhub.id

  ingress {
    description = "HTTP from users and CloudFront distribution"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.app_http_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name_prefix}-alb" }
}

resource "aws_security_group" "lambda" {
  name        = "${var.name_prefix}-lambda"
  description = "Telemetry Lambda connectivity to EC2 InfluxDB and the logs endpoint."
  vpc_id      = aws_vpc.factoryhub.id

  tags = { Name = "${var.name_prefix}-lambda" }
}

resource "aws_security_group" "logs_endpoint" {
  name        = "${var.name_prefix}-logs-endpoint"
  description = "HTTPS do endpoint privado de CloudWatch Logs para a Lambda."
  vpc_id      = aws_vpc.factoryhub.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name_prefix}-logs-endpoint" }
}

resource "aws_security_group" "database" {
  name        = "${var.name_prefix}-database"
  description = "PostgreSQL accessible only from the application EC2."
  vpc_id      = aws_vpc.factoryhub.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name_prefix}-database" }
}

resource "aws_vpc_security_group_ingress_rule" "app_influx_from_lambda" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.lambda.id
  description                  = "InfluxDB recebe telemetria somente da Lambda."
  from_port                    = 8086
  to_port                      = 8086
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "lambda_influx_to_app" {
  security_group_id            = aws_security_group.lambda.id
  referenced_security_group_id = aws_security_group.app.id
  description                  = "Lambda escreve no InfluxDB da EC2."
  from_port                    = 8086
  to_port                      = 8086
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "lambda_logs" {
  security_group_id            = aws_security_group.lambda.id
  referenced_security_group_id = aws_security_group.logs_endpoint.id
  description                  = "Lambda envia logs pelo endpoint privado."
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "logs_from_lambda" {
  security_group_id            = aws_security_group.logs_endpoint.id
  referenced_security_group_id = aws_security_group.lambda.id
  description                  = "Endpoint aceita HTTPS da Lambda."
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "database_from_app" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.app.id
  description                  = "PostgreSQL accessible only from EC2."
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.factoryhub.id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.database[0].id]
  security_group_ids  = [aws_security_group.logs_endpoint.id]
  private_dns_enabled = true

  tags = { Name = "${var.name_prefix}-cloudwatch-logs" }
}
