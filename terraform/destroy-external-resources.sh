#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION}"
: "${TF_STATE_BUCKET:?Set TF_STATE_BUCKET}"
: "${IOT_THING_NAME:?Set IOT_THING_NAME}"
: "${IOT_POLICY_NAME:?Set IOT_POLICY_NAME}"

if [[ "$TF_STATE_BUCKET" != factoryhub-state-* || "$TF_STATE_BUCKET" == "factoryhub-state-" ]]; then
  echo "Refusing to delete a bucket without the factoryhub-state- prefix."
  exit 1
fi

resource_is_missing() {
  [[ "$1" == *ResourceNotFoundException* || "$1" == *NotFoundException* ]]
}

thing_exists=true
if thing_result=$(aws iot describe-thing \
  --thing-name "$IOT_THING_NAME" \
  --region "$AWS_REGION" 2>&1); then
  echo "Cleaning IoT Thing: $IOT_THING_NAME"
else
  if resource_is_missing "$thing_result"; then
    echo "IoT Thing not found: $IOT_THING_NAME"
    thing_exists=false
  else
    echo "$thing_result" >&2
    exit 1
  fi
fi

if [[ "$thing_exists" == true ]]; then
  principals=$(aws iot list-thing-principals \
    --thing-name "$IOT_THING_NAME" \
    --query 'principals[]' --output text \
    --region "$AWS_REGION")

  for principal in $principals; do
    [[ -z "$principal" || "$principal" == "None" ]] && continue
    certificate_id="${principal##*/}"

    other_things=$(aws iot list-principal-things \
      --principal "$principal" \
      --query 'things[]' --output text \
      --region "$AWS_REGION")
    has_other_things=false
    for attached_thing in $other_things; do
      if [[ -n "$attached_thing" && "$attached_thing" != "None" && "$attached_thing" != "$IOT_THING_NAME" ]]; then
        has_other_things=true
      fi
    done
    if [[ "$has_other_things" == true ]]; then
      aws iot detach-thing-principal \
        --thing-name "$IOT_THING_NAME" \
        --principal "$principal" \
        --region "$AWS_REGION"
      echo "Certificate is still attached to another Thing; preserving it: $principal"
      continue
    fi

    attached_policies=$(aws iot list-attached-policies \
      --target "$principal" \
      --query 'policies[].policyName' --output text \
      --region "$AWS_REGION")
    for policy in $attached_policies; do
      [[ -z "$policy" || "$policy" == "None" ]] && continue
      aws iot detach-policy \
        --policy-name "$policy" \
        --target "$principal" \
        --region "$AWS_REGION"
    done

    aws iot detach-thing-principal \
      --thing-name "$IOT_THING_NAME" \
      --principal "$principal" \
      --region "$AWS_REGION"

    certificate_status=$(aws iot describe-certificate \
      --certificate-id "$certificate_id" \
      --query 'certificateDescription.status' --output text \
      --region "$AWS_REGION")
    if [[ "$certificate_status" == "ACTIVE" ]]; then
      aws iot update-certificate \
        --certificate-id "$certificate_id" \
        --new-status INACTIVE \
        --region "$AWS_REGION"
    fi
    aws iot delete-certificate \
      --certificate-id "$certificate_id" \
      --force-delete \
      --region "$AWS_REGION"
  done

  aws iot delete-thing \
    --thing-name "$IOT_THING_NAME" \
    --region "$AWS_REGION"
fi

# Delete only the named Factory Hub device policy, and only when unused.
if policy_result=$(aws iot get-policy \
  --policy-name "$IOT_POLICY_NAME" \
  --region "$AWS_REGION" 2>&1); then
  policy_targets=$(aws iot list-targets-for-policy \
    --policy-name "$IOT_POLICY_NAME" \
    --query 'targets[]' --output text \
    --region "$AWS_REGION")
  if [[ -z "$policy_targets" || "$policy_targets" == "None" ]]; then
    policy_versions=$(aws iot list-policy-versions \
      --policy-name "$IOT_POLICY_NAME" \
      --query 'policyVersions[?isDefaultVersion==`false`].versionId' --output text \
      --region "$AWS_REGION")
    for version in $policy_versions; do
      [[ -z "$version" || "$version" == "None" ]] && continue
      aws iot delete-policy-version \
        --policy-name "$IOT_POLICY_NAME" \
        --policy-version-id "$version" \
        --region "$AWS_REGION"
    done

    policy_deleted=false
    for attempt in {1..30}; do
      if aws iot delete-policy \
        --policy-name "$IOT_POLICY_NAME" \
        --region "$AWS_REGION"; then
        policy_deleted=true
        break
      fi
      sleep 10
    done
    if [[ "$policy_deleted" != true ]]; then
      echo "Could not delete the detached IoT policy after waiting for AWS propagation: $IOT_POLICY_NAME" >&2
      exit 1
    fi
  else
    echo "IoT policy is still attached elsewhere; preserving it: $IOT_POLICY_NAME"
  fi
else
  if resource_is_missing "$policy_result"; then
    echo "IoT policy not found: $IOT_POLICY_NAME"
  else
    echo "$policy_result" >&2
    exit 1
  fi
fi

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
  echo "State bucket is in $bucket_region, but AWS_REGION is $AWS_REGION."
  exit 1
fi

echo "Removing all object versions from state bucket: $TF_STATE_BUCKET"
while true; do
  versions=$(aws s3api list-object-versions \
    --bucket "$TF_STATE_BUCKET" \
    --max-items 1000 \
    --output json \
    --region "$AWS_REGION")
  objects=$(jq -c '[.Versions[]?, .DeleteMarkers[]?] | map({Key, VersionId}) | .[:1000]' <<< "$versions")
  if [[ "$objects" == "[]" ]]; then
    break
  fi

  delete_request=$(jq -cn --argjson objects "$objects" '{Objects: $objects, Quiet: true}')
  delete_result=$(aws s3api delete-objects \
    --bucket "$TF_STATE_BUCKET" \
    --delete "$delete_request" \
    --output json \
    --region "$AWS_REGION")
  delete_errors=$(jq -c '.Errors // []' <<< "$delete_result")
  if [[ "$delete_errors" != "[]" ]]; then
    echo "Failed to delete every state object version: $delete_errors" >&2
    exit 1
  fi
done

aws s3api delete-bucket \
  --bucket "$TF_STATE_BUCKET" \
  --region "$AWS_REGION"

echo "Removed IoT device resources and Terraform state bucket."
