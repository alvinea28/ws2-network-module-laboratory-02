# Terraform AVM network — required live continuation

**Goal:** understand a real, pinned Terraform AVM composition. It creates a VNet,
two or more named subnets and an NSG in an **existing attendee-owned RG**. It does
not create identities, roles or the group. Telemetry is disabled for this example.

For instructor-approved live cohorts, this is the **required continuation after
the four offline steps**, not a fifth AgentAlvine gate. **4/4** remains core
learner-root completion only; it proves no AVM deployment, live approval or cleanup.
Until the real prerequisite is ready, report **live continuation pending**.

**Required activity: [Create GitHub Actions, then deploy Azure](../docs/workflow-authoring.md).**
First author/check Actions offline; then perform the Azure lifecycle only in the
exact approved private copy after owner readiness. Public templates and unapproved
copies cannot deploy. Never repin IDs/pins or toggle flags to bypass that guard.

**Version boundary:** Terraform **1.16.1**; VNet AVM **0.22.2**, NSG AVM **0.5.1**,
interfaces **0.6.0**; AzureRM **4.81.0**, AzAPI **2.12.0**, locked ModTM **0.3.5**,
Random **3.9.1**. The NSG AVM requires AzureRM 4.x, so this directory has its
**own provider lock and state**. Do not downgrade the supplied learner root's
AzureRM **5.4.0** or let both roots own a VNet. Lab 07 also retains separate
resources/state; no import, adoption or shared writer is permitted.

## Read before running

| File | What to understand |
| --- | --- |
| [terraform.tf](terraform.tf) | Exact module-compatible provider and Terraform requirements |
| [variables.tf](variables.tf) | Assigned RG/region and unique disposable name; the driver supplies tenant/subscription from approved variables, not public example values |
| [providers.tf](providers.tf) | Explicit subscription/tenant; no automatic provider registration |
| [main.tf](main.tf) | NSG AVM first; VNet AVM consumes its ID, maps stable subnet names and disables default outbound access |
| [outputs.tf](outputs.tf) | Exposes real AVM resource IDs for the caller; do not publish personal resource IDs |
| [backend.tf](backend.tf) | OIDC and Microsoft Entra backend authentication only; never initialize the live backend locally |
| [module-lock.json](module-lock.json) | Fingerprints the runtime module source; preserve it and the pinned sources |
| [.terraform.lock.hcl](.terraform.lock.hcl) | Provider selections/checksums, **not** a module lock or deployment authorization |

Use the [workflow-authoring lesson](../docs/workflow-authoring.md) and
[instructor delivery prerequisite](../docs/delivery-configuration.md) for this
root. The five fields of `WORKLOAD_INPUTS_JSON` are exactly `name`, `location`,
`resource_group_name`, `address_space` and `subnets`. Keep identity/backend inputs
out of that JSON; the driver injects approved tenant/subscription separately.

## Authoring validation — no Azure resources

From the repository root, use the approved companion helper; stop on failure.

```powershell
npm run companion:check
```

| Helper operation | Meaning / expected result |
| --- | --- |
| Formatting check | Checks this isolated root without rewriting source |
| Backend-disabled initialization | Uses `-backend=false`, `-lockfile=readonly` and `-input=false`; may download pinned public providers/modules but does not access live state |
| Schema validation | Checks the actual downloaded module/provider interfaces; success is not Azure authorization |
| Mocked tests | Executes exactly **three** plan-only [contract cases](tests/contract.tftest.hcl), with zero failures/errors/skips; **AzureRM, AzAPI, ModTM and Random are all mocked** |

The supplied provider lock retains Windows/Linux hashes. Never change downloaded
module constraints to make incompatible pins work. These are expected checks,
not a claim that they ran just because this page exists. The original
[learner helper](../scripts/check-learner.mjs) still checks the **original root's
four cases**; do not redirect it here or equate the two totals.

Also complete the [workflow and repository checks](../.github/steps/03.md)
while delivery is disabled. No local Azure login, identity/subscription operation,
live backend initialization, state access or real plan/apply/destroy belongs in
authoring or PR CI.

## Author one workflow; enable only after real preflight

