import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { link, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkWorkflow, CLEANUP_REFERENCE_SHA256, COMPANION_SHA256, normalizeWorkflow, readWorkflowSources, REFERENCE_SHA256, validateWorkflowSources, workflowHash } from "../scripts/check-avm-workflow.mjs";

// Actual local reference, text mutations and disposable filesystem fixtures.
// The only child process is this read-only checker under process.execPath.
// No YAML-parser claims, network, Git, Terraform, cloud calls or fake approvals;
// never import/execute the delivery, approval, policy or encryption drivers.
const sources = await readWorkflowSources();
const canonical = normalizeWorkflow(sources.workflows["avm-delivery.yml"]);
const cleanupCanonical = normalizeWorkflow(sources.workflows["avm-cleanup.yml"]);
const fresh = () => structuredClone(sources);
const jobNames = ["preflight", "validation", "plan", "apply", "followup", "drift"];
const routes = ["avm-delivery.yml", "avm-cleanup.yml"];
const names = [...routes, ...Object.keys(COMPANION_SHA256)].sort();
const inputs = [...names.map((name) => `.github/workflows/${name}`), ...routes.map((name) => `solutions/${name}`)];
const expectedResult = { deliverySha256: REFERENCE_SHA256, cleanupSha256: CLEANUP_REFERENCE_SHA256, deliveryWorkflows: 1, cleanupWorkflows: 1, companionWorkflows: 4 };
const script = fileURLToPath(new URL("../scripts/check-avm-workflow.mjs", import.meta.url));
const repository = fileURLToPath(new URL("../", import.meta.url));
const directoryLinkType = process.platform === "win32" ? "junction" : "dir";

function section(name, source = canonical) {
  const marker = `\n  ${name}:\n`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, "Mutation must target a real reviewed job");
  const ends = jobNames.map((next) => source.indexOf(`\n  ${next}:\n`, start + marker.length)).filter((end) => end >= 0);
  // Include the final step's newline, without consuming the next job header.
  const end = ends.length ? Math.min(...ends) + 1 : source.length;
  return { start, end, text: source.slice(start, end) };
}

function changed(from, to, jobName, file = "avm-delivery.yml") {
  const source = normalizeWorkflow(sources.workflows[file]);
  const scope = jobName ? section(jobName, source) : { start: 0, end: source.length, text: source };
  assert.ok(scope.text.includes(from) && from !== to, "Mutation must change a real source fragment");
  const input = fresh();
  input.workflows[file] = source.slice(0, scope.start) + scope.text.replace(from, to) + source.slice(scope.end);
  return input;
}

const reject = (from, to, jobName, file) => assert.throws(() => validateWorkflowSources(changed(from, to, jobName, file)), /differs from the trusted reference/);
const rejectCleanup = (from, to, jobName) => reject(from, to, jobName, "avm-cleanup.yml");

