# Activity 02 — Create the VNet and named subnets

[Review index](README.md) · [Full setup](00-start-here.md) · [Previous activity](activity-01.md) · [Next activity](activity-03.md) · [Simulation record](simulation.md)

> Review copy; follow your private copy’s live Exercise issue to do the lab.

<!-- FULL-WS-LESSON:START -->
## Laboratory 02 - Step 2/4

### Build the network and create GitHub Actions

Work on `lab/network` in your private copy. Keep `WORKSHOP_AZURE_ENABLED=false` throughout authoring; no Azure login, live backend/state or real plan/apply.

### 1. Code the original network

Replace the scaffold in [main.tf](../main.tf) with this exact HCL, without Markdown fences:

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

Keep the `this` labels, stable subnet keys, typed inputs, validations and locks. No inline subnets, security composition, resource groups or provider/backend additions. Check formatting at the clone root:

```powershell
terraform fmt -check main.tf
```

### 2. Construct the complete workflow

This workflow uses the separate [avm root](../avm/README.md) on AzureRM **4.81.0**, not the original **5.4.0** learner root; keep their state/ownership separate.

Open [solutions/avm-delivery.yml](../solutions/avm-delivery.yml), the non-runnable reference. Choose **File → New Text File**, leave it **untitled**, and select **YAML** language. Construct these sections from the reference, in order:

1. Copy the complete header: `name`, `on`, `permissions`, `concurrency`, `env`, including `jobs:`.
2. Copy the complete `preflight` job: disabled/private/protected-main admission.
3. Copy the complete `validation` job: same-SHA credential-free checks.
4. Copy the complete `plan` job: `avm-plan`, scoped OIDC, encrypted saved plan.
5. Copy the complete `apply` job: `avm-apply`, distinct identity, exact saved plan.
6. Copy the complete `followup` job, then the complete `drift` job: no-change confirmation and report-only drift; neither applies.

Preserve indentation, pinned actions, driver calls, conditions, permissions and expressions exactly. Compare the **whole** untitled document with the reference. Still disabled, atomically replace all of [.github/workflows/avm-delivery.yml](../.github/workflows/avm-delivery.yml) in **one complete editor save**. Close the untitled buffer without saving another workflow. Keep [avm-cleanup.yml](../.github/workflows/avm-cleanup.yml) separate and unchanged. Never install partial drafts, alternate filenames or an extra writer.

An exact reconstruction may produce **no Git diff**; that is valid. Do not invent a YAML change or empty commit.

### 3. Save the network work

**Source Control → inspect diff → Stage Changes** for intended files → **Commit → Publish Branch/Push**. Refresh the same Exercise. Run the complete checks in Step 3 after adding outputs.

![Microsoft reference showing the file-level Stage Changes control](../docs/images/vscode-stage.png)
*REFERENCE — Microsoft, CC BY 3.0 US; example, not evidence. [Attribution](../docs/images/NOTICE.md).*

**Expected:** network gate advances; one complete disabled delivery workflow remains. Output failures can remain until Step 3.

**Recovery:** fix the actual formatting/wiring difference; keep pins/tests intact and delivery disabled.

**Next:** [Step 3: outputs and checks](activity-03.md).
<!-- FULL-WS-LESSON:END -->

## Recorded simulation outcome

**2026-09-08 — Cycle A: recorded verified; Cycle B: recorded verified.** Both private simulations recorded the learner VNet/subnet implementation gate, including stable map iteration and disabled default outbound access. No actual VNet or subnet was deployed.

Whole-lab Node and mocked-case totals are not per-activity test counts. See the [simulation record and coverage limits](simulation.md).
