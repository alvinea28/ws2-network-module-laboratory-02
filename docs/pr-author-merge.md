# Lab 02 — author-merged PR and scoped automatic saved-plan apply

**Scope: Lab 02 only.** The participant can inspect and merge their own source PR
after required checks. GitHub does **not** support approving your own PR: this
uses **zero required PR approvals**, not a fabricated self-approval.

The approved **avm-plan / avm-apply** environments are main-only with **no Required
reviewers** and no admin bypass. After real prerequisite authorization/enablement,
the protected-main push validates, saves/encrypts a plan and automatically applies
that exact plan in the same run. **No manual deployment reviewer is required.**
This policy is not permission to enable an unready copy or change public templates.
Every copy can do the [required Actions-authoring activity](workflow-authoring.md)
offline; only the exact approved private profile can continue to Azure. Source
maintenance stays on **dev**, not participant live main.

## Set up the source-merge rule

An authorized repository administrator inspects **Settings → Rules → Rulesets**
in the approved private copy and compares its existing exact-profile rule with the
[main-author-merge ruleset specification](../.github/rulesets/main-author-merge.json).
Committing that JSON does **not** install it as a GitHub rule automatically.
Do not recreate/import a replacement ruleset or repin IDs/pins to make a different
copy eligible. Missing configuration requires separately authorized owner bootstrap.

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
branch is owner setup **only after baseline/readiness review, while delivery is
disabled**, not a deployment approval. This generic source guide supplies no
current configuration inventory, approved Azure scope, budget, lifetime or
bootstrap authorization; verify those prerequisites with the owner.
This rule does not create `main`, enable Azure or configure environments/identities.

Verify effective rules, including inherited organization policies. An unrelated
policy or existing blocking review is not automatically removed. Do not dismiss
another person's review or delete a PR simply to make it mergeable.

## Participant flow

1. Commit Terraform and workflow changes on the lesson's feature branch, then push.
2. **If protected main does not exist or prerequisites are unready, stop at the
   offline handoff.** Do not create main or open a PR into a nonexistent branch.
   Once the owner has established it while disabled and authorized the intended
   live scope, open the PR. Inspect **Files changed** and current **Checks** yourself;
   fix failures and resolve discussions.
3. With all required checks passing and the branch current, use **Merge pull
   request** or **Squash and merge** with your existing account. You do not need
   an approving PR review from another user, and no self-approval is recorded.
4. That merge produces the main push that starts the existing deployment workflow
   if the separate instructor prerequisites and enablement have been satisfied.
5. Observe **Validate reviewed AVM revision → Trusted AVM plan → Apply exact AVM
   saved plan** in that same run. No second deploy dispatch or human-review wait.
   Use a real intended change; no empty commit or fake change just to trigger Actions.

The historical [avm-approval.cjs](../scripts/avm-approval.cjs) delegates to
[deployment-authorization.cjs](../scripts/deployment-authorization.cjs), not an
approvals API. It freshly verifies exact private ID/name, live rules, current
main/run/SHA/attempt, actual merged PR, same-run validation/plan and environments.
OIDC, private state/locking, restricted runner, encryption, **2-hour plan validity**
and **1-day artifact retention** remain mandatory; wrong IDs/public/templates fail.

**Cleanup is separate:** an authenticated current repository admin explicitly
dispatches [avm-cleanup.yml](../.github/workflows/avm-cleanup.yml) after authorizing
owned-scope full cleanup, using required string `authorization` =
`destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>`; no operation input
and no independent cleanup reviewer. Current admin/actor/sender/trigger IDs,
current SHA/state and the same run's exact destroy plan are verified. Delivery's
manual menu is **followup only**; ordinary main never cleans up. Preserve shared
RG/backend/identities/runner. Scope, budget, lifetime and bootstrap authorization
remain separate; AgentAlvine only observes/guides, never authorizes Azure.

See [delivery configuration](delivery-configuration.md) and
[workflow authoring](workflow-authoring.md). No live success is claimed by this guide.
