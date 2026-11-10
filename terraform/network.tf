resource "aws_vpc" "factoryhub" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "factoryhub" {
  vpc_id = aws_vpc.factoryhub.id
  tags   = { Name = "${var.name_prefix}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.factoryhub.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 1)
  availability_zone       = local.azs[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.name_prefix}-public" }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.factoryhub.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 5)
  availability_zone       = local.azs[1]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.name_prefix}-public-2" }
}

resource "aws_subnet" "application" {
  vpc_id                  = aws_vpc.factoryhub.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 4)
  availability_zone       = local.azs[0]
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.name_prefix}-application-private" }
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "${var.name_prefix}-nat" }
}

resource "aws_nat_gateway" "factoryhub" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
  depends_on    = [aws_internet_gateway.factoryhub]
  tags          = { Name = "${var.name_prefix}-nat" }
}

resource "aws_subnet" "database" {
  count                   = 2
  vpc_id                  = aws_vpc.factoryhub.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 2)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.name_prefix}-database-${count.index + 1}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.factoryhub.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.factoryhub.id
  }
  tags = { Name = "${var.name_prefix}-public-routes" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "application" {
  vpc_id = aws_vpc.factoryhub.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.factoryhub.id
  }
  tags = { Name = "${var.name_prefix}-application-private-routes" }
}

resource "aws_route_table_association" "application" {
  subnet_id      = aws_subnet.application.id
  route_table_id = aws_route_table.application.id
}

resource "aws_lb" "application" {
  name               = "${var.name_prefix}-app"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public.id, aws_subnet.public_2.id]
  tags               = { Name = "${var.name_prefix}-app" }
}

resource "aws_lb_target_group" "application" {
  name        = "${var.name_prefix}-app"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.factoryhub.id
  target_type = "instance"
  health_check {
    path                = "/api/v1/health"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }
  tags = { Name = "${var.name_prefix}-app" }
}

resource "aws_lb_listener" "application" {
  load_balancer_arn = aws_lb.application.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.application.arn
  }
}

resource "aws_db_subnet_group" "factoryhub" {
  name       = "${var.name_prefix}-database"
  subnet_ids = aws_subnet.database[*].id
  tags       = { Name = "${var.name_prefix}-database" }
}
