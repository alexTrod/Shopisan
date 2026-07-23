import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { collection, addDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../../../firebaseconfig';
import { getAuth } from 'firebase/auth';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from '../../../Redux/Actions/UserActions';
import { useTranslation } from '../../../utils/useTranslation';

const useStoreRatings = (storeId, visible = true) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const auth = getAuth();
  const user = useSelector(state => state.user.userData);

  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const lastFetchedStoreIdRef = useRef(null);

  const fetchStoreRatings = useCallback(async () => {
    if (!storeId) return;

    try {
      let totalRating = 0;
      let count = 0;

      const ratingsRef = collection(firestore, 'ratings');
      const q = query(ratingsRef, where('store_id', '==', storeId));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        totalRating += doc.data().score;
        count += 1;
      });

      setAverageRating(count > 0 ? totalRating / count : 0);
      setRatingCount(count);

      if (auth.currentUser) {
        const userRatingQuery = query(
          ratingsRef,
          where('store_id', '==', storeId),
          where('user_id', '==', auth.currentUser.uid)
        );
        const userRatingSnapshot = await getDocs(userRatingQuery);
        if (!userRatingSnapshot.empty) {
          setUserRating(userRatingSnapshot.docs[0].data().score);
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  }, [storeId, auth.currentUser]);

  const submitRating = useCallback(async (score) => {
    if (!user) {
      Alert.alert(
        t('login_required'),
        t('login_required_favorite_message'),
        [
          { text: t('no'), style: "cancel" },
          {
            text: t('yes'),
            onPress: () => {
              dispatch(signOut());
            }
          },
        ],
        { cancelable: true }
      );
      return;
    }

    try {
      setLoading(true);
      const ratingsRef = collection(firestore, 'ratings');

      const userRatingQuery = query(
        ratingsRef,
        where('store_id', '==', storeId),
        where('user_id', '==', auth.currentUser.uid)
      );
      const userRatingSnapshot = await getDocs(userRatingQuery);

      if (userRatingSnapshot.empty) {
        await addDoc(ratingsRef, {
          store_id: storeId,
          user_profile_id: auth.currentUser.uid,
          score: score,
          created: serverTimestamp(),
          updated: serverTimestamp(),
          comment: null,
          is_active: true,
          is_deleted: false,
        });
      } else {
        const ratingDoc = userRatingSnapshot.docs[0].ref;
        await updateDoc(ratingDoc, {
          score: score,
          updated: serverTimestamp(),
        });
      }

      setUserRating(score);
      await fetchStoreRatings();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert(t('error'), t('error_submitting_rating'));
    } finally {
      setLoading(false);
    }
  }, [storeId, user, auth.currentUser, fetchStoreRatings, dispatch, t]);

  useEffect(() => {
    if (!visible || !storeId) return;
    if (lastFetchedStoreIdRef.current === storeId) return;
    lastFetchedStoreIdRef.current = storeId;
    fetchStoreRatings();
  }, [visible, storeId, fetchStoreRatings]);

  return {
    averageRating,
    ratingCount,
    userRating,
    loading,
    submitRating,
    refreshRatings: fetchStoreRatings,
  };
};

export default useStoreRatings;
