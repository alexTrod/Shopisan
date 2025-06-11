import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import ScreenWrapper from '../../../../components/screen-wrapper';
import Header from '../../../../components/header';
import Button from '../../../../components/button';
import { AppColors } from '../../../../utils';
import { width, height } from '../../../../utils/dimension';

export default function SuggestIdea({ navigation }) {
  const [message, setMessage] = useState('');

  const handleSendReport = () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }

    Alert.alert('Sent', 'Thank you, your message has been sent.');
    navigation.goBack();
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
        />
        <Button onPress={handleSendReport} containerStyle={styles.button}>
          Send
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
