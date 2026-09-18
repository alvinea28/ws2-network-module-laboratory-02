# Laboratory 02 · Reusable network module

**Public source template (not the clone URL after copying):** [alvinea28/ws2-network-module-laboratory-02](https://github.com/alvinea28/ws2-network-module-laboratory-02) · **Order:** 02 of 08 · **Time:** 60–90 minutes

> [!NOTE]
> **This lab is independent:** build a VNet and stable-key subnets, expose resource-backed IDs, and inspect four mocked tests. Typed inputs, locks and starter files are supplied; no earlier lab or Azure account required.

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
- [Terraform AVM hands-on](avm/README.md) uses a **separate AzureRM 4.81.0 profile**. Core mocks and historical **4/4** results do not complete/validate it; keep its configuration/state separate.

Optional [Azure values/sign-in setup](docs/azure-setup.md) uses your own assigned tenant, subscription and existing group. It does not authorize deployment or change credential-free core checks.

## Help without guessing

[First-time setup](docs/start-here.md) · [Azure values and sign-in](docs/azure-setup.md) · [Git actions](docs/git-workflow.md) · [Copilot accounts/context](docs/copilot-guide.md) · [Toolchain](docs/toolchain.md) · [Settings/Actions troubleshooting](docs/troubleshooting.md) · [Glossary](docs/glossary.md)

Exercise progress is educational feedback, not Azure authorization.

[All eight numbered laboratories](https://github.com/alvinea28/ws2-workshop-catalogue) · [MIT code license](LICENSE) · [Screenshot licenses](docs/images/NOTICE.md)
