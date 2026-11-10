#!/usr/bin/env bash
set -euo pipefail

: "${TF_STATE_BUCKET:?Set TF_STATE_BUCKET to a globally unique S3 bucket name}"
: "${AWS_REGION:?Set AWS_REGION to the target AWS region}"

if [[ ! "$TF_STATE_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
  echo "Bucket name must be 3-63 lowercase letters, numbers, dots, or hyphens."
  exit 1
fi

if [[ "$TF_STATE_BUCKET" != factoryhub-state-* || "$TF_STATE_BUCKET" == "factoryhub-state-" ]]; then
  echo "Use a dedicated name beginning with factoryhub-state-."
  exit 1
fi

if aws s3api head-bucket --bucket "$TF_STATE_BUCKET" 2>/dev/null; then
  bucket_region=$(aws s3api get-bucket-location \
    --bucket "$TF_STATE_BUCKET" \
    --query LocationConstraint --output text \
    --region "$AWS_REGION")
  if [[ "$bucket_region" == "None" ]]; then
    bucket_region="us-east-1"
  elif [[ "$bucket_region" == "EU" ]]; then
    bucket_region="eu-west-1"
  fi
  if [[ "$bucket_region" != "$AWS_REGION" ]]; then
    echo "Bucket is in $bucket_region, but AWS_REGION is $AWS_REGION."
    exit 1
  fi
  echo "Using existing bucket: $TF_STATE_BUCKET"
else
  echo "Creating bucket: $TF_STATE_BUCKET in $AWS_REGION"
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws s3api create-bucket \
      --bucket "$TF_STATE_BUCKET" \
      --region "$AWS_REGION"
  else
    aws s3api create-bucket \
      --bucket "$TF_STATE_BUCKET" \
      --region "$AWS_REGION" \
      --create-bucket-configuration "LocationConstraint=$AWS_REGION"
  fi
fi

aws s3api wait bucket-exists --bucket "$TF_STATE_BUCKET" --region "$AWS_REGION"

aws s3api put-bucket-ownership-controls \
  --bucket "$TF_STATE_BUCKET" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]' \
  --region "$AWS_REGION"

aws s3api put-public-access-block \
  --bucket "$TF_STATE_BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --region "$AWS_REGION"

aws s3api put-bucket-versioning \
  --bucket "$TF_STATE_BUCKET" \
  --versioning-configuration Status=Enabled \
  --region "$AWS_REGION"

aws s3api put-bucket-encryption \
  --bucket "$TF_STATE_BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --region "$AWS_REGION"

versioning=$(aws s3api get-bucket-versioning \
  --bucket "$TF_STATE_BUCKET" \
  --query Status --output text \
  --region "$AWS_REGION")
if [[ "$versioning" != "Enabled" ]]; then
  echo "Failed to enable bucket versioning."
  exit 1
fi

echo "Terraform state bucket is ready: $TF_STATE_BUCKET ($AWS_REGION)"
