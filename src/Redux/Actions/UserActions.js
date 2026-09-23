import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { firestore, auth } from "../../../firebaseconfig";
import logging, { logError } from "../../utils/logging";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { pbkdf2 } from "@react-native-module/pbkdf2";
import { Alert } from "react-native";
import {
  selectIsAuthenticated,
  selectUserData,
} from "../Selectors/UserSelectors";
import {
  USER_TYPES,
  MERCHANT_STATUS,
  normalizeUserType,
} from "../../utils/userTypes";
import { buildStoreAddress } from "../../utils/storeAddress";
import { ensureCityExists } from "../../utils/cityManagement";

// Flag to prevent race condition during signup - when Firebase Auth creates a user,
// onAuthStateChanged fires before the Firestore document is created
let isSigningUp = false;

export const checkAuthStatus = () => async (dispatch) => {
  try {
    dispatch({ type: "AUTH_LOADING" });

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Skip fetching user data if we're in the middle of signing up
        // The signUp action will dispatch AUTH_SUCCESS with the user data
        if (isSigningUp) {
          logging(user.uid, "skipping fetch - signup in progress");
          return;
        }
        logging(user.uid, "trying to fetch user data");
        try {
          await fetchUserData(user.uid)(dispatch);
        } catch (error) {
          // Silently handle deleted users on app startup - they'll see login screen
          logging("Auto-login failed, user will see login screen");
        }
      } else {
        dispatch({ type: "AUTH_FAILURE", payload: "Not logged in" });
      }
    });
  } catch (error) {
    logError("Auth status check failed", error);
    dispatch({ type: "AUTH_FAILURE", payload: error.message });
  }
};

export const setNoAuthenticationWanted = (intention) => async (dispatch) => {
  if (intention) {
    dispatch({ type: "SET_NO_AUTHENTICATION_WANTED" });
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
    logging("start to sign in");
    logging(email, "email");
    logging(password, "password");

    await fetchUserDataByLoginIdentifier(email, password)(dispatch);
  } catch (error) {
    logError("Sign in failed", error);

    const errorMessage = getSignInErrorMessage(error);

    dispatch({ type: "SIGN_IN_ERROR", payload: errorMessage });
    throw error;
  }
};

export const signOut = () => async (dispatch) => {
  try {
    await firebaseSignOut(auth);
    dispatch({ type: "AUTH_LOGOUT" });
  } catch (error) {
    logError("Sign out failed", error);
    dispatch({ type: "AUTH_FAILURE", payload: error.message });
  }
};

export const deleteAccount = (userId, email) => async (dispatch) => {
  try {
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const functions = getFunctions();

    const deleteUserFn = httpsCallable(functions, "deleteUser");
    await deleteUserFn({ userId, email });

    // Sign out locally after successful deletion
    await firebaseSignOut(auth);
    dispatch({ type: "AUTH_LOGOUT" });

    return { success: true };
  } catch (error) {
    logError("Delete account failed", error);
    throw error;
  }
};

export const toggleFavoriteStore = (storeId) => async (dispatch, getState) => {
  try {
    const state = getState();
    const isAuthenticated = selectIsAuthenticated(state);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      logging("No Firebase auth user");
      return;
    }

    const userDocRef = doc(firestore, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      let favoriteStores = Array.isArray(userData.favoriteStores)
        ? userData.favoriteStores
        : [];

      let updatedFavorites;
      if (favoriteStores.includes(storeId)) {
        updatedFavorites = favoriteStores.filter((id) => id !== storeId);
        dispatch({ type: "REMOVE_FAVORITE_STORE", payload: storeId });
      } else {
        updatedFavorites = [...favoriteStores, storeId];
        dispatch({ type: "ADD_FAVORITE_STORE", payload: storeId });
      }

      await updateDoc(userDocRef, { favoriteStores: updatedFavorites });

      dispatch({ type: "SET_FAVORITE_STORES", payload: updatedFavorites });
    }
  } catch (error) {
    logError("Toggle favorite store failed", error);
    Alert.alert("Error", "Failed to update favorites");
  }
};

