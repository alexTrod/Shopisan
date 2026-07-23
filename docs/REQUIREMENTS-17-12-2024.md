# Shopisan App Requirements (17.12.2024)

## Part 1: Detailed Explanations

### SPLASH SCREEN
**SP-01: Make "Shopisan" bolder**
- The logo text on the splash screen appears too thin/light. She wants the font weight increased.

---

### SIGN UP (General)
**SU-01: Language inconsistency**
- The app is supposed to be in French, but some UI text appears in English. Specifically: "sign up as a shopper", "sign up as a merchant", "register", "Already have an account", "create an account later", "confirm password is required" - all need French translations.

**SU-02: Sign up redirects out of app**
- When user taps "Sign up" from the home page or map screen, instead of showing a sign-up form within the app, it opens an external browser or kicks them out. The sign-up flow should stay inside the app.

---

### SIGN UP AS USER
**SU-U-01: Stuck on logo after registration**
- User completes registration, receives confirmation email (this works), but then the app just shows the Shopisan logo forever instead of navigating to the next screen (home/profile).

---

### SIGN UP AS MERCHANT
**SU-M-01: Email validation too aggressive**
- As soon as the user starts typing their email, it shows "email invalid" error. Should only validate after they finish typing or tap elsewhere.

**SU-M-02: Duplicate email kicks user out**
- If merchant tries to register with an email already in use, the app shows the error but then exits the registration screen. Should stay on the form so they can correct the email.

**SU-M-03: Stuck on logo after registration**
- Same as user registration - merchant gets stuck on logo screen after completing sign-up.

**SU-M-04: Wrong account type in confirmation email**
- Merchant receives email saying "confirmed as USER" but admin shows them as "STORE". Confusing - email should say "merchant" or "store owner".

**SU-M-05: No store validation process**
- There's no workflow to approve/verify a store after merchant registers. She needs an approval flow before stores go live.

---

### HOME PAGE
**HP-01: Slow loading**
- Shops take too long to appear on the home page. Needs performance optimization.

**HP-02: Language mix**
- Same as SU-01 - English text appearing in French app.

**HP-03: Wrong icon for location**
- The geolocation icon on store cards looks like a book icon. Should be a standard map pin/marker.

---

### MAP
**MAP-01: Wrong highlight color**
- When you select a category in the dropdown, it highlights in light purple. Should be red (brand color).

**MAP-02: Move compass**
- There's a compass/flame icon in a black circle. She wants it moved from bottom-right to a different position (where the black circle currently is).

**MAP-03: "Around me" UX issue**
- When user taps "Around me", they have to manually zoom out to see stores. Not intuitive - maybe auto-zoom or show a hint.

**MAP-04: Missing toast for unavailable cities**
- If user searches for a city not in the app (like "Tours" or "Trouville"), nothing happens. Should show a toast notification saying "This city is not yet available" (like it does for Strasbourg).

---

### ADD A STORE
**AS-01: Category highlight color**
- Same as MAP-01 - selected categories should highlight in red, not purple.

**AS-02: "DONE" not translated**
- In the time schedule picker, the button says "DONE" in English. Should be French ("TERMINE").

**AS-03: Can't resize images**
- When adding store photos, user can't crop or resize them. Needs image editing capability.

**AS-04: Endless loading when adding store**
- Critical bug: when user taps "Add the store" button, it loads forever and never completes. Store creation is broken.

---

### STORES (Data Migration)
**ST-01: Import old store photos**
- Stores from the previous app version lost their profile pictures. Need to migrate them.

**ST-02: Import old posts**
- Same for store posts/content from previous version.

---

### PROFILE
**PR-01: Mystery red notification badge**
- A red badge keeps appearing in bottom-right of profile screen. Unclear what it means or why it's there.

**PR-02: Can't change email**
- The "change email" feature doesn't work.

**PR-03: Password reset email goes to spam**
- Emails from support@shopisan.com land in spam folder. Need to configure email authentication (SPF/DKIM).

**PR-04: Registration email goes to spam**
- Same issue - confirmation emails going to spam.

**PR-05: Rename "Comment" field**
- The field labeled "Comment" should say "Contact Support" instead.

**PR-06: Duplicate "Report a bug" options**
- In contact support, there are two "Report a bug" fields. Should consolidate to: 1) Report a problem/bug, 2) Suggest an idea, 3) General question.

**PR-07: General question email not sending**
- When user submits a general question, app says "email sent" but nothing arrives (not even in spam).

---

### ADMIN
**AD-01: Can't delete users/stores**
- Admin panel has no way to delete user accounts or stores. Needs delete functionality.

---

### GENERAL / CITIES
**GQ-01: Auto-add new cities**
- If someone registers a store in a city not yet in the app, that city should automatically be added and appear on the map/home page.

**GQ-02: Address autocomplete limited**
- When typing an address for a new city (e.g., Draguignan), the autocomplete only suggests streets from cities already in the app. Should use full geocoding API to support any address.

---

### INFRASTRUCTURE
**MI-01/02: App store accounts**
- Need to create Google Play and Apple App Store developer accounts for publishing.

**MI-03: Heroku question**
- Needs clarification on whether Heroku is needed for shopisan.com website.

**MI-04/05: Marketing materials**
- Need mock screenshots and download buttons for marketing.

---

## Part 2: Compact Requirements List

### CRITICAL
- [ ] Fix sign-up flow staying in-app (not redirecting out)
- [ ] Fix stuck on logo after user registration
- [ ] Fix stuck on logo after merchant registration
- [ ] Fix "Add store" endless loading bug

### AUTH & REGISTRATION
- [ ] Translate all auth strings to French
- [ ] Fix email validation (don't validate while typing)
- [ ] Stay on form after duplicate email error
- [ ] Fix confirmation email account type (USER vs STORE)
- [ ] Implement store approval/validation workflow

### MAP & HOME
- [ ] Optimize shop loading speed
- [ ] Change category highlight color to red
- [ ] Replace book icon with location pin
- [ ] Add toast notification for unavailable cities
- [ ] Improve "Around me" zoom UX
- [ ] Move compass icon position

### ADD STORE
- [ ] Translate "DONE" button to French
- [ ] Add image crop/resize functionality
- [ ] Fix category highlight color (red)

### PROFILE & SUPPORT
- [ ] Investigate/fix red notification badge
- [ ] Fix email change functionality
- [ ] Fix email deliverability (SPF/DKIM) - going to spam
- [ ] Fix general question email sending
- [ ] Consolidate contact support options (bug/idea/question)
- [ ] Rename "Comment" to "Contact Support"

### ADMIN
- [ ] Add delete user functionality
- [ ] Add delete store functionality

### DATA & CITIES
- [ ] Migrate store profile pictures from old version
- [ ] Migrate store posts from old version
- [ ] Auto-add cities when new store registered
- [ ] Fix address autocomplete for unknown cities

### INFRASTRUCTURE
- [ ] Create Google Play developer account
- [ ] Create Apple developer account
- [ ] Decide on Heroku for shopisan.com
- [ ] Create marketing materials (screenshots, buttons)
