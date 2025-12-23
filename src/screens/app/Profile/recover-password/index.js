import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { useSelector } from 'react-redux';
import ScreenWrapper from '../../../../components/screen-wrapper';
import CustomText from '../../../../components/text';
import { AppColors } from '../../../../utils';
import { width, height } from '../../../../utils/dimension';
import { useTranslation } from '../../../../utils/useTranslation';
import { Ionicons } from '@expo/vector-icons';

export default function RecoverPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const user = useSelector(state => state.user.userData);
  const auth = getAuth();

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const userEmail = user?.email || auth.currentUser?.email;

  useEffect(() => {
    // Auto-send the reset email when screen opens
    if (userEmail && !sent && !loading) {
      handlePasswordReset();
    }
  }, [userEmail]);

  const handlePasswordReset = async () => {
    if (!userEmail) {
      setError(t('no_email_found') || 'No email address found for this account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, userEmail);
      setSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || t('error_sending_reset') || 'An error occurred while sending the reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white}
      statusBarColor={AppColors.white}
      barStyle="dark-content"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={AppColors.black} />
        </TouchableOpacity>
        <CustomText size={2.2} textStyles={styles.headerTitle}>
          {t('reset_password_title') || 'Reset Password'}
        </CustomText>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <CustomText size={1.8} color="#666" textStyles={styles.statusText}>
              {t('sending_reset_email') || 'Sending reset email...'}
            </CustomText>
          </View>
        ) : sent ? (
          <View style={styles.statusContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={60} color={AppColors.primary} />
            </View>
            <CustomText size={2} color={AppColors.black} textStyles={styles.successTitle}>
              {t('email_sent') || 'Email Sent!'}
            </CustomText>
            <CustomText size={1.6} color="#666" textStyles={styles.statusText}>
              {t('recovery_email_sent_to') || 'A recovery email was sent to:'}
            </CustomText>
            <View style={styles.emailCard}>
              <Ionicons name="mail-outline" size={22} color={AppColors.primary} />
              <CustomText size={1.8} color={AppColors.black} textStyles={styles.emailText}>
                {userEmail}
              </CustomText>
            </View>
            <CustomText size={1.4} color="#888" textStyles={styles.instructionText}>
              {t('check_inbox_instruction') || 'Please check your inbox and follow the instructions to reset your password.'}
            </CustomText>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <CustomText size={1.8} color={AppColors.white} textStyles={{ fontWeight: '600' }}>
                {t('done') || 'Done'}
              </CustomText>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View style={styles.statusContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={60} color="#E53935" />
            </View>
            <CustomText size={2} color={AppColors.black} textStyles={styles.successTitle}>
              {t('error') || 'Error'}
            </CustomText>
            <CustomText size={1.5} color="#666" textStyles={styles.statusText}>
              {error}
            </CustomText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handlePasswordReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={AppColors.white} />
              <CustomText size={1.8} color={AppColors.white} textStyles={{ fontWeight: '600', marginLeft: 8 }}>
                {t('try_again') || 'Try Again'}
              </CustomText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width(4),
    paddingVertical: height(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: width(6),
    paddingTop: height(6),
  },
  statusContainer: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: height(2),
  },
  errorIcon: {
    marginBottom: height(2),
  },
  successTitle: {
    fontWeight: '600',
    marginBottom: height(1),
  },
  statusText: {
    textAlign: 'center',
    marginTop: height(1),
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    paddingVertical: height(1.5),
    paddingHorizontal: width(4),
    borderRadius: 12,
    marginTop: height(2),
    marginBottom: height(2),
  },
  emailText: {
    fontWeight: '600',
    marginLeft: width(2),
  },
  instructionText: {
    textAlign: 'center',
    lineHeight: 22,
    marginTop: height(1),
  },
  doneButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: height(1.8),
    paddingHorizontal: width(12),
    borderRadius: 12,
    marginTop: height(4),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: height(1.8),
    paddingHorizontal: width(8),
    borderRadius: 12,
    marginTop: height(4),
  },
});