async function temporary(t, prefix = "ws2-avm-workflow-") {
  // Canonicalize the system temp parent, so a platform temp-directory alias is
  // not confused with the deliberately linked-path negative fixtures below.
  const root = await mkdtemp(join(await realpath(tmpdir()), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function fixture(t) {
  const root = await temporary(t);
  await mkdir(join(root, ".github/workflows"), { recursive: true });
  await mkdir(join(root, "solutions"));
  for (const [name, text] of Object.entries(sources.workflows)) await writeFile(join(root, ".github/workflows", name), text);
  await writeFile(join(root, "solutions/avm-delivery.yml"), sources.reference);
  await writeFile(join(root, "solutions/avm-cleanup.yml"), sources.cleanupReference);
  return root;
}

async function inputBytes(root) {
  return Promise.all(inputs.map(async (name) => [name, (await readFile(join(root, name))).toString("base64")]));
}

async function fixtureTree(root) {
  const result = [];
  async function walk(folder, prefix = "") {
    for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = join(prefix, entry.name);
      assert.ok(!entry.isSymbolicLink(), "Read-only CLI fixture snapshots must not traverse links");
      if (entry.isDirectory()) {
        result.push([name, "directory"]);
        await walk(join(folder, entry.name), name);
      } else {
        assert.ok(entry.isFile(), "Read-only CLI fixture snapshots contain only ordinary files");
        result.push([name, (await readFile(join(folder, entry.name))).toString("base64")]);
      }
    }
  }
  await walk(root);
  return result;
}

function cli(file, cwd, args = []) {
  return spawnSync(process.execPath, [file, ...args], { cwd, encoding: "utf8", shell: false, timeout: 30_000 });
}

test("six installed workflows retain independent delivery/cleanup pins and four unchanged companions", async () => {
  assert.equal(REFERENCE_SHA256, "a1beed13bc48371224d44cd0be94ff67ab76a587d64289d34e308f12b5cfc8e4");
  assert.equal(CLEANUP_REFERENCE_SHA256, "42579434a903ca7221eb4476654f824f93b7abc08473fd87e83aea91fc8a5dd2");
  assert.notEqual(REFERENCE_SHA256, CLEANUP_REFERENCE_SHA256);
  assert.deepEqual(await checkWorkflow(), expectedResult);
  assert.equal(workflowHash(sources.reference), REFERENCE_SHA256);
  assert.equal(workflowHash(sources.cleanupReference), CLEANUP_REFERENCE_SHA256);
  assert.equal(canonical, normalizeWorkflow(sources.reference));
  assert.equal(cleanupCanonical, normalizeWorkflow(sources.cleanupReference));
  assert.deepEqual(Object.keys(sources.workflows).sort(), names);
  assert.equal(Object.isFrozen(COMPANION_SHA256), true);
  for (const [name, pin] of Object.entries(COMPANION_SHA256)) assert.equal(workflowHash(sources.workflows[name]), pin);
  assert.equal(Object.hasOwn(sources.workflows, "solutions/avm-delivery.yml"), false);
  assert.equal(Object.hasOwn(sources.workflows, "solutions/avm-cleanup.yml"), false);
});

test("CRLF and a missing terminal newline are the only accepted source normalization", () => {
  for (const transform of [(text) => text, (text) => text.replaceAll("\n", "\r\n"), (text) => text.slice(0, -1), (text) => text.slice(0, -1).replaceAll("\n", "\r\n")]) {
    const input = fresh();
    input.reference = transform(normalizeWorkflow(input.reference));
    input.cleanupReference = transform(normalizeWorkflow(input.cleanupReference));
    for (const name of names) input.workflows[name] = transform(normalizeWorkflow(input.workflows[name]));
    assert.doesNotThrow(() => validateWorkflowSources(input));
  }
  const mixed = fresh();
  mixed.reference = normalizeWorkflow(mixed.reference).replaceAll("\n", "\r\n");
  mixed.cleanupReference = normalizeWorkflow(mixed.cleanupReference).replaceAll("\n", "\r\n");
  mixed.workflows["avm-delivery.yml"] = canonical.slice(0, -1);
  mixed.workflows["avm-cleanup.yml"] = cleanupCanonical.slice(0, -1);
  assert.doesNotThrow(() => validateWorkflowSources(mixed));
  assert.equal(normalizeWorkflow("a\r\nb"), "a\nb\n");
});

test("normalization preserves BOMs, comments, indentation, trailing spaces and extra blank lines", () => {
  assert.equal(normalizeWorkflow("\ufeff  x: y \r\n\r\n"), "\ufeff  x: y \n\n");
  for (const text of [`\ufeff${canonical}`, `${canonical}\n`, canonical.replace("  push:\n", " push:\n"), canonical.replace("name: Trusted AVM", "name:  Trusted AVM"), `${canonical}# unreviewed comment\n`]) {
    const input = fresh(); input.workflows["avm-delivery.yml"] = text;
    assert.throws(() => validateWorkflowSources(input), /differs from the trusted reference/);
  }
  for (const name of names) {
    const input = fresh(); input.workflows[name] = `${normalizeWorkflow(input.workflows[name])}\n`;
    assert.throws(() => validateWorkflowSources(input), /trusted reference|Unreviewed companion/);
  }
});

test("bare carriage returns, NUL and non-text workflow inputs fail without lossy normalization", () => {
  for (const text of ["name:\runsafe", "name:\0unsafe"]) assert.throws(() => normalizeWorkflow(text), /control character/);
  for (const value of [undefined, null, 1, {}, Buffer.from("name: ignored")]) assert.throws(() => normalizeWorkflow(value), /must be UTF-8 text/);
});

test("malformed YAML, duplicate keys, aliases and extra documents are rejected by exact bytes, not regex-parsed", () => {
  reject("branches: [main]", "branches: [main");
  reject("jobs:\n", "jobs: [\n");
  reject("permissions: {}\n", "permissions: {}\npermissions: write-all\n");
  reject("on:\n", "on: *unreviewed\non:\n");
  const input = fresh(); input.workflows["avm-delivery.yml"] += "\n---\non: push\njobs: {}\n";
  assert.throws(() => validateWorkflowSources(input), /differs from the trusted reference/);
});

test("non-main, wildcard, PR and reusable-workflow delivery events cannot replace the reviewed route", () => {
  for (const branch of ["dev", "main, dev", "'*'", "'lab/**'"]) reject("branches: [main]", `branches: [${branch}]`);
  for (const event of ["pull_request", "pull_request_target", "workflow_call", "workflow_run"]) reject("on:\n", `on:\n  ${event}:\n`);
});

test("each disabled, non-template, private, main and protected-ref gate is mandatory", () => {
  for (const file of routes) {
    for (const fragment of ["vars.WORKSHOP_AZURE_ENABLED == 'true' && ", "!github.event.repository.is_template && ", "github.event.repository.private && ", "github.ref == 'refs/heads/main' && ", " && github.ref_protected"]) reject(fragment, "", "preflight", file);
    reject("const {operation} = await require('./scripts/avm-approval.cjs')({github,context,core,phase:'preflight'});", "const operation = 'deploy';", "preflight", file);
  }
});

test("main, attempt, rules, merged-PR, environment and operation checks stay delegated to the fixed-profile helper", () => {
  for (const file of routes) {
    reject("scripts/avm-policy.mjs", "scripts/other-policy.mjs", "preflight", file);
    reject("scripts/avm-approval.cjs", "scripts/approval.cjs", "preflight", file);
    reject("{github,context,core,phase:'preflight'}", "{github,context:{...context,sha:'unbound'},core,phase:'preflight'}", "preflight", file);
    reject("{github,context,core,phase:'preflight'}", "{github,context,core,phase:'preflight',env:{...process.env,GITHUB_RUN_ATTEMPT:'1'}}", "preflight", file);
    reject("policy.configuration({...process.env, OPERATION: operation});", "", "preflight", file);
    reject("policy.configuration({...process.env, OPERATION: operation});", "policy.configuration({...process.env, GITHUB_RUN_ATTEMPT: '1', OPERATION: operation});", "preflight", file);
    reject("phase:'preflight'", "phase:'apply'", "preflight", file);
    reject("operation: ${{ steps.policy.outputs.operation }}", "operation: deploy", "preflight", file);
  }
});

test("unsafe workflow/job permissions and failure bypasses are rejected", () => {
  reject("permissions: {}", "permissions: write-all");
  reject("      actions: read", "      actions: write", "preflight");
  reject("      contents: read", "      contents: write", "validation");
  for (const name of ["preflight", "validation", "plan", "apply"]) reject(`  ${name}:\n`, `  ${name}:\n    continue-on-error: true\n`, name);
});

test("validation cannot bypass preflight and the privileged plan must depend on successful validation", () => {
  reject("    needs: preflight\n", "    needs: []\n", "validation");
  reject("  validation:\n", "  validation:\n    if: always()\n", "validation");
  reject("    needs: [preflight, validation]\n", "    needs: preflight\n", "plan");
  reject("  plan:\n", "  plan:\n    if: always()\n", "plan");
  reject("    needs: [preflight, plan]\n", "    needs: preflight\n", "apply");
});

test("hosted validation cannot omit or neutralize any test, kit, workflow, companion or required learner check", () => {
  for (const file of routes) for (const command of ["npm test", "npm run kit:check", "npm run workflow:check", "npm run companion:check", "node scripts/check-learner.mjs"]) {
    reject(`      - run: ${command}\n`, "", "validation", file);
    reject(`      - run: ${command}\n`, `      - run: ${command} || true\n`, "validation", file);
  }
});

test("hosted validation cannot acquire OIDC, secrets, environments or trusted runners", () => {
  reject("      contents: read\n", "      contents: read\n      id-token: write\n", "validation");
  for (const extra of ["    environment: avm-apply\n", "    env: {KEY: '${{ secrets.PLAN_DECRYPTION_PRIVATE_KEY }}'}\n", "    runs-on: [self-hosted, linux, x64, ws2-trusted]\n"]) reject("  validation:\n", `  validation:\n${extra}`, "validation");
  reject("env:\n", "env:\n  KEY: ${{ secrets.PLAN_DECRYPTION_PRIVATE_KEY }}\n");
});

test("every checkout keeps the immutable event SHA and does not persist credentials", () => {
  for (const name of ["preflight", "validation", "plan", "apply"]) {
    for (const ref of ["main", "${{ github.event.pull_request.head.sha }}", "${{ github.event.repository.default_branch }}"]) reject("ref: ${{ github.sha }}", `ref: ${ref}`, name);
    reject("persist-credentials: false", "persist-credentials: true", name);
  }
});

test("Node, Terraform and immutable action revisions cannot drift", () => {
  for (const name of ["validation", "plan", "apply"]) {
    reject("node-version: 24.16.0", "node-version: latest", name);
    reject("terraform_version: 1.16.1", "terraform_version: latest", name);
    reject("terraform_wrapper: false", "terraform_wrapper: true", name);
  }
  reject("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1", "actions/checkout@main", "validation");
  reject("actions/setup-node@820762786026740c76f36085b0efc47a31fe5020", "actions/setup-node@main", "validation");
});

test("planning stays in avm-plan with its separate identity and fixed-scope driver", () => {
  reject("    environment: avm-plan\n", "    environment: avm-apply\n", "plan");
  reject("${{ vars.AZURE_PLAN_CLIENT_ID }}", "${{ vars.AZURE_APPLY_CLIENT_ID }}", "plan");
  reject("node scripts/avm-delivery.mjs plan", "terraform plan", "plan");
  reject("${{ needs.preflight.outputs.operation }}", "deploy", "plan");
});

test("only one encrypted artifact is uploaded, with one-day retention and failure on absence", () => {
  reject("run: node scripts/plan-envelope.mjs seal", "run: echo skip-sealing", "plan");
  for (const path of [".workshop/private", "avm/terraform.tfstate", ".workshop/**", "."]) reject("path: .workshop/sealed/plan.enc", `path: ${path}`, "plan");
  reject("retention-days: 1", "retention-days: 90", "plan");
  reject("if-no-files-found: error", "if-no-files-found: warn", "plan");
  reject("      - if: always()\n", "      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a\n        with:\n          path: .workshop/private\n      - if: always()\n", "plan");
});

test("mutation retains fresh scoped authorization before decryption and driver execution", () => {
  reject("environment: avm-apply", "environment: unprotected", "apply");
  reject("await require('./scripts/avm-approval.cjs')({github,context,core});", "", "apply");
  reject("run: node scripts/plan-envelope.mjs open", "run: echo skip-decryption", "apply");
  const approvalStart = canonical.indexOf("      - name: Verify scoped authorization and current main\n");
  const decryptStart = canonical.indexOf("      - name: Decrypt only after authorization\n");
  const mutationStart = canonical.indexOf("      - name: Apply exact plan and verify real Azure configuration\n");
  assert.ok(approvalStart >= 0 && decryptStart > approvalStart && mutationStart > decryptStart);
  const input = fresh();
  input.workflows["avm-delivery.yml"] = canonical.slice(0, approvalStart) + canonical.slice(decryptStart, mutationStart) + canonical.slice(approvalStart, decryptStart) + canonical.slice(mutationStart);
  assert.throws(() => validateWorkflowSources(input), /differs from the trusted reference/);
});

test("mutation must consume the same-run artifact and both hashes with the authorized current-main binding", () => {
  for (const binding of ["${{ needs.plan.outputs.artifact }}", "${{ needs.plan.outputs.plan_sha256 }}", "${{ needs.plan.outputs.manifest_sha256 }}", "${{ steps.approval.outputs.main_sha }}"]) reject(binding, "unbound-value", "apply");
  reject("          path: .workshop/sealed\n", "          path: .workshop/sealed\n          run-id: 123\n", "apply");
  reject("${{ vars.AZURE_APPLY_CLIENT_ID }}", "${{ vars.AZURE_PLAN_CLIENT_ID }}", "apply");
  reject("          GH_READ_TOKEN: ${{ github.token }}\n", "", "apply");
});

test("delivery preserves automatic exact-plan apply with followup-only dispatch and no destruction", () => {
  assert.ok(!canonical.includes("destroy"));
  reject("options: [followup]", "options: [deploy, followup]");
  reject("options: [followup]", "options: [followup, destroy]");
  reject("needs.preflight.outputs.operation == 'deploy'", "github.event_name == 'workflow_dispatch'", "apply");
  reject("needs.preflight.outputs.operation == 'deploy'", "needs.preflight.outputs.operation == 'drift'", "apply");
  reject("needs.preflight.outputs.operation == 'deploy'", "needs.preflight.outputs.operation == 'destroy'", "apply");
  reject("node scripts/avm-delivery.mjs apply", "node scripts/avm-delivery.mjs destroy", "apply");
  reject("node scripts/avm-delivery.mjs apply", "terraform apply -auto-approve", "apply");
  const input = fresh(); input.workflows["avm-delivery.yml"] += section("apply").text.replace("\n  apply:\n", "\n  destroy:\n");
  assert.throws(() => validateWorkflowSources(input), /differs from the trusted reference/);
});

test("followup/drift stay non-mutating and neither state serialization nor cleanup is weakened", () => {
  reject('test "$PLAN_EXIT" = 0', "true", "followup");
  reject("needs.plan.result != 'success' || ", "", "drift");
  reject("pull-requests: read", "pull-requests: none", "apply");
  reject("needs.plan.outputs.exitcode == '2'", "always()", "drift");
  reject("  drift:\n", "  drift:\n    environment: avm-apply\n", "drift");
  reject("cancel-in-progress: false", "cancel-in-progress: true");
  reject("group: ws2-avm-state-${{ vars.WS2_STATE_LOCK_ID || github.repository }}", "group: per-run-${{ github.run_id }}");
  for (const name of ["plan", "apply"]) reject("      - if: always()\n        run: node scripts/avm-delivery.mjs clean\n", "", name);
});

test("both routes retain exact helper job names, metadata permissions and phase calls", () => {
  for (const file of routes) {
    reject("name: Validate reviewed AVM revision", "name: Unbound validation", "validation", file);
    reject("name: Trusted AVM plan", "name: Unbound plan", "plan", file);
    for (const name of ["preflight", "plan", "apply"]) {
      for (const permission of ["contents", "actions", "pull-requests"]) reject(`      ${permission}: read\n`, "", name, file);
    }
    const call = "await require('./scripts/avm-approval.cjs')({github,context,core,phase:'plan'});";
    reject(call, "", "plan", file);
    reject("phase:'plan'", "phase:'preflight'", "plan", file);
    reject("{github,context,core,phase:'plan'}", "{github,context,core,phase:'plan',env:{...process.env,GITHUB_SHA:'unbound'}}", "plan", file);
    reject("await require('./scripts/avm-approval.cjs')({github,context,core});", "await require('./scripts/avm-approval.cjs')({github,context,core,phase:'preflight'});", "apply", file);
  }
});

test("metadata plan guards cannot move behind Terraform setup or OIDC planning", () => {
  for (const file of routes) {
    const source = normalizeWorkflow(sources.workflows[file]);
    const plan = section("plan", source);
    const start = source.indexOf("      - name: Verify current main and same-run validation\n", plan.start);
    const end = source.indexOf("      - uses: actions/setup-node@", start);
    const afterDriver = source.indexOf("      - name: Encrypt saved plan before upload\n", end);
    assert.ok(start >= plan.start && end > start && afterDriver > end);
    const input = fresh();
    input.workflows[file] = source.slice(0, start) + source.slice(end, afterDriver) + source.slice(start, end) + source.slice(afterDriver);
    assert.throws(() => validateWorkflowSources(input), /differs from the trusted reference/);
  }
});

test("dedicated cleanup is dispatch-only with required explicit repository/SHA/state authorization and no default", () => {
  assert.equal(cleanupCanonical.slice(cleanupCanonical.indexOf("on:\n"), cleanupCanonical.indexOf("permissions: {}\n")), "on:\n  workflow_dispatch:\n    inputs:\n      authorization:\n        description: 'destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>'\n        required: true\n        type: string\n");
  for (const event of ["push", "pull_request", "pull_request_target", "workflow_run", "workflow_call", "schedule"]) rejectCleanup("on:\n", `on:\n  ${event}:\n`);
  rejectCleanup("on:\n  workflow_dispatch:", "on: [push]\nunreviewed:");
  rejectCleanup("        required: true\n", "        required: false\n");
  rejectCleanup("        type: string\n", "        type: boolean\n");
  rejectCleanup("      authorization:\n", "      operation:\n");
  rejectCleanup("on:\n", "on: *broad-triggers\non:\n");
  const extra = fresh(); extra.workflows["avm-cleanup.yml"] += "\n---\non: push\njobs: {}\n";
  assert.throws(() => validateWorkflowSources(extra), /differs from the trusted reference/);
});

test("wrong, stale or synthesized cleanup authorization cannot be embedded in the exact workflow", () => {
  const call = "const {operation} = await require('./scripts/avm-approval.cjs')({github,context,core,phase:'preflight'});";
  // These are source-level negative fixtures, NOT runtime authorization claims.
  for (const value of ["", "destroy", `destroy:1379149907:${"a".repeat(40)}:owned-state`, `destroy:1379147533:${"b".repeat(40)}:stale-state`]) {
    rejectCleanup("        type: string\n", `        type: string\n        default: '${value}'\n`);
    rejectCleanup(call, `context.payload.inputs.authorization = '${value}';\n            ${call}`, "preflight");
  }
  rejectCleanup("1379147533", "1379149907");
  rejectCleanup("{github,context,core,phase:'preflight'}", "{github,context:{...context,payload:{...context.payload,inputs:{authorization:'destroy'}}},core,phase:'preflight'}", "preflight");
  rejectCleanup("  WS2_STATE_LOCK_ID: ${{ vars.WS2_STATE_LOCK_ID }}\n", "");
  rejectCleanup("WS2_STATE_LOCK_ID: ${{ vars.WS2_STATE_LOCK_ID }}", "WS2_STATE_LOCK_ID: another-state");
});

test("cleanup preserves the same state writer, hosted validation, privileged identities and environment scopes", () => {
  const sharedEnv = (text) => text.slice(text.indexOf("\nenv:\n"), text.indexOf("\njobs:\n"));
  assert.equal(sharedEnv(cleanupCanonical), sharedEnv(canonical));
  assert.equal(section("validation", cleanupCanonical).text, section("validation").text);
  rejectCleanup("group: ws2-avm-state-${{ vars.WS2_STATE_LOCK_ID || github.repository }}", "group: separate-cleanup-${{ github.run_id }}");
  rejectCleanup("cancel-in-progress: false", "cancel-in-progress: true");
  for (const binding of ["STATE_STORAGE_ACCOUNT", "STATE_CONTAINER", "STATE_KEY", "WORKLOAD_RG", "ARM_SUBSCRIPTION_ID", "ARM_TENANT_ID"]) rejectCleanup(`  ${binding}:`, `  UNBOUND_${binding}:`);
  for (const name of ["preflight", "validation", "plan", "apply"]) {
    rejectCleanup("ref: ${{ github.sha }}", "ref: main", name);
    rejectCleanup("persist-credentials: false", "persist-credentials: true", name);
    rejectCleanup(`  ${name}:\n`, `  ${name}:\n    continue-on-error: true\n`, name);
  }
  for (const name of ["preflight", "validation"]) {
    rejectCleanup("      contents: read\n", "      contents: read\n      id-token: write\n", name);
    rejectCleanup("runs-on: ubuntu-24.04", "runs-on: [self-hosted, linux, x64, ws2-trusted]", name);
    rejectCleanup(`  ${name}:\n`, `  ${name}:\n    environment: avm-apply\n`, name);
  }
  rejectCleanup("needs: [preflight, validation]", "needs: preflight", "plan");
  rejectCleanup("environment: avm-plan", "environment: avm-apply", "plan");
  rejectCleanup("${{ vars.AZURE_PLAN_CLIENT_ID }}", "${{ vars.AZURE_APPLY_CLIENT_ID }}", "plan");
  rejectCleanup("${{ vars.AZURE_APPLY_CLIENT_ID }}", "${{ vars.AZURE_PLAN_CLIENT_ID }}", "apply");
  rejectCleanup("environment: avm-apply", "environment: unprotected", "apply");
  for (const name of ["plan", "apply"]) rejectCleanup("      - if: always()\n        run: node scripts/avm-delivery.mjs clean\n", "", name);
});

test("cleanup can only seal and consume its exact same-run destroy plan after fresh authorization", () => {
  rejectCleanup("node scripts/avm-delivery.mjs plan", "terraform plan -destroy", "plan");
  rejectCleanup("run: node scripts/plan-envelope.mjs seal", "run: echo skip-sealing", "plan");
  rejectCleanup("path: .workshop/sealed/plan.enc", "path: .workshop/private", "plan");
  rejectCleanup("needs.preflight.outputs.operation == 'destroy'", "needs.preflight.outputs.operation == 'deploy'", "apply");
  rejectCleanup("node scripts/avm-delivery.mjs destroy", "node scripts/avm-delivery.mjs apply", "apply");
  rejectCleanup("node scripts/avm-delivery.mjs destroy", "terraform destroy -auto-approve", "apply");
  for (const binding of ["${{ needs.plan.outputs.artifact }}", "${{ needs.plan.outputs.plan_sha256 }}", "${{ needs.plan.outputs.manifest_sha256 }}", "${{ steps.approval.outputs.main_sha }}", "${{ github.token }}"]) rejectCleanup(binding, "unbound", "apply");
  rejectCleanup("          path: .workshop/sealed\n", "          path: .workshop/sealed\n          run-id: 123\n", "apply");
  rejectCleanup("await require('./scripts/avm-approval.cjs')({github,context,core});", "", "apply");
  const guard = cleanupCanonical.indexOf("      - name: Recheck explicit cleanup authorization and current main\n");
  const decrypt = cleanupCanonical.indexOf("      - name: Decrypt only after authorization\n");
  const mutation = cleanupCanonical.indexOf("      - name: Apply exact destroy plan and verify owned resource absence\n");
  assert.ok(guard >= 0 && decrypt > guard && mutation > decrypt);
  const input = fresh();
  input.workflows["avm-cleanup.yml"] = cleanupCanonical.slice(0, guard) + cleanupCanonical.slice(decrypt, mutation) + cleanupCanonical.slice(guard, decrypt) + cleanupCanonical.slice(mutation);
  assert.throws(() => validateWorkflowSources(input), /differs from the trusted reference/);
});

test("cleanup reference equality cannot learn broad triggers, wrong authorization or changed control bytes", () => {
  for (const [from, to] of [["on:\n", "on:\n  push:\n"], ["required: true", "required: false"], ["1379147533", "1379149907"], ["cancel-in-progress: false", "cancel-in-progress: true"], ["phase:'plan'", "phase:'preflight'"]]) {
    const input = changed(from, to, undefined, "avm-cleanup.yml");
    input.cleanupReference = input.workflows["avm-cleanup.yml"];
    assert.throws(() => validateWorkflowSources(input), /Cleanup reference drift/);
  }
  const input = fresh(); input.cleanupReference += "# unreviewed cleanup reference\n";
  assert.throws(() => validateWorkflowSources(input), /Cleanup reference drift/);
});

test("stale delivery or cleanup pins fail on exact matching workflow/reference fixtures without repair", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "scripts"));
  const copied = join(root, "scripts/check-avm-workflow.mjs");
  const source = await readFile(script, "utf8");
  for (const [name, pin, stale, error] of [["REFERENCE_SHA256", REFERENCE_SHA256, "a4c51088b733919d0d18eebe8af3e980b5973a10144506e7e1184310faf2bbda", /Reference drift/], ["CLEANUP_REFERENCE_SHA256", CLEANUP_REFERENCE_SHA256, "0".repeat(64), /Cleanup reference drift/]]) {
    const from = `export const ${name} = "${pin}";`;
    assert.ok(source.includes(from));
    await writeFile(copied, source.replace(from, `export const ${name} = "${stale}";`));
    const before = await fixtureTree(root);
    const result = cli(copied, root);
    assert.equal(result.status, 1); assert.equal(result.stdout, ""); assert.match(result.stderr, error);
    assert.deepEqual(await fixtureTree(root), before);
  }
});

