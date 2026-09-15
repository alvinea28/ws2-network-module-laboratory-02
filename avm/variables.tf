variable "tenant_id" {
  type        = string
  description = "Attendee's approved tenant ID; supply privately, never commit a real value."

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$", var.tenant_id))
    error_message = "Supply your approved tenant GUID."
  }
}

variable "subscription_id" {
  type        = string
  description = "Attendee's approved subscription ID; supply privately."

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$", var.subscription_id))
    error_message = "Supply your approved subscription GUID."
  }
}

variable "resource_group_name" {
  type        = string
  description = "Existing assigned resource group. This example does not create or own the group."

  validation {
    condition     = can(regex("^[A-Za-z0-9_().-]{1,90}$", var.resource_group_name))
    error_message = "Supply the existing group name, not a full resource ID."
  }
}

variable "location" {
  type        = string
  description = "Instructor-approved Azure region for the disposable network."
}

variable "name" {
  type        = string
  description = "Unique disposable lab network name; must start with ws2-avm-."

  validation {
    condition     = can(regex("^ws2-avm-[a-z0-9][a-z0-9-]{1,35}$", var.name))
    error_message = "Use a unique ws2-avm- prefix; never target an existing shared network."
  }
}

variable "address_space" {
  type        = list(string)
  description = "Approved VNet IPv4 CIDRs, not copied from another attendee."

  validation {
    condition     = length(var.address_space) > 0 && alltrue([for cidr in var.address_space : can(cidrnetmask(cidr))])
    error_message = "Supply at least one valid IPv4 CIDR."
  }
}

variable "subnets" {
  type = map(object({
    address_prefixes = list(string)
  }))
  description = "Stable named subnet keys with approved IPv4 prefixes."

  validation {
    condition     = length(var.subnets) >= 2 && alltrue([for subnet in values(var.subnets) : length(subnet.address_prefixes) > 0 && alltrue([for cidr in subnet.address_prefixes : can(cidrnetmask(cidr))])])
    error_message = "Supply at least two named subnets with valid IPv4 prefixes."
  }
}
