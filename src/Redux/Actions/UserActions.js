import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut as firebaseSignOut  } from 'firebase/auth';
import { firestore, auth } from '../../../firebaseconfig';
import logging, { logError } from '../../utils/logging';
import { collection, doc, query, where, getDocs, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { pbkdf2 } from '@react-native-module/pbkdf2';
import { Alert } from 'react-native';
import { selectIsAuthenticated, selectUserData } from '../Selectors/UserSelectors';

// Flag to prevent race condition during signup - when Firebase Auth creates a user,
// onAuthStateChanged fires before the Firestore document is created
let isSigningUp = false;

export const checkAuthStatus = () => async (dispatch) => {
  try {
    dispatch({ type: 'AUTH_LOADING' });

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Skip fetching user data if we're in the middle of signing up
        // The signUp action will dispatch AUTH_SUCCESS with the user data
        if (isSigningUp) {
          logging(user.uid, 'skipping fetch - signup in progress');
          return;
        }
        logging(user.uid,'trying to fetch user data');
        try {
          await fetchUserData(user.uid)(dispatch);
        } catch (error) {
          // Silently handle deleted users on app startup - they'll see login screen
          logging('Auto-login failed, user will see login screen');
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: "Not logged in" });
      }
    });
  } catch (error) {
    logError('Auth status check failed', error);
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
  }
};

export const setNoAuthenticationWanted = (intention) => async (dispatch) => {
  if (intention) {
    dispatch({ type: 'SET_NO_AUTHENTICATION_WANTED' });
  }
};

const getSignInErrorMessage = (error) => {
  if (!error || !error.code) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorMessages = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "The email address is badly formatted.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
  };

  return errorMessages[error.code] || "An error occurred. Please try again.";
};

export const signIn = (email, password) => async (dispatch) => {
  try {
    logging('start to sign in');
    logging(email, 'email');
    logging(password, 'password');
    
    await fetchUserDataByLoginIdentifier(email, password)(dispatch);

  } catch (error) {
    logError('Sign in failed', error);

    const errorMessage = getSignInErrorMessage(error);

    dispatch({ type: 'SIGN_IN_ERROR', payload: errorMessage });
    throw error;
  }
};

export const signOut = () => async (dispatch) => {
  try {
    await firebaseSignOut(auth);
    dispatch({ type: 'AUTH_LOGOUT' });
  } catch (error) {
    logError('Sign out failed', error);
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
  }
};

export const toggleFavoriteStore = (storeId) => async (dispatch, getState) => {
  try {
    const state = getState();
    const isAuthenticated = selectIsAuthenticated(state);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      logging('No Firebase auth user');
      return;
    }

    const userDocRef = doc(firestore, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      let favoriteStores = Array.isArray(userData.favoriteStores) ? userData.favoriteStores : [];

      let updatedFavorites;
      if (favoriteStores.includes(storeId)) {
        updatedFavorites = favoriteStores.filter(id => id !== storeId);
        dispatch({ type: 'REMOVE_FAVORITE_STORE', payload: storeId });
      } else {
        updatedFavorites = [...favoriteStores, storeId];
        dispatch({ type: 'ADD_FAVORITE_STORE', payload: storeId });
      }

      await updateDoc(userDocRef, { favoriteStores: updatedFavorites });

      dispatch({ type: 'SET_FAVORITE_STORES', payload: updatedFavorites });
    }
  } catch (error) {
    logError('Toggle favorite store failed', error);
    Alert.alert('Error', 'Failed to update favorites');
  }
};

