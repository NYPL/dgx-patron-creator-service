provider "aws" {
  region     = "us-east-1"
}

terraform {
  # Use s3 to store terraform state
  backend "s3" {
    bucket  = "nypl-github-actions-builds-production"
    key     = "dgx-patron-creator-service-terraform-state"
    region  = "us-east-1"
  }
}

module "base" {
  source = "../base"

  environment = "production"

   vpc_config = {
    subnet_ids         = ["subnet-59bcdd03", "subnet-5deecd15"]
    security_group_ids = ["sg-116eeb60"]
  }
}