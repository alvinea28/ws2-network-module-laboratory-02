locals {
  resource_group_id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.resource_group_name}"
  tags = {
    environment = "dev"
    workshop    = "ws2"
    example     = "terraform-avm"
  }
}

# Separate exact-pinned AVM example; never shares ownership with the learner root.
module "security" {
  source  = "Azure/avm-res-network-networksecuritygroup/azurerm"
  version = "0.5.1"

  name                = "${var.name}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name
  enable_telemetry    = false
  tags                = local.tags
}

module "network" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "0.22.2"

  name             = var.name
  location         = var.location
  parent_id        = local.resource_group_id
  address_space    = var.address_space
  enable_telemetry = false
  tags             = local.tags

  subnets = {
    for key, subnet in var.subnets : key => {
      name                            = key
      address_prefixes                = subnet.address_prefixes
      default_outbound_access_enabled = false
      network_security_group = {
        id = module.security.resource_id
      }
    }
  }
}
