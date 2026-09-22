# Create GitHub Actions, then deploy Azure

<!-- FULL-WS-ACTIONS:START -->
**Purpose:** assemble Actions, merge, inspect Azure, update, confirm no-change and clean up. **4/4 is offline only**, not Azure authorization; this is not a fifth gate. AgentAlvine only guides/observes. All results below are **expected, not observed**.

> **Prerequisites, once:** finish the core in your own clone; keep `WORKSHOP_AZURE_ENABLED=false` while authoring. The instructor supplies the approved copy, directory/subscription, existing RG, VNet name, region, CIDRs and subnet names; confirms scope, budget, lifetime, explicit bootstrap authorization, protected main/checks, distinct OIDC identities, private backend/lease locking, separate state, trusted runner and encryption.
>
> Only private non-template **alvine-aurelio-org/ws2-sim-20260921-network-module-laboratory-02**, ID **1379147533**, is eligible. Public/unapproved copies stay offline: never repin IDs/pins or bypass flags.
>
> Missing main or readiness? **Stop after offline checks: live continuation pending.** Only the owner establishes protected main while false, after readiness review. Source maintenance stays on dev.

## 1. Assemble one complete workflow

1. In VS Code, select the owner-provided baseline with the branch picker; **Git: Create Branch... → lab/actions-azure**. Preserve your old learner branch; never reset it.
2. Open [solutions/avm-delivery.yml](../solutions/avm-delivery.yml). Choose **File → New Text File**, leave it untitled, select **YAML**.
3. Copy the complete header including `jobs:`, then `preflight`, `validation`, `plan`, `apply`, `followup`, `drift` sections in order, including permissions, concurrency and pinned actions. Compare the whole buffer; replace [.github/workflows/avm-delivery.yml](../.github/workflows/avm-delivery.yml) **as a whole file in one save**, still disabled. Close the buffer without saving another workflow.
4. Keep the installed [separate cleanup workflow](../.github/workflows/avm-cleanup.yml); its [reference](../solutions/avm-cleanup.yml) is not another installed copy. No alternate filenames or partial drafts. An identical reference may produce **no Git diff**; that is valid.

## 2. Check offline

In **Terminal → New Terminal**, at the clone root, run separately; stop on failure:

```powershell
npm run workflow:check
npm test
npm run kit:check
npm run companion:check
node scripts/check-learner.mjs
```

**Expected:** one canonical delivery plus one cleanup workflow; Node/kit checks pass; **3 AVM + 4 core provider-mocked cases**, no failures/skips. Helpers use backend-disabled initialization and read-only locks; dependencies may need downloads. No Azure credentials/state, real backend initialization or deployment.

![GitHub workflow sidebar reference](../docs/images/github-workflow-sidebar.webp)
*REFERENCE — GitHub, CC BY 4.0; not execution evidence. [Attribution](../docs/images/NOTICE.md).*

## 3. Commit → PR → main triggers deployment

Only after the owner confirms readiness and enablement:

1. If no intended change remains, ask about a genuine tag change: add `activity = "actions-azure"` inside the existing `locals.tags` in [avm/main.tf](../avm/main.tf), **only if owner-approved**. No empty commit or fake YAML change.
2. VS Code **Source Control → select each changed file → inspect diff → Stage Changes** for intended files only; enter a message, **Commit → Publish Branch/Push**.
3. GitHub **Pull requests → New pull request**: base **main**, compare **lab/actions-azure**. Inspect **Files changed**, create the PR, wait for required checks green, resolve conversations, **Merge pull request**. No independent PR/deployment reviewer is required.
4. This first merge/push to protected main starts **Actions → Trusted AVM delivery (instructor enablement required)**; **no second deploy dispatch**. Check the same commit SHA, run and **attempt 1** through:
   **Verify scoped AVM deployment policy → Validate reviewed AVM revision → Trusted AVM plan → Apply exact AVM saved plan**.

**Expected:** the same run applies its encrypted saved plan, not a replacement plan.

## 4. Inspect in the Azure portal

Open [Azure portal](https://portal.azure.com/) → **Directories + subscriptions** → assigned directory/subscription → **Resource groups → assigned RG → instructor-provided VNet name** (also in approved GitHub workload configuration).

| Click | Expected; compare with instructor values |
| --- | --- |
| VNet **Overview** | Provisioning **Succeeded**, approved region; retain resource ID privately. |
| **Address space** | Approved CIDR, not a value guessed from an example. |
| **Subnets → each subnet** | Approved names/prefixes; NSG association `<VNet>-nsg`. Subnets are nested, not standalone RG rows. |
| VNet **JSON View** | Each subnet has `defaultOutboundAccess: false`. |
| RG → `<VNet>-nsg` → **Subnets** | Associations match those subnets; retain subnet/NSG IDs privately. |
| VNet and NSG **Tags** | `workshop=ws2`, `environment=dev`; approved activity tag if added. |

Green Actions/mocks are not portal proof. No VM, public IP, app URL or connectivity result is claimed.

## 5. Update and confirm no-change

With owner authorization, add/change the literal activity tag to `"actions-azure-updated"` in the same `locals.tags`; keep required tags, names, CIDRs and subnet keys. Repeat step 3. **Expected:** in-place update, no replacement, same VNet/subnet/NSG IDs; confirm the new value under portal **Tags**.

Then **Actions → Trusted AVM delivery (instructor enablement required) → Run workflow → main → operation: followup**. Expect a **fresh plan exit 0** and **Confirm AVM no-change**; exit 2 is not success. Followup never applies; scheduled drift is report-only.

## 6. Separately authorize and run cleanup

The owner/current authenticated repository admin explicitly authorizes the **whole owned workload**, then opens **Actions → Trusted AVM cleanup (explicit owner authorization required) → Run workflow → main**.

Enter required string **authorization**: `destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>`. The instructor supplies the current full 40-character SHA and actual state-lock value; **never guess or type placeholders**. There is **no operation input** and no independent cleanup reviewer.

**Expected:** **Trusted AVM plan → Apply exact authorized AVM destroy plan** succeed; portal refresh shows owned VNet/NSG gone; workflow verifies Azure absence and the **same state is empty**. Retain RG, backend, identities and runner. Ordinary pushes never clean up.

**Recovery:** stop, keep diagnostics private and ask the instructor; never force-unlock, widen roles, delete state or use local destroy.

[Optional instructor reference](delivery-configuration.md).
<!-- FULL-WS-ACTIONS:END -->
