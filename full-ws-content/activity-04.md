# Activity 04 — Prove the learner root without Azure

[Review index](README.md) · [Full setup](00-start-here.md) · [Previous activity](activity-03.md) · [Simulation record](simulation.md)

> Review copy; follow your private copy’s live Exercise issue to do the lab.

<!-- FULL-WS-LESSON:START -->
## Laboratory 02 - Step 4/4

### Prove the learner root with all four mocked cases

| Before you begin | This step |
| --- | --- |
| Goal | Run schema and contract validation against the authored root and inspect matching current-commit CI. |
| Time | 10–20 minutes, plus an initial provider download if needed. |
| Files | Read [tests/network.tftest.hcl](../tests/network.tftest.hcl); correct [main.tf](../main.tf) or [outputs.tf](../outputs.tf) only if a genuine failure identifies a mistake. |
| Starting branch | `lab/network`; no PR, merge, or extra commit is required when this revision already passes. |

Beginner guides: [Start here](../docs/start-here.md) · [Git workflow](../docs/git-workflow.md) · [Copilot guide](../docs/copilot-guide.md) · [Toolchain](../docs/toolchain.md) · [Troubleshooting](../docs/troubleshooting.md).

> [!NOTE]
> Run from **this repository's root**. A passing reference implementation does not prove the learner root is correct.
> The included tests and inputs make this an independent lab; no other clone, deployed VNet, or subscription is required.

### 1. Read the exact four test contracts

1. Confirm the private clone and `lab/network` in VS Code, then press **Ctrl+P** → [tests/network.tftest.hcl](../tests/network.tftest.hcl).
2. Find the top-level `mock_provider "azurerm"` block and its `override_during = plan` setting.
3. Read each run in the following table; do not delete a rejection case to make a summary look green.
4. Verify there is no test `module` block redirecting execution to a solution and no real provider configuration replacing the mock.

| Exact run name | What must happen |
| --- | --- |
| `valid_two_subnet_topology` | Return exactly `web` and `data` subnet keys and a non-null VNet ID. |
| `reject_invalid_cidr` | Reject `10.300.0.0/16` at `var.address_space`. |
| `reject_invalid_subnet` | Reject `not-a-cidr` in the subnet prefix list at `var.subnets`. |
| `reject_missing_tags` | Reject the map containing only `owner` at `var.tags`. |

A rejection run passes because its declared input validation rejects the bad value.
Authentication errors, invalid mock resource IDs, or arbitrary nonzero exits are not the intended rejection.
The input validations check their documented syntax and required tags, not all possible Azure network constraints.

### 2. Run the individual offline checks in order

1. Select **Terminal** → **New Terminal** and confirm this clone's root, not a child folder or reference copy.
2. Use Node **24.16.0**, Terraform **1.16.1**, and the unchanged AzureRM **5.4.0** lock.
3. Run each line separately and stop at the first unexpected error. These commands work in PowerShell and macOS/Linux shells:

```powershell
terraform fmt -check -recursive
terraform init -backend=false -lockfile=readonly -input=false
terraform validate
terraform test
```

4. The format check should report no formatting changes needed; initialization must disable backend access and retain the lock.
5. Validation should succeed before tests run. Confirm all four exact run names execute and the final count is **4 passed, 0 failed**.
6. `command = plan` inside these mocked test runs is not permission to run a real standalone infrastructure plan.

Expected test-summary shape after a successful run, **not a recorded result for your copy**:

```text
Success! 4 passed, 0 failed.
```

### 3. Run the same learner path used by CI

1. Stay in the repository root and run:

```powershell
node scripts/check-learner.mjs
```

2. The helper checks mocked test structure, formatting, backend-disabled/read-only-lock initialization, validation, and the actual JSON test summary.
3. It rejects missing, zero, skipped, failed, or errored tests rather than trusting an exit code alone.
4. Find the actual root summary when it succeeds:

