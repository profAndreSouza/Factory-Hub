resource "aws_db_instance" "factoryhub" {
  identifier                 = "${var.name_prefix}-postgres"
  engine                     = "postgres"
  instance_class             = var.db_instance_class
  allocated_storage          = 20
  max_allocated_storage      = 30
  storage_type               = "gp3"
  storage_encrypted          = true
  db_name                    = var.db_name
  username                   = var.db_username
  password                   = random_password.rds.result
  port                       = 5432
  db_subnet_group_name       = aws_db_subnet_group.factoryhub.name
  vpc_security_group_ids     = [aws_security_group.database.id]
  publicly_accessible        = false
  multi_az                   = false
  backup_retention_period    = 1
  auto_minor_version_upgrade = true
  apply_immediately          = true
  skip_final_snapshot        = true
  deletion_protection        = false

  tags = { Name = "${var.name_prefix}-postgres" }
}
