# Author the Lab 02 AVM delivery workflow

**Required activity: Create GitHub Actions, then deploy Azure.** Begin with
**Phase A — Actions authoring (offline)** in every copy; **Phase B — Azure
lifecycle (approved private copy only)** is a separate, conditional continuation.

**Goal:** construct and explain one GitHub Actions workflow that deploys the
isolated AVM network after an approved push to protected `main`. This is the
**required live continuation for instructor-approved cohorts**, after the four
offline Exercise steps. It is not a fifth AgentAlvine gate: **4/4 remains offline
learner-root completion, not deployment, Azure authorization or cleanup proof**.

[Start here](start-here.md) · [AVM profile](../avm/README.md) ·
[Instructor configuration prerequisite](delivery-configuration.md) ·
[Core Step 4](../.github/steps/04.md)

> [!WARNING]
> These are participant instructions, not a record of live execution. Keep
> `WORKSHOP_AZURE_ENABLED=false` while authoring. No Azure login, identity creation,
> subscription changes, backend/state access or real plan/apply/destroy belongs
> in authoring or PR validation. The instructor must complete the separate live
> prerequisite before anyone enables delivery. Missing sandbox, budget, lifetime,
> bootstrap authorization or an eligible private GitHub host means **stop offline**,
> not simulated readiness. No manual deployment reviewer is required.

The public template and unapproved copies can author and check the workflow
offline, but **cannot deploy**. The fixed profile checks the immutable repository
ID and exact name, private visibility and non-template status. Do not repin IDs,
names, workflow hashes or ruleset revisions, or toggle flags, to make another copy
eligible. This source guide makes no claim about any copy's current setup status.

| Phase | Required work | Honest outcome |
| --- | --- | --- |
| A — Actions authoring | Build the untitled YAML through sections 2–6, install one complete canonical file while disabled, then run section 7 checks | Workflow authored and checked offline; no Azure resources or live completion awarded |
| Owner readiness | Read the configuration prerequisite, agree scope/budget/lifetime and obtain explicit bootstrap authorization before setup | Pending until the owner verifies the actual prerequisites; no assumed zero cost |
| B — Azure lifecycle | Only in the eligible ready private copy: real PR merge, create/verify, in-place update, fresh followup, separately authorized cleanup | Record each actual live outcome separately; offline 4/4 never certifies it |

If the supplied reference, canonical workflow or delivery helpers are missing,
request the complete synchronized package from the instructor. Do not invent a
replacement or enable an incomplete copy to discover what is missing.

## 1. Know what you are building

The original learner root remains on AzureRM **5.4.0**. This workflow always uses
the **avm** root; there is no root selector. It does not deploy the custom learner
root or Lab 07, import an existing network, or adopt another lab's state.

| Event in the approved private copy | Operation | Intended outcome |
| --- | --- | --- |
| Reviewed push/merge to protected `main` | `deploy` | Validate, save/encrypt the plan, then automatically apply the exact plan in the same run |
| **Run workflow**, branch `main`, operation `followup` | `followup` | Fresh live plan; require Terraform detailed exit code **0** for convergence; never apply |
| Separately authorized admin dispatch of [avm-cleanup.yml](../.github/workflows/avm-cleanup.yml), branch `main` | `destroy` | Required authorization string; fresh full destroy plan and exact-plan application; verify absence |
| Scheduled run on the approved `main` revision | `drift` | Report-only live drift check; never repair or apply automatically |
| PR, feature branch, public template, disabled copy or re-run attempt | No live delivery | Keep cloud access blocked; ordinary credential-free learner checks remain separate |

There is **no manual `deploy` choice** and no second deploy button after a main
push. There is no waiting human-review job or approvals API call. Only attempt
**1** of a live run is eligible; ordinary main never performs cleanup.

The job dependency chain is **preflight → validation → plan → apply**. The last
job in delivery is eligible only for `deploy`. Cleanup has its own installed
workflow and [non-runnable reference](../solutions/avm-cleanup.yml), sharing the
same state/concurrency/environments/identities. A destroy run must not also deploy;
`followup` and `drift` must never reach apply. Regular pushes reject destroy and replacements.