export const signUp = (email, username, password, userType, language = 'en') => async (dispatch) => {
  try {
    // Note: We don't dispatch AUTH_LOADING here because the signup screen manages its own loading state
    // Dispatching AUTH_LOADING would show the splash screen and unmount the signup form
    dispatch({ type: 'SIGN_UP_ERROR', payload: null }); // Clear any previous error
    isSigningUp = true; // Prevent onAuthStateChanged from fetching user data

    const safeEmail = email.trim().toLowerCase();

    const cred = await createUserWithEmailAndPassword(auth, safeEmail, password);
    const new_id = cred.user.uid;

    // Generate verification token and expiration
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const verificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const userCollection = collection(firestore, 'users');
    await setDoc(doc(userCollection, new_id), {
      userType,
      id: new_id,
      email: safeEmail,
      username,
      language, // Store user's language preference
      date_of_birth: null,
      is_validated: false, // Email not verified yet
      is_active: true, // Account is active (not archived)
      is_admin: false,
      is_owner: userType !== 'shopper',
      last_login: serverTimestamp(),
      created: serverTimestamp(),
      surname: null,
      name: null,
      picture_id: null,
      reset_password_token: null,
      reset_password_validity: null,
      user_id: new_id,
      // New validation fields
      emailVerificationStatus: 'pending',
      verificationToken: verificationToken,
      verificationExpiresAt: verificationExpiresAt,
      lastVerificationSent: serverTimestamp(),
    });

    // Send verification email
    try {
      await sendVerificationEmail(safeEmail, username, verificationToken, userType, language);

      // Send admin notification
      await sendAdminNotification(safeEmail, username, userType);
      
      dispatch({
        type: 'SET_EMAIL_VERIFICATION_STATUS',
        payload: {
          status: 'pending',
          token: verificationToken,
          expiresAt: verificationExpiresAt,
        }
      });
    } catch (e) {
      console.warn('[signUp] sendVerificationEmail failed:', e?.code || e?.message || e);
    }

    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        id: new_id,
        email: safeEmail,
        username,
        userType,
        is_validated: false, // Email not verified yet
        is_active: true, // Account is active
        is_admin: false,
        is_owner: userType !== 'shopper',
        name: null,
        surname: null,
        picture_id: null,
        reset_password_token: null,
        reset_password_validity: null,
        user_id: new_id,
        emailVerificationStatus: 'pending',
        verificationToken: verificationToken,
        verificationExpiresAt: verificationExpiresAt,
      }
    });

    isSigningUp = false; // Reset flag after successful signup

  } catch (error) {
    isSigningUp = false; // Reset flag on error too
    logError('Shopper signup failed', error);

    let message = 'An error occurred during sign up.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'The email address is already in use.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'The email address is not valid.';
    } else if (error.code === 'auth/operation-not-allowed') {
      message = 'Email/password accounts are not enabled.';
      
    } else if (error.code === 'auth/weak-password') {
      message = 'The password is too weak.';
    }

    dispatch({ type: 'SIGN_UP_ERROR', payload: message });
    throw error;
  }
};

// New email verification actions
export const resendVerificationEmail = (email, username, userType, language = 'en') => async (dispatch) => {
  try {
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const verificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update user document with new token
    const userRef = doc(firestore, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      verificationToken: verificationToken,
      verificationExpiresAt: verificationExpiresAt,
      lastVerificationSent: serverTimestamp(),
    });

    // Send new verification email
    await sendVerificationEmail(email, username, verificationToken, userType, language);
    
    dispatch({
      type: 'SET_EMAIL_VERIFICATION_STATUS',
      payload: {
        status: 'pending',
        token: verificationToken,
        expiresAt: verificationExpiresAt,
      }
    });

    dispatch({
      type: 'SET_VERIFICATION_RESEND_STATUS',
      payload: {
        canResend: false,
        lastSent: new Date(),
      }
    });

    // Re-enable resend after 1 minute
    setTimeout(() => {
      dispatch({
        type: 'SET_VERIFICATION_RESEND_STATUS',
        payload: {
          canResend: true,
          lastSent: new Date(),
        }
      });
    }, 0);

  } catch (error) {
    logError('Resend verification email failed', error);
    throw error;
  }
};

