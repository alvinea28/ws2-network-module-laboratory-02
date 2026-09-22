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

test("the real continuation entry points link both Lab 02 guides without adding a core gate", async () => {
  const entries = [
    "README.md", "docs/start-here.md", ".github/steps/04.md", "avm/README.md",
    "full-ws-content/README.md", "full-ws-content/00-start-here.md", "full-ws-content/activity-04.md",
    "docs/azure-setup.md", "full-ws-content/azure-setup.md",
  ];
  for (const source of entries) {
    const paths = new Set(localLinks(await read(source), source).map(({ path }) => path));
    for (const target of ["docs/workflow-authoring.md", "docs/delivery-configuration.md"]) assert.ok(paths.has(target), `${source} must link ${target}`);
  }
  for (const source of ["docs/workflow-authoring.md", "docs/delivery-configuration.md", "avm/README.md"]) {
    const paths = new Set(localLinks(await read(source), source).map(({ path }) => path));
    for (const target of ["solutions/avm-delivery.yml", ".github/workflows/avm-delivery.yml"]) assert.ok(paths.has(target), `${source} must distinguish the reference from the canonical writer`);
  }
});

test("4/4 expressly means offline completion rather than deployment, approval or cleanup", async () => {
  const boundaries = {
    "README.md": /offline 4\/4 is not deployment proof/i,
    "docs/start-here.md": /Offline 4\/4 is not Azure deployment or approval proof/i,
    ".github/steps/04.md": /4\/4 is not an AVM deployment, human approval or cleanup result/i,
    "docs/workflow-authoring.md": /4\/4 remains offline learner-root completion, not deployment, Azure authorization or cleanup proof/i,
    "docs/delivery-configuration.md": /neither those cases nor historical 4\/4 results verify AVM delivery/i,
    "avm/README.md": /4\/4 remains core learner-root completion only; it proves no AVM deployment, live approval or cleanup/i,
    "full-ws-content/README.md": /historical 4\/4 do not complete\/validate AVM/i,
  };
  for (const [source, pattern] of Object.entries(boundaries)) explains(await read(source), source, { "explicit non-live 4/4 boundary": pattern });
  for (const source of ["README.md", "docs/start-here.md", ".github/steps/04.md", "docs/workflow-authoring.md", "avm/README.md", "full-ws-content/README.md"]) {
    explains(await read(source), source, { "missing real preflight leaves the continuation pending": /live continuation pending/i });
  }
});

test("learners construct a complete untitled reference before one disabled whole-file installation", async () => {
  const source = "docs/workflow-authoring.md";
  explains(await read(source), source, {
    "required continuation, not a fifth gate": /required live continuation.*not a fifth AgentAlvine gate/i,
    "disabled authoring": /WORKSHOP_AZURE_ENABLED=false/,
    "new untitled YAML buffer": /File.*New Text File.*buffer untitled.*YAML/i,
    "non-runnable reference": /non-runnable reference, not a second delivery entry/i,
    "copy and explain sections": /Copy the sections.*original order and indentation.*Explain each/i,
    "no runnable draft or duplicate writer": /Do not save a draft, backup, alternate filename or partial workflow/i,
    "whole-file installation while disabled": /still disabled.*replace the entire contents.*one complete editor edit\/save/i,
    "no saved second workflow": /Close the untitled buffer without saving another workflow/i,
    "preserve action pins and driver calls": /Copy action commit pins and driver invocations exactly/i,
    "no authoring cloud/state operations": /No Azure login, identity creation, subscription changes, backend\/state access or real plan\/apply\/destroy belongs in authoring or PR validation/i,
    "missing authorized scope stops offline": /Missing sandbox, budget, lifetime, bootstrap authorization.*stop offline.*not simulated readiness/i,
  });
});

