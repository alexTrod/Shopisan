import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import ScreenWrapper from '../../../../components/screen-wrapper';
import Header from '../../../../components/header';
import Button from '../../../../components/button';
import { AppColors } from '../../../../utils';
import { width, height } from '../../../../utils/dimension';

export default function SuggestIdea({ navigation }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.user.userData);

  const handleSendReport = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message.');
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
          type: 'Suggest an Idea / Report a Bug',
          userEmail: user?.email || null,
          userName: user?.username || null
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        Alert.alert('Sent', 'Thank you, your message has been sent to our team.');
        setMessage('');
        navigation.goBack();
      } else {
        throw new Error(result.error || 'Failed to send feedback');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert('Error', 'Failed to send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <Header
        showLeft
        showBack
        title="Suggest an idea"
        containerStyle={{ width: width(90), alignSelf: 'center' }}
      />
      <View style={styles.container}>
        <TextInput
          style={styles.textarea}
          placeholder="Describe your idea here..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          editable={!loading}
        />
        <Button 
          onPress={handleSendReport} 
          containerStyle={styles.button}
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  textarea: {
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    borderRadius: 8,
    padding: 12,
    minHeight: 150,
    backgroundColor: AppColors.white_100,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
    padding: height(2),
  },
});
