import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useSelector } from 'react-redux';
import ScreenWrapper from '../../../../components/screen-wrapper';
import Button from '../../../../components/button';
import CustomText from '../../../../components/text';
import { AppColors } from '../../../../utils';
import { width, height } from '../../../../utils/dimension';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../../utils/useTranslation';
import { Linking } from 'react-native';

const CATEGORIES = [
  { key: 'report_problem', type: 'Report a Problem / Bug', icon: 'bug', color: '#E74C3C' },
  { key: 'suggest_idea', type: 'Suggest an Idea', icon: 'bulb', color: '#F39C12' },
  { key: 'general_question', type: 'General Question', icon: 'chatbubble-ellipses', color: '#3498DB' },
];

export default function ContactSupportScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.user.userData);
  const { t } = useTranslation();

  const handleSendFeedback = async () => {
    if (!selectedCategory) {
      Alert.alert(t('error') || 'Error', 'Please select a topic.');
      return;
    }

    if (!message.trim()) {
      Alert.alert(t('error') || 'Error', 'Please enter a message.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://us-central1-shopisan-bad76.cloudfunctions.net/sendFeedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          type: selectedCategory.type,
          userEmail: user?.email || null,
          userName: user?.username || null
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert(t('success') || 'Sent!', 'Your message has been sent. We\'ll get back to you soon.');
        setMessage('');
        setSelectedCategory(null);
        navigation.goBack();
      } else {
        throw new Error(result.error || 'Failed to send feedback');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert(t('error') || 'Error', 'Failed to send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper
      backgroundColor={'#F8F9FA'}
      statusBarColor={'#F8F9FA'}
      barStyle="dark-content"
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={AppColors.black} />
        </TouchableOpacity>
        <CustomText size={2.5} color={AppColors.primary} style={{ fontWeight: '500' }}>
          {t('contact_support') || 'Contact support'}
        </CustomText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Topic Selection */}
        <CustomText size={1.6} color={AppColors.grey_300} style={styles.sectionLabel}>
          WHAT CAN WE HELP YOU WITH?
        </CustomText>

        <View style={styles.topicsGrid}>
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory?.key === category.key;
            return (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.topicCard,
                  isSelected && { borderColor: category.color, borderWidth: 2 }
                ]}
                onPress={() => setSelectedCategory(category)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={[styles.iconCircle, { backgroundColor: category.color + '15' }]}>
                  <Ionicons name={category.icon} size={24} color={category.color} />
                </View>
                <CustomText
                  size={1.5}
                  color={AppColors.black}
                  style={styles.topicText}
                  numberOfLines={2}
                >
                  {t(category.key) || category.type}
                </CustomText>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: category.color }]}>
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Message Input */}
        <CustomText size={1.6} color={AppColors.grey_300} style={styles.sectionLabel}>
          YOUR MESSAGE
        </CustomText>
        <View style={styles.messageContainer}>
          <TextInput
            style={styles.textarea}
            placeholder={t('describe_here') || 'Tell us more about your issue or idea...'}
            placeholderTextColor="#A0A0A0"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        {/* Send Button */}
        <Button
          onPress={handleSendFeedback}
          containerStyle={styles.sendButton}
          loading={loading}
          disabled={loading || !selectedCategory || !message.trim()}
        >
          {loading ? (t('sending') || 'Sending...') : (t('send') || 'Send Message')}
        </Button>

        {/* Email Alternative */}
        <View style={styles.emailSection}>
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <CustomText size={1.4} color={AppColors.grey_300} style={styles.dividerText}>
              OR
            </CustomText>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => Linking.openURL('mailto:support@shopisan.com')}
          >
            <Ionicons name="mail" size={20} color={AppColors.primary} />
            <CustomText size={1.6} color={AppColors.primary} style={{ marginLeft: 10, fontWeight: '500' }}>
              support@shopisan.com
            </CustomText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicCard: {
    width: (width(100) - 52) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  textarea: {
    padding: 16,
    minHeight: 140,
    fontSize: 16,
    color: AppColors.black,
  },
  sendButton: {
    marginTop: 24,
    borderRadius: 12,
    padding: height(1.8),
  },
  emailSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
});
