// Mailgun Configuration for Shopisan Email Verification
// Copy this file to config.js and update with your Mailgun credentials

module.exports = {
  // Mailgun API Configuration
  mailgun: {
    domain: 'https://api.mailgun.net',         // Your verified domain in Mailgun
    base_url: 'https://api.mailgun.net/v3'     // Mailgun API endpoint
  },
  
  // Admin notification settings
  admin: {
    email: 'alexandra.fd1000@gmail.com',       // Your email for receiving notifications
    name: 'Shopisan Admin'                     // Your name for email display
  },
  
  // App configuration
  app: {
    name: 'Shopisan',                          // Your app name
    domain: 'https://shopisan-bad76.web.app',  // Your Firebase Hosting domain
    supportEmail: 'alexandra.fd1000@gmail.com' // Your support email
  },
  
  // Verification settings
  verification: {
    tokenExpirationDays: 7,                    // How long verification tokens are valid
    resendCooldownMinutes: 1,                 // Cooldown between resend requests
    maxResendAttempts: 5                      // Maximum resend attempts per day
  },
  
  // Email templates customization
  templates: {
    fromName: 'Shopisan Team',                 // Sender name for verification emails
    replyTo: 'noreply@shopisan.com',         // Reply-to address
    logoUrl: 'https://shopisan.com/logo.png' // Your logo URL for emails
  }
};

// ============================================================================
// MAILGUN SETUP INSTRUCTIONS
// ============================================================================

// 1. CREATE MAILGUN ACCOUNT
//    - Go to https://www.mailgun.com/
//    - Sign up for a free account (5,000 emails/month free)

// 2. VERIFY YOUR DOMAIN
//    - Add your domain in Mailgun dashboard
//    - Follow DNS setup instructions
//    - Wait for domain verification (usually 24-48 hours)

// 3. GET YOUR API KEY
//    - Go to Settings → API Keys in Mailgun dashboard
//    - Copy your Private API Key

// 4. SET FIREBASE CONFIG
//    Run these commands in your terminal:
//
//    firebase functions:config:set mailgun.api_key="your-api-key-here"
//    firebase functions:config:set mailgun.domain="your-domain.mailgun.org"
//    firebase functions:config:set admin.email="alexandra.fd1000@gmail.com"

// 5. TEST THE SYSTEM
//    - Deploy functions: firebase deploy --only functions
//    - Create a test user account
//    - Check your email for verification link
//    - Check admin email for notification

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

// Common Issues:
// - Domain not verified: Wait 24-48 hours after DNS setup
// - API key invalid: Check your Mailgun dashboard
// - Emails not sending: Check Firebase Functions logs
// - Spam folder: Check your email spam/junk folder

// Mailgun Dashboard: https://app.mailgun.com/
// API Documentation: https://documentation.mailgun.com/
// Support: https://help.mailgun.com/