export const verifyEmail = (token) => async (dispatch) => {
  try {
    const userRef = doc(firestore, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    
    if (userData.verificationToken !== token) {
      throw new Error('Invalid verification token');
    }

    if (new Date() > userData.verificationExpiresAt.toDate()) {
      throw new Error('Verification token has expired');
    }

    // Mark email as verified
    await updateDoc(userRef, {
      emailVerificationStatus: 'verified',
      is_validated: true,
      verificationToken: null,
      verificationExpiresAt: null,
    });

    dispatch({
      type: 'UPDATE_VERIFICATION_STATUS',
      payload: 'verified'
    });

    // Update user data in state
    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        ...userData,
        emailVerificationStatus: 'verified',
        is_validated: true,
        verificationToken: null,
        verificationExpiresAt: null,
      }
    });

  } catch (error) {
    logError('Email verification failed', error);
    throw error;
  }
};

export const checkVerificationStatus = () => async (dispatch) => {
  try {
    if (!auth.currentUser) return;

    const userRef = doc(firestore, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const now = new Date();
    
    // Check if verification has expired
    if (userData.verificationExpiresAt && now > userData.verificationExpiresAt.toDate()) {
      await updateDoc(userRef, {
        emailVerificationStatus: 'expired',
        is_validated: false,
      });
      
      dispatch({
        type: 'UPDATE_VERIFICATION_STATUS',
        payload: 'expired'
      });
    } else {
      dispatch({
        type: 'SET_EMAIL_VERIFICATION_STATUS',
        payload: {
          status: userData.emailVerificationStatus || 'pending',
          token: userData.verificationToken,
          expiresAt: userData.verificationExpiresAt,
        }
      });
    }

    // Check if user can resend verification
    if (userData.lastVerificationSent) {
      const lastSent = userData.lastVerificationSent.toDate();
      const canResend = (now - lastSent) > 60000; // 1 minute cooldown
      
      dispatch({
        type: 'SET_VERIFICATION_RESEND_STATUS',
        payload: {
          canResend,
          lastSent: lastSent,
        }
      });
    }

  } catch (error) {
    logError('Check verification status failed', error);
  }
};

const verifyPassword = async (password, userData) => {
  logging(password, 'password');
  logging(userData.password, 'userData.password');
  const key = pbkdf2(password, new TextEncoder().encode(userData.salt), 260000, 256, 'sha256');
  const hashedPassword = Array.from(new Uint8Array(key))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashedPassword === userData.password;
};

const fetchUserData = (uid) => async (dispatch) => {
  logging('start to fetch user data', uid);
  try {
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // User document was deleted - sign out and go to login
      logging('User document not found, signing out');
      await firebaseSignOut(auth);
      dispatch({ type: 'SIGN_OUT' });
      throw new Error('Account not found');
    }

    const userData = userDoc.data();

    // Sync Firebase Auth email with Firestore if they differ
    // This handles the case when user verified a new email via verifyBeforeUpdateEmail
    const currentAuthEmail = auth.currentUser?.email;
    if (currentAuthEmail && userData.email && currentAuthEmail !== userData.email) {
      logging('Email mismatch detected, syncing Firestore with Auth email');
      logging(`Auth email: ${currentAuthEmail}, Firestore email: ${userData.email}`);

      await updateDoc(userDocRef, {
        email: currentAuthEmail,
        pendingEmail: null, // Clear pending email since it's now verified
      });

      // Update userData with the new email
      userData.email = currentAuthEmail;
      userData.pendingEmail = null;
    }

    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        ...userData,
        ref: uid
      }
    });

    if (userData.favoriteStores) {
      dispatch({ 
        type: 'SET_FAVORITE_STORES', 
        payload: userData.favoriteStores 
      });
    }

  } catch (error) {
    // Don't show error toast for deleted users - this is expected
    if (error.message !== 'Account not found') {
      logError('Fetch user data failed', error);
    }
    dispatch({ type: 'SIGN_UP_ERROR', payload: error.message });
    throw error; // Re-throw so signin handler can catch it and show Alert
  }
};

