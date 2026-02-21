// Test email sending with current credentials
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const testEmailSending = async () => {
    try {
        console.log('📧 Testing Gmail SMTP connection...');
        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 60000
        });

        // Test connection
        console.log('🔍 Verifying Gmail connection...');
        await transporter.verify();
        console.log('✅ Gmail SMTP connection verified!');

        // Send test email
        console.log('📤 Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.EMAIL_USER, // Send to self for testing
            subject: 'Test Email - Interview System',
            html: `
                <h1>✅ Test Email Successful!</h1>
                <p>This is a test email from the interview scheduling system.</p>
                <p>Sent at: ${new Date().toISOString()}</p>
            `
        });

        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);

    } catch (error) {
        console.error('❌ Email test failed:', error);
        console.error('Error details:', {
            code: error.code,
            command: error.command,
            response: error.response
        });
    }
};

testEmailSending();