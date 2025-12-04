import React, { useEffect, useState } from 'react';
import { View, Alert, Linking } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../../components/screen-wrapper';
import { AppColors } from '../../../utils/app-colors';
import CustomText from '../../../components/text';
import Button from '../../../components/button';
import { height, width } from '../../../utils/dimension';
import { verifyEmail, checkVerificationStatus } from '../../../Redux/Actions/UserActions';
import { useTranslation } from '../../../utils/useTranslation';
import { MaterialIcons } from '@expo/vector-icons';

const VerifyEmailScreen = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  
  const { token } = route.params || {};
  const { userData, emailVerificationStatus } = useSelector(state => state.user);

  useEffect(() => {
    if (token && userData) {
      handleVerification();
    }
  }, [token, userData]);

  useEffect(() => {
    // Check verification status when component mounts
    if (userData) {
      dispatch(checkVerificationStatus());
    }
  }, [userData]);

  const handleVerification = async () => {
    if (!token) {
      setVerificationResult('error');
      return;
    }

    setLoading(true);
    try {
      await dispatch(verifyEmail(token));
      setVerificationResult('success');
      
      // Redirect to appropriate screen after successful verification
      setTimeout(() => {
        if (userData?.userType === 'merchant') {
          navigation.replace('MerchantHome');
        } else {
          navigation.replace('Home');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    // This will be handled by the banner component
    navigation.goBack();
  };

  const handleOpenEmail = () => {
    Linking.openURL('mailto:');
  };

  const renderContent = () => {
    if (verificationResult === 'success') {
      return (
        <View style={styles.contentContainer}>
          <MaterialIcons 
            name="check-circle" 
            size={width(20)} 
            color={AppColors.success} 
          />
          <CustomText
            color={AppColors.success}
            textStyles={{ fontFamily: 'Roboto-Medium', marginTop: height(2) }}
            size={2.5}
            textAlign="center"
          >
            Email Verified Successfully!
          </CustomText>
          <CustomText
            color={AppColors.textSecondary}
            textStyles={{ 
              fontFamily: 'Roboto-Regular',
              marginTop: height(1),
              textAlign: 'center',
              marginHorizontal: width(4)
            }}
            size={1.6}
          >
            Your account has been activated. You will be redirected shortly.
          </CustomText>
        </View>
      );
    }

    if (verificationResult === 'error') {
      return (
        <View style={styles.contentContainer}>
          <MaterialIcons 
            name="error" 
            size={width(20)} 
            color={AppColors.error} 
          />
          <CustomText
            color={AppColors.error}
            textStyles={{ fontFamily: 'Roboto-Medium', marginTop: height(2) }}
            size={2.5}
            textAlign="center"
          >
            Verification Failed
          </CustomText>
          <CustomText
            color={AppColors.textSecondary}
            textStyles={{ 
              fontFamily: 'Roboto-Regular',
              marginTop: height(1),
              textAlign: 'center',
              marginHorizontal: width(4)
            }}
            size={1.6}
          >
            The verification link is invalid or has expired. Please request a new one.
          </CustomText>
          
          <View style={styles.buttonContainer}>
            <Button
              onPress={handleResendEmail}
              textStyle={{
                fontFamily: 'Roboto-Medium',
                color: AppColors.white
              }}
              containerStyle={styles.primaryButton}
            >
              Request New Verification Email
            </Button>
          </View>
        </View>
      );
    }

    // Default loading state
    return (
      <View style={styles.contentContainer}>
        <MaterialIcons 
          name="email" 
          size={width(20)} 
          color={AppColors.primary} 
        />
        <CustomText
          color={AppColors.primary}
          textStyles={{ fontFamily: 'Roboto-Medium', marginTop: height(2) }}
          size={2.5}
          textAlign="center"
        >
          Verifying Your Email
        </CustomText>
        <CustomText
          color={AppColors.textSecondary}
          textStyles={{ 
            fontFamily: 'Roboto-Regular',
            marginTop: height(1),
            textAlign: 'center',
            marginHorizontal: width(4)
          }}
          size={1.6}
        >
          Please wait while we verify your email address...
        </CustomText>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <CustomText
              color={AppColors.textSecondary}
              textStyles={{ 
                fontFamily: 'Roboto-Regular',
                marginTop: height(2),
                textAlign: 'center'
              }}
              size={1.4}
            >
              Verifying...
            </CustomText>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white}
      statusBarColor={AppColors.white}
      barStyle="dark-content"
    >
      <View style={styles.container}>
        {renderContent()}
        
        <View style={styles.bottomContainer}>
          <CustomText
            color={AppColors.textSecondary}
            textStyles={{ 
              fontFamily: 'Roboto-Regular',
              textAlign: 'center',
              marginBottom: height(2)
            }}
            size={1.4}
          >
            Having trouble? Check your email or contact support.
          </CustomText>
          
          <Button
            onPress={handleOpenEmail}
            textStyle={{
              fontFamily: 'Roboto-Regular',
              color: AppColors.primary
            }}
            containerStyle={styles.secondaryButton}
          >
            Open Email App
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width(4),
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonContainer: {
    marginTop: height(3),
    width: '100%',
  },
  primaryButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: height(1.5),
    borderRadius: width(2),
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AppColors.primary,
    paddingVertical: height(1.5),
    borderRadius: width(2),
    width: '100%',
  },
  bottomContainer: {
    width: '100%',
    marginBottom: height(4),
  },
  loadingContainer: {
    marginTop: height(2),
  },
};

export default VerifyEmailScreen;
