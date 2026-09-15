# Activity 03 — Return resource-backed outputs

[Review index](README.md) · [Full setup](00-start-here.md) · [Previous activity](activity-02.md) · [Next activity](activity-04.md) · [Simulation record](simulation.md)

> Review copy; follow your private copy’s live Exercise issue to do the lab.

<!-- FULL-WS-LESSON:START -->
## Laboratory 02 - Step 3/4

### Expose only the VNet and named subnet IDs

| Goal / workspace | This step |
| --- | --- |
| Goal | Return resource-backed IDs through a stable, network-only interface. |
| Branch | `lab/network` in your private copy. |
| Files | Edit [outputs.tf](../outputs.tf); read [main.tf](../main.tf) and [tests/network.tftest.hcl](../tests/network.tftest.hcl). |

[Independent setup](activity-01.md) · [Git workflow](../docs/git-workflow.md) · [Toolchain](../docs/toolchain.md) · [Copilot context](../docs/copilot-guide.md).

### 1. Replace scaffold outputs

Confirm the clone/branch and both `this` resource labels. Replace the unfinished outputs, including comments, `null` and the empty map, with exactly these two declarations:

```hcl
output "vnet_id" {
  description = "Azure resource ID of the virtual network."
  value       = azurerm_virtual_network.this.id
}

output "subnet_ids" {
  description = "Subnet IDs keyed by the caller's stable subnet names."
  value       = tomap({ for name, subnet in azurerm_subnet.this : name => subnet.id })
}
```

**Why:** outputs must reference the declared resources even when mocks supply their values. Preserve names/descriptions, save, and remove duplicate declarations. Never substitute invented IDs, whole resource objects, `nsg_id`, `association_ids` or `module.security`.

### 2. Understand and verify the map

| Expression | Meaning |
| --- | --- |
| `azurerm_subnet.this` | Collection keyed by caller subnet names. |
| `for name, subnet in ...` | Visits each key/resource pair. |
| `name => subnet.id` | Associates that key with its resource-backed ID. |
| `tomap(...)` | Exposes a map, not positional list indexes. |

Read `valid_two_subnet_topology` in the supplied test: it requires exactly `web`/`data` keys and non-null `vnet_id`. `mock_provider "azurerm"` supplies synthetic IDs at plan time, without Azure. Unknown IDs before evaluation are normal; keep all four runs unchanged.

Optional: attach implementation, outputs and test with `#` in Copilot **Ask**:

```text
Explain how these outputs retain the caller's web/data keys if app is later added.
Distinguish real resource wiring from synthetic values supplied by mock_provider.
Do not edit the input types, replace tests, run commands, or access Azure.
```

**Why:** ask for a read-only distinction between resource wiring and mock values. Verify the answer against the comprehension and assertions; Chat is not a passing test.

### 3. Check the learner root

From the clone-root terminal, with Node **24.16.0**, Terraform **1.16.1** and AzureRM **5.4.0**:

```powershell
node scripts/check-learner.mjs
```

**Why:** the helper checks formatting, initializes with backend disabled and lock read-only, validates, and runs this root's provider-mocked tests. Expect **four executed tests**. Initial provider downloads can need internet; “offline” means no Azure/state access.

### 4. Publish and inspect current CI

Review the output-only diff and publish using the Git guide; message: `lab: return resource-backed network IDs`. Open **Actions → Lab checks → newest commit → Test learner module**. Read the actual `4 provider-mocked tests passed; no Azure calls.` summary or first failure, then refresh the same Exercise.

![Microsoft reference showing the Source Control commit control](../docs/images/vscode-commit.png)
*REFERENCE — Microsoft, CC BY 3.0 US; example commit, not your result. [Attribution](../docs/images/NOTICE.md).*

**Expected:** both pushed resource-backed expressions pass without unfinished text or security outputs/composition. The next gate requires current-revision **Test learner module** CI, not local output; the guide may reconcile it immediately.

**Recovery:** check `this` labels, the map comprehension, formatting and pushed SHA. Repair only learner wiring; never weaken inputs/tests, upgrade locks or point at a solution.

No Azure login, backend/state access or real plan/apply is needed. Mocks do not validate policy, allocation, overlap, routing or connectivity.

**Next:** [Step 4: inspect all four tests](activity-04.md), even if progress already advanced.
<!-- FULL-WS-LESSON:END -->

## Recorded simulation outcome

**2026-09-08 — Cycle A: recorded verified; Cycle B: recorded verified.** Both private simulations recorded resource-backed `vnet_id` and stable-key `subnet_ids` outputs. The expressions were checked with synthetic provider values, not IDs read from a live deployment.

Whole-lab Node and mocked-case totals are not per-activity test counts. See the [simulation record and coverage limits](simulation.md).