test("duplicate writers and even harmless unknown files fail regardless of extension or spelling", () => {
  for (const name of ["second-delivery.yml", "deploy.yaml", "WRITER.YML", "duplicate.YaMl", "extra-check.yml", "notes.txt", "nested/writer.yml", "../escape.yml"]) {
    const input = fresh(); input.workflows[name] = canonical;
    assert.throws(() => validateWorkflowSources(input), /inventory differs.*possible duplicate live writer/);
  }
});

test("all six installed entries are required with their exact canonical filenames", () => {
  for (const name of names) {
    const input = fresh(); delete input.workflows[name];
    assert.throws(() => validateWorkflowSources(input), /inventory differs/);
  }
  for (const replacement of ["delivery.yml", "avm-delivery.yaml", "AVM-DELIVERY.YML"]) {
    const input = fresh(); input.workflows[replacement] = input.workflows["avm-delivery.yml"]; delete input.workflows["avm-delivery.yml"];
    assert.throws(() => validateWorkflowSources(input), /inventory differs/);
  }
});

test("inventories cannot hide inherited, symbolic, non-enumerable or accessor entries", () => {
  for (const value of [null, [], "ignored", undefined]) {
    const input = fresh(); input.workflows = value;
    assert.throws(() => validateWorkflowSources(input), /installed workflow inventory/);
  }
  const inherited = fresh(); Object.setPrototypeOf(inherited.workflows, { hidden: canonical });
  assert.throws(() => validateWorkflowSources(inherited), /without inherited entries/);
  for (const key of [Symbol("extra"), "hidden.yml"]) {
    const input = fresh(); Object.defineProperty(input.workflows, key, { value: canonical, enumerable: false });
    assert.throws(() => validateWorkflowSources(input), /inventory differs/);
  }
  const accessor = fresh(); let called = false;
  Object.defineProperty(accessor.workflows, "quality.yml", { get() { called = true; return sources.workflows["quality.yml"]; } });
  assert.throws(() => validateWorkflowSources(accessor), /not accessors/);
  assert.equal(called, false);
});

