import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Independently pinned source-review bytes, never a digest learned from input.
// This is an exact-template checker, NOT a YAML parser or an approval service.
// Run actionlint separately for real YAML/Actions syntax validation. These pins
// do not attest to policy/driver code, GitHub settings, reviewers or live Azure.
export const REFERENCE_SHA256 = "a1beed13bc48371224d44cd0be94ff67ab76a587d64289d34e308f12b5cfc8e4";
export const CLEANUP_REFERENCE_SHA256 = "42579434a903ca7221eb4476654f824f93b7abc08473fd87e83aea91fc8a5dd2";
export const COMPANION_SHA256 = Object.freeze({
  "agentalvine.yml": "67786c12d8f743153ed150167068885b477aa794aae376e08e797deb4ad9e090",
  "companion-checks.yml": "b6d569cb83404b27f5d50afe7d8d46817341519912adae810985aa08ba7baaef",
  "lab-checks.yml": "5cd61681c2c7d08fced5d77fc55a008d131632c54fa05b2b220108ef790349ac",
  "quality.yml": "8554cd27692cf727be126cc5837c9ba4244954bdf205ac544c8033c7ea4e4343",
});
const repository = fileURLToPath(new URL("../", import.meta.url));
const expectedNames = Object.freeze(["avm-delivery.yml", "avm-cleanup.yml", ...Object.keys(COMPANION_SHA256)].sort());
const jobNames = ["preflight", "validation", "plan", "apply", "followup", "drift"];
const inventoryError = "Workflow inventory differs: keep exactly one avm-delivery.yml, one dedicated avm-cleanup.yml and the four reviewed companions; unknown files/directories or renamed .yml/.yaml/.YML entries require review (possible duplicate live writer)";
const gate = "    if: vars.WORKSHOP_AZURE_ENABLED == 'true' && !github.event.repository.is_template && github.event.repository.private && github.ref == 'refs/heads/main' && github.ref_protected\n";

export function normalizeWorkflow(text) {
  assert.ok(typeof text === "string", "Workflow source must be UTF-8 text");
  const normalized = text.replaceAll("\r\n", "\n");
  assert.ok(!normalized.includes("\r") && !normalized.includes("\0"), "Unexpected control character in workflow source");
  // Only CRLF and ONE missing terminal newline are normalized. Preserve BOMs,
  // comments, indentation, trailing spaces and additional terminal blank lines.
  return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
}

export function workflowHash(text) {
  return createHash("sha256").update(normalizeWorkflow(text), "utf8").digest("hex");
}

function requireText(text, fragment, message) {
  assert.ok(text.includes(fragment), message);
}

function assertInventory(names) {
  assert.ok(names.length === expectedNames.length && expectedNames.every((name) => names.includes(name)), inventoryError);
}

