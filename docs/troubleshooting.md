# Troubleshooting: recover without weakening the workshop

Start with the symptom you can observe. Keep your existing work, check **which account, repository, branch, and commit** you are using, and change only the setting or file that the evidence identifies. All recovery below concerns **this independent private lab copy**, not another workshop repository.

## Quick navigation

[Before a fix](#before-trying-a-fix) · [Wrong folder or remote](#the-wrong-folder-or-remote-is-open) · [Account mismatch](#sign-in-and-permissions-do-not-match) · [Missing navigation](#settings-issues-or-actions-is-missing) · [Missing Exercise](#agentalvine-or-the-exercise-is-missing) · [Tools and tests](#tools-formatting-or-offline-checks-fail) · [Rejected pull or push](#pull-or-push-is-rejected) · [Pending PR or progress](#a-pr-or-progress-gate-remains-pending) · [Safe help request](#ask-for-help-with-safe-evidence)

## Before trying a fix

1. Read the first meaningful error, not just the final red status.
2. Save the non-sensitive files you intentionally edited.
3. Check the owner and numbered repository name in the browser address bar.
4. Check the personal username in the browser's profile-picture menu.
5. Check the clone name in VS Code **Explorer** and the branch in the status bar.
6. Find the matching section below before changing settings.

> [!WARNING]
> Do not paste passwords, tokens, private keys, recovery/device codes, Terraform state, or sensitive plan material into chat, a terminal, an issue, or logs. Use only trusted browser/VS Code credential flows you initiated. Do not force-push, blindly discard or stash work, reset global settings, weaken branch gates, or run an Azure command as a diagnostic shortcut. **Never rerun a live delivery job to repair setup or exercise progress.**

## The wrong folder or remote is open

Use **Terminal** → **New Terminal** inside desktop VS Code. These Git commands inspect local metadata and work in PowerShell, macOS, and Linux shells:

```powershell
git rev-parse --show-toplevel
git remote -v
git status --short --branch
```

| Action | Expected result | Recovery |
| --- | --- | --- |
| Compare Git's root with **Explorer** | Both identify the selected lab clone | Use **File** → **Open Folder...** for that clone, not its parent; macOS may show **Open...** |
| Check for a real local repository | Git reports a root and a branch | An extracted ZIP is not a clone; preserve it and follow [the clone procedure](start-here.md#clone-your-copy-into-desktop-vs-code), not **Initialize Repository** |
| Check the application | Desktop VS Code provides a local terminal | Leave `github.dev` or a virtual workspace for the desktop clone workflow |
| Inspect `origin` fetch and push targets | Both identify your private copy | Do not push to the public source; open the correct own-copy clone |
| Check the current folder itself | Windows `Get-Location`, or macOS/Linux `pwd`, identifies the clone root | Open a new terminal after reopening the correct folder |

If your only edited files are in the wrong clone or ZIP folder, keep them intact and ask the instructor how to transfer only the intended changes. Do not delete a folder, recreate its Git history, or retarget an unfamiliar remote to make a warning disappear.

## Sign-in and permissions do not match

| Action | Expected result | Recovery |
| --- | --- | --- |
| Check GitHub's browser profile | The invited personal account is signed in | Switch through GitHub's trusted UI before reopening the invitation or copy |
| Check the copy's **Owner** | Your account or the instructor-assigned organization owns it | An organization name is not a personal sign-in; ask about membership and copy permission |
| Check a private clone or push failure | Git Credential Manager authorizes the intended personal account | Use its trusted browser flow; ask IT to correct only the affected saved GitHub account, not clear every credential |
| Check VS Code **Accounts** | The intended personal account is available | Correct the editor sign-in separately from Git's HTTPS credentials |
| Check **Manage Extension Account Preferences...** | Copilot selects the account with the workshop seat | Choose the account for the affected Copilot extension entries; see [copilot-guide.md](copilot-guide.md#sign-in-and-select-the-copilot-account) |
| Check a missing Copilot entitlement | The instructor confirms a seat for that username | Wait for assignment or organization policy resolution; do not purchase or bypass access |
| Check a Git author error | Local author name and email are configured | Use [repository-local authorship setup](start-here.md#set-authorship-only-for-this-repository); authorship is not authentication |

A successful public clone requires no push permission. A readable private repository can still deny writes. A `403` or **Repository not found** can mean the wrong account, an unaccepted invitation, missing organization authorization, or the wrong URL; it does not establish that the repository was deleted. Never place a token in a remote URL or answer a terminal credential prompt with a pasted secret.

If **Chat** or a Copilot entry is missing, check the installed desktop VS Code version and the instructor-approved extension availability. An organization may prohibit or disable a feature. Do not install an unofficial replacement, enable blanket tool approvals, or change unrelated accounts to circumvent that policy.

## Settings, Issues, or Actions is missing

1. Open **your private copy's** repository page, not the public source or your personal account settings.
2. Look for **Code**, **Issues**, **Pull requests**, **Actions**, and **Settings** in the repository navigation row.
3. Expand the row's **...** overflow menu if the browser window is narrow.
4. Ask the instructor or copy administrator if **Settings** is still unavailable; repository administration rights may be missing.

This address is a **pattern**, not a working link. Replace `YOUR-OWNER` and `YOUR-COPY` with the owner and full repository name of your private copy before opening it. Never substitute the public source owner's settings page.

```text
https://github.com/YOUR-OWNER/YOUR-COPY/settings
```

![GitHub reference showing the repository Settings tab](images/github-settings.webp)

*REFERENCE — GitHub publisher example, not an actual participant screen. CC BY 4.0; [sources and attribution](images/NOTICE.md). Navigate in your own copy.*

If **Issues** is disabled and you are authorized to administer this copy:

1. Open **Settings** → **General**.
2. Find **Features**.
3. Select the **Issues** checkbox.
4. Return to the repository navigation and open **Issues**.

For an **Actions** policy problem, inspect the allowed configuration rather than broadly enabling everything:

1. Open **Settings** → **Actions** → **General** in the left settings sidebar.
2. Inspect **Actions permissions** against the instructor's approved list of SHA-pinned actions and reusable workflows.
3. Ask the instructor for the exact permitted entries if an approved dependency is blocked.
4. Keep **Workflow permissions** at **Read repository contents and packages permissions**.
5. Ask the organization administrator to resolve any enforced policy that prevents the supplied workflows from running.

The trusted AgentAlvine guide declares its own narrowly scoped write permissions; the repository-wide default does not need blanket write access. Learner PR checks remain credential-free, with no Azure/OIDC or state access.

> [!WARNING]
> Do not select blanket **Read and write permissions**, allow all actions, enable **Send write tokens to workflows from pull requests**, enable **Send secrets to workflows from pull requests**, or enable **Allow GitHub Actions to create and approve pull requests** to repair this lab. Do not weaken fork-approval requirements, remove branch protections, or make a private copy public. If an organization policy blocks the supplied design, stop and ask the instructor.

## AgentAlvine or the Exercise is missing

1. Confirm that you created a private **template copy** with the correct final lab number.
2. Allow **20–60 seconds** for initial automation after repository creation.
3. Refresh the copy's landing page and its **Issues** tab.
4. Open **Actions** if the Exercise link is still absent.
5. Select **AgentAlvine** in the workflow sidebar.
6. Open its latest relevant run to inspect whether it is queued, running, completed, or blocked.
7. Refresh the existing Exercise issue body when the guide finishes.

![GitHub reference showing the repository Actions tab](images/github-actions.webp)

*REFERENCE — GitHub publisher example, not an actual participant screen. CC BY 4.0; [sources and attribution](images/NOTICE.md).*

![GitHub reference showing the workflow-selection sidebar with an example workflow](images/github-workflow-sidebar.webp)

*REFERENCE — GitHub publisher example, not an actual participant screen. CC BY 4.0; [sources and attribution](images/NOTICE.md). The picture selects **CodeQL**; choose **AgentAlvine** for guidance or **Lab checks** for learner validation, not the example workflow.*

A queue can take longer than the first wait. If the guide is disabled or blocked, have the instructor inspect that specific workflow and its policy. Do not create a replacement workflow, press **Run workflow** on a delivery workflow, or use **Re-run all jobs** as a generic fix. The public template itself is not a participant exercise and does not prove that your private copy started.

If an Exercise exists, read its **body** for the current task and feedback. Do not manually edit its progress state, post a check command, add run IDs, create an evidence PR, or fabricate a second Exercise. An intentionally unfinished learner task can fail **Lab checks** while **AgentAlvine** is working correctly.

## Tools, formatting, or offline checks fail

| Action | Expected result | Recovery |
| --- | --- | --- |
| Run the version checks in [toolchain.md](toolchain.md#restart-and-verify-each-tool) | Node 24.16.0, Terraform 1.16.1, and applicable tooling match | Use the exact official release and architecture; do not silently substitute “latest” |
| Restart after an installation or PATH change | A new VS Code process finds the intended executable | Save and close all editor windows before reopening; do not replace system PATH |
| Run the doctor in the root | Local root/tool/identity checks are reported | If the script is missing, report an incomplete package; do not generate a substitute |
| Read a formatting failure | The named HCL file retains two-space formatting | Open **Settings** with **Ctrl+,** (**Cmd+,** on macOS), select **Workspace**, and inspect the specific setting; do not reset **User** settings |
| Read an AzureRM download failure | The locked 5.4.0 provider can be verified | Ask about approved network/proxy access; never disable TLS or checksum verification |
| Read a provider lock mismatch | Supplied locks remain unchanged | Do not unlock, delete, or regenerate the lockfile; ask the instructor about the supported platform |
| Read a mock test failure | Required passing and rejection cases actually execute | Fix the identified task behavior; zero or skipped tests are not a pass |
| Read a Lab 4 documentation mismatch | Canonical generated output matches this module | Use `node scripts/generate-docs.mjs`, not invented tables or a raw output-file workaround |
| Check Lab 7's validation route | The helper prepares an isolated offline test root | Stop if a command wants Azure login or remote-state access; do not initialize the canonical backend |

Use only the supplied `node scripts/check-learner.mjs` route for the current task's offline learner checks. Provider downloads can need internet access, but that is not Azure access. The doctor cannot prove that a human signed in, owns push permission, or has a usable Copilot seat.

## Pull or push is rejected

1. Read the rejection before retrying.
2. Confirm that `origin` and the current branch belong to your intended private copy and task.
3. Inspect **Source Control** for uncommitted work or conflicts.
4. Use **Publish Branch** if this is the first push of a deliberately created task branch without an upstream.
5. Use **...** → **Pull** on a clean, correctly tracked branch when the remote has newer commits.
6. Review the result before selecting **...** → **Push** again.

An AgentAlvine README commit can move the default branch after you cloned it. Pull that default branch before creating the next task branch; bot updates never require force-pushing. If a pull reports conflicts, stop and ask for help resolving each conflict while preserving intended work. Do not choose blanket **Accept All**, discard, stash, reset, rebase, or force-push without understanding the exact effect. If the rejection is a permission or branch-protection rule, fix the account or use the intended task/PR route; do not remove the rule.

## A PR or progress gate remains pending

| Action | Expected result | Recovery |
| --- | --- | --- |
| Check PR repositories and branches | Same private copy on both sides; actual default base normally `dev` | Correct the comparison; never send the learner PR to the public template |
| Compare the latest branch SHA with **Actions** | Relevant checks cover the latest head, not an old green commit | Inspect the current run and PR checks; a temporary PR merge SHA is distinct from the branch head |
| Check a required draft | The PR remains a draft for the task that requests it | Do not mark it ready simply to change a badge |
| Check Lab 1 or Lab 5 review | A genuine eligible nonauthor approved the last head | Obtain fresh human review after a new commit; do not self-approve or substitute an AI review |
| Check Lab 7 live readiness | An instructor-approved private copy has protected `main` and all independent delivery controls | Remain offline if identity, backend, runner, or independent encrypted-plan review is missing; no live-job reruns |

Progress may legitimately stop at a human or instructor gate. Do not manufacture a release, approval, or cloud run to make the issue advance. Lab 7's offline work does not require another lab, but its live delivery path is not made safe by a successful doctor or mocked check.

## Ask for help with safe evidence

Share only what is necessary: lab number, operating system and architecture, non-sensitive tool versions, the action attempted, a short sanitized error, and the affected task/branch or current commit identifier. Give the instructor a private-copy issue or run link through the approved channel when access is appropriate. Never post complete configuration dumps, credential-manager contents, browser authorization screens, unredacted logs, state, or plan material.

Explain what you actually observed separately from what you inferred. “The doctor passed but Copilot says signed out” is useful; “everything is authenticated” is not justified by a local script. Preserve pending review and cloud-readiness checks as pending until the responsible human verifies them.
