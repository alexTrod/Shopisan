// The e2e flows: what each one drives in the UI and what it then checks in
// Firestore and in the emails captured by the Functions emulator.
//
// Checks assert the behaviour agreed with the client (feedback of
// 2026-10-10), not whatever the code does today: a failing check is work
// still to do. `point` ties a check to the client's numbered feedback.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, outbox, waitFor, HOSTS, PROJECT_ID } from "./seed/emulator.mjs";
import { CAST } from "./seed/fixtures.mjs";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Expected status of a store added by an already approved owner. The client
// confirmed (2026-10-18) that these publish automatically: the onStoreCreated
// Cloud Function approves them and emails the admin. Override with
// E2E_NEW_STORE_STATUS.
const NEW_STORE_STATUS = process.env.E2E_NEW_STORE_STATUS || "approved";

// Copy that claims a store is visible to shoppers.
const LIVE_CLAIMS = [/déjà en ligne/i, /already live/i, /is live/i, /est en ligne/i];
// The empty-city message must not invite shoppers to add stores.
const ADD_STORE_INVITES = [/ajoutez vos commerces/i, /add your favou?rite shops/i];

const userByEmail = async (email) => {
  const snap = await db.collection("users").where("email", "==", email).get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};
const storesByOwner = async (uid) =>
  (await db.collection("stores").where("owner_id", "==", uid).get()).docs.map((d) => ({ docId: d.id, ...d.data() }));
const mailsTo = async (to) => (await outbox()).filter((m) => m.to === to);
const strip = (html = "") => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const claimsLive = (m) => LIVE_CLAIMS.find((re) => re.test(m.subject || "") || re.test(strip(m.html)));
const mailEvidence = (m) => ({ kind: "mail", to: m.to, subject: m.subject, html: m.html });

