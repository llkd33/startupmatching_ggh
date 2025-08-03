# Gmail API Setup Guide

## Steps to Configure Gmail for Email Sending

### 1. Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth2 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen if needed:
   - Choose "External" for testing
   - Fill in required fields
4. Application type: "Web application"
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - Your production URL later

### 3. Get Credentials
Save these in your `.env.local`:
```
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GMAIL_USER_EMAIL=your-email@gmail.com
```

### 4. Get Refresh Token
1. Visit this URL (replace YOUR_CLIENT_ID):
```
https://accounts.google.com/o/oauth2/v2/auth?
client_id=YOUR_CLIENT_ID&
redirect_uri=http://localhost:3000/api/auth/google/callback&
response_type=code&
scope=https://www.googleapis.com/auth/gmail.send&
access_type=offline&
prompt=consent
```

2. Authorize and get the code from the redirect URL
3. Exchange code for refresh token using the setup script

### 5. Daily Limits
- Free tier: 100 emails per day
- Perfect for MVP testing
- Upgrade to SendGrid/AWS SES when scaling

### Alternative: App Password Method (Simpler)
If OAuth2 is complex, use App Password:
1. Enable 2-factor authentication on your Google account
2. Go to Google Account settings > Security > App passwords
3. Generate an app password for "Mail"
4. Use in `.env.local`:
```
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password
```