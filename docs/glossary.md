# Glossary: the words used in this laboratory

Use this page when a task introduces an unfamiliar term. The definitions apply to **this standalone lab copy** on Windows, macOS, and Linux. The [workshop catalogue](https://github.com/alvinea28/ws2-workshop-catalogue) offers other independent labs; you do not need their repositories to understand or complete this one's offline work.

## Quick navigation

- [Accounts and permission](#accounts-and-permission)
- [Repository, folder, and local work](#repository-folder-and-local-work)
- [Moving and reviewing changes](#moving-and-reviewing-changes)
- [GitHub automation and progress](#github-automation-and-progress)
- [VS Code and Copilot](#vs-code-and-copilot)
- [Terraform and the offline boundary](#terraform-and-the-offline-boundary)
- [Choose the next action](#choose-the-next-action)

## Accounts and permission

| Term | Beginner meaning | Important distinction |
| --- | --- | --- |
| **GitHub account** | Your personal identity on GitHub | Use the same intended personal account for invitations and workshop access |
| **Organization** | A shared container for repositories, people, and policies | It can own a copy or assign a seat; you do not sign in as the organization |
| **Owner** | The person or organization named before a repository name | Repository ownership is not the same as the browser's signed-in user |
| **Invitation** | A request to join an organization or gain repository access | It must be accepted with the intended account; it is not automatically a Copilot seat |
| **Authentication / sign-in** | Proving which account is acting | Sign-in alone does not grant every permission |
| **Authorization / permission** | The operations that account may perform | Reading a public template does not prove permission to push to it |
| **Git Credential Manager (GCM)** | Software that helps Git authenticate HTTPS operations through supported sign-in flows | Git's saved account can differ from VS Code's account selection |
| **VS Code Accounts** | The editor menu for connected identities and extension account preferences | An extension may select a different connected account from another extension |
| **Copilot seat / entitlement** | Permission for a particular personal account to use Copilot | A seat does not grant repository write access or Azure access |
| **Git author identity** | The name and email recorded in a commit | Repository-local `user.name` and `user.email` are authorship metadata, not credentials |
| **noreply email** | A GitHub-provided commit email that can conceal your ordinary email address | Use the exact address shown in your account's email settings, not an invented example |
| **Credential / token / private key** | Sensitive material that can authorize access | Never paste it into chat, issues, terminals, or logs; use trusted credential UI |

> [!NOTE]
> Keep four checks separate: GitHub's browser session, Git's HTTPS credentials, VS Code's selected account, and Copilot's seat. The doctor can check local Git authorship, but cannot certify any human browser authorization or Copilot entitlement. See [start-here.md](start-here.md#understand-the-different-accounts-and-places).

## Repository, folder, and local work

| Term | Beginner meaning | In this workshop |
| --- | --- | --- |
| **Git** | Software that records versions and relationships between changes | It runs locally even when no network operation is happening |
| **GitHub** | A hosting and collaboration service for Git repositories | Its browser UI holds your copy, issues, PRs, and Actions runs |
| **Repository / repo** | Files plus their Git history and branch references | Your participant repository is your own private template copy |
| **Public template** | A reusable starting repository | Its public visibility lets you read it, not push participant work to it |
| **Template copy** | A newly created repository using a template's starting files | Choose **Private** and preserve the selected lab's final two-digit number |
| **Fork** | A repository connected to another repository through GitHub's fork relationship | It is not the requested template-copy route |
| **Clone** | A local Git copy of a repository and its history | Clone your own private copy, not the public template |
| **Parent folder** | A folder that contains other folders | Choose it as the clone destination, but then open the repository's child folder |
| **Repository root** | The top-level folder of this clone | The supplied Node helper commands run from here |
| **Working tree** | The checked-out files you can currently edit on disk | Saving changes this tree; it does not automatically create a commit |
| **ZIP download** | A snapshot of files without a normal clone's Git setup | Do not replace cloning with ZIP extraction or initialize an unrelated new repository |
| **Branch** | A named line of development inside a repository | The task specifies a branch, commonly with a `lab/` prefix; it is not another folder |
| **Default branch** | The branch GitHub treats as the repository's normal starting point | Usually `dev`; inspect the actual copy instead of assuming `main` |
| **HEAD** | Git's reference to your current checked-out position | In normal task work it follows the selected branch's latest local commit |
| **Detached HEAD** | A checkout of a commit rather than an ordinary working branch | Stop and ask for guidance before making task commits there |

## Moving and reviewing changes

| Term | Beginner meaning | What to check |
| --- | --- | --- |
| **Save** | Write an editor's current text to disk | The tab's unsaved-change dot disappears |
| **Diff** | A comparison showing removed and added content | Read every intended change before staging |
| **Stage** | Select the current version of a change for the next commit | Use the file's **+** button; later edits are not automatically added to the staged version |
| **Commit** | A recorded local snapshot of staged changes, with a message and author | A commit is not yet a push |
| **SHA / commit identifier** | An identifier for one exact recorded commit | A branch name can move; an exact commit identifier identifies a fixed revision |
| **Remote** | A named repository location that local Git can exchange commits with | Its fetch and push targets must identify your intended copy |
| **origin** | The conventional remote name established by cloning | The word does not guarantee that the configured address is correct |
| **Fetch** | Download remote Git objects and references without integrating them into your current branch | Fetch alone does not update the files you are working on |
| **Pull** | Fetch and integrate the tracking branch's remote changes | Use it before work on a clean, intended branch; stop on conflicts |
| **Push** | Send local commits to a remote branch | Verify the browser branch and latest commit afterward |
| **Publish Branch** | VS Code's first-push route for a new local branch | Publish to the existing private copy, not a second repository |
| **Tracking branch / upstream** | The remote branch paired with a local branch | A new unpublished task branch may not have one yet |
| **Pull request / PR** | A proposal to merge one branch's changes into another | Both sides belong to this private copy; creating a PR does not merge it |
| **Base / compare** | The target branch / proposed source branch in GitHub's PR comparison | Base is normally the actual default; compare is your current task branch |
| **Draft PR** | A PR explicitly marked as not ready for final review or merge | Keep it a draft when the current task requires that state |
| **Peer review** | Another eligible person checks the submitted change | Labs 1 and 5 require genuine nonauthor approval of the last head, not self-approval or AI review |
| **Merge** | Combine the approved source branch's changes into its target | Do it only when the task, checks, and required review permit it |
| **Conflict** | Git cannot safely combine competing changes automatically | Preserve work and resolve deliberately; do not blindly accept one whole side |
| **Force push / discard / stash** | Operations that can rewrite remote history, remove edits, or move edits out of view | None is a generic beginner repair; never use them blindly to get past a warning |

## GitHub automation and progress

| Term | Beginner meaning | Workshop boundary |
| --- | --- | --- |
| **Issue** | A GitHub discussion or task record | The active **Exercise** issue is the current guide; a separate change-request issue may be required by a task |
| **Issue body** | The main text at the top of an issue | AgentAlvine updates this text with progress and next instructions; it is not just a stream of comments |
| **AgentAlvine** | The workshop's automatic GitHub facilitator | It can appear technically as `github-actions[bot]`; it is not Copilot Chat |
| **GitHub Actions** | The service that runs repository workflows | A run's repository, branch, event, and commit matter as much as its color |
| **Workflow / job / step** | An automation definition / a unit of work / an individual action inside that job | A successful unrelated job does not prove the learner task passed |
| **Lab checks** | The supplied learner-validation workflow | PR validation is credential-free: no Azure, OIDC, or remote-state access |
| **Current head** | The latest commit currently submitted on a branch or PR | Old green checks or approvals do not automatically cover a later change |
| **Protected branch** | A branch with enforced restrictions such as checks or review | Do not remove its rules to unblock yourself; Lab 7 live delivery requires protected `main` |
| **Tag / release** | A named reference / a published release record for a chosen revision | Lab 5 releases this copy's own reviewed module; a release is not Azure approval |
| **Artifact** | A file produced or stored by a workflow | It can contain sensitive information; do not download or share plan/state artifacts as setup evidence |

## VS Code and Copilot

| Term | Beginner meaning | Safe use |
| --- | --- | --- |
| **Explorer** | VS Code's tree of opened files and folders | Its root should be this clone, not a parent containing several repositories |
| **Command Palette** | A searchable list of editor commands | Open with **Ctrl+Shift+P**, or **Cmd+Shift+P** on macOS |
| **Integrated terminal** | A shell inside the editor | Open with **Terminal** → **New Terminal**; it still has a real working directory |
| **Workspace Trust** | VS Code's decision about whether an opened folder may enable trusted features | Trust only the known workshop clone, not all parent folders |
| **User / Workspace settings** | Editor-wide preferences / preferences for the opened project | Prefer a justified Workspace change; preserve supplied two-space HCL formatting |
| **Copilot context** | Files or text supplied to help answer a question | Use the `#` context picker for the intended non-sensitive file |
| **Ask / Plan / Agent** | Modes for questions, planning, and assisted implementation | Begin with read-only Ask; keep plans read-only and inspect Agent tool approvals |
| **Prompt** | Your request to Copilot | State the task, attached context, constraints, and what must not be done |
| **Tool approval** | A decision allowing a proposed assistant action | A mode label is not a safety guarantee; decline unknown commands and broad access |

## Terraform and the offline boundary

| Term | Beginner meaning | In this workshop |
| --- | --- | --- |
| **Node.js** | The JavaScript runtime that executes the supplied helper scripts | Pin **24.16.0**; it is not Terraform or an Azure sign-in tool |
| **PATH** | The list of directories a shell searches for executable commands | A narrow approved user-level entry may be needed; never replace the whole list |
| **Architecture** | The processor family a downloaded program targets | Match Windows/macOS/Linux and x64/amd64 versus ARM64 |
| **Terraform CLI** | The local Terraform program | Pin **1.16.1**; the CLI version and provider version are different |
| **HCL** | The configuration language used for Terraform code | Preserve the supplied two-space indentation and typed input contracts |
| **Provider / AzureRM** | A plugin describing Azure resource schemas and operations | Pin **AzureRM 5.4.0**; loading its schema is not proof of cloud access |
| **Provider lockfile** | Recorded provider versions and package checksums | Supplied locks are consumed read-only, not regenerated to hide a mismatch |
| **Module** | Reusable Terraform configuration with inputs and outputs | Each lab supplies the baseline it needs; no earlier repository is required |
| **Module pin** | A reference to an exact module source revision | It differs from the provider lock; Lab 5 checks an exact released commit from its own copy |
| **Schema / validation** | Allowed properties and types / checks that inputs or configuration obey rules | Review real versioned schemas and rejection cases, not just a Copilot suggestion |
| **Mock provider** | A test substitute that avoids real provider operations | Required test runs must actually execute with the supplied mocks |
| **Offline check** | The approved credential-free learner validation path | Provider downloads may use the internet; no Azure or remote-state operations are allowed |
| **Backend / state** | Terraform's state-storage configuration / its record of managed resources | State can be sensitive; do not initialize or access a real backend for setup |
| **Saved plan / encrypted-plan review** | A proposed change artifact / a protected independent review process for that exact artifact | Live Lab 7 requires instructor readiness; never paste plan material or keys into chat or logs |
| **OIDC identity / runner** | A workflow's short-lived identity mechanism / the machine executing a job | Instructor-controlled live infrastructure, not something a learner enables to fix an offline check |
| **terraform-docs** | A program that generates module documentation | **0.24.0**, Lab 4 only; use the supplied canonical generator |
| **Doctor** | The read-only root, tool, and Git-identity setup check | It does not install, sign in, confirm a Copilot seat, or prove cloud readiness |

> [!WARNING]
> Lab 7 is safe for independent offline study without another repository. Live work is a separate, instructor-controlled path requiring an approved private copy, protected `main`, identities, backend, restricted runner, and independent encrypted-plan review. Do not start or rerun live jobs from this glossary. GitHub issue progress is never deployment authorization.

## Choose the next action

1. Find the unfamiliar term in the tables above.
2. Identify whether your question concerns your account, local files, GitHub collaboration, or Terraform checks.
3. Follow the matching guide rather than experimenting with unrelated commands.

| Action | Expected result | Recovery |
| --- | --- | --- |
| Follow [start-here.md](start-here.md) | Your own private copy and verified local setup | Stop at the first unresolved account, folder, or tool check |
| Follow [git-workflow.md](git-workflow.md) | An intentional task commit reaches the right branch | Use [troubleshooting.md](troubleshooting.md) for conflicts, rejected pushes, or pending review |
| Follow [copilot-guide.md](copilot-guide.md) | A scoped explanation you can verify | Reject unsafe alternatives without executing them |
| Follow [toolchain.md](toolchain.md) | Exact versions and the approved offline check route | Preserve locks and cloud controls when a check fails |

For a concrete local distinction, these read-only commands show the **branch name** and the **exact current commit** respectively. They work in PowerShell, macOS, and Linux shells; run each line separately.

```powershell
git branch --show-current
git rev-parse HEAD
```

Neither result proves that the commit was pushed, reviewed, or deployed. Compare the appropriate GitHub branch and current-task evidence using the workflow guide instead of treating a local command as proof of a different operation.
