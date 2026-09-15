# Azure setup: enter your own tenant, subscription and resource group

**Goal:** verify read access using **your own assigned Azure account, tenant,
subscription and existing resource group**. Never copy an author's or attendee's values.

> [!IMPORTANT]
> Setup performs **reads only**, not deployment or approval. Stop on errors;
> never add Azure credentials, OIDC or state access to PR checks. Live work and
> full cleanup require the separate protected procedure.

## 1. Find the three values before opening the terminal

Sign in to the [Azure portal](https://portal.azure.com/) with your assigned work/school
account; complete MFA only in Microsoft's trusted sign-in window. All three values are required.

| Value | Portal location | Meaning |
| --- | --- | --- |
| **Tenant ID** | **Microsoft Entra ID → Overview** | Directory GUID, not email/name |
| **Subscription ID** | **Subscriptions → assigned subscription → Overview** | Subscription GUID, not name |
| **Resource group name** | **Resource groups → assigned subscription → existing group** | Group name, not full resource ID |

Confirm the group belongs to that subscription; tenant and subscription IDs are
different GUIDs. If missing, check **Directories + subscriptions**, then ask the
instructor. Do not create groups, change roles/register providers or request broader access.

## 2. Install Azure CLI only if it is missing

Open **Terminal → New Terminal** in this lab's desktop VS Code: Windows PowerShell
5.1 or PowerShell 7, not Bash, Command Prompt or HCL. macOS/Linux needs PowerShell 7
or an instructor-provided equivalent.

**What it does:** prints Azure CLI's installed version; expect an `azure-cli` version,
not sign-in or provisioning. Use the current approved release; no forced upgrade gate.

```powershell
az version
```

If missing, install through the approved process:

- Windows: [official Azure CLI installation](https://learn.microsoft.com/cli/azure/install-azure-cli-windows).
    **What it does:** if WinGet is approved, installs Azure CLI; `--id` names the package
    and `--exact` prevents a fuzzy match. Expect installation success; stop on failure.

  ```powershell
  winget install --exact --id Microsoft.AzureCLI
  ```

- macOS: [official Azure CLI installation](https://learn.microsoft.com/cli/azure/install-azure-cli-macos).
- Linux: [official Azure CLI installation](https://learn.microsoft.com/cli/azure/install-azure-cli-linux).
- PowerShell 7, if needed: [official installation guidance](https://learn.microsoft.com/powershell/scripting/install/installing-powershell).

Restart **all VS Code windows**, reopen this clone and repeat the version check in
a new terminal. Do not replace PATH or disable security. [GitHub/Copilot sign-in](start-here.md)
is separate.

## 3. Enter your values in this terminal session

**What it does:** `Read-Host` prompts for your section 1 values; `.Trim()` removes
edge spaces and `$env:` stores them in this terminal's environment, not a file.
GUID `TryParse` validates/normalizes IDs; the group check rejects blank names/full IDs.
Expect “input formats accepted,” not verified access; stop on rejection and never screenshot prompts.

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

Re-enter values in a new terminal. Never commit them or put them in chat, examples or an Exercise issue.

## 4. Reuse an existing login, or sign in when required

**What it does:** reuses a matching cached account or opens browser sign-in when
missing/mismatched, then checks the exact tenant, subscription and `Enabled` state.
Expect “verify live RG access next”; cached account metadata is **not a live access check**.

| Command / expression | Purpose and important flags |
| --- | --- |
| `az account show` | `--subscription` selects your ID; `--output json` captures metadata; `--only-show-errors` limits noise; `2>$null` suppresses raw errors |
| `az login` | `--tenant` selects your directory; `--output none` avoids printing account details; finish trusted browser MFA |
| `ConvertFrom-Json` / `-join` | Join output lines and parse JSON for exact identity comparisons |
| `$LASTEXITCODE` / `throw` | Check each CLI exit status; zero means command success, failure stops with a safe message |

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

Use your assigned browser account; explicit subscription flags avoid changing the
machine's default. **What it does:** for failed/unavailable browser sign-in only,
`--use-device-code` offers device login in the chosen tenant with account output suppressed.
Complete it yourself at the CLI-displayed Microsoft URL, then repeat the account block;
expect successful sign-in, or stop when the exit-code check throws.

```powershell
az login --tenant $env:AZURE_TENANT_ID --use-device-code --output none
if ($LASTEXITCODE -ne 0) {
    throw 'Device sign-in did not complete. Stop and ask the instructor.'
}
```

Never share device codes, passwords, MFA responses, tokens or recovery codes, or use
device login against policy. Do not capture sign-in screens.

## 5. Verify the actual resource group without provisioning anything

**What it does:** in the **same terminal**, `az group show` makes a live metadata read;
`--name` chooses your group, `--subscription` your ID, and `--output json` captures the
response privately (`--only-show-errors`/`2>$null` limit raw output).
JSON parsing and exact group ID/name comparisons reject mismatches before safe flags print.

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

**Expected:** `TenantAndSubscriptionMatched=True`, `ExistingResourceGroupReadable=True`,
and `ProvisioningPerformed=False`, plus the metadata region. This proves read access,
not Contributor rights, OIDC, backend connectivity or deployment permission; the group's
metadata location is not necessarily the approved workload region.

| Problem | What to do |
| --- | --- |
| Missing assignment / access denied | Ask the instructor; do not guess IDs or grant yourself broader roles |
| Cached check passes, live read fails | Check expiry, spelling and assigned access; repeat trusted sign-in if needed |
| `ResourceGroupNotFound` | Confirm existing group/subscription; never create a replacement |
| New terminal | Re-enter your three values, then repeat both checks |

## 6. Use the values in the correct place

| Context | Correct mapping |
| --- | --- |
| Local terminal | `$env:AZURE_TENANT_ID`, `$env:AZURE_SUBSCRIPTION_ID`, `$env:WORKLOAD_RG` |
| Private lab `resource_group_name` input | Your assigned `WORKLOAD_RG`, through the approved input method |
| Instructor-approved Lab 07 Actions | **Settings → Secrets and variables → Actions → Variables**: `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `WORKLOAD_RG`; instructor verifies separate plan/apply IDs, backend tuple and `WORKLOAD_INPUTS_JSON.resource_group_name` |
| PR checks | No login, OIDC, user tokens, remote state or CLI cache |

Local variables/login do **not** configure Actions or its OIDC workload identity.
Never copy CLI tokens/caches to GitHub. **Lab 07 live is not solo:** retain the
[protected delivery configuration and independent approvals](https://github.com/alvinea28/ws2-azure-delivery-laboratory-07/blob/dev/docs/delivery-configuration.md).

## 7. Cleanup, privacy and returning to the Exercise

1. **Live workload cleanup is mandatory:** use the **same approved root/state** and
    [fresh, independently reviewed saved destroy plan](https://github.com/alvinea28/ws2-azure-delivery-laboratory-07/blob/dev/.github/steps/05.md)
    before moving on. The workflow's `plan -destroy` proposes full destruction; it
    applies that exact reviewed plan. No ungated local `terraform destroy`, `-target`
    (partial selection), state deletion, or deletion of existing/shared RGs, backends,
    identities or runners. Failed/uncertain cleanup keeps the activity open: escalate.
2. **Redaction is mandatory before sharing captures:** hide tenant/subscription/client/object
    IDs, emails, account/profile/avatar details, resource IDs and personal paths; prefer
    opaque masks. Keep only reviewed redacted images, never raw captures, plans/state or
    sign-in/device/MFA screens. Redaction does not prove success.
3. After setup-only work, or verified cleanup for live work, remove local inputs below.

**What it does:** `Remove-Item Env:` removes only these terminal variables;
`-ErrorAction SilentlyContinue` tolerates already-absent values. Expect no output;
this neither destroys resources nor signs you out.

```powershell
Remove-Item Env:AZURE_TENANT_ID, Env:AZURE_SUBSCRIPTION_ID, Env:WORKLOAD_RG -ErrorAction SilentlyContinue
```

**What it does:** `az logout` separately ends the CLI login (normally no output);
use after the session on shared computers or when instructed, never mid-operation.
Stop if logout fails. Return to **your private copy's existing Exercise issue**;
setup does not award progress or prove a live deployment.

## Official references

- [Azure CLI sign-in](https://learn.microsoft.com/cli/azure/authenticate-azure-cli-interactively)
- [Azure CLI account commands](https://learn.microsoft.com/cli/azure/account)
- [Azure CLI resource-group commands](https://learn.microsoft.com/cli/azure/group)
- [Find a Microsoft Entra tenant ID](https://learn.microsoft.com/entra/fundamentals/how-to-find-tenant)
