# Lab 02 — author-merged PR, independent Azure approval

**Scope: Lab 02 only.** The participant can inspect and merge their own source PR
after required checks. GitHub does **not** support approving your own PR: this
uses **zero required PR approvals**, not a fabricated self-approval.

The separate **avm-plan / avm-apply deployment approvals remain independent**.
Merging your PR does not approve an Azure plan, and you cannot approve the apply
or destroy run when you are its PR author, run actor or triggering actor.

## Set up the source-merge rule

An authorized repository administrator uses **Settings → Rules → Rulesets → New
branch ruleset** in the approved private copy, or imports the supplied
[main-author-merge ruleset](../.github/rulesets/main-author-merge.json).
Committing that JSON does **not** install it as a GitHub rule automatically.

| Setting | Required value |
| --- | --- |
| Enforcement / target | Active; only `refs/heads/main` |
| Bypass list | Empty; no administrator or actor bypass |
| Require a pull request before merging | On |
| Required approving reviews | **0** |
| Require Code Owner review | Off |
| Require approval of the most recent push | Off |
| Require conversation resolution | On |
| Required checks | `kit`, `Test learner module`, `Validate isolated Terraform companion` from the **GitHub Actions** app |
| Branch up to date before merge | On (strict checks) |
| Block deletion / force pushes | On |

The specification permits initial branch creation from the reviewed baseline
without requiring checks that have not run for that ref yet. It grants no actor
bypass and does not relax checks on subsequent updates. Creating the initial
branch is instructor setup while delivery is disabled, not a deployment approval.
This rule does not create `main`, enable Azure or configure environments/identities.

Verify effective rules, including inherited organization policies. An unrelated
policy or existing blocking review is not automatically removed. Do not dismiss
another person's review or delete a PR simply to make it mergeable.

## Participant flow

1. Commit Terraform and workflow changes on the lesson's feature branch, then push.
2. Open a PR into the approved protected `main`. Inspect **Files changed** and
   current **Checks** yourself; fix failures and resolve discussions.
3. With all required checks passing and the branch current, use **Merge pull
   request** or **Squash and merge** with your existing account. You do not need
   an approving PR review from another user, and no self-approval is recorded.
4. That merge produces the main push that starts the existing deployment workflow
   if the separate instructor prerequisites and enablement have been satisfied.
5. Wait for the genuinely independent environment reviewer to inspect the exact
   plan and approve the protected job. The same run then applies its saved plan.

**This is not a solo Azure deployment route.** Only the extra source-PR review
dependency is removed. OIDC, private state/locking, restricted runner, saved-plan
encryption, exact commit/run binding, independent environment review and separate
cleanup approval remain unchanged. AgentAlvine observes progress; it approves neither.

See [delivery configuration](delivery-configuration.md) and
[workflow authoring](workflow-authoring.md). No live success is claimed by this guide.
