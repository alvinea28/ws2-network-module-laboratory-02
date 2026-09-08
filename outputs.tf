# TODO: return actual resource IDs, not these scaffold placeholders.
output "vnet_id" {
  description = "ID of the managed VNet."
  value       = null
}

output "subnet_ids" {
  description = "IDs keyed by stable subnet names."
  value       = {}
}
