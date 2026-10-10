// Builds e2e/report/index.html: one self-contained page (screenshots inlined
// as JPEG thumbnails) grouping results by the client's feedback points.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { FINDINGS } from "./findings.mjs";

export const POINTS = [
  { id: "1", title: "Store validation", ask: "Only the store owner is pre-validated; approved owners add stores that the admin validates; pending counters must be right." },
  { id: "2", title: "“Créer un post”", ask: "French label for creating a post." },
  { id: "3", title: "Empty-city message", ask: "Shoppers can no longer add stores, so the empty-city message must not ask them to." },
  { id: "4", title: "Owner sign-up email", ask: "Must say the request is being reviewed, not that the store is already online." },
  { id: "5", title: "City spelling", ask: "Clean misspelled cities (e.g. “Toujouse”) in the database.", manual: "Production data, not a user flow: handled by a read-only audit, then a reviewed cleanup. Not part of this suite." },
  { id: "6", title: "“Open the app” link", ask: "The email button opens the app directly, on Android and iPhone." },
  { id: "core", title: "Core journeys", ask: "Sign-up, login, guest mode and logout keep working." },
];

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function thumb(file) {
  const out = file.replace(/\.png$/, ".thumb.jpg");
  if (!fs.existsSync(out)) {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "70", "-Z", "720", file, "--out", out], { stdio: "ignore" });
  }
  return `data:image/jpeg;base64,${fs.readFileSync(out).toString("base64")}`;
}

const prettyShot = (f) => f.replace(/\.png$/, "").replace(/^\d+-/, "").replace(/-/g, " ");

function flowStatus(f) {
  if (f.steps.some((s) => !s.ok)) return "fail";
  if (f.checks.some((c) => c.status === "fail")) return "fail";
  return "pass";
}

function pointStatus(point, flows) {
  if (point.manual) return "manual";
  const checks = flows.flatMap((f) => f.checks.filter((c) => (c.point || (f.points.length === 1 ? f.points[0] : null)) === point.id));
  const uiFail = flows.some((f) => f.points.includes(point.id) && f.steps.some((s) => !s.ok));
  if (uiFail || checks.some((c) => c.status === "fail")) return "fail";
  if (!flows.some((f) => f.points.includes(point.id))) return "manual";
  return "pass";
}

const LABEL = { pass: "Works", fail: "Needs work", manual: "Not in suite", skipped: "Not reached" };

