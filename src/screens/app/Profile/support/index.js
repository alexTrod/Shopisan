import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import ScreenWrapper from '../../../../components/screen-wrapper';
import Header from '../../../../components/header';
import Button from '../../../../components/button';
import { AppColors } from '../../../../utils';
import { width } from '../../../../utils/dimension';

export default function SupportScreen({ navigation }) {

  const handleOpenSupport = () => {
    Linking.openURL('https://www.google.fr');
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
        title="Support"
        containerStyle={{ width: width(90), alignSelf: 'center' }}
      />
      <View style={styles.container}>
        <Button onPress={handleOpenSupport}>
          Access Support
        </Button>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
