import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const ROOT_FILES = ["backend.tf", "main.tf", "outputs.tf", "providers.tf", "terraform.tf", "variables.tf"];
const moduleKeys = ["network", "network.interfaces", "network.peering", "network.subnet", "network.subnet.interfaces", "security"];
const runtimeFile = /\.tf$|\.tf\.json$|^version\.json$/;
export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const textHash = (text) => hash(text.replaceAll("\r\n", "\n"));
const order = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
const wiringHash = "3179c6397426ab8426b546805491199825a63ecf720bd2e21fc0df1d41a43467";
const fixedRoot = Object.freeze({
  "backend.tf": "f14306e52fdea849b596d496a738e7ecbdaeb0ae3467a0da712749f9bf4f5fe9",
  "outputs.tf": "a7f7a387f8a487615930d0e56978531b99cfe63bd28481388208e6d8aac316e4",
  "providers.tf": "b7efcee65f5e7a0f28eddda89d4e7e8c292350417d77df18d75fbbdd8d5f1191",
  "terraform.tf": "069dc5269ba111bfbdd9d0c0e2dcebbc0ab67918e24384e717f50b49f5c298c9",
  "variables.tf": "9f1db7e66df1710e9168cc3cfabd3c556e37a47eac3efee61d8122ba3f2fd683",
  "module-lock.json": "607b52e30ebb0f0b19b5e36d0c5a326a83034723d994f319299d87502b2d4a8a",
  ".terraform.lock.hcl": "3ff29dabe34b98f4a4d3a015ef7e1f68adb782cc17b8a1dd6c741803a83de4d9",
});

export function assertApprovedWiring(source) {
  assert.equal(typeof source, "string", "Reviewed root wiring is required");
  const text = source.replaceAll("\r\n", "\n");
  const start = text.indexOf("  tags = {\n"), end = text.indexOf("\n  }\n", start);
  assert.ok(start >= 0 && end > start, "Keep the literal lesson tag block");
  const values = {};
  for (const line of text.slice(start + 11, end).split("\n")) {
    const tag = line.match(/^\s+([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"([a-zA-Z0-9 .:_-]{1,80})"\s*$/);
    assert.ok(tag && !Object.hasOwn(values, tag[1]), "Only unique literal non-secret lesson tags may change");
    values[tag[1]] = tag[2];
  }
  assert.equal(values.environment, "dev"); assert.equal(values.workshop, "ws2"); assert.equal(values.example, "terraform-avm");
  const protectedText = text.slice(0, start) + "  tags = <REVIEWED_LITERAL_TAGS>\n" + text.slice(end + 5);
  assert.equal(hash(protectedText), wiringHash, "AVM wiring changed; unknown IDs cannot be redirected or approved by a new input hash");
  return true;
}

export async function verifyRootContract(root = "avm") {
  for (const [file, expected] of Object.entries(fixedRoot)) assert.equal(textHash(await textFile(join(root, file))), expected, "Fixed root control/lock changed; request a separately reviewed profile update");
  const source = await textFile(join(root, "main.tf"));
  assertApprovedWiring(source);
  return source;
}

async function textFile(file) {
  const info = await lstat(file);
  assert.ok(info.isFile() && !info.isSymbolicLink(), "Source must be a regular file");
  return readFile(file, "utf8");
}

export async function fingerprintDirectory(directory) {
  const info = await lstat(directory);
  assert.ok(info.isDirectory() && !info.isSymbolicLink(), "Module directory cannot be a link");
  const files = [];
  for (const entry of await readdir(directory)) {
    if (runtimeFile.test(entry)) files.push({ path: entry, sha256: textHash(await textFile(join(directory, entry))) });
  }
  files.sort(order);
  return { fileCount: files.length, sha256: hash(JSON.stringify(files)) };
}

export function validateModuleLock(lock) {
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.terraform, "1.16.1");
  assert.deepEqual(lock.modules.map((entry) => entry.key), moduleKeys, "Unexpected AVM module inventory");
  for (const entry of lock.modules) {
    assert.ok(Number.isInteger(entry.fileCount) && entry.fileCount > 0);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    const source = entry.key === "network" ? ["registry.terraform.io/Azure/avm-res-network-virtualnetwork/azurerm", "0.22.2"]
      : entry.key === "security" ? ["registry.terraform.io/Azure/avm-res-network-networksecuritygroup/azurerm", "0.5.1"]
        : entry.key.endsWith("interfaces") ? ["registry.terraform.io/Azure/avm-utl-interfaces/azure", "0.6.0"]
          : [`./modules/${entry.key.split(".").at(-1)}`, null];
    assert.deepEqual([entry.source, entry.version], source, "Unexpected module source/version");
  }
  return lock;
}

export async function sourceBinding(root = "avm") {
  const names = await readdir(root);
  assert.deepEqual(names.filter((name) => /\.tf$|\.tf\.json$/.test(name)).sort(), ROOT_FILES, "Unexpected root configuration file");
  assert.ok(!names.some((name) => /\.tfvars(?:\.json)?$/.test(name)), "Only the private bound input file is allowed");
  const files = [];
  for (const name of ROOT_FILES) files.push({ path: name, sha256: textHash(await textFile(join(root, name))) });
  const lockText = await textFile(join(root, "module-lock.json"));
  validateModuleLock(JSON.parse(lockText));
  return { source: hash(JSON.stringify(files)), moduleLock: textHash(lockText), providerLock: textHash(await textFile(join(root, ".terraform.lock.hcl"))) };
}

export async function verifyInstalledModules(root = "avm") {
  const lock = validateModuleLock(JSON.parse(await textFile(join(root, "module-lock.json"))));
  const cache = await realpath(join(root, ".terraform/modules"));
  const installed = JSON.parse(await textFile(join(cache, "modules.json"))).Modules;
  assert.deepEqual(installed.map((entry) => entry.Key).sort(), ["", ...moduleKeys], "Unreviewed transitive module installed");
  const rootEntry = installed.find((entry) => entry.Key === "");
  assert.equal(rootEntry.Source, "");
  assert.equal(rootEntry.Dir, ".");
  for (const expected of lock.modules) {
    const entry = installed.find((item) => item.Key === expected.key);
    assert.deepEqual([entry.Source, entry.Version ?? null], [expected.source, expected.version]);
    const directory = resolve(root, entry.Dir);
    const real = await realpath(directory);
    const inside = relative(cache, real);
    assert.ok(inside && !inside.startsWith(`..${sep}`) && inside !== ".." && !isAbsolute(inside), "Module escaped the cache");
    assert.equal(real, directory, "Linked module paths are not allowed");
    assert.deepEqual(await fingerprintDirectory(directory), { fileCount: expected.fileCount, sha256: expected.sha256 }, "Downloaded module source changed; review provenance, never refresh automatically");
  }
  return lock.modules.length;
}
