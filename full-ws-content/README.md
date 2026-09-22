# Laboratory 02 — Full workshop review

> Review copy; follow your private copy’s live Exercise issue to do the lab.

**Required activity: [Create GitHub Actions, then deploy Azure](../docs/workflow-authoring.md).**
Author/check Actions offline first. The Azure lifecycle is only for the approved
ready private copy; the historical four-step results below do not complete it.

[Full first-time setup](00-start-here.md) · [Enter your Azure values and sign in](azure-setup.md) · [Original simulation summary and verification limits](simulation.md) · [Repository landing page](../README.md)

Four complete [course lessons](../.github/agentalvine/course.json), with only relative links outside code fences rebased. The table records **2026-09-08 private simulations**, not your progress or a deployment.

| Activity | Full lesson | Cycle A | Cycle B |
| --- | --- | --- | --- |
| 01 | [Choose the reusable boundary](activity-01.md) | Recorded verified | Recorded verified |
| 02 | [Create the VNet and named subnets](activity-02.md) | Recorded verified | Recorded verified |
| 03 | [Return resource-backed outputs](activity-03.md) | Recorded verified | Recorded verified |
| 04 | [Prove the learner root without Azure](activity-04.md) | Recorded verified | Recorded verified |

Both cycles reached **4/4 core offline completion**. Whole-lab counts are not per-activity tests or deployment proof. [Private original proof](https://github.com/alvine-aurelio-org/ws2-public-rebuild-20260908-evidence/blob/dev/full-ws-content/lab-02/README.md) requires organization access.

**Terraform AVM hands-on:** [separate AVM profile](../avm/README.md), AzureRM **4.81.0**. The custom core stays on **5.4.0**; its mocks and historical **4/4** do **not** complete/validate AVM. Keep configuration/state separate.

## Required activity — Create GitHub Actions, then deploy Azure

After the same four offline lessons, this is the **required live continuation for
instructor-approved cohorts**, not historical proof or a fifth core step. The
recorded September 8 outcomes above remain unchanged.

1. **Phase A — Actions authoring (offline):** open [the complete workflow-authoring activity](../docs/workflow-authoring.md). Read the non-runnable solution, use **File → New Text File → untitled YAML**, then build header/preflight/validation/plan/apply/followup/drift in order. Atomically replace one canonical file while `WORKSHOP_AZURE_ENABLED=false`; no partial drafts or duplicate writer. Run the workflow, Node, kit and mocked Terraform checks. All copies can author offline; no Azure work or live completion is awarded.
2. **Owner readiness:** read [delivery configuration](../docs/delivery-configuration.md). Only the exact approved private non-template profile can deploy, with authorized scope/budget/lifetime/bootstrap, protected main and strict checks, main-only environments with no Required reviewers/admin bypass, separate OIDC and locked state, encrypted plans and the restricted runner. If main is absent, stop at the offline handoff. Only the owner establishes protected main **while disabled, after baseline/readiness review**; no PR to nonexistent main or unready creation.
3. **Phase B — Azure lifecycle:** only when ready, the author merges a real checks-passing PR. Observe validation → encrypted saved plan → automatic same-run exact-plan apply, with **no manual deployment reviewer**, approvals API or second deploy button. Complete **create → actual Azure configuration verification → benign HCL tag update via another PR/main push with the same IDs → fresh followup with exit 0 → separately authorized full cleanup and verified absence**. Do not invent an empty commit or fake change to trigger deployment.

Delivery's manual menu is **followup only**. Cleanup requires the current
authenticated repository admin's separate owned-scope authorization and
[avm-cleanup.yml](../.github/workflows/avm-cleanup.yml), with required string
`authorization` = `destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>`;
no operation input or independent cleanup reviewer. Ordinary main never cleans up.
Scheduled drift is report-only. AVM root/state/resources remain separate from the
original root and Lab 07; no import/adoption. Retain shared RG/backend/identities/runner.

Until real preflight is ready, report **core complete; live continuation pending**.
Public templates and unapproved copies cannot deploy; never repin IDs/pins or
toggle flags to bypass that guard. Source maintenance stays on **dev**, not live
main. AgentAlvine only observes/guides, never authorizes Azure. No local live backend
initialization or offline **4/4** proves readiness. Optional runtime APIs require
separate preflight/cost review; costs are not assumed zero. No live execution is claimed.

## The Exercise issue is the learner guide

1. Copy once from the [landing page](../README.md), then clone/open using [setup](00-start-here.md). Use **your copy's README Exercise link**, not the source Preview.
2. Follow the current issue body and [Git guide](../docs/git-workflow.md). Publish the learner design/resources/outputs; incomplete intermediate CI can fail legitimately. Lab 02's **four-step offline core** requires no additional PR/review/merge; its approved live continuation has the protected-main, scoped authorization and exact-plan controls described above.
3. Inspect **Lab checks → current commit → Test learner module**: all four root mock cases must execute successfully, including rejections. AgentAlvine uses GitHub Actions to update the **same Exercise body** automatically.

Core/PR checks need no Azure credentials, OIDC or state. Manual boxes, success comments and screenshots award nothing; progress never authorizes Azure. The [catalogue](https://github.com/alvinea28/ws2-workshop-catalogue) is navigation only.

## Public source preview — read only, not your learner issue

[Source Exercise #1](https://github.com/alvinea28/ws2-network-module-laboratory-02/issues/1) was observed on **2026-09-14** as a successful read-only Preview at **step 0, 0/4**. It is neither an A/B learner issue nor your copy's issue.

![Actual public Exercise preview for Laboratory 02 — new 2026-09-14 capture, not a completed simulation](images/exercise-preview.png)

*Actual 2026-09-14 public Preview capture, not September 8 participant proof. [Provenance](images/provenance.json) records its timestamp and PNG hash.*

Separate [2026-09-14 local verification](simulation.md#fresh-2026-09-14-verified-results) is command-output evidence, not participant progress.

## If your private copy's Exercise is missing

Refresh your copy's README/Issues; inspect **Actions → AgentAlvine** and [recovery](../docs/troubleshooting.md#agentalvine-or-the-exercise-is-missing).

**Recovery only:** choose **Actions → AgentAlvine → Run workflow → Check progress** on your copy's actual default branch, normally `dev`, to reconcile its guide. Never select Preview in a learner copy, fake an Exercise, widen permissions, bypass protection or dispatch delivery to repair guide progress. The separate live continuation is not an Exercise-recovery action.
