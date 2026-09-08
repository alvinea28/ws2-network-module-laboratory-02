import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectSetup } from "./doctor.mjs";

async function fixture(number = 4) {
  const cwd = await mkdtemp(join(tmpdir(), "ws2-doctor-"));
  await mkdir(join(cwd, ".github/agentalvine"), { recursive: true });
  const suffix = String(number).padStart(2, "0");
  await writeFile(join(cwd, ".github/agentalvine/course.json"), JSON.stringify({ number, title: "Test laboratory", sourceRepository: `alvinea28/ws2-test-laboratory-${suffix}` }));
  const calls = [];
  const values = { "--version": "git version 2.50.0", "rev-parse --show-toplevel": cwd, "remote get-url origin": `https://github.com/learner/my-test-laboratory-${suffix}.git`, "config --get user.name": "Participant", "config --get user.email": "participant@example.invalid", "branch --show-current": "dev", "version -json": '{"terraform_version":"1.16.1"}', "version": "terraform-docs version v0.24.0 test" };
  const command = (exe, args) => { calls.push([exe, ...args]); return { status: 0, stdout: values[args.join(" ")] || "" }; };
  return { cwd, calls, values, command, clean: () => rm(cwd, { recursive: true, force: true }) };
}

test("doctor validates an independently cloned, correctly pinned participant environment without writes", async () => {
  const f = await fixture(); try { const result = await inspectSetup({ ...f, nodeVersion: "24.16.0" }); assert.ok(result.results.every((item) => item.ok)); assert.ok(f.calls.every((call) => !call.some((arg) => /^(?:init|plan|apply|destroy|push|pull|fetch|login|install)$/.test(arg)))); } finally { await f.clean(); }
});
test("doctor rejects template origin instead of pretending public read access is participant write access", async () => {
  const f = await fixture(); try { f.values["remote get-url origin"] = "https://github.com/alvinea28/ws2-test-laboratory-04.git"; const report = await inspectSetup({ ...f, nodeVersion: "24.16.0" }); assert.equal(report.results.find((item) => item.name === "Participant copy").ok, false); } finally { await f.clean(); }
});
test("doctor does not expose a credential embedded in a remote", async () => {
  const f = await fixture(); try { f.values["remote get-url origin"] = "https://secret-example@github.com/owner/repo.git"; const report = await inspectSetup({ ...f, nodeVersion: "24.16.0" }); assert.equal(report.results.find((item) => item.name === "Credential-free GitHub remote").ok, false); assert.ok(!JSON.stringify(report).includes("secret-example")); } finally { await f.clean(); }
});
test("doctor reports missing commit identity without printing personal values", async () => {
  const f = await fixture(); try { f.values["config --get user.email"] = ""; const report = await inspectSetup({ ...f, nodeVersion: "24.16.0" }); assert.equal(report.results.find((item) => item.name === "Git user.email").ok, false); assert.ok(!JSON.stringify(report).includes("participant@example.invalid")); } finally { await f.clean(); }
});
test("doctor rejects mismatched tools and detached HEAD", async () => {
  const f = await fixture(); try { f.values["branch --show-current"] = ""; f.values["version -json"] = '{"terraform_version":"1.15.0"}'; const report = await inspectSetup({ ...f, nodeVersion: "22.0.0" }); assert.equal(report.results.filter((item) => !item.ok).length, 3); } finally { await f.clean(); }
});
test("Lab 01 setup does not require Terraform or another laboratory", async () => {
  const f = await fixture(1); try { const report = await inspectSetup({ ...f, nodeVersion: "24.16.0" }); assert.ok(report.results.every((item) => item.ok)); assert.ok(f.calls.every((call) => !/terraform/.test(call[0]))); } finally { await f.clean(); }
});
test("doctor gives an actionable folder error when no cloned lab is open", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "ws2-wrong-folder-")); try { const report = await inspectSetup({ cwd, command: () => { throw new Error("Should not execute in the wrong folder"); } }); assert.equal(report.results[0].ok, false); assert.match(report.results[0].detail, /Open Folder/); } finally { await rm(cwd, { recursive: true, force: true }); }
});

test("doctor rejects the same public template regardless of GitHub owner/name case", async () => {
  const f = await fixture();
  try {
    f.values["remote get-url origin"] = "https://github.com/ALVINEA28/ws2-test-laboratory-04.git";
    const report = await inspectSetup({ ...f, nodeVersion: "24.16.0" });
    assert.equal(report.results.find((item) => item.name === "Participant copy").ok, false);
  } finally { await f.clean(); }
});

test("doctor rejects unreplaced authorship placeholders and malformed emails without printing them", async () => {
  const f = await fixture();
  try {
    f.values["config --get user.name"] = "YOUR-DISPLAY-NAME";
    f.values["config --get user.email"] = "YOUR-VERIFIED-OR-NOREPLY-EMAIL";
    let report = await inspectSetup({ ...f, nodeVersion: "24.16.0" });
    assert.equal(report.results.find((item) => item.name === "Git user.name").ok, false);
    assert.equal(report.results.find((item) => item.name === "Git user.email").ok, false);
    assert.ok(!JSON.stringify(report).includes("YOUR-VERIFIED-OR-NOREPLY-EMAIL"));
    f.values["config --get user.name"] = "Participant";
    f.values["config --get user.email"] = "malformed-example";
    report = await inspectSetup({ ...f, nodeVersion: "24.16.0" });
    assert.equal(report.results.find((item) => item.name === "Git user.email").ok, false);
    assert.ok(!JSON.stringify(report).includes("malformed-example"));
  } finally { await f.clean(); }
});

test("doctor preserves case-sensitive roots on Linux while tolerating Windows path case", async () => {
  const f = await fixture();
  try {
    f.values["rev-parse --show-toplevel"] = f.cwd.toUpperCase();
    const linux = await inspectSetup({ ...f, nodeVersion: "24.16.0", platform: "linux" });
    const windows = await inspectSetup({ ...f, nodeVersion: "24.16.0", platform: "win32" });
    assert.equal(linux.results.find((item) => item.name === "Clone root").ok, false);
    assert.equal(windows.results.find((item) => item.name === "Clone root").ok, true);
  } finally { await f.clean(); }
});