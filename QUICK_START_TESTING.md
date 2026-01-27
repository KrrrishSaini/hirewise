# Quick Start - Interview Confirmation Feature Testing

## 5-Minute Setup

### Prerequisites
- Node.js installed
- Supabase database accessible
- Gmail account with app password

### Step 1: Database Migration (2 min)

1. Go to Supabase Dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New query"
4. Copy-paste the SQL from `/Users/anmolchaturvedi/hirewise/add_confirmation_response_column.sql`
5. Click "Run"
6. Verify "Execution successful" message appears

### Step 2: Configure Environment (1 min)

**File:** `vite-admin/server/.env`

Add or update these lines:
```
EMAIL_USER=hirewisebmu8@gmail.com
EMAIL_PASSWORD=wnnx opft dwsb wldc
EMAIL_FROM=hirewisebmu8@gmail.com
API_BASE_URL=http://localhost:5000
```

**Note:** Make sure `.env` file exists. If not, create it in the server directory.

### Step 3: Install & Start (2 min)

**Terminal 1 - Backend:**
```bash
cd /Users/anmolchaturvedi/hirewise/vite-admin/server
npm install
npm start
```

Expected output:
```
Server running on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd /Users/anmolchaturvedi/hirewise/vite-admin/hirewise-admin-vite
npm run dev
```

Expected output:
```
  Local:        http://localhost:5173
```

## Testing the Feature

### 1. Access the Dashboard

1. Open http://localhost:5173 in browser
2. Click "Admin" or go to `/admin/login`
3. Log in (if required)
4. Click "Dashboard" in left menu

### 2. Find "Top Selected Candidates" Table

You should see a table with columns:
- Rank
- Name
- Position Applied
- Department
- Research Rank
- **Profile** ← NEW (blue "View Details" button)
- **Schedule** ← NEW (state machine UI)
- Actions

### 3. Test "Send Confirmation"

1. Find a candidate in the table
2. In the "Schedule" column, you should see blue underlined text: "Send Confirmation"
3. Click it
4. You should see: "Interview confirmation email sent successfully!"
5. The button should change to grey text: "Pending" with a pulsing dot

### 4. Check Email

1. Open Gmail (log in as hirewisebmu8@gmail.com)
2. Go to Sent Mail
3. Find the confirmation email with subject like "Interview Confirmation Required – [Position]"
4. Open it and verify:
   - Candidate name is personalized
   - Position and department are correct
   - University name is "BML Munjal University"
   - Two buttons: "✓ I Can Attend" and "✗ I Cannot Attend"

### 5. Test Candidate Response (Simulated)

Since you're testing locally, you can simulate the response by visiting the link directly:

**For ACCEPT:**
```
http://localhost:5000/api/applications/confirm-response/[APP_ID]?response=ACCEPTED
```

**For REJECT:**
```
http://localhost:5000/api/applications/confirm-response/[APP_ID]?response=REJECTED
```

Replace `[APP_ID]` with an actual application ID from the database or from the table.

To get an app ID:
1. Right-click on any candidate row in the table
2. Open Developer Tools (F12)
3. Go to Network tab
4. Look for API calls to `/api/applications/rankings/top`
5. Click and see the response with IDs, or check your database directly

### 6. Verify State Changes in Dashboard

After visiting the ACCEPT or REJECT link:

1. Refresh the Dashboard (F5)
2. The Schedule column for that candidate should update to:
   - **If ACCEPTED:** Blue underlined text "Schedule Interview"
   - **If REJECTED:** Red oval badge "Rejected"

### 7. Test "Schedule Interview"

1. For a candidate with ACCEPTED status
2. Click "Schedule Interview" button
3. Google Calendar event creation page should open
4. Verify pre-filled fields:
   - Title: "Interview – [Position Name]"
   - Guest: [Candidate Email]
   - Description: Interview details
5. You can add date/time but don't need to save for testing

### 8. Test "View Details"