export const signUp =
  (email, username, password, userType, language = "en") =>
  async (dispatch) => {
    try {
      // Note: We don't dispatch AUTH_LOADING here because the signup screen manages its own loading state
      // Dispatching AUTH_LOADING would show the splash screen and unmount the signup form
      dispatch({ type: "SIGN_UP_ERROR", payload: null }); // Clear any previous error
      isSigningUp = true; // Prevent onAuthStateChanged from fetching user data

      const safeEmail = email.trim().toLowerCase();

      const cred = await createUserWithEmailAndPassword(
        auth,
        safeEmail,
        password,
      );
      const new_id = cred.user.uid;

      // Generate verification token and expiration
      const verificationToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const verificationExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ); // 7 days from now

      const normalizedType = normalizeUserType(userType);

      const userCollection = collection(firestore, "users");
      await setDoc(doc(userCollection, new_id), {
        userType: normalizedType,
        // Raw selection at signup, kept for funnel analytics only. Never used
        // for permissions, and frozen by firestore.rules like userType.
        signupIntent: normalizedType,
        id: new_id,
        email: safeEmail,
        username,
        language, // Store user's language preference
        date_of_birth: null,
        is_validated: false, // Email not verified yet
        is_active: true, // Account is active (not archived)
        is_admin: false,
        // Signup cannot be submitted without ticking the legal checkbox.
        termsAcceptedAt: serverTimestamp(),
        last_login: serverTimestamp(),
        created: serverTimestamp(),
        surname: null,
        name: null,
        picture_id: null,
        reset_password_token: null,
        reset_password_validity: null,
        user_id: new_id,
        // New validation fields
        emailVerificationStatus: "pending",
        verificationToken: verificationToken,
        verificationExpiresAt: verificationExpiresAt,
        lastVerificationSent: serverTimestamp(),
      });

      // Send verification email
      try {
        await sendVerificationEmail(
          safeEmail,
          username,
          verificationToken,
          normalizedType,
          language,
        );

        // Send admin notification
        await sendAdminNotification(safeEmail, username, normalizedType);

        dispatch({
          type: "SET_EMAIL_VERIFICATION_STATUS",
          payload: {
            status: "pending",
            token: verificationToken,
            expiresAt: verificationExpiresAt,
          },
        });
      } catch (e) {
        console.warn(
          "[signUp] sendVerificationEmail failed:",
          e?.code || e?.message || e,
        );
      }

      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          id: new_id,
          email: safeEmail,
          username,
          userType: normalizedType,
          signupIntent: normalizedType,
          is_validated: false, // Email not verified yet
          is_active: true, // Account is active
          is_admin: false,
          name: null,
          surname: null,
          picture_id: null,
          reset_password_token: null,
          reset_password_validity: null,
          user_id: new_id,
          emailVerificationStatus: "pending",
          verificationToken: verificationToken,
          verificationExpiresAt: verificationExpiresAt,
        },
      });

      isSigningUp = false; // Reset flag after successful signup
    } catch (error) {
      isSigningUp = false; // Reset flag on error too
      logError("Shopper signup failed", error);

      let message = "An error occurred during sign up.";
      if (error.code === "auth/email-already-in-use") {
        message = "The email address is already in use.";
      } else if (error.code === "auth/invalid-email") {
        message = "The email address is not valid.";
      } else if (error.code === "auth/operation-not-allowed") {
        message = "Email/password accounts are not enabled.";
      } else if (error.code === "auth/weak-password") {
        message = "The password is too weak.";
      }

      dispatch({ type: "SIGN_UP_ERROR", payload: message });
      throw error;
    }
  };

// New email verification actions
export const resendVerificationEmail =
  (email, username, userType, language = "en") =>
  async (dispatch) => {
    try {
      const verificationToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const verificationExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      );

      // Update user document with new token
      const userRef = doc(firestore, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        verificationToken: verificationToken,
        verificationExpiresAt: verificationExpiresAt,
        lastVerificationSent: serverTimestamp(),
      });

      // Send new verification email
      await sendVerificationEmail(
        email,
        username,
        verificationToken,
        normalizeUserType(userType),
        language,
      );

      dispatch({
        type: "SET_EMAIL_VERIFICATION_STATUS",
        payload: {
          status: "pending",
          token: verificationToken,
          expiresAt: verificationExpiresAt,
        },
      });

      dispatch({
        type: "SET_VERIFICATION_RESEND_STATUS",
        payload: {
          canResend: false,
          lastSent: new Date(),
        },
      });

      // Re-enable resend after 1 minute
      setTimeout(() => {
        dispatch({
          type: "SET_VERIFICATION_RESEND_STATUS",
          payload: {
            canResend: true,
            lastSent: new Date(),
          },
        });
      }, 0);
    } catch (error) {
      logError("Resend verification email failed", error);
      throw error;
    }
  };

