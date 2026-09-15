# Glossary: the words used in this laboratory

**Goal:** understand the current task without guessing which account, file or operation it means. Every lab is independent; [other numbered labs](https://github.com/alvinea28/ws2-workshop-catalogue) are not prerequisites for this copy's offline work.

## Quick navigation

[Accounts](#accounts-and-permission) · [Local work](#repository-folder-and-local-work) · [Git/PRs](#moving-and-reviewing-changes) · [Automation](#github-automation-and-progress) · [Copilot](#vs-code-and-copilot) · [Terraform](#terraform-and-the-offline-boundary) · [Next action](#choose-the-next-action)

## Accounts and permission

| Term | Meaning and distinction |
| --- | --- |
| **GitHub account** | Your personal login; use the intended account for invitations and access. |
| **Organization** | Shared repository/policy container; can assign seats, but is not a personal login. |
| **Owner** | Account/organization before the repository name; may differ from the signed-in user. |
| **Invitation** | Access offer; accept with the intended account. Not automatically a Copilot seat. |
| **Authentication** | Proves which account acts; does not grant every permission. |
| **Authorization** | Determines allowed operations; public read access does not prove push permission. |
| **Git Credential Manager (GCM)** | Handles Git HTTPS authentication; its account can differ from VS Code's. |
| **VS Code Accounts** | Connected identities and extension preferences; extensions can choose different accounts. |
| **Copilot seat/entitlement** | Personal account's Copilot access, not repository write or Azure access. |
| **Git author identity** | Commit `user.name`/`user.email` metadata; repository-local setup is not sign-in. |
| **noreply email** | GitHub's privacy-preserving commit email; copy the exact address from account email settings. |
| **Credentials/tokens/private keys** | Sensitive access material; use trusted sign-in UI, never paste into chat/issues/terminals/logs. |

Browser login, Git credentials, VS Code selection and Copilot entitlement are separate. The doctor checks local authorship, not human authorization. See [account setup](start-here.md#understand-the-different-accounts-and-places).

## Repository, folder, and local work

| Term | Meaning and distinction |
| --- | --- |
| **Git / GitHub** | Local version-control software / hosting service for repositories, issues, PRs and runs. |
| **Repository (repo)** | Files, Git history and branch references; use your private template copy. |
| **Public template** | Reusable starting material; readable, not a destination for participant pushes. |
| **Template copy** | New independent repository; choose **Private**, retaining the lab's final two-digit number. |
| **Fork** | Repository linked through GitHub's fork relationship; not this workshop's copy route. |
| **Clone** | Local repository with history; download your own copy, not the public source. |
| **Parent folder / root** | Container folder / clone's top-level folder; open the root and run helpers there. |
| **Working tree** | Checked-out files on disk; saving them does not commit them. |
| **ZIP download** | File snapshot without normal clone setup; not a replacement for cloning. |
| **Branch** | Named line of work, not a folder; use the task's exact `lab/` name. |
| **Default branch** | Normal starting branch, currently `dev`; check your copy rather than assume `main`. |
| **HEAD** | Current checkout position, normally the selected branch's latest local commit. |
| **Detached HEAD** | A commit checkout without an ordinary working branch; stop before task commits. |

## Moving and reviewing changes

| Term | Meaning and distinction |
| --- | --- |
| **Save** | Writes editor text to disk; the unsaved tab dot disappears. |
| **Diff** | Added/removed content; read every intended change before staging. |
| **Stage** | Selects current changes for a commit; later edits need fresh review/staging. |
| **Commit** | Local snapshot with message/author; not yet uploaded. |
| **SHA** | Exact commit identifier; unlike a branch name, identifies a fixed revision. |
| **Remote / origin** | Exchange destination / conventional clone remote; verify both fetch and push URLs. |
| **Fetch** | Downloads remote objects/references without integrating them into your current files. |
| **Pull** | Fetches and integrates tracking-branch changes; use a clean branch, stop on conflicts. |
| **Push** | Uploads commits; verify the intended GitHub branch and SHA afterward. |
| **Publish Branch** | First push to the existing copy, not creation of another repository. |
| **Tracking branch/upstream** | Remote branch paired with a local branch; unpublished branches may lack one. |
| **Pull request (PR)** | Merge proposal between branches in your copy; creating it does not merge it. |
| **Base / compare** | Target / source branch; normally default `dev` / current task branch. |
| **Draft PR** | Not ready for merge; retain this state when the task requests it. |
| **Self-inspection** | Read your own diff/current checks. Labs 01/05 allow educational merges where rules permit. |
| **Peer approval** | Eligible nonauthor's review when policy requires it. GitHub cannot self-approve; AI is not human approval. |
| **Merge** | Combines source into target; your own account may merge your PR if task/rules/checks permit. |
| **Conflict** | Git cannot combine changes automatically; preserve work and resolve deliberately. |
| **Force push / discard / stash** | Rewrite history / remove edits / put edits aside; never blind beginner repairs. |

## GitHub automation and progress

| Term | Meaning and distinction |
| --- | --- |
| **Issue / issue body** | Task/discussion / main text; the existing Exercise body contains current instructions. |
| **AgentAlvine** | Automatic facilitator updating progress; may appear as `github-actions[bot]`, not Copilot. |
| **GitHub Actions** | Workflow service; check repository, event, branch and SHA—not just color. |
| **Workflow / job / step** | Automation definition / work unit / individual action; unrelated success is not task evidence. |
| **Lab checks** | Learner validation; PR jobs have no Azure credentials, OIDC or remote state. |
| **Current head** | Latest branch/PR commit; old checks or required approvals may not cover new edits. |
| **Protected branch** | Enforced checks/review; never remove rules or use admin bypass to progress. |
| **Tag / release** | Named revision reference / published record; Lab 05 uses its own checked module revision. |
| **Artifact** | Workflow output; may be sensitive. Plans/state are not setup evidence to share. |

A real merge/current CI is not a fabricated approval or an Azure authorization. Lab 07's protected live `main` is a separate instructor-controlled exception; maintenance stays on `dev`.

## VS Code and Copilot

| Term | Meaning and safe use |
| --- | --- |
| **Explorer** | Opened file tree; root should be this clone, not a multi-repository parent. |
| **Command Palette** | Search editor actions with **Ctrl+Shift+P** (macOS **Cmd+Shift+P**). |
| **Integrated terminal** | Shell in the editor, opened through **Terminal → New Terminal**; has a real current folder. |
| **Workspace Trust** | Enables trusted folder features; trust this known clone, not every parent folder. |
| **User / Workspace settings** | Cross-project / project-specific preferences; retain supplied two-space HCL formatting. |
| **Copilot context** | Attached files/text; use `#` for the intended non-sensitive file, not unrelated data. |
| **Ask / Plan / Agent** | Explanation / proposal / assisted implementation; begin read-only and inspect action approvals. |
| **Prompt** | Request stating task, context, constraints and prohibited actions. |
| **Tool approval** | Permission for a proposed action; mode labels do not guarantee safety. |

## Terraform and the offline boundary

| Term | Meaning and workshop boundary |
| --- | --- |
| **Node.js** | Helper-script runtime, **24.16.0**; neither Terraform nor Azure authentication. |
| **PATH** | Directories searched for executables; add only approved user entries, never replace all. |
| **Architecture** | CPU target; match OS and x64/amd64 versus ARM64 downloads. |
| **Terraform CLI** | Local program, **1.16.1** for Labs 02–08; distinct from provider version. |
| **HCL** | Terraform configuration language; preserve two spaces and typed contracts. |
| **Provider / AzureRM** | Resource schema/operation plugin, **5.4.0**; schema access does not prove Azure access. |
| **Provider lockfile** | Versions/checksums; consume supplied locks read-only, never regenerate to hide mismatches. |
| **Module** | Reusable inputs/configuration/outputs; each lab includes its required baseline. |
| **Module pin** | Exact source revision, not provider lock; Lab 05 uses its own released commit. |
| **Schema / validation** | Allowed properties/types / rule checks; verify against real schemas and rejection cases. |
| **Mock provider** | Substitute preventing live operations; required cases must actually execute. |
| **Offline check** | Credential-free validation; registry downloads may use internet, never Azure/state. |
| **Backend / state** | State storage configuration / managed-resource record; do not initialize/read a live backend for setup. |
| **Saved plan / encrypted-plan review** | Exact proposed change artifact / protected independent review; never share raw plans or keys. |
| **OIDC identity / runner** | Workflow authentication mechanism / job machine; live infrastructure belongs to instructor setup. |
| **terraform-docs** | **0.24.0**, Lab 04 only; generate actual module API docs through the canonical helper. |
| **Doctor** | Read-only root/tool/Git-authorship check; cannot install, sign in or prove Copilot/cloud readiness. |

Zero/skipped tests are not passes. Lab 07 offline study needs no prior lab, but its [protected live workflow](https://github.com/alvinea28/ws2-azure-delivery-laboratory-07/blob/dev/docs/delivery-configuration.md) requires approved identities, backend, restricted runner and independent encrypted-plan approvals. Never start/rerun it to repair setup; issue progress grants no deployment permission.

## Choose the next action

1. Find the term; decide whether the uncertainty is account, local Git, automation or Terraform.
2. Use [start-here.md](start-here.md), [git-workflow.md](git-workflow.md), [copilot-guide.md](copilot-guide.md) or [toolchain.md](toolchain.md) rather than trying unrelated commands.

For the common **branch versus commit** distinction, run each read-only line separately in PowerShell/macOS/Linux; stop on errors or unexpected checkout state.

```powershell
git branch --show-current
git rev-parse HEAD
```

| Command | What it does / flags | Expected |
| --- | --- | --- |
| `git branch --show-current` | `--show-current` reads the selected branch name | Your task branch; empty may mean detached HEAD |
| `git rev-parse HEAD` | Resolves current checkout `HEAD` to its exact commit | Full SHA, not proof it was pushed/reviewed/deployed |

| Problem | Recovery |
| --- | --- |
| Local/GitHub state differs | Compare branch and current SHA using the Git guide |
| Term still unclear or check fails | Preserve work and use [troubleshooting.md](troubleshooting.md); keep unresolved gates pending |