1. Click "View Details" button in Profile column
2. Modal should open showing full candidate details
3. Verify it's the same as "All Candidates" → View button

## Troubleshooting

### Backend won't start: "Cannot find module 'nodemailer'"

Run in server directory:
```bash
npm install nodemailer
```

### Email not sending: "SMTP Error"

Check `.env` file:
1. EMAIL_USER must be Gmail address
2. EMAIL_PASSWORD must be 16-character app password (not regular password)
3. EMAIL_FROM must match EMAIL_USER
4. No typos

### "Failed to send confirmation email"

Check backend console for actual error. Common issues:
- Gmail credentials wrong
- App password not used (use app password, not regular password)
- Gmail account not setup for app passwords
  - Go to myaccount.google.com/apppasswords
  - Select "Mail" and "Windows Computer"
  - Generate and copy the 16-char password

### Dashboard not loading

1. Make sure backend is running on port 5000
2. Check browser console (F12) for error messages
3. Check that candidates exist in database
4. Try clearing browser cache: Ctrl+Shift+Del

### "Send Confirmation" button doesn't change to "Pending"

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Send Confirmation"
4. Look for POST to `/api/applications/send-confirmation/[ID]`
5. Check the response - should show `"success": true`
6. If error, read the response message

### Email arrives but links don't work

1. Check backend URL in `.env` - should be `http://localhost:5000` for local testing
2. Make sure backend is actually running
3. Try clicking the email link manually:
   `http://localhost:5000/api/applications/confirm-response/[ID]?response=ACCEPTED`

## What Was Added (Implementation Summary)

### Backend
✅ Created `emailService.js` - Handles all email sending
✅ Added two routes:
  - `POST /api/applications/send-confirmation/:id` - Sends confirmation email
  - `POST /api/applications/confirm-response/:id?response=ACCEPTED|REJECTED` - Handles responses
✅ Added nodemailer to package.json

### Frontend
✅ Added state machine logic in Dashboard.jsx
✅ Added two new table columns:
  - "Profile" with "View Details" button
  - "Schedule" with state machine UI
✅ Added functions:
  - `sendInterviewConfirmation()` - API call to send email
  - `scheduleInterview()` - Opens Google Calendar

### Database
✅ Created SQL migration file: `add_confirmation_response_column.sql`
✅ Three new columns:
  - `confirmation_response` (ACCEPTED/REJECTED/NULL)
  - `confirmation_email_sent_at` (timestamp)
  - `interview_scheduled_date` (timestamp)

## Next: Production Deployment

Once local testing works:

1. Update environment variables for production URLs
2. Deploy backend to Render.com
3. Deploy frontend to Vercel
4. Update VITE_API_BASE_URL in Vercel to production backend URL
5. Ensure email credentials are set in both environments

See `INTERVIEW_CONFIRMATION_SETUP.md` for detailed production setup.

## Files Modified/Created

| File | Change |
|------|--------|
| `add_confirmation_response_column.sql` | NEW - Database migration |
| `vite-admin/server/package.json` | Modified - Added nodemailer |
| `vite-admin/server/services/emailService.js` | NEW - Email sending logic |
| `vite-admin/server/routes/teaching/applications.js` | Modified - Added 2 routes |
| `vite-admin/hirewise-admin-vite/src/components/Dashboard.jsx` | Modified - UI + logic |
| `INTERVIEW_CONFIRMATION_SETUP.md` | NEW - Full documentation |
| `QUICK_START_TESTING.md` | NEW - This file |

## Success Indicators

✅ Backend starts without errors
✅ Frontend loads and shows Dashboard
✅ "Profile" and "Schedule" columns visible
✅ "Send Confirmation" button works
✅ Email arrives with correct content
✅ Email links update database
✅ Dashboard state updates after response
✅ Google Calendar opens with pre-filled data
✅ All existing functionality still works

---

**Time to complete:** ~5-10 minutes for setup + ~5 minutes for testing = **15-20 minutes total**

Start with Step 1!
