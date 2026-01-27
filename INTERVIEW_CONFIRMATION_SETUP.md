# Interview Confirmation & Scheduling Implementation Guide

## Overview

This document explains how to set up and use the new Interview Confirmation and Scheduling features for the Hirewise Faculty Recruitment System.

## Features Implemented

### 1. **Profile Column** (New in Shortlisted Dashboard)
- Displays a blue "View Details" button in the Shortlisted candidates table
- Clicking this button opens the same detailed candidate profile modal as used in "All Candidates"
- Shows complete candidate information including:
  - Education & qualifications
  - Experience (teaching and research)
  - Research metrics and publications
  - Faculty evaluations
  - Score breakdown and performance overview

### 2. **Schedule Column with State Machine**  (New in Shortlisted Dashboard)
The Schedule column implements a state machine for interview confirmation and scheduling:

**State Flow:**
```
INITIAL → SEND_CONFIRMATION → PENDING → ACCEPTED → SCHEDULE_INTERVIEW
                                      ↓
                                   REJECTED
```

**UI States:**

1. **Initial State (Send Confirmation)**
   - Shows blue, underlined text: "Send Confirmation"
   - Clickable link-style button
   - Clicking sends interview confirmation email to candidate

2. **After Email Sent (Pending)**
   - Shows grey text with pulsing dot: "Pending"
   - Not clickable
   - Waits for candidate response from email

3. **Candidate Accepts**
   - Shows blue, underlined text: "Schedule Interview"
   - Clickable
   - Opens Google Calendar event creation page when clicked

4. **Candidate Rejects**
   - Shows red oval badge: "Rejected"
   - Not clickable
   - Final state

### 3. **Email System**
- **Package**: Nodemailer v6.9.7
- **Provider**: Gmail SMTP
- **Features**:
  - Dynamic email sending (not hardcoded)
  - Candidate email pulled from database
  - Personalized content (candidate name, position, department, university)
  - HTML and plain text fallback
  - Two action buttons in email:
    - "✓ I Can Attend" (Accept)
    - "✗ I Cannot Attend" (Reject)
  - Email links update database automatically

### 4. **Google Calendar Integration**
- Clicking "Schedule Interview" opens Google Calendar event creation
- Pre-filled fields:
  - **Event Title**: "Interview – [Position]" (e.g., "Interview – Assistant Professor")
  - **Guest Email**: Candidate's email address (auto-filled)
  - **Description**: Interview description with candidate and position details
  - **Location**: Google Meet link field (can be added by admin)
- Admin only needs to select date & time and click "Save"
- Google Calendar automatically:
  - Sends calendar invite to candidate
  - Generates Google Meet link
  - Sends notification emails

## Database Changes Required

Run the SQL migration before starting:

```sql
-- File: add_confirmation_response_column.sql
ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS confirmation_response TEXT DEFAULT NULL;

ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS interview_scheduled_date TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE faculty_applications 
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_applications_confirmation_response 
ON faculty_applications(confirmation_response);

CREATE INDEX IF NOT EXISTS idx_faculty_applications_confirmation_email_sent 
ON faculty_applications(confirmation_email_sent_at);
```

**New Columns:**
- `confirmation_response`: TEXT - Values: NULL | 'ACCEPTED' | 'REJECTED'
- `interview_scheduled_date`: TIMESTAMPTZ - Stores scheduled interview date
- `confirmation_email_sent_at`: TIMESTAMPTZ - When confirmation email was sent

## Environment Setup

### 1. Backend Environment Variables

Add these to `vite-admin/server/.env`:

```
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=5000

# Email Configuration (Gmail)
EMAIL_USER=hirewisebmu8@gmail.com
EMAIL_PASSWORD=wnnx opft dwsb wldc
EMAIL_FROM=hirewisebmu8@gmail.com

# Optional: Upstash Redis for production caching
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Optional: Backend URL for email links (defaults to localhost:5000 in dev)
API_BASE_URL=http://localhost:5000
```

**Important Notes:**
- Use **Gmail App Password**, not your regular Gmail password
  - Generate at: https://myaccount.google.com/apppasswords
  - Select "Mail" and "Windows Computer" (or Linux)
  - Copy the 16-character password into EMAIL_PASSWORD
