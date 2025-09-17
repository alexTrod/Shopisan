import {getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut as firebaseSignOut  } from 'firebase/auth';
import { firestore } from '../../../firebaseconfig';
import logging, { logError } from '../../utils/logging';
import { collection, doc, query, where, getDocs, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { pbkdf2 } from '@react-native-module/pbkdf2';
import { Alert } from 'react-native';
import { selectIsAuthenticated, selectUserData } from '../Selectors/UserSelectors';

const auth = getAuth();

export const checkAuthStatus = () => async (dispatch) => {
  try {
    dispatch({ type: 'AUTH_LOADING' });
    
    onAuthStateChanged(auth, (user) => {
      if (user) {
        logging(user.uid,'trying to fetch user data');
        fetchUserData(user.uid)(dispatch);
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
    const auth = getAuth();
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

export const signUp = (email, username, password, userType) => async (dispatch) => {
  try {
    dispatch({ type: 'AUTH_LOADING' });

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
      date_of_birth: null,
      is_active: false, // Changed to false until email verification
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
      await sendVerificationEmail(safeEmail, username, verificationToken, userType);
      
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
        is_active: false, // Changed to false
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

  } catch (error) {
    logError('Shopper signup failed', error);

    let message = 'An error occurred during sign up.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'The email address is already in use by another account.';
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
export const resendVerificationEmail = (email, username, userType) => async (dispatch) => {
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
    await sendVerificationEmail(email, username, verificationToken, userType);
    
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
      is_active: true,
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
        is_active: true,
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
        is_active: false,
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
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    
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
    logError('Fetch user data failed', error);
    dispatch({ type: 'SIGN_UP_ERROR', payload: error.message });
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
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
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
const sendVerificationEmail = async (email, username, token, userType) => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    
    const sendVerificationEmailFunction = httpsCallable(functions, 'sendVerificationEmail');
    const result = await sendVerificationEmailFunction({
      email,
      username,
      token,
      userType
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
