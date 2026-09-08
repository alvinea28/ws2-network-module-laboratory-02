import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const invoke = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", shell: false, timeout: 30_000, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
  return { status: result.status, stdout: result.stdout || "" };
};

export async function inspectSetup({ cwd = process.cwd(), command = invoke, nodeVersion = process.versions.node } = {}) {
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail });
  let course;
  try { course = JSON.parse(await readFile(resolve(cwd, ".github/agentalvine/course.json"), "utf8")); }
  catch { record("Repository folder", false, "Use File > Open Folder to open the cloned laboratory itself, not its parent folder or a ZIP/virtual workspace."); return { results, course: null }; }
  record("Laboratory identity", Number.isInteger(course.number), `Laboratory ${String(course.number).padStart(2, "0")}: ${course.title}`);
  record("Node.js", nodeVersion === "24.16.0", "Required: Node.js 24.16.0. See docs/toolchain.md; restart VS Code after installation/PATH changes.");
  const git = command("git", ["--version"], cwd);
  record("Git executable", git.status === 0 && /git version 2\./.test(git.stdout), "Git 2.x must be available in the VS Code terminal.");
  if (git.status === 0) {
    const top = command("git", ["rev-parse", "--show-toplevel"], cwd);
    record("Clone root", top.status === 0 && resolve(top.stdout.trim()).toLowerCase() === resolve(cwd).toLowerCase(), "The terminal must be at this laboratory's Git root. Do not initialize a second Git repository.");
    const origin = command("git", ["remote", "get-url", "origin"], cwd);
    const value = origin.stdout.trim();
    const match = value.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
    record("Credential-free GitHub remote", origin.status === 0 && Boolean(match), "Use the HTTPS/SSH URL of your own copy. Never embed tokens/passwords in a URL; unsafe URLs are not printed.");
    if (match) {
      record("Participant copy", match[1] !== course.sourceRepository, "origin must be your participant copy, not the public source template. Public read access does not prove push access.");
      record("Laboratory number in repository name", match[1].endsWith(`-laboratory-${String(course.number).padStart(2, "0")}`), "Keep -laboratory-NN at the end of your copy name so its exercise number remains visible. See docs/start-here.md.");
    }
    for (const key of ["user.name", "user.email"]) {
      const configured = command("git", ["config", "--get", key], cwd);
      record(`Git ${key}`, configured.status === 0 && configured.stdout.trim().length > 0, "Configure local commit authorship as explained in docs/start-here.md. It is not GitHub sign-in; values are not printed.");
    }
    const branch = command("git", ["branch", "--show-current"], cwd);
    record("Named local branch", branch.status === 0 && branch.stdout.trim().length > 0, "Start from the copied default branch, then create the lab/ branch requested by the Exercise issue. Detached HEAD is not ready for participant work.");
  }
  if (course.number !== 1) {
    const terraform = command(process.env.TERRAFORM_BIN || "terraform", ["version", "-json"], cwd);
    let version;
    try { version = JSON.parse(terraform.stdout).terraform_version; } catch { version = null; }
    record("Terraform", terraform.status === 0 && version === "1.16.1", "Required: Terraform 1.16.1. This check does not initialize a backend, contact Azure, or inspect state.");
  }
  if (course.number === 4) {
    const docs = command(process.env.TERRAFORM_DOCS_BIN || "terraform-docs", ["version"], cwd);
    record("terraform-docs", docs.status === 0 && /version v0\.24\.0(?:\s|$)/.test(docs.stdout), "Required for Lab 04: terraform-docs 0.24.0.");
  }
  return { results, course: { number: course.number, title: course.title } };
}

export async function main() {
  const report = await inspectSetup();
  for (const item of report.results) console.log(`${item.ok ? "PASS" : "CHECK"} ${item.name}: ${item.detail}`);
  console.log("MANUAL: verify the intended GitHub browser account, VS Code Accounts/Copilot account and entitlement, access to your own private copy, and actual push rights. This read-only doctor cannot certify browser sign-in, Copilot access, peer review or Azure readiness.");
  console.log("Nothing was installed, configured, uploaded or deployed. Follow docs/start-here.md and the current Exercise issue.");
  process.exitCode = report.results.every((item) => item.ok) ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();