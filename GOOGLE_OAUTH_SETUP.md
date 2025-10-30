# Google OAuth Setup Guide for FocusUp

This guide will help you complete the Google OAuth configuration for your FocusUp mobile app.

## ✅ What You've Already Done

Based on your setup:
- ✅ Supabase project created
- ✅ Google OAuth enabled in Supabase dashboard
- ✅ Client ID entered in Supabase
- ✅ App bundle ID configured: `com.aj.focusup`

## 🔧 Required Configuration Steps

### Step 1: Verify Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one if needed)

2. **Enable Required APIs**
   - Navigate to: **APIs & Services** → **Library**
   - Search for and enable: **"Google+ API"** (if not already enabled)

3. **Configure OAuth Consent Screen**
   - Go to: **APIs & Services** → **OAuth consent screen**
   - User Type: Choose **"External"**
   - Fill in required fields:
     - App name: **FocusUp**
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Leave default (or add `email` and `profile` if needed)
   - Click **Save and Continue**

### Step 2: Create Android OAuth Credentials

1. **Navigate to Credentials**
   - Go to: **APIs & Services** → **Credentials**
   - Click: **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**

2. **Configure Android Application**
   - Application type: **Android**
   - Name: **FocusUp Android**
   - Package name: `com.aj.focusup`
   - SHA-1 certificate fingerprint: *See below how to get this*

3. **Get SHA-1 Fingerprint**

   **For Development (Debug Build):**
   ```bash
   # On Windows
   cd C:\Users\YOUR_USERNAME\.android
   keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android

   # On Mac/Linux
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

   **For Production (Release Build):**
   ```bash
   keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
   ```

   Copy the **SHA-1** value and paste it into Google Cloud Console

4. **Save the Credentials**
   - After creating, you'll see your **Client ID**
   - Copy this - you'll need it for Supabase

### Step 3: Configure Supabase Google Provider

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your FocusUp project
   - Go to: **Authentication** → **Providers**

2. **Configure Google Provider**
   - Find **Google** in the list
   - Enable it if not already enabled
   - Enter your credentials:
     - **Client ID**: Paste the Android OAuth Client ID from Step 2
     - **Client Secret**: *(Android OAuth doesn't use secret, you can leave blank or use web client secret if you have one)*

3. **Configure Redirect URLs**

   Add these EXACT redirect URLs:
   ```
   focusup://callback
   focusup://
   ```

   Make sure:
   - No trailing slashes (except the second one)
   - Exact scheme name matches `app.config.ts` → `scheme: "focusup"`
   - Both variations are added

4. **Save Configuration**

### Step 4: Update Google Cloud Console Redirect URIs

1. **Go back to Google Cloud Console**
   - Navigate to: **APIs & Services** → **Credentials**
   - Click on your Android OAuth 2.0 Client ID

2. **Add Redirect URIs** (if there's an option)
   - Some Android OAuth configs don't need this
   - But if available, add:
     ```
     focusup://callback
     focusup://
     ```

### Step 5: Test Configuration

1. **Rebuild Your App**
   ```bash
   # Clear cache and rebuild
   npx expo start --clear
   ```

2. **Test on Physical Android Device**
   - **Important**: OAuth doesn't work well on emulators
   - Use: `npx expo run:android` or Expo Go on a real device
   - Try signing in with Google

3. **Check Console Logs**
   - Look for these messages in terminal:
     ```
     ✅ Supabase client initialized successfully
     ✅ Supabase connection test successful
     🔐 Attempting Google OAuth sign in...
     ```

4. **Common Test Results**
   - **Success**: Browser opens, you sign in, returns to app
   - **Error**: Check console for specific error messages
   - **Nothing happens**: Check redirect URI configuration

## 🐛 Troubleshooting

### Issue: "Google sign-in is not properly configured"

**Solution:**
1. Verify Client ID is correctly entered in Supabase
2. Check that Google provider is **Enabled** in Supabase
3. Ensure redirect URIs match exactly

### Issue: "OAuth redirect issue"

**Solution:**
1. Verify `app.config.ts` has `scheme: "focusup"`
2. Check redirect URLs in Supabase match: `focusup://callback` and `focusup://`
3. Rebuild app after changing scheme

### Issue: Browser opens but doesn't return to app

**Solution:**
1. Check Android deep linking is configured correctly
2. Verify bundle ID matches: `com.aj.focusup`
3. Make sure app is installed on the device (not just running in Expo Go)

### Issue: "Sign in was cancelled"

**Cause:** User closed the browser without completing sign-in

**Solution:** This is normal user behavior, no fix needed

### Issue: SHA-1 fingerprint mismatch

**Solution:**
1. Get correct SHA-1 from your keystore (see Step 2.3)
2. Update in Google Cloud Console
3. Wait 5-10 minutes for changes to propagate
4. Test again

## 📋 Configuration Checklist

Use this checklist to verify everything is set up:

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] Android OAuth credentials created with correct package name (`com.aj.focusup`)
- [ ] SHA-1 fingerprint added (debug or release)
- [ ] Client ID copied
- [ ] Supabase Google provider enabled
- [ ] Client ID pasted in Supabase
- [ ] Redirect URIs added in Supabase: `focusup://callback` and `focusup://`
- [ ] `app.config.ts` has `scheme: "focusup"`
- [ ] `app.config.ts` has `android.package: "com.aj.focusup"`
- [ ] App rebuilt after configuration changes
- [ ] Testing on physical Android device

## 🎯 Current Status

Based on your configuration:
- ✅ Supabase credentials in `.env` file
- ✅ Bundle ID set to `com.aj.focusup`
- ✅ App scheme set to `focusup`
- ✅ Google provider enabled in Supabase
- ⚠️ Verify SHA-1 fingerprint is added
- ⚠️ Verify redirect URIs are configured
- ⚠️ Test on physical device

## 🔗 Helpful Links

- Google Cloud Console: https://console.cloud.google.com/
- Supabase Dashboard: https://supabase.com/dashboard
- Supabase Auth Docs: https://supabase.com/docs/guides/auth/social-login/auth-google
- Expo Deep Linking: https://docs.expo.dev/guides/deep-linking/

## 💡 Pro Tips

1. **Use Debug Keystore for Testing**: Start with debug keystore SHA-1, it's easier
2. **Keep Credentials Secure**: Never commit Client IDs/Secrets to git
3. **Test Incrementally**: Test after each configuration step
4. **Check Logs**: Console logs will tell you exactly what's wrong
5. **Physical Device Only**: Emulators often have OAuth issues

## ❓ Need Help?

If you're still having issues:

1. **Check Console Logs**: Look for error messages with 🔐 or ❌ emojis
2. **Verify All Steps**: Go through the checklist above
3. **Common Mistake**: Redirect URI typos - they must match EXACTLY
4. **Timing**: Google Cloud changes can take 5-10 minutes to propagate

---

**Last Updated**: Based on your configuration with bundle ID `com.aj.focusup`
