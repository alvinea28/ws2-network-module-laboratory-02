# Activity 04 — Prove the learner root without Azure

[Review index](README.md) · [Full setup](00-start-here.md) · [Previous activity](activity-03.md) · [Simulation record](simulation.md)

> Review copy; follow your private copy’s live Exercise issue to do the lab.

<!-- FULL-WS-LESSON:START -->
## Laboratory 02 - Step 4/4

### Prove the learner root with all four mocked cases

> **Required next activity: [Create GitHub Actions, then deploy Azure](../docs/workflow-authoring.md).**
> Finish this offline gate, then author/check Actions offline. The live Azure phase
> is only for the approved ready private copy; **4/4 awards no live completion**.

| Goal / workspace | This step |
| --- | --- |
| Goal | Validate your authored root and inspect matching current-commit CI. |
| Branch | `lab/network`; no PR/merge or empty commit required. |
| Files | Read [tests/network.tftest.hcl](../tests/network.tftest.hcl); correct [main.tf](../main.tf) / [outputs.tf](../outputs.tf) only for genuine failures. |

[Independent setup](activity-01.md) · [Toolchain](../docs/toolchain.md) · [Git workflow](../docs/git-workflow.md) · [Troubleshooting](../docs/troubleshooting.md).

Use this clone's **learner root**, not a solution. Keep Node **24.16.0**, Terraform **1.16.1**, AzureRM **5.4.0**; no deployed VNet, subscription or earlier lab needed.

### 1. Inspect all four contracts

Read `mock_provider "azurerm"` and `override_during = plan`. Preserve every run; no solution redirection via test `module` or replacement with a live provider.

| Exact run name | What must happen |
| --- | --- |
| `valid_two_subnet_topology` | Return exactly `web` and `data` subnet keys and a non-null VNet ID. |
| `reject_invalid_cidr` | Reject `10.300.0.0/16` at `var.address_space`. |
| `reject_invalid_subnet` | Reject `not-a-cidr` in the subnet prefix list at `var.subnets`. |
| `reject_missing_tags` | Reject the map containing only `owner` at `var.tags`. |

A rejection passes only when the declared input validation rejects its bad value—not on authentication errors or arbitrary nonzero exits.

### 2. Run the offline checks in order

At the clone root, run separately; stop on unexpected errors. Commands work in PowerShell and macOS/Linux shells:

```powershell
terraform fmt -check -recursive
terraform init -backend=false -lockfile=readonly -input=false
terraform validate
terraform test
```

| Command / flag | Why |
| --- | --- |
| `fmt -check -recursive` | Checks formatting without rewriting; includes child folders. |
| `init -backend=false` | Installs dependencies without initializing a backend. |
| `-lockfile=readonly` | Keeps the supplied provider selections/checksums unchanged. |
| `-input=false` | Disables interactive prompts; missing inputs fail. |
| `validate` | Checks configuration and installed provider schema. |
| `test` | Executes the supplied provider-mocked runs against this root. |

**Expected output**, not a result already obtained:

```text
Success! 4 passed, 0 failed.
```

Confirm all four named runs actually execute. Their mocked `command = plan` does not authorize a standalone real plan.

### 3. Run CI's learner helper

Stay at the clone root:

```powershell
node scripts/check-learner.mjs
```

**Why:** repeats the checks above, inspecting mock structure and JSON results. Rejects missing, zero, skipped, failed or errored cases, not just bad exit codes.

**Expected output**, not evidence until observed:

```text
.: 4 provider-mocked tests passed; no Azure calls.
```

May download dependencies/prepare local Terraform data; no Azure credentials, OIDC, subscription selection or remote state.

### 4. Publish corrections and inspect current CI

Fix only diagnosed implementation/output mistakes; rerun the full helper and publish reviewed changes using the Git guide. Message: `lab: fix the learner network contract`. No empty commit.

Inspect **Actions → Lab checks → latest branch commit → Test learner module** and its actual four-test summary. Both workflow and job must succeed for that revision. Refresh the same Exercise after AgentAlvine finishes.

![GitHub reference showing the workflow-selection sidebar](../docs/images/github-workflow-sidebar.webp)
*REFERENCE — GitHub, CC BY 4.0; choose **Lab checks**, not example CodeQL. [Attribution](../docs/images/NOTICE.md).*