test("none of the four pinned companions can be repurposed or silently edited", () => {
  for (const name of Object.keys(COMPANION_SHA256)) {
    for (const text of [canonical, `${normalizeWorkflow(sources.workflows[name])}# changed companion\n`]) {
      const input = fresh(); input.workflows[name] = text;
      assert.throws(() => validateWorkflowSources(input), /Unreviewed companion workflow change/);
    }
  }
});

test("matching reference and canonical drift is still rejected by the independent hard-coded pin", () => {
  for (const [from, to] of [["branches: [main]", "branches: [dev]"], ["permissions: {}", "permissions: write-all"], ["jobs:\n", "jobs: [\n"], ["cancel-in-progress: false", "cancel-in-progress: true"], ["# Repository-scoped serialization", "# Altered comment"]]) {
    const input = changed(from, to); input.reference = input.workflows["avm-delivery.yml"];
    assert.throws(() => validateWorkflowSources(input), /Reference drift/);
  }
  const input = fresh(); input.reference += "# reference-only drift\n";
  assert.throws(() => validateWorkflowSources(input), /Reference drift/);
});

test("failure diagnostics do not echo untrusted workflow text, secret-like content or inventory names", () => {
  const sentinel = "UNTRUSTED-SECRET-LIKE-CONTENT-MUST-NOT-BE-ECHOED";
  const privateError = (error) => {
    assert.ok(!String(error.stack).includes(sentinel) && !JSON.stringify(error).includes(sentinel), "Failure must not disclose input text");
    return true;
  };
  const reference = fresh(); reference.reference = sentinel;
  assert.throws(() => validateWorkflowSources(reference), privateError);
  for (const name of names) {
    const input = fresh(); input.workflows[name] = `name: ${sentinel}\n`;
    assert.throws(() => validateWorkflowSources(input), privateError);
  }
  const extra = fresh(); extra.workflows[`${sentinel}.yaml`] = sentinel;
  assert.throws(() => validateWorkflowSources(extra), privateError);
});