const fetchUserDataByLoginIdentifier = (loginIdentifier, password) => async (dispatch) => {
  try {
    let userCredential;
    let userData;
    let userRef;

    logging('start fetching data using loginIdentifier', loginIdentifier);
    logging('password', password);
    const usersRef = collection(firestore, 'users');
    const querySnapshot = await getDocs(usersRef);

    if (loginIdentifier.includes('@')) {
      userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, password);
      userRef = userCredential.user.uid;
    } else {
      logging('start to fetch user data by username');
      const userDoc = querySnapshot.docs.find(doc => doc.data().username === loginIdentifier);

      if (userDoc) {
        userData = userDoc.data();
        const isPasswordValid = await verifyPassword(password, userData);

        if (isPasswordValid) {
          await auth().currentUser.updatePassword(password);
          userCredential = await auth().signInWithEmailAndPassword(
            userData.email,
            password
          );
          userRef = userCredential.user.uid;
        } else {
          throw new Error('Invalid password');
        }
      } else {
        throw new Error('User not found');
      }
    }

    await fetchUserData(userRef)(dispatch);

  } catch (error) {
    logError('Fetch user data by login identifier failed', error);
    // Convert technical errors to user-friendly messages
    let userFriendlyMessage = error.message;
    if (error.message === 'User not found') {
      userFriendlyMessage = 'Account not found. Please check your email or create a new account.';
    } else if (error.message === 'Invalid password') {
      userFriendlyMessage = 'Incorrect password. Please try again.';
    }
    dispatch({ type: 'AUTH_FAILURE', payload: userFriendlyMessage });
    throw error;
  }
};

export const setCountries = (countries) => (dispatch) => {
  dispatch({
    type: 'SET_COUNTRIES',
    payload: countries
  });
};

// Helper functions for sending emails
const sendVerificationEmail = async (email, username, token, userType, language = 'fr') => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();

    const sendVerificationEmailFunction = httpsCallable(functions, 'sendVerificationEmail');
    const result = await sendVerificationEmailFunction({
      email,
      username,
      token,
      userType,
      language
    });

    console.log('Verification email sent successfully:', result.data);
    return result.data;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
};

const sendAdminNotification = async (email, username, userType) => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    
    const sendAdminNotificationFunction = httpsCallable(functions, 'sendAdminNotification');
    const result = await sendAdminNotificationFunction({
      email,
      username,
      userType
    });
    
    console.log('Admin notification sent successfully:', result.data);
    return result.data;
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    throw error;
  }
};

export const setSelectedCountry = (country) => ({
  type: 'SET_SELECTED_COUNTRY',
  payload: country
});

