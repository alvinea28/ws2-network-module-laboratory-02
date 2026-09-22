import assert from "node:assert/strict";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, join, posix, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Local, read-only teaching contracts, not workflow/control digests or live proof.
// Never execute examples, delivery drivers, child processes, Git or cloud APIs.
// Import only the guide's pure fence helper; do not invoke its progress writer.
const root = fileURLToPath(new URL("../", import.meta.url));
const realRoot = await realpath(root);
const read = async (path) => (await readFile(join(root, path), "utf8")).replaceAll("\r\n", "\n");
const { outsideCodeFences } = createRequire(import.meta.url)("../.github/agentalvine/auto-guide.cjs");
const course = JSON.parse(await read(".github/agentalvine/course.json"));

// Preserve machine-readable acceptance, not titles, prose hashes or identities.
const originalGates = [
  {
    id: "1", lesson: ".github/steps/01.md", requiresCommit: true,
    checks: [{ kind: "file", path: "exercise/design.md", contains: ["Reuse decision", "network baseline", "subnet-security"], notContains: ["TODO"] }],
  },
  {
    id: "2", lesson: ".github/steps/02.md", requiresCommit: true,
    checks: [
      {
        kind: "file", path: "main.tf",
        contains: [
          'resource "azurerm_virtual_network" "this"', 'resource "azurerm_subnet" "this"',
          "var.resource_group_name", "var.address_space", "var.tags", "each.key",
          "each.value.address_prefixes", "azurerm_virtual_network.this.name",
        ],
        pattern: "for_each\\s*=\\s*var\\.subnets\\b",
        notContains: ["TODO", 'module "security"', 'resource "azurerm_resource_group"', 'provider "azurerm"'],
      },
      { kind: "file", path: "main.tf", pattern: "default_outbound_access_enabled\\s*=\\s*false" },
    ],
  },
  {
    id: "3", lesson: ".github/steps/03.md", requiresCommit: true,
    checks: [{
      kind: "file", path: "outputs.tf",
      contains: ['output "vnet_id"', "azurerm_virtual_network.this.id", 'output "subnet_ids"', "azurerm_subnet.this", "subnet.id"],
      notContains: ["TODO", 'output "nsg_id"', 'output "association_ids"', "module.security"],
    }],
  },
  {
    id: "4", lesson: ".github/steps/04.md", requiresCommit: false,
    checks: [{ kind: "workflow", file: "lab-checks.yml", jobs: ["Test learner module"], conclusion: "success" }],
  },
];
const activityPath = (id) => `full-ws-content/activity-${id.padStart(2, "0")}.md`;
const jobIds = ["preflight", "validation", "plan", "apply", "followup", "drift"];
const coreCases = ["valid_two_subnet_topology", "reject_invalid_cidr", "reject_invalid_subnet", "reject_missing_tags"];

