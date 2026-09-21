import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fingerprintDirectory, hash, ROOT_FILES, sourceBinding, textHash, validateModuleLock, verifyInstalledModules } from "../scripts/avm-dependencies.mjs";
import { makeManifest, verifyManifest } from "../scripts/avm-policy.mjs";
import { fixture } from "./avm-fixtures.mjs";

// Actual fixed source/version inventory, but deliberately tiny synthetic module
// contents and fingerprints. Every filesystem write is beneath a fresh temp
// directory, never the repository's cache, provider lock or Terraform state.
const inventory = [
  { key: "network", source: "registry.terraform.io/Azure/avm-res-network-virtualnetwork/azurerm", version: "0.22.2", dir: ".terraform/modules/network" },
  { key: "network.interfaces", source: "registry.terraform.io/Azure/avm-utl-interfaces/azure", version: "0.6.0", dir: ".terraform/modules/network.interfaces" },
  { key: "network.peering", source: "./modules/peering", version: null, dir: ".terraform/modules/network/modules/peering" },
  { key: "network.subnet", source: "./modules/subnet", version: null, dir: ".terraform/modules/network/modules/subnet" },
  { key: "network.subnet.interfaces", source: "registry.terraform.io/Azure/avm-utl-interfaces/azure", version: "0.6.0", dir: ".terraform/modules/network.subnet.interfaces" },
  { key: "security", source: "registry.terraform.io/Azure/avm-res-network-networksecuritygroup/azurerm", version: "0.5.1", dir: ".terraform/modules/security" },
];
const rootNames = ["backend.tf", "main.tf", "outputs.tf", "providers.tf", "terraform.tf", "variables.tf"];
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizedDigest = (text) => digest(text.replaceAll("\r\n", "\n"));
const directoryLinkType = process.platform === "win32" ? "junction" : "dir";

function moduleFiles(key) {
  return {
    "outputs.tf": 'output "synthetic" { value = "unit-only" }\n',
    "main.tf.json": `${JSON.stringify({ locals: { synthetic_json: key } })}\n`,
    "version.json": `${JSON.stringify({ synthetic: true, module: key })}\n`,
    "main.tf": `locals { synthetic_module = "${key}" }\n`,
  };
}

function expectedFingerprint(files) {
  const records = Object.keys(files).sort().map((path) => ({ path, sha256: normalizedDigest(files[path]) }));
  return { fileCount: records.length, sha256: digest(JSON.stringify(records)) };
}

function moduleLock() {
  return {
    schemaVersion: 1, terraform: "1.16.1", description: "Synthetic test-only module content, not downloaded AVM evidence",
    modules: inventory.map(({ key, source, version }) => ({ key, source, version, ...expectedFingerprint(moduleFiles(key)) })),
  };
}

