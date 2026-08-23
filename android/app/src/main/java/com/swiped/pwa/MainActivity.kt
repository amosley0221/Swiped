package com.swiped.pwa

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat

/**
 * Swiped Android — a thin WebView shell around the deployed PWA. All app
 * logic lives on the web side. The wrapper's only jobs are:
 *  - load https://swiped-eqnj.onrender.com/app in a full-screen WebView
 *  - keep localStorage/IndexedDB alive between launches
 *  - hand off external links (social profiles, mailto:, tel:) to the OS
 *  - route Android's back button through WebView history
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Draw behind the system bars so the PWA fills the whole screen —
        // Swiped's own layout accounts for safe-areas via CSS.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.parseColor("#FAFAF7")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        )

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#FAFAF7"))
            with(settings) {
                javaScriptEnabled = true
                domStorageEnabled = true
                // Modern WebView keeps IndexedDB / localStorage across
                // process restarts by default; explicit setters for the
                // older ones live here so the PWA's persistence works
                // on older Android versions too.
                cacheMode = WebSettings.LOAD_DEFAULT
                loadWithOverviewMode = true
                useWideViewPort = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = false
                allowContentAccess = false
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                userAgentString = "$userAgentString SwipedAndroid/1.0"
            }
            webViewClient = SwipedWebViewClient(this@MainActivity)
        }
        setContentView(webView)

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }

        // Android back button navigates WebView history first, then exits.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    companion object {
        const val APP_URL = "https://swiped-eqnj.onrender.com/app"
        const val APP_HOST = "swiped-eqnj.onrender.com"
    }
}

/**
 * Keeps in-app navigation inside the WebView but hands external links
 * (anything not on Swiped's host, plus mailto: / tel: / intent: schemes)
 * to the OS so they open in the right native app.
 */
private class SwipedWebViewClient(private val activity: MainActivity) : WebViewClient() {

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val url = request.url ?: return false
        val scheme = url.scheme ?: return false

        // Same-origin navigation stays inside the WebView.
        if ((scheme == "http" || scheme == "https") && url.host == MainActivity.APP_HOST) {
            return false
        }

        // Everything else hands off to the OS: mailto:, tel:, intent:,
        // plus regular external https links.
        return try {
            val intent = Intent(Intent.ACTION_VIEW, url)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            true
        } catch (_: Exception) {
            // No handler installed for the scheme — let the WebView try.
            false
        }
    }
}