## 2. Open the reference; leave the installed workflow alone

1. Work in your own private clone after the [beginner setup](start-here.md).
   Keep delivery disabled and use a learner branch according to the
   [Git guide](git-workflow.md). Do not change public-template `dev` or invent
   `main` during the four-step core.
2. Open the complete [solutions/avm-delivery.yml](../solutions/avm-delivery.yml)
   **as reading material**. Its location outside the workflow directory makes
   it a **non-runnable reference**, not a second delivery entry.
3. Open **File → New Text File** in VS Code. Leave this buffer **untitled** and
   choose **YAML** as its language mode. Build the complete document here before
   changing the installed [canonical workflow](../.github/workflows/avm-delivery.yml).
4. Copy the sections below in their original order and indentation. Explain each
   before continuing. Do not save a draft, backup, alternate filename or partial
   workflow in the workflows directory. Do not rename/move the reference into
   that directory or install a second writer.

The target is exactly **one** installed
[.github/workflows/avm-delivery.yml](../.github/workflows/avm-delivery.yml).
Authoring it is an exercise in understanding the reviewed controls, not replacing
them with a shorter unrestricted workflow. Copy action commit pins and driver
invocations exactly; do not substitute floating action versions or raw cloud
commands. Copilot can explain a section, but cannot supply approval or change
the trust boundary.

## 3. Copy the header and explain the event boundary

Copy the reference's name, event definitions and dispatch input into the untitled
buffer. Retain the exact workflow name:
**Trusted AVM delivery (instructor enablement required)**.

Before continuing, explain these distinctions:

- `push` on `main` is the deployment event; feature-branch and PR validation are
  not alternative privileged entry points.
- The delivery workflow's manual operation choice is **followup only**. Neither a
  manual `deploy` option nor a second push-triggered delivery file is needed.
- Dedicated cleanup accepts a required string `authorization`, **no operation input**;
   it is not another deployment entry point.
- The schedule checks drift without fixing it. GitHub schedules use the default
   branch. If the copy uses `dev`, only when ready may the owner deliberately select
   approved protected `main` as default, never source-template `dev`. No automatic
   default change is part of authoring.
- An event match alone is insufficient. Preflight also checks the private,
  non-template, enabled copy, current protected main revision and first attempt.

**Expected:** the buffer declares the intended events, but no new workflow has
been installed or run. If you cannot explain why a PR cannot request Azure access,
stop and read the reference/configuration before adding jobs.

## 4. Copy permissions, concurrency and the credential-free jobs

Copy the remaining top-level controls, then the complete `preflight` and
`validation` jobs. Preserve their dependencies, conditions, checkout revision,
pinned actions and command lines.

| Section | What you must be able to explain |
| --- | --- |
| Permissions | Keep the reference's least-privilege permissions. Do not grant global OIDC, secrets or write access to make validation pass. |
| Concurrency | Repository serialization binds the approved state writer. It complements Azure Blob leases; it is not permission to share the state with another repository. |
| `preflight` | Admission checks are real repository/run checks, not a learner checkbox. A template, public copy, disabled route, wrong/stale ref or later attempt cannot become a live writer. |
| `validation` | Checks the same source revision before privileged planning, including the workflow contract and AVM companion. Backend initialization is disabled and **AzureRM, AzAPI, ModTM and Random are all mocked** for Terraform tests. |

Credential-free validation may download pinned public providers/modules. It must
not receive Azure credentials, OIDC, CLI caches or live state. A green historical
run or a successful reference solution is not a substitute for validation of
this run's exact source revision. The original learner-root helper still checks
the original four contracts; do not redirect it into AVM.

Here, credential-free means **no Azure credentials/OIDC/state**. Scoped GitHub
metadata access used by admission checks is not cloud authorization; preserve
the reference's restricted GitHub permissions rather than adding a personal token.

