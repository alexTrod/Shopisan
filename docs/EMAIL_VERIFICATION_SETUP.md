# Email Verification System Setup Guide (Mailgun)

This guide explains how to set up and configure the comprehensive email verification system for Shopisan using **Mailgun**.

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
3. **Mailgun Account**: Create a Mailgun account for email delivery

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

### 2. Mailgun Account Setup

#### Step 1: Create Mailgun Account
1. Go to [https://www.mailgun.com/](https://www.mailgun.com/)
2. Sign up for a free account (5,000 emails/month free)
3. Verify your email address

#### Step 2: Add and Verify Your Domain
1. In Mailgun dashboard, click "Add Domain"
2. Enter your domain (e.g., `yourdomain.com`)
3. Choose "Custom Domain" option
4. Follow the DNS setup instructions:
   - Add MX records
   - Add SPF records
   - Add DKIM records
5. Wait for domain verification (24-48 hours)

#### Step 3: Get Your API Key
1. Go to Settings → API Keys in Mailgun dashboard
2. Copy your Private API Key
3. Note your domain (e.g., `yourdomain.mailgun.org`)

### 3. Configure Firebase Environment Variables

```bash
# Set Mailgun configuration
firebase functions:config:set mailgun.api_key="your-mailgun-api-key"
firebase functions:config:set mailgun.domain="your-domain.mailgun.org"

# Set admin email for notifications
firebase functions:config:set admin.email="alexandra.fd1000@gmail.com"
```

### 4. Update Email Templates

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

### 5. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:sendVerificationEmail
firebase deploy --only functions:sendAdminNotification
```

### 6. Test the System

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

## Mailgun-Specific Features

### Benefits of Mailgun
- **High Deliverability**: Professional email infrastructure
- **Analytics**: Track email opens, clicks, bounces
- **Webhooks**: Real-time delivery status updates
- **Scalability**: Handle high email volumes
- **Free Tier**: 5,000 emails/month free

### Mailgun Dashboard Features
- **Email Logs**: See all sent emails
- **Bounce Management**: Handle failed deliveries
- **Spam Reports**: Monitor reputation
- **API Usage**: Track API calls and limits

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Firebase Functions logs: `firebase functions:log`
   - Verify Mailgun API key and domain
   - Ensure domain is verified in Mailgun
   - Check network connectivity

2. **Verification links not working**
   - Ensure correct verification URL in functions
   - Check token expiration
   - Verify user document structure

3. **Functions deployment fails**
   - Check Node.js version (requires 18)
   - Verify dependencies are installed
   - Check Firebase project configuration

4. **Mailgun-specific issues**
   - Domain not verified: Wait 24-48 hours after DNS setup
   - API key invalid: Check Mailgun dashboard
   - Rate limiting: Check your Mailgun plan limits

### Debug Mode

Enable detailed logging in functions:
```javascript
// Add to functions/index.js
console.log('Debug info:', { email, username, token, userType });
console.log('Mailgun config:', { domain: MAILGUN_DOMAIN, adminEmail: ADMIN_EMAIL });
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

### Mailgun Dashboard
- Email delivery rates
- Bounce and spam reports
- API usage statistics
- Domain reputation

### Custom Metrics
- Verification success rates
- User engagement metrics
- Email delivery performance

## Cost Considerations

- **Firebase Functions**: Pay per execution (first 125K/month free)
- **Mailgun**: Free tier includes 5,000 emails/month
  - Additional emails: $0.80 per 1,000
  - Professional features: $35/month
- **Firestore**: Pay per read/write (first 50K reads, 20K writes/month free)

## Best Practices

1. **Start with Free Tier**: Use Mailgun's free tier for testing
2. **Monitor Deliverability**: Check Mailgun dashboard regularly
3. **Handle Bounces**: Set up bounce handling for better deliverability
4. **Test Thoroughly**: Verify all flows before going live
5. **Backup Plan**: Have fallback verification methods
6. **Regular Updates**: Keep dependencies and security patches current

## Support Resources

- **Mailgun Dashboard**: [https://app.mailgun.com/](https://app.mailgun.com/)
- **Mailgun Documentation**: [https://documentation.mailgun.com/](https://documentation.mailgun.com/)
- **Mailgun Support**: [https://help.mailgun.com/](https://help.mailgun.com/)
- **Firebase Functions**: [https://firebase.google.com/docs/functions](https://firebase.google.com/docs/functions)

## Next Steps

After setup:
1. **Test thoroughly** with multiple email addresses
2. **Monitor delivery rates** in Mailgun dashboard
3. **Set up webhooks** for real-time delivery tracking
4. **Customize email templates** with your branding
5. **Scale up** as your user base grows
