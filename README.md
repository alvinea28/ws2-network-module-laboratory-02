# Laboratory 02 · Reusable network module

**Public source template (not the clone URL after copying):** [alvinea28/ws2-network-module-laboratory-02](https://github.com/alvinea28/ws2-network-module-laboratory-02) · **Recommended order:** 02 of 08 · **Time:** 60–90 minutes

> [!NOTE]
> **This laboratory is independent.** No earlier repository required. This copy includes the typed inputs, provider lock, mocks and a network-only starter.
> New to the tools? The complete [illustrated first-time setup](docs/start-here.md) is included here—no other lab is required.

## Start here — copy, clone, open and sign in

**Before cloning:** if Git or desktop VS Code is not installed, complete [the official installation steps](docs/toolchain.md), restart VS Code, then continue below. If you have no GitHub account yet, choose **Sign up** on GitHub and verify your email as shown in [Start here](docs/start-here.md).

**Azure account/RG setup:** [Enter your Azure values and sign in](docs/azure-setup.md) using your own assigned tenant, subscription and existing resource group. This separate read-only setup does not authorize deployment or change the lab's credential-free checks.

1. **Browser:** sign in to your intended personal GitHub account. If the instructor assigned an organization, accept its invitation using that personal account.
2. **GitHub:** create your own **Private** copy below, retaining **-laboratory-02** at the end of its name. If you already made a copy, do not copy again.
3. **Desktop VS Code:** press **Ctrl+Shift+P** (macOS **Cmd+Shift+P**) → **Git: Clone** → paste **your own copy's HTTPS URL**, not this public source URL. Complete the trusted browser sign-in with the correct account.
4. **Open the clone:** choose a local parent folder, then **Open** the newly cloned repository. Trust only the known workshop copy. Explorer must show this repository, not a parent with multiple labs or a browser-only virtual workspace.
5. **Accounts:** verify GitHub and **GitHub Copilot** sign-in/seat. Git commit name/email is not sign-in. Use [account and context screenshots](docs/copilot-guide.md) if anything is unclear.
6. **Terminal → New Terminal:** follow [tool installation and version checks](docs/toolchain.md), configure local Git authorship, then run **node scripts/doctor.mjs**. It checks local readiness, not browser/Copilot authorization.
7. **Exercise:** refresh your copy after 20–60 seconds and open its Exercise issue. Follow the current detailed task and [save → stage → commit → push guide](docs/git-workflow.md).

![Microsoft reference: cloning from GitHub in VS Code](docs/images/vscode-clone-github.png)

*REFERENCE — Microsoft documentation example, not your account/repository. [Image attribution](docs/images/NOTICE.md). Detailed clone steps are in [Start here](docs/start-here.md#clone-your-copy-into-desktop-vs-code).*

<!-- AGENTALVINE:START -->
## Copy this exercise once

[![Copy exercise](.github/images/copy-exercise.svg)](https://github.com/new?template_owner=alvinea28&template_name=ws2-network-module-laboratory-02&owner=%40me&name=my-ws2-network-module-laboratory-02&visibility=private)

Select the intended Owner, keep **Private**, leave **Include all branches** off, and create the copy. Its own AgentAlvine issue will appear automatically.
<!-- AGENTALVINE:END -->

## Full workshop content and instructor preview

Read the [full setup, all four activities, and recorded simulation outcomes](full-ws-content/README.md). The [public source Exercise #1](https://github.com/alvinea28/ws2-network-module-laboratory-02/issues/1) is a **read-only instructor Preview with zero participant progress**, not your learner issue. After copying, follow **your private copy's own README Exercise link**; AgentAlvine updates that same issue body from real work.

## What is included and what remains external

- This copy has its own instructions, exercises, reference code and tests. The catalogue sequence builds concepts; there is no required earlier repository.
- Git, VS Code, Node24.16.0 and Terraform1.16.1 are required. AzureRM5.4.0 is pinned; tests use mocks, not an Azure account.
- Tool/setup instructions and a read-only doctor are provided locally.
- No Azure credentials, state or deployment are needed for the offline laboratory.

## Help without guessing

[First-time setup](docs/start-here.md) · [Azure values and sign-in](docs/azure-setup.md) · [Git actions](docs/git-workflow.md) · [Copilot accounts/context](docs/copilot-guide.md) · [Toolchain](docs/toolchain.md) · [Settings/Actions troubleshooting](docs/troubleshooting.md) · [Glossary](docs/glossary.md)

Do not edit progress checkboxes or send manual evidence commands. AgentAlvine updates the same issue from real activity; a green checklist is not Azure authorization.

[All eight numbered laboratories](https://github.com/alvinea28/ws2-workshop-catalogue) · [MIT code license](LICENSE) · [Screenshot licenses](docs/images/NOTICE.md)
