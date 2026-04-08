# Google Calendar API Setup Guide

This guide will help you set up Google Calendar API credentials for automated interview scheduling.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `HireWise Interview Scheduler`
4. Click "Create"

## Step 2: Enable Google Calendar API

1. In the project dashboard, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: HireWise
   - User support email: hirewisebmu8@gmail.com
   - Developer contact: hirewisebmu8@gmail.com
   - Click "Save and Continue"
   - Scopes: Skip for now
   - Test users: Add hirewisebmu8@gmail.com
   - Click "Save and Continue"

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: HireWise Backend
   - Authorized redirect URIs:
   - `http://localhost:5000/oauth2callback`
     - `https://hirewise-maxx-2.onrender.com/oauth2callback`
   - Click "Create"

5. **Download the JSON file** and save it securely

## Step 4: Get Refresh Token

### Option A: Using the setup script (Recommended)

1. Add to your `.env` file:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/oauth2callback
GOOGLE_CALENDAR_EMAIL=hirewisebmu8@gmail.com
```

2. Start your server:
```bash
cd server
PORT=5000 npm start
```

3. Visit in browser:
```
http://localhost:5000/api/google/auth
```

4. Sign in with `hirewisebmu8@gmail.com`
5. Grant calendar permissions
6. Copy the refresh token from the response
7. Add to `.env`:
```env
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### Option B: Manual setup

Use the Google OAuth2 Playground:
1. Go to https://developers.google.com/oauthplayground
2. Click settings (gear icon) → Use your own OAuth credentials
3. Enter your Client ID and Client Secret
4. In Step 1, select "Google Calendar API v3" → "https://www.googleapis.com/auth/calendar"
5. Click "Authorize APIs"
6. Sign in with hirewisebmu8@gmail.com
7. In Step 2, click "Exchange authorization code for tokens"
8. Copy the "Refresh token"
9. Add to `.env`

## Step 5: Update Environment Variables

Your final `.env` should have:

```env
# Google Calendar API
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz
GOOGLE_REDIRECT_URI=http://localhost:5000/oauth2callback
GOOGLE_REFRESH_TOKEN=1//abc123xyz...
GOOGLE_CALENDAR_EMAIL=hirewisebmu8@gmail.com
```

## Step 6: Test the Integration

1. Restart your server
2. Check logs for: `✅ Google Calendar API initialized successfully`
3. Try creating a test event through the admin portal

## Production Deployment (Render)

Add these environment variables in Render dashboard:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://hirewise-maxx-2.onrender.com/oauth2callback
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_CALENDAR_EMAIL=hirewisebmu8@gmail.com
```

## Troubleshooting

**Error: "Calendar API not initialized"**
- Check if all environment variables are set
- Verify refresh token is valid
- Check Google Cloud Console for API quota

**Error: "Invalid credentials"**
- Regenerate OAuth credentials
- Get new refresh token
- Update .env file

**Events not creating**
- Check if Calendar API is enabled
- Verify email has calendar access
- Check server logs for detailed errors

## Security Notes

- Never commit `.env` file to Git
- Keep refresh token secure
- Rotate credentials periodically
- Use service account for production (optional)
