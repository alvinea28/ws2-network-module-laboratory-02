# Instructor prerequisite: protected Lab 02 AVM delivery

**Audience:** the authorized instructor/repository and Azure administrators.
Learners read this page to understand the prerequisites; copying the repository
does **not** perform them. The [workflow-authoring lesson](workflow-authoring.md)
is the required live continuation for approved cohorts, while the original four
Exercise steps remain independently usable without Azure.

> [!WARNING]
> Configuration and live preflight below are **prerequisites, not completed work**.
> No Azure, identity, subscription or state operation is part of documentation
> authoring or PR validation. Keep `WORKSHOP_AZURE_ENABLED=false` until the instructor
> explicitly authorizes the specific private copy after real checks. Do not infer
> permission from AgentAlvine progress, a successful mock run, supplied values or
> an available sign-in. No simulated reviewer is acceptable.

## Fixed scope and ownership

| Boundary | Required contract |
| --- | --- |
| Installed writer | Exactly one [canonical AVM workflow](../.github/workflows/avm-delivery.yml), named **Trusted AVM delivery (instructor enablement required)** |
| Teaching reference | Complete [solutions/avm-delivery.yml](../solutions/avm-delivery.yml), outside the workflow directory and therefore non-runnable there |
| Terraform root | Fixed **avm**; never the original learner root or a user-selected path |
| Toolchain | Terraform **1.16.1**; AzureRM **4.81.0**, AzAPI **2.12.0**, ModTM **0.3.5**, Random **3.9.1**; Node **24.16.0** for supplied helpers |
| Registry modules | Network AVM **0.22.2**, NSG AVM **0.5.1**, interfaces module **0.6.0** |
| Workload | Unique `ws2-avm-` network, at least two stable named subnets, default outbound access **false**, and the associated NSG, all in an existing assigned resource group |
| State | Separate AVM backend tuple/key and resources, owned by this copy alone; key starts with `avm/` and ends with `.tfstate` |
| Original Exercise | Four credential-free learner-root cases on AzureRM **5.4.0**, unchanged; neither those cases nor historical **4/4** results verify AVM delivery |

[avm/module-lock.json](../avm/module-lock.json) fingerprints the runtime module
source used by the delivery route. The
[AVM provider lock](../avm/.terraform.lock.hcl) selects providers and their
checksums; **a provider lock is not a module lock**. Preserve both provenance
boundaries. Do not edit module downloads, pins, control scripts or provenance to
make a mismatched plan pass.

Lab 07 has its own root, state and resources. Do not import/adopt its VNet, point
this workflow at its backend, or run both writers against a shared workload.
An existing attendee-owned RG is an assigned scope, not something this lab owns
or should delete. No module GitHub App is needed for these **public registry AVMs**;
do not copy Lab 07's private module-transport credentials into Lab 02.

## 1. Approve the people, host and sandbox first

The instructor must confirm an authorized disposable Azure scope, existing
workload group, approved region/address ranges, resource ownership, budget and
named cleanup owner. Identify the real participants/reviewers through the
organization's private process; never put personal IDs or emails into public
examples. The live route is not a solo exercise.

Use an **eligible Enterprise GitHub host** that actually supports required human
reviewers and the required protections for **private** repositories, together
with exact-workflow runner restrictions. A private copy on a host/plan without
these capabilities is **not ready**. Do not make it public, remove reviewers,
simulate responses, or replace the gated workflow with a local deployment.

The enabled repository must be private, non-template and explicitly approved.
The public source remains on inert `dev`; its templates and read-only Preview
are not deployment destinations. A private copy initially using `dev` should
complete the core there. Establish `main` only through the instructor's live
setup, not by renaming a branch to satisfy an example.

## 2. Protect the branch, environments and runner

1. In the approved copy, establish and protect **main** with the required reviewed
   change process and current-revision checks. Verify the actual rules apply to
   the participants; a rule with bypass paths is not proof. The driver requires
   the run's revision to be the **current protected main** and run attempt **1**.
