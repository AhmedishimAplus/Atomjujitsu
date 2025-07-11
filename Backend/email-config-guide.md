# Email Configuration Guide

## Setting up Email for Warning Notifications

Follow these steps to configure email notifications for login attempts and account lockouts:

1. Create or update your `.env` file in the Backend folder with the following email settings:

```
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_APP_PASSWORD=your_app_password_here
```

2. For Gmail accounts, you need to use an App Password rather than your regular Gmail password:
   - Go to your Google Account settings
   - Navigate to Security > 2-Step Verification > App passwords
   - Create a new app password for "Mail" and "Other (Custom name)" - name it "Atom Jujitsu POS"
   - Copy the generated password and paste it as EMAIL_APP_PASSWORD in your .env file

3. Test your email configuration:
   ```
   cd Backend
   node test-email.js
   ```
   
   If the test is successful, you'll see confirmation messages and should receive a test email.

## Troubleshooting

If you're not receiving warning emails:

1. Check the server console logs for any email-related errors
2. Verify that your EMAIL_USER and EMAIL_APP_PASSWORD are set correctly in the .env file
3. Make sure your Gmail account allows less secure apps or is properly set up with an App Password
4. Check your spam/junk folder for the warning emails
5. Try running the test-email.js script to confirm the email configuration is working

Note: The system will send warning emails when:
- 3 failed login attempts occur (warning email)
- 5 failed login attempts occur (lockout notification email)
- Invalid 2FA verification attempts occur
