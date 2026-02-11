// server/services/emailService.js
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Configure email transporter with Gmail
let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }
    return transporter;
};

/**
 * Send interview confirmation email to candidate
 * @param {number} applicationId - The application ID
 * @param {string} candidateEmail - Candidate's email address
 * @param {string} candidateName - Candidate's full name
 * @param {string} position - Position applied for (e.g., "Assistant Professor")
 * @param {string} department - Department (e.g., "Engineering")
 * @param {string} baseUrl - Base URL for the app (to construct confirmation links)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendInterviewConfirmationEmail = async (
    applicationId,
    candidateEmail,
    candidateName,
    position,
    department,
    baseUrl
) => {
    // Use environment variable if baseUrl not provided
    if (!baseUrl) {
        baseUrl = process.env.NODE_ENV === 'production'
            ? process.env.API_BASE_URL || 'https://your-production-domain.com'
            : `http://localhost:${process.env.PORT || 5000}`;
    }
    try {
        console.log('🔍 Email Debug - Environment Variables:');
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'MISSING');
        console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'MISSING');
        console.log('EMAIL_FROM:', process.env.EMAIL_FROM ? 'SET' : 'MISSING');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('API_BASE_URL:', process.env.API_BASE_URL);
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.error('❌ Email credentials not configured');
            console.error('Missing EMAIL_USER:', !process.env.EMAIL_USER);
            console.error('Missing EMAIL_PASSWORD:', !process.env.EMAIL_PASSWORD);
            return { success: false, error: 'Email service not configured' };
        }

        const acceptLink = `${baseUrl}/api/applications/confirm-response/${applicationId}?response=ACCEPTED`;
        const rejectLink = `${baseUrl}/api/applications/confirm-response/${applicationId}?response=REJECTED`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #0F4C75 0%, #1A5FA0 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
            color: #333333;
            line-height: 1.6;
        }
        .content p {
            margin: 15px 0;
        }
        .info-box {
            background-color: #f0f8ff;
            border-left: 4px solid #0F4C75;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .button-group {
            display: flex;
            gap: 15px;
            margin: 30px 0;
            justify-content: center;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            margin: 5px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            min-width: 150px;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .button-accept {
            background-color: #27AE60;
            color: #ffffff;
        }
        .button-accept:hover {
            background-color: #229954;
            text-decoration: none;
        }
        .button-reject {
            background-color: #E74C3C;
            color: #ffffff;
        }
        .button-reject:hover {
            background-color: #C0392B;
            text-decoration: none;
        }
        .footer {
            background-color: #f9f9f9;
            border-top: 1px solid #e0e0e0;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
        .university {
            font-weight: 600;
            color: #0F4C75;
        }
        a {
            color: #0F4C75;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Interview Confirmation</h1>
        </div>
        
        <div class="content">
            <p>Dear ${candidateName},</p>
            
            <p>We are pleased to invite you to an interview for the <strong>${position}</strong> position at <span class="university">BML Munjal University</span>.</p>
            
            <p>Your qualifications have impressed our selection committee, and we would like to learn more about your experience and vision.</p>
            
            <div class="info-box">
                <strong>Position:</strong> ${position}<br>
                <strong>Department:</strong> ${department}<br>
                <strong>University:</strong> BML Munjal University
            </div>
            
            <h3 style="margin-top: 30px; color: #0F4C75;">Next Steps:</h3>
            <p>Please confirm your availability by clicking one of the buttons below. If you confirm, a member of our team will schedule the interview date and time with you shortly.</p>
            
            <div class="button-group">
                <a href="${acceptLink}" class="button button-accept">✓ I Can Attend</a>
                <a href="${rejectLink}" class="button button-reject">✗ I Cannot Attend</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 25px;">
                <em>If the buttons above don't work, please copy and paste this link in your browser:</em><br>
                Accept: <code style="background: #f5f5f5; padding: 2px 5px;">${acceptLink}</code><br>
                Reject: <code style="background: #f5f5f5; padding: 2px 5px;">${rejectLink}</code>
            </p>
        </div>
        
        <div class="footer">
            <p>BML Munjal University | Faculty Recruitment System</p>
            <p>© 2026 BML Munjal University. All rights reserved.</p>
            <p>If you have any questions, please contact our HR team.</p>
        </div>
    </div>
</body>
</html>
    `;

        const textContent = `
Dear ${candidateName},

We are pleased to invite you to an interview for the ${position} position at BML Munjal University.

Your qualifications have impressed our selection committee, and we would like to learn more about your experience and vision.

Position: ${position}
Department: ${department}
University: BML Munjal University

Next Steps:
Please confirm your availability by clicking one of the links below. If you confirm, a member of our team will schedule the interview date and time with you shortly.

Accept: ${acceptLink}
Reject: ${rejectLink}

---
BML Munjal University | Faculty Recruitment System
© 2026 BML Munjal University. All rights reserved.
    `;

        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: candidateEmail,
            subject: `Interview Confirmation Required – ${position} Position at BML Munjal University`,
            html: htmlContent,
            text: textContent
        };

        const info = await transporter.sendMail(mailOptions);

        console.log('Interview confirmation email sent successfully:', info.response);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending interview confirmation email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send interview scheduled confirmation email to candidate
 * @param {number} applicationId - The application ID
 * @param {string} candidateEmail - Candidate's email address
 * @param {string} candidateName - Candidate's full name
 * @param {string} position - Position applied for
 * @param {string} interviewDate - Scheduled interview date (ISO string)
 * @param {string} interviewTime - Interview time (e.g., "2:00 PM IST")
 * @param {string} meetLink - Google Meet link for the interview
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendInterviewScheduledEmail = async (
    applicationId,
    candidateEmail,
    candidateName,
    position,
    interviewDate,
    interviewTime,
    meetLink
) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.error('Email credentials not configured');
            return { success: false, error: 'Email service not configured' };
        }

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #27AE60 0%, #229954 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
            color: #333333;
            line-height: 1.6;
        }
        .info-box {
            background-color: #f0f8ff;
            border-left: 4px solid #27AE60;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #27AE60;
        }
        .button-group {
            display: flex;
            gap: 15px;
            margin: 30px 0;
            justify-content: center;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            border-radius: 6px;
            background-color: #27AE60;
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .button:hover {
            background-color: #229954;
            text-decoration: none;
        }
        .footer {
            background-color: #f9f9f9;
            border-top: 1px solid #e0e0e0;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Interview Scheduled</h1>
        </div>
        
        <div class="content">
            <p>Dear ${candidateName},</p>
            
            <p>Thank you for confirming your availability! We are excited to meet with you to discuss the ${position} position at BML Munjal University.</p>
            
            <h3 style="color: #27AE60;">Interview Details:</h3>
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Position:</span>
                    <span>${position}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span>${new Date(interviewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Time:</span>
                    <span>${interviewTime}</span>
                </div>
            </div>
            
            <h3 style="color: #27AE60;">How to Join:</h3>
            <p>This interview will be conducted via Google Meet. Click the button below to join at the scheduled time:</p>
            
            <div class="button-group">
                <a href="${meetLink}" class="button">Join Google Meet</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Or copy and paste this link: <code style="background: #f5f5f5; padding: 2px 5px;">${meetLink}</code></p>
            
            <h3 style="color: #27AE60;">Preparation Tips:</h3>
            <ul>
                <li>Please join 5 minutes early to test your audio and video</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Use a professional setting with good lighting</li>
                <li>Have a copy of your resume and relevant documents ready</li>
            </ul>
            
            <p style="margin-top: 25px;">If you have any questions or need to reschedule, please let us know as soon as possible.</p>
            
            <p>We look forward to meeting you!</p>
            <p>Best regards,<br><strong>BML Munjal University Recruitment Team</strong></p>
        </div>
        
        <div class="footer">
            <p>BML Munjal University | Faculty Recruitment System</p>
            <p>© 2026 BML Munjal University. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: candidateEmail,
            subject: `Interview Scheduled – ${position} at BML Munjal University`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);

        console.log('Interview scheduled email sent successfully:', info.response);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending interview scheduled email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Assuming sendInterviewConfirmationEmail, sendStatusUpdateEmail, and sendEvaluationRequestEmail are defined elsewhere or will be.
// The instruction implies these should be part of the default export.
// For the purpose of this edit, we'll include them in the final default export.

// ========================================
// 🆕 ENHANCED SCHEDULING EMAIL METHODS
// ========================================

/**
 * Send enhanced interview confirmation email with date/time/timezone and 3 buttons
 * @param {number} applicationId - The application ID
 * @param {string} candidateEmail - Candidate's email address
 * @param {string} candidateName - Candidate's full name
 * @param {string} position - Position applied for
 * @param {string} department - Department
 * @param {string} date - Interview date (YYYY-MM-DD)
 * @param {string} time - Interview time (HH:MM)
 * @param {string} timezone - Timezone (e.g., 'Asia/Kolkata')
 * @param {string} baseUrl - Base URL for the app
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendEnhancedInterviewConfirmationEmail = async (
    applicationId,
    candidateEmail,
    candidateName,
    position,
    department,
    date,
    time,
    timezone,
    baseUrl
) => {
    if (!baseUrl) {
        baseUrl = process.env.NODE_ENV === 'production'
            ? process.env.API_BASE_URL || 'https://hirewise-maxx-2.onrender.com'
            : `http://localhost:${process.env.PORT || 5000}`;
    }

    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.error('Email credentials not configured');
            return { success: false, error: 'Email service not configured' };
        }

        // Format date for display
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create links for the 3 buttons
        const acceptLink = `${baseUrl}/api/applications/confirm-accept/${applicationId}`;
        const rejectLink = `${baseUrl}/api/applications/confirm-response/${applicationId}?response=REJECTED`;
        const preferAnotherLink = `${baseUrl}/api/applications/prefer-another-time-form/${applicationId}`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #0F4C75 0%, #1A5FA0 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
            color: #333333;
            line-height: 1.6;
        }
        .schedule-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .schedule-box h2 {
            margin: 0 0 15px 0;
            font-size: 20px;
        }
        .schedule-detail {
            font-size: 16px;
            margin: 8px 0;
        }
        .schedule-detail strong {
            font-size: 18px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            margin: 10px 5px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s ease;
        }
        .button-accept {
            background-color: #10b981;
            color: #ffffff;
        }
        .button-accept:hover {
            background-color: #059669;
        }
        .button-reject {
            background-color: #ef4444;
            color: #ffffff;
        }
        .button-reject:hover {
            background-color: #dc2626;
        }
        .button-prefer {
            background-color: #3b82f6;
            color: #ffffff;
        }
        .button-prefer:hover {
            background-color: #2563eb;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Interview Invitation</h1>
        </div>
        
        <div class="content">
            <p>Dear <strong>${candidateName}</strong>,</p>
            
            <p>Congratulations! We are pleased to invite you for an interview for the position of <strong>${position}</strong> in the <strong>${department}</strong> department at BML Munjal University.</p>
            
            <div class="schedule-box">
                <h2>📅 Scheduled Interview Details</h2>
                <div class="schedule-detail">
                    <strong>${formattedDate}</strong>
                </div>
                <div class="schedule-detail">
                    🕒 <strong>${time}</strong>
                </div>
                <div class="schedule-detail">
                    🌍 Timezone: <strong>${timezone}</strong>
                </div>
            </div>
            
            <p>Please confirm your availability by clicking one of the buttons below:</p>
            
            <div class="button-container">
                <a href="${acceptLink}" class="button button-accept">
                    ✅ I Can Attend
                </a>
                <a href="${rejectLink}" class="button button-reject">
                    ❌ I Cannot Attend
                </a>
                <a href="${preferAnotherLink}" class="button button-prefer">
                    🔄 Prefer Another Time Slot
                </a>
            </div>
            
            <p><strong>Note:</strong> If you click "I Can Attend", a Google Calendar invitation with a Google Meet link will be automatically sent to your email.</p>
            
            <p>If the scheduled time doesn't work for you, please click "Prefer Another Time Slot" to suggest an alternative time.</p>
            
            <p>We look forward to meeting you!</p>
            
            <p>Best regards,<br>
            <strong>HR Team</strong><br>
            BML Munjal University</p>
        </div>
        
        <div class="footer">
            <p>This is an automated email. Please do not reply directly to this message.</p>
            <p>© ${new Date().getFullYear()} BML Munjal University. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const mailOptions = {
            from: `"BML Munjal University - HR" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: candidateEmail,
            subject: `Interview Invitation - ${position} Position`,
            html: htmlContent
        };

        const info = await getTransporter().sendMail(mailOptions);
        console.log('✅ Enhanced confirmation email sent:', info.messageId);

        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {
        console.error('❌ Error sending enhanced confirmation email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send admin reply email to candidate
 * @param {string} candidateEmail - Candidate's email address
 * @param {string} candidateName - Candidate's full name
 * @param {string} replyMessage - Admin's reply message
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendAdminReplyEmail = async (candidateEmail, candidateName, replyMessage) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.error('Email credentials not configured');
            return { success: false, error: 'Email service not configured' };
        }

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
            color: #333333;
            line-height: 1.6;
        }
        .message-box {
            background-color: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Message from HR</h1>
        </div>
        
        <div class="content">
            <p>Dear <strong>${candidateName}</strong>,</p>
            
            <p>Thank you for your response regarding the interview schedule. Our HR team has replied to your message:</p>
            
            <div class="message-box">
                <p style="margin: 0; white-space: pre-wrap;">${replyMessage}</p>
            </div>
            
            <p>If you have any further questions or concerns, please feel free to reply to this email.</p>
            
            <p>Best regards,<br>
            <strong>HR Team</strong><br>
            BML Munjal University</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} BML Munjal University. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const mailOptions = {
            from: `"BML Munjal University - HR" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: candidateEmail,
            subject: 'Interview Schedule - Response from HR',
            html: htmlContent
        };

        const info = await getTransporter().sendMail(mailOptions);
        console.log('✅ Admin reply email sent:', info.messageId);

        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {
        console.error('❌ Error sending admin reply email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

export default {
    sendInterviewConfirmationEmail,
    sendInterviewScheduledEmail, // Keep existing export
    //sendStatusUpdateEmail, // Assuming these exist or will be added
    //sendEvaluationRequestEmail, // Assuming these exist or will be added
    sendEnhancedInterviewConfirmationEmail,
    sendAdminReplyEmail
};