test("the lesson teaches copying all six actual jobs, including followup and drift", async () => {
  const workflow = await read(".github/workflows/avm-delivery.yml");
  const jobs = workflow.slice(workflow.indexOf("\njobs:\n") + 1);
  assert.ok(jobs.startsWith("jobs:\n"), "Read the real top-level jobs block");
  // Inventory the reviewed file's two-space job headings, not a YAML/security parser.
  const actual = [...jobs.matchAll(/^ {2}([a-z][a-z\d_-]*):[ \t]*$/gm)].map((match) => match[1]);
  assert.deepEqual(actual, jobIds);
  const source = "docs/workflow-authoring.md";
  const lesson = await read(source);
  for (const id of actual) explains(lesson, source, {
    [`copy the ${id} job, not merely mention its name`]: new RegExp(`\\bcopy(?:ing)?\\b[^.]{0,240}\\b${id}\\b[^.]{0,120}\\bjobs?\\b`, "i"),
  });
  explains(lesson, source, {
    "whole-document review includes six jobs": /all six jobs/i,
    "admission is not a checkbox": /preflight.*Admission checks.*not a learner checkbox/i,
    "same-revision validation before privileged planning": /Checks the same source revision before privileged planning/i,
    "plan uses its protected environment and exact runner": /uses environment avm-plan.*ephemeral Linux x64 ws2-trusted/i,
    "apply has its own identity and scoped key": /uses avm-apply, the distinct apply identity, and the environment-scoped PLAN_DECRYPTION_PRIVATE_KEY/i,
    "both environments remain main-only without reviewers or bypass": /Both live environments require main-only deployment rules, no Required reviewers and no administrator bypass/i,
    "author may merge without fabricated self-approval": /author may merge their own passing PR.*zero required PR approvals is not fabricated self-approval/i,
    "followup is fresh and verifies topology": /Followup requires a fresh exit-zero plan and checks actual topology/i,
    "failed drift assessment never permits apply": /Drift reports either detected changes or a failed\/incomplete assessment; neither result permits apply/i,
  });
});

test("main push automatically applies one exact plan; delivery dispatch is followup-only and cleanup is separate", async () => {
  const source = "docs/workflow-authoring.md";
  explains(await read(source), source, {
    "push-driven exact-plan deployment": /Reviewed push\/merge to protected main.*apply the exact plan in the same run/i,
    "no manual deploy or second deploy button": /no manual deploy choice and no second deploy button/i,
    "no reviewer wait or approvals API": /There is no waiting human-review job or approvals API call/i,
    "delivery dispatch is followup-only": /delivery workflow's manual operation choice is followup only/i,
    "cleanup has a string authorization, not an operation menu": /Dedicated cleanup accepts a required string authorization, no operation input/i,
    "dependency chain": /preflight\s*\u2192\s*validation\s*\u2192\s*plan\s*\u2192\s*apply/i,
    "read-only operations cannot apply": /followup and drift must never reach apply/i,
    "exclusive destroy": /A destroy run must not also deploy/i,
    "first attempt only": /Only attempt 1 of a live run is eligible/i,
    "scheduled drift does not repair": /Report-only live drift check; never repair or apply automatically/i,
    "default dev needs deliberate owner choice, not automatic changes": /schedules use the default branch.*If the copy uses dev.*only when ready may the owner deliberately select approved protected main.*No automatic default change/i,
  });
});