test("native inventory rejects duplicate .yaml/.YML files, extra directories and missing entries", async (t) => {
  const root = await fixture(t);
  assert.deepEqual(await checkWorkflow(root), expectedResult);
  for (const name of ["extra.yaml", "EXTRA.YML", "harmless.txt"]) {
    const path = join(root, ".github/workflows", name);
    await writeFile(path, canonical);
    await assert.rejects(checkWorkflow(root), /inventory differs/);
    await rm(path);
  }
  await mkdir(join(root, ".github/workflows/nested"));
  await writeFile(join(root, ".github/workflows/nested/writer.yml"), canonical);
  await assert.rejects(checkWorkflow(root), /inventory differs/);
  await rm(join(root, ".github/workflows/nested"), { recursive: true });
  for (const name of names) {
    await rm(join(root, ".github/workflows", name));
    await assert.rejects(checkWorkflow(root), /inventory differs/);
    await writeFile(join(root, ".github/workflows", name), sources.workflows[name]);
  }
  for (const [name, text] of [["avm-delivery.yml", sources.reference], ["avm-cleanup.yml", sources.cleanupReference]]) {
    await rm(join(root, "solutions", name));
    await assert.rejects(checkWorkflow(root), /inputs are missing or unreadable/);
    await writeFile(join(root, "solutions", name), text);
  }
});

