# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keep class expo.** { *; }
-keep class expo.modules.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep React Native bridge
-keep class com.facebook.react.bridge.** { *; }

# Keep AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Keep Document Picker
-keep class expo.modules.documentpicker.** { *; }

# Keep File System
-keep class expo.modules.filesystem.** { *; }

# Keep Local Authentication
-keep class expo.modules.localauthentication.** { *; }

# Keep Sharing
-keep class expo.modules.sharing.** { *; }

# Keep Crypto
-keep class expo.modules.crypto.** { *; }

# Keep Font
-keep class expo.modules.font.** { *; }

# Keep Status Bar
-keep class expo.modules.statusbar.** { *; }

# Keep Linking
-keep class expo.modules.linking.** { *; }

# Keep Router
-keep class expo.router.** { *; }

# Keep Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# Keep Screens
-keep class com.swmansion.rnscreens.** { *; }

# Keep Keychain
-keep class com.oblador.keychain.** { *; }

# Keep Mammoth
-keep class net.sourceforge.plantuml.** { *; }

# General Android compatibility
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
-keep public class * extends android.preference.Preference
-keep public class * extends android.view.View
-keep public class * extends android.app.Fragment
-keep public class * extends android.support.v4.app.Fragment
-keep public class * extends androidx.fragment.app.Fragment
