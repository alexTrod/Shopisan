#!/usr/bin/env node
// Shopisan e2e runner: deterministic user-flow tests against the local
// Firebase emulators, on the Android emulator (Maestro) and the admin panel
// (Playwright). See e2e/README.md.
//
//   node e2e/run.mjs                 all flows
//   node e2e/run.mjs owner-signup    one or more flows by name
//
// Each flow: wipe emulators -> seed its world -> wipe the app, set language,
// GPS and permissions -> run its steps -> check Firestore + captured emails.
// Results land in e2e/report/ (index.html + results.json + screenshots).

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reset, seed, assertEmulatorsUp } from "./seed/emulator.mjs";
import { WORLDS, PASSWORD } from "./seed/fixtures.mjs";
import { FLOWS } from "./flows.mjs";
import { writeReport } from "./report.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(ROOT, "..");
const REPORT_DIR = path.join(ROOT, "report");
const ADB = process.env.ADB || path.join(process.env.HOME, "Library/Android/sdk/platform-tools/adb");
const MAESTRO = process.env.MAESTRO || path.join(process.env.HOME, ".maestro/bin/maestro");
const PKG = "com.ecomerce.shopisan";

const adb = (...args) => execFileSync(ADB, args, { encoding: "utf8" }).trim();

function ensureDevice() {
  const devices = adb("devices").split("\n").slice(1).filter((l) => l.endsWith("\tdevice"));
  if (devices.length !== 1) throw new Error(`Need exactly one Android device, found ${devices.length}`);
}

