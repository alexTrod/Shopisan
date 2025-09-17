// Example configuration file for email verification system
// Copy this file to config.js and update with your values

module.exports = {
  // Email service configuration
  email: {
    // Gmail configuration (recommended for testing)
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com',        // Your Gmail address
      pass: 'your-app-password'            // Gmail App Password (not your regular password)
    }
    
    // Alternative: SendGrid configuration
    // host: 'smtp.sendgrid.net',
    // port: 587,
    // secure: false,
    // auth: {
    //   user: 'apikey',
    //   pass: 'your-sendgrid-api-key'
    // }
    
    // Alternative: Mailgun configuration
    // host: 'smtp.mailgun.org',
    // port: 587,
    // secure: false,
    // auth: {
    //   user: 'your-mailgun-username',
    //   pass: 'your-mailgun-password'
    // }
  },
  
  // Admin notification settings
  admin: {
    email: 'admin@yourdomain.com',        // Your email for receiving notifications
    name: 'Shopisan Admin'                // Your name for email display
  },
  
  // App configuration
  app: {
    name: 'Shopisan',                     // Your app name
    domain: 'https://your-app-domain.com', // Your app domain for verification links
    supportEmail: 'support@yourdomain.com' // Support email for users
  },
  
  // Verification settings
  verification: {
    tokenExpirationDays: 7,               // How long verification tokens are valid
    resendCooldownMinutes: 1,            // Cooldown between resend requests
    maxResendAttempts: 5                  // Maximum resend attempts per day
  },
  
  // Email templates customization
  templates: {
    fromName: 'Shopisan Team',            // Sender name for verification emails
    replyTo: 'noreply@yourdomain.com',    // Reply-to address
    logoUrl: 'https://your-domain.com/logo.png' // Your logo URL for emails
  }
};

// Setup instructions:
// 1. Copy this file to config.js
// 2. Update all placeholder values with your actual configuration
// 3. For Gmail: Enable 2FA and generate an App Password
// 4. For SendGrid: Get your API key from the dashboard
// 5. For Mailgun: Get credentials from your account
// 6. Update your app domain for verification links
// 7. Set your admin email for notifications
