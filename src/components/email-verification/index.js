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
        'Please wait',
        'You can request a new verification email in 1 minute.',
        [{ text: 'OK' }]
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
      
      Alert.alert(
        'Verification Email Sent',
        'A new verification email has been sent to your inbox.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to send verification email. Please try again.',
        [{ text: 'OK' }]
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
      Alert.alert(
        'Error',
        'Failed to check verification status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (emailVerificationStatus) {
      case 'pending':
        return 'Please check your email and click the verification link to activate your account.';
      case 'expired':
        return 'Your verification link has expired. Please request a new one.';
      default:
        return 'Please verify your email address to continue.';
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
      return 'Send New Verification Email';
    }
    return canResendVerification ? 'Resend Verification Email' : 'Please wait...';
  };

  return (
    <View style={{
      backgroundColor: AppColors.white,
      padding: height(2.5),
      marginHorizontal: width(4),
      marginVertical: height(1),
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
        textStyles={{ fontFamily: 'Mulish-Bold' }}
        size={1.8}
        textAlign="center"
      >
        Email Verification Required
      </CustomText>
      
      <CustomText
        color={AppColors.textSecondary || '#666666'}
        textStyles={{ 
          fontFamily: 'Mulish-Regular',
          marginTop: height(1),
          textAlign: 'center'
        }}
        size={1.4}
      >
        {getStatusMessage()}
      </CustomText>

      <Button
        onPress={handleResendVerification}
        disabled={!canResendVerification || loading}
        loading={loading}
        textStyle={{
          fontFamily: 'Mulish-Bold',
          color: AppColors.white
        }}
        containerStyle={{
          backgroundColor: AppColors.primary || '#007AFF',
          marginTop: height(1.5),
          paddingVertical: height(1.2),
          paddingHorizontal: width(3),
          borderRadius: width(1),
        }}
      >
        {getButtonText()}
      </Button>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: height(1),
        gap: width(2),
      }}>
        <Button
          onPress={handleRefreshVerification}
          disabled={loading}
          loading={loading}
          textStyle={{
            fontFamily: 'Mulish-Regular',
            color: AppColors.textSecondary || '#666666'
          }}
          containerStyle={{
            backgroundColor: 'transparent',
            paddingVertical: height(0.8),
            paddingHorizontal: width(2.5),
            borderRadius: width(1),
            borderWidth: 1,
            borderColor: AppColors.lightGray || '#E5E5E5',
          }}
        >
          Refresh Status
        </Button>
      </View>

      {lastVerificationSent && (
        <CustomText
          color={AppColors.textSecondary || '#999999'}
          textStyles={{
            fontFamily: 'Mulish-Regular',
            marginTop: height(1),
            textAlign: 'center',
            fontSize: 12,
          }}
        >
          Last sent: {new Date(lastVerificationSent).toLocaleString()}
        </CustomText>
      )}
    </View>
  );
};

export default EmailVerificationBanner;
