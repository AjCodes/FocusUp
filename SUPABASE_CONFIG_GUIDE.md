# Supabase Configuration Guide

## Required Supabase Settings for FocusUp

To ensure proper authentication flow (email confirmations, Google OAuth, etc.), you need to configure the following settings in your Supabase dashboard.

### 1. Email Configuration

**Location:** `Authentication` → `Settings` → `Email Auth`

#### Enable Email Confirmations
- **Setting:** "Enable email confirmations"
- **Status:** Must be **ENABLED**
- **Why:** This ensures users receive a confirmation email and cannot login until they verify their email address.

#### Email Templates
**Location:** `Authentication` → `Email Templates` → `Confirm signup`

Make sure the confirmation email template includes:
- A clear call-to-action button
- The confirmation link: `{{ .ConfirmationURL }}`

#### Redirect URLs
**Location:** `Authentication` → `URL Configuration` → `Redirect URLs`

Add the following redirect URL:
```
focusup://
```

### 2. Google OAuth Configuration

**Location:** `Authentication` → `Providers` → `Google`

#### Enable Google Provider
- **Status:** Must be **ENABLED**

#### OAuth Configuration
You need to set up Google OAuth credentials from the Google Cloud Console first:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application" as the application type
6. Add these to **Authorized redirect URIs**:
   ```
   https://uctqlgunnpxiqjfplimt.supabase.co/auth/v1/callback
   ```
   (Replace with your actual Supabase project URL)

7. Copy the **Client ID** and **Client Secret**

#### Configure in Supabase
Back in Supabase dashboard:
- **Google OAuth Client ID:** Paste your Client ID from Google Console
- **Google OAuth Client Secret:** Paste your Client Secret from Google Console

#### Additional OAuth Settings
- **Redirect URLs:** Add `focusup://` to the list

### 3. Site URL Configuration

**Location:** `Authentication` → `URL Configuration` → `Site URL`

Set the Site URL to:
```
focusup://
```

This is used as the default redirect after email confirmation and OAuth flows.

### 4. Enable Auto-refresh tokens (Optional but Recommended)

**Location:** `Authentication` → `Settings`

- **Setting:** "Auto-refresh tokens"
- **Status:** **ENABLED**
- **Why:** Keeps users logged in without requiring frequent re-authentication.

---

## Testing Your Configuration

### Test Email Signup Flow
1. Create a new account with a real email address
2. You should see: "Account Created! Please check your email to confirm your account before logging in."
3. Check your email for the confirmation link
4. Click the confirmation link
5. You should be redirected back to the app
6. Try to login with your credentials - should work after email is confirmed

### Test Google OAuth Flow
1. Click "Continue with Google"
2. You should see Google's consent screen showing:
   - Your app name
   - Permissions being requested (email, profile)
   - A "Continue" or "Allow" button
3. Select your Google account
4. After approval, you should see: "Welcome Back! You're now logged in as [email]"
5. App should redirect to the focus page after ~2 seconds

---

## Troubleshooting

### Email confirmation not working
- ✅ Check that "Enable email confirmations" is turned ON
- ✅ Verify your email template has `{{ .ConfirmationURL }}`
- ✅ Check spam folder for confirmation emails
- ✅ Verify `focusup://` is in the Redirect URLs list

### Google OAuth not showing consent screen
- ✅ Verify Google OAuth is enabled in Supabase
- ✅ Check that Client ID and Client Secret are correctly copied
- ✅ Ensure redirect URI in Google Console matches your Supabase URL
- ✅ Try adding `prompt=consent` to force consent screen (already added in code)

### Users auto-logging in after signup
- ✅ This is now fixed in code - users are signed out immediately after signup
- ✅ They must confirm email and login manually

### Google OAuth redirecting back to login with no feedback
- ✅ This is now fixed - the OAuth callback is processed immediately
- ✅ Success modal will show before redirecting to app

---

## Security Recommendations

1. **Never commit** your Client Secret to version control
2. Use environment variables for sensitive credentials
3. Enable RLS (Row Level Security) on all Supabase tables
4. Rotate OAuth credentials periodically
5. Monitor authentication logs in Supabase dashboard

---

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
