import {getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
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
        dispatch({ type: 'AUTH_LOGOUT' });
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
    console.log('intention is true');
  }
};

export const signIn = (email, password) => async (dispatch) => {
  try {
    dispatch({ type: 'AUTH_LOADING' });
    logging('start to sign in');
    logging(email, 'email');
    logging(password, 'password');
    await fetchUserDataByLoginIdentifier(email, password)(dispatch);
  } catch (error) {
    logError('Sign in failed', error);
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
    throw error; 
  }
};

export const signOut = () => async (dispatch) => {
  try {
    signOut(auth);
    dispatch({ type: 'AUTH_LOGOUT' });
  } catch (error) {
    logError('Sign out failed', error);
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
  }
};

export const toggleFavoriteStore = (storeId, storeData) => async (dispatch, getState) => {
  try {
    const state = getState();
    const isAuthenticated = selectIsAuthenticated(state);
    
    if (!isAuthenticated) {
      logging('No authenticated user');
      Alert.alert('Error', 'Please log in to add favorites');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      logging('No Firebase auth user');
      Alert.alert('Error', 'Authentication error');
      return;
    }

    const userDocRef = doc(firestore, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const favoriteStores = userData.favoriteStores || [];

      if (favoriteStores.includes(storeId)) {
        // Remove from favorites
        const updatedFavorites = favoriteStores.filter(id => id !== storeId);
        await updateDoc(userDocRef, { 
          favoriteStores: updatedFavorites 
        });
        dispatch({ type: 'REMOVE_FAVORITE_STORE', payload: storeId });
      } else {
        // Add to favorites
        const updatedFavorites = [...favoriteStores, storeId];
        await updateDoc(userDocRef, { 
          favoriteStores: updatedFavorites 
        });
        dispatch({ 
          type: 'ADD_FAVORITE_STORE', 
          payload: { id: storeId, ...storeData } 
        });
      }
    } else {
      // Create new user document
      await setDoc(userDocRef, { 
        favoriteStores: [storeId],
        updatedAt: serverTimestamp()
      });
      dispatch({ 
        type: 'ADD_FAVORITE_STORE', 
        payload: { id: storeId, ...storeData } 
      });
    }
  } catch (error) {
    logError('Toggle favorite store failed', error);
    Alert.alert('Error', 'Failed to update favorites');
  }
};

export const signUp = (email, username, password, userType) => async (dispatch) => {
  try {
    dispatch({ type: 'AUTH_LOADING' });
    
    const userCollection = collection(firestore, 'users');
    
    await createUserWithEmailAndPassword(auth, email, password).then(
      async (user) => {
        console.log('user is', user);   
        const new_id = user.user.uid;
        logging('new_id', new_id);
        const newUserDoc = doc(userCollection, new_id); 
        // todo:set a new user correctly
        logging(userType,'userType');
        logging(email,'email');
        logging(username,'username');
        logging(serverTimestamp(),'serverTimestamp');
        await setDoc(newUserDoc, {
          userType: userType,
          id: new_id,
          email: email,
          username: username,
          date_of_birth:null,
          is_active:true,
          is_admin:false,
          is_owner : userType == 'shopper' ? false : true,        
          last_login: serverTimestamp(),
          created: serverTimestamp(),
          surname:null,
          name:null,
          //password: password,
          picture_id:null,
          reset_password_token: null,
          reset_password_validity:null,
          user_id:new_id,
        })
        .then((result) => logging('result', result))
        .catch((error) => logging('error setDoc', error))
        ;
      }
    );
  }
  catch (error) {
    logError('Shopper signup failed', error);
    if (error.code === 'auth/email-already-in-use') {
      dispatch({ type: 'AUTH_FAILURE', payload: 'The email address is already in use by another account.' });
    } else if (error.code === 'auth/invalid-email') {
      dispatch({ type: 'AUTH_FAILURE', payload: 'The email address is not valid.' });
    } else if (error.code === 'auth/operation-not-allowed') {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Email/password accounts are not enabled.' });
    } else if (error.code === 'auth/weak-password') {
      dispatch({ type: 'AUTH_FAILURE', payload: 'The password is too weak.' });
    } else {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Signup failed. Please try again.' });
    }
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
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
    
    // Set user data in redux
    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        ...userData,
        ref: uid
      }
    });

    // Set favorite stores if they exist
    if (userData.favoriteStores) {
      dispatch({ 
        type: 'SET_FAVORITE_STORES', 
        payload: userData.favoriteStores 
      });
    }

  } catch (error) {
    logError('Fetch user data failed', error);
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
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

    if (loginIdentifier.includes('@')) { // try with firebase authentication
      userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, password);
      userRef = userCredential.user.uid;
    } else { // try with firestore
      logging('start to fetch user data by username');
      const userDoc = querySnapshot.docs.find(doc => doc.data().username === loginIdentifier);

      if (userDoc) { // user not in firebase auth but username in firestore
        userData = userDoc.data();
        const isPasswordValid = await verifyPassword(password, userData);

        if (isPasswordValid) { // correct password
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
  }
};

export const setCountries = (countries) => ({
  type: 'SET_COUNTRIES',
  payload: countries
});
export const setSelectedCountry = (country) => ({
  type: 'SET_SELECTED_COUNTRY',
  payload: country
});