function installApk() {
  const apk = execFileSync(path.join(ROOT, "build-apk.sh"), { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim().split("\n").pop();
  const apkPath = path.join(APP_ROOT, apk);
  const stampFile = path.join(ROOT, ".installed-stamp");
  const fp = fs.readFileSync(path.join(ROOT, ".apk-stamp"), "utf8").trim();
  if (fs.existsSync(stampFile) && fs.readFileSync(stampFile, "utf8").trim() === fp && adb("shell", "pm", "path", PKG)) return;
  try { adb("uninstall", PKG); } catch { /* not installed */ }
  adb("install", apkPath);
  fs.writeFileSync(stampFile, fp);
}

// Fresh app state for a flow. Maestro's clearState would also reset the
// per-app language, so the wipe happens here.
function prepareDevice({ locale, location }) {
  adb("shell", "am", "force-stop", PKG);
  adb("shell", "am", "force-stop", "com.android.chrome");
  adb("shell", "pm", "clear", PKG);
  adb("shell", "cmd", "locale", "set-app-locales", PKG, "--locales", locale);
  adb("shell", "pm", "grant", PKG, "android.permission.ACCESS_FINE_LOCATION");
  adb("shell", "pm", "grant", PKG, "android.permission.ACCESS_COARSE_LOCATION");
  adb("emu", "geo", "fix", String(location.longitude), String(location.latitude));
}

function runMaestro(file, env, outDir) {
  const args = ["test", path.join(ROOT, "flows", file), "--no-ansi", "--debug-output", path.join(outDir, "maestro-debug")];
  for (const [k, v] of Object.entries({ PASSWORD, OUT: outDir, ...env })) args.push("-e", `${k}=${v}`);
  return new Promise((resolve) => {
    const p = spawn(MAESTRO, args, { cwd: path.join(ROOT, "flows") });
    let log = "";
    p.stdout.on("data", (d) => (log += d));
    p.stderr.on("data", (d) => (log += d));
    p.on("close", (code) => {
      fs.writeFileSync(path.join(outDir, `${path.basename(file, ".yaml")}.log`), log);
      const failed = log.split("\n").find((l) => /FAILED/.test(l)) || "";
      const reason = (log.match(/\n(Element not found:[^\n]*|Assertion is false:[^\n]*)/) || [])[1] || failed.trim();
      resolve({ ok: code === 0, reason });
    });
  });
}

function runPlaywright(spec, outDir) {
  const adminRoot = path.resolve(APP_ROOT, "../shopisan_admin");
  return new Promise((resolve) => {
    const p = spawn("npx", ["playwright", "test", spec, "--config", "e2e/playwright.config.ts"], {
      cwd: adminRoot,
      env: { ...process.env, E2E_OUT: outDir, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    let log = "";
    p.stdout.on("data", (d) => (log += d));
    p.stderr.on("data", (d) => (log += d));
    p.on("close", (code) => {
      fs.writeFileSync(path.join(outDir, "playwright.log"), log);
      const reason = (log.match(/Error: ([^\n]*)/) || [])[1] || "";
      resolve({ ok: code === 0, reason });
    });
  });
}

async function runFlow(flow) {
  const outDir = path.join(REPORT_DIR, flow.name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const started = Date.now();
  const world = WORLDS[flow.world]();
  const steps = [];
  const ctx = { world, outDir, adb };

  await reset();
  await seed(world);
  if (flow.device !== false) prepareDevice({ locale: flow.locale || "fr-FR", location: world.location });

  let aborted = false;
  for (const step of flow.steps) {
    let res;
    try {
      if (step.maestro) res = await runMaestro(step.maestro, step.env || {}, outDir);
      else if (step.playwright) res = await runPlaywright(step.playwright, outDir);
      else { await step.node(ctx); res = { ok: true }; }
    } catch (e) {
      res = { ok: false, reason: e.message };
    }
    steps.push({ label: step.label, ok: res.ok, reason: res.reason });
    if (!res.ok) { aborted = true; break; }
  }

  // Checks run even when a UI step failed: they report what the backend
  // state looks like at that point, marked as not reached when it depends on
  // the UI having finished.
  const checks = [];
  // Checks recorded by a Playwright spec itself (admin-checks.json).
  for (const f of fs.readdirSync(outDir).filter((x) => x.endsWith("-checks.json"))) {
    for (const c of JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"))) {
      checks.push({ label: c.label, status: c.ok ? "pass" : "fail", detail: c.detail, point: flow.points[0] });
    }
  }
  for (const check of flow.checks || []) {
    if (aborted && !check.always) {
      checks.push({ label: check.label, status: "skipped", detail: "UI flow did not reach this point", point: check.point });
      continue;
    }
    try {
      const r = await check.run(ctx);
      checks.push({ label: check.label, status: r.ok ? "pass" : "fail", detail: r.detail || "", point: check.point, evidence: r.evidence });
    } catch (e) {
      checks.push({ label: check.label, status: "fail", detail: e.message, point: check.point });
    }
  }

  const screenshots = fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
  return { name: flow.name, title: flow.title, points: flow.points, steps, checks, screenshots, ms: Date.now() - started };
}

async function main() {
  const only = process.argv.slice(2);
  const flows = only.length ? FLOWS.filter((f) => only.includes(f.name)) : FLOWS;
  if (!flows.length) throw new Error(`No flow named ${only.join(", ")}. Known: ${FLOWS.map((f) => f.name).join(", ")}`);

  await assertEmulatorsUp();
  ensureDevice();
  installApk();
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const results = [];
  for (const flow of flows) {
    process.stdout.write(`${flow.name.padEnd(28)} `);
    const r = await runFlow(flow);
    results.push(r);
    const uiOk = r.steps.every((s) => s.ok);
    const failed = r.checks.filter((c) => c.status === "fail").length;
    console.log(`${uiOk ? "UI ok " : "UI FAIL"}  checks ${r.checks.filter((c) => c.status === "pass").length}/${r.checks.length}${failed ? `  (${failed} failing)` : ""}  ${(r.ms / 1000).toFixed(0)}s`);
    if (!uiOk) console.log(`   ${r.steps.find((s) => !s.ok).label}: ${r.steps.find((s) => !s.ok).reason}`);
    for (const c of r.checks.filter((c) => c.status === "fail")) console.log(`   ✗ ${c.label}: ${c.detail}`);
  }

  // A full run replaces the report; a partial run merges into it.
  const resultsFile = path.join(REPORT_DIR, "results.json");
  let all = results;
  if (only.length && fs.existsSync(resultsFile)) {
    const prev = JSON.parse(fs.readFileSync(resultsFile, "utf8")).flows || [];
    all = FLOWS.map((f) => results.find((r) => r.name === f.name) || prev.find((r) => r.name === f.name)).filter(Boolean);
  }
  fs.writeFileSync(resultsFile, JSON.stringify({ generatedAt: new Date().toISOString(), flows: all }, null, 2));
  writeReport(REPORT_DIR, all);
  console.log(`\nReport: ${path.join(REPORT_DIR, "index.html")}`);

  const anyFail = results.some((r) => r.steps.some((s) => !s.ok) || r.checks.some((c) => c.status === "fail"));
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
