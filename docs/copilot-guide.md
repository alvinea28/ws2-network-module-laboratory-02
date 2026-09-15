# Copilot guide: ask, understand, and verify

**Goal:** get a scoped explanation you can check, then make only the task's permitted change. Work in [your own independent lab copy](start-here.md). **AgentAlvine** updates the Exercise on GitHub; Copilot is a separate assistant, not a progress award, human reviewer or Azure approver.

## Quick navigation

[Account](#sign-in-and-select-the-copilot-account) · [Context](#open-chat-and-attach-the-right-context) · [Modes](#choose-ask-before-plan-or-agent) · [First question](#make-the-first-question-specific) · [Verify](#review-against-schemas-and-tests) · [Settings](#use-workspace-settings-deliberately) · [Recovery](#recover-without-weakening-controls)

## Sign in and select the Copilot account

1. Check your **personal GitHub username** in the browser. An organization can own the repository and assign a seat; it is not your login. Git authorship, Git HTTPS credentials, browser login and Copilot access are separate.
2. In VS Code **Accounts**, choose **Sign in with GitHub to use GitHub Copilot**, or the Copilot status menu's **Sign in to use Copilot**. Authorize only the request you initiated in the trusted browser, check the account, then return to VS Code.
3. Open **Accounts → Manage Extension Account Preferences...** (or find it in the Command Palette). Select the workshop account for the available **GitHub Copilot / GitHub Copilot Chat** entries.
4. Inspect Copilot status. **Expected:** usable access through the assigned seat/approved entitlement. Ask the instructor or license administrator to confirm an expected organization seat; a clone or generic free entitlement does not prove it. Do not buy access or bypass policy.

![Microsoft reference showing Accounts sign-in](images/vscode-accounts.png)
![Microsoft reference showing Copilot's sign-in button](images/vscode-copilot-signin.png)

*REFERENCE — Microsoft publisher examples, not participant evidence. CC BY 3.0 US; [sources and attribution](images/NOTICE.md). Labels may vary by version.*

> [!WARNING]
> Never send passwords, tokens, keys, recovery/device/MFA codes, state, plan material or unredacted logs to Chat, issues or terminals. Complete intentional sign-in only in trusted UI; never follow a suggested command or unfamiliar page requesting a secret.

## Open Chat and attach the right context

1. Select **Chat** in the title bar, or **Ctrl+Shift+P → Chat: Open Chat**; macOS uses **Cmd+Shift+P**. Choose **Ask** before your first question.
2. Open the Exercise's file in this clone. Use the chat input's `#` picker or **Add Context**, select that file and check its context chip. **Why:** merely naming a file may not attach it.
3. Add only necessary, non-sensitive task text. **Expected:** the intended file, not an unrelated workspace. Follow organization rules for sending even private repository content to Copilot.

## Choose Ask before Plan or Agent

| Mode | Use | Boundary |
| --- | --- | --- |
| **Ask** | Explain code/results | Request reading only, no edits or commands |
| **Plan** | Propose steps and checks | Keep read-only; do not accept implementation automatically |
| **Agent** | A specifically authorized task edit | Inspect each tool action and approve only understood scope |

Mode names are not security guarantees. Decline unexpected writes, commands, installs, network/cloud access or broad permissions. No blanket approvals or unattended terminal access. Compare suggestions with the [approved offline checks](toolchain.md#run-only-the-approved-offline-checks).

## Make the first question specific

**Why:** this prompt asks for understanding, pins relevant versions and forbids execution. Replace `CURRENT TASK TEXT` with the task, not account data; expect an explanation separating supplied work from missing work. Stop if it requests secrets or proposes unauthorized actions.

```text
Work read-only in Ask mode. Explain the attached file and this task for a beginner:
CURRENT TASK TEXT
Separate supplied parts from what I must complete, and facts from assumptions.
Use Terraform 1.16.1 and AzureRM 5.4.0 where relevant; cite supplied schemas/tests.
Do not edit, run commands, install tools, access Azure or request credentials.
```

1. Read the answer, then ask about one unclear input, rule or test with its context attached.
2. Record useful reasoning only where the task requests notes. Do not ask for invented results, automatic progress or completion of the whole lab.

## Challenge a suggestion without executing it

**Why:** compare a safe contract with an unsafe alternative without trying it. Expect the smallest compliant change and existing tests, not weakened controls; reject any proposed execution.

```text
Compare the supplied provider pin and narrow network rules with using the latest
provider and broadly permissive rules. Explain why the alternative is unsuitable.
Do not implement either, change permissions, run commands or access Azure.
Suggest the smallest compliant change and the existing tests that should check it.
```

Reject live-provider substitutions, unlocked dependencies, removed validation, broad workflow permissions or review bypasses. Explain the rejection in requested notes; never run the unsafe option to demonstrate it.

## Review against schemas and tests

1. Compare the suggestion with the Exercise contract and [AzureRM 5.4.0 reference](https://registry.terraform.io/providers/hashicorp/azurerm/5.4.0/docs), plus supplied validation and provider-mocked rejection cases. **Why:** plausible generated properties can be wrong.
2. Make the smallest permitted edit, save (**Ctrl+S**, macOS **Cmd+S**) and run the [approved checks](toolchain.md#run-only-the-approved-offline-checks) when requested. **Expected:** actual executed tests; zero/skipped tests, citations and old green screenshots are not passes.
3. Review the full diff before staging, then follow the [Git workflow](git-workflow.md) and current Exercise. Preserve repository instructions; do not accept automatic instruction generation or unrelated rewrites.

Labs **01/05** permit self-inspection and merging an educational PR where repository rules allow; this is **not GitHub self-approval**. Required human approvals cannot be replaced by Copilot. Lab 07's [protected live approvals](https://github.com/alvinea28/ws2-azure-delivery-laboratory-07/blob/dev/docs/delivery-configuration.md) remain independent and mandatory.

## Use Workspace settings deliberately

1. Open **Ctrl+,** (macOS **Cmd+,**) → **Workspace**. Search the exact setting, such as **Editor: Tab Size** or **Editor: Insert Spaces**, and inspect language overrides first.
2. Preserve supplied **two-space HCL** and repository configuration. **Expected:** only the justified setting changes; review any tracked diff before committing.

![Microsoft reference showing User settings](images/vscode-settings-user.png)
![Microsoft reference showing Workspace settings](images/vscode-settings-workspace.png)

*REFERENCE — Microsoft publisher examples, not participant evidence. CC BY 3.0 US; [sources and attribution](images/NOTICE.md).*

**User** affects other projects; **Workspace** affects the opened project and may be tracked. Open this clone alone before changing workspace settings. Do not reset everything, switch formatters or reformat the repository to hide one indentation error.

## Recover without weakening controls

| Symptom | Smallest recovery / expected result |
| --- | --- |
| Wrong account or unavailable seat | Change only Copilot's account preference; ask the instructor to confirm entitlement |
| Missing Chat or blocked extension | Check approved desktop version/extensions and [account recovery](troubleshooting.md#sign-in-and-permissions-do-not-match); do not install unofficial substitutes |
| Wrong context chip | Remove it and reattach the intended file from this clone |
| Unsupported suggestion/tool request | Decline; request a schema-backed, narrow explanation with no cloud action |

The local doctor cannot verify a human browser login or a usable Copilot seat. Keep unresolved access or review checks pending.