**Expected:** **4/4** core progress from current learner-root CI, not old green runs, skipped source-template jobs, zero tests or local-only output. No PR/review/merge required.

**If not:** for `Unknown test file`/zero tests, remove accidental filters. Retain `expect_failures = [var.address_space]`. Ask about approved network/architecture for download failures; never weaken TLS, locks, inputs or assertions. Check pending progress against the observed SHA/guide feedback.

For these four offline steps: no Azure login, real plan/apply/destroy or state commands. Mocks do not prove policy, overlap or connectivity.

**Terraform AVM hands-on:** use the [separate AVM profile](../avm/README.md), AzureRM **4.81.0**, not core **5.4.0**. Core mocks and historical **4/4** results do **not** complete/validate that profile. Keep configuration/state separate.

### Required activity — Create GitHub Actions, then deploy Azure

The core above stays at **four steps**. Its **4/4** is not an AVM deployment, human approval or cleanup result, and AgentAlvine does not certify this additional lifecycle.

1. **Phase A — Actions authoring (offline):** follow the [complete workflow-authoring activity](../docs/workflow-authoring.md). Open the non-runnable solution, use **File → New Text File → untitled YAML**, and construct header, preflight, validation, plan, apply, followup and drift in order. Explain the jobs/variables and retain pinned syntax. Atomically replace **one** complete canonical workflow while `WORKSHOP_AZURE_ENABLED=false`; no partial draft or duplicate writer. Run the documented workflow, Node, kit and mocked Terraform checks. All copies can author offline; this does not deploy or award live completion.
2. **Owner readiness:** read [Lab 02 delivery configuration](../docs/delivery-configuration.md). Only the exact approved private non-template profile is eligible. Require approved scope/budget/lifetime and explicit bootstrap authorization, protected main/strict checks, main-only **avm-plan / avm-apply** with **no Required reviewers** and no admin bypass, distinct OIDC, private locked separate state, encrypted plans and the restricted ephemeral runner. If main does not exist, stop at the offline handoff; only the owner establishes protected main **while disabled, after baseline/readiness review**. No PR into nonexistent main or creation while unready.
3. **Phase B — Azure lifecycle:** only when ready and enabled, the author merges a real checks-passing PR to protected main. Observe **preflight → validation → saved plan/encryption → automatic same-run exact-plan apply**; no manual deployment reviewer, approvals API or second deploy button. Complete **create → verify actual Azure configuration → benign HCL tag update through another PR/main push with the same IDs → fresh followup with exit 0**. Delivery's manual menu is **followup only**. Do not invent an empty commit or fake change just to trigger Actions.
4. **Separately authorized cleanup:** after explicit owned-scope authorization, the authenticated current repository admin dispatches [avm-cleanup.yml](../.github/workflows/avm-cleanup.yml) on main with required string `authorization` = `destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>`. There is no operation input or independent cleanup reviewer. Apply the fresh exact saved destroy plan; verify managed-state emptiness and actual Azure absence. Ordinary main never cleans up; regular push delete/replacement actions fail. Retain shared RG/backend/identities/runner.

Scheduled drift is report-only. AVM root/resources/state remain separate from the original root and Lab 07; no import/adoption. Public templates and unapproved copies cannot deploy; never repin IDs/pins or toggle flags to bypass that guard. Source maintenance stays on **dev**, not participant live main. AgentAlvine only observes/guides, never authorizes Azure; no manual checkboxes or evidence PRs. Until real prerequisites and outcomes exist, report **core complete; live continuation pending**.

No live stage is claimed by this lesson or its offline history. Optional runtime API extensions require separate real preflight; costs are not assumed zero. For approved live cohorts, complete the protected lifecycle before moving on; otherwise retain the explicit pending status.

**Next independent lab:** [Laboratory 03](https://github.com/alvinea28/ws2-subnet-security-laboratory-03) in a new private copy with its supplied security root; do not transfer this implementation or any state.
<!-- FULL-WS-LESSON:END -->

## Recorded simulation outcome

**2026-09-08 — Cycle A: recorded verified; Cycle B: recorded verified.** Both private simulations reached 4/4 offline completion through the learner-root validation gate. Each recorded four mocked cases, including invalid VNet CIDR, invalid subnet prefix, and missing-tag rejection; no Azure calls or human approval are proved.

Those four cases and the Node suite are whole-lab totals, not extra tests to add for each activity or rerun. See the [simulation record and coverage limits](simulation.md).