```text
.: 4 provider-mocked tests passed; no Azure calls.
```

This line is an **expected output**, not evidence until you observe it. The helper can prepare local Terraform data and download the pinned provider.
No Azure account, OIDC token, backend configuration, subscription selection, or remote state is needed.

> [!WARNING]
> Never fix a test by removing its assertion, relaxing supplied validation, changing input types, upgrading a lock, or testing a different root.
> Do not run Azure login, real plan/apply/destroy, or state commands. Mock success is not policy, address-overlap, or connectivity validation.

### 4. Make and publish only necessary corrections

1. If a diagnostic points to the implementation, press **Ctrl+P** → [main.tf](../main.tf); if it points to output wiring, open [outputs.tf](../outputs.tf).
2. Edit only the identified mistake, preserve typed inputs and both resource/output contracts, and press **Ctrl+S**.
3. Rerun the failed check and then the full helper; do not stop after only one formerly failing case passes.
4. Press **Ctrl+Shift+G**, inspect every intended diff, select each file's **+** (**Stage Changes**), and review **Staged Changes**.
5. Enter `lab: fix the learner network contract` in **Message** and select **Commit**.
6. Select **...** → **Push**; use **Publish Branch** only if this branch has never been published. If nothing needed correction, do not create an empty commit.

### 5. Inspect the newest commit's actual GitHub job

1. Refresh **your private copy's Code** page, select `lab/network`, and open the newest commit to verify it contains your final changes.
2. Select **Actions** → **Lab checks** in the workflow sidebar; choose the run for that exact newest branch commit.
3. Select **Test learner module**, expand the learner-check command step, and read the actual four-test summary or first failing log line.
4. Confirm the workflow and the named job succeeded; a skipped template job or an older green revision does not count.
5. Refresh the Exercise **body** after **AgentAlvine** finishes. It can reconcile already-satisfied steps without another artificial push.

![GitHub reference showing the workflow-selection sidebar](../docs/images/github-workflow-sidebar.webp)
*REFERENCE — GitHub publisher screenshot, CC BY 4.0. It highlights example **CodeQL**; choose **Lab checks** in your copy; [attribution](../docs/images/NOTICE.md).*

### Expected result and what AgentAlvine checks

- The configured learner-check workflow must complete successfully for the latest observed revision, with **Test learner module** successful.
- Source-template jobs, zero tests, local-only output, and runs for earlier commits do not satisfy this gate.
- The Exercise reaches **4/4** after the root contract is complete. There is no additional review or merge gate in this lab.

### Troubleshooting

| Symptom | Specific recovery |
| --- | --- |
| Provider download or checksum fails | Use the approved proxy/network and supported architecture; preserve TLS and the supplied lock, and ask the instructor. |
| `Unknown test file` or zero tests | You are not using the complete root route above; remove an accidental filter and confirm the test file exists in this clone. |
| Expected CIDR rejection is not observed | Keep `expect_failures = [var.address_space]`; inspect the real input validation without weakening it. |
| Current CI is green but progress waits | Check the observed branch/SHA and guide run; use [progress troubleshooting](../docs/troubleshooting.md#a-pr-or-progress-gate-remains-pending), not manual checkboxes. |

**Next action:** open [Laboratory 03](https://github.com/alvinea28/ws2-subnet-security-laboratory-03) in a new private copy. Its security root and synthetic inputs are supplied; do not move this implementation into it.
<!-- FULL-WS-LESSON:END -->

## Recorded simulation outcome

**2026-09-08 — Cycle A: recorded verified; Cycle B: recorded verified.** Both private simulations reached 4/4 offline completion through the learner-root validation gate. Each recorded four mocked cases, including invalid VNet CIDR, invalid subnet prefix, and missing-tag rejection; no Azure calls or human approval are proved.

Those four cases and the Node suite are whole-lab totals, not extra tests to add for each activity or rerun. See the [simulation record and coverage limits](simulation.md).
