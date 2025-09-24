# Email Verification System Setup Guide

This guide explains how to set up and configure the comprehensive email verification system for Shopisan using **Gmail SMTP**.

## Overview

The email verification system includes:
- **User Registration**: New users get verification emails with 7-day expiration
- **Admin Notifications**: You receive emails for all new registrations
- **Verification Management**: Users can resend verification emails with 1-minute cooldown
- **Automatic Expiration**: Tokens expire after 7 days and are automatically cleaned up
- **Status Tracking**: Real-time verification status in the app

## Prerequisites

1. **Firebase Project**: Ensure you have a Firebase project set up
2. **Firebase CLI**: Install Firebase CLI globally: `npm install -g firebase-tools`
3. **Gmail Account**: Use Gmail SMTP for email delivery

## Setup Steps

### 1. Firebase Functions Setup

```bash
# Navigate to your project root
cd /path/to/your/shopisan/project

# Initialize Firebase Functions
firebase init functions

# Select your project and choose Node.js 18
# Install dependencies
cd functions
npm install
```

### 2. Gmail SMTP Setup

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Enable 2-Factor Authentication if not already enabled

#### Step 2: Generate App Password
1. Go to Google Account → Security → App passwords
2. Generate a new app password for "Mail"
3. Copy the generated password (16 characters)

#### Step 3: Configure Firebase Environment Variables

```bash
# Set Gmail SMTP configuration
firebase functions:config:set email.host="smtp.gmail.com"
firebase functions:config:set email.port="587"
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.pass="your-app-password"

# Set admin email for notifications
firebase functions:config:set admin.email="alexandra.fd1000@gmail.com"
```

### 3. Update Email Templates

Edit `functions/index.js` and update:
- `verificationUrl` in the `sendVerificationEmail` function
- `verificationUrl` in the `resendVerificationEmail` function
- Email styling and branding

**Important**: Update the verification URLs to match your app:
```javascript
// For deep linking to your app:
const verificationUrl = `shopisan://verify-email?token=${token}`;

// For web verification page:
const verificationUrl = `https://your-web-domain.com/verify-email?token=${token}`;
```

### 4. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:sendVerificationEmail
firebase deploy --only functions:sendAdminNotification
```

### 5. Test the System

1. **Create a new user account**
2. **Check your email** for the verification link
3. **Check admin email** for the notification
4. **Click verification link** to verify the account
5. **Test resend functionality** in the app

## Configuration Options

### Email Templates

The system uses Handlebars templates for emails. You can customize:
- HTML structure and styling
- Email content and messaging
- Branding and colors
- Expiration warnings

### Verification Settings

- **Token Expiration**: 7 days (configurable in code)
- **Resend Cooldown**: 1 minute (configurable in code)
- **Automatic Cleanup**: Daily scheduled function

### Admin Notifications

You'll receive emails for:
- New shopper registrations
- New merchant registrations
- Registration details (username, email, user type, date)

## Gmail SMTP Features

### Benefits of Gmail SMTP
- **Reliability**: Google's robust email infrastructure
- **Easy Setup**: Simple SMTP configuration
- **Free**: No additional costs for email sending
- **Security**: Built-in Google security features
- **Familiar**: Uses your existing Gmail account

### Gmail SMTP Configuration
- **Host**: smtp.gmail.com
- **Port**: 587 (TLS)
- **Authentication**: App password required
- **Rate Limits**: 500 emails per day (free account)

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Firebase Functions logs: `firebase functions:log`
   - Verify Gmail app password is correct
   - Ensure 2FA is enabled on Gmail account
   - Check network connectivity

2. **Verification links not working**
   - Ensure correct verification URL in functions
   - Check token expiration
   - Verify user document structure

3. **Functions deployment fails**
   - Check Node.js version (requires 18)
   - Verify dependencies are installed
   - Check Firebase project configuration

4. **Gmail-specific issues**
   - App password not working: Generate new app password
   - Rate limiting: Check Gmail daily sending limits
   - Authentication failed: Verify app password format

### Debug Mode

Enable detailed logging in functions:
```javascript
// Add to functions/index.js
console.log('Debug info:', { email, username, token, userType });
console.log('Gmail config:', { host: 'smtp.gmail.com', adminEmail: ADMIN_EMAIL });
```

## Security Considerations

1. **Token Security**: Verification tokens are randomly generated and stored securely
2. **Rate Limiting**: 1-minute cooldown prevents spam
3. **Expiration**: Automatic cleanup prevents stale tokens
4. **Admin Access**: Only you receive admin notifications
5. **API Key Security**: API keys are stored in Firebase config (encrypted)

## Monitoring

### Firebase Console
- Functions execution logs
- Function performance metrics
- Error tracking

### Gmail Account
- Sent emails in Gmail
- Email delivery status
- Bounce notifications
- Spam folder monitoring

### Custom Metrics
- Verification success rates
- User engagement metrics
- Email delivery performance

## Cost Considerations

- **Firebase Functions**: Pay per execution (first 125K/month free)
- **Gmail SMTP**: Free with Gmail account
  - Rate limit: 500 emails per day (free account)
  - No additional costs for email sending
- **Firestore**: Pay per read/write (first 50K reads, 20K writes/month free)

## Best Practices

1. **Start with Gmail**: Use Gmail SMTP for simple setup
2. **Monitor Deliverability**: Check Gmail sent folder regularly
3. **Handle Bounces**: Monitor bounce notifications in Gmail
4. **Test Thoroughly**: Verify all flows before going live
5. **Backup Plan**: Have fallback verification methods
6. **Regular Updates**: Keep dependencies and security patches current

## Support Resources

- **Gmail Help**: [https://support.google.com/mail/](https://support.google.com/mail/)
- **Gmail SMTP Settings**: [https://support.google.com/mail/answer/7126229](https://support.google.com/mail/answer/7126229)
- **App Passwords**: [https://support.google.com/accounts/answer/185833](https://support.google.com/accounts/answer/185833)
- **Firebase Functions**: [https://firebase.google.com/docs/functions](https://firebase.google.com/docs/functions)

## Next Steps

After setup:
1. **Test thoroughly** with multiple email addresses
2. **Monitor delivery rates** in Gmail sent folder
3. **Check bounce notifications** in Gmail
4. **Customize email templates** with your branding
5. **Scale up** as your user base grows
