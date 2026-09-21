terraform {
  # The private writer supplies a separate avm/ state key at initialization.
  # Offline checks always use -backend=false; never initialize live state locally.
  backend "azurerm" {
    use_oidc         = true
    use_azuread_auth = true
  }
}
