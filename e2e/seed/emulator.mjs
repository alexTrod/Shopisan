// Emulator access for the e2e suite: reset, seed and read back.
// Refuses to start unless it is pointed at the local emulators, so it can
// never touch the production project.

import admin from "firebase-admin";

export const PROJECT_ID = "shopisan-bad76";
export const HOSTS = {
  firestore: "127.0.0.1:8085",
  auth: "127.0.0.1:9099",
  functions: "127.0.0.1:5001",
  hosting: "127.0.0.1:5005",
};

process.env.FIRESTORE_EMULATOR_HOST = HOSTS.firestore;
process.env.FIREBASE_AUTH_EMULATOR_HOST = HOSTS.auth;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });

export const db = admin.firestore();
export const auth = admin.auth();

const request = async (url, method = "GET") => {
  const res = await fetch(url, { method, headers: { Authorization: "Bearer owner" } });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
  return res;
};

export async function assertEmulatorsUp() {
  for (const [name, host] of Object.entries(HOSTS)) {
    try {
      await fetch(`http://${host}/`);
    } catch {
      throw new Error(`${name} emulator not reachable on ${host}`);
    }
  }
}

export async function reset() {
  await request(`http://${HOSTS.firestore}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, "DELETE");
  await request(`http://${HOSTS.auth}/emulator/v1/projects/${PROJECT_ID}/accounts`, "DELETE");
}

export async function seed(world) {
  for (const u of world.users) {
    await auth.createUser({ uid: u.uid, email: u.email, password: u.password, emailVerified: true });
    if (u.admin) await auth.setCustomUserClaims(u.uid, { admin: true });
    await db.doc(`users/${u.uid}`).set(u.doc);
  }
  const batch = db.batch();
  for (const c of world.cities) batch.set(db.doc(`cities/${c.id}`), c.data);
  for (const s of world.stores) batch.set(db.doc(`stores/${s.id}`), s.data);
  for (const p of world.posts) batch.set(db.doc(`posts/${p.id}`), p.data);
  for (const c of world.categories || []) batch.set(db.doc(`store_categories/${c.id}`), c.data);
  await batch.commit();
}

export async function outbox() {
  const snap = await db.collection("e2e_outbox").orderBy("capturedAt").get();
  return snap.docs.map((d) => d.data());
}

// Firestore triggers (onMerchantApproved...) run asynchronously after a write.
// Poll until `check` returns truthy or the deadline passes.
export async function waitFor(check, { timeoutMs = 15000, intervalMs = 250, label = "condition" } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await check();
    if (last) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
