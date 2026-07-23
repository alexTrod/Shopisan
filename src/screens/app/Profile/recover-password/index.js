import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../../../firebaseconfig';
import { getAuth } from 'firebase/auth';
import { useSelector } from 'react-redux';
import ScreenWrapper from '../../../../components/screen-wrapper';
import CustomText from '../../../../components/text';
import { AppColors } from '../../../../utils';
import { width, height } from '../../../../utils/dimension';
import { useTranslation } from '../../../../utils/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import ChevronLeft from '../../../../../assets/icons/chevron-left';

export default function RecoverPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const user = useSelector(state => state.user.userData);
  const auth = getAuth();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = send code, 2 = enter code
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const userEmail = user?.email || auth.currentUser?.email;

  useEffect(() => {
    // Auto-send the reset email when screen opens
    if (userEmail && !sent && !loading && step === 1) {
      handleSendResetCode();
    }
  }, [userEmail]);

  const handleSendResetCode = async () => {
    if (!userEmail) {
      setError(t('no_email_found') || 'No email address found for this account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sendCustomPasswordReset = httpsCallable(functions, 'sendCustomPasswordReset');
      await sendCustomPasswordReset({
        email: userEmail,
        language: t('locale') || 'fr'
      });
      setSent(true);
      setStep(2);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || t('error_sending_reset') || 'An error occurred while sending the reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode.trim() || resetCode.trim().length !== 6) {
      setError(t('enter_6_digit_code') || 'Please enter the 6-digit code');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError(t('password_min_6') || 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwords_not_match') || 'Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resetPasswordWithCode = httpsCallable(functions, 'resetPasswordWithCode');
      await resetPasswordWithCode({
        email: userEmail,
        code: resetCode.trim(),
        newPassword: newPassword
      });

      setStep(3); // Success state
    } catch (err) {
      console.error('Password reset error:', err);
      let errorMessage = err.message || t('failed_reset_password') || 'Failed to reset password';

      if (err.code === 'functions/invalid-argument') {
        errorMessage = t('invalid_code') || 'Invalid code. Please try again.';
      } else if (err.code === 'functions/failed-precondition') {
        errorMessage = t('code_expired') || 'Code has expired. Please request a new one.';
      } else if (err.code === 'functions/permission-denied') {
        errorMessage = t('too_many_attempts') || 'Too many attempts. Please request a new code.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const sendCustomPasswordReset = httpsCallable(functions, 'sendCustomPasswordReset');
      await sendCustomPasswordReset({
        email: userEmail,
        language: t('locale') || 'fr'
      });
      setError(null);
      setResetCode('');
    } catch (err) {
      setError(err.message || 'Failed to resend code');
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
          <ChevronLeft width={28} height={28} color={AppColors.black} />
        </TouchableOpacity>
        <CustomText size={2.2} textStyles={styles.headerTitle}>
          {t('reset_password_title') || 'Reset Password'}
        </CustomText>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
        {loading && step === 1 ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <CustomText size={1.8} color="#666" textStyles={styles.statusText}>
              {t('sending_reset_email') || 'Sending reset code...'}
            </CustomText>
          </View>
        ) : step === 2 ? (
          <View style={styles.statusContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="mail" size={50} color={AppColors.primary} />
            </View>
            <CustomText size={2} color={AppColors.black} textStyles={styles.successTitle}>
              {t('code_sent') || 'Code Sent!'}
            </CustomText>
            <CustomText size={1.5} color="#666" textStyles={styles.statusText}>
              {t('enter_code_sent_to') || 'Enter the 6-digit code sent to:'}
            </CustomText>
            <View style={styles.emailCard}>
              <Ionicons name="mail-outline" size={22} color={AppColors.primary} />
              <CustomText size={1.7} color={AppColors.black} textStyles={styles.emailText}>
                {userEmail}
              </CustomText>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <CustomText size={1.4} color="#E53935">{error}</CustomText>
              </View>
            )}

            {/* Reset Code Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="keypad-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor="#999"
                value={resetCode}
                onChangeText={(text) => setResetCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* New Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('new_password') || 'New password'}
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('confirm_password') || 'Confirm password'}
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.doneButton, loading && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={AppColors.white} />
              ) : (
                <CustomText size={1.8} color={AppColors.white} textStyles={{ fontWeight: '600' }}>
                  {t('reset_password') || 'Reset Password'}
                </CustomText>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResendCode} disabled={loading} style={{ marginTop: height(2) }}>
              <CustomText size={1.5} color={AppColors.primary} textStyles={{ textAlign: 'center' }}>
                {t('didnt_receive_code') || "Didn't receive the code?"}{' '}
                <CustomText size={1.5} color={AppColors.primary} textStyles={{ fontWeight: 'bold' }}>
                  {t('resend') || 'Resend'}
                </CustomText>
              </CustomText>
            </TouchableOpacity>
          </View>
        ) : step === 3 ? (
          <View style={styles.statusContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={60} color={AppColors.primary} />
            </View>
            <CustomText size={2} color={AppColors.black} textStyles={styles.successTitle}>
              {t('password_changed') || 'Password Changed!'}
            </CustomText>
            <CustomText size={1.5} color="#666" textStyles={styles.statusText}>
              {t('password_reset_success') || 'Your password has been reset successfully.'}
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
              onPress={handleSendResetCode}
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
    paddingTop: height(4),
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
    marginTop: height(0.5),
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    paddingVertical: height(1.2),
    paddingHorizontal: width(4),
    borderRadius: 12,
    marginTop: height(1.5),
    marginBottom: height(2),
  },
  emailText: {
    fontWeight: '600',
    marginLeft: width(2),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: AppColors.white,
    width: '100%',
    marginBottom: height(1.5),
  },
  inputIcon: {
    paddingLeft: width(4),
  },
  input: {
    flex: 1,
    paddingVertical: height(1.6),
    paddingHorizontal: width(3),
    fontSize: height(1.8),
    color: AppColors.black,
  },
  codeInput: {
    fontSize: height(2.2),
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  eyeIcon: {
    paddingRight: width(4),
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: height(1.5),
    width: '100%',
  },
  doneButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: height(1.8),
    paddingHorizontal: width(12),
    borderRadius: 12,
    marginTop: height(2),
    width: '100%',
    alignItems: 'center',
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
