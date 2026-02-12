## 🚨 EMAIL CREDENTIALS INVALID - FIXING REQUIRED

### Issue Found:
Gmail SMTP authentication is **failing** with error:
```
535-5.7.8 Username and Password not accepted
```

### Root Cause:
The Gmail app password `wnwxopftdwsbwldc` is **invalid** or **expired**.

### Required Steps to Fix:

#### 1. Enable 2-Factor Authentication (if not already done):
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication (required for app passwords)

#### 2. Generate NEW App Password:
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Click "Generate App Password"
3. Select "Mail" as the app
4. Select "Other" as device and enter "Hirewise Backend"
5. **Copy the 16-character password (no spaces)**

#### 3. Update .env File:
Replace the current `EMAIL_PASSWORD` with the new 16-character password:
```
EMAIL_PASSWORD=abcdefghijklmnop
```
(Replace with your actual generated password)

#### 4. Alternative Solution - Use a Different Email Service:
If Gmail continues to have issues, we can switch to:
- **Outlook/Hotmail** (easier setup)
- **SendGrid** (100 free emails/day)
- **Brevo** (300 free emails/day)

### Current Status:
- ✅ Fixed: Removed spaces from password
- ✅ Fixed: Added retry logic to email sending
- ❌ **BLOCKING**: Invalid Gmail credentials

### Next Action Required:
**Generate a new Gmail App Password** and update the `.env` file.

---
**Once fixed, test with:** `node test-email.js`