# Toolchain: install deliberately, verify the exact versions

**Goal:** install this lab's tools from official sources, then verify each version. Use your organization's approved process; ask IT if installation is restricted. No earlier lab, GitHub CLI, Azure PowerShell, containers or global package bundle is required. [Copilot access](copilot-guide.md) and [Azure account/RG setup](azure-setup.md) are separate checks.

**Windows x64, preparing for the whole workshop?** Use the [one-command setup](https://github.com/alvinea28/ws2-workshop-catalogue/blob/dev/docs/windows-setup.md#2-paste-this-one-command)
before cloning. It installs all pinned local tools, Azure/GitHub CLIs and six
VS Code extensions once. After **READY** and reopening VS Code, skip the manual
installation sections below and verify your tools. Other platforms retain this
manual route; account/seat checks and locked per-repository downloads still apply.

## Quick navigation

[Required tools](#know-which-tools-are-needed) · [OS and architecture](#choose-the-correct-operating-system-and-architecture) · [VS Code and Git](#prepare-desktop-vs-code-and-git) · [Node.js](#install-nodejs-24160) · [Terraform](#install-terraform-1161) · [terraform-docs](#add-terraform-docs-only-for-lab-4) · [Verify versions](#restart-and-verify-each-tool) · [Offline checks](#run-only-the-approved-offline-checks) · [Lab 4 generation](#generate-the-lab-4-documentation)

## Know which tools are needed

| Component | Workshop version | Purpose and scope |
| --- | --- | --- |
| Desktop VS Code | Instructor-supported current release | Editor, terminal and Copilot; not just `github.dev` |
| Git | Instructor-supported current release | Clone, commit and push; no workshop patch pin |
| Node.js | **24.16.0** | All labs' helper scripts |
| Terraform CLI | **1.16.1** | Labs **02–08** validation/mocks; not Lab 01 |
| AzureRM provider | **5.4.0** | Supplied provider lock; no separate CLI installation |
| terraform-docs | **0.24.0 — Lab 04 only** | Generate the module's API documentation |
| Azure CLI | Current approved release; no workshop patch pin | [Account/RG reads](azure-setup.md), not the local doctor or mocks; no forced upgrade gate |

> [!WARNING]
> Installation is not deployment approval. Do not test tools with a real backend, state, plan/apply/destroy or Azure credentials. PR checks stay credential-free, without OIDC or CLI caches. Never replace the whole PATH, change system-wide execution policy, disable TLS checks or bypass organization restrictions.

## Choose the correct operating system and architecture

1. Windows: read **Settings → System → About → System type**. macOS: read **Apple menu → About This Mac** (**Chip** = Apple silicon; **Processor** = Intel).
2. Linux: run the two read-only commands below. **Expected:** an OS and CPU matching a download row; stop if unsupported.

**What it does:** `uname -s` prints the operating-system kernel name; `uname -m` prints the machine architecture, normally `x86_64` or `aarch64` on supported Linux computers.

```bash
uname -s
uname -m
```

| Computer | Node download marker | Terraform download marker |
| --- | --- | --- |
| Windows x64 | Windows `x64` | `windows_amd64` |
| Windows ARM64 | Windows `arm64` | `windows_arm64`, if offered for the pinned release |
| Apple silicon Mac | `darwin-arm64` | `darwin_arm64` |
| Intel Mac | `darwin-x64` | `darwin_amd64` |
| Linux `x86_64` | `linux-x64` | `linux_amd64` |
| Linux `aarch64` or `arm64` | `linux-arm64` | `linux_arm64` |

`amd64` means x86-64, including compatible Intel CPUs; `darwin` means macOS. If a pinned tool/provider lacks your platform, ask for a supported computer rather than substitute versions.

## Prepare desktop VS Code and Git

1. Install the matching [desktop VS Code package](https://code.visualstudio.com/Download); open the application to confirm installation.
2. Install Git using the official [Windows](https://git-scm.com/downloads/win), [macOS](https://git-scm.com/downloads/mac) or [Linux](https://git-scm.com/downloads/linux) route. Windows: select **Git from the command line and also from 3rd-party software**, retaining Git Credential Manager where offered. **Why:** VS Code must find Git outside Git Bash.
3. Use GCM's trusted browser sign-in, never a pasted shell token. Configure [repository-local authorship](start-here.md#set-authorship-only-for-this-repository) separately; no unofficial installers or unrelated optional tools.

## Install Node.js 24.16.0

1. Download **24.16.0** from [Node.js](https://nodejs.org/dist/v24.16.0/), matching the architecture above; verify the publisher/checksum/signature through the approved process.
2. Windows: run the matching **.msi** with Node/PATH features; leave optional native build tools unchecked. macOS: use the exact release's installer or matching archive; Linux: use its matching archive.
3. For archives, add only the extracted **bin** directory through the approved **per-user PATH** procedure. **Expected:** the pinned Node, not an unversioned “latest” package; ask before altering unfamiliar shell configuration.

## Install Terraform 1.16.1

1. Download the matching ZIP from [Terraform 1.16.1](https://releases.hashicorp.com/terraform/1.16.1/). Verify its SHA-256 against the **same filename** in HashiCorp's signed checksums.
2. Extract to a user-owned tools folder. Windows: **Edit environment variables for your account → User variables → Path → Edit → New**, add only the executable's **folder**, then save with **OK**. macOS/Linux: use the approved per-user PATH procedure; do not overwrite system installations or weaken execution permissions.

**What it does:** after replacing the placeholder with your downloaded ZIP's actual path, this read-only command prints its hash; `-Algorithm SHA256` selects the checksum type. Keep quotes and stop if the publisher's matching checksum differs.

```powershell
Get-FileHash "REPLACE-WITH-DOWNLOADED-ZIP-PATH" -Algorithm SHA256
```

## Add terraform-docs only for Lab 4

1. Download the matching archive from [terraform-docs v0.24.0](https://github.com/terraform-docs/terraform-docs/releases/tag/v0.24.0) and verify the publisher's checksum.
2. Extract into its own user-owned folder and add that executable folder to user PATH. **Expected:** the Lab 04 generator can find version 0.24.0; other labs do not need it.

## Restart and verify each tool

1. Save, close **all** VS Code windows, reopen this clone and select **Terminal → New Terminal**. **Why:** an old editor process can retain the old PATH.
2. Run applicable commands **one at a time; stop on an error or wrong version**. They also work in macOS/Linux shells.

```powershell
git --version
node --version
# Labs 02–08 only:
terraform version
# Lab 4 only:
terraform-docs version
```

| Command | What it does / flags | Expected |
| --- | --- | --- |
| `git --version` | `--version` reads installed Git version | Supported Git release |
| `node --version` | Reads installed Node version | `v24.16.0` |
| `terraform version` | Reads Terraform CLI version | `Terraform v1.16.1` |
| `terraform-docs version` | Reads documentation tool version | `v0.24.0` in Lab 04 |
| `Get-Command node` | Windows: locates Node without running it | **Source** is intended executable |
| `Get-Command terraform` | Windows: locates Terraform | Intended executable |
| `command -v node` | macOS/Linux: `-v` reports command location | Intended Node binary |
| `command -v terraform` | macOS/Linux: reports command location | Intended Terraform binary |

Check VS Code through **Help → About** (macOS: **Code → About Visual Studio Code**). For conflicts, correct only the approved user PATH entry; do not delete unknown installations.

## Run only the approved offline checks

**What it does:** this read-only doctor checks the clone root, tools and local Git authorship. Expect setup results; stop on reported problems or a missing script, and report an incomplete package rather than generating a substitute.

```powershell
node scripts/doctor.mjs
```

It does not prove browser sign-in, Git write access, a Copilot seat or Azure readiness.

**What it does:** when the Exercise requests validation, the learner helper checks this task using supplied offline preparation/mocks. It can download dependencies and write **disposable local test directories**, unlike the doctor; expect actual executed cases and stop on failures.

```powershell
node scripts/check-learner.mjs
```

The helper disables backend initialization and uses `-lockfile=readonly` to prevent lock changes. Confirm **AzureRM 5.4.0** in initialization output; it has no separate CLI version command. “Offline” excludes Azure/state access, not registry downloads. Never upgrade/unlock the provider, remove assertions, add credentials or disable TLS to hide failure. **Zero or skipped tests are not a pass.**

Lab **01** uses real issue/PR events, not Terraform tests. Lab **05** rehearses consumption in the same copy. Lab **07** uses an isolated root and verified snapshot: never initialize its canonical backend or modify it to imitate the helper.

## Generate the Lab 4 documentation

1. In **Lab 04 only**, finish the task edits and run the following lines from the clone root, stopping on each error.
2. Review generated changes in **Source Control**. **Expected:** the second generation changes nothing, freshness passes, and learner cases execute.

```powershell
node scripts/generate-docs.mjs
node scripts/generate-docs.mjs
node scripts/generate-docs.mjs --check
node scripts/check-learner.mjs
```

| Command | What it does / flags | Expected |
| --- | --- | --- |
| `node scripts/generate-docs.mjs` (first) | Writes canonical API docs from **this module** using pinned terraform-docs | Actual generated changes |
| `node scripts/generate-docs.mjs` (second) | Repeats generation to check stability | No additional diff |
| `node scripts/generate-docs.mjs --check` | `--check` checks freshness without writing | Success; stale output fails |
| `node scripts/check-learner.mjs` | Runs the task's offline validation | Executed passing/rejection cases |

Never copy or invent tables. Do not substitute raw terraform-docs `--output-file`: that flag writes a destination, but its wrappers may differ from the canonical generator.

| Problem | Recovery |
| --- | --- |
| Missing/wrong executable | Check its location above; ask IT, then restart the editor |
| Formatting mismatch | Preserve two-space HCL and inspect [Workspace settings](copilot-guide.md#use-workspace-settings-deliberately) |
| Lock, download or test failure | Keep pins/controls; use [troubleshooting.md](troubleshooting.md#tools-formatting-or-offline-checks-fail) |
