# Authoring-only contract tests. These are not live workshop acceptance evidence.
mock_provider "azurerm" {}
mock_provider "azapi" {}
mock_provider "modtm" {}
mock_provider "random" {}

variables {
  tenant_id           = "00000000-0000-0000-0000-000000000000"
  subscription_id     = "00000000-0000-0000-0000-000000000000"
  resource_group_name = "rg-contract-only"
  location            = "eastus"
  name                = "ws2-avm-contract"
  address_space       = ["10.42.0.0/16"]
  subnets = {
    web  = { address_prefixes = ["10.42.1.0/24"] }
    data = { address_prefixes = ["10.42.2.0/24"] }
  }
}

run "stable_named_subnets" {
  command = plan

  assert {
    condition     = toset(keys(output.subnet_ids)) == toset(["web", "data"])
    error_message = "The AVM output must preserve stable named subnet keys."
  }
}

run "reject_invalid_vnet_cidr" {
  command = plan

  variables {
    address_space = ["10.300.0.0/16"]
  }

  expect_failures = [var.address_space]
}

run "reject_shared_network_name" {
  command = plan

  variables {
    name = "production-network"
  }

  expect_failures = [var.name]
}