test("expected workflow/reference file paths cannot be replaced by directories", async (t) => {
  for (const name of inputs) {
    const root = await fixture(t);
    await rm(join(root, name));
    await mkdir(join(root, name));
    await assert.rejects(checkWorkflow(root), /regular single-link files/);
  }
});

test("workflow/reference file symlinks fail even when the outside target has the exact pinned bytes", async (t) => {
  // Deliberately no skip/fallback: Windows must permit file symlink creation
  // (Developer Mode or suitable rights); otherwise this test fails visibly.
  const target = await fixture(t);
  for (const name of inputs) {
    const root = await fixture(t);
    await rm(join(root, name));
    await symlink(join(target, name), join(root, name), "file");
    await assert.rejects(checkWorkflow(root), /regular single-link files/);
  }
});

test("hard-linked workflow/reference files are rejected rather than sharing outside mutable bytes", async (t) => {
  const target = await fixture(t);
  for (const name of inputs) {
    const root = await fixture(t);
    await rm(join(root, name));
    await link(join(target, name), join(root, name));
    await assert.rejects(checkWorkflow(root), /regular single-link files/);
  }
});

test("linked .github, workflows and solutions directories cannot escape to an identical outside tree", async (t) => {
  const target = await fixture(t);
  for (const name of [".github", ".github/workflows", "solutions"]) {
    const root = await fixture(t);
    await rm(join(root, name), { recursive: true });
    await symlink(join(target, name), join(root, name), directoryLinkType);
    await assert.rejects(checkWorkflow(root), /real directories, not symbolic links/);
  }
});

