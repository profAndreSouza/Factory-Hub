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

resource "aws_db_subnet_group" "factoryhub" {
  name       = "${var.name_prefix}-database"
  subnet_ids = aws_subnet.database[*].id
  tags       = { Name = "${var.name_prefix}-database" }
}
