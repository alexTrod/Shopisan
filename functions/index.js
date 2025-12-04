const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

admin.initializeApp();

// Gmail configuration with Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'alex.n.feldman@gmail.com',
    pass: 'vvas iqzc htor hmli' // NOT your regular password!
  }
});

const ADMIN_EMAIL = functions.config().admin?.email || 'alexandra.fd1000@gmail.com';
const SENDER_EMAIL = functions.config().email?.sender || 'alex.n.feldman@gmail.com';

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
    .button { display: inline-block; padding: 12px 24px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #007BFF; text-decoration: none; }
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
      <p>On t'enverra un petit message dès que tes commerces préférés arrivent sur l'appli.</p>
      <p>En attendant, n'hésite pas à en parler autour de toi et à ajouter tes commerces préférés sur Shopisan.</p>
      <p>À très vite,<br>L'équipe Shopisan</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Site internet</a>
        <a href="{{instagramUrl}}">Instagram</a>
        <a href="{{verificationUrl}}" class="button">Accéder à l'application</a>
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
    .button { display: inline-block; padding: 12px 24px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #007BFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to the Shopisan adventure 🚀</h2>
    </div>
    <div class="content">
      <p>Hello {{username}},</p>
      <p>Thank you for your registration! You are now part of the Shopisan community that helps local businesses gain visibility.</p>
      <p>We'll send you a message as soon as your favorite stores arrive on the app.</p>
      <p>In the meantime, feel free to talk about it around you and add your favorite stores on Shopisan.</p>
      <p>See you soon,<br>The Shopisan team</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Website</a>
        <a href="{{instagramUrl}}">Instagram</a>
        <a href="{{verificationUrl}}" class="button">Access the app</a>
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
    .button { display: inline-block; padding: 12px 24px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #007BFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Bienvenue sur Shopisan 🚀</h2>
    </div>
    <div class="content">
      <p>Bonjour {{storeName}},</p>
      <p>Merci pour votre inscription sur Shopisan !</p>
      <p>Nous sommes ravis de vous accueillir dans la communauté qui met en avant les commerces de proximité.</p>
      <p>Votre demande a bien été enregistrée et sera validée sous peu par notre équipe.</p>
      <p>Dès que votre inscription sera confirmée, vous pourrez configurer votre compte et commencer à présenter votre boutique aux utilisateurs de l'application.</p>
      <p>On vous tient au courant très vite par e-mail.</p>
      <p>À bientôt,<br>L'équipe Shopisan</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Site internet</a>
        <a href="{{instagramUrl}}">Instagram</a>
        <a href="{{verificationUrl}}" class="button">Accéder à l'application</a>
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
    .button { display: inline-block; padding: 12px 24px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #007BFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to Shopisan 🚀</h2>
    </div>
    <div class="content">
      <p>Hello {{storeName}},</p>
      <p>Thank you for your registration on Shopisan!</p>
      <p>We are delighted to welcome you to the community that highlights local businesses.</p>
      <p>Your request has been registered and will be validated shortly by our team.</p>
      <p>As soon as your registration is confirmed, you will be able to configure your account and start presenting your store to application users.</p>
      <p>We'll keep you updated very soon by email.</p>
      <p>See you soon,<br>The Shopisan team</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Website</a>
        <a href="{{instagramUrl}}">Instagram</a>
        <a href="{{verificationUrl}}" class="button">Access the app</a>
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
    subject: "Félicitations ! Votre boutique est maintenant validée 🎉",
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
    .button { display: inline-block; padding: 12px 24px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #007BFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Félicitations ! Votre boutique est maintenant validée 🎉</h2>
    </div>
    <div class="content">
      <p>Bonjour {{storeName}},</p>
      <p>Excellente nouvelle ! Votre boutique "{{storeName}}" a été validée par notre équipe et est maintenant visible sur l'application Shopisan.</p>
      <p>Vous pouvez dès maintenant :</p>
      <ul>
        <li>Gérer votre profil de boutique</li>
        <li>Mettre à jour vos informations</li>
        <li>Voir les statistiques de votre boutique</li>
        <li>Recevoir les avis de vos clients</li>
      </ul>
      <p>Merci de faire partie de la communauté Shopisan !</p>
      <p>À bientôt,<br>L'équipe Shopisan</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Site internet</a>
        <a href="{{instagramUrl}}">Instagram</a>
        <a href="{{appUrl}}" class="button">Gérer ma boutique</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  },
  en: {
    subject: "Congratulations! Your store is now validated 🎉",
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
    .button { display: inline-block; padding: 12px 24px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #007BFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Congratulations! Your store is now validated 🎉</h2>
    </div>
    <div class="content">
      <p>Hello {{storeName}},</p>
      <p>Great news! Your store "{{storeName}}" has been validated by our team and is now visible on the Shopisan app.</p>
      <p>You can now:</p>
      <ul>
        <li>Manage your store profile</li>
        <li>Update your information</li>
        <li>View your store statistics</li>
        <li>Receive customer reviews</li>
      </ul>
      <p>Thank you for being part of the Shopisan community!</p>
      <p>See you soon,<br>The Shopisan team</p>
    </div>
    <div class="footer">
      <div class="social-links">
        <a href="{{appUrl}}">Website</a>
        <a href="{{instagramUrl}}">Instagram</a>
        <a href="{{appUrl}}" class="button">Manage my store</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }
};

// Function to send verification email
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email, username, token, userType, language = 'fr', storeName } = data;
    
    if (!email || !username || !token || !userType) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Create verification URL - using Firebase Hosting
    const verificationUrl = `https://shopisan-bad76.web.app/verify-email?token=${token}`;
    
    // Select template based on user type and language
    let emailTemplate, subject;
    const lang = language === 'en' ? 'en' : 'fr'; // Default to French
    
    if (userType === 'merchant') {
      emailTemplate = merchantEmailTemplate[lang];
      subject = emailTemplate.subject;
    } else {
      emailTemplate = shopperEmailTemplate[lang];
      subject = emailTemplate.subject;
    }
    
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
      is_active: true,
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
        is_active: false
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
    const { email, username, userType } = data;
    
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
    let emailTemplate, subject;
    const lang = language === 'en' ? 'en' : 'fr'; // Default to French
    
    if (userType === 'merchant') {
      emailTemplate = merchantEmailTemplate[lang];
      subject = emailTemplate.subject;
    } else {
      emailTemplate = shopperEmailTemplate[lang];
      subject = emailTemplate.subject;
    }
    
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

    // Send feedback email to info@shopisan.com
    const mailOptions = {
      from: `"Shopisan App" <${SENDER_EMAIL}>`,
      to: 'info@shopisan.com',
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

    // Check if store was just validated (is_validated changed from false to true)
    if (before.is_validated === false && after.is_validated === true) {
      try {
        console.log(`Store ${storeId} has been validated, sending confirmation email`);

        // Get store owner information
        const storeEmail = after.storeEmail || after.email;
        const storeName = after.name;
        const merchantId = after.merchantId;

        if (!storeEmail) {
          console.error('No email found for store:', storeId);
          return null;
        }

        // Determine language preference (default to French)
        const language = after.language || 'fr';
        const lang = language === 'en' ? 'en' : 'fr';

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