Read the [complete variable inventory](delivery-configuration.md#4-set-repository-variables-without-publishing-their-values)
before copying the privileged jobs. Explain these expressions without entering
real account values into YAML:

| Expression / value | Purpose |
| --- | --- |
| `github.sha` | The immutable event commit checked out by every relevant job, not a moving branch name |
| `vars.WORKSHOP_AZURE_ENABLED` | Owner-managed admission flag, kept false throughout authoring; not permission to bypass the exact profile |
| `needs.preflight.outputs.operation` | Operation selected by the fixed-profile helper, not arbitrary participant input |
| `vars.AZURE_PLAN_CLIENT_ID` / `vars.AZURE_APPLY_CLIENT_ID` | Distinct short-lived OIDC identities; no personal CLI cache |
| `vars.WORKLOAD_INPUTS_JSON` / state variables | The five-field workload input and separately owned backend; never hard-code values or put tags here |
| `needs.plan.outputs.*` | This run's encrypted artifact name, plan/manifest digests and detailed exit code |
| `secrets.PLAN_DECRYPTION_PRIVATE_KEY` | Apply-environment secret used only at the decrypt step after authorization checks |

## 5. Copy the plan job and explain the saved-plan boundary

Copy the **complete** `plan` job. It depends on successful admission and
validation, uses environment **avm-plan**, and reaches Azure only on the
instructor-controlled ephemeral **Linux x64 ws2-trusted** runner. The runner group
must restrict access to this exact workflow; a label alone is not isolation.

The [delivery driver](../scripts/avm-delivery.mjs), not a learner shell command,
selects the fixed AVM root, approved variables and separate plan identity. The
[backend configuration](../avm/backend.tf) uses OIDC and Microsoft Entra data-plane
authentication only. Never initialize that live backend locally, add an access
key/SAS/client secret, or fall back to a cached personal login.

Understand the plan before copying the next job:

- The proposed resources belong only to the assigned disposable AVM workload:
  a `ws2-avm-` VNet, at least two stable named subnets with default outbound access
  disabled, and their NSG. The existing group/backend/identities are not workload
  resources to create or destroy.
- The driver binds saved bytes to the **exact run, first attempt, source revision,
  fixed root, state target, inputs, module source fingerprints and provider lock**.
  A changed module download cannot be excused by an unchanged provider lock.
- A saved plan has a **two-hour maximum age**. The protected apply stage must
   consume that plan, not re-plan at apply time or accept another run's artifact.
- Only the encrypted plan envelope is uploaded, with **one-day artifact retention**.
  Never upload plaintext plan binaries, plan JSON, state or decrypted review files.
- For `followup`, a fresh plan must return detailed exit code **0**. Exit **2**
  means changes remain, not successful convergence; exit **1** is an error. Drift
  is report-only even when it finds differences.

An authorized owner may use approved recovery/inspection escrow privately; it is
not a required deployment reviewer. Do not give the plan job the decryption private key or
publish sensitive plan contents in an issue, log, screenshot or PR.

## 6. Copy the apply job and explain scoped automatic authorization

Copy the complete `apply` job next, preserving its operation condition, job
dependencies, artifact selection, verification, environment and runner controls.
It uses **avm-apply**, the distinct apply identity, and the environment-scoped
`PLAN_DECRYPTION_PRIVATE_KEY`.

Both live environments require main-only deployment rules, **no Required reviewers**
and **no administrator bypass**. The author may merge their own passing PR; zero
required PR approvals is not fabricated self-approval. Scope/budget/bootstrap
authorization still belongs to the owner, not to Copilot or the Exercise issue.

The historical [avm-approval.cjs](../scripts/avm-approval.cjs) delegates to
[deployment-authorization.cjs](../scripts/deployment-authorization.cjs). It freshly
checks exact private identity, live rules, current main, run/SHA/attempt, merged PR,
both environments and successful same-run validation/plan. It uses no approvals API.
The driver checks saved-plan bindings before applying. Changing controls, state or inputs after planning, re-running a failed job,
using expired bytes or planning again inside apply is not recovery. The real live
verification must check Azure Resource Manager configuration; after destroy it
must confirm the intended resources return **404** and no managed workload remains
in the state. Mock tests do not perform either check.

Finish by copying the complete `followup` and `drift` jobs. Followup requires a fresh
exit-zero plan and checks actual topology. Drift reports either detected changes
or a failed/incomplete assessment; neither result permits apply. Preserve the
read-only PR metadata permission in `apply`: the scoped authorization guard needs
it to verify the actual merged-PR association, not to require a second reviewer.

## 7. Replace one complete file while disabled; validate offline

1. Compare the **whole untitled buffer** with the reference. Check the exact name,
   triggers, operation choices, permissions, concurrency, all six jobs, environments,
   action pins and driver calls. Preserve the supplied module/control/provenance
   files; the exercise does not authorize editing them.
2. With delivery **still disabled**, replace the entire contents of the
   [canonical workflow](../.github/workflows/avm-delivery.yml) in **one complete
   editor edit/save**. This is the atomic installation step: no section-by-section
   installed draft and no differently named runnable copy. Close the untitled
   buffer without saving another workflow.
3. From the clone root, run each approved offline check separately and stop on
   failure. These are instructions for learner validation, not results already
   obtained by reading this page:

```powershell
npm run workflow:check
npm test
npm run kit:check
npm run companion:check
node scripts/check-learner.mjs
```

| Command | Meaning / expected result |
| --- | --- |
| `npm run workflow:check` | Invokes [scripts/check-avm-workflow.mjs](../scripts/check-avm-workflow.mjs); expects **1 canonical delivery workflow; 1 separately authorized cleanup workflow; 4 reviewed companions**. Both non-runnable references must match their reviewed pins. A missing script or rejected contract blocks progress; do not invent a substitute. |
| `npm test` | Runs the repository's Node tests, including delivery-control rejection coverage; retain the actual summary, not a guessed count. |
| `npm run kit:check` | Checks the supplied workshop kit; it does not grant delivery permission. |
| `npm run companion:check` | Checks the isolated AVM schema and **three** plan-only mocked contracts, with no failed, errored or skipped cases. Uses backend-disabled initialization and the read-only provider lock. |
| `node scripts/check-learner.mjs` | Checks the **original learner root** on AzureRM **5.4.0** and its **four** mocked cases; preserves the original Exercise completion path. |

The [core Step 4](../.github/steps/04.md#2-run-the-offline-checks-in-order) explains
the actual Terraform commands: `terraform fmt -check -recursive`,
`terraform init -backend=false -lockfile=readonly -input=false`, `terraform validate`
and `terraform test`. Expected core output is **Success! 4 passed, 0 failed.**
The companion helper uses the isolated AVM root and expects **avm: schema valid;
3 mocked authoring contracts passed, 0 failed/skipped; native mocked plan admission
verified. Not live Azure acceptance.** These are different roots and counts, not live
Terraform plans. Use the helpers' actual summaries; zero/skipped tests are not a pass.
Run installed **actionlint 1.7.12** at the clone root for YAML/Actions syntax;
success prints no diagnostics. Do not update a pin to hide a lint or reference failure.

Review the diff and current-revision credential-free CI using the Git guide. A
workflow-check pass proves only that the authored file meets the offline contract.
It does not prove the instructor has configured identities, protection, networking,
Azure access or owner authorization. Do not enable delivery to diagnose a failed check.

## 8. Complete the required live lifecycle — only after instructor preflight

The instructor first completes every [configuration prerequisite](delivery-configuration.md),
confirms approved scope/budget/lifetime, explicit bootstrap authorization and the cleanup owner, and authorizes this
specific private copy. Until then, report **core complete; live continuation
pending**, not “Lab 02 deployed.” Public `dev` remains inert.

If protected main does not exist, retain the offline branch and stop at the offline
handoff. Only after baseline/readiness review may the owner establish protected
main while disabled. Do not open a PR into a nonexistent branch or create it while
unready. Source-template maintenance belongs on `dev`, not participant live `main`.
Do not invent an empty commit or fake change merely to trigger deployment.

1. **First create:** only when ready and enabled, the author merges a real,
   checks-passing PR with the intended learner/workflow changes through the
   [protected-main process](pr-author-merge.md). This main push starts
   `deploy`; do not dispatch another deployment. Observe **preflight → validation →
   plan/encryption → automatic apply** in that same run. The job is **Apply exact
   AVM saved plan**; there is no manual deployment reviewer or approval button.
2. **Verify the real network:** inspect the driver's actual Azure inventory/configuration
   verification in the approved live context. Check the assigned group, region,
   VNet/subnet prefixes, stable subnet names, NSG associations and disabled default
   outbound access. Keep the original resource IDs privately for comparison.
   Terraform outputs alone, screenshots or synthetic provider IDs are insufficient.
3. **Update without replacement:** make one instructor-approved benign HCL tag
   change in the `tags` map of the `locals` block in
   [avm/main.tf](../avm/main.tf). Keep required workshop/environment tags, names,
   address ranges, subnet keys, module-source pins, controls and provenance fixed.
   Do not put tags into `WORKLOAD_INPUTS_JSON` or edit a lock to bless different
   code. Review/publish the change; the next protected-main push starts the same
   gated flow. Require an in-place update and verify the **same resource IDs**
   afterward. Unexpected replacement/deletion stops the run before mutation.
   Only unique literal tag strings are mutable: interpolation/functions and changes
   outside that tag block are rejected by the reviewed root contract. This is what
   prevents an unknown create-time subnet or NSG ID from being redirected elsewhere.
4. **Fresh follow-up:** open **Actions → Trusted AVM delivery (instructor enablement
   required) → Run workflow**, choose `main` and **followup**. This new run performs
   a fresh live plan. Require exit **0**, not a cached pre-apply plan or ignored
   exit **2**. It must not apply changes.
5. **Separately authorized full cleanup:** the authenticated current repository
   admin first explicitly authorizes the whole owned workload, same root/state
   and exclusive operation. Then open **Actions → Trusted AVM cleanup (explicit
   owner authorization required) → Run workflow → main**. Enter the required
   string `authorization` exactly as
   `destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>`, using the full
   40-character current SHA and actual owned-state value, not placeholders. There
   is **no operation input**. The helper checks current admin permission,
   actor/sender/trigger IDs, current SHA/state, and the same run's validated exact
   destroy plan. No independent cleanup reviewer is required: one explicitly
   authorized owner dispatches. **Trusted AVM plan** and **Apply exact authorized
   AVM destroy plan** must succeed using those exact encrypted saved bytes.
   Require actual managed-state and Azure absence checks,
   including the intended resource **404s**. Preserve the existing RG, backend,
   identities and runner infrastructure. Failed or uncertain cleanup stays open
   with the instructor; never delete state or switch to local destroy.

Scheduled drift is an additional report, not any of these create/update/follow-up/
destroy outcomes. AgentAlvine's original **4/4** display does not certify the live
lifecycle; use actual protected-run results and approved private verification.
AgentAlvine only observes/guides; it neither authorizes nor executes Azure work.
No manual checkboxes, evidence PRs or success comments award live completion.
Never paste secrets, state, private keys or optional API callback URLs into the
Exercise. No live outcome is claimed by this documentation.

## Recovery without weakening the boundary

| Observation | Safe next action |
| --- | --- |
| Delivery is skipped in a disabled/template/public copy | Expected safety boundary; complete offline work and ask the instructor about the approved private route. |
| Workflow/reference comparison fails | Return to the untitled whole-file review, correct the canonical file while disabled, then repeat offline checks. Do not remove checks. |
| Main-only environment controls or exact-workflow runner restrictions are unavailable | Stop; the instructor must provide an eligible host. No ungated or local deployment fallback. |
| OIDC, backend DNS, state lease or permission failure | Stop and ask the instructor to verify the intended identities/scopes/connectivity. Do not grant roles, force-unlock, expose the backend or use access keys. |
| Current main changed, bindings differ, scoped authorization fails, or plan expired | Do not apply/re-run old bytes. The instructor reviews the failure and authorizes a fresh first-attempt operation at the current approved revision. |
| Follow-up reports changes or drift is found | Investigate; use a reviewed source correction and the normal main-push flow when approved. No auto-repair or acceptance of exit 2 as convergence. |
| Destroy or absence verification fails | Keep cleanup pending, preserve private diagnostics and ownership, and escalate; a green core issue or empty state alone is insufficient. |

Optional runtime API extensions remain blocked until their own real preflight.
This continuation adds no unrelated services. Backend storage, runner hosting and
any approved optional services can incur costs; **do not assume zero cost**.
