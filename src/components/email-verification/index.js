import React, { useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import CustomText from '../text';
import Button from '../button';
import { AppColors } from '../../utils';
import { height, width } from '../../utils/dimension';
import { resendVerificationEmail, checkVerificationStatus } from '../../Redux/Actions/UserActions';
import { useTranslation } from '../../utils/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../../firebaseconfig';

const DISMISS_STORAGE_KEY = '@email_verification_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days - will show again after this

const EmailVerificationBanner = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const locale = useSelector(state => state.locale?.currentLocale) || 'en';

  const {
    emailVerificationStatus,
    canResendVerification,
    lastVerificationSent,
    userData
  } = useSelector(state => state.user);

  // Check if banner was dismissed recently
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const dismissedTime = await AsyncStorage.getItem(DISMISS_STORAGE_KEY);
        if (dismissedTime) {
          const elapsed = Date.now() - parseInt(dismissedTime);
          if (elapsed < DISMISS_DURATION) {
            setIsDismissed(true);
          } else {
            // Clear expired dismissal
            await AsyncStorage.removeItem(DISMISS_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error checking dismiss status:', error);
      }
    };
    checkDismissed();
  }, []);

  useEffect(() => {
    if (userData) {
      dispatch(checkVerificationStatus());
    }
  }, [userData]);

  // Handle dismiss - saves to AsyncStorage for 24 hours
  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
      setIsDismissed(true);
    } catch (error) {
      console.error('Error saving dismiss status:', error);
      setIsDismissed(true); // Still dismiss locally even if storage fails
    }
  };

  // Check Firebase Auth's emailVerified status as a fallback
  const firebaseUser = auth.currentUser;
  const isFirebaseVerified = firebaseUser?.emailVerified === true;

  // Don't show banner if:
  // 1. User's email is verified in Firebase Auth
  // 2. User's Firestore status is 'verified'
  // 3. User is_active is true (indicates verified)
  const isVerified = isFirebaseVerified ||
                     emailVerificationStatus === 'verified' ||
                     userData?.is_active === true;

  // Don't show banner until we explicitly know verification is needed
  const needsVerification = !isVerified &&
                           (emailVerificationStatus === 'pending' || emailVerificationStatus === 'expired');

  if (!userData || !needsVerification || isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    if (!canResendVerification) {
      Alert.alert(
        t('warning'),
        t('login_required_add_favorite_message') || 'You can request a new verification email in 1 minute.',
        [{ text: t('ok') }]
      );
      return;
    }

    setLoading(true);
    try {
      await dispatch(resendVerificationEmail(
        userData.email,
        userData.username,
        userData.userType,
        locale
      ));
      
      Alert.alert(t('success'), t('email_verification_instruction'), [{ text: t('ok') }]);
    } catch (error) {
      Alert.alert(
        t('error'),
        t('error_fetching_media') || 'Failed to send verification email. Please try again.',
        [{ text: t('ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshVerification = async () => {
    setLoading(true);
    try {
      // Reload the Firebase Auth user to get the latest emailVerified status
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      await dispatch(checkVerificationStatus());

      // Check if now verified after refresh
      const refreshedUser = auth.currentUser;
      if (refreshedUser?.emailVerified || userData?.is_active) {
        Alert.alert(
          t('success') || 'Success',
          'Your email has been verified!',
          [{ text: t('ok') }]
        );
        // Force re-render by dismissing
        setIsDismissed(true);
      }
    } catch (error) {
      Alert.alert(t('error'), t('error_fetching_media') || 'Failed to check verification status. Please try again.', [{ text: t('ok') }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (emailVerificationStatus) {
      case 'pending':
        return t('email_verification_instruction');
      case 'expired':
        return t('email_verification_instruction');
      default:
        return t('email_verification_instruction');
    }
  };

  const getStatusColor = () => {
    switch (emailVerificationStatus) {
      case 'pending':
        return AppColors.warning;
      case 'expired':
        return AppColors.error;
      default:
        return AppColors.warning;
    }
  };

  const getButtonText = () => {
    if (emailVerificationStatus === 'expired') {
      return t('resend_verification_email_button');
    }
    return canResendVerification ? t('resend_verification_email_button') : t('loading');
  };

  return (
    <View style={{
      backgroundColor: AppColors.white,
      padding: height(1.5),
      marginHorizontal: width(4),
      marginVertical: height(0.5),
      borderRadius: width(1.5),
      borderWidth: 1,
      borderColor: AppColors.lightGray || '#E5E5E5',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      position: 'relative',
    }}>
      {/* Dismiss button */}
      <TouchableOpacity
        onPress={handleDismiss}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: 4,
          zIndex: 1,
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={AppColors.textSecondary || '#666666'} />
      </TouchableOpacity>

      <CustomText
        color={AppColors.text || '#333333'}
        textStyles={{ fontFamily: 'Roboto-Medium', paddingRight: width(6) }}
        size={2.0}
        textAlign="center"
      >
        {t('email_verification_required_title')}
      </CustomText>
      
      <CustomText
        color={AppColors.textSecondary || '#666666'}
        textStyles={{ 
          fontFamily: 'Roboto-Regular',
          marginTop: height(0.5),
          textAlign: 'center'
        }}
        size={1.6}
      >
        {getStatusMessage()}
      </CustomText>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: height(1),
        gap: width(2),
      }}>
        <Button
          onPress={handleResendVerification}
          disabled={!canResendVerification || loading}
          loading={loading}
          textStyle={{
            fontFamily: 'Roboto-Medium',
            color: AppColors.white,
            fontSize: height(1.7)
          }}
          containerStyle={{
            backgroundColor: AppColors.primary || '#007AFF',
            paddingVertical: height(0.8),
            paddingHorizontal: width(2),
            borderRadius: width(0.8),
            flex: 1,
          }}
        >
          {getButtonText()}
        </Button>

        <Button
          onPress={handleRefreshVerification}
          disabled={loading}
          loading={loading}
          textStyle={{
            fontFamily: 'Roboto-Regular',
            color: AppColors.textSecondary || '#666666',
            fontSize: height(1.7)
          }}
          containerStyle={{
            backgroundColor: 'transparent',
            paddingVertical: height(0.8),
            paddingHorizontal: width(2),
            borderRadius: width(0.8),
            borderWidth: 1,
            borderColor: AppColors.lightGray || '#E5E5E5',
            flex: 0.6,
          }}
        >
          {t('refresh_button')}
        </Button>
      </View>

      {lastVerificationSent && (
        <CustomText
          color={AppColors.textSecondary || '#999999'}
          textStyles={{
            fontFamily: 'Roboto-Regular',
            marginTop: height(0.8),
            textAlign: 'center',
            fontSize: 12,
          }}
        >
          {t('last_sent_at')}: {new Date(lastVerificationSent).toLocaleString()}
        </CustomText>
      )}
    </View>
  );
};

export default EmailVerificationBanner;
