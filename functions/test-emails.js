/**
 * Email Template Tester
 *
 * Usage: node test-emails.js <template-name> <your-email>
 *
 * Available templates:
 *   - shopper-welcome-fr
 *   - shopper-welcome-en
 *   - merchant-welcome-fr
 *   - merchant-welcome-en
 *   - merchant-verification-fr
 *   - merchant-verification-en
 *   - store-validated-fr
 *   - store-validated-en
 *   - store-rejected-fr
 *   - store-rejected-en
 *   - store-creation-admin-fr
 *   - store-creation-admin-en
 *   - admin-notification-fr
 *   - admin-notification-en
 *   - email-change-fr
 *   - email-change-en
 *   - password-reset-fr
 *   - password-reset-en
 *   - all (sends all templates)
 *
 * Example: node test-emails.js store-validated-fr your@email.com
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

// SMTP configuration (same as in index.js)
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@shopisan.com',
    pass: 'xW4MFyjIMCA0eo'
  }
});

const SENDER_EMAIL = 'info@shopisan.com';

// Sample data for templates
const sampleData = {
  username: 'Jean Dupont',
  storeName: 'Boulangerie du Coin',
  storeCity: 'Paris',
  email: 'test@example.com',
  oldEmail: 'old@example.com',
  newEmail: 'new@example.com',
  userType: 'merchant',
  city: 'Paris',
  categories: 'Boulangerie, Patisserie',
  registrationDate: new Date().toLocaleDateString('fr-FR'),
  appUrl: 'https://shopisan-bad76.web.app',
  verificationUrl: 'https://shopisan-bad76.web.app/verify-email?token=test123',
  resetUrl: 'https://shopisan-bad76.web.app/reset-password?token=test123',
  instagramUrl: 'https://instagram.com/shopisanapp',
  appStoreUrl: 'https://apps.apple.com/app/shopisan'
};

// Professional email template wrapper
const professionalTemplate = (content, lang = 'fr') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f4f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f4f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(107, 45, 92, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6B2D5C 0%, #8B4876 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Shopisan</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">${lang === 'fr' ? 'Votre marketplace locale' : 'Your local marketplace'}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f4f9; padding: 30px 40px; border-radius: 0 0 16px 16px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <a href="{{appUrl}}" style="color: #6B2D5C; text-decoration: none; margin: 0 12px; font-size: 14px;">${lang === 'fr' ? 'Site internet' : 'Website'}</a>
                    <span style="color: #ccc;">|</span>
                    <a href="{{instagramUrl}}" style="color: #6B2D5C; text-decoration: none; margin: 0 12px; font-size: 14px;">Instagram</a>
                    <span style="color: #ccc;">|</span>
                    <a href="{{appStoreUrl}}" style="color: #6B2D5C; text-decoration: none; margin: 0 12px; font-size: 14px;">App Store</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color: #aaa; font-size: 12px; margin: 0;">&copy; 2026 Shopisan. ${lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// CTA Button helper
const ctaButton = (url, text) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #6B2D5C 0%, #8B4876 100%); color: #ffffff; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(107, 45, 92, 0.3);">${text}</a>
    </td>
  </tr>
</table>
`;

// Warning box helper
const warningBox = (text) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
  <tr>
    <td style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px;">
      <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">${text}</p>
    </td>
  </tr>
</table>
`;

// Info box helper (purple theme)
const infoBox = (content) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f9 0%, #f0ebf3 100%); border-radius: 12px; border-left: 4px solid #6B2D5C; margin: 24px 0;">
  <tr>
    <td style="padding: 24px;">
      ${content}
    </td>
  </tr>
</table>
`;

// Templates with professional design
const templates = {
  'shopper-welcome-fr': {
    subject: "Bienvenue dans l'aventure Shopisan",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Bienvenue dans l'aventure Shopisan !</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bonjour {{username}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Merci pour ton inscription ! Tu fais maintenant partie de la communauté Shopisan qui aide les commerces de proximité à gagner en visibilité.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">On t'enverra un petit message dès que tes commerces préférés arrivent sur l'appli. En attendant, n'hésite pas à en parler autour de toi et à ajouter tes commerces préférés sur Shopisan.</p>
      ${ctaButton('{{appUrl}}', 'Découvrir Shopisan')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">À très vite,<br><strong style="color: #6B2D5C;">L'équipe Shopisan</strong></p>
    `, 'fr')
  },
  'shopper-welcome-en': {
    subject: "Welcome to the Shopisan adventure",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Welcome to the Shopisan adventure!</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello {{username}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Thank you for signing up! You are now part of the Shopisan community that helps local businesses gain visibility.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">We'll send you a message as soon as your favorite shops arrive on the app. In the meantime, feel free to spread the word and add your favorite shops on Shopisan.</p>
      ${ctaButton('{{appUrl}}', 'Discover Shopisan')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">See you soon,<br><strong style="color: #6B2D5C;">The Shopisan Team</strong></p>
    `, 'en')
  },
  'merchant-welcome-fr': {
    subject: "Bienvenue sur Shopisan",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Bienvenue sur Shopisan !</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bonjour {{storeName}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Merci pour votre inscription sur Shopisan ! Nous sommes ravis de vous accueillir dans la communauté qui met en avant les commerces de proximité.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Votre demande a bien été enregistrée et sera validée sous peu par notre équipe. Dès que votre inscription sera confirmée, vous pourrez configurer votre compte et commencer à présenter votre boutique aux utilisateurs de l'application.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">En attendant, cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
      ${ctaButton('{{verificationUrl}}', 'Vérifier mon email')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">À bientôt,<br><strong style="color: #6B2D5C;">L'équipe Shopisan</strong></p>
    `, 'fr')
  },
  'merchant-welcome-en': {
    subject: "Welcome to Shopisan",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Welcome to Shopisan!</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello {{storeName}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Thank you for registering on Shopisan! We are delighted to welcome you to the community that highlights local businesses.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Your request has been successfully received and will be validated shortly by our team. As soon as your registration is confirmed, you will be able to set up your account and start presenting your shop to the app's users.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">In the meantime, click the button below to verify your email address:</p>
      ${ctaButton('{{verificationUrl}}', 'Verify my email')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">See you soon,<br><strong style="color: #6B2D5C;">The Shopisan Team</strong></p>
    `, 'en')
  },
  'merchant-verification-fr': {
    subject: "Shopisan - Vérification de votre compte",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Bienvenue sur Shopisan !</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bonjour {{username}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Merci pour votre inscription en tant que commerçant sur Shopisan. Nous sommes ravis de vous accueillir dans notre communauté de commerces locaux !</p>
      ${infoBox(`
        <h3 style="color: #6B2D5C; margin: 0 0 16px; font-size: 18px; font-weight: 600;">Votre boutique enregistrée</h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #888; font-size: 13px;">Nom :</span>
              <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{storeName}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #888; font-size: 13px;">Ville :</span>
              <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{storeCity}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0 0;">
              <span style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">En attente de validation</span>
            </td>
          </tr>
        </table>
      `)}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Votre boutique sera examinée par notre équipe et validée sous peu. Vous recevrez un email de confirmation dès que votre boutique sera en ligne.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">En attendant, cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
      ${ctaButton('{{verificationUrl}}', 'Vérifier mon email')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">À bientôt,<br><strong style="color: #6B2D5C;">L'équipe Shopisan</strong></p>
    `, 'fr')
  },
  'merchant-verification-en': {
    subject: "Shopisan - Complete your registration",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Welcome to Shopisan!</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello {{username}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Thank you for registering as a merchant on Shopisan. We're thrilled to welcome you to our community of local shops!</p>
      ${infoBox(`
        <h3 style="color: #6B2D5C; margin: 0 0 16px; font-size: 18px; font-weight: 600;">Your registered store</h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #888; font-size: 13px;">Name:</span>
              <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{storeName}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #888; font-size: 13px;">City:</span>
              <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{storeCity}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0 0;">
              <span style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">Pending validation</span>
            </td>
          </tr>
        </table>
      `)}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Your store will be reviewed by our team and validated shortly. You will receive a confirmation email as soon as your store is live.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">In the meantime, click the button below to verify your email address:</p>
      ${ctaButton('{{verificationUrl}}', 'Verify my email')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">See you soon,<br><strong style="color: #6B2D5C;">The Shopisan Team</strong></p>
    `, 'en')
  },
  'store-validated-fr': {
    subject: "Votre boutique Shopisan est validée",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Félicitations ! Votre boutique est validée</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bonjour {{storeName}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Votre inscription sur Shopisan a été validée.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Votre boutique rejoint dès aujourd'hui la communauté qui met en avant les commerces de proximité. Il ne vous reste plus qu'à configurer votre compte pour présenter vos produits et accueillir vos premiers clients via l'application.</p>
      ${ctaButton('{{appUrl}}', 'Accéder à mon compte')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bienvenue sur Shopisan. Nous sommes ravis de vous avoir parmi nous.</p>
      <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">Notre équipe est à votre disposition à <a href="mailto:info@shopisan.com" style="color: #6B2D5C;">info@shopisan.com</a></p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 16px 0 0;">À bientôt,<br><strong style="color: #6B2D5C;">L'équipe Shopisan</strong></p>
    `, 'fr')
  },
  'store-validated-en': {
    subject: "Your Shopisan store has been validated",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Congratulations! Your store is validated</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello {{storeName}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Your registration on Shopisan has been validated.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Your store is joining today the community that highlights local businesses. All that's left is for you to configure your account to present your products and welcome your first customers through the app.</p>
      ${ctaButton('{{appUrl}}', 'Access my account')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Welcome to Shopisan. We are delighted to have you with us.</p>
      <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">Our team is at your disposal at <a href="mailto:info@shopisan.com" style="color: #6B2D5C;">info@shopisan.com</a></p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 16px 0 0;">See you soon,<br><strong style="color: #6B2D5C;">The Shopisan Team</strong></p>
    `, 'en')
  },
  'store-rejected-fr': {
    subject: "Demande d'inscription boutique – Non validée",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Demande non validée</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bonjour,</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Nous vous informons qu'une demande d'inscription de votre commerce a été effectuée sur l'application Shopisan.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Après vérification, cette demande n'a pas pu être validée à ce stade.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
          <td style="background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%); border-left: 4px solid #e74c3c; padding: 20px; border-radius: 8px;">
            <p style="color: #c0392b; font-size: 14px; font-weight: 600; margin: 0 0 12px;">Raisons possibles :</p>
            <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Informations incomplètes ou incorrectes</li>
              <li>Activité ne correspondant pas aux critères de la plateforme</li>
              <li>Justificatifs manquants ou non conformes</li>
            </ul>
          </td>
        </tr>
      </table>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Aucune action n'est requise de votre part si vous ne souhaitez pas donner suite à cette inscription.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Si cette demande ne provient pas de vous ou si vous estimez qu'il s'agit d'une erreur, elle sera automatiquement annulée.</p>
      ${ctaButton('mailto:support@shopisan.com', 'Nous contacter')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">Nous vous remercions de votre compréhension.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">Cordialement,<br><strong style="color: #6B2D5C;">L'équipe Shopisan</strong></p>
    `, 'fr')
  },
  'store-rejected-en': {
    subject: "Shop Registration Request – Not Approved",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Request Not Approved</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello,</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">We would like to inform you that a registration request for your shop has been submitted on the Shopisan application.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">After review, this request could not be approved at this stage.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
          <td style="background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%); border-left: 4px solid #e74c3c; padding: 20px; border-radius: 8px;">
            <p style="color: #c0392b; font-size: 14px; font-weight: 600; margin: 0 0 12px;">Possible reasons:</p>
            <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Incomplete or incorrect information</li>
              <li>Activity not meeting the platform's eligibility criteria</li>
              <li>Missing or non-compliant supporting documents</li>
            </ul>
          </td>
        </tr>
      </table>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">No action is required on your part if you do not wish to proceed with this registration.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">If this request was not made by you or if you believe it was submitted in error, it will be automatically cancelled.</p>
      ${ctaButton('mailto:support@shopisan.com', 'Contact Us')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">Thank you for your understanding.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">Kind regards,<br><strong style="color: #6B2D5C;">The Shopisan Team</strong></p>
    `, 'en')
  },
  'store-creation-admin-fr': {
    subject: "Nouvelle inscription boutique : {{storeName}}",
    html: professionalTemplate(`
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <span style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">Nouvelle boutique en attente</span>
          </td>
        </tr>
      </table>
      <h2 style="color: #6B2D5C; margin: 0 0 24px; font-size: 22px; font-weight: 600; text-align: center;">{{storeName}}</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f9 0%, #f0ebf3 100%); border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Ville</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{city}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{email}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Catégories</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{categories}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0;">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Date d'inscription</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{registrationDate}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center; margin: 0;">Veuillez valider cette boutique dans le tableau de bord admin.</p>
    `, 'fr')
  },
  'store-creation-admin-en': {
    subject: "New Store Registration: {{storeName}}",
    html: professionalTemplate(`
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <span style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">New Store Pending</span>
          </td>
        </tr>
      </table>
      <h2 style="color: #6B2D5C; margin: 0 0 24px; font-size: 22px; font-weight: 600; text-align: center;">{{storeName}}</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f9 0%, #f0ebf3 100%); border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">City</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{city}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{email}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Categories</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{categories}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0;">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Registration Date</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{registrationDate}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center; margin: 0;">Please validate this store in the admin dashboard.</p>
    `, 'en')
  },
  'admin-notification-fr': {
    subject: "Nouvelle inscription {{userType}}",
    html: professionalTemplate(`
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <span style="display: inline-block; background: linear-gradient(135deg, #6B2D5C 0%, #8B4876 100%); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">Nouvel utilisateur</span>
          </td>
        </tr>
      </table>
      <h2 style="color: #6B2D5C; margin: 0 0 24px; font-size: 22px; font-weight: 600; text-align: center;">{{username}}</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f9 0%, #f0ebf3 100%); border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{email}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Type</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{userType}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0;">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Date</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{registrationDate}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `, 'fr')
  },
  'admin-notification-en': {
    subject: "New {{userType}} registration",
    html: professionalTemplate(`
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <span style="display: inline-block; background: linear-gradient(135deg, #6B2D5C 0%, #8B4876 100%); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">New User</span>
          </td>
        </tr>
      </table>
      <h2 style="color: #6B2D5C; margin: 0 0 24px; font-size: 22px; font-weight: 600; text-align: center;">{{username}}</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f9 0%, #f0ebf3 100%); border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{email}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Type</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{userType}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0;">
                  <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Date</span>
                  <p style="color: #333; font-size: 16px; font-weight: 500; margin: 4px 0 0;">{{registrationDate}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `, 'en')
  },
  'email-change-fr': {
    subject: "Confirmez votre nouvelle adresse email - Shopisan",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Confirmez votre nouvelle adresse email</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bonjour {{username}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Vous avez demandé à changer votre adresse email associée à votre compte Shopisan.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f9 0%, #f0ebf3 100%); border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px;">Ancienne adresse :</span>
                  <p style="color: #999; font-size: 16px; font-weight: 500; margin: 4px 0 0; text-decoration: line-through;">{{oldEmail}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0;">
                  <span style="color: #888; font-size: 13px;">Nouvelle adresse :</span>
                  <p style="color: #6B2D5C; font-size: 16px; font-weight: 600; margin: 4px 0 0;">{{newEmail}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Cliquez sur le bouton ci-dessous pour confirmer ce changement :</p>
      ${ctaButton('{{verificationUrl}}', 'Confirmer le changement')}
      ${warningBox('<strong>Important :</strong> Ce lien expire dans 24 heures. Si vous n\'avez pas demandé ce changement, ignorez cet email.')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">Cordialement,<br><strong style="color: #6B2D5C;">L'équipe Shopisan</strong></p>
    `, 'fr')
  },
  'email-change-en': {
    subject: "Confirm your new email address - Shopisan",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Confirm your new email address</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello {{username}},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">You have requested to change the email address associated with your Shopisan account.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f9 0%, #f0ebf3 100%); border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid rgba(107, 45, 92, 0.1);">
                  <span style="color: #888; font-size: 13px;">Current email:</span>
                  <p style="color: #999; font-size: 16px; font-weight: 500; margin: 4px 0 0; text-decoration: line-through;">{{oldEmail}}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0;">
                  <span style="color: #888; font-size: 13px;">New email:</span>
                  <p style="color: #6B2D5C; font-size: 16px; font-weight: 600; margin: 4px 0 0;">{{newEmail}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Click the button below to confirm this change:</p>
      ${ctaButton('{{verificationUrl}}', 'Confirm Change')}
      ${warningBox('<strong>Important:</strong> This link expires in 24 hours. If you didn\'t request this change, please ignore this email.')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">Kind regards,<br><strong style="color: #6B2D5C;">The Shopisan Team</strong></p>
    `, 'en')
  },
  'password-reset-fr': {
    subject: "Réinitialisation de votre mot de passe - Shopisan",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Réinitialisation de mot de passe</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Bonjour,</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Vous avez demandé à réinitialiser votre mot de passe pour votre compte Shopisan. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
      ${ctaButton('{{resetUrl}}', 'Réinitialiser mon mot de passe')}
      ${warningBox('<strong>Important :</strong> Ce lien expire dans 1 heure. Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">Cordialement,<br><strong style="color: #6B2D5C;">L'équipe Shopisan</strong></p>
    `, 'fr')
  },
  'password-reset-en': {
    subject: "Reset your password - Shopisan",
    html: professionalTemplate(`
      <h2 style="color: #6B2D5C; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Password Reset</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello,</p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">You requested to reset your password for your Shopisan account. Click the button below to create a new password:</p>
      ${ctaButton('{{resetUrl}}', 'Reset my password')}
      ${warningBox('<strong>Important:</strong> This link expires in 1 hour. If you didn\'t request this reset, please ignore this email.')}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">Kind regards,<br><strong style="color: #6B2D5C;">The Shopisan Team</strong></p>
    `, 'en')
  }
};

async function sendTestEmail(templateName, recipientEmail) {
  const template = templates[templateName];
  if (!template) {
    console.error(`Template "${templateName}" not found.`);
    console.log('\nAvailable templates:');
    Object.keys(templates).forEach(t => console.log(`  - ${t}`));
    return;
  }

  // Compile template with sample data
  const compiledHtml = handlebars.compile(template.html)(sampleData);
  const compiledSubject = handlebars.compile(template.subject)(sampleData);

  const mailOptions = {
    from: `"Shopisan Test" <${SENDER_EMAIL}>`,
    to: recipientEmail,
    subject: `[TEST] ${compiledSubject}`,
    html: compiledHtml
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully!`);
    console.log(`  Template: ${templateName}`);
    console.log(`  To: ${recipientEmail}`);
    console.log(`  Subject: ${mailOptions.subject}`);
    console.log(`  Message ID: ${result.messageId}`);
  } catch (error) {
    console.error(`Failed to send email:`, error.message);
  }
}

async function sendAllTestEmails(recipientEmail) {
  console.log(`Sending all ${Object.keys(templates).length} templates to ${recipientEmail}...\n`);

  for (const templateName of Object.keys(templates)) {
    await sendTestEmail(templateName, recipientEmail);
    console.log('---');
    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\nAll emails sent!');
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node test-emails.js <template-name> <your-email>');
  console.log('\nAvailable templates:');
  Object.keys(templates).forEach(t => console.log(`  - ${t}`));
  console.log('  - all (sends all templates)');
  console.log('\nExample: node test-emails.js store-validated-fr your@email.com');
  process.exit(1);
}

const [templateName, recipientEmail] = args;

if (templateName === 'all') {
  sendAllTestEmails(recipientEmail).then(() => process.exit(0));
} else {
  sendTestEmail(templateName, recipientEmail).then(() => process.exit(0));
}