2. Under **Settings → Environments**, create **avm-plan** and **avm-apply**. For
   **each**, restrict deployment branches to `main`, require actual human
   reviewers, enable prevention of self-review, and disable administrator bypass.
   Verify the effective settings rather than relying on the environment name.
3. Select genuinely independent reviewers. An approving person must not be the
   **PR author**, the **run actor**, or the **triggering actor**. GitHub's built-in
   self-review prevention is only part of this requirement; the delivery guard
   also checks actual approval records. A different merger may make a third
   person necessary. PR approval alone does not approve the saved Terraform plan.
4. Prepare an isolated **ephemeral Linux x64** runner with the reference's
   **ws2-trusted** labels and an instructor-owned runner group restricted to
   **this exact workflow on the trusted ref**. Matching a label is not enough.
   Never schedule PR/untrusted code onto this runner or reuse a developer's
   logged-in machine as the privileged runner.
5. Verify the runner's approved tools, private backend DNS resolution and actual
   network reachability, including the necessary OIDC, GitHub artifact, Azure and
   public-registry endpoints. Clear sensitive working data by retiring the
   ephemeral runner. Do not expose the backend publicly to work around DNS.
6. For scheduled drift, confirm the copy's default branch is the approved protected
   `main`; GitHub schedules execute on the default branch. A schedule from `dev`
   is not a permitted alternate writer. Default-branch changes are instructor
   setup, not a learner workaround.

Preflight and validation stay free of **Azure credentials, OIDC and state access**;
restricted GitHub metadata reads do not grant cloud access. Only the authorized
live stages may request OIDC and use the protected runner/environments. Retain
the workflow's least-privilege permissions, exact action pins and dependency chain
**preflight → validation → plan → apply**.

## 3. Supply separate OIDC identities and the existing backend

An authorized administrator, outside authoring/PR checks, must prepare and
verify **distinct** plan/apply client IDs. The learner does not create identities,
grant roles or register providers to get past a failure.

| Identity | Workload management scope | State data-plane scope |
| --- | --- | --- |
| Plan identity | **Reader** on the existing assigned workload RG | **Storage Blob Data Contributor** on the dedicated state container, including lease operations |
| Apply identity | **Contributor** on that workload RG, not subscription-wide ownership | **Storage Blob Data Contributor** on that same dedicated state container, including leases |

Neither identity has role-grant rights. Do not add Owner, User Access Administrator
or broader permissions, and do not confuse management-plane Reader with blob
data access. Required resource-provider availability is an administrator preflight
responsibility, not automatic registration by the lab.

Use Microsoft Entra federated credentials for the intended GitHub issuer/audience
and the **exact repository/environment** subjects. Template subject shapes are
`repo:<OWNER>/<PRIVATE-COPY>:environment:avm-plan` and
`repo:<OWNER>/<PRIVATE-COPY>:environment:avm-apply`; placeholders are not real
identities or permissions. Verify the actual bindings privately, with no wildcard
trust in other copies/branches. Short-lived OIDC tokens replace client secrets;
local Azure CLI sign-in does not configure or prove this trust.

The [AVM backend](../avm/backend.tf) uses **OIDC plus Microsoft Entra** blob
authentication only. No storage account key, SAS, client secret, local CLI cache
or managed-identity fallback is a substitute. Do not initialize it locally.
Credential-free CI must use **backend=false**; Terraform tests explicitly mock
**all four providers**, including AzAPI, ModTM and Random as well as AzureRM.

The backend storage/container and private networking must already exist and be
approved. Bind repository concurrency to a stable `WS2_STATE_LOCK_ID` and use
Terraform's actual Azure Blob lease locking. Keep **one writer**: repository
concurrency does not serialize another repository or a local terminal. Do not
cancel a live writer to start another, disable state locking, force-unlock a
lease or delete state as an ordinary recovery step.

## 4. Set repository variables without publishing their values

