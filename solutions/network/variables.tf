variable "name" {
  description = "VNet name chosen by the caller."
  type        = string
  default     = "ws2-network"
}

variable "resource_group_name" {
  description = "Existing instructor-managed resource group; never created here."
  type        = string
  default     = "rg-ws2-existing"
}

variable "location" {
  description = "Instructor-approved Azure region."
  type        = string
  default     = "southeastasia"
}

variable "address_space" {
  description = "Valid IPv4 network CIDRs."
  type        = list(string)
  default     = ["10.42.0.0/16"]
  validation {
    condition     = length(var.address_space) > 0 && alltrue([for cidr in var.address_space : can(cidrnetmask(cidr))])
    error_message = "Use valid IPv4 CIDRs."
  }
}

variable "subnets" {
  description = "Stable map of named subnets; no numeric count addresses."
  type = map(object({
    address_prefixes = list(string)
  }))
  default = {
    web  = { address_prefixes = ["10.42.1.0/24"] }
    data = { address_prefixes = ["10.42.2.0/24"] }
  }
  validation {
    condition     = length(var.subnets) > 0 && alltrue([for subnet in var.subnets : length(subnet.address_prefixes) > 0 && alltrue([for cidr in subnet.address_prefixes : can(cidrnetmask(cidr))])])
    error_message = "Each named subnet needs valid IPv4 CIDRs."
  }
}

variable "tags" {
  description = "Ownership and workshop tags on the VNet."
  type        = map(string)
  default = {
    owner       = "workshop-team"
    environment = "dev"
    cost_center = "training"
    workshop    = "ws2"
  }
  validation {
    condition     = alltrue([for key in ["owner", "environment", "cost_center", "workshop"] : try(length(trimspace(var.tags[key])) > 0, false)])
    error_message = "Supply owner, environment, cost_center and workshop tags."
  }
}