- EMAIL_FROM should match EMAIL_USER
- For production, set API_BASE_URL to your deployed backend URL

### 2. Frontend Environment Variables

Add to `vite-admin/hirewise-admin-vite/.env` (for Vercel deployment):

```
VITE_API_BASE_URL=https://your-deployed-backend.onrender.com
```

For development (localhost), the frontend will default to `http://localhost:5000`

## Installation & Running

### Step 1: Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL from `add_confirmation_response_column.sql`
4. Click "Run"

### Step 2: Install Dependencies

```bash
cd vite-admin/server
npm install
```

The `nodemailer` package is already in `package.json`.

### Step 3: Start Development Servers

**Option 1: Automated (PowerShell on Windows)**
```powershell
cd /Users/anmolchaturvedi/hirewise
.\start.ps1
```

**Option 2: Manual (macOS/Linux/Windows)**

Terminal 1 - Start Backend:
```bash
cd vite-admin/server
npm start
# Or for development with auto-reload:
npm run dev
```

Terminal 2 - Start Frontend:
```bash
cd vite-admin/hirewise-admin-vite
npm run dev
```

**Expected URLs:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## How to Use

### Admin Workflow

1. **Navigate to Admin Dashboard**
   - Go to http://localhost:5173
   - Log in as admin
   - You should see "Dashboard" tab

2. **View Shortlisted Candidates**
   - In the "Top Selected Candidates" table, you'll see new columns:
     - "Profile" (new)
     - "Schedule" (new)
     - "Actions" (existing)

3. **View Candidate Details**
   - Click "View Details" button in Profile column
   - Opens detailed modal with all candidate information
   - Same as "All Candidates" tab

4. **Send Interview Confirmation**
   - In Schedule column, click "Send Confirmation"
   - Email is sent to candidate's email address
   - Status changes to "Pending" (grey with pulsing dot)
   - Candidate receives email with two action buttons

5. **Monitor Candidate Response**
   - Candidate clicks button in email ("I Can Attend" or "I Cannot Attend")
   - Database updates automatically
   - Admin dashboard reflects status:
     - **Accepted**: Shows blue "Schedule Interview" button
     - **Rejected**: Shows red "Rejected" badge

6. **Schedule Interview (if Accepted)**
   - Click "Schedule Interview" button
   - Google Calendar event creation page opens
   - Pre-filled with:
     - Event title (position name)
     - Candidate email as guest
     - Description
   - Admin selects date & time
   - Admin clicks "Save"
   - Google Meet link is generated automatically
   - Calendar invite sent to candidate email

### Candidate Workflow (Email-based)

1. **Receives Interview Confirmation Email**
   - Personalized greeting with candidate name
   - Position, department, and university details
   - Two action buttons:
     - Green "✓ I Can Attend"
     - Red "✗ I Cannot Attend"

2. **Responds from Email**
   - Clicks "I Can Attend" or "I Cannot Attend"
   - Page confirms response received
   - Database updates with response

3. **If Accepted, Receives Interview Scheduled Email**
   - Contains interview date/time
   - Google Meet link for joining
   - Preparation tips
   - Can join 5 minutes early

## Email Content Examples

### Interview Confirmation Email

```
Subject: Interview Confirmation Required – [Position] Position at BML Munjal University

Dear [Candidate Name],

We are pleased to invite you to an interview for the [Position] position at BML Munjal University.

Your qualifications have impressed our selection committee, and we would like to learn more about your experience and vision.

Position: [Position]
Department: [Department]
University: BML Munjal University

Next Steps:
Please confirm your availability by clicking one of the buttons below. If you confirm, a member of our team will schedule the interview date and time with you shortly.

[✓ I Can Attend Button]  [✗ I Cannot Attend Button]

---
BML Munjal University | Faculty Recruitment System
© 2026 BML Munjal University. All rights reserved.
```

### Interview Scheduled Email

```
Subject: Interview Scheduled – [Position] at BML Munjal University

Dear [Candidate Name],

Thank you for confirming your availability! We are excited to meet with you to discuss the [Position] position at BML Munjal University.

Interview Details:
Position: [Position]
Date: [Date]
Time: [Time]
Meeting Link: [Google Meet Link]

How to Join:
This interview will be conducted via Google Meet. Click the button below to join at the scheduled time.

[Join Google Meet Button]

Preparation Tips:
- Please join 5 minutes early to test your audio and video
- Ensure you have a stable internet connection
- Use a professional setting with good lighting
- Have a copy of your resume and relevant documents ready

---
BML Munjal University | Faculty Recruitment System
© 2026 BML Munjal University. All rights reserved.
```