Construct the complete workflow in an **untitled buffer** from the explained
sections of the [non-runnable reference](../solutions/avm-delivery.yml), then
replace the single [canonical workflow](../.github/workflows/avm-delivery.yml)
as one complete edit **while disabled**. Do not install partial sections or a
second writer. The live root is always this AVM directory, never a dispatch input.

The instructor must first configure an approved private non-template copy,
protected current `main`, eligible Enterprise hosting, main-only **avm-plan** /
**avm-apply** environments with **no Required reviewers** and no admin bypass.
There is no manual deployment reviewer. Separate OIDC identities, a private Entra-only backend and
an exact-workflow-restricted ephemeral Linux x64 **ws2-trusted** runner are required.
These are administrator prerequisites, not something a clone, mock or local login
has already done. Public `dev` stays inert and `WORKSHOP_AZURE_ENABLED=false`
throughout authoring.

Read [owner readiness](../docs/delivery-configuration.md), including approved scope,
budget, maximum lifetime and explicit bootstrap authorization. If main is absent,
stop at the offline handoff; only the owner establishes protected main while disabled
after baseline/readiness review. No PR into nonexistent main or unready creation.
Source maintenance stays on **dev**, not participant live main.

## Required live lifecycle and cleanup — Actions is the only writer

After actual instructor preflight, follow the [live walkthrough](../.github/steps/04.md):

1. Only when ready/enabled, the author merges a real checks-passing PR. Its **main
   push** starts **preflight → validation → saved plan/encryption → automatic
   exact-plan apply** in the same run. No approvals API, reviewer wait or additional
   deploy dispatch. No empty commit or fake change just to trigger Actions.
2. Verify the real Azure VNet, at least two named subnets, NSG associations,
   approved CIDRs and `default_outbound_access_enabled=false` through the live
   driver's ARM configuration/inventory checks, not mocked IDs.
3. Make a benign instructor-approved change to the `tags` map in the `locals`
   block of [main.tf](main.tf). Preserve required workshop/environment tags,
   resource names/CIDRs/subnet keys, module pins and control/provenance files.
   Another reviewed main push performs the gated update; verify **the same IDs**.
4. Manually select **followup** on `main`; require a **fresh live plan with exit 0**.
   Changes (exit 2) or errors do not complete convergence; this operation never applies.
5. After separately authorizing owned-scope full cleanup, the authenticated current
   repo admin dispatches [avm-cleanup.yml](../.github/workflows/avm-cleanup.yml) on
   main, with required string `authorization` =
   `destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>` and **no operation input**.
   The [cleanup reference](../solutions/avm-cleanup.yml) explains this separate route.
   The helper checks current admin, actor/sender/trigger IDs and current SHA/state;
   no independent cleanup reviewer is required. Validate a fresh full destroy plan
   in that same run, apply those exact bytes and
   verify no managed workload state plus actual Azure **404s** for the intended
   resources. Keep the assigned RG, backend, identities and runner infrastructure.

Saved plans are bound to the exact run/root/state/inputs/source/module fingerprints
and provider lock, expire after **two hours**, and are uploaded only as ciphertext
with **one-day retention**. Repository concurrency and state leases enforce one
writer. No live re-run attempts, replacement plans at apply time, fabricated
authorization, partial targets, state deletion or local destroy shortcuts.

Delivery's manual menu is **followup only**; ordinary main never cleans up and
destroy/replacement actions on regular pushes fail. Scheduled drift is **report-only**,
not auto-repair or cleanup proof. It needs the owner's deliberate protected-main
default choice when ready; no automatic branch change. Failed or
uncertain destruction remains pending with the cleanup owner. Optional runtime
API extensions stay blocked until real preflight; storage, runners and approved
extensions can incur costs, so do not assume zero cost.

[Azure sign-in setup](../docs/azure-setup.md) is account/read-access guidance only;
its Lab 07 references do not select a writer for this AVM root. The Lab 02 guides
above replace this page's earlier future/manual cleanup instructions. No live
execution or human approval is claimed by the documentation or authoring checks.

Sources: [VNet AVM](https://registry.terraform.io/modules/Azure/avm-res-network-virtualnetwork/azurerm/0.22.2),
[NSG AVM](https://registry.terraform.io/modules/Azure/avm-res-network-networksecuritygroup/azurerm/0.5.1).
