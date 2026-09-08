# AgentAlvine | Inert fixtures only. These are not subscription credentials.
# Type defaults intentionally repeat IDs for output-contract/validation tests.
# Complete checkpoints add per-instance overrides for exact wiring assertions.
mock_resource "azurerm_virtual_network" {
  defaults = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ws2-mock/providers/Microsoft.Network/virtualNetworks/vnet-ws2-mock"
  }
}

mock_resource "azurerm_subnet" {
  defaults = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ws2-mock/providers/Microsoft.Network/virtualNetworks/vnet-ws2-mock/subnets/web"
  }
}

mock_resource "azurerm_network_security_group" {
  defaults = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ws2-mock/providers/Microsoft.Network/networkSecurityGroups/vnet-ws2-mock-nsg"
  }
}

mock_resource "azurerm_network_security_rule" {
  defaults = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ws2-mock/providers/Microsoft.Network/networkSecurityGroups/vnet-ws2-mock-nsg/securityRules/allow-private-https"
  }
}

mock_resource "azurerm_subnet_network_security_group_association" {
  defaults = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-ws2-mock/providers/Microsoft.Network/virtualNetworks/vnet-ws2-mock/subnets/web"
  }
}
