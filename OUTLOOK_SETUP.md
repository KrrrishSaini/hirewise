## 📧 OUTLOOK EMAIL SETUP GUIDE

### ✅ What I've Done:
1. **Kept Gmail credentials** as backup (GMAIL_USER, GMAIL_PASSWORD, GMAIL_FROM)
2. **Added Outlook configuration** (EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM)
3. **Updated email service** to use Outlook SMTP instead of Gmail

### 🎯 Next Steps:

#### 1. Create Outlook Account (2 minutes):
1. Go to [outlook.com](https://outlook.com)
2. Click **"Create account"**
3. Choose: **hirewise-system@outlook.com** (or similar)
4. Set password: **TempPass123!** (or your preferred password)
5. Complete registration

#### 2. Update .env File:
```
EMAIL_USER=your-actual-outlook-email@outlook.com
EMAIL_PASSWORD=your-actual-password
EMAIL_FROM=your-actual-outlook-email@outlook.com
```

#### 3. Test Email:
```bash
node test-email.js
```

### 🔧 Why Outlook is Better:
- ✅ **No app passwords** required
- ✅ **More reliable** SMTP
- ✅ **Faster setup** (2 minutes vs 10 minutes)
- ✅ **Better deliverability**
- ✅ **Less rate limiting**

### 🚀 Production Deployment:
Once working locally, update the same variables on **Render**:
- EMAIL_USER=your-outlook-email@outlook.com
- EMAIL_PASSWORD=your-outlook-password  
- EMAIL_FROM=your-outlook-email@outlook.com

**Total setup time: ~3 minutes** 🎯