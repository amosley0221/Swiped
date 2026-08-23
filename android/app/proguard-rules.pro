# Keep WebView JS interfaces (we don't use any but future-proof) and the
# activity Android launches into. Minification is off by default anyway;
# this file is here so R8 has something to point at when it's enabled.
-keepattributes JavascriptInterface
-keep class com.swiped.pwa.** { *; }
