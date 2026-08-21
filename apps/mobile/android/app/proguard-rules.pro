# Razorpay's SDK relies on reflection for its payment callbacks and doesn't
# ship complete consumer ProGuard rules in its AAR — without these, a
# minified release build silently breaks checkout (documented Razorpay
# Android integration requirement, not RajyaRank-specific).
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
  public void onPayment*(...);
}