test("linked roots and linked ancestors are rejected instead of canonicalizing an escape into acceptance", async (t) => {
  const target = await fixture(t);
  const container = await temporary(t, "ws2-avm-workflow-links-");
  const rootLink = join(container, "linked-root");
  await symlink(target, rootLink, directoryLinkType);
  await assert.rejects(checkWorkflow(rootLink), /real directories, not symbolic links/);
  const ancestorLink = join(container, "linked-parent");
  await symlink(dirname(target), ancestorLink, directoryLinkType);
  await assert.rejects(checkWorkflow(join(ancestorLink, basename(target))), /linked ancestors or escape/);
});

test("an unknown linked entry is rejected by inventory before following its target", async (t) => {
  const root = await fixture(t);
  const outside = await temporary(t, "ws2-avm-workflow-outside-");
  await symlink(outside, join(root, ".github/workflows/EXTRA.YML"), directoryLinkType);
  await assert.rejects(checkWorkflow(root), /inventory differs/);
});

test("native reads reject malformed UTF-8 and do not silently remove BOMs", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, ".github/workflows/avm-delivery.yml"), Buffer.from([0xc3, 0x28]));
  await assert.rejects(checkWorkflow(root), /valid UTF-8 without lossy decoding/);
  await writeFile(join(root, ".github/workflows/avm-delivery.yml"), `\ufeff${canonical}`);
  await assert.rejects(checkWorkflow(root), /differs from the trusted reference/);
});

