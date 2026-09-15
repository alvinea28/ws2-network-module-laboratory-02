# Activity 02 — Create the VNet and named subnets

[Review index](README.md) · [Full setup](00-start-here.md) · [Previous activity](activity-01.md) · [Next activity](activity-03.md) · [Simulation record](simulation.md)

> Review copy; follow your private copy’s live Exercise issue to do the lab.

<!-- FULL-WS-LESSON:START -->
## Laboratory 02 - Step 2/4

### Build one VNet and standalone, named subnets

| Goal / workspace | This step |
| --- | --- |
| Goal | Wire the supplied inputs into two resource declarations. |
| Branch | `lab/network` in your private copy. |
| Files | Edit [main.tf](../main.tf) only; read [variables.tf](../variables.tf). |

[Independent setup](activity-01.md) · [Git workflow](../docs/git-workflow.md) · [Toolchain](../docs/toolchain.md) · [Copilot context](../docs/copilot-guide.md).

Keep Terraform **1.16.1**, AzureRM **5.4.0**, Node **24.16.0**, typed inputs, validations and locks unchanged.

### 1. Replace the learner scaffold

Confirm the clone/branch. Read the input names and `subnets` object type, then replace the root implementation's unfinished comments—not a reference solution—with:

```hcl
resource "azurerm_virtual_network" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = var.address_space
  tags                = var.tags
}

resource "azurerm_subnet" "this" {
  for_each = var.subnets

  name                            = each.key
  resource_group_name             = var.resource_group_name
  virtual_network_name            = azurerm_virtual_network.this.name
  address_prefixes                = each.value.address_prefixes
  default_outbound_access_enabled = false
}
```

**Why:** the VNet consumes caller inputs; standalone subnets retain caller names and depend on that VNet. Preserve both `this` labels, two-space indentation and plain quotes; save without Markdown fences or `TODO`.

### 2. Check each connection

| Expression | Purpose |
| --- | --- |
| `var.resource_group_name` | Uses an existing name; no group creation or discovery. |
| `for_each = var.subnets` | Stable instances such as `azurerm_subnet.this["web"]`. |
| `each.key` | Caller key becomes the subnet name. |
| `each.value.address_prefixes` | Uses the object's CIDR list unchanged. |
| `azurerm_virtual_network.this.name` | Links each subnet to this VNet and establishes dependency. |
| `default_outbound_access_enabled = false` | Disables default outbound access, not a complete egress/firewall design. |

Tags belong on the VNet, not subnets. Adding `app` must not renumber `web`/`data`. Do not mix inline/standalone subnets or add `count`, provider/backend blocks, resource groups, data lookups or `module "security"`.

Optional: in Copilot **Ask**, attach the implementation and inputs with `#`:

```text
Review these two resource declarations against the supplied typed inputs and
AzureRM 5.4.0. Explain each.key, each.value.address_prefixes and the VNet dependency.
Do not edit files, add resources, upgrade pins, run commands, or contact Azure.
```

**Why:** request a read-only explanation of map wiring and dependencies. Verify its claims against the input file and table; Chat is not schema validation.

### 3. Check formatting

From the clone-root terminal:

```powershell
terraform fmt -check main.tf
```

**Why:** `fmt` checks Terraform formatting; `-check` reports differences without rewriting the named file. No backend or plan runs. Fix reported indentation/alignment, save, and retry; do not reformat unrelated files or reset global settings.

### 4. Publish and inspect

Review the implementation-only diff and publish using the Git guide; message: `lab: build the VNet and named subnets`. Inspect **Actions → Lab checks → newest commit → Test learner module**, then refresh the same Exercise. Output failures can remain until Step 3; read the actual diagnostic.

![Microsoft reference showing the file-level Stage Changes control](../docs/images/vscode-stage.png)
*REFERENCE — Microsoft, CC BY 3.0 US; example files, not your root. [Attribution](../docs/images/NOTICE.md).*

**Expected:** the pushed `azurerm_virtual_network.this` / `azurerm_subnet.this` declarations preserve caller inputs, map iteration, VNet/CIDR wiring and disabled default outbound access, without unfinished text or security composition. Structural checks precede final Terraform validation.

**Recovery:** compare spelling, `this` labels, subnet arguments and the pushed branch. Keep tests intact; do not substitute solution runs.

Separate [Azure account setup](../docs/azure-setup.md) does not authorize deployment. This file-edit step needs no backend, state or real plan/apply; mocks check contracts, not deployment.

**Next:** [Step 3: return resource-backed IDs](activity-03.md).
<!-- FULL-WS-LESSON:END -->

## Recorded simulation outcome

**2026-09-08 — Cycle A: recorded verified; Cycle B: recorded verified.** Both private simulations recorded the learner VNet/subnet implementation gate, including stable map iteration and disabled default outbound access. No actual VNet or subnet was deployed.

Whole-lab Node and mocked-case totals are not per-activity test counts. See the [simulation record and coverage limits](simulation.md).
