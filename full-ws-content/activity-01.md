# Activity 01 — Choose the reusable boundary

[Review index](README.md) · [Full setup](00-start-here.md) · [Next activity](activity-02.md) · [Simulation record](simulation.md)

> Review copy; follow your private copy’s live Exercise issue to do the lab.

<!-- FULL-WS-LESSON:START -->
## Laboratory 02 - Step 1/4

### Define the reusable network boundary

| Goal / workspace | This step |
| --- | --- |
| Goal | Set up this independent copy and explain its network-only ownership. |
| Branch | Your copy's actual default, normally `dev`, then `lab/network`. |
| Files | Edit [exercise/design.md](../exercise/design.md); read [variables.tf](../variables.tf) and [versions.tf](../versions.tf). |

[Start/setup](../docs/start-here.md) · [Toolchain](../docs/toolchain.md) · [Git workflow](../docs/git-workflow.md) · [Copilot accounts](../docs/copilot-guide.md).

> Already in your private copy or Exercise? **Reuse it; do not copy again.** No Lab 01/Azure prerequisite; inputs, locks and mocks are supplied.

**Learning route:** complete the four offline gates, then the required
**[Create GitHub Actions, then deploy Azure activity](../docs/workflow-authoring.md)**
linked again in Step 4. Actions authoring is offline; the Azure lifecycle is only
for the exact approved private copy after [owner readiness](../docs/delivery-configuration.md).
A generic private copy cannot deploy. Do not create main or enable Azure during setup.

### 1. Install, sign in, and copy once

Install Git, desktop VS Code, Node and Terraform using the toolchain guide. Create/verify your personal GitHub account, sign in and accept any organization invitation.

On the [public source](https://github.com/alvinea28/ws2-network-module-laboratory-02), choose **COPY EXERCISE** or **Use this template → Create a new repository**. Use an authorized **Owner**, unique name ending in `laboratory-02`, **Private**, and **Include all branches** off. Open your copy's **Exercise** after startup.

### 2. Clone, open, and check accounts

Copy **your copy's Code → HTTPS** URL. In desktop VS Code use **Ctrl+Shift+P → Git: Clone**, paste that credential-free URL, choose a parent folder, then **Open**. On macOS use **Cmd**. Complete only trusted VS Code/Git Credential Manager sign-ins you initiated; trust this known clone only.

**Explorer** must show the clone root—not a source/ZIP/parent/browser-only workspace. Check GitHub/Copilot account and seat via **Accounts → Manage Extension Account Preferences...**. Follow [local authorship setup](../docs/start-here.md#set-authorship-only-for-this-repository); authorship is not authentication.

![Microsoft reference showing the GitHub clone picker](../docs/images/vscode-clone-github.png)
*REFERENCE — Microsoft, CC BY 3.0 US; example repositories, not yours. [Attribution](../docs/images/NOTICE.md).*

### 3. Verify local tools

Open **Terminal → New Terminal** at the clone root; run separately:

```powershell
node --version
terraform version
node scripts/doctor.mjs
```

**Why:** confirms Node **24.16.0** / Terraform **1.16.1**, then local readiness—not authentication, entitlement or push rights. Resolve doctor `CHECK` messages; preserve AzureRM **5.4.0** requirements/lock.

### 4. Branch, read the contract, and decide

With a clean tree, select the actual default and **Source Control → ... → Pull**. Use **Git: Create Branch...** for `lab/network`, or select it if existing. Read inputs/versions without edits:

| Supplied input | Contract to preserve |
| --- | --- |
| `name`, `resource_group_name`, `location` | Caller-selectable strings; resource group already exists. |
| `address_space` | Nonempty `list(string)` of valid IPv4 CIDRs. |
| `subnets` | `map(object({ address_prefixes = list(string) }))`; stable defaults `web`, `data`. |
| `tags` | `map(string)` with nonblank `owner`, `environment`, `cost_center`, and `workshop`. |

Preserve types/defaults/validations/locks. Provider requirements select dependencies, not credentials. Replace unfinished design text with your reasoning, using this example:

```markdown
# Reuse decision

The network baseline owns one VNet and named web/data subnets in an existing
resource group. Stable map keys allow another subnet without renumbering these two.

The subnet-security boundary owns an NSG, custom rules and associations, receiving
subnet IDs from its caller. It remains separate and is not composed in this lab.

The caller owns the existing resource group, configured provider, credentials and
state. None of those dependencies is created or discovered by this reusable root.

A broader Azure Verified Module candidate may cover more features and maintenance
needs. This small contract is easier to inspect for the workshop's limited scope;
that is a teaching choice, not AVM certification. Gateways are deliberately excluded.
```

**Why:** separates ownership. Retain **Reuse decision**, **network baseline**, **subnet-security**; remove every `TODO`. Do not invent an AVM evaluation.

### 5. Publish the decision

Review the design-only diff, then **Save → stage → commit → push; refresh the SAME Exercise.** Use the Git guide; message: `lab: define the network reuse boundary`. First push: **Publish Branch** to existing `origin`.

Inspect **Actions → Lab checks → newest commit → Test learner module**. Incomplete resources/outputs can fail now; final validation tests your root, not a solution.

**Expected:** AgentAlvine accepts the pushed design's three phrases with no `TODO` and offers Step 2.

**If not:** check branch, saved/pushed text and **AgentAlvine → guide**; use [setup recovery](../docs/troubleshooting.md). Do not weaken tests.

Do not add resource groups, VMs, gateways, provider configuration, backends or security composition. No Azure/state access or real plan/apply here.

**Next:** [Step 2: implement the VNet and subnets](activity-02.md).
<!-- FULL-WS-LESSON:END -->

## Recorded simulation outcome

**2026-09-08 — Cycle A: recorded verified; Cycle B: recorded verified.** Both private simulations recorded the pushed reuse decision and advanced the design gate while preserving the network-only boundary. That text gate does not prove GUI/account setup or a finished Terraform implementation by itself.

Whole-lab Node and mocked-case totals are not per-activity test counts. See the [simulation record and coverage limits](simulation.md).