test("native filesystem errors never expose caller-supplied names or paths", async (t) => {
  const root = await temporary(t);
  const sentinel = "PRIVATE-INPUT-PATH-MUST-NOT-BE-ECHOED";
  await assert.rejects(checkWorkflow(join(root, sentinel)), (error) => {
    assert.match(error.message, /inputs are missing or unreadable/);
    assert.ok(!String(error.stack).includes(sentinel), "Do not expose a native filesystem error path");
    return true;
  });
});

test("the CLI finds its own repository, stays read-only and rejects all update/skip/override flags", async (t) => {
  const cwd = await fixture(t);
  // A broken caller-working-directory decoy must not be read or repaired.
  await writeFile(join(cwd, ".github/workflows/avm-delivery.yml"), "invalid caller-workflow\n");
  const before = await inputBytes(repository);
  const callerBefore = await fixtureTree(cwd);
  const scriptBefore = await readFile(script);
  const passed = cli(script, cwd);
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /1 canonical delivery workflow; 1 separately authorized cleanup workflow; 4 reviewed companions/);
  assert.match(passed.stdout, /No Azure operations, approvals or live completion claimed/);
  assert.match(passed.stdout, /actionlint separately/);
  for (const flag of ["--update", "--skip", "--fix", "--write", "--root", "--reference", "--help"]) {
    const blocked = cli(script, cwd, [flag]);
    assert.equal(blocked.status, 1);
    assert.equal(blocked.stdout, "");
    assert.match(blocked.stderr, /no update, skip or override flags/);
  }
  assert.ok(JSON.stringify(await inputBytes(repository)) === JSON.stringify(before), "CLI must not edit its source workflows or reference");
  assert.ok(JSON.stringify(await fixtureTree(cwd)) === JSON.stringify(callerBefore), "CLI must not write into or repair the caller directory");
  assert.ok((await readFile(script)).equals(scriptBefore), "CLI must not rewrite its pins");
});

test("invoking the CLI through a file symlink cannot silently skip validation or accept a skip flag", async (t) => {
  const root = await temporary(t);
  const alias = join(root, "checker-alias.mjs");
  await symlink(script, alias, "file");
  const passed = cli(alias, root);
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /1 canonical delivery workflow; 1 separately authorized cleanup workflow; 4 reviewed companions/);
  const blocked = cli(alias, root, ["--skip"]);
  assert.equal(blocked.status, 1);
  assert.equal(blocked.stdout, "");
  assert.match(blocked.stderr, /no update, skip or override flags/);
});

test("CLI failures do not echo injected source, arguments or unknown filenames and never repair drift", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "scripts"));
  const copiedScript = join(root, "scripts/check-avm-workflow.mjs");
  await writeFile(copiedScript, await readFile(script));
  const sentinel = "CLI-UNTRUSTED-SECRET-LIKE-CONTENT-MUST-NOT-APPEAR";
  const expectPrivateFailure = (result) => {
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.ok(!result.stderr.includes(sentinel), "CLI failure must not disclose input text or filenames");
    assert.match(result.stderr, /AVM workflow authoring stopped/);
  };
  const before = await fixtureTree(root);
  expectPrivateFailure(cli(copiedScript, root, ["--update", sentinel]));
  assert.ok(JSON.stringify(await fixtureTree(root)) === JSON.stringify(before), "Rejected flags must not write anything");
  await writeFile(join(root, ".github/workflows/avm-delivery.yml"), sentinel);
  const drifted = await fixtureTree(root);
  expectPrivateFailure(cli(copiedScript, root));
  assert.ok(JSON.stringify(await fixtureTree(root)) === JSON.stringify(drifted), "Rejected source drift must not be repaired");
  await writeFile(join(root, ".github/workflows", `${sentinel}.yaml`), sentinel);
  expectPrivateFailure(cli(copiedScript, root));
  await rm(join(root, ".github/workflows", `${sentinel}.yaml`));
  await writeFile(join(root, ".github/workflows/avm-delivery.yml"), sources.workflows["avm-delivery.yml"]);
  await rm(join(root, "solutions/avm-delivery.yml"));
  expectPrivateFailure(cli(copiedScript, root));
});