export function writeReport(dir, flows) {
  const generated = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const totals = {
    checks: flows.flatMap((f) => f.checks).length,
    pass: flows.flatMap((f) => f.checks).filter((c) => c.status === "pass").length,
    flowsOk: flows.filter((f) => f.steps.every((s) => s.ok)).length,
  };

  const strip = POINTS.map((p) => {
    const st = pointStatus(p, flows);
    return `<a class="pt pt-${st}" href="#p${esc(p.id)}"><span class="pt-id">${p.id === "core" ? "Core" : "Point " + esc(p.id)}</span><span class="pt-title">${esc(p.title)}</span><span class="pill pill-${st}">${LABEL[st]}</span></a>`;
  }).join("");

  const sections = POINTS.map((p) => {
    const st = pointStatus(p, flows);
    const related = flows.filter((f) => f.points.includes(p.id));
    const body = p.manual
      ? `<p class="note">${esc(p.manual)}</p>`
      : related.map((f) => renderFlow(f, p.id, dir)).join("");
    return `<section class="point" id="p${esc(p.id)}">
      <header class="point-head"><div><p class="eyebrow">${p.id === "core" ? "Core" : "Feedback point " + esc(p.id)}</p><h2>${esc(p.title)}</h2><p class="ask">${esc(p.ask)}</p></div><span class="pill pill-${st}">${LABEL[st]}</span></header>
      ${body}
    </section>`;
  }).join("");

  const findings = FINDINGS.length
    ? `<section class="point" id="findings"><header class="point-head"><div><p class="eyebrow">Found while testing</p><h2>Other issues</h2><p class="ask">Not in the client's list, seen while driving the app.</p></div></header>
       <ul class="findings">${FINDINGS.map((x) => `<li><strong>${esc(x.title)}</strong><span>${esc(x.detail)}</span><code>${esc(x.where)}</code></li>`).join("")}</ul></section>`
    : "";

  const html = `<title>Shopisan User Tests</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Layout: a QA run sheet. Summary strip of feedback points, then one section per point with its flows, checks and phone screenshots. */
:root {
  --bg: #faf7fb; --surface: #ffffff; --ink: #231a28; --muted: #6d6175; --line: #e6dde9;
  --plum: #4b1f55; --plum-soft: #efe5f2;
  --ok: #1f7a4d; --ok-bg: #e3f3ea; --bad: #b4321f; --bad-bg: #fbe7e3; --idle: #7a6f80; --idle-bg: #efebf1;
  --display: "Bricolage Grotesque", "Avenir Next", system-ui, sans-serif;
  --body: "Atkinson Hyperlegible", system-ui, -apple-system, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #17121a; --surface: #211a25; --ink: #f1eaf3; --muted: #ab9fb2; --line: #3a2f40;
  --plum: #d7a8e6; --plum-soft: #34263b;
  --ok: #6fd3a0; --ok-bg: #173527; --bad: #ff9a86; --bad-bg: #3d1d18; --idle: #b3a8b9; --idle-bg: #2c2531; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #17121a; --surface: #211a25; --ink: #f1eaf3; --muted: #ab9fb2; --line: #3a2f40;
  --plum: #d7a8e6; --plum-soft: #34263b;
  --ok: #6fd3a0; --ok-bg: #173527; --bad: #ff9a86; --bad-bg: #3d1d18; --idle: #b3a8b9; --idle-bg: #2c2531; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font: 15px/1.55 var(--body); padding-inline: 16px; padding-block: 28px 64px; }
.wrap { max-width: 1080px; margin: 0 auto; display: grid; gap: 28px; }
h1, h2 { font-family: var(--display); text-wrap: balance; margin: 0; letter-spacing: -0.01em; }
h1 { font-size: clamp(28px, 5vw, 40px); color: var(--plum); }
h2 { font-size: 24px; }
h3 { font-size: 16px; margin: 0; }
.meta { color: var(--muted); display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; margin-top: 6px; }
.meta b { color: var(--ink); font-variant-numeric: tabular-nums; }
.eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; color: var(--muted); margin: 0 0 4px; font-weight: 700; }
.strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.pt { display: grid; gap: 4px; align-content: start; padding: 12px; border-radius: 10px; background: var(--surface); border: 1px solid var(--line); color: inherit; text-decoration: none; }
.pt:hover, .pt:focus-visible { border-color: var(--plum); outline: none; }
.pt-id { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 700; }
.pt-title { font-weight: 700; line-height: 1.25; }
.pt .pill { justify-self: start; margin-top: 4px; }
.pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.pill-pass { background: var(--ok-bg); color: var(--ok); }
.pill-fail { background: var(--bad-bg); color: var(--bad); }
.pill-manual, .pill-skipped { background: var(--idle-bg); color: var(--idle); }
.point { display: grid; gap: 16px; padding-top: 8px; border-top: 1px solid var(--line); }
.point-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
.point-head > div { min-width: 0; }
.ask { margin: 4px 0 0; color: var(--muted); max-width: 65ch; }
.note { margin: 0; padding: 12px 14px; background: var(--plum-soft); border-radius: 8px; max-width: 70ch; }
.flow { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; display: grid; gap: 14px; }
.flow-head { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: baseline; }
.flow-head code { font: 12px var(--mono); color: var(--muted); }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
@media (max-width: 720px) { .cols { grid-template-columns: minmax(0, 1fr); } }
ol.steps, ul.checks { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
ol.steps li, ul.checks li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; align-items: start; }
.mark { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700; }
.mark-pass { background: var(--ok-bg); color: var(--ok); }
.mark-fail { background: var(--bad-bg); color: var(--bad); }
.mark-skipped { background: var(--idle-bg); color: var(--idle); }
.detail { display: block; color: var(--muted); font: 12px/1.45 var(--mono); overflow-wrap: anywhere; margin-top: 2px; }
.label-sm { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 700; margin: 0 0 8px; }
.shots { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
.shots figure { margin: 0; flex: 0 0 150px; display: grid; gap: 6px; }
.shots img { width: 150px; aspect-ratio: 9 / 20; object-fit: cover; object-position: top; border-radius: 14px; border: 3px solid var(--ink); background: var(--bg); }
.shots figcaption { font-size: 12px; color: var(--muted); text-transform: capitalize; }
details.mail { border: 1px solid var(--line); border-radius: 8px; }
details.mail summary { cursor: pointer; padding: 8px 12px; font-size: 13px; }
details.mail summary span { color: var(--muted); }
details.mail iframe { width: 100%; height: 520px; border: 0; border-top: 1px solid var(--line); background: #fff; border-radius: 0 0 8px 8px; }
.findings { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.findings li { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; display: grid; gap: 4px; }
.findings span { color: var(--muted); max-width: 75ch; }
.findings code { font: 12px var(--mono); color: var(--plum); overflow-wrap: anywhere; }
@media (prefers-reduced-motion: no-preference) { .pt { transition: border-color .15s; } }
</style>
<div class="wrap">
  <header>
    <p class="eyebrow">End-to-end user tests · Android emulator + admin panel · local Firebase emulators</p>
    <h1>Shopisan user tests</h1>
    <div class="meta"><span>Run <b>${esc(generated)}</b></span><span>Journeys completed <b>${totals.flowsOk}/${flows.length}</b></span><span>Checks passing <b>${totals.pass}/${totals.checks}</b></span></div>
  </header>
  <nav class="strip" aria-label="Feedback points">${strip}</nav>
  ${sections}
  ${findings}
</div>`;

  fs.writeFileSync(path.join(dir, "index.html"), html);
}