// Translation value as rendered by the app (src/translations/index.js).
function translation(locale, key) {
  const src = fs.readFileSync(path.join(APP_ROOT, "src/translations/index.js"), "utf8");
  const frAt = src.indexOf("\n  fr: {");
  const block = locale === "fr" ? src.slice(frAt) : src.slice(0, frAt);
  const m = block.match(new RegExp(`\\n\\s+${key}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1] : null;
}

async function callable(name, data) {
  const res = await fetch(`http://${HOSTS.functions}/${PROJECT_ID}/us-central1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return res.json();
}

// What the admin panel's approveMerchant does (shopisan_admin
// src/utils/merchantApproval.ts): approve the owner and their pending stores.
async function approveOwner(uid) {
  const { FieldValue } = await import("firebase-admin/firestore");
  const batch = db.batch();
  batch.update(db.doc(`users/${uid}`), { merchantStatus: "approved" });
  for (const s of await storesByOwner(uid)) {
    if (s.status === "pending") batch.update(db.doc(`stores/${s.docId}`), { status: "approved", rejected_at: FieldValue.delete() });
  }
  await batch.commit();
}

export const FLOWS = [
  {
    name: "shopper-signup",
    title: "A shopper creates an account",
    points: ["core"],
    world: "shopper-signup",
    steps: [{ label: "Sign up as a shopper (FR)", maestro: "shopper-signup.yaml" }],
    checks: [
      {
        label: "Account saved as a shopper, in French",
        run: async () => {
          const u = await userByEmail("nouvelle@e2e.test");
          return { ok: u?.userType === "user" && u?.language === "fr", detail: u ? `userType=${u.userType}, language=${u.language}` : "no users doc" };
        },
      },
      {
        label: "Welcome email sent to the shopper, in French",
        run: async () => {
          const [m] = await waitFor(async () => { const ms = await mailsTo("nouvelle@e2e.test"); return ms.length && ms; }, { label: "welcome mail" });
          return { ok: /Bienvenue/.test(m.subject), detail: m.subject, evidence: mailEvidence(m) };
        },
      },
      {
        label: "Admin notified of the new account",
        run: async () => {
          const ms = await waitFor(async () => { const x = await mailsTo("info@shopisan.com"); return x.length && x; }, { label: "admin mail" });
          return { ok: true, detail: ms.map((m) => m.subject).join("; ") };
        },
      },
    ],
  },

  {
    name: "owner-signup",
    title: "A store owner signs up and waits for approval",
    points: ["1", "4"],
    world: "owner-signup",
    steps: [{ label: "Sign up as a store owner with a store (FR)", maestro: "owner-signup.yaml" }],
    checks: [
      {
        label: "Owner is waiting for approval",
        point: "1",
        run: async () => {
          const u = await userByEmail("fromager@e2e.test");
          return { ok: u?.userType === "owner" && u?.merchantStatus === "pending", detail: u ? `userType=${u.userType}, merchantStatus=${u.merchantStatus}` : "no users doc" };
        },
      },
      {
        label: "The store waits for approval and is hidden from shoppers",
        point: "1",
        run: async () => {
          const u = await userByEmail("fromager@e2e.test");
          const [s] = await storesByOwner(u.id);
          return { ok: s?.status === "pending" && s?.cityName === "Lyon", detail: s ? `status=${s.status}, city=${s.cityName}` : "no store" };
        },
      },
      {
        label: "Sign-up email says the request is being reviewed (not that the store is online)",
        point: "4",
        run: async () => {
          const ms = await waitFor(async () => { const x = await mailsTo("fromager@e2e.test"); return x.length && x; }, { label: "owner mail" });
          const bad = ms.find(claimsLive);
          return { ok: !bad, detail: bad ? `"${bad.subject}" says ${claimLabel(bad)}` : ms.map((m) => m.subject).join("; "), evidence: mailEvidence(bad || ms[0]) };
        },
      },
      {
        label: "Resent verification email doesn't say the store is online either",
        point: "4",
        run: async () => {
          // The app's "resend" button calls sendVerificationEmail with the
          // user's type (UserActions.resendVerificationEmail). No UI path
          // reaches it while the banner is hidden, so call it the same way.
          await callable("sendVerificationEmail", { email: "resend@e2e.test", username: "fromager", token: "e2e-token", userType: "owner", language: "fr" });
          const [m] = await waitFor(async () => { const x = await mailsTo("resend@e2e.test"); return x.length && x; }, { label: "resend mail" });
          return { ok: !claimsLive(m), detail: claimsLive(m) ? `"${m.subject}" says ${claimLabel(m)}` : m.subject, evidence: mailEvidence(m) };
        },
      },
      {
        label: "Admin notified of the owner request",
        point: "1",
        run: async () => {
          const ms = await waitFor(async () => { const x = (await mailsTo("info@shopisan.com")).filter((m) => /store owner request/i.test(m.subject)); return x.length && x; }, { label: "admin mail" });
          return { ok: true, detail: ms[0].subject };
        },
      },
    ],
  },

  {
    name: "admin-approval",
    title: "The admin reviews requests in the admin panel",
    points: ["1"],
    world: "admin-approval",
    device: false,
    steps: [{ label: "Admin panel: counters, tables, approve (Playwright)", playwright: "e2e/admin-approval.spec.ts" }],
    checks: [
      {
        label: "Approving the owner approves them and their store",
        point: "1",
        run: async () => {
          const u = (await db.doc(`users/${CAST.OWNER_PENDING.uid}`).get()).data();
          const s = (await db.doc("stores/store-pending-owner").get()).data();
          return { ok: u.merchantStatus === "approved" && s.status === "approved", detail: `merchantStatus=${u.merchantStatus}, store status=${s.status}` };
        },
      },
      {
        label: "Owner gets the approval email",
        point: "1",
        run: async () => {
          const [m] = await waitFor(async () => { const x = await mailsTo(CAST.OWNER_PENDING.email); return x.length && x; }, { label: "approval mail" });
          return { ok: true, detail: m.subject, evidence: mailEvidence(m) };
        },
      },
      {
        label: `The approved owner's new store is "${NEW_STORE_STATUS}" (auto-published, not touched by the owner approval batch)`,
        point: "1",
        run: async () => {
          const s = (await db.doc("stores/store-approved-owner-new").get()).data();
          return { ok: s.status === NEW_STORE_STATUS, detail: `status=${s.status}` };
        },
      },
    ],
  },

  {
    name: "owner-approved-adds-store",
    title: "An approved owner gets in and adds a second store",
    points: ["1"],
    world: "owner-approved-adds-store",
    steps: [
      { label: "Pending owner logs in and is held on the waiting screen", maestro: "owner-pending-login.yaml", env: { EMAIL: "owner.new@e2e.test" } },
      { label: "Admin approves the owner", node: () => approveOwner("owner-new") },
      { label: "Owner taps \"Check again\" and adds a store", maestro: "owner-adds-store.yaml" },
    ],
    checks: [
      {
        label: "Owner gets the approval email",
        point: "1",
        always: true,
        run: async () => {
          const [m] = await waitFor(async () => { const x = await mailsTo("owner.new@e2e.test"); return x.length && x; }, { label: "approval mail" });
          return { ok: true, detail: m.subject, evidence: mailEvidence(m) };
        },
      },
      {
        label: `The new store is saved as "${NEW_STORE_STATUS}"`,
        point: "1",
        run: async () => {
          const s = (await storesByOwner("owner-new")).find((x) => x.name === "Cave Nouvelle");
          return { ok: s?.status === NEW_STORE_STATUS, detail: s ? `status=${s.status}` : "store not found" };
        },
      },
      {
        label: "Admin email about the new store doesn't call it live while it waits for review",
        point: "1",
        run: async () => {
          const m = await waitFor(async () => (await mailsTo("info@shopisan.com")).find((x) => /Cave Nouvelle/.test(x.subject || "")), { label: "store creation mail" });
          const live = NEW_STORE_STATUS === "pending" && claimsLive(m);
          return { ok: !live, detail: m.subject, evidence: mailEvidence(m) };
        },
      },
    ],
  },

  {
    name: "empty-city",
    title: "A shopper in a city with no shops",
    points: ["3"],
    world: "empty-city",
    steps: [{ label: "Log in at Toulouse, see the empty city, tap search another city, land on Lyon", maestro: "empty-city.yaml", env: { EMAIL: CAST.SHOPPER.email } }],
    checks: [
      ...["fr", "en"].map((loc) => ({
        label: `Empty-city message (${loc.toUpperCase()}) doesn't ask shoppers to add shops`,
        point: "3",
        always: true,
        run: async () => {
          const text = translation(loc, "help_us_grow");
          const bad = ADD_STORE_INVITES.find((re) => re.test(text || ""));
          return { ok: !!text && !bad, detail: `"${text}"` };
        },
      })),
    ],
  },

  {
    name: "posts-fr",
    title: "An owner switches to French and manages posts",
    points: ["2"],
    world: "posts-fr",
    locale: "en-US",
    steps: [{ label: "Log in (EN), switch to Français, open Manage Posts", maestro: "posts-fr.yaml", env: { EMAIL: CAST.OWNER_APPROVED.email } }],
    checks: [
      {
        label: "Language choice saved on the account",
        point: "2",
        run: async () => {
          const u = (await db.doc(`users/${CAST.OWNER_APPROVED.uid}`).get()).data();
          return { ok: u.language === "fr", detail: `language=${u.language}` };
        },
      },
      {
        label: 'French button text is "Créer un post"',
        point: "2",
        always: true,
        run: async () => {
          const t = translation("fr", "create_post");
          return { ok: t === "Créer un post", detail: `"${t}"` };
        },
      },
    ],
  },

  {
    name: "open-link",
    title: '"Open the app" link from the emails',
    points: ["6"],
    world: "open-link",
    steps: [{ label: "Tap the email link with the app closed (Android, Chrome)", maestro: "open-link.yaml" }],
    checks: [
      {
        label: "Emails link to the /open page",
        point: "6",
        always: true,
        run: async () => {
          const src = fs.readFileSync(path.join(APP_ROOT, "functions/index.js"), "utf8");
          const m = src.match(/openApp:\s*"([^"]+)"/);
          return { ok: !!m && /\/open$/.test(m[1]), detail: m ? m[1] : "no openApp link" };
        },
      },
      {
        label: "iPhone: link opens the app directly (Universal Links)",
        point: "6",
        always: true,
        run: async () => {
          const appJson = JSON.parse(fs.readFileSync(path.join(APP_ROOT, "app.json"), "utf8"));
          const domains = appJson.expo?.ios?.associatedDomains || [];
          const aasa = fs.existsSync(path.join(APP_ROOT, "public/.well-known/apple-app-site-association"));
          return {
            ok: domains.some((d) => d.includes("shopisan-bad76.web.app")) && aasa,
            detail: `associatedDomains=${JSON.stringify(domains)}, apple-app-site-association ${aasa ? "present" : "missing"} (static check, not run on a device)`,
          };
        },
      },
    ],
  },

  {
    name: "login-guest",
    title: "Guest browsing, login and logout",
    points: ["core"],
    world: "login-guest",
    steps: [{ label: "Guest, wrong password, login, logout", maestro: "login-guest.yaml", env: { EMAIL: CAST.SHOPPER.email } }],
    checks: [],
  },
];

function claimLabel(m) {
  const re = claimsLive(m);
  const hit = (strip(m.html).match(re) || (m.subject || "").match(re) || [""])[0];
  return `"${hit}"`;
}
