import { google } from 'googleapis';
import path from 'path';
import 'dotenv/config';

/**
 * Google Calendar Service for automated interview scheduling
 * Handles OAuth2 authentication and calendar event creation
 */
class GoogleCalendarService {
    constructor() {
        this.oauth2Client = null;
        this.calendar = null;
        this.initialized = false;
    }

    /**
     * Initialize Google Calendar API with OAuth2 credentials
     */
    async initialize() {
        try {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 5000}/oauth2callback`;

            console.log('🔧 Google Calendar Init - Client ID:', clientId ? clientId.substring(0, 20) + '...' : 'MISSING');
            console.log('🔧 Google Calendar Init - Client Secret:', clientSecret ? 'SET (' + clientSecret.length + ' chars)' : 'MISSING');
            console.log('🔧 Google Calendar Init - Redirect URI:', redirectUri);

            if (!clientId || !clientSecret) {
                throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables');
            }

            // Create OAuth2 client
            this.oauth2Client = new google.auth.OAuth2(
                clientId,
                clientSecret,
                redirectUri
            );

            // Set credentials if refresh token exists
            if (process.env.GOOGLE_REFRESH_TOKEN) {
                this.oauth2Client.setCredentials({
                    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
                });
            }

            // Initialize Calendar API
            this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            this.initialized = true;

            console.log('✅ Google Calendar API initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Google Calendar API:', error.message);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Create an interview calendar event with Google Meet
     * @param {Object} params - Event parameters
     * @param {string} params.candidateEmail - Candidate's email address
     * @param {string} params.candidateName - Candidate's full name
     * @param {string} params.date - Interview date (YYYY-MM-DD)
     * @param {string} params.time - Interview time (HH:MM)
     * @param {string} params.timezone - Timezone (e.g., 'Asia/Kolkata')
     * @param {string} params.position - Position applied for
     * @returns {Promise<Object>} Event details with Meet link
     */
    async createInterviewEvent({ candidateEmail, candidateName, date, time, timezone, position }) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.initialized) {
            throw new Error('Google Calendar API not initialized. Please check credentials.');
        }

        try {
            // Format date properly (handles 2026-2-4 -> 2026-02-04)
            const formattedDate = this.formatDate(date);
            
            // Ensure time is in HH:MM format
            const formattedTime = time.length === 5 ? time : time.substring(0, 5);
            
            // Combine date and time into ISO format
            const dateTimeString = `${formattedDate}T${formattedTime}:00`;
            
            console.log('📅 Calendar event datetime:', dateTimeString);

            // Create event object
            const event = {
                summary: `Interview - ${candidateName} (${position})`,
                description: `Interview with ${candidateName} for ${position} position at BML Munjal University`,
                start: {
                    dateTime: dateTimeString,
                    timeZone: timezone,
                },
                end: {
                    dateTime: this.addOneHour(dateTimeString),
                    timeZone: timezone,
                },
                attendees: [
                    { email: candidateEmail, responseStatus: 'needsAction' },
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `interview-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 1 day before
                        { method: 'popup', minutes: 30 }, // 30 minutes before
                    ],
                },
                guestsCanModify: false,
                guestsCanInviteOthers: false,
                sendUpdates: 'all', // Send email to attendees
            };

            // Create the event
            const response = await this.calendar.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_EMAIL || 'primary',
                resource: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all',
            });

            const createdEvent = response.data;

            console.log('✅ Calendar event created:', createdEvent.id);
            console.log('📧 Meet link:', createdEvent.hangoutLink);

            return {
                eventId: createdEvent.id,
                meetLink: createdEvent.hangoutLink,
                htmlLink: createdEvent.htmlLink,
                status: createdEvent.status,
            };
        } catch (error) {
            console.error('❌ Failed to create calendar event:', error.message);
            throw new Error(`Calendar event creation failed: ${error.message}`);
        }
    }

    /**
     * Delete a calendar event
     * @param {string} eventId - Google Calendar event ID
     */
    async deleteEvent(eventId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            await this.calendar.events.delete({
                calendarId: process.env.GOOGLE_CALENDAR_EMAIL || 'primary',
                eventId: eventId,
                sendUpdates: 'all',
            });

            console.log('✅ Calendar event deleted:', eventId);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete calendar event:', error.message);
            return false;
        }
    }

    /**
     * Get list of available timezones from Google Calendar API
     * Returns common timezones without requiring full OAuth setup
     */
    async getTimezones() {
        // Return common timezones - works even without full Google Calendar setup
        const commonTimezones = [
            { id: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
            { id: 'America/New_York', label: 'Eastern Time (ET)' },
            { id: 'America/Chicago', label: 'Central Time (CT)' },
            { id: 'America/Denver', label: 'Mountain Time (MT)' },
            { id: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            { id: 'Europe/London', label: 'British Time (GMT/BST)' },
            { id: 'Europe/Paris', label: 'Central European Time (CET)' },
            { id: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
            { id: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
            { id: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
            { id: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
        ];

        return commonTimezones;
    }

    /**
     * Helper: Add one hour to a datetime string
     */
    addOneHour(dateTimeString) {
        // Parse the date parts manually to avoid timezone issues
        const [datePart, timePart] = dateTimeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = 0] = timePart.split(':').map(Number);
        
        // Create date and add one hour
        const date = new Date(year, month - 1, day, hour + 1, minute, second);
        
        // Format back to YYYY-MM-DDTHH:MM:SS
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    /**
     * Helper: Format date to YYYY-MM-DD
     */
    formatDate(dateStr) {
        if (!dateStr) return null;
        
        // If already in correct format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        
        // Parse and reformat (handles 2026-2-4 -> 2026-02-04)
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return dateStr;
    }

    /**
     * Generate OAuth2 authorization URL for first-time setup
     */
    getAuthUrl() {
        const scopes = ['https://www.googleapis.com/auth/calendar'];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokenFromCode(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            console.log('✅ Tokens obtained successfully');
            console.log('📝 Add this to your .env file:');
            console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);

            return tokens;
        } catch (error) {
            console.error('❌ Failed to get tokens:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