test("offline instructions distinguish four original cases from three AVM cases with all providers mocked", async () => {
  const core = await read("tests/network.tftest.hcl");
  assert.deepEqual([...core.matchAll(/^run "([^"]+)"/gm)].map((match) => match[1]), coreCases);
  const step = await read(".github/steps/04.md");
  for (const name of coreCases) assert.ok(step.includes(`\`${name}\``), `Step 4 must teach ${name}`);
  const companion = await read("avm/tests/contract.tftest.hcl");
  assert.deepEqual([...companion.matchAll(/^mock_provider "([^"]+)"/gm)].map((match) => match[1]).sort(), ["azapi", "azurerm", "modtm", "random"]);
  assert.equal([...companion.matchAll(/^run "/gm)].length, 3, "Count declared AVM contracts; this does not execute them");
  assert.equal([...companion.matchAll(/^\s*command\s*=\s*plan[ \t]*$/gm)].length, 3);
  const source = "docs/workflow-authoring.md";
  const guide = await read(source);
  for (const command of ["npm run workflow:check", "npm test", "npm run kit:check", "npm run companion:check", "node scripts/check-learner.mjs"]) {
    assert.ok(guide.includes(command), `${source}: explain the approved ${command} check`);
  }
  explains(guide, source, {
    "all providers are mocked": /AzureRM, AzAPI, ModTM and Random are all mocked/i,
    "AVM has three plan-only cases": /three plan-only mocked contracts/i,
    "zero failures, errors or skipped cases": /no failed, errored or skipped cases/i,
    "backend-disabled, read-only lock": /backend-disabled initialization and the read-only provider lock/i,
    "original helper remains four cases on 5.4.0": /original learner root on AzureRM 5\.4\.0 and its four mocked cases/i,
    "offline does not mean no public downloads": /Credential-free validation may download pinned public providers\/modules/i,
    "no cloud credentials, caches or state": /must not receive Azure credentials, OIDC, CLI caches or live state/i,
    "checks are not already-obtained results": /instructions for learner validation, not results already obtained/i,
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
  explains(await read("docs/workflow-authoring.md"), "docs/workflow-authoring.md", {
    "bindings explained before apply": /exact run, first attempt, source revision, fixed root, state target, inputs, module source fingerprints and provider lock/i,
    "two-hour limit": /two-hour maximum age/i,
    "ciphertext only": /Only the encrypted plan envelope is uploaded.*one-day artifact retention/i,
    "saved-plan bindings checked before apply": /driver checks saved-plan bindings before applying/i,
    "runtime authorization delegates, not approval history": /avm-approval\.cjs.*delegates to.*deployment-authorization\.cjs.*no approvals API/i,
    "educational progress cannot replace owner authorization": /Scope\/budget\/bootstrap authorization still belongs to the owner, not to Copilot or the Exercise issue/i,
  });
});

test("the live lifecycle requires real verification, an in-place HCL update, fresh convergence and full cleanup", async () => {
  const source = "docs/workflow-authoring.md";
  explains(await read(source), source, {
    "actual ARM verification": /real live verification must check Azure Resource Manager configuration/i,
    "outputs and screenshots are not enough": /Terraform outputs alone, screenshots or synthetic provider IDs are insufficient/i,
    "benign tag update is in HCL": /benign HCL tag change in the tags map of the locals block in avm\/main\.tf/i,
    "retain source/provenance and required tags": /Keep required workshop\/environment tags.*module-source pins, controls and provenance fixed/i,
    "in-place update keeps IDs": /Require an in-place update and verify the same resource IDs/i,
    "unexpected replacement stops mutation": /Unexpected replacement\/deletion stops the run before mutation/i,
    "fresh followup accepts only zero": /fresh live plan.*Require exit 0, not a cached pre-apply plan or ignored exit 2/i,
    "exclusive same-root/state destroy": /whole owned workload, same root\/state and exclusive operation/i,
    "exact destroy plan separately authorized": /separately authorized full cleanup.*same run's validated exact destroy plan/i,
    "one authorized owner, no second cleanup reviewer": /No independent cleanup reviewer is required.*one explicitly authorized owner dispatches/i,
    "both state and real Azure absence": /actual managed-state and Azure absence checks.*404s/i,
    "retain shared infrastructure": /Preserve the existing RG, backend, identities and runner infrastructure/i,
    "uncertain cleanup stays open": /Failed or uncertain cleanup stays open.*never delete state or switch to local destroy/i,
    "drift is not lifecycle completion": /Scheduled drift is an additional report, not any of these create\/update\/follow-up\/\s*destroy outcomes/i,
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
  const source = "docs/workflow-authoring.md";
  const lesson = await read(source);
  const paths = new Set(localLinks(lesson, source).map(({ path }) => path));
  for (const path of [".github/workflows/avm-cleanup.yml", "solutions/avm-cleanup.yml"]) {
    assert.ok(paths.has(path), `${source} must link ${path}`);
    const workflow = await read(path);
    assert.match(workflow, /^name: Trusted AVM cleanup \(explicit owner authorization required\)/);
    assert.match(workflow, /name: Apply exact authorized AVM destroy plan/);
  }
  explains(lesson, source, {
    "exact binding string": /destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>/,
    "current admin performs explicit dispatch": /authenticated current repository admin.*explicitly authorizes.*Trusted AVM cleanup/i,
    "actor and same-run checks": /current admin permission, actor\/sender\/trigger IDs, current SHA\/state, and the same run's validated exact destroy plan/i,
    "same ownership boundary": /same state\/concurrency\/environments\/identities/i,
    "never cleanup on main": /ordinary main never performs cleanup/i,
    "no destructive regular push": /Regular pushes reject destroy and replacements/i,
    "cleanup input is required string": /required string authorization.*destroy:1379147533/i,
    "delivery never accepts destroy dispatch": /delivery workflow's manual operation choice is followup only/i,
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

test("actual entry pages expose a named required activity with Actions before Azure and distinct outcomes", async () => {
  for (const source of ["README.md", ".github/steps/04.md", "full-ws-content/README.md", "full-ws-content/activity-04.md"]) {
    const document = await read(source);
    assert.match(document, /^#{2,3} Required activity .*Create GitHub Actions, then deploy Azure$/m, `${source}: a named activity, not a hidden help link`);
    assert.ok(localLinks(document, source).some(({ path }) => path === "docs/workflow-authoring.md"), `${source}: link the actual authoring guide`);
    const text = prose(document);
    assert.ok(text.indexOf("Phase A") >= 0 && text.indexOf("Phase B") > text.indexOf("Phase A"), `${source}: teach Actions before Azure`);
    explains(document, source, {
      "offline authoring phase": /Phase A.*Actions authoring \(offline\)/i,
      "live phase is distinct": /Phase B.*Azure lifecycle/i,
      "real PR, no trigger-only fake work": /checks-passing PR.*(?:empty commit|fake change)/i,
      "disabled authoring": /WORKSHOP_AZURE_ENABLED=false/,
      "pending is not live completion": /live continuation pending/i,
      "progress is not authorization": /AgentAlvine only observes\/guides/i,
    });
  }
  for (const source of [".github/steps/01.md", "full-ws-content/activity-01.md", "docs/start-here.md", "full-ws-content/00-start-here.md"]) {
    const document = await read(source);
    assert.ok(localLinks(document, source).some(({ path }) => path === "docs/workflow-authoring.md"));
    explains(document, source, { "early discovery": /Create GitHub Actions, then deploy Azure/i, "ordinary copies do not deploy": /(?:generic.*copy.*cannot deploy|only.*exact approved private copy)/i });
  }
  explains(course.description + " " + course.completion, "course prose", { "named continuation": /required Create GitHub Actions, then deploy Azure activity/, "no fake live completion": /No live completion is awarded by 4\/4/ });
});

test("authoring teaches actual checks, variable meanings and owner handoff without bypass instructions", async () => {
  const source = "docs/workflow-authoring.md", document = await read(source);
  for (const command of ["terraform fmt -check -recursive", "terraform init -backend=false -lockfile=readonly -input=false", "terraform validate", "terraform test"]) assert.ok(document.includes(command));
  for (const value of ["github.sha", "vars.WORKSHOP_AZURE_ENABLED", "needs.preflight.outputs.operation", "vars.AZURE_PLAN_CLIENT_ID", "vars.AZURE_APPLY_CLIENT_ID", "vars.WORKLOAD_INPUTS_JSON", "needs.plan.outputs.*", "secrets.PLAN_DECRYPTION_PRIVATE_KEY"]) assert.ok(document.includes(`\`${value}\``), `Explain ${value}`);
  explains(document, source, {
    "real expected core result": /Success! 4 passed, 0 failed/,
    "real expected AVM result": /3 mocked authoring contracts passed, 0 failed\/skipped; native mocked plan admission verified. Not live Azure acceptance/i,
    "read-only workflow inventory": /1 canonical delivery workflow; 1 separately authorized cleanup workflow; 4 reviewed companions/i,
    "actual syntax check": /actionlint 1\.7\.12.*success prints no diagnostics/i,
    "no eligible-ID bypass": /Do not repin IDs, names, workflow hashes or ruleset revisions, or toggle flags, to make another copy eligible/i,
    "owner handoff on absent main": /If protected main does not exist.*stop at the offline handoff.*owner establish protected main while disabled/i,
    "no authoring publication to main": /Source-template maintenance belongs on dev, not participant live main/i,
    "no manual evidence protocol": /No manual checkboxes, evidence PRs or success comments award live completion/i,
  });
});

function assertNoPrivateSnapshot(text) {
  assert.doesNotMatch(text, /ws2-sim-\d{8}-|\b\d{11}\b|Last supplied readback|Verified configuration update|initial live baseline at|\/actions\/runs\/\d+/i, "Public active guidance must not embed private metadata or live-result claims");
}

test("public active guidance never imports private snapshots while allowing the fixed cleanup authorization syntax", async () => {
  for (const value of ["ws2-sim-20990101-example", "12345678901", "Verified configuration update, 00:00 UTC", "https://example.invalid/actions/runs/123"]) assert.throws(() => assertNoPrivateSnapshot(value));
  assert.doesNotThrow(() => assertNoPrivateSnapshot("Prerequisites only; destroy:1379147533:<current full main SHA>:<WS2_STATE_LOCK_ID>"));
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