## Architecture

### Backend Files Modified/Created

1. **services/emailService.js** (NEW)
   - Handles email sending via Nodemailer
   - `sendInterviewConfirmationEmail()` - Sends initial confirmation email
   - `sendInterviewScheduledEmail()` - Sends scheduled interview details
   - Includes HTML templates and plain text fallback

2. **routes/teaching/applications.js** (MODIFIED)
   - Added `POST /api/applications/send-confirmation/:id`
   - Added `POST /api/applications/confirm-response/:id`
   - Imports emailService
   - Handles database updates

3. **package.json** (MODIFIED)
   - Added nodemailer v6.9.7 dependency

### Frontend Files Modified

1. **src/components/Dashboard.jsx** (MODIFIED)
   - Added state variables:
     - `confirmationStates` - Tracks confirmation status per candidate
     - `sendingConfirmation` - Tracks which confirmations are being sent
     - `schedulingInterview` - Tracks which interviews are being scheduled
   - Added functions:
     - `sendInterviewConfirmation()` - Sends confirmation email via API
     - `scheduleInterview()` - Opens Google Calendar event creation
   - Modified table:
     - Added "Profile" column with "View Details" button
     - Added "Schedule" column with state-machine UI
   - Updated candidate fetch to load confirmation states from database

### Database Schema Changes

**New Columns in `faculty_applications` table:**
- `confirmation_response` (TEXT, DEFAULT NULL)
- `confirmation_email_sent_at` (TIMESTAMPTZ, DEFAULT NULL)
- `interview_scheduled_date` (TIMESTAMPTZ, DEFAULT NULL)

**New Indexes:**
- `idx_faculty_applications_confirmation_response`
- `idx_faculty_applications_confirmation_email_sent`

## API Endpoints

### 1. Send Confirmation Email

**Endpoint:** `POST /api/applications/send-confirmation/:id`

**Parameters:**
- `:id` - Application ID

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Interview confirmation email sent successfully",
  "messageId": "email-message-id"
}
```

**What Happens:**
1. Fetches application data from database
2. Sends personalized confirmation email to candidate
3. Updates `confirmation_email_sent_at` timestamp
4. Invalidates cache

### 2. Handle Confirmation Response

**Endpoint:** `POST /api/applications/confirm-response/:id?response=ACCEPTED|REJECTED`

**Parameters:**
- `:id` - Application ID
- `response` (query param) - "ACCEPTED" or "REJECTED"

**Request Body:**
```json
{}
```

**Response (JSON):**
```json
{
  "success": true,
  "message": "Response recorded: ACCEPTED",
  "applicationId": 123,
  "response": "ACCEPTED"
}
```

**Response (HTML - if called from email link):**
```html
<!DOCTYPE html>
<html>
...
Response Confirmed!
Thank you for confirming your availability. Our team will schedule your interview shortly.
...
</html>
```

**What Happens:**
1. Updates `confirmation_response` column to ACCEPTED or REJECTED
2. Invalidates cache
3. Returns HTML page if called from email link
4. Returns JSON if called via API

## Testing Checklist

- [ ] Database migration ran successfully
- [ ] Backend starts without errors: `npm start` in server directory
- [ ] Frontend starts without errors: `npm run dev` in frontend directory
- [ ] Environment variables configured correctly in `.env`
- [ ] Gmail app password configured correctly
- [ ] Dashboard loads and shows candidates
- [ ] "Profile" column visible with "View Details" button
- [ ] "Schedule" column visible with state machine UI
- [ ] Click "Send Confirmation" sends email
- [ ] Email arrives with personalized content
- [ ] Click "I Can Attend" in email updates database to ACCEPTED
- [ ] Click "I Cannot Attend" in email updates database to REJECTED
- [ ] Admin dashboard updates state:
  - [ ] After send: shows "Pending"
  - [ ] After accept: shows "Schedule Interview" button
  - [ ] After reject: shows "Rejected" badge
- [ ] Click "Schedule Interview" opens Google Calendar
- [ ] Google Calendar pre-fills event details
- [ ] Saving calendar event works

## Troubleshooting

### Email Not Sending

**Problem:** "Failed to send email" error

**Solutions:**
1. Verify Gmail credentials in `.env`
2. Check if Gmail App Password is correct (not regular password)
3. Ensure account has "Less secure app access" enabled (if not using App Password)
4. Check email bouncing in Gmail's "Sent Mail"
5. Check backend console for nodemailer errors: `SMTP Error: 535`

### Database Not Updating

**Problem:** Confirmation state not changing after clicking email link

**Solutions:**
1. Check if migration was applied: Run in Supabase SQL editor:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='faculty_applications' AND column_name='confirmation_response';
   ```
