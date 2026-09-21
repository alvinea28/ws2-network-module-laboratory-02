provider "azurerm" {
  features {}

  subscription_id                 = var.subscription_id
  tenant_id                       = var.tenant_id
  resource_provider_registrations = "none"
  use_oidc                        = true
  use_cli                         = false
  use_msi                         = false
  storage_use_azuread             = true
}

provider "azapi" {
  subscription_id            = var.subscription_id
  tenant_id                  = var.tenant_id
  skip_provider_registration = true
  use_oidc                   = true
  use_cli                    = false
  use_msi                    = false
}
