import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import CustomText from '../text';
import Button from '../button';
import { AppColors } from '../../utils';
import { height, width } from '../../utils/dimension';
import { resendVerificationEmail, checkVerificationStatus } from '../../Redux/Actions/UserActions';
import { useTranslation } from '../../utils/useTranslation';

const EmailVerificationBanner = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  
  const {
    emailVerificationStatus,
    canResendVerification,
    lastVerificationSent,
    userData
  } = useSelector(state => state.user);

  useEffect(() => {
    if (userData) {
      dispatch(checkVerificationStatus());
    }
  }, [userData]);

  // Don't show banner if user is verified or not authenticated
  if (!userData || emailVerificationStatus === 'verified') {
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
        userData.userType
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
      await dispatch(checkVerificationStatus());
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
    }}>
      <CustomText
        color={AppColors.text || '#333333'}
        textStyles={{ fontFamily: 'Roboto-Medium' }}
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
