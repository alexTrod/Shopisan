const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

admin.initializeApp();

// Namecheap Private Email SMTP configuration
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@shopisan.com',
    pass: 'xW4MFyjIMCA0eo'
  }
});

// Support email transporter (for receiving feedback)
const supportTransporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@shopisan.com',
    pass: 'oAn797mV0teNo7'
  }
});

const ADMIN_EMAIL = 'info@shopisan.com';
const SENDER_EMAIL = 'info@shopisan.com';
const SUPPORT_EMAIL = 'support@shopisan.com';

// Email templates for different user types
const shopperEmailTemplate = {
  fr: {
    subject: "Bienvenue dans l'aventure Shopisan 🚀",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bienvenue sur Shopisan</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Bienvenue dans l'aventure Shopisan 🚀</h2>
    </div>
    <div class="content">
      <p>Bonjour {{username}},</p>
      <p>Merci pour ton inscription ! Tu fais maintenant partie de la communauté Shopisan qui aide les commerces de proximité à gagner en visibilité.</p>
      <p>On t'enverra un petit message dès que tes commerces préférés arrivent sur l'appli. En attendant, n'hésite pas à en parler autour de toi et à ajouter tes commerces préférés sur Shopisan.</p>
      <p>À très vite,<br>L'équipe Shopisan</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Site internet</a> |
        <a href="{{verificationUrl}}">Lien vers l'application</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  },
  en: {
    subject: "Welcome to the Shopisan adventure 🚀",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Shopisan</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to the Shopisan adventure 🚀</h2>
    </div>
    <div class="content">
      <p>Hello {{username}},</p>
      <p>Thank you for signing up! You are now part of the Shopisan community that helps local businesses gain visibility.</p>
      <p>We'll send you a message as soon as your favorite shops arrive on the app. In the meantime, feel free to spread the word and add your favorite shops on Shopisan.</p>
      <p>See you soon,<br>The Shopisan Team</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Website</a> |
        <a href="{{verificationUrl}}">Link to application</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }
};

const merchantEmailTemplate = {
  fr: {
    subject: "Bienvenue sur Shopisan 🚀",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bienvenue sur Shopisan</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Bienvenue sur Shopisan 🚀</h2>
    </div>
    <div class="content">
      <p>Bonjour {{storeName}},</p>
      <p>Merci pour votre inscription sur Shopisan ! Nous sommes ravis de vous accueillir dans la communauté qui met en avant les commerces de proximité.</p>
      <p>Votre demande a bien été reçue et sera validée sous peu par notre équipe. Dès que votre inscription sera confirmée, vous pourrez configurer votre compte et commencer à présenter votre boutique aux utilisateurs de l'application.</p>
      <p>On vous tient au courant très vite par e-mail.</p>
      <p>À bientôt,<br>L'équipe Shopisan</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Site internet</a> |
        <a href="{{verificationUrl}}">Lien vers l'application</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  },
  en: {
    subject: "Welcome to Shopisan 🚀",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Shopisan</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to Shopisan 🚀</h2>
    </div>
    <div class="content">
      <p>Hello {{storeName}},</p>
      <p>Thank you for registering on Shopisan! We are delighted to welcome you to the community that highlights local businesses.</p>
      <p>Your request has been successfully received and will be validated shortly by our team. As soon as your registration is confirmed, you will be able to set up your account and start presenting your shop to the app's users.</p>
      <p>We will keep you updated by email very soon.</p>
      <p>See you soon,<br>The Shopisan Team</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Website</a> |
        <a href="{{verificationUrl}}">Link to application</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }
};

const adminNotificationTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New User Registration</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 24px; }
    .footer { margin-top: 24px; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h2>New user registered</h2>
    <p>Username: {{username}}</p>
    <p>Email: {{email}}</p>
    <p>Type: {{userType}}</p>
    <p>Date: {{registrationDate}}</p>
    <div class="footer">
      <p>Shopisan</p>
    </div>
  </div>
</body>
</html>
`;

// Store validation confirmation email templates
const storeValidationEmailTemplate = {
  fr: {
    subject: "Votre boutique est maintenant en ligne sur Shopisan !",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Boutique validée</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
    .contact { margin-top: 20px; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Votre boutique est maintenant en ligne sur Shopisan !</h2>
    </div>
    <div class="content">
      <p>Bonjour {{storeName}},</p>
      <p>C'est officiel : votre inscription sur Shopisan a été validée.</p>
      <p>Votre boutique rejoint aujourd'hui la communauté qui met en avant les commerces de proximité. Il ne vous reste plus qu'à configurer votre compte pour présenter vos produits et accueillir vos premiers clients via l'application.</p>
      <p style="text-align: center;">
        <a href="{{appUrl}}" class="button">Accéder à mon compte</a>
      </p>
      <p>Bienvenue dans l'aventure Shopisan !</p>
      <p>Nous sommes ravis de vous compter parmi nous !</p>
      <p>À bientôt,<br>L'équipe Shopisan</p>
      <p class="contact">Notre équipe est à votre disposition à info@shopisan.com</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Site internet</a> |
        <a href="{{appUrl}}">Lien vers l'application</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  },
  en: {
    subject: "Your store is now live on Shopisan!",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Store Validated</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
    .contact { margin-top: 20px; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Your store is now live on Shopisan!</h2>
    </div>
    <div class="content">
      <p>Hello {{storeName}},</p>
      <p>It's official: your registration on Shopisan has been validated.</p>
      <p>Your store is joining today the community that highlights local businesses. All that's left is for you to configure your account to present your products and welcome your first customers through the app.</p>
      <p style="text-align: center;">
        <a href="{{appUrl}}" class="button">Access my account</a>
      </p>
      <p>Welcome to the Shopisan adventure!</p>
      <p>We are delighted to have you on board!</p>
      <p>See you soon,<br>The Shopisan Team</p>
      <p class="contact">Our team is at your disposal at info@shopisan.com</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Website</a> |
        <a href="{{appUrl}}">Link to app</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }
};

// Store creation notification template (for admin)
const storeCreationAdminTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Store Registration</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 24px; }
    .header { background-color: #6B2D5C; color: white; padding: 16px; border-radius: 8px 8px 0 0; }
    .content { background-color: #fff; padding: 16px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
    .footer { margin-top: 24px; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Store Pending Validation</h2>
    </div>
    <div class="content">
      <p><strong>Store Name:</strong> {{storeName}}</p>
      <p><strong>City:</strong> {{city}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Categories:</strong> {{categories}}</p>
      <p><strong>Date:</strong> {{registrationDate}}</p>
    </div>
    <div class="footer">
      <p>Please validate this store in the admin dashboard</p>
    </div>
  </div>
</body>
</html>
`;

// Merchant verification email template (combines user welcome + store info)
const merchantVerificationEmailTemplate = {
  fr: {
    subject: "Bienvenue sur Shopisan - Confirmez votre inscription",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inscription Commercant</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .store-info { background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6B2D5C; }
    .store-info h3 { margin-top: 0; color: #6B2D5C; }
    .pending-badge { display: inline-block; background-color: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Bienvenue sur Shopisan !</h2>
    </div>
    <div class="content">
      <p>Bonjour {{username}},</p>
      <p>Merci pour votre inscription en tant que commercant sur Shopisan !</p>

      <div class="store-info">
        <h3>Votre boutique enregistree</h3>
        <p><strong>Nom :</strong> {{storeName}}</p>
        <p><strong>Ville :</strong> {{storeCity}}</p>
        <p><span class="pending-badge">En attente de validation</span></p>
      </div>

      <p>Votre boutique sera examinee par notre equipe et validee sous peu. Vous recevrez un email de confirmation des que votre boutique sera en ligne.</p>

      <p>En attendant, cliquez sur le bouton ci-dessous pour verifier votre adresse email :</p>

      <p style="text-align: center;">
        <a href="{{verificationUrl}}" class="button">Verifier mon email</a>
      </p>

      <p>A bientot,<br>L'equipe Shopisan</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Site internet</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  },
  en: {
    subject: "Welcome to Shopisan - Confirm your registration",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Merchant Registration</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .store-info { background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6B2D5C; }
    .store-info h3 { margin-top: 0; color: #6B2D5C; }
    .pending-badge { display: inline-block; background-color: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #6B2D5C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to Shopisan!</h2>
    </div>
    <div class="content">
      <p>Hello {{username}},</p>
      <p>Thank you for registering as a merchant on Shopisan!</p>

      <div class="store-info">
        <h3>Your registered store</h3>
        <p><strong>Name:</strong> {{storeName}}</p>
        <p><strong>City:</strong> {{storeCity}}</p>
        <p><span class="pending-badge">Pending validation</span></p>
      </div>

      <p>Your store will be reviewed by our team and validated shortly. You will receive a confirmation email as soon as your store is live.</p>

      <p>In the meantime, click the button below to verify your email address:</p>

      <p style="text-align: center;">
        <a href="{{verificationUrl}}" class="button">Verify my email</a>
      </p>

      <p>See you soon,<br>The Shopisan Team</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Website</a> |
        <a href="{{instagramUrl}}">Instagram</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }
};

// Function to send store creation notification (called when a new store is added)
exports.sendStoreCreationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { storeName, storeEmail, city, categories, language = 'fr' } = data;

    if (!storeName || !storeEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Handle locale strings like 'en-US', 'fr-FR', etc. Default to French
    const lang = (language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';

    // Send confirmation to merchant
    const emailTemplate = merchantEmailTemplate[lang];
    const subject = emailTemplate.subject;

    const template = handlebars.compile(emailTemplate.template);
    const htmlContent = template({
      storeName,
      username: storeName,
      appUrl: 'https://shopisan-bad76.web.app',
      verificationUrl: 'https://shopisan-bad76.web.app',
      instagramUrl: 'https://instagram.com/shopisanapp'
    });

    // Send to merchant
    const merchantMailOptions = {
      from: `"Shopisan" <${SENDER_EMAIL}>`,
      to: storeEmail,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(merchantMailOptions);
    console.log('Store creation email sent to merchant:', storeEmail);

    // Send notification to admin
    const adminTemplate = handlebars.compile(storeCreationAdminTemplate);
    const adminHtmlContent = adminTemplate({
      storeName,
      city: city || 'Not specified',
      email: storeEmail,
      categories: Array.isArray(categories) ? categories.join(', ') : (categories || 'Not specified'),
      registrationDate: new Date().toLocaleDateString()
    });

    const adminMailOptions = {
      from: `"Shopisan System" <${SENDER_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `New Store Registration: ${storeName}`,
      html: adminHtmlContent
    };

    await transporter.sendMail(adminMailOptions);
    console.log('Store creation notification sent to admin');

    return { success: true, message: 'Store creation emails sent successfully' };

  } catch (error) {
    console.error('Error sending store creation email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send store creation email');
  }
});

// Function to send verification email (same email for all account types - shopper or merchant)
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email, username, token, userType, language = 'en', storeName } = data;

    if (!email || !username || !token || !userType) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Create verification URL - using Firebase Hosting
    const verificationUrl = `https://shopisan-bad76.web.app/verify-email?token=${token}`;

    // Same template for all account types (shopper and merchant). Default to French
    const lang = (language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    const emailTemplate = shopperEmailTemplate[lang];
    const subject = emailTemplate.subject;

    // Compile email template
    const template = handlebars.compile(emailTemplate.template);
    const htmlContent = template({
      username,
      storeName: storeName || username,
      verificationUrl,
      email,
      appUrl: 'https://shopisan-bad76.web.app',
      instagramUrl: 'https://instagram.com/shopisanapp'
    });

    // Send email using Nodemailer with Gmail
    const mailOptions = {
      from: `"Shopisan" <${SENDER_EMAIL}>`,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('Verification email sent successfully via Gmail:', result);
    return { success: true, message: 'Verification email sent successfully', messageId: result.messageId };

  } catch (error) {
    console.error('Error sending verification email via Gmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
  }
});

// Function to send merchant verification email (with store info)
exports.sendMerchantVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email, username, token, storeName, storeCity, language = 'fr' } = data;

    if (!email || !username || !token || !storeName) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Create verification URL
    const verificationUrl = `https://shopisan-bad76.web.app/verify-email?token=${token}`;

    // Select language template
    const lang = (language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    const emailTemplate = merchantVerificationEmailTemplate[lang];

    // Compile email template
    const template = handlebars.compile(emailTemplate.template);
    const htmlContent = template({
      username,
      storeName,
      storeCity: storeCity || 'Non specifie',
      verificationUrl,
      appUrl: 'https://shopisan-bad76.web.app',
      instagramUrl: 'https://instagram.com/shopisanapp'
    });

    // Send email
    const mailOptions = {
      from: `"Shopisan" <${SENDER_EMAIL}>`,
      to: email,
      subject: emailTemplate.subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('Merchant verification email sent successfully:', result);
    return { success: true, message: 'Merchant verification email sent successfully', messageId: result.messageId };

  } catch (error) {
    console.error('Error sending merchant verification email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send merchant verification email');
  }
});

// Function to send admin notification
exports.sendAdminNotification = functions.https.onCall(async (data, context) => {
  try {
    const { email, username, userType } = data;

    if (!email || !username || !userType) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Compile admin notification template
    const template = handlebars.compile(adminNotificationTemplate);
    const htmlContent = template({
      username,
      email,
      userType,
      registrationDate: new Date().toLocaleDateString()
    });

    // Send admin notification using Nodemailer with Gmail
    const mailOptions = {
      from: `"Shopisan System" <${SENDER_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `New ${userType} registration`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('Admin notification sent successfully via Gmail:', result);
    return { success: true, message: 'Admin notification sent successfully', messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending admin notification via Gmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send admin notification');
  }
});

// Function to handle email verification (called when user clicks verification link)
exports.verifyEmail = functions.https.onCall(async (data, context) => {
  try {
    const { token } = data;

    if (!token) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing verification token');
    }

    // Get user by verification token
    const usersRef = admin.firestore().collection('users');
    const querySnapshot = await usersRef.where('verificationToken', '==', token).get();

    if (querySnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'Invalid verification token');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Check if token has expired
    if (userData.verificationExpiresAt && new Date() > userData.verificationExpiresAt.toDate()) {
      throw new functions.https.HttpsError('failed-precondition', 'Verification token has expired');
    }

    // Mark email as verified
    await userDoc.ref.update({
      emailVerificationStatus: 'verified',
      is_validated: true,
      verificationToken: null,
      verificationExpiresAt: null,
      emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Email verified successfully',
      userId: userDoc.id
    };
    
  } catch (error) {
    console.error('Error verifying email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify email');
  }
});

// Scheduled function to expire verification tokens after 7 days
exports.expireVerificationTokens = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const usersRef = admin.firestore().collection('users');
    const querySnapshot = await usersRef
      .where('emailVerificationStatus', '==', 'pending')
      .where('verificationExpiresAt', '<', sevenDaysAgo)
      .get();

    const batch = admin.firestore().batch();
    let expiredCount = 0;

    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        emailVerificationStatus: 'expired',
        is_validated: false
      });
      expiredCount++;
    });

    if (expiredCount > 0) {
      await batch.commit();
      console.log(`Expired ${expiredCount} verification tokens`);
    }

    return { success: true, expiredCount };
    
  } catch (error) {
    console.error('Error expiring verification tokens:', error);
    throw error;
  }
});

// Function to resend verification email
exports.resendVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email, username, userType, language = 'en', storeName } = data;

    if (!email || !username || !userType) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Generate new verification token
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update user document with new token
    const usersRef = admin.firestore().collection('users');
    const querySnapshot = await usersRef.where('email', '==', email).get();

    if (querySnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userDoc = querySnapshot.docs[0];
    await userDoc.ref.update({
      verificationToken: newToken,
      verificationExpiresAt: newExpiration,
      lastVerificationSent: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send new verification email
    const verificationUrl = `https://shopisan-bad76.web.app/verify-email?token=${newToken}`;

    // Select template based on user type and language
    // Handle full locale strings like 'en-US', 'fr-FR', etc. Default to French
    let emailTemplate, subject;
    const lang = (language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';

    // Same template for all user types (shopper and merchant)
    emailTemplate = shopperEmailTemplate[lang];
    subject = emailTemplate.subject;
    
    // Compile email template
    const template = handlebars.compile(emailTemplate.template);
    const htmlContent = template({
      username: userType === 'merchant' ? (storeName || username) : username,
      storeName: storeName || username,
      verificationUrl,
      email,
      appUrl: 'https://shopisan-bad76.web.app',
      instagramUrl: 'https://instagram.com/shopisanapp'
    });

    const mailOptions = {
      from: `"Shopisan" <${SENDER_EMAIL}>`,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    return { 
      success: true, 
      message: 'New verification email sent successfully',
      newToken,
      newExpiration
    };
    
  } catch (error) {
    console.error('Error resending verification email via Gmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to resend verification email');
  }
});

// Add this new function after the existing functions
exports.sendFeedback = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    const { message, type, userEmail, userName } = req.body;
    
    if (!message || !type) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Create feedback email template
    const feedbackTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Feedback from Shopisan App</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 24px; }
    .header { background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
    .content { background-color: #fff; padding: 16px; border: 1px solid #ddd; border-radius: 8px; }
    .footer { margin-top: 24px; font-size: 12px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Feedback from Shopisan App</h2>
      <p><strong>Type:</strong> {{type}}</p>
      <p><strong>From:</strong> {{userName}} ({{userEmail}})</p>
      <p><strong>Date:</strong> {{date}}</p>
    </div>
    <div class="content">
      <h3>Message:</h3>
      <p>{{message}}</p>
    </div>
    <div class="footer">
      <p>This message was sent from the Shopisan mobile app</p>
    </div>
  </div>
</body>
</html>
    `;

    // Compile feedback template
    const template = handlebars.compile(feedbackTemplate);
    const htmlContent = template({
      message,
      type,
      userName: userName || 'Anonymous',
      userEmail: userEmail || 'Not provided',
      date: new Date().toLocaleString()
    });

    // Send feedback email to support@shopisan.com
    const mailOptions = {
      from: `"Shopisan App" <${SENDER_EMAIL}>`,
      to: SUPPORT_EMAIL,
      subject: `Shopisan Feedback: ${type}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('Feedback email sent successfully:', result);
    res.status(200).json({ success: true, message: 'Feedback sent successfully', messageId: result.messageId });
    
  } catch (error) {
    console.error('Error sending feedback email:', error);
    res.status(500).json({ error: 'Failed to send feedback' });
  }
});

// Cloud Function that triggers when a store is validated
exports.onStoreValidated = functions.firestore
  .document('stores/{storeId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const storeId = context.params.storeId;

    // Check if store was just validated (is_validated changed to true from false or undefined)
    if (!before.is_validated && after.is_validated === true) {
      try {
        console.log(`Store ${storeId} has been validated, sending confirmation email`);

        // Get store owner information
        let storeEmail = after.storeEmail || after.email;
        const storeName = after.name;

        // If no email on store, try to get it from the owner
        let ownerLanguage = null;
        if (after.owner_id) {
          const ownerDoc = await admin.firestore().collection('users').doc(after.owner_id).get();
          if (ownerDoc.exists) {
            const ownerData = ownerDoc.data();
            if (!storeEmail) {
              storeEmail = ownerData.email;
              console.log(`Found owner email: ${storeEmail}`);
            }
            ownerLanguage = ownerData.language || ownerData.locale;
          }
        }

        if (!storeEmail) {
          console.error('No email found for store:', storeId);
          return null;
        }

        // Determine language preference from owner, then store, default to French
        const language = ownerLanguage || after.language || 'fr';
        const lang = language.toLowerCase().startsWith('en') ? 'en' : 'fr';

        // Get email template
        const emailTemplate = storeValidationEmailTemplate[lang];
        const subject = emailTemplate.subject;

        // Compile email template
        const template = handlebars.compile(emailTemplate.template);
        const htmlContent = template({
          storeName,
          appUrl: 'https://shopisan-bad76.web.app',
          instagramUrl: 'https://instagram.com/shopisanapp'
        });

        // Send validation confirmation email
        const mailOptions = {
          from: `"Shopisan" <${SENDER_EMAIL}>`,
          to: storeEmail,
          subject: subject,
          html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Store validation email sent successfully:', result.messageId);

        return result;

      } catch (error) {
        console.error('Error sending store validation email:', error);
        return null;
      }
    }

    return null;
  });

// Email change verification templates
const emailChangeTemplate = {
  fr: {
    subject: "Confirmez votre nouvelle adresse email - Shopisan",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Changement d'email</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; }
    .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Confirmez votre nouvelle adresse email</h2>
    </div>
    <div class="content">
      <p>Bonjour {{username}},</p>
      <p>Vous avez demandé à changer votre adresse email de <strong>{{oldEmail}}</strong> vers <strong>{{newEmail}}</strong>.</p>
      <p>Cliquez sur le bouton ci-dessous pour confirmer ce changement :</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" class="button">Confirmer le changement</a>
      </p>
      <div class="warning">
        <strong>⚠️ Important :</strong> Ce lien expire dans 24 heures. Si vous n'avez pas demandé ce changement, ignorez cet email.
      </div>
    </div>
    <div class="footer">
      <p>L'équipe Shopisan</p>
    </div>
  </div>
</body>
</html>
    `
  },
  en: {
    subject: "Confirm your new email address - Shopisan",
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Change</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6B2D5C; color: white; text-decoration: none; border-radius: 6px; }
    .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Confirm your new email address</h2>
    </div>
    <div class="content">
      <p>Hello {{username}},</p>
      <p>You requested to change your email address from <strong>{{oldEmail}}</strong> to <strong>{{newEmail}}</strong>.</p>
      <p>Click the button below to confirm this change:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" class="button">Confirm Change</a>
      </p>
      <div class="warning">
        <strong>⚠️ Important:</strong> This link expires in 24 hours. If you didn't request this change, ignore this email.
      </div>
    </div>
    <div class="footer">
      <p>The Shopisan Team</p>
    </div>
  </div>
</body>
</html>
    `
  }
};

// Function to check if email already exists in Firebase Auth
// This uses Admin SDK which can reliably check email existence
exports.checkEmailExists = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;

    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Try to get user by email using Admin SDK
      await admin.auth().getUserByEmail(normalizedEmail);
      // If we get here, the user exists
      return { exists: true };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Email is available
        return { exists: false };
      }
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    console.error('Error checking email existence:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to check email');
  }
});

// Function to delete a user from both Firebase Auth and Firestore
exports.deleteUser = functions.https.onCall(async (data, context) => {
  try {
    const { userId, email } = data;

    if (!userId && !email) {
      throw new functions.https.HttpsError('invalid-argument', 'userId or email is required');
    }

    let authUid = userId;

    // If we only have email, find the user in Auth
    if (!authUid && email) {
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        authUid = userRecord.uid;
      } catch (error) {
        console.log('User not found in Auth by email, continuing with Firestore deletion only');
      }
    }

    // Delete from Firebase Auth
    if (authUid) {
      try {
        await admin.auth().deleteUser(authUid);
        console.log(`Deleted user ${authUid} from Firebase Auth`);
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          console.error('Error deleting from Auth:', error);
        }
      }
    }

    // Delete from Firestore
    const usersRef = admin.firestore().collection('users');

    // Try to delete by userId first
    if (authUid) {
      try {
        await usersRef.doc(authUid).delete();
        console.log(`Deleted user document ${authUid} from Firestore`);
      } catch (error) {
        console.log('Could not delete by userId, trying by email');
      }
    }

    // Also try to delete by email query (in case document ID doesn't match Auth UID)
    if (email) {
      const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();
      const batch = admin.firestore().batch();
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        console.log(`Deleting user document by email: ${doc.id}`);
      });
      if (!querySnapshot.empty) {
        await batch.commit();
      }
    }

    // Also delete any stores owned by this user
    if (authUid) {
      const storesRef = admin.firestore().collection('stores');
      const storesSnapshot = await storesRef.where('owner_id', '==', authUid).get();
      if (!storesSnapshot.empty) {
        const batch = admin.firestore().batch();
        storesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          console.log(`Deleting store ${doc.id} owned by user ${authUid}`);
        });
        await batch.commit();
      }
    }

    return { success: true, message: 'User deleted successfully' };

  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to delete user: ' + error.message);
  }
});

// Function to send email change verification
exports.sendEmailChangeVerification = functions.https.onCall(async (data, context) => {
  try {
    const { userId, oldEmail, newEmail, username, language = 'fr' } = data;

    if (!userId || !oldEmail || !newEmail || !username) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Generate a secure token
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store the pending email change in Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userId).update({
      emailChangeToken: token,
      emailChangeNewEmail: newEmail,
      emailChangeExpiresAt: expiresAt,
    });

    // Create verification URL
    const verificationUrl = `https://shopisan-bad76.web.app/confirm-email-change?token=${token}&userId=${userId}`;

    // Select language
    const lang = (language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    const emailTemplate = emailChangeTemplate[lang];

    // Compile email template
    const template = handlebars.compile(emailTemplate.template);
    const htmlContent = template({
      username,
      oldEmail,
      newEmail,
      verificationUrl
    });

    // Send email to the NEW email address
    const mailOptions = {
      from: `"Shopisan" <${SENDER_EMAIL}>`,
      to: newEmail,
      subject: emailTemplate.subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email change verification sent successfully:', result.messageId);

    return { success: true, message: 'Verification email sent to new address' };

  } catch (error) {
    console.error('Error sending email change verification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
  }
});

// Function to confirm email change (called when user clicks the link)
exports.confirmEmailChange = functions.https.onCall(async (data, context) => {
  try {
    const { token, userId } = data;

    if (!token || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();

    // Verify token
    if (userData.emailChangeToken !== token) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or expired token');
    }

    // Check expiration
    if (new Date() > userData.emailChangeExpiresAt.toDate()) {
      throw new functions.https.HttpsError('invalid-argument', 'Token has expired');
    }

    const newEmail = userData.emailChangeNewEmail;

    // Update Firebase Auth email using Admin SDK
    await admin.auth().updateUser(userId, {
      email: newEmail,
      emailVerified: true
    });

    // Update Firestore
    await db.collection('users').doc(userId).update({
      email: newEmail,
      emailChangeToken: null,
      emailChangeNewEmail: null,
      emailChangeExpiresAt: null,
      pendingEmail: null,
    });

    console.log(`Email changed successfully for user ${userId} to ${newEmail}`);

    return { success: true, message: 'Email changed successfully', newEmail };

  } catch (error) {
    console.error('Error confirming email change:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to change email');
  }
});