In **Settings → Secrets and variables → Actions → Variables**, the authorized
administrator supplies the following **repository variables**. This table lists
names and meaning only; obtain actual values through the approved private channel.
Keep the common values consistent across both environments; do not shadow them
with conflicting environment overrides between planning and application.

| Repository variable | Meaning / constraint |
| --- | --- |
| `WORKSHOP_AZURE_ENABLED` | Keep **false** during authoring and prerequisite work. Only the instructor may enable the approved private copy after real preflight. |
| `WS2_STATE_LOCK_ID` | Stable instructor-approved identifier for this copy's state writer/concurrency boundary; do not change it mid-lifecycle. |
| `AZURE_TENANT_ID` | Approved tenant; the driver supplies it to Terraform from this variable. |
| `AZURE_SUBSCRIPTION_ID` | Approved subscription; the driver supplies it, without changing a local CLI default. |
| `AZURE_PLAN_CLIENT_ID` | Plan OIDC identity; must differ from the apply identity. |
| `AZURE_APPLY_CLIENT_ID` | Apply OIDC identity; never replace it with a learner's login. |
| `STATE_STORAGE_ACCOUNT` | Existing approved backend account reachable from the trusted runner. |
| `STATE_CONTAINER` | Dedicated approved state container and blob-role scope. |
| `STATE_KEY` | Unique key for this AVM workload: **avm/** prefix and **.tfstate** suffix; never Lab 07's key. |
| `WORKLOAD_RG` | Existing assigned group, matching the workload input's `resource_group_name`. |
| `WORKLOAD_INPUTS_JSON` | One JSON object containing **exactly** the five fields below; no extra root/identity/backend/tag inputs. |
| `PLAN_ENCRYPTION_PUBLIC_KEY` | Approved public encryption key for the saved-plan envelope; this is not a private key or Azure credential. |

### Exact workload input contract

| Field in `WORKLOAD_INPUTS_JSON` | Shape and constraint |
| --- | --- |
| `name` | String, unique disposable network name starting with `ws2-avm-`; never an existing/shared network |
| `location` | String, instructor-approved Azure region |
| `resource_group_name` | String, existing group name exactly matching `WORKLOAD_RG` |
| `address_space` | Nonempty array of approved valid IPv4 CIDR strings |
| `subnets` | Object keyed by at least two stable named subnets; each value contains a nonempty `address_prefixes` array of approved IPv4 CIDRs |

Validate containment/non-overlap and the intended topology in real preflight;
syntactically valid CIDRs alone are not network suitability. Keep subnet keys
stable. Default outbound access is disabled and NSG associations are supplied by
the fixed HCL, not optional JSON switches.

Do **not** add `tenant_id`, `subscription_id`, `tags`, module paths, environment
names or backend selectors to this object. The driver injects tenant/subscription
from their approved repository variables. The benign update exercise edits the
`tags` map in the `locals` block of [avm/main.tf](../avm/main.tf), preserving
required workshop/environment tags and fixed source/control/provenance boundaries.
No public example needs real IDs, email addresses, state names or key material.

## 5. Place the decryption secret only where it belongs

Create **PLAN_DECRYPTION_PRIVATE_KEY** as an environment secret **only in
avm-apply**, not a repository/organization secret and not in avm-plan or PR CI.
Keep a separate approved **human reviewer escrow** copy through the organization's
secure process so an independent reviewer can inspect the exact plan privately
before approving it. This is the only delivery secret required by this public-AVM
route; do not add module GitHub App secrets or long-lived Azure credentials.

Verify the public/private key pairing through the approved process. Never paste
key material, state, tokens, plaintext plans, raw plan JSON or optional API callback
URLs into Git, chat, issues, logs or screenshots. Review copies must remain private
and be disposed of according to the approved procedure, not uploaded as evidence.

The artifact is **ciphertext only**, retained for **one day**. That retention is
not an approval window: a saved plan older than **two hours** cannot be applied.
The [delivery driver](../scripts/avm-delivery.mjs) checks the exact run/attempt,
source revision, fixed root, state, inputs, module fingerprints and provider-lock
binding before decryption/application. The apply job must never generate a new
plan after approval or accept an artifact from another run.

## 6. Verify real readiness before enablement

The following are instructor verification obligations, **not checked boxes or
claims that the setup was executed**:

| Gate | Required observation in the authorized live preflight |
| --- | --- |
| GitHub admission | Approved private non-template copy, current protected main, real branch rules and eligible first-attempt workflow |
| Human gates | Both environments enforce main-only deployment, actual independent reviewers, no self-review and no admin bypass; actual approval records are available to the guard |
| Runner | Ephemeral Linux x64 trusted runner with exact-workflow restriction; untrusted/PR jobs excluded |
| OIDC/RBAC | Correct tenant/subscription, distinct subjects/client IDs and least-privilege workload/container scopes; no role-grant rights |
| Backend | Intended separate state tuple, private DNS/reachability from that runner, Entra access and actual blob leasing; no alternate writer |
| Inputs/provenance | Exact five-field input object, fixed AVM root, source pins/fingerprints and provider lock agree with the approved revision |
| Plan review | Working encryption/decryption pairing, approved independent human escrow, ciphertext-only one-day artifacts and two-hour apply limit |
| Workload ownership | Approved existing group/region/CIDRs, unique name, no imports/adoption, no Lab 07 overlap; cleanup owner and budget assigned |

The learner first reconstructs and validates the whole workflow **while disabled**
using the [authoring lesson](workflow-authoring.md#7-replace-one-complete-file-while-disabled-validate-offline).
Never install fragments or a second writer. Review actual current-revision offline
results; those results do not replace any gate in the table.

Only after the instructor verifies the configuration and explicitly authorizes
the next intended main push may the approved private copy be enabled. Do not
enable queued/stale work or re-run a previously blocked delivery attempt. Source
maintenance on public `dev` remains inert; no authoring enablement is performed
by following or editing these documents.

## 7. Required acceptance and full cleanup

The approved cohort must observe the following **real** lifecycle, using the
[learner walkthrough](workflow-authoring.md#8-complete-the-required-live-lifecycle--only-after-instructor-preflight):

1. A reviewed **main push** creates the disposable AVM network through the same
   run's preflight, validation, plan, independent approval and exact-plan apply.
2. The driver's actual **Azure Resource Manager inventory/configuration checks**
   verify the intended VNet, named subnets, NSG links, address ranges and disabled
   default outbound access. Keep identifiers privately for the update comparison.
3. A benign **HCL tag change**, reviewed and pushed to main, repeats the gated
   deployment and updates those **same resource IDs**, not a replacement network.
4. A new manual **followup** on main produces a **fresh live plan with exit 0**.
   Exit 2 means changes, exit 1 means an error; neither completes convergence.
5. A new manual **destroy** on main is an **exclusive operation**, with a fresh
   full destroy plan, independent review and application of exactly that plan.
   Require absence of managed workload state and actual Azure **404s** for the
   intended resources. Preserve the existing group, backend, identities and runner.

No partial targets, local live initialization/apply/destroy, state deletion,
Lab 07 import/adoption or approval simulation is an alternative. Actual GitHub
environment reviews authorize the protected jobs; AgentAlvine's educational
issue status does not. Failure/uncertainty leaves cleanup open with the owner.

Scheduled **drift** remains **report-only**: it neither repairs differences nor
counts as create/update/cleanup proof. Manual choices remain only **followup** and
**destroy**; deployment comes from the reviewed main push, without another deploy
dispatch. Optional runtime API extensions are blocked until a separate real
preflight, authorization and cost review. Storage, runner hosting and any approved
optional services can cost money even without billable VNet resources; never
promise a zero-cost exercise.

**Completion language:** distinguish “four offline steps complete,” “workflow
authored and checked,” “instructor preflight pending/passed,” and each observed
live create/update/follow-up/destroy outcome. Historical records and this document
are not evidence that any live stage has run.