function renderFlow(f, pointId, dir) {
  const checks = f.checks.filter((c) => !c.point || c.point === pointId);
  const steps = f.steps.map((s) => `<li><span class="mark mark-${s.ok ? "pass" : "fail"}">${s.ok ? "✓" : "✗"}</span><div>${esc(s.label)}${s.ok ? "" : `<span class="detail">${esc(s.reason || "failed")}</span>`}</div></li>`).join("");
  const checkItems = checks.map((c) => `<li><span class="mark mark-${c.status}">${c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "–"}</span><div>${esc(c.label)}${c.detail ? `<span class="detail">${esc(c.detail)}</span>` : ""}</div></li>`).join("");
  const mails = checks.filter((c) => c.evidence?.kind === "mail").map((c) => c.evidence)
    .filter((m, i, a) => a.findIndex((x) => x.subject === m.subject && x.to === m.to) === i)
    .map((m) => `<details class="mail"><summary>Email to ${esc(m.to)} · <span>${esc(m.subject)}</span></summary><iframe sandbox="" title="${esc(m.subject)}" srcdoc="${esc(m.html)}"></iframe></details>`).join("");
  const shots = f.screenshots.map((s) => `<figure><img loading="lazy" alt="${esc(prettyShot(s))}" src="${thumb(path.join(dir, f.name, s))}"><figcaption>${esc(prettyShot(s))}</figcaption></figure>`).join("");
  return `<article class="flow">
    <div class="flow-head"><h3>${esc(f.title)}</h3><span class="pill pill-${flowStatus(f)}">${flowStatus(f) === "pass" ? "Journey ok" : "Needs work"}</span></div>
    <div class="cols">
      <div><p class="label-sm">What the user does</p><ol class="steps">${steps}</ol></div>
      <div><p class="label-sm">What we check</p>${checkItems ? `<ul class="checks">${checkItems}</ul>` : `<p class="detail">The journey itself is the check.</p>`}</div>
    </div>
    ${shots ? `<div><p class="label-sm">Screens</p><div class="shots">${shots}</div></div>` : ""}
    ${mails ? `<div><p class="label-sm">Emails sent</p>${mails}</div>` : ""}
  </article>`;
}
