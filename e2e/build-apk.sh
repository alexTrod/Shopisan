#!/usr/bin/env bash
# Builds the e2e APK (android buildType "e2e": JS bundled, emulator config
# baked in) only when the app sources changed since the last build.
# Prints the APK path on success.
set -euo pipefail
cd "$(dirname "$0")/.."

APK=android/app/build/outputs/apk/e2e/app-e2e.apk
STAMP=e2e/.apk-stamp

# Fingerprint of everything that ends up in the APK.
fingerprint() {
  {
    git ls-files -co --exclude-standard -- App.js index.js firebaseconfig.js app.json package.json src android/app/src android/app/build.gradle assets \
      | grep -v -e '__tests__' -e '^android/app/build/' \
      | sort | xargs shasum
  } | shasum | cut -d' ' -f1
}

FP=$(fingerprint)
if [[ -f "$APK" && -f "$STAMP" && "$(cat "$STAMP")" == "$FP" ]]; then
  echo "$APK"
  exit 0
fi

(
  cd android
  EXPO_PUBLIC_USE_EMULATOR=1 \
  EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT=8085 \
  EXPO_PUBLIC_E2E=1 \
  NODE_ENV=production \
    ./gradlew assembleE2e -PreactNativeArchitectures=arm64-v8a -q >&2
)
echo "$FP" > "$STAMP"
echo "$APK"
