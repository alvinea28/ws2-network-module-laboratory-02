# Troubleshooting: recover without weakening the workshop

**Goal:** fix the first observed problem in **your existing private copy** without losing work or weakening controls. Check the account, repository, branch and commit before changing anything.

## Quick navigation

[Before a fix](#before-trying-a-fix) · [Folder](#the-wrong-folder-or-remote-is-open) · [Accounts](#sign-in-and-permissions-do-not-match) · [Navigation](#settings-issues-or-actions-is-missing) · [Exercise](#agentalvine-or-the-exercise-is-missing) · [Tools](#tools-formatting-or-offline-checks-fail) · [Push](#pull-or-push-is-rejected) · [PR](#a-pr-or-progress-gate-remains-pending) · [Help](#ask-for-help-with-safe-evidence)

## Before trying a fix

1. Read the first meaningful error and save intended, non-sensitive edits. **Why:** a final red status alone rarely identifies the cause.
2. Check the browser owner/name and personal account, then VS Code's clone and branch. **Expected:** your selected lab copy; use the matching section below and stop if uncertain.

> [!WARNING]
> Never share credentials, recovery/device codes, state or sensitive plans. Use only trusted sign-in UI you initiated. No force-push, blind discard/stash, global reset, protection bypass or Azure diagnostic shortcut. **Never rerun a live delivery job to repair setup or progress.**

## The wrong folder or remote is open

Open **Terminal → New Terminal** in desktop VS Code. Run each read-only line separately; **stop on errors or mismatches**.

```powershell
git rev-parse --show-toplevel
git remote -v
git status --short --branch
```

| Command | What it does / flags | Expected |
| --- | --- | --- |
| `git rev-parse --show-toplevel` | `--show-toplevel` reads Git's root | Same clone as Explorer |
| `git remote -v` | `-v` lists fetch/push URLs | Both `origin` targets are your private copy |
| `git status --short --branch` | Compact changes (`--short`) plus branch/tracking (`--branch`) | Intended branch and understood edits |
| `Get-Location` | Windows PowerShell: reads current folder | Clone root |
| `pwd` | macOS/Linux: reads current folder | Clone root |

1. If wrong, use **File → Open Folder...** (macOS: **Open...**) for the clone itself, then open a new terminal. A parent folder, ZIP or `github.dev` virtual workspace is not this desktop clone.
2. Preserve edits in a wrong folder/ZIP and ask how to transfer only intended changes. Follow [the clone procedure](start-here.md#clone-your-copy-into-desktop-vs-code); do not initialize a replacement history, delete folders or retarget unfamiliar remotes.

## Sign-in and permissions do not match

| Symptom | Smallest recovery / expected result |
| --- | --- |
| Browser account/invitation mismatch | Use the invited personal account; an organization is an owner, not a login |
| Private clone/push denied | Check URL, invitation and required SSO; use GCM's trusted browser flow for the intended account |
| VS Code/Copilot selects another account | Correct only the affected extension in **Accounts → Manage Extension Account Preferences...**; see [Copilot sign-in](copilot-guide.md#sign-in-and-select-the-copilot-account) |
| Copilot seat missing | Ask the instructor/license administrator; do not buy access or bypass policy |
| Git author missing | Set [repository-local author/noreply metadata](start-here.md#set-authorship-only-for-this-repository), not credentials |
| Chat/extension absent | Check the approved desktop version and extensions; no unofficial replacements or blanket tool approvals |

A public clone proves read access only; even a private read may lack push permission. `403` or **Repository not found** can mean account, invitation or URL problems—not deletion. Never put tokens in URLs/terminal prompts or clear every saved credential as a repair.

## Settings, Issues, or Actions is missing

1. Open **your copy's repository navigation**, not account settings or the public source. Expand **...** if narrow; ask the copy administrator if **Settings** remains unavailable.
2. If authorized and **Issues** is disabled, use **Settings → General → Features → Issues**. **Expected:** the existing Exercise becomes accessible, not a new manual exercise.
3. Inspect **Settings → Actions → General** against the instructor's approved SHA-pinned dependencies. Keep **Workflow permissions → Read repository contents and packages permissions**; ask the instructor about blocked dependencies rather than altering organization policy.

**What it does:** this browser address pattern opens **your copy's** settings after you replace both placeholders; it is not a terminal command. Expect repository settings or an access denial; stop if it identifies the public source.

```text
https://github.com/YOUR-OWNER/YOUR-COPY/settings
```

![GitHub reference showing repository Settings](images/github-settings.webp)

*REFERENCE — GitHub publisher example, not participant evidence. CC BY 4.0; [sources and attribution](images/NOTICE.md). Navigate in your own copy.*

The trusted AgentAlvine workflow declares narrow writes; repository defaults need no blanket write access. Do not allow all actions, enable PR write tokens/secrets or Actions-created/approved PRs, weaken fork approval/protection, or make the copy public. PR validation remains Azure/OIDC/state-free.

## AgentAlvine or the Exercise is missing

1. Confirm one private **template copy** with the correct final lab number. Allow **20–60 seconds**, then refresh the landing page/**Issues**; queues may take longer.
2. Open **Actions → AgentAlvine → latest relevant run**. **Expected:** queued/running/completed status or a specific block to report. When finished, refresh the existing Exercise **body**, not just comments.
3. If blocked/disabled, ask the instructor to inspect that workflow. Do not replace it, run delivery, rerun all jobs, invent an Exercise, post check commands/run IDs or manually tick progress.

![GitHub reference showing Actions](images/github-actions.webp)
![GitHub reference showing the workflow sidebar](images/github-workflow-sidebar.webp)

*REFERENCE — GitHub publisher examples, not participant evidence. CC BY 4.0; [sources and attribution](images/NOTICE.md). The sidebar example shows CodeQL; choose **AgentAlvine** for guidance or **Lab checks** for validation.*

A public preview is not your private Exercise. Intentionally incomplete learner files may fail **Lab checks** while AgentAlvine is working correctly.

## Tools, formatting, or offline checks fail

| Symptom | Recovery / expected result |
| --- | --- |
| Missing/wrong version | Follow [toolchain checks](toolchain.md#restart-and-verify-each-tool): Node **24.16.0**, Terraform **1.16.1**, applicable tools; never silently use “latest” |
| PATH still old | Save, close all VS Code windows and reopen the clone; do not replace system PATH |
| Doctor missing/failing | Run the [read-only doctor](toolchain.md#run-only-the-approved-offline-checks) at root; report missing package content, not a generated substitute |
| HCL formatting | **Ctrl+,** (macOS **Cmd+,**) → **Workspace**; preserve two spaces and inspect overrides, not global resets |
| AzureRM download/lock mismatch | Preserve **5.4.0** and supplied checksums; ask about approved proxy/platform support, never disable TLS or regenerate locks |
| Mock failure/zero tests | Fix the specified behavior; passing and rejection cases must actually execute—zero/skipped tests are not a pass |
| Lab 04 docs stale | Run the [canonical generator and freshness check](toolchain.md#generate-the-lab-4-documentation); never copy/invent tables |
| Lab 07 wants Azure/state | Stop: use only the helper's isolated offline root, never canonical backend initialization |

The [learner helper](toolchain.md#run-only-the-approved-offline-checks) may download providers and prepare disposable directories; “offline” excludes Azure/state access, not internet traffic. The doctor does not verify human sign-in, push rights or a Copilot seat.

## Pull or push is rejected

1. Read the rejection; verify the intended `origin`/branch and inspect **Source Control** for edits/conflicts. **Publish Branch** is for the first push of an unpublished task branch.
2. If the remote advanced, use **... → Pull** only on the clean, correctly tracked branch; inspect the result before **Push**. AgentAlvine updates are ordinary commits to receive.
3. Stop on conflicts or denied permissions. Preserve edits and ask for a deliberate resolution; no blanket **Accept All**, discard, stash, reset, rebase or force-push. Use the intended PR route instead of removing a rule.

## A PR or progress gate remains pending

| Check | Expected / recovery |
| --- | --- |
| Repositories/base | Same private copy on both sides; actual default normally `dev`, never the public source |
| Latest head | Current **Lab checks** and PR checks, not an old green run; temporary merge SHA may differ |
| Requested draft | Keep the task's draft/ready state, not whichever badge looks greener |
| Labs 01/05 educational PR | Inspect your own diff/checks and merge with your own account where rules allow; no external course review requirement, **no GitHub self-approval** |
| Required repository approval | Obtain an eligible nonauthor's current review; never impersonate, use AI approval or bypass policy |
| Lab 07 live readiness | Keep [protected main and independent delivery approvals](https://github.com/alvinea28/ws2-azure-delivery-laboratory-07/blob/dev/docs/delivery-configuration.md); stay offline if missing |

Real merge/current CI and any required release must exist before progress is credited. Never manufacture a release, approval or cloud run. Live Lab 07 is not a solo route; green offline checks do not authorize it.

## Ask for help with safe evidence

Share only lab number, OS/architecture, versions, attempted action, sanitized error and relevant task/branch/SHA. Send a private-copy issue/run link through the approved channel when access is appropriate. Do not post configuration/credential dumps, authorization screens, unredacted logs, state or plans.

Separate observation from inference: “Doctor passed; Copilot says signed out” is useful, “everything authenticated” is not. Leave unresolved approvals and cloud readiness pending.
