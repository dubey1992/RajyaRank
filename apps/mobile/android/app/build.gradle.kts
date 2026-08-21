import java.util.Properties

plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Real release signing key — deliberately stored OUTSIDE this repo (see
// C:\Users\abhis\RajyaRank-release-keys\README.txt for why: a leaked signing
// key lets anyone publish a malicious "update" Play Store would accept as
// genuine, and losing it means the app can never be updated on Play Store
// again under the same listing). The path is overridable via
// RAJYARANK_KEYSTORE_PROPERTIES for CI, so a build machine without the file
// at the default path can still be pointed at one. Missing entirely (e.g. a
// fresh dev machine, or CI with no signing secret configured) falls back to
// debug signing below rather than failing the build.
val keystorePropsPath = System.getenv("RAJYARANK_KEYSTORE_PROPERTIES")
    ?: """C:\Users\abhis\RajyaRank-release-keys\key.properties"""
val keystoreProps = Properties()
val keystorePropsFile = file(keystorePropsPath)
val hasReleaseSigning = keystorePropsFile.exists()
if (hasReleaseSigning) {
    keystorePropsFile.inputStream().use { keystoreProps.load(it) }
}

android {
    namespace = "com.rajyarank.rajyarank_student"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.rajyarank.rajyarank_student"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // Real key when available (see the keystorePropsFile block above);
            // debug-signed fallback otherwise so a build never hard-fails just
            // because this machine doesn't have the release key — it just won't
            // be a Play-Store-installable artifact until it does.
            signingConfig = if (hasReleaseSigning) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
