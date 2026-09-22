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
> an available sign-in. No manual deployment reviewer is required for this scoped
> automatic path; sandbox, budget, bootstrap and cleanup authorizations remain separate.

**Public-source context:** this page documents prerequisites, not a current
configuration inventory or live result. Start with the **required activity:
Create GitHub Actions, then deploy Azure** in the [authoring lesson](workflow-authoring.md).
Every copy can complete Actions authoring offline; only the exact approved private
profile can proceed to Azure. Missing scope, budget, lifetime or explicit bootstrap
authorization means **live continuation pending**. No actual Azure scope or cost
allowance is supplied by this template.

The read-only workflow token cannot see GitHub's ruleset bypass list. The helper
binds fresh rules to an exact owner-verified server-issued `updated_at` revision
with **zero bypass actors**. Missing/changed revision fails closed; never treat a
hidden bypass list as empty or grant ruleset-write permission to the workflow.
Ask the owner to investigate a mismatch; do not repin IDs, names, rules or workflow
hashes, or toggle flags, to make an unapproved copy eligible. See
[GitHub's response visibility contract](https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset).

## Fixed scope and ownership

| Boundary | Required contract |
| --- | --- |
| Exact private identity | Immutable repository ID and exact name are fixed in [deployment-authorization.cjs](../scripts/deployment-authorization.cjs) through the Lab 02 wrapper; wrong IDs/names, public copies and templates fail |
| Installed writer | Exactly one [canonical AVM workflow](../.github/workflows/avm-delivery.yml), named **Trusted AVM delivery (instructor enablement required)** |
| Teaching reference | Complete [solutions/avm-delivery.yml](../solutions/avm-delivery.yml), outside the workflow directory and therefore non-runnable there |
| Separate cleanup | [Installed cleanup](../.github/workflows/avm-cleanup.yml) and [non-runnable cleanup reference](../solutions/avm-cleanup.yml); explicit owner dispatch only, never a main push |
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
maximum lifetime, plus a named cleanup owner. Bootstrap changes require explicit
owner authorization before any setup mutation. Identify the participants and
authorized repository admin privately; never invent scope or authorization from
this page. One authorized owner may operate the route; no second deployment or
cleanup reviewer is required.

Use an **eligible Enterprise GitHub host** that actually supports the required
branch/environment protections for **private** repositories, together
with exact-workflow runner restrictions. A private copy on a host/plan without
these capabilities is **not ready**. Do not make it public, simulate readiness,
broaden access or replace the protected workflow with a local deployment.

The enabled repository must be private, non-template and explicitly approved.
The public source remains on inert `dev`; its templates and read-only Preview
are not deployment destinations. A private copy initially using `dev` should
complete the core there. Establish `main` only through the instructor's live
setup, not by renaming a branch to satisfy an example.

## 2. Protect the branch, environments and runner

1. Only after reviewing the baseline and prerequisite readiness, the authorized
   owner establishes protected **main while delivery remains disabled**, with the
   [author-merged PR process](pr-author-merge.md): require a PR, **zero approving PR
   reviews**, resolved conversations and strict current-revision checks. The author
   may inspect and merge their own PR; GitHub self-approval is neither needed nor
   supported. Verify the actual rules apply to
   the participants; a rule with bypass paths is not proof. The driver requires
   the run's revision to be the **current protected main** and run attempt **1**.
2. Under **Settings → Environments**, verify **avm-plan** and **avm-apply**. For
   **each**, allow exactly branch `main`, configure **no Required reviewers**, and
   disable administrator bypass. This is automatic deployment, not self-approval.
   Verify the effective settings rather than relying on the environment name.
   Missing configuration requires explicit owner-authorized bootstrap, not a
   learner workaround. Reuse the existing exact-profile ruleset; do not create a
   replacement rule or broaden its scope merely to pass admission.
3. The historical [avm-approval.cjs](../scripts/avm-approval.cjs) filename is kept,
   but it delegates to [deployment-authorization.cjs](../scripts/deployment-authorization.cjs).
   It freshly checks immutable private identity, live rules, current main,
   run/SHA/attempt, actual merged-PR association, both environments and successful
   same-run validation/plan jobs. It does **not** query the approvals API or wait
   for a human deployment decision. Never replace these checks with issue progress.
4. Prepare an isolated **ephemeral Linux x64** runner with the reference's
   **ws2-trusted** labels and an instructor-owned runner group restricted to
   **this exact workflow on the trusted ref** and the separately installed cleanup
   workflow on that same protected-main ref; no other workflow/ref is allowed.
   Matching a label is not enough.
   Never schedule PR/untrusted code onto this runner or reuse a developer's
   logged-in machine as the privileged runner.
5. Verify the runner's approved tools, private backend DNS resolution and actual
   network reachability, including the necessary OIDC, GitHub artifact, Azure and
   public-registry endpoints. Clear sensitive working data by retiring the
   ephemeral runner. Do not expose the backend publicly to work around DNS.
6. GitHub schedules execute on the default branch. If it is **dev**, scheduled
   live drift needs the owner's deliberate choice of protected **main** as default
   **only when ready**. There is no automatic default-branch change.
   A schedule from dev is not a permitted alternate writer; it proves no drift result.

If protected main does not exist, stop at the offline handoff. Do not invent scope,
open a PR into nonexistent main, or create it while unready. The first eligible
deployment revision must come from a real checks-passing PR, not an empty commit
or fake change to trigger Actions. Source maintenance stays on `dev`.

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
Any separately authorized owner key escrow is for private inspection/recovery,
not a manual reviewer gate. Automatic apply decrypts only after the scoped
authorization checks pass. This is the only delivery secret required by this public-AVM
route; do not add module GitHub App secrets or long-lived Azure credentials.

Verify the public/private key pairing through the approved process. Never paste
key material, state, tokens, plaintext plans, raw plan JSON or optional API callback
URLs into Git, chat, issues, logs or screenshots. Review copies must remain private
and be disposed of according to the approved procedure, not uploaded as evidence.

The artifact is **ciphertext only**, retained for **one day**. That retention is
not an apply window: a saved plan older than **two hours** cannot be applied.
The [delivery driver](../scripts/avm-delivery.mjs) checks the exact run/attempt,
source revision, fixed root, state, inputs, module fingerprints and provider-lock
binding before application. The job checks scoped authorization before decryption.
The apply job must never generate a new plan instead of the saved plan or accept
an artifact from another run.

## 6. Verify real readiness before enablement

The following are instructor verification obligations, **not checked boxes or
claims that the setup was executed**:

| Gate | Required observation in the authorized live preflight |
| --- | --- |
| GitHub admission | Approved private non-template copy, current protected main, real branch rules and eligible first-attempt workflow |
| Environment controls | Both environments enforce main-only deployment, no Required reviewers and no admin bypass; scoped authorization checks real current settings |
| Runner | Ephemeral Linux x64 trusted runner with exact-workflow restriction; untrusted/PR jobs excluded |
| OIDC/RBAC | Correct tenant/subscription, distinct subjects/client IDs and least-privilege workload/container scopes; no role-grant rights |
| Backend | Intended separate state tuple, private DNS/reachability from that runner, Entra access and actual blob leasing; no alternate writer |
| Inputs/provenance | Exact five-field input object, fixed AVM root, source pins/fingerprints and provider lock agree with the approved revision |
| Saved-plan integrity | Working encryption/decryption pairing, apply-only private key, ciphertext-only one-day artifacts and two-hour apply limit |
| Workload ownership | Approved existing group/region/CIDRs, unique name, no imports/adoption, no Lab 07 overlap; budget, lifetime, bootstrap authorization and cleanup owner assigned |

The learner first reconstructs and validates the whole workflow **while disabled**
using the [authoring lesson](../.github/steps/02.md).
Never install fragments or a second writer. Review actual current-revision offline
results; those results do not replace any gate in the table.

Only after the instructor verifies the configuration and explicitly authorizes
the next intended main push may the approved private copy be enabled. Do not
enable queued/stale work or re-run a previously blocked delivery attempt. Source
maintenance on public `dev` remains inert; no authoring enablement is performed
by following or editing these documents.

## 7. Required acceptance and full cleanup

The approved cohort must observe the following **real** lifecycle, using the
[learner walkthrough](../.github/steps/04.md):

1. A reviewed **main push** creates the disposable AVM network through the same
   run's preflight, validation, saved plan/encryption and **automatic exact-plan apply**.
2. The driver's actual **Azure Resource Manager inventory/configuration checks**
   verify the intended VNet, named subnets, NSG links, address ranges and disabled
   default outbound access. Keep identifiers privately for the update comparison.
3. A benign **HCL tag change**, reviewed and pushed to main, repeats the gated
   deployment and updates those **same resource IDs**, not a replacement network.
4. A new manual **followup** on main produces a **fresh live plan with exit 0**.
   Exit 2 means changes, exit 1 means an error; neither completes convergence.
5. After separately authorizing owned-scope full cleanup, an authenticated current
   repository admin explicitly dispatches **Trusted AVM cleanup (explicit owner
   authorization required)** on main. Its only input is the required **string**
   `authorization`: `destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>`.
   There is **no operation input**. The helper verifies current admin permission,
   actor/sender/trigger IDs, current SHA/state and same-run validation/plan. The
   **Apply exact authorized AVM destroy plan** job consumes that fresh full destroy
   plan, with no independent cleanup reviewer required.
   Require absence of managed workload state and actual Azure **404s** for the
   intended resources. Preserve the existing group, backend, identities and runner.

No partial targets, local live initialization/apply/destroy, state deletion,
Lab 07 import/adoption or fabricated authorization is an alternative. Dedicated
cleanup uses the same state, concurrency, environments and identities as delivery.
Ordinary main never cleans up; destroy or replacement actions on regular pushes
fail. AgentAlvine only observes/guides: its educational issue status is not Azure
authorization. Failure/uncertainty leaves cleanup open with the owner.

Scheduled **drift** remains **report-only**: it neither repairs differences nor
counts as create/update/cleanup proof. Delivery's manual menu has **followup only**;
cleanup has its own explicit authorization workflow. Deployment comes from the
reviewed main push, without another deploy dispatch. Optional runtime API extensions are blocked until a separate real
preflight, authorization and cost review. Storage, runner hosting and any approved
optional services can cost money even without billable VNet resources; never
promise a zero-cost exercise.

**Completion language:** distinguish “four offline steps complete,” “workflow
authored and checked,” “instructor preflight pending/passed,” and each observed
live create/update/follow-up/destroy outcome. Historical records and this document
are not evidence that any live stage has run.