function assertReferenceInvariants(reference, cleanup = false) {
  // ONLY called after the independent reference/companion pins and complete
  // canonical equality match. Literal slices EXPLAIN this reviewed specimen;
  // they must never be used to accept arbitrary YAML, aliases or expressions.
  const job = (name) => {
    const marker = `\n  ${name}:\n`;
    const start = reference.indexOf(marker);
    assert.ok(start >= 0, `Required AVM delivery job missing: ${name}`);
    const ends = jobNames.map((next) => reference.indexOf(`\n  ${next}:\n`, start + marker.length)).filter((end) => end >= 0);
    return reference.slice(start, ends.length ? Math.min(...ends) + 1 : undefined);
  };
  const header = reference.slice(0, reference.indexOf("\njobs:\n"));
  const actualJobs = [...reference.slice(reference.indexOf("\njobs:\n")).matchAll(/^  ([a-z]+):$/gm)].map((match) => match[1]);
  assert.deepEqual(actualJobs, cleanup ? ["preflight", "validation", "plan", "apply"] : jobNames, "Retain exactly the reviewed jobs for this route");
  if (cleanup) {
    requireText(header, "on:\n  workflow_dispatch:\n    inputs:\n      authorization:\n        description: 'destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>'\n        required: true\n        type: string\npermissions: {}\n", "Cleanup requires an explicit repository/SHA/state-bound string with no default");
    for (const forbidden of ["  push:", "  schedule:", "workflow_call:", "pull_request", "workflow_run:", "        default:", "      operation:"]) {
      assert.ok(!header.includes(forbidden), "Cleanup must never run automatically or accept a selectable operation/default authorization");
    }
  } else {
    requireText(header, "on:\n  push:\n    branches: [main]\n  workflow_dispatch:\n", "Deployment starts with a main push, not a PR or a second deploy button");
    requireText(header, "        options: [followup]\n        default: followup\n", "Only followup is a manual delivery operation");
    requireText(header, "  schedule:\n    - cron: '37 2 * * 2'\npermissions: {}\n", "Scheduled drift is distinct from deployment and permissions default to none");
    assert.ok(!reference.includes("destroy"), "Delivery must not contain a destroy input, job or driver branch");
  }
  requireText(header, "  group: ws2-avm-state-${{ vars.WS2_STATE_LOCK_ID || github.repository }}\n  cancel-in-progress: false\n", "Serialize the sole AVM state writer without cancellation");
  requireText(header, "  WS2_STATE_LOCK_ID: ${{ vars.WS2_STATE_LOCK_ID }}\n", "The helper must bind cleanup to the configured state lock ID");
  assert.ok(!header.includes("secrets.") && !header.includes("id-token:"), "Do not inherit environment secrets or OIDC permission into hosted validation");

  const preflight = job("preflight");
  const validation = job("validation");
  requireText(preflight, gate, "Keep the disabled/private/non-template/protected-main gate");
  requireText(preflight, "    permissions:\n      contents: read\n      actions: read\n      pull-requests: read\n", "Metadata preflight needs read-only repository, run and merged-PR access");
  requireText(preflight, "    timeout-minutes: 5\n", "Keep bounded metadata preflight");
  for (const section of [preflight, validation]) {
    requireText(section, "    runs-on: ubuntu-24.04\n", "Preflight and validation must use hosted runners");
    for (const forbidden of ["id-token:", "secrets.", "    environment:", "self-hosted", "ws2-trusted", "continue-on-error:"]) {
      assert.ok(!section.includes(forbidden), "Hosted preflight/validation must not acquire cloud credentials, environment secrets, trusted runners or an error bypass");
    }
  }
  requireText(preflight, "const policy = await import(pathToFileURL(resolve('scripts/avm-policy.mjs')).href);", "Use the existing AVM policy, not an inline substitute");
  const preflightCall = "const {operation} = await require('./scripts/avm-approval.cjs')({github,context,core,phase:'preflight'});";
  requireText(preflight, preflightCall, "The fixed-profile helper must select the operation and verify fresh repository/main/rules/PR/environment metadata");
  requireText(preflight, "policy.configuration({...process.env, OPERATION: operation});", "Validate configuration using the helper-selected operation before cloud work");
  assert.ok(preflight.indexOf(preflightCall) < preflight.indexOf("policy.configuration("), "Authorize before validating the operation's configuration");
  requireText(preflight, "      operation: ${{ steps.policy.outputs.operation }}\n", "Propagate the helper-selected operation");
  assert.ok(!reference.includes("assertEnvironmentProtection") && !reference.includes("policy.operationFor") && !reference.includes("REQUESTED_OPERATION"), "Do not retain obsolete inline reviewer requirements or alternate event routing");
  // The shared helper owns runtime identity, current-main, ruleset, merged-PR,
  // attempt and cleanup authorization checks. Never import it in this checker.

  // Unlike preflight, validation has no duplicated if-expression: its normal
  // success dependency on preflight propagates the gate, without always().
  requireText(validation, "    needs: preflight\n", "Validation must depend on gated preflight");
  requireText(validation, "    name: Validate reviewed AVM revision\n", "Keep the exact validation job name consumed by phase guards");
  requireText(validation, "    timeout-minutes: 20\n", "Keep bounded credential-free validation");
  assert.ok(!validation.includes("\n    if:"), "Do not bypass preflight's normal success dependency");
  requireText(validation, "    permissions:\n      contents: read\n    steps:\n", "Validation must be read-only with no environment secrets or OIDC grant");
  for (const command of ["npm test", "npm run kit:check", "npm run workflow:check", "npm run companion:check", "node scripts/check-learner.mjs"]) {
    requireText(validation, `      - run: ${command}\n`, `Same-SHA validation must execute ${command}`);
  }
  for (const name of ["preflight", "validation", "plan", "apply"]) {
    requireText(job(name), "          ref: ${{ github.sha }}\n          persist-credentials: false\n", "Check out the same immutable event SHA without persisted credentials");
  }
  for (const name of ["validation", "plan", "apply"]) {
    requireText(job(name), "          node-version: 24.16.0\n", "Retain the pinned Node runtime");
    requireText(job(name), "          terraform_version: 1.16.1\n          terraform_wrapper: false\n", "Retain the pinned unwrapped Terraform CLI");
  }

  const plan = job("plan");
  requireText(plan, "    name: Trusted AVM plan\n", "Keep the exact plan job name consumed by the apply guard");
  requireText(plan, "    needs: [preflight, validation]\n", "Privileged planning must wait for successful same-SHA validation");
  requireText(plan, "    environment: avm-plan\n", "Planning uses the distinct avm-plan environment");
  requireText(plan, "    timeout-minutes: 35\n", "Keep bounded privileged planning");
  requireText(plan, "      ARM_CLIENT_ID: ${{ vars.AZURE_PLAN_CLIENT_ID }}\n      OPERATION: ${{ needs.preflight.outputs.operation }}\n", "Planning uses its own identity and the policy operation");
  requireText(plan, "run: node scripts/avm-delivery.mjs plan\n", "Use the existing fixed-scope AVM plan driver");
  const planGuard = plan.indexOf("await require('./scripts/avm-approval.cjs')({github,context,core,phase:'plan'});");
  assert.ok(planGuard >= 0 && planGuard < plan.indexOf("uses: hashicorp/setup-terraform@") && planGuard < plan.indexOf("run: node scripts/avm-delivery.mjs plan"), "Recheck metadata and unique same-run/attempt/SHA successful validation before Terraform or OIDC work");
  const sealing = plan.indexOf("run: node scripts/plan-envelope.mjs seal");
  const upload = plan.indexOf("uses: actions/upload-artifact@");
  assert.ok(sealing >= 0 && upload > sealing, "Encrypt the saved plan before artifact upload");
  assert.ok(reference.split("uses: actions/upload-artifact@").length === 2, "There must be exactly one artifact upload, never an additional raw plan/state upload");
  requireText(plan, "          PLAN_ENCRYPTION_PUBLIC_KEY: ${{ vars.PLAN_ENCRYPTION_PUBLIC_KEY }}\n        run: node scripts/plan-envelope.mjs seal\n", "Keep the scoped public encryption key on the sealing step");
  requireText(plan, "          name: ${{ steps.plan.outputs.artifact }}\n          path: .workshop/sealed/plan.enc\n          include-hidden-files: true\n          if-no-files-found: error\n          retention-days: 1\n", "Upload only the encrypted envelope, fail on absence, retain for one day; no raw plan/state artifact");

  const apply = job("apply");
  requireText(apply, "    needs: [preflight, plan]\n", "Mutation consumes this run's successful plan");
  requireText(apply, `    if: needs.preflight.outputs.operation == '${cleanup ? "destroy" : "deploy"}' && needs.plan.result == 'success'\n`, "Each workflow can only apply its own authorized operation, never drift/followup");
  assert.ok(!reference.includes("\n  destroy:\n"), "Do not invent a separate destroy job or duplicate writer");
  requireText(apply, "    environment: avm-apply\n", "Mutation retains the distinct main-only apply environment and identity");
  requireText(apply, "    timeout-minutes: 40\n", "Keep bounded privileged mutation");
  requireText(apply, "      ARM_CLIENT_ID: ${{ vars.AZURE_APPLY_CLIENT_ID }}\n      OPERATION: ${{ needs.preflight.outputs.operation }}\n", "Keep the separate mutation identity and policy operation");
  for (const section of [plan, apply]) {
    requireText(section, "    runs-on: [self-hosted, linux, x64, ws2-trusted]\n", "Only the privileged jobs use the isolated trusted runner");
    requireText(section, "    permissions:\n      contents: read\n      actions: read\n      pull-requests: read\n      id-token: write\n", "Retain metadata reads and scoped OIDC on privileged jobs only");
    requireText(section, "      - if: always()\n        run: node scripts/avm-delivery.mjs clean\n", "Clean private local material even after a failure");
  }
  requireText(apply, "          name: ${{ needs.plan.outputs.artifact }}\n          path: .workshop/sealed\n", "Consume this run's encrypted plan artifact");
  assert.ok(!apply.includes("run-id:"), "Never select an artifact from a different run");
  requireText(apply, "          PLAN_DECRYPTION_PRIVATE_KEY: ${{ secrets.PLAN_DECRYPTION_PRIVATE_KEY }}\n        run: node scripts/plan-envelope.mjs open\n", "The decryption secret belongs only to the protected decrypt step");
  requireText(apply, "          EXPECTED_PLAN_HASH: ${{ needs.plan.outputs.plan_sha256 }}\n          EXPECTED_MANIFEST_HASH: ${{ needs.plan.outputs.manifest_sha256 }}\n          CURRENT_MAIN_SHA: ${{ steps.approval.outputs.main_sha }}\n          GH_READ_TOKEN: ${{ github.token }}\n", "Bind the existing driver to both exact hashes and authorization/current-main revalidation");
  const mutation = `        run: node scripts/avm-delivery.mjs ${cleanup ? "destroy" : "apply"}\n`;
  requireText(apply, mutation, "Use only this route's fixed driver phase; never execute arbitrary inputs or replan");
  const approval = apply.indexOf("await require('./scripts/avm-approval.cjs')({github,context,core});");
  const decrypt = apply.indexOf("run: node scripts/plan-envelope.mjs open");
  assert.ok(approval >= 0 && decrypt > approval && apply.indexOf(mutation) > decrypt, "Recheck scoped authorization and validation/plan jobs, then decrypt, then invoke the hash/current-main-bound driver");
  // The historical approval step ID preserves main_sha consumers; the helper
  // is authorization, not approval history. A source pin cannot authorize Azure.
  if (!cleanup) {
    requireText(job("followup"), "    if: needs.preflight.outputs.operation == 'followup' && needs.plan.result == 'success'\n", "Followup is a separate read-only confirmation");
    requireText(job("followup"), 'test "$PLAN_EXIT" = 0', "Only a fresh zero-exit plan proves no change");
    requireText(job("drift"), "    if: always() && needs.preflight.outputs.operation == 'drift' && (needs.plan.result != 'success' || needs.plan.outputs.exitcode == '2')\n", "Report failed drift assessment as well as differences, without applying");
  }
  return { sharedEnv: header.slice(header.indexOf("\nenv:\n")), validation };
}

