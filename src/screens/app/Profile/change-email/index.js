import React, { useState } from 'react';
import { View, TextInput, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '../../../../../firebaseconfig';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../../../components/screen-wrapper';
import { AppColors } from '../../../../utils';
import { width, height } from '../../../../utils/dimension';
import CustomText from '../../../../components/text';
import { useSelector } from 'react-redux';
import { useTranslation } from '../../../../utils/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import ChevronLeft from '../../../../../assets/icons/chevron-left';
import EyeIcon from '../../../../../assets/icons/eye-icon';
import EyeOffIcon from '../../../../../assets/icons/eye-off-icon';

export default function ChangeEmailScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const user = useSelector(state => state.user.userData);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordHide, setPasswordHide] = useState(true);

  const handleChangeNameAndEmail = async () => {
    if (!currentPassword || (!newEmail && !newName)) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    // Validate email format if provided
    if (newEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail.trim())) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }
    }

    setLoading(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to change your email.');
      setLoading(false);
      return;
    }

    if (!currentUser.email) {
      Alert.alert('Error', 'Cannot change email for accounts without an email (e.g., social login).');
      setLoading(false);
      return;
    }

    try {
      // Re-authenticate the user with their current credentials
      console.log('Re-authenticating user with email:', currentUser.email);
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      console.log('Re-authentication successful');

      const userRef = doc(firestore, 'users', user.id);

      if (newName.trim()) {
        console.log('Updating name to:', newName.trim());
        await updateDoc(userRef, {
          name: newName.trim(),
        });
      }

      if (newEmail.trim()) {
        console.log('Sending verification email to:', newEmail.trim());

        // Use custom Cloud Function to send email change verification
        const sendEmailChangeVerification = httpsCallable(functions, 'sendEmailChangeVerification');
        await sendEmailChangeVerification({
          userId: user.id,
          oldEmail: user.email,
          newEmail: newEmail.trim(),
          username: user.username || user.name || 'User',
          language: t('locale') || 'fr'
        });

        console.log('Verification email sent successfully via Cloud Function');

        // Store the pending email in Firestore so we can track it
        await updateDoc(userRef, {
          pendingEmail: newEmail.trim(),
        });
      }

      Alert.alert(
        'Success',
        newEmail
          ? "A verification email has been sent to your new email address. Please click the link in that email to complete the change."
          : "Name updated successfully.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Error while updating name/email:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = error.message;
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. Please check your password.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use by another account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is not valid.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in, then try again.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper backgroundColor={AppColors.white}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Custom Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft width={28} height={28} color={AppColors.black} />
          </TouchableOpacity>
          <CustomText size={2.2} textStyles={styles.headerTitle}>
            {t('change_email_title') || 'Change Email & Name'}
          </CustomText>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Email Display */}
          <View style={styles.currentEmailCard}>
            <Ionicons name="mail-outline" size={24} color={AppColors.primary} />
            <View style={styles.currentEmailInfo}>
              <CustomText size={1.4} color="#666">
                {t('current_email') || 'Current email'}
              </CustomText>
              <CustomText size={1.8} color={AppColors.black} textStyles={{ fontWeight: '600' }}>
                {user?.email || 'Not available'}
              </CustomText>
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <CustomText size={1.6} color={AppColors.black} textStyles={styles.label}>
              {t('password_confirm_identity') || 'Password (to confirm your identity)'} *
            </CustomText>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('enter_password') || 'Enter your password'}
                placeholderTextColor="#999"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={passwordHide}
              />
              <TouchableOpacity
                onPress={() => setPasswordHide(!passwordHide)}
                style={styles.eyeIcon}
              >
                {passwordHide ? (
                  <EyeOffIcon height={height(2.5)} width={height(2.5)} color="#888888" />
                ) : (
                  <EyeIcon height={height(2.5)} width={height(2.5)} color="#888888" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* New Name Field */}
          <View style={styles.inputGroup}>
            <CustomText size={1.6} color={AppColors.black} textStyles={styles.label}>
              {t('new_name_optional') || 'New name (optional)'}
            </CustomText>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('enter_new_name') || 'Enter new name'}
                placeholderTextColor="#999"
                value={newName}
                onChangeText={setNewName}
              />
            </View>
          </View>

          {/* New Email Field */}
          <View style={styles.inputGroup}>
            <CustomText size={1.6} color={AppColors.black} textStyles={styles.label}>
              {t('new_email_optional') || 'New email address (optional)'}
            </CustomText>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('enter_new_email') || 'Enter new email address'}
                placeholderTextColor="#999"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle-outline" size={20} color={AppColors.primary} />
            <CustomText size={1.5} color="#555" textStyles={styles.infoText}>
              {t('email_change_info') || 'If you change your email, you will receive a verification link at the new address.'}
            </CustomText>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleChangeNameAndEmail}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={AppColors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color={AppColors.white} />
                <CustomText size={1.8} color={AppColors.white} textStyles={styles.submitButtonText}>
                  {t('save_changes') || 'Save Changes'}
                </CustomText>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomColor: AppColors.grey_100 || '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: width(5),
    paddingTop: height(2.5),
    paddingBottom: height(4),
  },
  currentEmailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    padding: height(2),
    borderRadius: 12,
    marginBottom: height(3),
  },
  currentEmailInfo: {
    marginLeft: width(3),
    flex: 1,
  },
  inputGroup: {
    marginBottom: height(2.5),
  },
  label: {
    fontWeight: '500',
    marginBottom: height(0.8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.grey_200 || '#E0E0E0',
    borderRadius: 12,
    backgroundColor: AppColors.white,
  },
  inputIcon: {
    paddingLeft: width(4),
  },
  eyeIcon: {
    paddingRight: width(4),
    paddingVertical: height(1.5),
  },
  input: {
    flex: 1,
    paddingVertical: height(1.8),
    paddingHorizontal: width(3),
    fontSize: height(1.9),
    color: AppColors.black,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    padding: height(1.5),
    borderRadius: 10,
    marginTop: height(1),
    marginBottom: height(3),
  },
  infoText: {
    flex: 1,
    marginLeft: width(2),
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: height(1.8),
    borderRadius: 12,
    marginTop: height(1),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontWeight: '600',
    marginLeft: width(2),
  },
});
