import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { configuration, makeManifest, PROVIDERS, TERRAFORM, validatePlan, verifyManifest } from "./avm-policy.mjs";
import { hash, sourceBinding, verifyInstalledModules, verifyRootContract } from "./avm-dependencies.mjs";
import { armReader, verifyAzure } from "./avm-verify.mjs";

const root = "avm";
const privateDir = ".workshop/private";
export function terraformEnvironment(original) {
  const allow = new Set(["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "ARM_CLIENT_ID", "ARM_TENANT_ID", "ARM_SUBSCRIPTION_ID", "ACTIONS_ID_TOKEN_REQUEST_URL", "ACTIONS_ID_TOKEN_REQUEST_TOKEN"]);
  const env = Object.fromEntries(Object.entries(original).filter(([key]) => allow.has(key.toUpperCase())));
  return { ...env, ARM_USE_OIDC: "true", ARM_USE_AZUREAD: "true", ARM_USE_CLI: "false", ARM_USE_MSI: "false", ARM_SKIP_PROVIDER_REGISTRATION: "true", TF_INPUT: "0", TF_IN_AUTOMATION: "true", TF_WORKSPACE: "default", CHECKPOINT_DISABLE: "1", TF_CLI_CONFIG_FILE: resolve(privateDir, "terraform.rc"), HOME: resolve(privateDir, "home"), USERPROFILE: resolve(privateDir, "home"), AZURE_CONFIG_DIR: resolve(privateDir, "azure-unused"), GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: resolve(privateDir, "gitconfig"), GIT_TERMINAL_PROMPT: "0" };
}

function terraform(args, allowChanges = false) {
  // Fixed executable/root and scrubbed environment: no ambient CLI args, alternate
  // workspace/provider configuration, personal login cache or raw output logging.
  const result = spawnSync("terraform", [`-chdir=${root}`, ...args], { env: terraformEnvironment(process.env), shell: false, encoding: "utf8", timeout: 1_800_000, maxBuffer: 32 * 1024 * 1024 });
  assert.ok(!result.error && !result.signal && (result.status === 0 || allowChanges && result.status === 2), "Terraform failed; inspect restricted diagnostics, never raw public state/plan logs");
  return result;
}

export async function currentMain(binding, request = fetch) {
  const response = await request(`https://api.github.com/repos/${binding.repository}/branches/main`, { headers: { Authorization: `Bearer ${process.env.GH_READ_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, redirect: "error", signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, "Cannot recheck protected main");
  const branch = await response.json();
  assert.ok(branch.protected && branch.commit.sha === binding.sha, "Main changed: start a fresh protected-main run and saved plan");
  return branch.commit.sha;
}

export async function deliver(phase) {
  assert.ok(["plan", "apply", "destroy"].includes(phase));
  const { inputs, binding: context } = configuration(process.env);
  assert.equal(process.env.ARM_CLIENT_ID, phase === "plan" ? context.planClientId : context.applyClientId);
  assert.ok(process.env.GITHUB_OUTPUT && process.env.GITHUB_STEP_SUMMARY);
  if (phase !== "plan") assert.equal(context.operation, phase === "apply" ? "deploy" : "destroy");
  await mkdir(`${privateDir}/home`, { recursive: true, mode: 0o700 });
  await writeFile(`${privateDir}/terraform.rc`, "disable_checkpoint = true\n", { mode: 0o600 });
  await writeFile(`${privateDir}/gitconfig`, "[credential]\n\thelper =\n[protocol \"file\"]\n\tallow = never\n", { mode: 0o600 });
  const inputPath = resolve(privateDir, "inputs.tfvars.json");
  await writeFile(inputPath, `${JSON.stringify(inputs)}\n`, { mode: 0o600 });
  const binding = { ...context, ...await sourceBinding(root) };
  const reviewedSource = await verifyRootContract(root);
  const planPath = resolve(privateDir, "reviewed.tfplan");
  const manifestPath = resolve(privateDir, "manifest.json");
  const verify = async (mainSha) => verifyManifest({ manifestBytes: await readFile(manifestPath), planBytes: await readFile(planPath), binding, planHash: process.env.EXPECTED_PLAN_HASH, manifestHash: process.env.EXPECTED_MANIFEST_HASH, mainSha });
  if (phase !== "plan") await verify(process.env.CURRENT_MAIN_SHA);
  terraform(["init", "-input=false", "-lockfile=readonly", "-reconfigure", `-backend-config=storage_account_name=${binding.stateAccount}`, `-backend-config=container_name=${binding.stateContainer}`, `-backend-config=key=${binding.stateKey}`]);
  assert.equal(terraform(["workspace", "show"]).stdout.trim(), "default");
  await verifyInstalledModules(root);
  terraform(["validate", "-no-color"]);
  const version = JSON.parse(terraform(["version", "-json"]).stdout);
  assert.equal(version.terraform_version, TERRAFORM);
  const providers = Object.fromEntries(Object.entries(version.provider_selections).map(([key, value]) => [key.toLowerCase(), value]));
  assert.deepEqual(providers, PROVIDERS);
  if (phase === "plan") {
    const args = ["plan", "-input=false", "-no-color", "-lock-timeout=5m", "-detailed-exitcode", `-out=${planPath}`, `-var-file=${inputPath}`];
    if (context.operation === "destroy") args.push("-destroy");
    const result = terraform(args, true);
    const json = JSON.parse(terraform(["show", "-json", planPath]).stdout);
    const summary = validatePlan(json, inputs, context.operation, reviewedSource);
    if (["followup", "drift"].includes(context.operation)) await verifyAzure(inputs, false, await armReader(process.env));
    const manifest = makeManifest(binding, await readFile(planPath), result.status);
    const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`);
    await writeFile(manifestPath, bytes, { mode: 0o600 });
    await appendFile(process.env.GITHUB_OUTPUT, `plan_sha256=${manifest.planSha256}\nmanifest_sha256=${hash(bytes)}\nexitcode=${result.status}\nartifact=ws2-avm-${binding.runId}-${binding.runAttempt}\n`);
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## AgentAlvine - AVM ${context.operation}\n\nSource ${binding.sha}; run ${binding.runId}/${binding.runAttempt}.\n\nPlan digest ${manifest.planSha256}; manifest digest ${hash(bytes)}.\n\nCreates ${summary.create}, updates ${summary.update}, deletes ${summary.delete}, unchanged ${summary.noChange}.\n\nOnly this run's policy-verified exact saved plan may be applied; no human deployment review is required or inferred. Cleanup requires separate explicit authorization. Maximum age 2 hours; encrypted artifact retention 1 day. No raw plan, state, account values or resource IDs are published.\n`);
  } else {
    assert.deepEqual(await sourceBinding(root), { source: binding.source, moduleLock: binding.moduleLock, providerLock: binding.providerLock });
    // Re-read exact-plan content after decryption and initialization, before mutation.
    validatePlan(JSON.parse(terraform(["show", "-json", planPath]).stdout), inputs, context.operation, await verifyRootContract(root));
    await verify(await currentMain(binding));
    terraform(["apply", "-input=false", "-no-color", "-lock-timeout=5m", planPath]);
    if (phase === "destroy") assert.equal(terraform(["state", "list"]).stdout.trim(), "", "Managed workload state is not empty");
    const checked = await verifyAzure(inputs, phase === "destroy", await armReader(process.env));
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## AgentAlvine - AVM ${phase === "destroy" ? "cleanup" : "configuration"} verified\n\n${checked} exact owned resources ${phase === "destroy" ? "returned absence after full destruction" : "matched the approved topology"}; the retained RG remains accessible. This is configuration/lifecycle evidence, not application connectivity. ${phase === "destroy" ? "Shared backend, identities and runner remain owned by the instructor." : "Request a fresh followup plan to prove convergence; apply success alone is not no-change."}\n`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv[2] === "clean") {
    for (const path of [privateDir, ".workshop/sealed", "avm/.terraform"]) await rm(path, { force: true, recursive: true });
  } else deliver(process.argv[2]).catch(() => { console.error("AVM delivery stopped; retain the failed run and request instructor-controlled diagnostics. No raw credentials, inputs, plan or state were printed."); process.exitCode = 1; });
}
