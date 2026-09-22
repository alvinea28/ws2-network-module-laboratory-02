# Laboratory 02 · Reusable network module

**Public source template (not the clone URL after copying):** [alvinea28/ws2-network-module-laboratory-02](https://github.com/alvinea28/ws2-network-module-laboratory-02) · **Order:** 02 of 08 · **Time:** 60–90 minutes for the offline core; approved live continuation scheduled separately

> [!NOTE]
> **This lab is independent:** build a VNet and stable-key subnets, expose resource-backed IDs, and inspect four mocked tests. Typed inputs, locks and starter files are supplied; no earlier lab or Azure account is required for the four-step core. Instructor-approved live cohorts must then complete the separate AVM delivery continuation below.
>
> **Required activity: [Create GitHub Actions, then deploy Azure](docs/workflow-authoring.md).** First author/check Actions offline in every copy; then complete the Azure lifecycle only in the approved, ready private copy. This is not a fifth Exercise gate.

## Start here — copy, clone, open and sign in

**Windows x64:** [prepare all tools and VS Code extensions in one go](https://github.com/alvinea28/ws2-workshop-catalogue/blob/dev/docs/windows-setup.md#2-paste-this-one-command)
before cloning. Run once for all eight labs; after READY/restart, skip manual installs below.

1. **Install/account:** follow [Toolchain](docs/toolchain.md) for Git, desktop VS Code, Node **24.16.0** and Terraform **1.16.1**. [Create/verify your personal GitHub account](docs/start-here.md), sign in and accept any organization invitation.
2. **Copy once:** use the button below for a **Private** copy ending in **-laboratory-02**; reuse any existing copy.
3. **Clone/open:** copy **your copy's Code → HTTPS** URL. Use **Ctrl+Shift+P → Git: Clone** (macOS **Cmd+Shift+P**), choose a parent folder, then **Open**. Complete trusted sign-in; trust/open this clone's root only, not a parent/ZIP/browser workspace.
4. **Verify:** check VS Code GitHub/Copilot account and seat; configure [local authorship](docs/start-here.md#set-authorship-only-for-this-repository). Follow [Step 1](.github/steps/01.md) for explained readiness commands before editing.
5. **Exercise:** open your copy's automatically created Exercise. Use its current body and the [Git guide](docs/git-workflow.md); publish real changes and return to the same issue. No manual checkboxes or evidence commands.

![Microsoft reference: cloning from GitHub in VS Code](docs/images/vscode-clone-github.png)

*REFERENCE — Microsoft, CC BY 3.0 US; example repositories, not yours. [Attribution](docs/images/NOTICE.md) · [Clone help](docs/start-here.md#clone-your-copy-into-desktop-vs-code).*

<!-- AGENTALVINE:START -->
## Copy this exercise once

[![Copy exercise](.github/images/copy-exercise.svg)](https://github.com/new?template_owner=alvinea28&template_name=ws2-network-module-laboratory-02&owner=%40me&name=my-ws2-network-module-laboratory-02&visibility=private)

Select the intended Owner, keep **Private**, leave **Include all branches** off, and create the copy. Its own AgentAlvine issue will appear automatically.
<!-- AGENTALVINE:END -->

## Full workshop content and instructor preview

Read [all four lessons, setup and historical outcomes](full-ws-content/README.md). [Source Exercise #1](https://github.com/alvinea28/ws2-network-module-laboratory-02/issues/1) is a **read-only Preview with zero participant progress**. Follow your copy's own README Exercise link; AgentAlvine updates that body from real activity.

## What is included and what remains external

- Core AzureRM **5.4.0** stays pinned. Preserve typed inputs, stable `web`/`data` keys and resource-backed outputs. The final **Test learner module** gate requires all four cases at the current revision, including rejection cases.
- No core PR/merge, Azure credentials, backend/state access or deployment required. Mock success does not prove connectivity or policy compliance.
- [Terraform AVM hands-on](avm/README.md) uses a **separate AzureRM 4.81.0 profile** and fixed AVM root. Core mocks and historical **4/4** results do not complete/validate it; keep its configuration/state separate from the original root and Lab 07.

## Required activity — Create GitHub Actions, then deploy Azure

This is the **required live continuation for instructor-approved cohorts**, not
extra offline credit. Keep the two phases distinct:

1. **Phase A — Actions authoring (offline):** open the [complete walkthrough](docs/workflow-authoring.md), read the non-runnable solution, build header/preflight/validation/plan/apply/followup/drift in **File → New Text File → untitled YAML**, then atomically replace **one** canonical workflow while `WORKSHOP_AZURE_ENABLED=false`. Run its workflow, Node, kit and provider-mocked checks. An ordinary copy can complete this phase, not deploy.
2. **Owner readiness:** read [delivery configuration](docs/delivery-configuration.md). Confirm explicit scope, budget, maximum lifetime and bootstrap authorization, protected main, required checks, main-only environments without reviewers/admin bypass, scoped OIDC, locked separate state, encrypted saved plans and the restricted runner. If main does not exist, stop at the offline handoff; only the owner establishes it **while disabled, after baseline/readiness review**.
3. **Phase B — Azure lifecycle:** only when the exact approved private copy is ready and enabled, the author merges a real checks-passing PR to protected main. Observe validation → encrypted saved plan → automatic same-run exact-plan apply; no approvals API, human-review wait or second deploy button. Never invent an empty commit or fake change to trigger it.

**Source PRs:** [inspect and merge your own PR after required checks](docs/pr-author-merge.md).
This Lab 02 policy requires zero approving PR reviews, not self-approval, and
**no manual deployment reviewer**. AgentAlvine only observes/guides; it does not
authorize or execute Azure work, and its issue body never grants permission.

Public templates and unapproved copies **cannot deploy**: exact immutable repository
ID/name, private and non-template guards remain. Do not repin IDs/pins or toggle
flags to make another copy eligible. Public source maintenance stays on **dev**;
participant live **main** is a different, protected path. This guide supplies no
current setup inventory or live success claim.

Required live outcomes: **create → verify actual Azure configuration → benign HCL
tag update through another PR/main push with the same resource IDs → fresh followup
with exit 0 → separately authorized full cleanup and verified absence**. Delivery's
manual menu is **followup only**; scheduled drift is report-only. The current
authenticated repository admin separately authorizes cleanup through
[avm-cleanup.yml](.github/workflows/avm-cleanup.yml), using required string
`authorization` = `destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>`.
There is no operation input or independent cleanup reviewer. Ordinary main pushes
never clean up; preserve the shared RG/backend/identities/runner.

Until real preflight is available, report **core complete; live continuation pending**.
No live execution is claimed here, **offline 4/4 is not deployment proof**, and
scope/budget/lifetime are not supplied or assumed zero-cost by this template.

[Azure values/sign-in setup](docs/azure-setup.md) remains optional for the offline core and uses your own assigned tenant, subscription and existing group. Local sign-in is not Actions/OIDC setup or authorization. For Lab 02 live configuration and cleanup, use the two Lab 02 guides above, not the shared setup page's Lab 07 writer. No local live backend initialization, state access or cloud operations during authoring.

## Help without guessing

[First-time setup](docs/start-here.md) · [Workflow authoring](docs/workflow-authoring.md) · [Delivery prerequisites](docs/delivery-configuration.md) · [Azure values and sign-in](docs/azure-setup.md) · [Git actions](docs/git-workflow.md) · [Copilot accounts/context](docs/copilot-guide.md) · [Toolchain](docs/toolchain.md) · [Settings/Actions troubleshooting](docs/troubleshooting.md) · [Glossary](docs/glossary.md)

Exercise progress is educational feedback, not Azure authorization.

[All eight numbered laboratories](https://github.com/alvinea28/ws2-workshop-catalogue) · [MIT code license](LICENSE) · [Screenshot licenses](docs/images/NOTICE.md)