// Merchant signup with store creation
export const signUpMerchantWithStore = (data) => async (dispatch) => {
  const { email, username, password, language, store } = data;
  let userCreated = false;
  let userId = null;

  try {
    dispatch({ type: 'SIGN_UP_ERROR', payload: null });
    isSigningUp = true;

    const safeEmail = email.trim().toLowerCase();

    // Step 1: Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, safeEmail, password);
    userId = cred.user.uid;
    userCreated = true;

    // Step 2: Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const verificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Step 3: Create user document in Firestore
    const userCollection = collection(firestore, 'users');
    await setDoc(doc(userCollection, userId), {
      userType: 'merchant',
      id: userId,
      email: safeEmail,
      username,
      language,
      date_of_birth: null,
      is_validated: false, // Email not verified yet
      is_active: true, // Account is active (not archived)
      is_admin: false,
      is_owner: true,
      last_login: serverTimestamp(),
      created: serverTimestamp(),
      surname: null,
      name: null,
      picture_id: null,
      reset_password_token: null,
      reset_password_validity: null,
      user_id: userId,
      emailVerificationStatus: 'pending',
      verificationToken: verificationToken,
      verificationExpiresAt: verificationExpiresAt,
      lastVerificationSent: serverTimestamp(),
    });

    // Step 4: Create store in Firestore
    const { addDoc, getDocs, query: firestoreQuery, orderBy, limit } = await import('firebase/firestore');
    const storesRef = collection(firestore, 'stores');

    // Get next store ID
    const maxIdQuery = firestoreQuery(storesRef, orderBy('id', 'desc'), limit(1));
    const maxIdSnapshot = await getDocs(maxIdQuery);
    let maxId = 0;
    if (!maxIdSnapshot.empty) {
      const topStore = maxIdSnapshot.docs[0].data();
      maxId = topStore.id || 0;
    }
    const newStoreId = maxId + 1;

    // Geocode address
    const fullAddress = `${store.streetNumber || ''} ${store.street}, ${store.postalCode} ${store.city}, France`;
    const apiKey = 'AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA';

    const geoResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
    );
    const geoData = await geoResponse.json();

    let latitude = store.selectedLocation?.latitude || 48.8566;
    let longitude = store.selectedLocation?.longitude || 2.3522;

    if (geoData.status === "OK" && geoData.results.length > 0) {
      const location = geoData.results[0].geometry.location;
      latitude = Number(location.lat);
      longitude = Number(location.lng);
    }

    // Upload image if present
    let imageUrl = "";
    if (store.selectedImage) {
      try {
        const cloudflareAccountId = 'e593403f5f942f93365e9cd0be4065a1';
        const apiToken = 'mPV6icwf2TUu5e3KWXCRT1L8bo7_0hmg9zqGyi4K';
        const fileName = `photo_${Date.now()}.jpg`;

        const formData = new FormData();
        formData.append('file', {
          uri: store.selectedImage.uri,
          name: fileName,
          type: 'image/jpeg'
        });

        const uploadResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v1`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiToken}` },
            body: formData,
          }
        );
        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          imageUrl = uploadData.result.variants[0];
        }
      } catch (imgError) {
        console.warn('Image upload failed, continuing without image:', imgError);
      }
    }

    const storeData = {
      id: newStoreId,
      name: store.name,
      owner_id: userId,
      address: [
        {
          location: {
            address: { street: store.street },
            city: {
              name: store.city,
              postal_code: store.postalCode,
              country_id: "FR",
            },
            geopoint: { latitude, longitude },
          },
        },
      ],
      latitude,
      longitude,
      cityName: store.city,
      description: { fr: store.description },
      category: store.selectedCategories || [],
      storeStatus: 0,
      website: store.website || "",
      openingHours: store.openingHours || {},
      imageUrl: imageUrl,
      is_validated: false,
      email: store.storeEmail || "",
      phone: store.phone || "",
      managerFirstName: store.managerFirstName || "",
      managerLastName: store.managerLastName || "",
    };

    await addDoc(storesRef, storeData);

    // Step 5: Send merchant verification email (with store info)
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();

      const sendMerchantVerificationEmailFn = httpsCallable(functions, 'sendMerchantVerificationEmail');
      await sendMerchantVerificationEmailFn({
        email: safeEmail,
        username,
        token: verificationToken,
        storeName: store.name,
        storeCity: store.city,
        language,
      });

      // Send admin notification
      await sendAdminNotification(safeEmail, username, 'merchant');
    } catch (emailError) {
      console.warn('[signUpMerchantWithStore] Email sending failed:', emailError);
    }

    // Step 6: Dispatch success
    dispatch({
      type: 'SET_EMAIL_VERIFICATION_STATUS',
      payload: {
        status: 'pending',
        token: verificationToken,
        expiresAt: verificationExpiresAt,
      }
    });

    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        id: userId,
        email: safeEmail,
        username,
        userType: 'merchant',
        is_validated: false, // Email not verified yet
        is_active: true, // Account is active
        is_admin: false,
        is_owner: true,
        name: null,
        surname: null,
        picture_id: null,
        reset_password_token: null,
        reset_password_validity: null,
        user_id: userId,
        emailVerificationStatus: 'pending',
        verificationToken: verificationToken,
        verificationExpiresAt: verificationExpiresAt,
      }
    });

    isSigningUp = false;

  } catch (error) {
    isSigningUp = false;
    console.error('Merchant signup with store failed:', error);

    // Rollback: Delete user if created but something else failed
    if (userCreated && userId) {
      try {
        await auth.currentUser?.delete();
        console.log('Rolled back user creation');
      } catch (rollbackError) {
        console.error('Failed to rollback user:', rollbackError);
      }
    }

    let message = 'An error occurred during registration.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'The email address is already in use.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'The email address is not valid.';
    } else if (error.code === 'auth/weak-password') {
      message = 'The password is too weak.';
    }

    dispatch({ type: 'SIGN_UP_ERROR', payload: message });
    throw error;
  }
};