2. Verify backend is running and accessible
3. Check network tab in browser for failed requests
4. Check backend logs for errors

### Google Calendar Not Opening

**Problem:** "Schedule Interview" button doesn't open calendar

**Solutions:**
1. Verify candidate.email is populated in database
2. Check browser popup blocker settings
3. Ensure user is logged into Google account
4. Try in private/incognito window

### State Not Loading from Database

**Problem:** Candidates show "Send Confirmation" even after sending

**Solutions:**
1. Check if `confirmation_email_sent_at` is being set
2. Try refreshing page (F5)
3. Check browser console for errors
4. Clear browser cache and reload

## Production Deployment

### Backend (Render.com example)

1. Push code to GitHub
2. Connect Render to GitHub repository
3. Set environment variables in Render dashboard:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_KEY=...
   EMAIL_USER=...
   EMAIL_PASSWORD=...
   EMAIL_FROM=...
   API_BASE_URL=https://your-render-backend.onrender.com
   PORT=5000
   ```
4. Deploy

### Frontend (Vercel example)

1. Push code to GitHub
2. Connect Vercel to GitHub repository
3. Set environment variables:
   ```
   VITE_API_BASE_URL=https://your-render-backend.onrender.com
   ```
4. Deploy

### Email Configuration for Production

**Use Gmail App Password:**
1. Visit https://myaccount.google.com/apppasswords
2. Select "Mail" and device type
3. Copy 16-character password
4. Paste into EMAIL_PASSWORD in production environment

**Alternative: Use SendGrid (not configured yet)**
- Would require installing `@sendgrid/mail`
- Update emailService.js to use SendGrid SDK
- Set SENDGRID_API_KEY environment variable

## Support & Further Development

### To Add Interview Scheduling Confirmation Email

The system is designed to send a second email when admin creates calendar event. To implement:

1. Create function `sendInterviewScheduledEmail()` in emailService.js (already exists)
2. Call after Google Calendar integration:
   ```javascript
   await emailService.sendInterviewScheduledEmail(
     applicationId,
     candidateEmail,
     candidateName,
     position,
     interviewDate,
     interviewTime,
     meetLink
   );
   ```
3. Update database `interview_scheduled_date` column

### To Modify Email Templates

All email HTML is in `emailService.js`. Modify the `htmlContent` variables in each function.

### To Change State Colors/Styling

Edit Dashboard.jsx "Schedule" column rendering (around line 730-770).

## Key Design Decisions

1. **Confirmation via Email Links**
   - No login required from candidate
   - Application ID in URL is unique identifier
   - Database updates immediately

2. **State Machine in Frontend**
   - Reduces API calls
   - Instant UI feedback
   - States tracked per candidate ID

3. **Google Calendar Integration**
   - Native Google Calendar, no custom scheduling needed
   - Automatic Meet link generation
   - Avoids building complex scheduling UI

4. **Nodemailer over SendGrid**
   - Simpler setup (Gmail SMTP)
   - Free tier sufficient for small deployments
   - Easy to switch to SendGrid later if needed

5. **Database Columns**
   - Minimal schema changes
   - No new tables
   - NULL values indicate "not yet sent"
   - Easy to query and filter

## Next Steps

1. Apply database migration
2. Configure environment variables
3. Test email sending with a test account
4. Deploy to production
5. Monitor email delivery in Gmail Sent Mail folder

---

**Questions or Issues?** Check the troubleshooting section or review the backend console logs and browser network tab for detailed error messages.