export const verifyEmail = (token) => async (dispatch) => {
  try {
    const userRef = doc(firestore, "users", auth.currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();

    if (userData.verificationToken !== token) {
      throw new Error("Invalid verification token");
    }

    if (new Date() > userData.verificationExpiresAt.toDate()) {
      throw new Error("Verification token has expired");
    }

    // Mark email as verified
    await updateDoc(userRef, {
      emailVerificationStatus: "verified",
      is_validated: true,
      verificationToken: null,
      verificationExpiresAt: null,
    });

    dispatch({
      type: "UPDATE_VERIFICATION_STATUS",
      payload: "verified",
    });

    // Update user data in state
    dispatch({
      type: "AUTH_SUCCESS",
      payload: {
        ...userData,
        emailVerificationStatus: "verified",
        is_validated: true,
        verificationToken: null,
        verificationExpiresAt: null,
      },
    });
  } catch (error) {
    logError("Email verification failed", error);
    throw error;
  }
};

export const checkVerificationStatus = () => async (dispatch) => {
  try {
    if (!auth.currentUser) return;

    const userRef = doc(firestore, "users", auth.currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const now = new Date();

    // Check if verification has expired
    if (
      userData.verificationExpiresAt &&
      now > userData.verificationExpiresAt.toDate()
    ) {
      await updateDoc(userRef, {
        emailVerificationStatus: "expired",
        is_validated: false,
      });

      dispatch({
        type: "UPDATE_VERIFICATION_STATUS",
        payload: "expired",
      });
    } else {
      dispatch({
        type: "SET_EMAIL_VERIFICATION_STATUS",
        payload: {
          status: userData.emailVerificationStatus || "pending",
          token: userData.verificationToken,
          expiresAt: userData.verificationExpiresAt,
        },
      });
    }

    // Check if user can resend verification
    if (userData.lastVerificationSent) {
      const lastSent = userData.lastVerificationSent.toDate();
      const canResend = now - lastSent > 60000; // 1 minute cooldown

      dispatch({
        type: "SET_VERIFICATION_RESEND_STATUS",
        payload: {
          canResend,
          lastSent: lastSent,
        },
      });
    }
  } catch (error) {
    logError("Check verification status failed", error);
  }
};

const verifyPassword = async (password, userData) => {
  logging(password, "password");
  logging(userData.password, "userData.password");
  const key = pbkdf2(
    password,
    new TextEncoder().encode(userData.salt),
    260000,
    256,
    "sha256",
  );
  const hashedPassword = Array.from(new Uint8Array(key))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashedPassword === userData.password;
};

const fetchUserData = (uid) => async (dispatch) => {
  logging("start to fetch user data", uid);
  try {
    const userDocRef = doc(firestore, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // User document was deleted - sign out and go to login
      logging("User document not found, signing out");
      await firebaseSignOut(auth);
      // AUTH_LOGOUT is the action the reducer implements; it clears
      // isAuthenticated so a gated screen (pending approval) is left too.
      dispatch({ type: "AUTH_LOGOUT" });
      throw new Error("Account not found");
    }

    const userData = userDoc.data();

    // Sync Firebase Auth email with Firestore if they differ
    // This handles the case when user verified a new email via verifyBeforeUpdateEmail
    const currentAuthEmail = auth.currentUser?.email;
    if (
      currentAuthEmail &&
      userData.email &&
      currentAuthEmail !== userData.email
    ) {
      logging("Email mismatch detected, syncing Firestore with Auth email");
      logging(
        `Auth email: ${currentAuthEmail}, Firestore email: ${userData.email}`,
      );

      await updateDoc(userDocRef, {
        email: currentAuthEmail,
        pendingEmail: null, // Clear pending email since it's now verified
      });

      // Update userData with the new email
      userData.email = currentAuthEmail;
      userData.pendingEmail = null;
    }

    dispatch({
      type: "AUTH_SUCCESS",
      payload: {
        ...userData,
        // Accounts created before the user/owner migration still hold
        // "shopper"/"merchant"; normalize on read so they behave correctly.
        userType: normalizeUserType(userData.userType),
        ref: uid,
      },
    });

    if (userData.favoriteStores) {
      dispatch({
        type: "SET_FAVORITE_STORES",
        payload: userData.favoriteStores,
      });
    }
  } catch (error) {
    // Don't show error toast for deleted users - this is expected
    if (error.message !== "Account not found") {
      logError("Fetch user data failed", error);
    }
    dispatch({ type: "SIGN_UP_ERROR", payload: error.message });
    throw error; // Re-throw so signin handler can catch it and show Alert
  }
};

/**
 * Re-read the signed-in user's Firestore document (e.g. "Check again" on the
 * pending-approval screen). Resolves true when the data was refreshed, false
 * when nobody is signed in or the read failed; never throws.
 */
export const refreshCurrentUser = () => async (dispatch) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  try {
    await fetchUserData(uid)(dispatch);
    return true;
  } catch (error) {
    logging("refreshCurrentUser failed", error?.message);
    return false;
  }
};

const fetchUserDataByLoginIdentifier =
  (loginIdentifier, password) => async (dispatch) => {
    try {
      let userCredential;
      let userData;
      let userRef;

      logging("start fetching data using loginIdentifier", loginIdentifier);

      if (loginIdentifier.includes("@")) {
        userCredential = await signInWithEmailAndPassword(
          auth,
          loginIdentifier,
          password,
        );
        userRef = userCredential.user.uid;
      } else {
        logging("start to fetch user data by username");
        // firestore.rules only lets a signed-in user read their own document,
        // so this unauthenticated collection scan is always denied. Username
        // login needs a Cloud Function lookup before it can work again.
        const usersRef = collection(firestore, "users");
        const querySnapshot = await getDocs(usersRef);
        const userDoc = querySnapshot.docs.find(
          (doc) => doc.data().username === loginIdentifier,
        );

        if (userDoc) {
          userData = userDoc.data();
          const isPasswordValid = await verifyPassword(password, userData);

          if (isPasswordValid) {
            await auth().currentUser.updatePassword(password);
            userCredential = await auth().signInWithEmailAndPassword(
              userData.email,
              password,
            );
            userRef = userCredential.user.uid;
          } else {
            throw new Error("Invalid password");
          }
        } else {
          throw new Error("User not found");
        }
      }

      await fetchUserData(userRef)(dispatch);
    } catch (error) {
      logError("Fetch user data by login identifier failed", error);
      // Convert technical errors to user-friendly messages
      let userFriendlyMessage = error.message;
      if (error.message === "User not found") {
        userFriendlyMessage =
          "Account not found. Please check your email or create a new account.";
      } else if (error.message === "Invalid password") {
        userFriendlyMessage = "Incorrect password. Please try again.";
      }
      dispatch({ type: "AUTH_FAILURE", payload: userFriendlyMessage });
      throw error;
    }
  };

export const setCountries = (countries) => (dispatch) => {
  dispatch({
    type: "SET_COUNTRIES",
    payload: countries,
  });
};

// Helper functions for sending emails
const sendVerificationEmail = async (
  email,
  username,
  token,
  userType,
  language = "fr",
) => {
  try {
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const functions = getFunctions();

    const sendVerificationEmailFunction = httpsCallable(
      functions,
      "sendVerificationEmail",
    );
    const result = await sendVerificationEmailFunction({
      email,
      username,
      token,
      userType,
      language,
    });

    console.log("Verification email sent successfully:", result.data);
    return result.data;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw error;
  }
};

const sendAdminNotification = async (email, username, userType, details) => {
  try {
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const functions = getFunctions();

    const sendAdminNotificationFunction = httpsCallable(
      functions,
      "sendAdminNotification",
    );
    const result = await sendAdminNotificationFunction({
      email,
      username,
      userType,
      ...(details ? { details } : {}),
    });

    logging("Admin notification sent successfully", result.data);
    return result.data;
  } catch (error) {
    logError("Failed to send admin notification", error);
    throw error;
  }
};

export const setSelectedCountry = (country) => ({
  type: "SET_SELECTED_COUNTRY",
  payload: country,
});

const GEOCODING_API_KEY = "AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA";

const errorWithCode = (code, message) => {
  const error = new Error(message || code);
  error.code = code;
  return error;
};

/**
 * Resolve the wizard's address to coordinates. Falls back to the location
 * the user picked on the map; otherwise throws `address_not_found` (or
 * `network_error` when the geocoder could not be reached). There is
 * deliberately no default city: a pending store with made-up coordinates
 * would surface in the wrong place after approval.
 */
const geocodeStoreAddress = async (store, countryId) => {
  const fullAddress =
    `${store.streetNumber || ""} ${store.street}, ${store.postalCode} ${store.city}, ${countryId}`.trim();
  let networkFailed = false;

  try {
    const geoResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&region=${countryId.toLowerCase()}&key=${GEOCODING_API_KEY}`,
    );
    const geoData = await geoResponse.json();
    if (geoData.status === "OK" && geoData.results?.length > 0) {
      const location = geoData.results[0].geometry.location;
      return {
        latitude: Number(location.lat),
        longitude: Number(location.lng),
      };
    }
  } catch (geoError) {
    networkFailed = true;
    logError("Geocoding failed", geoError);
  }

  const picked = store.selectedLocation;
  if (
    typeof picked?.latitude === "number" &&
    typeof picked?.longitude === "number"
  ) {
    return { latitude: picked.latitude, longitude: picked.longitude };
  }

  throw networkFailed
    ? errorWithCode("network_error", "Geocoding request failed")
    : errorWithCode("address_not_found", "Address not found");
};

/**
 * Merchant pre-approval signup. Creates the Auth user, the users doc
 * (merchantStatus 'pending') and a minimal pending store, then notifies the
 * merchant and the admin. The address is geocoded before anything is
 * created so no account exists until it resolves. Any later failure rolls
 * back store doc, users doc and Auth user, in that order, so
 * onAuthStateChanged never lands a half-registered owner in the app.
 */
export const signUpMerchantWithStore = (data) => async (dispatch) => {
  const { email, username, password, language, store } = data;
  let userCreated = false;
  let userDocCreated = false;
  let storeDocRef = null;
  let userId = null;

  try {
    dispatch({ type: "SIGN_UP_ERROR", payload: null });

    const safeEmail = email.trim().toLowerCase();
    const countryId = store.detectedCountryCode || "FR";

    // Step 1: Resolve the address. No account exists yet if this fails.
    const { latitude, longitude } = await geocodeStoreAddress(store, countryId);

    isSigningUp = true;

    // Step 2: Create the Firebase Auth user. If the email is already taken,
    // try to resume an interrupted signup: sign in and continue only when
    // the account is an owner without a users doc or without a store.
    let cred;
    let resumed = false;
    try {
      cred = await createUserWithEmailAndPassword(auth, safeEmail, password);
      userCreated = true;
    } catch (createError) {
      if (createError.code !== "auth/email-already-in-use") {
        throw createError;
      }
      try {
        cred = await signInWithEmailAndPassword(auth, safeEmail, password);
      } catch (signInError) {
        throw createError;
      }
      resumed = true;
    }
    userId = cred.user.uid;

    const storesRef = collection(firestore, "stores");
    const userDocRef = doc(firestore, "users", userId);
    let existingUser = null;

    if (resumed) {
      const existingSnap = await getDoc(userDocRef);
      if (existingSnap.exists()) {
        existingUser = existingSnap.data();
        const ownedStores = await getDocs(
          query(storesRef, where("owner_id", "==", userId), limit(1)),
        );
        // Admin accounts and owners the admin already reviewed are never
        // resumed: re-running the merchant signup on them would attach a new
        // store to an account that skips (or already failed) review.
        const reviewedStatus =
          existingUser.merchantStatus === MERCHANT_STATUS.APPROVED ||
          existingUser.merchantStatus === MERCHANT_STATUS.REJECTED;
        const isIncompleteOwner =
          normalizeUserType(existingUser.userType) === USER_TYPES.OWNER &&
          ownedStores.empty &&
          existingUser.is_admin !== true &&
          !reviewedStatus;
        if (!isIncompleteOwner) {
          // A complete account: nothing to resume.
          await firebaseSignOut(auth);
          throw errorWithCode(
            "auth/email-already-in-use",
            "The email address is already in use.",
          );
        }
      }
    }

    // Step 3: Verification token (reuse the existing one when resuming)
    let verificationToken = existingUser?.verificationToken || null;
    let verificationExpiresAt = existingUser?.verificationExpiresAt || null;
    if (!verificationToken) {
      verificationToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      verificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const profile = {
      name: store.managerFirstName || null,
      surname: store.managerLastName || null,
      phone: store.phone || "",
      companyNumber: store.companyNumber || "",
    };

    // Step 4: Create the users document
    if (!existingUser) {
      await setDoc(userDocRef, {
        userType: USER_TYPES.OWNER,
        signupIntent: USER_TYPES.OWNER,
        // Server-owned; the admin flips it to approved/rejected.
        merchantStatus: MERCHANT_STATUS.PENDING,
        id: userId,
        email: safeEmail,
        username,
        language,
        date_of_birth: null,
        is_validated: false, // Email not verified yet
        is_active: true, // Account is active (not archived)
        is_admin: false,
        // Signup cannot be submitted without ticking the legal checkbox.
        termsAcceptedAt: serverTimestamp(),
        last_login: serverTimestamp(),
        created: serverTimestamp(),
        ...profile,
        picture_id: null,
        reset_password_token: null,
        reset_password_validity: null,
        user_id: userId,
        emailVerificationStatus: "pending",
        verificationToken: verificationToken,
        verificationExpiresAt: verificationExpiresAt,
        lastVerificationSent: serverTimestamp(),
      });
      userDocCreated = true;
    } else {
      // A resumed owner re-enters review: a legacy doc has no merchantStatus,
      // which the app reads as approved, so without this the new store's
      // owner would never show up in the admin's merchant requests. The rules
      // allow exactly this missing -> 'pending' self-transition.
      await updateDoc(userDocRef, {
        merchantStatus: MERCHANT_STATUS.PENDING,
        ...profile,
        ...(existingUser.verificationToken
          ? {}
          : {
              verificationToken,
              verificationExpiresAt,
              lastVerificationSent: serverTimestamp(),
            }),
      });
    }

    // Step 5: Create the pending store
    const maxIdSnapshot = await getDocs(
      query(storesRef, orderBy("id", "desc"), limit(1)),
    );
    let maxId = 0;
    if (!maxIdSnapshot.empty) {
      maxId = maxIdSnapshot.docs[0].data().id || 0;
    }
    const newStoreId = maxId + 1;

    const storeData = {
      id: newStoreId,
      name: store.name,
      owner_id: userId,
      address: buildStoreAddress({
        street: store.street,
        streetNumber: store.streetNumber,
        city: store.city,
        postalCode: store.postalCode,
        countryId,
        latitude,
        longitude,
      }),
      latitude,
      longitude,
      cityName: store.city,
      // Pre-approval defaults: description, categories, hours and photos are
      // completed in Edit my store once the merchant is approved. Categories
      // are forced empty so a guest's category filter never leaks in here.
      description: { fr: store.description || "" },
      category: [],
      storeStatus: 0,
      website: store.website || "",
      openingHours: {},
      images: [],
      imageUrl: "",
      // Stores are live on creation. is_validated is legacy: it is written only
      // so app builds released before this change, which still filter their
      // store list on it, show new stores too. Distinct from the identically
      // named field on users, which means "email verified".
      is_validated: true,
      // New stores start pending admin review. This is the server-owned
      // moderation field from firestore.rules ('pending' | 'approved');
      // only admins can change it.
      status: "pending",
      created: serverTimestamp(),
      // The wizard asks for one email: the account email is the store email
      email: store.storeEmail || safeEmail,
      phone: store.phone || "",
      managerFirstName: store.managerFirstName || "",
      managerLastName: store.managerLastName || "",
    };

    storeDocRef = await addDoc(storesRef, storeData);

    // Keep the cities collection in sync (non-fatal)
    try {
      await ensureCityExists(
        store.city,
        store.postalCode,
        latitude,
        longitude,
        countryId,
      );
    } catch (cityError) {
      logError("ensureCityExists failed", cityError);
    }

    // Step 6: Emails (request received to the merchant, request to admin)
    try {
      const { getFunctions, httpsCallable } = await import(
        "firebase/functions"
      );
      const functions = getFunctions();

      const sendMerchantVerificationEmailFn = httpsCallable(
        functions,
        "sendMerchantVerificationEmail",
      );
      await sendMerchantVerificationEmailFn({
        email: safeEmail,
        username,
        token: verificationToken,
        storeName: store.name,
        storeCity: store.city,
        language,
      });

      await sendAdminNotification(safeEmail, username, USER_TYPES.OWNER, {
        name: profile.name || "",
        surname: profile.surname || "",
        phone: profile.phone,
        companyNumber: profile.companyNumber,
        storeName: store.name,
        storeCity: store.city,
        storeAddress:
          `${store.street} ${store.streetNumber || ""}, ${store.postalCode} ${store.city} ${countryId}`
            .replace(/\s+,/, ",")
            .trim(),
        website: store.website || "",
      });
    } catch (emailError) {
      logError("[signUpMerchantWithStore] Email sending failed", emailError);
    }

    // Step 7: Dispatch success
    dispatch({
      type: "SET_EMAIL_VERIFICATION_STATUS",
      payload: {
        status: "pending",
        token: verificationToken,
        expiresAt: verificationExpiresAt,
      },
    });

    dispatch({
      type: "AUTH_SUCCESS",
      payload: {
        id: userId,
        email: safeEmail,
        username,
        language,
        userType: USER_TYPES.OWNER,
        signupIntent: USER_TYPES.OWNER,
        // Carried here so App.js gates the merchant on the pending screen
        // right away, not only after the next cold start. Fresh and resumed
        // signups are both pending in Firestore by now.
        merchantStatus: MERCHANT_STATUS.PENDING,
        is_validated: false, // Email not verified yet
        is_active: true, // Account is active
        is_admin: false,
        ...profile,
        picture_id: null,
        reset_password_token: null,
        reset_password_validity: null,
        user_id: userId,
        emailVerificationStatus: "pending",
        verificationToken: verificationToken,
        verificationExpiresAt: verificationExpiresAt,
      },
    });

    isSigningUp = false;
  } catch (error) {
    logError("Merchant signup with store failed", error);

    // Rollback in dependency order: store doc -> users doc -> Auth user.
    if (storeDocRef) {
      try {
        await deleteDoc(storeDocRef);
      } catch (rollbackError) {
        logError("Failed to roll back store doc", rollbackError);
      }
    }
    if (userDocCreated && userId) {
      try {
        await deleteDoc(doc(firestore, "users", userId));
      } catch (rollbackError) {
        logError("Failed to roll back users doc", rollbackError);
      }
    }
    if (userCreated && auth.currentUser) {
      try {
        await auth.currentUser.delete();
      } catch (rollbackError) {
        logError("Failed to roll back Auth user, signing out", rollbackError);
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          logError("Sign out after failed rollback failed", signOutError);
        }
      }
    } else if (userId && auth.currentUser) {
      // Resumed signup that failed again: do not delete an account we did
      // not create, but never leave it signed in half-registered.
      try {
        await firebaseSignOut(auth);
      } catch (signOutError) {
        logError("Sign out after failed resume failed", signOutError);
      }
    }
    // Only now may onAuthStateChanged act again.
    isSigningUp = false;

    let message = "An error occurred during registration.";
    if (error.code === "auth/email-already-in-use") {
      message = "The email address is already in use.";
    } else if (error.code === "auth/invalid-email") {
      message = "The email address is not valid.";
    } else if (error.code === "auth/weak-password") {
      message = "The password is too weak.";
    } else if (error.code === "address_not_found") {
      message = "Unable to find the store address.";
    }

    dispatch({ type: "SIGN_UP_ERROR", payload: message });
    throw error;
  }
};
