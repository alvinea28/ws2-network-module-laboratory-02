# AgentAlvine automatic lab toolkit

Original implementation inspired by the GitHub Skills copy → issue → activity → next-step pattern. The learning UI is the short README and **one updated issue body**, not a folder of evidence forms or a manual check command.

- Copying a non-template repo triggers startup. The guide creates the issue and replaces the README start marker with its link.
- Pushes, issues, PRs/reviews, releases and completed CI trigger checks. Current task/checklist/feedback are updated in place. Comments are only brief history notices.
- Reporter checks out **only the default branch** and reads learner files via the contents API at immutable SHAs. It never runs Terraform/student scripts or reads their artifacts. Separate hosted read-only CI validates code with no Azure/OIDC/state/secrets.
- Links to learner artifacts use that observed SHA, including authored API docs and workflow files. Supplied solution/exercise/script/instructor references remain on the trusted default branch. Lesson code is never loaded from a PR.
- Pending Actions events can be coalesced even with cancellation disabled. A surviving event reconciles consecutive satisfied checks at one immutable revision, stops at the first unmet requirement, and never grants progress merely because an event existed. A completed same-copy current-default push-CI event can recover a lost startup; live branch-head validation rejects stale/fork events while allowing newer CI after a lost push.
- Prose matching is case-sensitive unless a specific Markdown file check opts into `caseInsensitive`. HCL, JSON answers, regex structure and security/approval checks remain exact. Missing-text feedback names the unmet literal rather than a generic part.
- Lab 4's published `node scripts/generate-docs.mjs` command and its read-only `--check` use one pinned terraform-docs renderer. Authoring verification exercises that exact command twice and rejects stale/wrapped output; copying a finished reference table is not sufficient verification.
- Template maintenance is inert. Instructor Preview creates a clearly labelled non-grading demonstration. Copied repositories use the actual default branch; no mandatory branch rename for offline labs.
- README updates respect branch protection; if blocked, the issue still works through Issues. Settings without Actions events have a single optional Check progress fallback.
- Lab 7 retains the instructor-enabled protected-main delivery system. A changed reviewed module/input marker reopens a completed delivery issue with a new cycle; baseline runs cannot prove a later capstone.

Source templates are private; participants must have access to copy them and available Actions minutes. Advanced instructor guides are optional reading, not landing-page prerequisites. Workshop completion and Azure approvals remain human decisions.