function prose(markdown) {
  let text = "";
  outsideCodeFences(markdown, (part) => { text += part; return part; });
  return text.replace(/<!--[\s\S]*?-->/g, "").replace(/^ {0,3}(?:>[ \t]?)+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*`]/g, "").replace(/\s+/g, " ").trim();
}

function explains(markdown, source, points) {
  const text = prose(markdown);
  for (const [point, pattern] of Object.entries(points)) {
    // Avoid dumping whole documents (or subsequently entered private values).
    assert.ok(pattern.test(text), `${source} must explain: ${point}`);
  }
}

function localTarget(source, href) {
  if (/^(?:https?:\/\/|mailto:|#)/i.test(href)) return null;
  const separator = href.search(/[?#]/);
  const pathname = separator < 0 ? href : href.slice(0, separator);
  const suffix = separator < 0 ? "" : href.slice(separator);
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { assert.fail(`Malformed local link in ${source}`); }
  assert.ok(decoded && !posix.isAbsolute(decoded) && !/[\\:\u0000-\u001f]/.test(decoded), `Non-relative file link in ${source}`);
  const path = posix.normalize(posix.join(posix.dirname(source), decoded));
  assert.ok(path !== ".." && !path.startsWith("../") && !posix.isAbsolute(path), `Link escapes this standalone lab: ${source}`);
  return { path, suffix };
}

function localLinks(markdown, source) {
  const links = [];
  outsideCodeFences(markdown, (part) => {
    for (const [, href] of part.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = localTarget(source, href);
      if (target) links.push(target);
    }
    return part;
  });
  return links;
}

function rebase(markdown, source) {
  // Match the existing inline-link convention, including images, not code samples.
  return outsideCodeFences(markdown, (part) => part.replace(/\]\(([^)\s]+)\)/g, (match, href) => {
    const target = localTarget(source, href);
    if (!target) return match;
    const step = /^\.github\/steps\/(\d\d)\.md$/.exec(target.path);
    const path = step ? `full-ws-content/activity-${step[1]}.md` : target.path;
    return `](${posix.relative("full-ws-content", path).replaceAll(" ", "%20")}${target.suffix})`;
  }));
}

function mirrorSection(markdown, kind, source) {
  const start = `<!-- FULL-WS-${kind}:START -->`;
  const end = `<!-- FULL-WS-${kind}:END -->`;
  assert.equal(markdown.split(start).length, 2, `${source}: keep exactly one ${kind} start marker`);
  assert.equal(markdown.split(end).length, 2, `${source}: keep exactly one ${kind} end marker`);
  const from = markdown.indexOf(start) + start.length;
  const to = markdown.indexOf(end);
  assert.ok(to > from, `${source}: mirror markers must enclose the full body in order`);
  return { body: markdown.slice(from, to).trim(), after: markdown.slice(to + end.length) };
}

const tableRows = (markdown) => markdown.split("\n").filter((line) => line.startsWith("|"))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.replace(/[*`]/g, "").trim()));
const codeTableKeys = (markdown) => [...markdown.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((match) => match[1]);

test("Lab 02 retains exactly its four original offline gates, not Lab 07's five live gates", async () => {
  assert.equal(course.number, 2);
  assert.equal(course.id, "02-network-module");
  assert.equal(course.independent, true);
  assert.equal(course.beginnerSetup, true);
  assert.deepEqual(course.prerequisiteLabs, []);
  assert.deepEqual(course.steps.map(({ id, lesson, requiresCommit, checks }) => ({ id, lesson, requiresCommit, checks })), originalGates);
  assert.deepEqual((await readdir(join(root, ".github/steps"))).filter((name) => name.endsWith(".md")).sort(), ["01.md", "02.md", "03.md", "04.md"]);
  assert.deepEqual((await readdir(join(root, "full-ws-content"))).filter((name) => /^activity-\d+\.md$/.test(name)).sort(), ["activity-01.md", "activity-02.md", "activity-03.md", "activity-04.md"]);
  explains(course.completion, "course completion", { "offline completion is not deployment": /No Azure resources were deployed by these checks/i });
});

test("mirror rebasing preserves anchors, query strings, encoded spaces, images and fenced examples", () => {
  const source = [
    "[previous](01.md#task) [guide](../../docs/delivery-configuration.md?plain=1#scope)",
    "[report](../../docs/daily%20work%20report/2026-09-08.md) ![reference](../../docs/images/vscode-clone-github.png)",
    "[external](https://example.invalid/reference#read) [anchor](#local)",
    "```markdown", "[example](../../do-not-rebase.md)", "```",
    "~~~markdown", "[another example](../../do-not-rebase-either.md)", "~~~",
  ].join("\n");
  const expected = source.replace("(01.md#task)", "(activity-01.md#task)")
    .replace("(../../docs/delivery-configuration.md?plain=1#scope)", "(../docs/delivery-configuration.md?plain=1#scope)")
    .replace("(../../docs/daily%20work%20report/2026-09-08.md)", "(../docs/daily%20work%20report/2026-09-08.md)")
    .replace("(../../docs/images/vscode-clone-github.png)", "(../docs/images/vscode-clone-github.png)");
  assert.equal(rebase(source, ".github/steps/02.md"), expected);
  assert.equal(localLinks(source, ".github/steps/02.md").length, 4);
});

test("local-link checks reject traversal, absolute paths, Windows paths and encoded escapes", () => {
  for (const href of ["../..", "../../outside.md", "%2e%2e/%2e%2e/outside.md", "/outside.md", "//server/share.md", "C:/outside.md", "C:\\outside.md", "..%5coutside.md", "%2foutside.md", "file:///outside.md", "%ZZ"]) {
    assert.throws(() => localTarget("docs/start-here.md", href), /link|escapes/i);
  }
  assert.deepEqual(localTarget("docs/start-here.md", "daily%20work%20report/2026-09-08.md?plain=1#summary"), {
    path: "docs/daily work report/2026-09-08.md", suffix: "?plain=1#summary",
  });
});

for (const step of originalGates) {
  test(`activity ${step.id} preserves its entire current lesson with only relative links rebased`, async () => {
    const source = step.lesson;
    const lesson = await read(source);
    const target = activityPath(step.id);
    const { body } = mirrorSection(await read(target), "LESSON", target);
    assert.ok(lesson.startsWith(`## Laboratory 02 - Step ${step.id}/4\n`), `${source}: retain the original four-step numbering`);
    assert.ok(body === rebase(lesson, source).trim(), `${target}: FULL-WS-LESSON body differs from ${source}; do not alter historical outcomes to hide drift`);
  });
}

test("the FULL-WS-SETUP body mirrors the complete current independent setup", async () => {
  const target = "full-ws-content/00-start-here.md";
  const { body } = mirrorSection(await read(target), "SETUP", target);
  assert.ok(body === rebase(await read("docs/start-here.md"), "docs/start-here.md").trim(), `${target}: FULL-WS-SETUP body differs from docs/start-here.md`);
});

test("Azure setup is a full-body mirror with docs-relative links rebased, without invented markers", async () => {
  const source = "docs/azure-setup.md";
  assert.ok((await read("full-ws-content/azure-setup.md")).trim() === rebase(await read(source), source).trim(), "Full Azure setup mirror drift; compare the whole document, not a fabricated marker section");
});

const historicalPoints = [
  { "pushed reuse decision": /pushed reuse decision/i, "network-only ownership": /network-only boundary/i, "setup is not independently proved": /does not prove GUI\/account setup/i },
  { "stable subnet implementation": /stable map iteration/i, "disabled outbound access": /disabled default outbound access/i, "no live deployment": /No actual VNet or subnet was deployed/i },
  { "resource-backed outputs": /resource-backed vnet_id and stable-key subnet_ids/i, "synthetic rather than live IDs": /synthetic provider values, not IDs read from a live deployment/i },
  { "offline 4/4": /4\/4 offline completion/i, "four mocked cases with rejections": /four mocked cases.*invalid VNet CIDR.*invalid subnet prefix.*missing-tag rejection/i, "no live or human proof": /no Azure calls or human approval are proved/i },
];

for (const [index, step] of originalGates.entries()) {
  test(`activity ${step.id} retains its original recorded A/B outcome outside the lesson body`, async () => {
    const source = activityPath(step.id);
    const { after } = mirrorSection(await read(source), "LESSON", source);
    assert.equal((after.match(/^## Recorded simulation outcome$/gm) ?? []).length, 1, `${source}: retain the actual historical section, not Lab 07's heading`);
    explains(after, source, {
      "original date and both recorded outcomes": /2026-09-08.*Cycle A: recorded verified; Cycle B: recorded verified/i,
      "whole-lab counts are not additional per-activity tests": /whole-lab.{0,140}not (?:per-activity|extra tests)/i,
      ...historicalPoints[index],
    });
    assert.ok(localLinks(after, source).some(({ path }) => path === "full-ws-content/simulation.md"), `${source}: retain the historical coverage link`);
  });
}

test("historical simulation counts remain facts about offline cycles, not new AVM acceptance", async () => {
  const source = "full-ws-content/simulation.md";
  const text = await read(source);
  const cycles = tableRows(text).filter(([cycle]) => ["A", "B"].includes(cycle));
  assert.deepEqual(cycles.map((row) => row.slice(0, 4)), [["A", "4/4", "32", "4"], ["B", "4/4", "35", "4"]]);
  for (const row of cycles) assert.ok(/offline learner network root/i.test(row[4]), "Keep historical scope offline");
  explains(text, source, {
    "preserved history is not a fresh run": /preserved.*Cycle A and Cycle B.*not fresh tests/i,
    "no deployment or state operations": /No Azure deployments, identity creation, state access, or subscription operations were performed/i,
    "no inferred human approval": /No live policy[^.]*human approval is proved/i,
    "progress does not authorize Azure": /mock success and an Exercise checkbox never authorize Azure/i,
  });
  const index = await read("full-ws-content/README.md");
  const activities = tableRows(index).filter(([id]) => /^0[1-4]$/.test(id));
  assert.deepEqual(activities.map((row) => [row[0], ...row.slice(2)]), ["01", "02", "03", "04"].map((id) => [id, "Recorded verified", "Recorded verified"]));
});

test("entry navigation points to existing inline lessons without adding a core gate", async () => {
  const entries = ["README.md", "docs/start-here.md", ".github/agentalvine/README.md", "full-ws-content/README.md", "full-ws-content/00-start-here.md"];
  for (const source of entries) {
    const paths = new Set(localLinks(await read(source), source).map(({ path }) => path));
    for (const step of originalGates) {
      const target = source.startsWith("full-ws-content/") ? activityPath(step.id) : step.lesson;
      assert.ok(paths.has(target), `${source} must link ${target}`);
    }
  }
  for (const source of [".github/steps/02.md", "docs/delivery-configuration.md", "avm/README.md"]) {
    const paths = new Set(localLinks(await read(source), source).map(({ path }) => path));
    for (const target of ["solutions/avm-delivery.yml", ".github/workflows/avm-delivery.yml"]) assert.ok(paths.has(target), `${source} must distinguish the reference from the canonical writer`);
  }
});

test("4/4 expressly means offline completion rather than deployment, approval or cleanup", async () => {
  const boundaries = {
    "README.md": /4\/4 is offline proof only.*not Azure authorization or live completion/i,
    "docs/start-here.md": /4\/4 is offline proof only.*not Azure authorization or live completion/i,
    ".github/steps/04.md": /4\/4 is offline proof only.*not deployment, authorization or cleanup/i,
    "docs/delivery-configuration.md": /neither those cases nor historical 4\/4 results verify AVM delivery/i,
    "avm/README.md": /4\/4 remains core learner-root completion only; it proves no AVM deployment, live approval or cleanup/i,
    "full-ws-content/README.md": /4\/4 is offline proof only.*not Azure authorization or live completion/i,
  };
  for (const [source, pattern] of Object.entries(boundaries)) explains(await read(source), source, { "explicit non-live 4/4 boundary": pattern });
  for (const source of ["README.md", "docs/start-here.md", ".github/steps/04.md", "avm/README.md", "full-ws-content/README.md"]) {
    explains(await read(source), source, { "missing real preflight leaves the continuation pending": /live continuation pending/i });
  }
});

test("learners construct a complete untitled reference before one disabled whole-file installation", async () => {
  const source = ".github/steps/02.md";
  explains(await read(source), source, {
    "disabled authoring": /WORKSHOP_AZURE_ENABLED=false/,
    "new untitled YAML buffer": /File.*New Text File.*untitled.*YAML/i,
    "non-runnable reference": /solutions\/avm-delivery\.yml.*non-runnable reference/i,
    "complete ordered sections": /Construct these sections.*in order.*complete header.*jobs:/i,
    "no runnable draft or duplicate writer": /Never install partial drafts, alternate filenames or an extra writer/i,
    "whole-file installation while disabled": /Still disabled, atomically replace all.*one complete editor save/i,
    "no saved second workflow": /Close the untitled buffer without saving another workflow/i,
    "preserve action pins and driver calls": /Preserve indentation, pinned actions, driver calls, conditions, permissions and expressions exactly/i,
    "no authoring cloud/state operations": /no Azure login, live backend\/state or real plan\/apply/i,
    "honest identical reconstruction": /no Git diff.*valid.*Do not invent a YAML change or empty commit/i,
  });
});

test("the lesson teaches copying all six actual jobs, including followup and drift", async () => {
  const workflow = await read(".github/workflows/avm-delivery.yml");
  const jobs = workflow.slice(workflow.indexOf("\njobs:\n") + 1);
  assert.ok(jobs.startsWith("jobs:\n"), "Read the real top-level jobs block");
  // Inventory the reviewed file's two-space job headings, not a YAML/security parser.
  const actual = [...jobs.matchAll(/^ {2}([a-z][a-z\d_-]*):[ \t]*$/gm)].map((match) => match[1]);
  assert.deepEqual(actual, jobIds);
  const source = ".github/steps/02.md";
  const lesson = await read(source);
  const copied = [...lesson.matchAll(/(?:Copy|then) the complete `([a-z]+)` job/g)].map((match) => match[1]);
  assert.deepEqual(copied, actual, "Copy complete jobs in the installed order");
  explains(lesson, source, {
    "admission": /preflight job: disabled\/private\/protected-main admission/i,
    "same-revision validation": /validation job: same-SHA credential-free checks/i,
    "plan environment and encryption": /plan job: avm-plan, scoped OIDC, encrypted saved plan/i,
    "distinct apply identity": /apply job: avm-apply, distinct identity, exact saved plan/i,
    "followup and drift cannot apply": /followup job.*drift job.*neither applies/i,
  });
});

test("main push automatically applies one exact plan; delivery dispatch is followup-only and cleanup is separate", async () => {
  const source = ".github/steps/04.md";
  explains(await read(source), source, {
    "push-driven exact-plan deployment": /Main push applies that same run's encrypted saved plan, not a replacement plan/i,
    "no manual reviewer or second deployment": /No manual review wait or second deploy dispatch/i,
    "delivery dispatch is followup-only": /Run workflow.*main.*operation: followup only/i,
    "separate admin-authorized cleanup": /current authenticated repository admin.*separate explicit owner authorization.*Trusted AVM cleanup/i,
    "cleanup is not an operation menu": /Required string authorization.*No operation input/i,
    "actual dependency chain": /Verify scoped AVM deployment policy.*Validate reviewed AVM revision.*Trusted AVM plan.*Apply exact AVM saved plan/i,
    "first attempt only": /fresh attempt 1.*never rerun live jobs/i,
    "read-only followup and drift": /Followup never applies.*scheduled drift is report-only/i,
    "never ordinary cleanup": /Ordinary pushes never clean up.*deletion\/replacement is rejected/i,
  });
});

test("offline instructions distinguish four original cases from three AVM cases with all providers mocked", async () => {
  const core = await read("tests/network.tftest.hcl");
  assert.deepEqual([...core.matchAll(/^run "([^"]+)"/gm)].map((match) => match[1]), coreCases);
  const step = await read(".github/steps/03.md");
  for (const name of coreCases) assert.ok(step.includes(`\`${name}\``), `Step 3 must teach ${name}`);
  const companion = await read("avm/tests/contract.tftest.hcl");
  assert.deepEqual([...companion.matchAll(/^mock_provider "([^"]+)"/gm)].map((match) => match[1]).sort(), ["azapi", "azurerm", "modtm", "random"]);
  assert.equal([...companion.matchAll(/^run "/gm)].length, 3, "Count declared AVM contracts; this does not execute them");
  assert.equal([...companion.matchAll(/^\s*command\s*=\s*plan[ \t]*$/gm)].length, 3);
  const source = ".github/steps/03.md";
  const guide = await read(source);
  for (const command of ["npm run workflow:check", "npm test", "npm run kit:check", "npm run companion:check", "node scripts/check-learner.mjs"]) {
    assert.ok(guide.includes(command), `${source}: explain the approved ${command} check`);
  }
  explains(guide, source, {
    "all providers are mocked": /mock AzureRM, AzAPI, ModTM and Random/i,
    "distinct core and AVM counts": /4 core \+ 3 AVM provider-mocked cases/i,
    "zero failures, errors or skipped cases": /zero failed, errored or skipped/i,
    "backend-disabled, read-only lock": /backend-disabled initialization and read-only locks/i,
    "offline does not mean no public downloads": /Public dependency downloads may need internet/i,
    "no cloud credentials, caches or state": /no Azure credentials, OIDC, CLI caches or live state/i,
    "checks are not already-obtained results": /Expected, not observed/i,
  });
});

test("configuration documents the exact fixed root, environments and repository variable inventory", async () => {
  const workflow = await read(".github/workflows/avm-delivery.yml");
  const variables = [...new Set([...workflow.matchAll(/\bvars\.([A-Z][A-Z0-9_]*)\b/g)].map((match) => match[1]))].sort();
  const expected = ["WORKSHOP_AZURE_ENABLED", "WS2_STATE_LOCK_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID", "AZURE_PLAN_CLIENT_ID", "AZURE_APPLY_CLIENT_ID", "STATE_STORAGE_ACCOUNT", "STATE_CONTAINER", "STATE_KEY", "WORKLOAD_RG", "WORKLOAD_INPUTS_JSON", "PLAN_ENCRYPTION_PUBLIC_KEY"].sort();
  assert.deepEqual(variables, expected);
  const source = "docs/delivery-configuration.md";
  const configuration = await read(source);
  assert.deepEqual(codeTableKeys(configuration).filter((key) => /^[A-Z][A-Z0-9_]*$/.test(key)).sort(), variables);
  assert.deepEqual([...workflow.matchAll(/^    environment: ([\w-]+)$/gm)].map((match) => match[1]).sort(), ["avm-apply", "avm-plan"]);
  assert.ok(/^const root\s*=\s*"avm";/m.test(await read("scripts/avm-delivery.mjs")), "Inspect the fixed driver root as text; never import or run it");
  explains(configuration, source, {
    "fixed AVM root": /Fixed avm; never the original learner root or a user-selected path/i,
    "own state key": /key starts with avm\/ and ends with \.tfstate/i,
    "original and AVM provider separation": /AzureRM 4\.81\.0.*AzureRM 5\.4\.0/i,
    "separate Lab 07 ownership": /Lab 07 has its own root, state and resources/i,
    "no shared state or imported network": /Do not import\/adopt its VNet.*run both writers against a shared workload/i,
    "explicit variables location": /Settings.*Secrets and variables.*Actions.*Variables/i,
    "no plan/apply overrides": /do not shadow them with conflicting environment overrides/i,
  });
});

test("the five documented workload fields agree with actual AVM variables and the driver's allowlist", async () => {
  const fields = ["address_space", "location", "name", "resource_group_name", "subnets"];
  const source = "docs/delivery-configuration.md";
  const configuration = await read(source);
  assert.deepEqual(codeTableKeys(configuration).filter((key) => /^[a-z][a-z_]*$/.test(key)).sort(), fields);
  const declarations = [...(await read("avm/variables.tf")).matchAll(/^variable "([^"]+)"/gm)].map((match) => match[1]);
  assert.deepEqual(declarations.sort(), [...fields, "tenant_id", "subscription_id"].sort());
  const policy = await read("scripts/avm-policy.mjs");
  const allowed = /assert\.deepEqual\(Object\.keys\(raw\)\.sort\(\),\s*(\[[^\]]*\])\)/.exec(policy);
  assert.ok(allowed, "Locate the real workload-input allowlist without executing policy code");
  assert.deepEqual(JSON.parse(allowed[1]), fields);
  explains(configuration, source, {
    "unique disposable name": /network name starting with ws2-avm-/i,
    "existing assigned group matches WORKLOAD_RG": /existing group name exactly matching WORKLOAD_RG/i,
    "nonempty IPv4 network prefixes": /Nonempty array of approved valid IPv4 CIDR strings/i,
    "stable subnets with prefix arrays": /at least two stable named subnets.*nonempty address_prefixes array/i,
    "identity and tag fields are not JSON overrides": /Do not add tenant_id, subscription_id, tags.*backend selectors to this object/i,
    "identity injected from approved variables": /driver injects tenant\/subscription from their approved repository variables/i,
    "benign update is HCL, not JSON": /benign update exercise edits the tags map in the locals block of avm\/main\.tf/i,
  });
});

test("live prerequisites require exact private identity, owner scope, distinct OIDC identities and the protected runner", async () => {
  const source = "docs/delivery-configuration.md";
  explains(await read(source), source, {
    "prerequisites are not completed work": /prerequisites, not completed work/i,
    "disabled until instructor authorization": /WORKSHOP_AZURE_ENABLED=false.*explicitly authorizes the specific private copy after real checks/i,
    "eligible private host": /eligible Enterprise GitHub host.*private repositories/i,
    "private non-template route": /repository must be private, non-template and explicitly approved/i,
    "main and first-attempt admission": /current protected main and run attempt 1/i,
    "both protected environments without reviewers": /verify avm-plan and avm-apply.*For each.*main.*no Required reviewers.*disable administrator bypass/i,
    "no manual deployment reviewer": /No manual deployment reviewer is required/i,
    "fresh runtime identity and same-run checks": /freshly checks immutable private identity, live rules, current main, run\/SHA\/attempt, actual merged-PR association, both environments and successful same-run validation\/plan jobs/i,
    "no approvals API": /does not query the approvals API/i,
    "distinct plan/apply identities": /verify distinct plan\/apply client IDs/i,
    "plan Reader and blob leasing": /Plan identity.*Reader.*Storage Blob Data Contributor.*lease operations/i,
    "apply Contributor, not subscription owner": /Apply identity.*Contributor.*not subscription-wide ownership.*Storage Blob Data Contributor/i,
    "no role-grant rights": /Neither identity has role-grant rights/i,
    "exact OIDC subjects": /repo:<OWNER>\/<PRIVATE-COPY>:environment:avm-plan.*repo:<OWNER>\/<PRIVATE-COPY>:environment:avm-apply/,
    "ephemeral exact-workflow runner": /ephemeral Linux x64.*ws2-trusted.*this exact workflow on the trusted ref/i,
    "no untrusted runner workload": /Never schedule PR\/untrusted code onto this runner/i,
    "actual private connectivity": /private backend DNS resolution and actual network reachability/i,
    "one state writer with leases": /WS2_STATE_LOCK_ID.*actual Azure Blob lease locking.*one writer/i,
    "Entra/OIDC only, no local backend": /OIDC plus Microsoft Entra.*No storage account key, SAS, client secret.*Do not initialize it locally/i,
    "no invented scope or authorization": /never invent scope or authorization from this page/i,
    "explicit bootstrap approval": /Bootstrap changes require explicit owner authorization before any setup mutation/i,
    "immutable private identity": /(?:Immutable repository ID and exact name are fixed|1379147533).*wrong IDs\/names, public copies and templates fail/i,
  });
});

test("saved-plan guidance preserves exact bindings, encrypted artifacts and apply-only decryption without a reviewer gate", async () => {
  const workflow = await read(".github/workflows/avm-delivery.yml");
  assert.deepEqual([...new Set([...workflow.matchAll(/\bsecrets\.([A-Z][A-Z0-9_]*)\b/g)].map((match) => match[1]))], ["PLAN_DECRYPTION_PRIVATE_KEY"]);
  const source = "docs/delivery-configuration.md";
  explains(await read(source), source, {
    "private key only in apply environment": /PLAN_DECRYPTION_PRIVATE_KEY as an environment secret only in avm-apply, not a repository\/organization secret and not in avm-plan or PR CI/i,
    "owner escrow is not a manual gate": /owner key escrow is for private inspection\/recovery, not a manual reviewer gate/i,
    "no module App credentials for public AVMs": /only delivery secret.*do not add module GitHub App secrets or long-lived Azure credentials/i,
    "ciphertext retention is not apply age": /ciphertext only, retained for one day.*older than two hours cannot be applied/i,
    "source/module/state/input bindings": /exact run\/attempt, source revision, fixed root, state, inputs, module fingerprints and provider-lock binding/i,
    "provider lock is not module provenance": /a provider lock is not a module lock/i,
    "same saved plan, no replacement or cross-run artifact": /apply job must never generate a new plan instead of the saved plan or accept an artifact from another run/i,
    "no public secrets or plaintext plan/state": /Never paste key material, state, tokens, plaintext plans, raw plan JSON/i,
  });
  explains(await read(".github/steps/04.md"), ".github/steps/04.md", {
    "first-attempt exact saved plan": /fresh attempt 1.*same run's encrypted saved plan, not a replacement plan/i,
    "educational progress cannot replace owner authorization": /AgentAlvine never authorizes Azure.*owner approves.*scope\/budget\/lifetime.*explicit bootstrap authorization/i,
  });
});

test("the live lifecycle requires real verification, an in-place HCL update, fresh convergence and full cleanup", async () => {
  const source = ".github/steps/04.md";
  explains(await read(source), source, {
    "actual configuration inspection": /Azure portal.*JSON View.*provisioningState: Succeeded.*Address space.*defaultOutboundAccess: false/i,
    "green workflow is not configuration proof": /Green Actions\/mocks are not configuration proof/i,
    "HCL tag update": /locals\.tags in avm\/main\.tf.*activity = "actions-azure-updated".*same locals\.tags/i,
    "required tags and topology preserved": /Keep names\/CIDRs\/subnet keys\/required tags/i,
    "in-place update keeps IDs": /in-place update, no replacement, same VNet\/subnet\/NSG IDs/i,
    "fresh followup accepts only zero": /fresh plan exit 0.*exit 2 is not success/i,
    "separately authorized whole cleanup": /separate explicit owner authorization for the whole owned workload.*same-run exact saved destroy plan/i,
    "both state and real Azure absence": /empty managed state and portal VNet\/NSG absence/i,
    "retain shared infrastructure": /Retain RG\/backend\/identities\/runner/i,
    "safe recovery": /Recovery: stop.*never force-unlock, widen roles, delete state or use local destroy/i,
    "drift remains report-only": /scheduled drift is report-only/i,
  });
  explains(await read("docs/delivery-configuration.md"), "docs/delivery-configuration.md", {
    "full destroy, not a target": /fresh full destroy plan.*No partial targets/i,
    "state and ARM absence required": /absence of managed workload state and actual Azure 404s/i,
    "failed cleanup stays with owner": /Failure\/uncertainty leaves cleanup open with the owner/i,
    "optional APIs are not already enabled": /Optional runtime API extensions are blocked until a separate real preflight, authorization and cost review/i,
    "cost disclosure": /never promise a zero-cost exercise/i,
  });
  explains(await read("docs/azure-setup.md"), "docs/azure-setup.md", {
    "Lab 02 mapping, not Lab 07's writer": /Instructor-approved Lab 02 AVM Actions/,
    "other lab cannot clean up this root": /Lab 07 is a different writer\/root\/state and cannot deploy or clean up this network/i,
    "same-state full destroy": /same approved root\/state.*separately authorized dedicated AVM cleanup.*plan -destroy proposes full destruction/i,
    "no local, partial or state-deletion workaround": /No ungated local terraform destroy, -target.*state deletion/i,
  });
});

test("dedicated cleanup instructions match installed/reference names and exact admin authorization, never ordinary main", async () => {
  const source = ".github/steps/04.md";
  const lesson = await read(source);
  const paths = new Set(localLinks(await read(".github/steps/02.md"), ".github/steps/02.md").map(({ path }) => path));
  assert.ok(paths.has(".github/workflows/avm-cleanup.yml"), "Step 2 identifies the separate installed cleanup workflow");
  for (const path of [".github/workflows/avm-cleanup.yml", "solutions/avm-cleanup.yml"]) {
    const workflow = await read(path);
    assert.match(workflow, /^name: Trusted AVM cleanup \(explicit owner authorization required\)/);
    assert.match(workflow, /name: Apply exact authorized AVM destroy plan/);
  }
  explains(lesson, source, {
    "exact binding string": /destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>/,
    "current admin performs explicit dispatch": /current authenticated repository admin.*separate explicit owner authorization.*Trusted AVM cleanup.*Run workflow.*main/i,
    "same-run exact destruction": /same-run exact saved destroy plan/i,
    "real authorization values": /real 40-character SHA\/state-lock value.*never submit placeholders/i,
    "never cleanup on push": /Ordinary pushes never clean up/i,
    "no destructive regular push": /regular deletion\/replacement is rejected/i,
    "cleanup input is required string": /required string authorization.*destroy:1379147533/i,
    "delivery never accepts destroy dispatch": /operation: followup only/i,
  });
});

test("readiness distinguishes generic public prerequisites from the private dated configuration record", async () => {
  const source = "docs/delivery-configuration.md";
  const document = await read(source);
  const publicSource = document.includes("**Public-source context:**");
  assert.notEqual(publicSource, document.includes("## Private-copy configuration record"), "Declare exactly one source-generic or private-record context");
  explains(document, source, {
    "owner-verified hidden-field revision": /read-only workflow token cannot see.*updated_at revision.*zero bypass actors.*Missing\/changed revision fails closed/i,
    "no nonexistent-main PR or unready creation": /open a PR into nonexistent main, or create it while unready/i,
    "owner establishes protected main while disabled": /Only after reviewing the baseline and prerequisite readiness.*owner establishes protected main while delivery remains disabled/i,
    "no automatic default change": /There is no automatic default-branch change/i,
    "progress is educational only": /AgentAlvine only observes\/guides.*educational issue status is not Azure authorization/i,
    "no empty trigger-only work": /real checks-passing PR, not an empty commit or fake change/i,
    "source maintenance is dev-only": /Source maintenance stays on dev/i,
  });
  if (publicSource) explains(document, source, {
    "generic prerequisites, not an inventory": /documents prerequisites, not a current configuration inventory or live result/i,
    "actual scope is not supplied": /No actual Azure scope or cost allowance is supplied by this template/i,
    "ordinary copies remain offline": /Every copy can complete Actions authoring offline; only the exact approved private profile can proceed to Azure/i,
  });
  else explains(document, source, {
    "in-progress only": /configuration is in progress, not complete or live success/i,
    "historical baseline remains dated": /initial live baseline at \d{2}:\d{2} UTC.*WORKSHOP_AZURE_ENABLED=false.*default dev.*no main, environments, runners, secrets or other variables/i,
    "retained environment readback": /Verified configuration update, \d{2}:\d{2} UTC.*avm-plan.*avm-apply.*no Required reviewers.*can_admins_bypass=false.*enablement remains false/i,
    "retained private profile": /alvine-aurelio-org\/ws2-sim-20260921-network-module-laboratory-02.*1379147533/i,
    "missing authorized Azure prerequisites": /No approved Azure RG, region, budget, lifetime or bootstrap authorization was found/i,
  });
});

test("inline course sequence teaches Actions before live operation and retains offline-only completion", async () => {
  assert.equal(course.lessonPresentation, "concise");
  assert.match(course.steps[1].title, /create GitHub Actions/i);
  assert.match(course.steps[2].title, /run the checks/i);
  assert.match(course.steps[3].title, /inspect Azure.*offline only/i);
  for (const { lesson } of originalGates) {
    const document = await read(lesson);
    assert.doesNotMatch(document, /^#{2,3} Required (?:next )?activity/im);
    assert.ok(!localLinks(document, lesson).some(({ path }) => path === "docs/workflow-authoring.md"), "No mandatory auxiliary-guide hand-off");
  }
  explains(course.completion, "course prose", {
    "final instructions stay in Step 4": /inside Step 4 after automatic advancement/i,
    "no fake live completion": /no fifth activity or live completion is awarded/i,
  });
});

test("the concise steps preserve the exact original two-resource and two-output HCL snippets", async () => {
  const snippets = [
    `resource "azurerm_virtual_network" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = var.address_space
  tags                = var.tags
}

resource "azurerm_subnet" "this" {
  for_each = var.subnets

  name                            = each.key
  resource_group_name             = var.resource_group_name
  virtual_network_name            = azurerm_virtual_network.this.name
  address_prefixes                = each.value.address_prefixes
  default_outbound_access_enabled = false
}`,
    `output "vnet_id" {
  description = "Azure resource ID of the virtual network."
  value       = azurerm_virtual_network.this.id
}

output "subnet_ids" {
  description = "Subnet IDs keyed by the caller's stable subnet names."
  value       = tomap({ for name, subnet in azurerm_subnet.this : name => subnet.id })
}`,
  ];
  for (const [index, id] of ["02", "03"].entries()) {
    const blocks = [...(await read(`.github/steps/${id}.md`)).matchAll(/^```hcl\n([\s\S]*?)^```/gm)];
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0][1].trim(), snippets[index]);
  }
});

function assertNoPrivateSnapshot(text) {
  // This fixed eligible identity is a control boundary, not a private readback.
  text = text.replace(/\balvine-aurelio-org\/ws2-sim-20260921-network-module-laboratory-02(?=$|[\s,*`):;])/g, "");
  assert.doesNotMatch(text, /ws2-sim-\d{8}-|\b\d{11}\b|Last supplied readback|Verified configuration update|initial live baseline at|\/actions\/runs\/\d+/i, "Public active guidance must not embed private metadata or live-result claims");
}

test("public active guidance never imports private snapshots while allowing the fixed cleanup authorization syntax", async () => {
  for (const value of ["ws2-sim-20990101-example", "alvine-aurelio-org/ws2-sim-20260921-network-module-laboratory-02-other", "12345678901", "Verified configuration update, 00:00 UTC", "https://example.invalid/actions/runs/123"]) assert.throws(() => assertNoPrivateSnapshot(value));
  assert.doesNotThrow(() => assertNoPrivateSnapshot("Prerequisites only; destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>"));
  assert.doesNotThrow(() => assertNoPrivateSnapshot("Approved identity: alvine-aurelio-org/ws2-sim-20260921-network-module-laboratory-02, ID 1379147533; not a live result."));
  if ((await read("docs/delivery-configuration.md")).includes("**Public-source context:**")) {
    for (const source of ["README.md", "docs/start-here.md", "docs/workflow-authoring.md", "docs/delivery-configuration.md", "docs/pr-author-merge.md", "docs/git-workflow.md", "avm/README.md", ".github/steps/01.md", ".github/steps/04.md", "full-ws-content/README.md", "full-ws-content/00-start-here.md"]) assertNoPrivateSnapshot(await read(source));
  } else {
    for (const source of ["README.md", "docs/start-here.md", "docs/workflow-authoring.md", "docs/pr-author-merge.md", "avm/README.md"]) {
      const document = await read(source);
      assert.ok(localLinks(document, source).some(({ path }) => path === "docs/delivery-configuration.md"));
      assert.doesNotMatch(prose(document), /Last supplied readback.*no main.*environments|no main\/environments\/runners|no main or live configuration/i, `${source}: use the dated configuration record, not stale absence claims`);
    }
  }
});

const linkedDocuments = [
  "README.md", "avm/README.md", "docs/start-here.md", "docs/azure-setup.md",
  "docs/workflow-authoring.md", "docs/delivery-configuration.md", "full-ws-content/README.md",
  "full-ws-content/00-start-here.md", "full-ws-content/azure-setup.md", "full-ws-content/simulation.md",
  ...originalGates.map(({ lesson }) => lesson), ...originalGates.map(({ id }) => activityPath(id)),
];

for (const source of linkedDocuments) {
  test(`${source} has existing local file links that cannot escape the standalone lab`, async () => {
    const links = localLinks(await read(source), source);
    assert.ok(links.length > 0, `${source}: retain navigable local links`);
    for (const { path } of links) {
      let resolved;
      try { resolved = await realpath(join(root, path)); } catch { assert.fail(`Broken local link in ${source}: ${path}`); }
      const within = relative(realRoot, resolved);
      assert.ok(within !== ".." && !within.startsWith(`..${sep}`) && !isAbsolute(within), `Linked file escapes through a filesystem link: ${source}`);
      assert.ok((await stat(resolved)).isFile(), `Local file link is not a file in ${source}: ${path}`);
    }
  });
}