export function validateWorkflowSources({ reference, cleanupReference, workflows }) {
  const reviewed = normalizeWorkflow(reference);
  const reviewedCleanup = normalizeWorkflow(cleanupReference);
  assert.ok(workflowHash(reviewed) === REFERENCE_SHA256, "Reference drift: restore the reviewed solutions/avm-delivery.yml; never update a pin just to pass");
  assert.ok(workflowHash(reviewedCleanup) === CLEANUP_REFERENCE_SHA256, "Cleanup reference drift: restore the independently reviewed solutions/avm-cleanup.yml; never update a pin just to pass");
  assert.ok(workflows && typeof workflows === "object" && !Array.isArray(workflows), "Supply the installed workflow inventory");
  const prototype = Object.getPrototypeOf(workflows);
  assert.ok(prototype === Object.prototype || prototype === null, "Supply a plain installed workflow inventory without inherited entries");
  assertInventory(Reflect.ownKeys(workflows));
  for (const name of expectedNames) {
    const descriptor = Object.getOwnPropertyDescriptor(workflows, name);
    assert.ok(descriptor && Object.hasOwn(descriptor, "value") && typeof descriptor.value === "string", "Workflow inventory entries must be plain text values, not accessors");
  }
  assert.ok(normalizeWorkflow(workflows["avm-delivery.yml"]) === reviewed, "Canonical avm-delivery.yml differs from the trusted reference: restore complete events, permissions, jobs and checks; do not edit the reference/checker to hide drift");
  assert.ok(normalizeWorkflow(workflows["avm-cleanup.yml"]) === reviewedCleanup, "Canonical avm-cleanup.yml differs from the trusted reference: restore the dedicated dispatch, explicit authorization and exact-plan gates");
  for (const [name, hash] of Object.entries(COMPANION_SHA256)) {
    assert.ok(workflowHash(workflows[name]) === hash, `Unreviewed companion workflow change: ${name}; do not repurpose a companion into another live writer`);
  }
  const delivery = assertReferenceInvariants(reviewed);
  const cleanup = assertReferenceInvariants(reviewedCleanup, true);
  assert.ok(delivery.sharedEnv === cleanup.sharedEnv && delivery.validation === cleanup.validation, "Cleanup must retain identical state/ARM mappings and every same-SHA validation command");
  return { deliverySha256: REFERENCE_SHA256, cleanupSha256: CLEANUP_REFERENCE_SHA256, deliveryWorkflows: 1, cleanupWorkflows: 1, companionWorkflows: 4 };
}

