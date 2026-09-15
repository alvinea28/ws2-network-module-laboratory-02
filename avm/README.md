# Terraform AVM network example

**Goal:** understand a real, pinned Terraform AVM composition. It creates a VNet,
two or more named subnets and an NSG in an **existing attendee-owned RG**. It does
not create identities, roles or the group. Telemetry is disabled for this example.

**Version boundary:** Terraform **1.16.1**; VNet AVM **0.22.2**, NSG AVM **0.5.1**;
AzureRM **4.81.0**, AzAPI **2.12.0**, Random **3.9.1**. The NSG AVM requires
AzureRM 4.x, so this directory has its **own provider lock and state**. Do not
downgrade the supplied learner root's AzureRM 5.4.0 or let both roots own a VNet.

## Read before running

| File | What to understand |
| --- | --- |
| [terraform.tf](terraform.tf) | Exact module-compatible provider and Terraform requirements |
| [variables.tf](variables.tf) | Your assigned IDs/RG/region and unique disposable name; no author's values |
| [providers.tf](providers.tf) | Explicit subscription/tenant; no automatic provider registration |
| [main.tf](main.tf) | NSG AVM first; VNet AVM consumes its ID, maps stable subnet names and disables default outbound access |
| [outputs.tf](outputs.tf) | Exposes real AVM resource IDs for the caller; do not publish personal resource IDs |

## Authoring validation — no Azure resources

```powershell
# From the repository root: credential-free fmt -check, backend-disabled read-only init, schema validate and exactly 3 mocked contract cases (zero failures/errors/skips); not live delivery, original Exercise completion proof or AgentAlvine progress.
node scripts/check-companion.mjs
```

From this repository root, run these commands one at a time. Stop on any failure.

```powershell
terraform -chdir=avm init -backend=false -lockfile=readonly -input=false
terraform -chdir=avm validate
terraform -chdir=avm test
```

| Command | Meaning / expected result |
| --- | --- |
| `init` | `-chdir=avm` isolates this root; `-backend=false` avoids remote state; `-lockfile=readonly` preserves the supplied Windows/Linux provider selections while downloading public modules/providers |
| `validate` | Checks the actual downloaded module/provider interfaces; success is not Azure authorization |
| `test` | Runs the explicitly mocked contract and rejection cases in [tests](tests/contract.tftest.hcl); these are **not live participant completion** |

The supplied lockfile has verified Windows/Linux hashes. Never change downloaded
module constraints to make incompatible pins work.

## Live exercise and cleanup boundary

Use [your own Azure setup](../docs/azure-setup.md) and the instructor-approved live
procedure only. The current shipped Lab 07 exact-plan workflow targets its own
baseline root; it does **not** automatically deploy this new AVM directory.
Wiring this root into live delivery requires a separate reviewed configuration.
No live execution is claimed by its schema or mock tests.

When that route is approved, use a unique `ws2-avm-` workload and the **same root
and state** for a full reviewed destroy plan, followed by the managed-resource and
Azure inventory check. Do not use partial targets, share ownership with the
baseline, delete the existing RG, or leave the workload behind after the exercise.

### Full cleanup commands — approved writer only

These are **future live commands**, not authoring checks or a substitute for the
missing reviewed AVM delivery configuration. Run from the clone root, only in the
designated writer with its original initialized backend, workspace and private
inputs. Keep the writer's plan/apply identities, concurrency and independent
approval controls. Never run these from PR CI or a normal authoring terminal.

1. In the protected **plan stage**, save the complete destruction proposal:

	```powershell
	terraform -chdir=avm plan -destroy -input=false '-out=cleanup.tfplan'
	if ($LASTEXITCODE -ne 0) { throw 'Destroy plan failed; stop.' }
	```

	**Meaning:** `-chdir` selects this root, `-destroy` includes all its managed
	resources, `-input=false` rejects missing-input prompts, and `-out` saves the
	exact plan inside this root. Expect removal of only its VNet/subnets/NSG.
2. **Stop for independent review.** The existing approved procedure must encrypt,
	bind and review that saved plan. Do not commit/share it or rerun planning after
	approval. Only the protected apply stage may decrypt the approved bytes here:

	```powershell
	terraform -chdir=avm apply -input=false cleanup.tfplan
	if ($LASTEXITCODE -ne 0) { throw 'Cleanup incomplete; keep the exercise open.' }
	```

	**Meaning:** apply consumes the exact saved plan; it does **not** request a
	second approval prompt. External protected approval is therefore mandatory.
3. In the authorized verification stage, inspect remaining state addresses:

	```powershell
	terraform -chdir=avm state list
	if ($LASTEXITCODE -ne 0) { throw 'State verification failed; stop.' }
	```

	**Expected:** no managed workload entries, plus independently verified absence
	of its VNet, subnets and NSG in Azure. Retain the existing RG/backend. An empty
	list alone is not Azure-inventory proof; uncertainty keeps cleanup open.

Sources: [VNet AVM](https://registry.terraform.io/modules/Azure/avm-res-network-virtualnetwork/azurerm/0.22.2),
[NSG AVM](https://registry.terraform.io/modules/Azure/avm-res-network-networksecuritygroup/azurerm/0.5.1).