async function temporary(t) {
  // Canonicalize the temp parent so an OS alias is not an accidental symlink
  // negative. Deliberate escape targets remain under this disposable directory.
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(join(parent, "ws2-avm-dependencies-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function put(file, text) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
}

async function installSyntheticModules(t) {
  const temporaryRoot = await temporary(t), root = join(temporaryRoot, "avm");
  const cache = join(root, ".terraform", "modules");
  const lock = moduleLock();
  const installed = { Modules: [{ Key: "", Source: "", Dir: "." }, ...inventory.map(({ key, source, version, dir }) => ({ Key: key, Source: source, ...(version === null ? {} : { Version: version }), Dir: dir }))] };
  await mkdir(cache, { recursive: true });
  for (const entry of inventory) {
    for (const [name, text] of Object.entries(moduleFiles(entry.key))) await put(join(root, entry.dir, name), text);
    await put(join(root, entry.dir, "README.md"), "Synthetic non-runtime documentation.\n");
  }
  const lockPath = join(root, "module-lock.json"), manifestPath = join(cache, "modules.json");
  await put(lockPath, JSON.stringify(lock));
  await put(manifestPath, JSON.stringify(installed));
  return { temporaryRoot, root, cache, lock, installed, lockPath, manifestPath };
}

async function sourceFixture(t) {
  const sample = await installSyntheticModules(t);
  const files = {
    "backend.tf": 'terraform {\n  backend "azurerm" {}\n}\n',
    "main.tf": 'locals { synthetic = "not-a-deployment" }\n',
    "outputs.tf": 'output "synthetic" { value = local.synthetic }\n',
    "providers.tf": 'provider "azurerm" {\n  features {}\n}\n',
    "terraform.tf": 'terraform { required_version = "= 1.16.1" }\n',
    "variables.tf": 'variable "name" { type = string }\n',
  };
  const providerText = 'provider "registry.terraform.io/hashicorp/azurerm" {\n  version = "4.81.0"\n  constraints = "= 4.81.0"\n  hashes = ["h1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="]\n}\n';
  for (const [name, text] of Object.entries(files)) await put(join(sample.root, name), text);
  await put(join(sample.root, ".terraform.lock.hcl"), providerText);
  await put(join(sample.root, "README.md"), "Synthetic source root; never run Terraform here.\n");
  return { ...sample, files, providerText };
}

async function snapshot(root) {
  const entries = [];
  async function walk(folder, prefix = "") {
    for (const name of (await readdir(folder)).sort()) {
      const path = join(folder, name), relative = prefix ? `${prefix}/${name}` : name;
      const info = await lstat(path);
      assert.equal(info.isSymbolicLink(), false, "Read-only snapshots must not follow synthetic escape links");
      if (info.isDirectory()) { entries.push([relative, "directory"]); await walk(path, relative); }
      else { assert.ok(info.isFile()); entries.push([relative, digest(await readFile(path))]); }
    }
  }
  await walk(root);
  return entries;
}

test("the exact six-module inventory and pins match the independent synthetic lock", () => {
  const lock = moduleLock();
  assert.deepEqual(lock.modules.map(({ key }) => key), ["network", "network.interfaces", "network.peering", "network.subnet", "network.subnet.interfaces", "security"]);
  assert.strictEqual(validateModuleLock(lock), lock);
  assert.deepEqual(ROOT_FILES, rootNames);
});

test("module lock schema and Terraform versions are mandatory", () => {
  for (const change of [{ schemaVersion: 2 }, { schemaVersion: "1" }, { terraform: "1.16.0" }, { terraform: undefined }]) assert.throws(() => validateModuleLock({ ...moduleLock(), ...change }), { code: "ERR_ASSERTION" });
});

test("every module source and version is fixed, including local submodule null versions", () => {
  for (const { key } of inventory) {
    for (const change of [{ source: "registry.terraform.io/example/unreviewed/azure" }, { version: "9.9.9" }]) {
      const lock = moduleLock(); Object.assign(lock.modules.find((entry) => entry.key === key), change);
      assert.throws(() => validateModuleLock(lock), /Unexpected module source\/version/);
    }
  }
});

test("missing, extra, duplicate and reordered locked modules fail the fixed inventory", () => {
  for (const mutate of [
    (lock) => { lock.modules.pop(); },
    (lock) => { lock.modules.push({ ...lock.modules[0], key: "unreviewed" }); },
    (lock) => { lock.modules[1] = structuredClone(lock.modules[0]); },
    (lock) => { lock.modules.reverse(); },
  ]) {
    const lock = moduleLock(); mutate(lock);
    assert.throws(() => validateModuleLock(lock), /Unexpected AVM module inventory/);
  }
});

test("module fingerprints require positive integer counts and exact lowercase SHA-256", () => {
  for (const change of [{ fileCount: 0 }, { fileCount: -1 }, { fileCount: 1.5 }, { fileCount: "4" }, { sha256: "g".repeat(64) }, { sha256: "a".repeat(63) }, { sha256: "A".repeat(64) }]) {
    const lock = moduleLock(); Object.assign(lock.modules[0], change);
    assert.throws(() => validateModuleLock(lock), { code: "ERR_ASSERTION" });
  }
});

test("fingerprinting independently hashes sorted Terraform, Terraform JSON and version JSON files only", async (t) => {
  const root = await temporary(t), files = moduleFiles("standalone");
  for (const [name, text] of Object.entries(files)) await put(join(root, name), text);
  for (const [name, text] of [["README.md", "ignored docs"], ["notes.json", "{}"], ["examples/example.tf", "ignored nested example"], ["tests/example.tftest.hcl", "ignored tests"]]) await put(join(root, name), text);
  const before = await snapshot(root);
  assert.deepEqual(await fingerprintDirectory(root), expectedFingerprint(files));
  assert.equal((await fingerprintDirectory(root)).fileCount, 4);
  assert.deepEqual(await snapshot(root), before, "Fingerprinting must not write files");
  assert.equal(hash("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("fingerprint text normalization accepts CRLF, but preserves other bytes and filenames", async (t) => {
  const root = await temporary(t), files = moduleFiles("standalone");
  for (const [name, text] of Object.entries(files)) await put(join(root, name), text.replaceAll("\n", "\r\n"));
  assert.deepEqual(await fingerprintDirectory(root), expectedFingerprint(files));
  assert.equal(textHash("a\r\nb\r\n"), digest("a\nb\n"));
  assert.notEqual(textHash("a\rb\n"), digest("a\nb\n"));
  assert.notEqual(textHash("a\n"), textHash("a"));
  await put(join(root, "main.tf"), `${files["main.tf"]} `);
  assert.notDeepEqual(await fingerprintDirectory(root), expectedFingerprint(files));
});

test("a runtime-looking directory or linked module directory is not a regular source file", async (t) => {
  const parent = await temporary(t), root = join(parent, "module");
  await mkdir(join(root, "main.tf"), { recursive: true });
  await assert.rejects(fingerprintDirectory(root), /Source must be a regular file/);
  await symlink(root, join(parent, "linked-module"), directoryLinkType);
  await assert.rejects(fingerprintDirectory(join(parent, "linked-module")), /Module directory cannot be a link/);
});

test("installed provenance accepts all six synthetic modules without modifying source or cache", async (t) => {
  const sample = await installSyntheticModules(t), before = await snapshot(sample.temporaryRoot);
  assert.equal(await verifyInstalledModules(sample.root), 6);
  for (const { key, dir } of inventory) assert.deepEqual(await fingerprintDirectory(join(sample.root, dir)), expectedFingerprint(moduleFiles(key)));
  assert.deepEqual(await snapshot(sample.temporaryRoot), before);
});

test("installation order is irrelevant but each local module still needs its own fingerprint", async (t) => {
  const sample = await installSyntheticModules(t);
  sample.installed.Modules.reverse();
  await put(sample.manifestPath, JSON.stringify(sample.installed));
  assert.equal(await verifyInstalledModules(sample.root), 6);
  const subnet = inventory.find(({ key }) => key === "network.subnet");
  await put(join(sample.root, subnet.dir, "main.tf"), 'locals { injected = "child-module-only" }\n');
  await assert.rejects(verifyInstalledModules(sample.root), /Downloaded module source changed/);
});

test("downloaded module version and source must equal the reviewed lock for every entry", async (t) => {
  const sample = await installSyntheticModules(t), original = structuredClone(sample.installed);
  for (const { key } of inventory) {
    for (const change of [{ Source: "./unreviewed-source" }, { Version: "99.0.0" }]) {
      const manifest = structuredClone(original);
      Object.assign(manifest.Modules.find((entry) => entry.Key === key), change);
      await put(sample.manifestPath, JSON.stringify(manifest));
      await assert.rejects(verifyInstalledModules(sample.root), { code: "ERR_ASSERTION" });
    }
  }
});

test("missing registry versions, missing modules, duplicates and extra transitive entries are rejected", async (t) => {
  const sample = await installSyntheticModules(t);
  for (const mutate of [
    (manifest) => { delete manifest.Modules.find(({ Key }) => Key === "network").Version; },
    (manifest) => { manifest.Modules.pop(); },
    (manifest) => { manifest.Modules.push({ Key: "extra", Source: "./extra", Dir: ".terraform/modules/extra" }); },
    (manifest) => { manifest.Modules[2] = structuredClone(manifest.Modules[1]); },
    (manifest) => { manifest.Modules[0].Dir = ".."; },
    (manifest) => { manifest.Modules[0].Source = "unreviewed-root"; },
  ]) {
    const manifest = structuredClone(sample.installed); mutate(manifest);
    await put(sample.manifestPath, JSON.stringify(manifest));
    await assert.rejects(verifyInstalledModules(sample.root), { code: "ERR_ASSERTION" });
  }
});

test("changed HCL, Terraform JSON and version JSON in installed modules fail provenance", async (t) => {
  const sample = await installSyntheticModules(t), entry = inventory.find(({ key }) => key === "security");
  for (const name of ["main.tf", "main.tf.json", "version.json"]) {
    const file = join(sample.root, entry.dir, name), before = await readFile(file, "utf8");
    await put(file, name.endsWith(".json") ? '{"synthetic":"changed"}\n' : 'locals { changed = true }\n');
    await assert.rejects(verifyInstalledModules(sample.root), /Downloaded module source changed/);
    await put(file, before);
  }
  assert.equal(await verifyInstalledModules(sample.root), 6);
});

test("added HCL or Terraform JSON and missing runtime files cannot retain a valid fingerprint", async (t) => {
  const sample = await installSyntheticModules(t), directory = join(sample.root, inventory[0].dir);
  for (const name of ["injected.tf", "injected.tf.json"]) {
    const file = join(directory, name);
    await put(file, name.endsWith(".json") ? "{}\n" : "locals { injected = true }\n");
    await assert.rejects(verifyInstalledModules(sample.root), /Downloaded module source changed/);
    await rm(file);
  }
  await rm(join(directory, "outputs.tf"));
  await assert.rejects(verifyInstalledModules(sample.root), /Downloaded module source changed/);
});

test("module runtime CRLF changes and documentation edits do not invalidate reviewed content", async (t) => {
  const sample = await installSyntheticModules(t);
  for (const entry of inventory) {
    for (const [name, text] of Object.entries(moduleFiles(entry.key))) await put(join(sample.root, entry.dir, name), text.replaceAll("\n", "\r\n"));
    await put(join(sample.root, entry.dir, "README.md"), "Different non-runtime documentation.\n");
  }
  assert.equal(await verifyInstalledModules(sample.root), 6);
});

test("module paths outside the exact cache, prefix-collision siblings and the cache itself are rejected", async (t) => {
  const sample = await installSyntheticModules(t), outside = join(sample.temporaryRoot, "outside"), sibling = join(sample.root, ".terraform", "modules-unreviewed");
  await mkdir(outside); await mkdir(sibling);
  for (const dir of [outside, sibling, ".terraform/modules", "..", "../outside"]) {
    const manifest = structuredClone(sample.installed);
    manifest.Modules.find(({ Key }) => Key === "network").Dir = dir;
    await put(sample.manifestPath, JSON.stringify(manifest));
    await assert.rejects(verifyInstalledModules(sample.root), /Module escaped the cache/);
  }
});

test("a directory symlink or junction cannot escape the module cache even with the expected source", async (t) => {
  const sample = await installSyntheticModules(t), outside = join(sample.temporaryRoot, "outside");
  await mkdir(outside);
  for (const [name, text] of Object.entries(moduleFiles("network"))) await put(join(outside, name), text);
  await symlink(outside, join(sample.cache, "escape"), directoryLinkType);
  sample.installed.Modules.find(({ Key }) => Key === "network").Dir = ".terraform/modules/escape";
  await put(sample.manifestPath, JSON.stringify(sample.installed));
  await assert.rejects(verifyInstalledModules(sample.root), /Module escaped the cache/);
  assert.deepEqual(await fingerprintDirectory(outside), expectedFingerprint(moduleFiles("network")), "Reject the path boundary, not a coincidental bad fingerprint");
});

test("linked in-cache module aliases are rejected even when their contents and pins match", async (t) => {
  const sample = await installSyntheticModules(t);
  await symlink(join(sample.root, inventory[0].dir), join(sample.cache, "network-alias"), directoryLinkType);
  sample.installed.Modules.find(({ Key }) => Key === "network").Dir = ".terraform/modules/network-alias";
  await put(sample.manifestPath, JSON.stringify(sample.installed));
  await assert.rejects(verifyInstalledModules(sample.root), /Linked module paths are not allowed/);
});

test("malformed local manifests fail rather than refreshing or repairing the synthetic cache", async (t) => {
  const sample = await installSyntheticModules(t);
  for (const contents of ["not-json", "{}", '{"Modules":null}']) {
    await put(sample.manifestPath, contents);
    const before = await snapshot(sample.temporaryRoot);
    await assert.rejects(verifyInstalledModules(sample.root));
    assert.deepEqual(await snapshot(sample.temporaryRoot), before);
  }
});

test("source binding returns independently calculated source, module-lock and provider-lock digests", async (t) => {
  const sample = await sourceFixture(t), before = await snapshot(sample.temporaryRoot);
  const expected = {
    source: digest(JSON.stringify(rootNames.map((path) => ({ path, sha256: normalizedDigest(sample.files[path]) })))),
    moduleLock: normalizedDigest(await readFile(sample.lockPath, "utf8")),
    providerLock: normalizedDigest(sample.providerText),
  };
  assert.deepEqual(await sourceBinding(sample.root), expected);
  assert.deepEqual(await snapshot(sample.temporaryRoot), before, "Binding must not write, initialize or access real state");
});

test("source binding requires all six exact root configuration files", async (t) => {
  const sample = await sourceFixture(t);
  for (const name of rootNames) {
    await rm(join(sample.root, name));
    await assert.rejects(sourceBinding(sample.root), /Unexpected root configuration file/);
    await put(join(sample.root, name), sample.files[name]);
  }
});

test("extra HCL, JSON configuration and Terraform override files cannot enter the root", async (t) => {
  const sample = await sourceFixture(t);
  for (const name of ["extra.tf", "extra.tf.json", "override.tf", "override.tf.json", "extra_override.tf", "main.tf.json"]) {
    await put(join(sample.root, name), name.endsWith(".json") ? "{}\n" : "locals { extra = true }\n");
    await assert.rejects(sourceBinding(sample.root), /Unexpected root configuration file/);
    await rm(join(sample.root, name));
  }
});

test("automatic and explicitly named tfvars files cannot inject unbound inputs", async (t) => {
  const sample = await sourceFixture(t);
  for (const name of ["terraform.tfvars", "terraform.tfvars.json", "injected.auto.tfvars", "injected.auto.tfvars.json", "private.tfvars", "private.tfvars.json"]) {
    await put(join(sample.root, name), name.endsWith(".json") ? '{"name":"injected"}\n' : 'name = "injected"\n');
    await assert.rejects(sourceBinding(sample.root), /Only the private bound input file is allowed/);
    await rm(join(sample.root, name));
  }
});

test("source binding rejects a root file replaced by a directory or junction", async (t) => {
  const sample = await sourceFixture(t), path = join(sample.root, "main.tf"), outside = join(sample.temporaryRoot, "outside");
  await rm(path); await mkdir(path);
  await assert.rejects(sourceBinding(sample.root), /Source must be a regular file/);
  await rm(path, { recursive: true }); await mkdir(outside);
  await symlink(outside, path, directoryLinkType);
  await assert.rejects(sourceBinding(sample.root), /Source must be a regular file/);
});

test("source, module lock and provider lock are bound independently without digest conflation", async (t) => {
  const sample = await sourceFixture(t), baseline = await sourceBinding(sample.root);
  const cases = [["source", join(sample.root, "main.tf"), `${sample.files["main.tf"]}# reviewed source changed\n`], ["moduleLock", sample.lockPath, `${JSON.stringify(sample.lock, null, 2)}\n`], ["providerLock", join(sample.root, ".terraform.lock.hcl"), sample.providerText.replace("4.81.0", "4.82.0")]];
  for (const [field, path, replacement] of cases) {
    const original = await readFile(path, "utf8");
    await put(path, replacement);
    const changed = await sourceBinding(sample.root);
    assert.notEqual(changed[field], baseline[field], `${field} must detect exact bound bytes`);
    for (const other of Object.keys(baseline).filter((name) => name !== field)) assert.equal(changed[other], baseline[other], `Changing ${field} must not replace ${other}'s binding`);
    await put(path, original);
  }
  assert.deepEqual(await sourceBinding(sample.root), baseline);
});

test("LF and CRLF source/lock bytes bind equally; unrelated documentation does not bind", async (t) => {
  const sample = await sourceFixture(t), baseline = await sourceBinding(sample.root);
  for (const name of [...rootNames, "module-lock.json", ".terraform.lock.hcl"]) {
    const path = join(sample.root, name);
    await put(path, (await readFile(path, "utf8")).replaceAll("\n", "\r\n"));
  }
  await put(join(sample.root, "README.md"), "Different ignored documentation.\n");
  assert.deepEqual(await sourceBinding(sample.root), baseline);
});

test("missing provider lock and invalid module-lock content fail source binding", async (t) => {
  const sample = await sourceFixture(t), provider = join(sample.root, ".terraform.lock.hcl");
  await rm(provider);
  await assert.rejects(sourceBinding(sample.root), { code: "ENOENT" });
  await put(provider, sample.providerText);
  await put(sample.lockPath, "not-json");
  await assert.rejects(sourceBinding(sample.root), SyntaxError);
  const lock = moduleLock(); lock.modules[0].version = "99.0.0";
  await put(sample.lockPath, JSON.stringify(lock));
  await assert.rejects(sourceBinding(sample.root), /Unexpected module source\/version/);
});

test("saved manifests reject any changed root-source, module-lock or provider-lock binding", async (t) => {
  const sample = await sourceFixture(t), now = Date.UTC(2026, 8, 21);
  const binding = { ...fixture().binding, ...await sourceBinding(sample.root) };
  const planBytes = Buffer.from("SYNTHETIC-PLAN-ONLY");
  const manifestBytes = Buffer.from(JSON.stringify(makeManifest(binding, planBytes, 2, now)));
  const args = { manifestBytes, planBytes, binding, planHash: digest(planBytes), manifestHash: digest(manifestBytes), mainSha: binding.sha, now };
  assert.equal(verifyManifest(args).exitCode, 2);
  for (const [name, replacement] of [["main.tf", `${sample.files["main.tf"]}# changed\n`], ["module-lock.json", `${JSON.stringify(sample.lock, null, 2)}\n`], [".terraform.lock.hcl", `${sample.providerText}# changed\n`]]) {
    const path = join(sample.root, name), original = await readFile(path, "utf8");
    await put(path, replacement);
    const changed = { ...fixture().binding, ...await sourceBinding(sample.root) };
    assert.throws(() => verifyManifest({ ...args, binding: changed }), /Commit\/run\/root\/state\/inputs\/dependencies mismatch/);
    await put(path, original);
  }
});
