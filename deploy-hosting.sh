#!/bin/bash

echo "🚀 Deploying Shopisan Email Verification System..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged into Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

echo "✅ Firebase CLI ready"

# Deploy hosting first
echo "📁 Deploying Firebase Hosting..."
firebase deploy --only hosting --project shopisan-bad76
echo "✅ Hosting deployed successfully!"

if [ $? -eq 0 ]; then
    echo "✅ Hosting deployed successfully!"
else
    echo "❌ Hosting deployment failed"
    exit 1
fi

# Deploy functions
echo "⚡ Deploying Firebase Functions..."
firebase deploy --only functions --project shopisan-bad76
echo "✅ Functions deployed successfully!"

if [ $? -eq 0 ]; then
    echo "✅ Functions deployed successfully!"
else
    echo "❌ Functions deployment failed"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📧 Your verification page is now available at:"
echo "   https://shopisan-bad76.web.app/verify-email"
echo ""
echo "🔗 Update your app store links in the verification page:"
echo "   - iOS: https://apps.apple.com/app/shopisan"
echo "   - Android: https://play.google.com/store/apps/details?id=com.shopisan"
echo ""
echo "📱 Test the system:"
echo "   1. Create a new user account"
echo "   2. Check your email for verification link"
echo "   3. Click the link to test verification"
echo "   4. Check admin email for notification"
