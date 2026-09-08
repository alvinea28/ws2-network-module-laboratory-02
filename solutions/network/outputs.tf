output "vnet_id" {
  description = "ID of the managed VNet."
  value       = azurerm_virtual_network.this.id
}

output "subnet_ids" {
  description = "IDs keyed by stable subnet names."
  value       = { for name, subnet in azurerm_subnet.this : name => subnet.id }
}
