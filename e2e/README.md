# End-to-end user tests

Deterministic user-flow tests: the real Android app (Maestro) and the admin
panel (Playwright) driven against local Firebase emulators. Every flow starts
from the same seeded world, so a run gives the same result every time and
never touches production.

## Run

```bash
# 1. Emulators (auth 9099, firestore 8085, functions 5001, hosting 5005)
firebase emulators:start --config firebase.e2e.json --project shopisan-bad76 --only auth,firestore,functions,hosting

# 2. Android emulator "Medium_Phone" booted (exactly one adb device)

# 3. All flows, or some by name
npm run e2e
npm run e2e -- owner-signup empty-city
```

The report lands in `e2e/report/index.html`, grouped by the client's
feedback points, with screenshots and the emails each flow sent.

The first run builds the e2e APK (about a minute). Later runs rebuild only
when app sources change (`e2e/build-apk.sh`).

## What makes it deterministic

| Source of variation | How it is pinned |
|---|---|
| Production Firebase | Emulators only. The app's e2e build bakes in `EXPO_PUBLIC_USE_EMULATOR=1`; the admin panel runs with `VITE_USE_EMULATOR=1`. |
| Real emails | Under the Functions emulator, `functions/index.js` stores mails in the `e2e_outbox` collection instead of sending them. Cloudflare image deletes are skipped too. |
| Google / Mapbox / Cloudflare | `src/config/e2eFixtures.js` answers geocoding, autocomplete, image uploads and the device geocoder from fixtures (e2e build only). |
| GPS, permissions, language | The runner wipes the app (`pm clear`), sets its language (`cmd locale set-app-locales`), grants location and fixes the GPS before each flow. |
| Leftover data | Emulators are wiped and re-seeded before each flow (`e2e/seed/`). |
| Metro / dev menu | None. The `e2e` Android build type bundles the JS, allows HTTP to the emulators and declares a locale config. It is never shipped. |

## Layout

- `run.mjs`: runner. `flows.mjs`: each flow's steps and checks. `report.mjs`: the HTML report. `findings.mjs`: issues seen outside the client's list.
- `seed/fixtures.mjs`: the world each flow starts from. `seed/emulator.mjs`: reset, seed, read back (refuses non-emulator hosts).
- `flows/*.yaml`: Maestro flows. `subflows/` holds launch and login.
- Admin spec: `../shopisan_admin/e2e/admin-approval.spec.ts`.

## Writing flows

- Select by `testID`. Add one to the component when a flow needs it.
- `hideKeyboard` only right after `inputText`: on Android it presses Back when no keyboard is open.
- Don't use Maestro's `clearState`: it also resets the per-app language. The runner wipes the app instead.
- Checks assert the agreed behaviour, not today's code. A failing check is work to do.
