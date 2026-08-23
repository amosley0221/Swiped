package com.swiped.pwa

import android.app.Application

/**
 * Placeholder Application so we have a stable entry point if we ever need
 * to hook into process start (e.g. crash reporting, custom WebView profile).
 * Referenced from AndroidManifest.xml's android:name attribute.
 */
class SwipedApplication : Application()
