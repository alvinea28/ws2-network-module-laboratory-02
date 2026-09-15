# Azure setup: enter your own tenant, subscription and resource group

Use **your own instructor-approved Azure account, subscription and existing
resource group**. No author's account, tenant, subscription, email or resource
group is an example value to copy. This page is included in every laboratory.

> [!IMPORTANT]
> Filling values and signing in are setup, not evidence of provisioning or
> permission to bypass an approval. This guide performs account and resource-group
> **reads only**. Do not put Azure credentials in PR jobs. Real deployment and
> full cleanup must follow the current lab's separately approved live procedure.

## 1. Find the three values before opening the terminal

Sign in to the [Azure portal](https://portal.azure.com/) using your own work or
school account. Complete MFA only in Microsoft's trusted sign-in window.

| Value to enter | Where you find it | How it is used |
| --- | --- | --- |
| **Tenant ID** | Portal search → **Microsoft Entra ID** → **Overview** → **Tenant ID** | Chooses the directory for Azure CLI sign-in; it is not an email or directory display name |
| **Subscription ID** | Portal search → **Subscriptions** → your assigned subscription → **Overview** → **Subscription ID** | Explicit subscription selection for every command; it is not the subscription name |
| **Resource group name** | Portal search → **Resource groups** → select the assigned subscription → open the assigned group → copy its **name** | Existing group for this lab; enter its name, not its full `/subscriptions/.../resourceGroups/...` ID |

Check **Directories + subscriptions** if the assigned subscription is missing.
Tenant and subscription IDs are different GUIDs. Confirm that the resource group
belongs to the selected subscription. Ask the instructor if the subscription or
group is absent, disabled, inaccessible or unassigned; this setup does **not**
create a group, change roles, register providers or request broader access.

The group metadata location is not necessarily the approved region for resources.
If a later task asks for a region, use the instructor-approved region for that task.

## 2. Install Azure CLI only if it is missing

Open **Terminal → New Terminal** in this lab's desktop VS Code window. The examples
below use **PowerShell 5.1 on Windows** or **PowerShell 7**. Do not paste PowerShell
syntax into Command Prompt, Bash or an HCL file. On macOS/Linux, select an installed
PowerShell 7 terminal or follow your instructor's equivalent shell procedure.

```powershell
az version
```

If `az` is not recognized, use your organization's approved installation method:

- Windows: [official Azure CLI installation](https://learn.microsoft.com/cli/azure/install-azure-cli-windows).
  If WinGet is approved, the complete installation command is:

  ```powershell
  winget install --exact --id Microsoft.AzureCLI
  ```

- macOS: [official Azure CLI installation](https://learn.microsoft.com/cli/azure/install-azure-cli-macos).
- Linux: [official Azure CLI installation](https://learn.microsoft.com/cli/azure/install-azure-cli-linux).
- PowerShell 7, if needed: [official installation guidance](https://learn.microsoft.com/powershell/scripting/install/installing-powershell).

Restart **all VS Code windows**, open this clone again, create a new terminal and
repeat `az version`. Do not replace the whole PATH or disable security settings.
Azure CLI is separate from the GitHub/Copilot accounts in [Start here](../docs/start-here.md).

## 3. Enter your values in this terminal session

Copy the block into **PowerShell**, then answer each prompt with the values you
found in section 1. These values are kept only in this terminal's environment;
they are not written to a repository file. Do not screenshot the input prompts.

```powershell
$env:AZURE_TENANT_ID = (Read-Host 'Enter YOUR Azure Tenant ID').Trim()
$env:AZURE_SUBSCRIPTION_ID = (Read-Host 'Enter YOUR Azure Subscription ID').Trim()
$env:WORKLOAD_RG = (Read-Host 'Enter YOUR existing resource group NAME').Trim()

[guid]$parsedId = [guid]::Empty
if (-not [guid]::TryParse($env:AZURE_TENANT_ID, [ref]$parsedId)) {
    throw 'Tenant ID must be a valid GUID, not a tenant name or email.'
}
$env:AZURE_TENANT_ID = $parsedId.ToString()
if (-not [guid]::TryParse($env:AZURE_SUBSCRIPTION_ID, [ref]$parsedId)) {
    throw 'Subscription ID must be a valid GUID, not a subscription name.'
}
$env:AZURE_SUBSCRIPTION_ID = $parsedId.ToString()
if ([string]::IsNullOrWhiteSpace($env:WORKLOAD_RG) -or
    $env:WORKLOAD_RG.Contains('/') -or $env:WORKLOAD_RG.Length -gt 90) {
    throw 'Enter the existing resource group name only, not a full resource ID.'
}
Write-Output 'Azure input formats accepted; account access is not yet verified.'
```

If you open another terminal, close VS Code, or change computers, enter the three
values again. Do not replace placeholders in the public workshop source, save the
values in an Exercise issue, or commit them in example files.

## 4. Reuse an existing login, or sign in when required

GitHub sign-in and Copilot sign-in do **not** sign you into Azure. The following
block checks for an existing cached account for your chosen subscription and
tenant. It opens the normal browser sign-in only if that account is missing or
belongs to another tenant. It does not print your account JSON or email.

```powershell
$account = $null
$accountJson = az account show --subscription $env:AZURE_SUBSCRIPTION_ID --output json --only-show-errors 2>$null
if ($LASTEXITCODE -eq 0) {
    $account = ($accountJson -join "`n") | ConvertFrom-Json
}
$needsLogin = $null -eq $account -or $account.tenantId -ne $env:AZURE_TENANT_ID
if ($needsLogin) {
    az login --tenant $env:AZURE_TENANT_ID --output none
    if ($LASTEXITCODE -ne 0) {
        throw 'Azure sign-in did not complete. Stop and use the sign-in recovery below.'
    }
}

$accountJson = az account show --subscription $env:AZURE_SUBSCRIPTION_ID --output json --only-show-errors 2>$null
if ($LASTEXITCODE -ne 0) {
    throw 'The selected subscription is not available to this login. Stop and ask the instructor.'
}
$account = ($accountJson -join "`n") | ConvertFrom-Json
if ($account.tenantId -ne $env:AZURE_TENANT_ID -or
    $account.id -ne $env:AZURE_SUBSCRIPTION_ID -or $account.state -ne 'Enabled') {
    throw 'Tenant/subscription mismatch or disabled subscription. Do not continue.'
}
$account = $null
$accountJson = $null
Write-Output 'Expected tenant and enabled subscription selected; verify live RG access next.'
```

Use the account assigned to you in the browser. Follow MFA and any subscription
selector normally. Even if that selector has a different default, the checks and
later commands here specify **your entered subscription explicitly**. There is no
need to change the machine's default subscription for this guide.

**Browser unavailable or an expired sign-in needs refreshing?** Only for a sign-in
failure, use the device-code alternative below, complete it yourself at the
Microsoft URL the CLI displays, then repeat section 4. Never share the device code,
password, MFA response, access token or recovery code with Copilot or another person.

```powershell
az login --tenant $env:AZURE_TENANT_ID --use-device-code --output none
if ($LASTEXITCODE -ne 0) {
    throw 'Device sign-in did not complete. Stop and ask the instructor.'
}
```

Do not use device-code login to work around a policy that forbids it. A cached
account check is not a current Azure API call; section 5 supplies the live read.

## 5. Verify the actual resource group without provisioning anything

Run this block in the **same terminal**. It requests only group metadata and
prints safe flags plus the group metadata region—not raw IDs or account details.

```powershell
$groupJson = az group show --name $env:WORKLOAD_RG --subscription $env:AZURE_SUBSCRIPTION_ID --output json --only-show-errors 2>$null
if ($LASTEXITCODE -ne 0) {
    throw 'Cannot read the selected resource group. Check its name, subscription, permissions or sign-in; do not provision anything.'
}
$group = ($groupJson -join "`n") | ConvertFrom-Json
$expectedGroupId = '/subscriptions/' + $env:AZURE_SUBSCRIPTION_ID + '/resourceGroups/' + $env:WORKLOAD_RG
if ($group.id -ne $expectedGroupId -or $group.name -ne $env:WORKLOAD_RG) {
    throw 'The returned resource group does not match your entered subscription and name.'
}
[pscustomobject]@{
    TenantAndSubscriptionMatched = $true
    ExistingResourceGroupReadable = $true
    ResourceGroupMetadataRegion = $group.location
    ProvisioningPerformed = $false
}
$group = $null
$groupJson = $null
$expectedGroupId = $null
```

**Expected result:** both readiness flags are `True`, the metadata region is
shown, and `ProvisioningPerformed` is `False`. A successful read proves current
read access only—not Contributor rights, OIDC configuration, allowed resource
types/regions, private-backend connectivity, or permission to deploy/destroy.

| Problem | What to do |
| --- | --- |
| Missing tenant/subscription in the portal | Check the portal directory and invitation with the instructor; do not guess an ID |
| Sign-in/MFA required | Finish the trusted browser flow, then repeat the account and RG checks |
| Account check passes but live read fails | Cached metadata is not live authorization; check token expiry, group spelling and permissions |
| `ResourceGroupNotFound` | Verify the assigned existing group and selected subscription; do not create a similarly named replacement |
| Access denied | Ask the instructor for the intended RG-scoped access; do not grant yourself subscription Owner/Contributor |
| Session was closed | Re-enter section 3 values in the new terminal; never reuse another attendee's values |

## 6. Use the values in the correct place

| Context | Correct mapping |
| --- | --- |
| This local setup session | `$env:AZURE_TENANT_ID`, `$env:AZURE_SUBSCRIPTION_ID`, `$env:WORKLOAD_RG` |
| A lab input asking for `resource_group_name` | Your assigned `WORKLOAD_RG` value, supplied through that lab's approved private input method; never an author's group |
| Instructor-approved Lab 07 Actions copy | **Settings → Secrets and variables → Actions → Variables**: `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `WORKLOAD_RG`; instructor verifies the separate plan/apply IDs, backend tuple and approved `WORKLOAD_INPUTS_JSON.resource_group_name` |
| PR / ordinary validation jobs | No Azure login, OIDC, user token, remote state or copied CLI cache |

Local environment variables do **not** configure GitHub Actions. A local user
login is **not** the workload identity used by a delivery runner. An administrator
must configure the approved private delivery copy and retain its review gates;
never copy your CLI token/cache into GitHub secrets or print a token as evidence.
See [the Lab 07 delivery configuration](https://github.com/alvinea28/ws2-azure-delivery-laboratory-07/blob/dev/docs/delivery-configuration.md).

## 7. Cleanup, privacy and returning to the Exercise

If an approved activity actually provisions resources, **full cleanup is part of
its completion**. Use the same approved lab root/state and fresh reviewed destroy
procedure before moving to another exercise. Do not use `-target`, delete a state
file to hide resources, or delete an existing/shared resource group, backend,
identity or runner. If cleanup fails or remaining resources are uncertain, leave
the activity open and escalate; a green setup check is not proof of cleanup.

The existing Lab 07 path performs full workload destruction by generating a
fresh Terraform **`plan -destroy`** and applying that exact independently reviewed
saved plan. The complete workflow invocation is documented in
[Lab 07 cleanup](https://github.com/alvinea28/ws2-azure-delivery-laboratory-07/blob/dev/.github/steps/05.md).
Do not run an ungated local `terraform destroy` instead of those safeguards.

Before saving any screenshot, mask or blur tenant/subscription/client/object IDs,
emails, account names, avatar/profile details, resource IDs and personal paths.
Prefer opaque redaction when blur could leave text readable. Keep only the
reviewed redacted image; never commit an unredacted capture, plan or state. Do
not screenshot sign-in prompts or device/MFA codes. Redaction does not change
whether the underlying provisioning, verification or cleanup actually succeeded.

After the approved work and verified cleanup, remove the local input values:

```powershell
Remove-Item Env:AZURE_TENANT_ID, Env:AZURE_SUBSCRIPTION_ID, Env:WORKLOAD_RG -ErrorAction SilentlyContinue
```

Removing variables does **not** delete Azure resources or sign you out. On a
shared computer, or when your instructor requests it after the session, run
`az logout` separately. Do not sign out in the middle of an active operation.

Return to **your private copy's existing Exercise issue** and follow its current
task. Entering these values does not automatically mark a task complete, create
infrastructure, or turn an existing local test into a live Azure result.

## Official references

- [Azure CLI sign-in](https://learn.microsoft.com/cli/azure/authenticate-azure-cli-interactively)
- [Azure CLI account commands](https://learn.microsoft.com/cli/azure/account)
- [Azure CLI resource-group commands](https://learn.microsoft.com/cli/azure/group)
- [Find a Microsoft Entra tenant ID](https://learn.microsoft.com/entra/fundamentals/how-to-find-tenant)
