# Toolchain: install deliberately, verify the exact versions

This page describes participant setup; it does not require an Azure account or another lab repository. Use official downloads and your organization's approved installation process. If a managed computer requires administrator approval, ask IT or the instructor rather than bypassing that restriction. GitHub CLI, Azure CLI, Azure PowerShell, containers, and a global package installation are not prerequisites here. See [copilot-guide.md](copilot-guide.md) for Copilot account setup; use instructor-approved editor extensions, not unverified alternatives.

## Quick navigation

[Required tools](#know-which-tools-are-needed) · [OS and architecture](#choose-the-correct-operating-system-and-architecture) · [VS Code and Git](#prepare-desktop-vs-code-and-git) · [Node.js](#install-nodejs-24160) · [Terraform](#install-terraform-1161) · [terraform-docs](#add-terraform-docs-only-for-lab-4) · [Verify versions](#restart-and-verify-each-tool) · [Offline checks](#run-only-the-approved-offline-checks) · [Lab 4 generation](#generate-the-lab-4-documentation)

## Know which tools are needed

| Component | Workshop version | Purpose and scope |
| --- | --- | --- |
| Desktop Visual Studio Code | Instructor-supported current desktop release | Local editor, terminal, Source Control, and Copilot UI; not just `github.dev` |
| Git | A current instructor-supported Git release | Clone, local commits, pull, and push; no exact Git patch pin is prescribed |
| Node.js | **24.16.0** | Runs the supplied doctor and learner helper scripts |
| Terraform CLI | **1.16.1** | Terraform validation and provider-mocked tests; Lab 1's collaboration task does not execute Terraform |
| AzureRM provider | **5.4.0** | Loaded by Terraform from the supplied provider lock, not installed as a separate CLI |
| terraform-docs | **0.24.0 — Lab 4 only** | Generates the canonical module API documentation |

> [!WARNING]
> Do not sign in to Azure, initialize a real remote backend, run a real plan/apply/destroy operation, or read state to test an installation. Do not paste credentials into a terminal or chat. Never replace your whole PATH, change system-wide execution policies, disable certificate checks, or reset global settings to make a tool appear to work.

## Choose the correct operating system and architecture

1. On Windows, open **Settings** → **System** → **About**.
2. Read **System type** to identify an x64-based or ARM-based computer.
3. Use the corresponding Windows build in the table below.

On macOS, use **Apple menu** → **About This Mac**: **Chip** identifies Apple silicon; an Intel **Processor** identifies an Intel Mac. On Linux, run these read-only commands in a terminal:

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

`amd64` means the x86-64 architecture and also applies to compatible Intel processors. `darwin` means macOS, not Linux. If the exact release lacks your platform, or a required provider lacks that architecture, stop and ask for a supported workshop computer; do not silently substitute another version or architecture.

## Prepare desktop VS Code and Git

1. Open the [official VS Code downloads page](https://code.visualstudio.com/Download).
2. Select the desktop package for your operating system and architecture.
3. Complete the approved installer or application-copy process.
4. Open **Visual Studio Code** as a desktop application.
5. On Windows, open the [official Git for Windows download page](https://git-scm.com/downloads/win).
6. Download the appropriate official installer.
7. Start that installer through your organization's approved process.
8. Select **Git from the command line and also from 3rd-party software** on the PATH-selection page.
9. Keep the supplied Git Credential Manager option enabled where offered.
10. Complete the remaining approved defaults without adding unrelated optional tools.

Git must be discoverable by desktop VS Code, not only inside Git Bash. The supported HTTPS sign-in uses Git Credential Manager's trusted browser flow; it does not require a token pasted into a shell. Per-repository author name and email are configured separately in [start-here.md](start-here.md#set-authorship-only-for-this-repository).

**macOS:** follow the [Git project's macOS download guidance](https://git-scm.com/downloads/mac) using the approved installer or developer-tools route. **Linux:** follow the [Git project's Linux guidance](https://git-scm.com/downloads/linux) for your distribution's approved package. Do not copy a Windows executable onto either system or run an arbitrary website's installation script. Restart VS Code after installation before checking Git.

## Install Node.js 24.16.0

1. Open the [official Node.js 24.16.0 release downloads](https://nodejs.org/dist/v24.16.0/).
2. Choose the **Windows Installer (.msi)** matching your architecture and the exact `24.16.0` release.
3. Verify that the download is from Node.js and follows your organization's publisher-verification policy.
4. Run the approved installer with its normal Node.js and PATH features selected.
5. Leave the optional native-module build-tools installation unchecked; this lab does not require that additional tool bundle.
6. Finish the installer before restarting VS Code.

**macOS:** select the official macOS installer for this exact release; if using a binary archive, select `darwin-arm64` for Apple silicon or `darwin-x64` for Intel. **Linux:** select the official `linux-arm64` or `linux-x64` archive matching the architecture check above. Use the release's checksum/signature guidance and your approved extraction process. The executable directory for a Node binary archive is its `bin` directory, not the archive's parent folder.

For macOS/Linux archives, use your organization's narrow **per-user PATH** procedure for the selected binary directory; ask the instructor if you have never configured your shell. Do not replace shell profiles or system PATH entries. Avoid an unversioned “latest” installer or distribution package that silently supplies a different Node version.

## Install Terraform 1.16.1

1. Open the [official HashiCorp Terraform 1.16.1 release page](https://releases.hashicorp.com/terraform/1.16.1/).
2. Select the ZIP whose operating system and architecture match the table above.
3. Compare the archive's SHA-256 with the matching filename in HashiCorp's published checksums, following its signature-verification guidance.
4. On Windows, select **Extract All...** to extract the executable into a dedicated folder under your own user profile.
5. Search Windows Start for **Edit environment variables for your account**.
6. Select **Path** under **User variables**, not **System variables**.
7. Select **Edit...**.
8. Select **New**.
9. Enter only the folder containing the extracted Terraform executable, not the ZIP path or executable filename.
10. Select **OK** to save each open settings dialog.

To calculate the downloaded ZIP's hash on Windows, replace `REPLACE-WITH-DOWNLOADED-ZIP-PATH` with that archive's actual local path before running this read-only command. Keep the quotation marks. Compare the result with the **same archive filename**, not another architecture's checksum.

```powershell
Get-FileHash "REPLACE-WITH-DOWNLOADED-ZIP-PATH" -Algorithm SHA256
```

**macOS/Linux:** download the pinned `darwin_*` or `linux_*` ZIP matching your architecture. Extract the Terraform binary into a dedicated user-owned tools folder using the official installation guidance. Add only that folder through your approved per-user PATH procedure. Ask the instructor to help with shell configuration or execution permissions if needed; do not use a blanket permission change, disable operating-system protections, or replace a system-installed Terraform.

## Add terraform-docs only for Lab 4

1. Open the [official terraform-docs v0.24.0 release](https://github.com/terraform-docs/terraform-docs/releases/tag/v0.24.0).
2. Choose the Windows, macOS (`darwin`), or Linux archive matching your architecture; its x64 builds may be labelled `amd64`.
3. Verify the download against the publisher's release information and checksums.
4. Extract the executable into its own user-owned tools folder.
5. Add only its executable folder using the same narrow per-user PATH procedure.

## Restart and verify each tool

1. Save any open work in VS Code.
2. Close **all** VS Code windows after installation or a PATH change.
3. Reopen desktop VS Code in this lab's cloned repository folder.
4. Select **Terminal** → **New Terminal**.
5. Run each applicable version command separately; the terraform-docs line is **Lab 4 only**.

```powershell
git --version
node --version
terraform version
# Lab 4 only:
terraform-docs version
```

These commands are identical in macOS and Linux shells. Expect a Git version, **v24.16.0**, **Terraform v1.16.1**, and, in Lab 4, **terraform-docs version v0.24.0**. Check the editor version through **Help** → **About** on Windows/Linux, or **Code** → **About Visual Studio Code** on macOS. A new terminal inside an old editor process may still have an old PATH.

| Action | Expected result | Recovery |
| --- | --- | --- |
| Run an executable's version command | The required version is printed without an installation prompt | Stop on a missing command or wrong version; do not proceed on an assumption |
| Locate a Windows command with `Get-Command node` or `Get-Command terraform` | Its **Source** is the intended installed executable | Ask IT about a conflicting older executable; do not delete unknown installations |
| Locate a macOS/Linux command with `command -v node` or `command -v terraform` | The intended binary directory is selected | Correct only the approved user-level entry, then restart the editor |
| Inspect HCL indentation in the editor | The supplied two-space style is retained | Use [Workspace settings guidance](copilot-guide.md#use-workspace-settings-deliberately), not a global reset |

## Run only the approved offline checks

Run the read-only setup doctor from the clone's root first:

```powershell
node scripts/doctor.mjs
```

It checks the root, local tools, and Git identity. It does **not** prove browser sign-in, Git write access, a Copilot seat, or Azure readiness. If it is missing, report an incomplete package rather than generating a substitute or skipping the setup check silently.

When the current Exercise asks for learner validation, use:

```powershell
node scripts/check-learner.mjs
```

The learner helper is **not read-only in the same sense as the doctor**: it can download dependencies and prepare disposable local test directories. For applicable Terraform roots, its initialization disables the backend and uses `-lockfile=readonly` so the supplied **AzureRM 5.4.0** lock is not upgraded or rewritten. First use can download that provider from its configured registry; “offline” means no Azure or remote-state operations, not necessarily no internet traffic. Check initialization output for the pinned provider version; there is no separate AzureRM CLI version command.

**Lab 7:** use this helper's isolated offline preparation and included verified module snapshot. Do not initialize the canonical remote-backend environment, fetch state, or modify the backend to imitate the helper. **Lab 5:** the helper rehearses consumption within this same copy. **Lab 1:** it reports that actual issue and PR events determine collaboration progress. A real test suite must report executed passing cases; zero or skipped tests are not evidence of success.

Do not regenerate the lockfile, upgrade the provider, remove failing assertions, add cloud credentials, or disable TLS checks to resolve a download or validation failure. Use [troubleshooting.md](troubleshooting.md#tools-formatting-or-offline-checks-fail) and the current task's feedback instead.

## Generate the Lab 4 documentation

In **Lab 4 only**, after completing the relevant task edits, run the supplied generator from this clone's root. It **writes the canonical generated documentation**, so inspect the result in Source Control. Run it again to check that the second generation introduces no further diff, then run its read-only freshness check and the learner checks:

```powershell
node scripts/generate-docs.mjs
node scripts/generate-docs.mjs
node scripts/generate-docs.mjs --check
node scripts/check-learner.mjs
```

Run one line at a time and stop on an error. Do not replace the generator with a raw terraform-docs `--output-file` invocation: wrapper comments can differ from the canonical output. Do not invent a documentation table or copy one from another repository. The generated API must describe **this lab's actual module**.
