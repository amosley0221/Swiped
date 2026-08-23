// Project-level build file for the Swiped Android wrapper.
// The app is a thin WebView that loads the deployed Swiped PWA. Everything
// interesting lives on the web side; this repo just packages an APK that
// users can sideload on Android instead of "Add to Home Screen".

plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
