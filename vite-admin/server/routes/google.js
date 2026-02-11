// server/routes/google.js
import express from 'express';
import googleCalendarService from '../services/googleCalendarService.js';

const router = express.Router();

/**
 * GET /api/google/auth
 * Redirects to Google OAuth consent page to get authorization
 */
router.get('/auth', async (req, res) => {
    try {
        // Initialize the service first to ensure oauth2Client is ready
        await googleCalendarService.initialize();
        
        const authUrl = googleCalendarService.getAuthUrl();
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ 
            error: 'Failed to generate authorization URL',
            message: error.message 
        });
    }
});

/**
 * GET /oauth2callback
 * Handles the OAuth callback from Google and exchanges the code for tokens
 */
router.get('/callback', async (req, res) => {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
        return res.status(400).json({ 
            error: 'OAuth authorization denied',
            message: oauthError 
        });
    }

    if (!code) {
        return res.status(400).json({ 
            error: 'No authorization code received' 
        });
    }

    try {
        // Initialize the service first
        await googleCalendarService.initialize();
        
        // Exchange the code for tokens
        const tokens = await googleCalendarService.getTokenFromCode(code);

        // Return HTML page with the refresh token
        const htmlPage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Google Calendar Connected</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 600px;
            text-align: center;
        }
        .icon { font-size: 60px; margin-bottom: 20px; }
        h1 { color: #10b981; margin-bottom: 20px; }
        .token-box {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            text-align: left;
            max-height: 200px;
            overflow-y: auto;
        }
        .note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .note strong { color: #d97706; }
        code {
            background: #e5e7eb;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Google Calendar Connected!</h1>
        <p>Google Calendar has been successfully connected to HireWise.</p>
        
        <div class="note">
            <strong>⚠️ Important:</strong> Copy the refresh token below and add it to your <code>.env</code> file:
        </div>
        
        <div class="token-box">
            GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || 'No refresh token received'}
        </div>
        
        <p style="color: #666; font-size: 14px;">
            After adding the token to your .env file, restart your server for the changes to take effect.
        </p>
    </div>
</body>
</html>`;

        res.send(htmlPage);

    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).json({ 
            error: 'Failed to exchange authorization code',
            message: error.message 
        });
    }
});

/**
 * GET /api/google/status
 * Check if Google Calendar is properly configured
 */
router.get('/status', async (req, res) => {
    try {
        const initialized = await googleCalendarService.initialize();
        
        res.json({
            configured: initialized,
            hasClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
            calendarEmail: process.env.GOOGLE_CALENDAR_EMAIL || 'Not configured'
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to check status',
            message: error.message 
        });
    }
});

export default router;
