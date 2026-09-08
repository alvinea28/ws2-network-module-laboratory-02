mock_provider "azurerm" {
  override_during = plan
  mock_resource "azurerm_virtual_network" {
    defaults = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ws2-existing/providers/Microsoft.Network/virtualNetworks/ws2-network"
    }
  }
  mock_resource "azurerm_subnet" {
    defaults = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ws2-existing/providers/Microsoft.Network/virtualNetworks/ws2-network/subnets/mock"
    }
  }
}

run "valid_two_subnet_topology" {
  command = plan
  assert {
    condition     = toset(keys(output.subnet_ids)) == toset(["web", "data"])
    error_message = "Return both named subnet IDs."
  }
  assert {
    condition     = output.vnet_id != null
    error_message = "Return the actual VNet resource ID."
  }
}

run "reject_invalid_cidr" {
  command = plan
  variables {
    address_space = ["10.300.0.0/16"]
  }
  expect_failures = [var.address_space]
}

run "reject_invalid_subnet" {
  command = plan
  variables {
    subnets = { web = { address_prefixes = ["not-a-cidr"] } }
  }
  expect_failures = [var.subnets]
}

run "reject_missing_tags" {
  command = plan
  variables {
    tags = { owner = "team" }
  }
  expect_failures = [var.tags]
}
