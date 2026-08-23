plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.swiped.pwa"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.swiped.pwa"
        // 26 = Android 8.0 (Aug 2017). Lets us use adaptive vector icons
        // exclusively, no PNG assets to commit. Covers ~99% of active
        // devices as of writing.
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        resourceConfigurations += listOf("en")
    }

    signingConfigs {
        // Release keystore comes from CI secrets — see .github/workflows/
        // build-apk.yml. If SWIPED_KEYSTORE_PATH isn't set the release
        // build falls back to the debug key so a `./gradlew assembleRelease`
        // still works locally.
        create("release") {
            val ksPath = System.getenv("SWIPED_KEYSTORE_PATH")
            if (ksPath != null && file(ksPath).exists()) {
                storeFile = file(ksPath)
                storePassword = System.getenv("SWIPED_KEYSTORE_PASSWORD") ?: ""
                keyAlias = System.getenv("SWIPED_KEY_ALIAS") ?: "swiped"
                keyPassword = System.getenv("SWIPED_KEY_PASSWORD") ?: ""
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            val ksPath = System.getenv("SWIPED_KEYSTORE_PATH")
            signingConfig = if (ksPath != null && file(ksPath).exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.webkit:webkit:1.11.0")
}
