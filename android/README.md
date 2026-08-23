# Swiped Android wrapper

A thin Kotlin WebView shell that packages the deployed Swiped PWA
(`https://swiped-eqnj.onrender.com/app`) as an installable Android APK.
All app logic lives on the web side — this folder is just here so
users can install Swiped from Google Play / a sideload APK instead of
tapping "Add to Home Screen" in Chrome.

## What the wrapper does

- Loads the PWA in a full-screen WebView with JS + localStorage +
  IndexedDB enabled, so per-device data (`swiped.*` keys) persists
  between launches exactly like the browser.
- Draws behind the system bars so Swiped's own layout controls the
  full screen.
- Routes Android's back button through WebView history first, then
  exits when there's nowhere to go back to.
- Hands off external links (mailto:, tel:, external https) to the OS
  so social profile links open in the right native app.

Source: `app/src/main/java/com/swiped/pwa/MainActivity.kt`.

## Building the APK

CI does this automatically — you don't need Android Studio locally.

**Cut a release build & attach to GitHub Releases:**

```
git tag v1.0.0
git push origin v1.0.0
```

The `Build APK` workflow (`.github/workflows/build-apk.yml`) runs on
tag push, produces `swiped.apk`, and attaches it as a release asset.
Users install it from the Releases page.

**Build without releasing (for testing):**

Go to the repo's Actions tab → *Build APK* → *Run workflow*. The APK
is uploaded as a workflow artifact you can download from the run
summary.

## Signing

Default: debug key. Fine for sideloading; shows an "Unknown developer"
warning on install.

To sign with a real release key, add these repo secrets (Settings →
Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `SWIPED_KEYSTORE_BASE64` | `base64 -w0 swiped-release.jks` output |
| `SWIPED_KEYSTORE_PASSWORD` | keystore password |
| `SWIPED_KEY_ALIAS` | key alias (e.g. `swiped`) |
| `SWIPED_KEY_PASSWORD` | key password |

The workflow picks them up automatically — no code changes needed.
Generate a keystore locally once with:

```
keytool -genkey -v -keystore swiped-release.jks -alias swiped \
        -keyalg RSA -keysize 2048 -validity 10000
```

## Changing the wrapped URL

Edit `MainActivity.APP_URL` and `APP_HOST` in
`app/src/main/java/com/swiped/pwa/MainActivity.kt`. The host is used
to decide which links stay inside the WebView vs. get handed to the
OS — keep both in sync.

## Version bump

Change `versionCode` (integer, must increase) and `versionName`
(string, human-readable) in `app/build.gradle.kts` before tagging a
new release.
