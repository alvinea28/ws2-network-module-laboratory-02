output "vnet_id" {
  description = "AVM-created virtual network ID. Treat real resource IDs as private evidence."
  value       = module.network.resource_id
}

output "nsg_id" {
  description = "AVM-created network security group ID."
  value       = module.security.resource_id
}

output "subnet_ids" {
  description = "Stable subnet keys mapped to AVM-created subnet IDs."
  value       = { for key, subnet in module.network.subnets : key => subnet.resource_id }
}
