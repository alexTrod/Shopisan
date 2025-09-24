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

// Simplified Email templates (minimal styling, less text, no colors)
const verificationEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Email</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 24px; }
    .button { display: inline-block; padding: 10px 18px; border: 1px solid #000; border-radius: 4px; text-decoration: none; color: #000; }
    .footer { margin-top: 24px; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify your email</h2>
    <p>Hello {{username}},</p>
    <p>Please verify your email to activate your account.</p>
    <p>
      <a href="{{verificationUrl}}" class="button">Verify Email</a>
    </p>
    <p>If the button doesn't work, copy this link:</p>
    <p>{{verificationUrl}}</p>
    <div class="footer">
      <p>Shopisan</p>
    </div>
  </div>
</body>
</html>
`;

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

// Function to send verification email
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email, username, token, userType } = data;
    
    if (!email || !username || !token || !userType) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Create verification URL - using Firebase Hosting
    const verificationUrl = `https://shopisan-bad76.web.app/verify-email?token=${token}`;
    
    // Compile email template
    const template = handlebars.compile(verificationEmailTemplate);
    const htmlContent = template({
      username,
      userType,
      verificationUrl,
      email
    });

    // Send email using Nodemailer with Gmail
    const mailOptions = {
      from: `"Shopisan" <${SENDER_EMAIL}>`,
      to: email,
      subject: 'Verify your email',
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
    const template = handlebars.compile(verificationEmailTemplate);
    const htmlContent = template({
      username,
      userType,
      verificationUrl,
      email
    });

    const mailOptions = {
      from: `"Shopisan" <${SENDER_EMAIL}>`,
      to: email,
      subject: 'Verify your email',
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
