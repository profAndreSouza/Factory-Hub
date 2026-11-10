resource "aws_instance" "app" {
  ami                         = data.aws_ssm_parameter.al2023_ami.value
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.application.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = var.ec2_instance_profile_name
  associate_public_ip_address = false
  user_data_replace_on_change = true

  user_data = templatefile("${path.module}/bootstrap.sh.tftpl", {
    repository_url  = var.github_repository_url
    influx_org      = var.influxdb_org
    influx_bucket   = var.influxdb_bucket
    influx_token    = random_password.influx_token.result
    influx_password = random_password.influx_password.result
    seed_days       = var.seed_telemetry_days
    dockerhub_user  = var.dockerhub_username
  })

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  depends_on = [aws_nat_gateway.factoryhub, aws_route_table_association.application]

  tags = {
    Name = "${var.name_prefix}-app"
  }
}

resource "aws_lb_target_group_attachment" "application" {
  target_group_arn = aws_lb_target_group.application.arn
  target_id        = aws_instance.app.id
  port             = 8080
}