async function localRead(operation) {
  try {
    return await operation();
  } catch {
    // Native filesystem errors can contain attacker-chosen names/paths. Never
    // echo them, input bytes, secrets, raw plans or state in a public CI log.
    throw new Error("Workflow inputs are missing or unreadable; restore the six installed files and both reviewed solutions");
  }
}

async function checkedPath(path, directory) {
  const info = await localRead(() => lstat(path));
  if (directory) {
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), "Repository and workflow/reference folders must be real directories, not symbolic links");
  } else {
    assert.ok(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, "Workflow inputs must be regular single-link files, not symbolic links, hard links, directories or special files");
  }
  const actual = await localRead(() => realpath(path));
  assert.ok(relative(resolve(path), actual) === "", "Workflow paths must not traverse linked ancestors or escape the selected repository");
}

async function regularFile(path) {
  await checkedPath(path, false);
  const bytes = await localRead(() => readFile(path));
  const text = bytes.toString("utf8");
  assert.ok(Buffer.from(text, "utf8").equals(bytes), "Workflow source must be valid UTF-8 without lossy decoding");
  return text;
}

export async function readWorkflowSources(root = repository) {
  assert.ok(typeof root === "string" && root.length > 0, "Supply a repository directory");
  const base = resolve(root);
  await checkedPath(base, true);
  for (const folder of [".github", ".github/workflows", "solutions"]) await checkedPath(join(base, folder), true);
  const folder = join(base, ".github/workflows");
  // Inventory ALL entries, not just a regex subset of extensions. This rejects
  // unknown .yaml/.YML files, directories and links before any are followed.
  assertInventory(await localRead(() => readdir(folder)));
  const workflows = Object.create(null);
  for (const name of expectedNames) workflows[name] = await regularFile(join(folder, name));
  return { reference: await regularFile(join(base, "solutions/avm-delivery.yml")), cleanupReference: await regularFile(join(base, "solutions/avm-cleanup.yml")), workflows };
}

export async function checkWorkflow(root = repository) {
  return validateWorkflowSources(await readWorkflowSources(root));
}

// The pinned Node 24.16.0 supports import.meta.main. Comparing argv's spelling
// to import.meta.url would silently skip the CLI when invoked through a link.
if (import.meta.main) {
  try {
    assert.ok(process.argv.length === 2, "This read-only checker has no update, skip or override flags");
    const result = await checkWorkflow();
    console.log(`AVM workflow authoring passed: ${result.deliveryWorkflows} canonical delivery workflow; ${result.cleanupWorkflows} separately authorized cleanup workflow; ${result.companionWorkflows} reviewed companions. No Azure operations, approvals or live completion claimed. Run actionlint separately for syntax validation.`);
  } catch (error) {
    console.error(`AVM workflow authoring stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
