# Activity 03 — Return resource-backed outputs

[Review index](README.md) · [Full setup](00-start-here.md) · [Previous activity](activity-02.md) · [Next activity](activity-04.md) · [Simulation record](simulation.md)

> Review copy; follow your private copy’s live Exercise issue to do the lab.

<!-- FULL-WS-LESSON:START -->
## Laboratory 02 - Step 3/4

### Add outputs and run the checks

### 1. Code the two outputs

On `lab/network`, replace the scaffold in [outputs.tf](../outputs.tf) with exactly these declarations, without Markdown fences:

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

Remove duplicate/unfinished outputs; never invent IDs or add security outputs.

### 2. Run offline checks

Save all intended files. At the clone root, run separately; stop on any failure:

```powershell
npm run workflow:check
npm test
npm run kit:check
npm run companion:check
node scripts/check-learner.mjs
```

**Expected, not observed:** workflow/Node/kit checks pass; **4 core + 3 AVM provider-mocked cases**, zero failed, errored or skipped. Helpers use backend-disabled initialization and read-only locks. Public dependency downloads may need internet; no Azure credentials, OIDC, CLI caches or live state enter these checks.

In [tests/network.tftest.hcl](../tests/network.tftest.hcl), confirm `valid_two_subnet_topology`, `reject_invalid_cidr`, `reject_invalid_subnet`, `reject_missing_tags` execute. Rejections must match declared input validations, not authentication failures. The [AVM contracts](../avm/tests/contract.tftest.hcl) mock AzureRM, AzAPI, ModTM and Random. Preserve all cases; synthetic IDs are not Azure proof.

### 3. Push and inspect this commit

**Source Control → inspect diff → Stage Changes** for intended files only → **Commit** (`lab: add outputs and check workflows`) → **Publish Branch/Push** to `lab/network` in your copy.

Open **Actions**, select this **current commit SHA**, and inspect:

- **Workshop quality → kit**.
- **Lab checks → Test learner module**: four executed cases.
- **Companion contract checks → Validate isolated Terraform companion**: three executed cases.

Require success, not an old green run, source-template skip or zero tests. Refresh the same Exercise; no manual checkboxes or evidence PRs.

![Microsoft reference showing the Source Control commit control](../docs/images/vscode-commit.png)
*REFERENCE — Microsoft, CC BY 3.0 US; example, not evidence. [Attribution](../docs/images/NOTICE.md).*

**Expected:** output/current-CI gates pass. **4/4 is offline proof only**, not live completion; continue Step 4 even after automatic advancement.

**Recovery:** inspect the first failure/current SHA; repair wiring or formatting, not tests/locks. Remove accidental test filters if zero ran.

**Next:** [Step 4: inspect and operate the approved live network](activity-04.md).
<!-- FULL-WS-LESSON:END -->

## Recorded simulation outcome

**2026-09-08 — Cycle A: recorded verified; Cycle B: recorded verified.** Both private simulations recorded resource-backed `vnet_id` and stable-key `subnet_ids` outputs. The expressions were checked with synthetic provider values, not IDs read from a live deployment.

Whole-lab Node and mocked-case totals are not per-activity test counts. See the [simulation record and coverage limits](simulation.md).
