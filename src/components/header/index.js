import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View, Pressable, Modal } from "react-native";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import CustomText from "../text";
import SettingsIcon from "../../../assets/icons/settings-icon";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "../../Redux/Actions/UserActions";
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../firebaseconfig';
import Toast from "react-native-toast-message";
import Button from "../button";

const Header = ({
  title = "",
  containerStyle,
  children,
  showBack,
  onBackPress,
  rightIcon = false,
  onRightPress,
  showLeft = true,
  navigation
}) => {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector(state => state?.Auth?.user);

  const toggleSettings = () => {
    setSettingsVisible(!settingsVisible);
  };

  const handleSwitchUserType = async () => {
    try {
      const newUserType = user?.userType === 'merchant' ? 'shopper' : 'merchant';
      
      // Update user type in Firestore
      const userRef = doc(firestore, 'users', user.email);
      await updateDoc(userRef, {
        userType: newUserType
      });

      // Show success message
      Toast.show({
        text1: 'Success',
        text2: `Switched to ${newUserType} mode`,
        type: 'success',
      });
      
      toggleSettings(); // Close modal after successful switch
    } catch (error) {
      Toast.show({
        text1: 'Error',
        text2: error.message,
        type: 'error',
      });
    }
  };

  return (
    <View style={[styles.container]}>
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          },
          containerStyle,
        ]}
      >
        {title && (
          <CustomText
            size={2.5}
            textStyles={{ fontFamily: "Mulish-Bold" }}
            color={AppColors.primary}
          >
            {title}
          </CustomText>
        )}
        <View
          style={[
            {
              position: "absolute",
              right: 0,
            }
          ]}
        >
          {!children && (
            <Pressable onPress={toggleSettings}>
              <SettingsIcon height={height(3)} width={height(3)} />
            </Pressable>
          )}
          {children}
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={toggleSettings}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <CustomText
                size={2.5}
                textStyles={{ fontFamily: "Mulish-Bold" }}
                color={AppColors.primary}
              >
                Settings
              </CustomText>
              <Pressable onPress={toggleSettings}>
                <AntDesign name="close" size={24} color={AppColors.black} />
              </Pressable>
            </View>
            
            <View style={styles.settingsContent}>
              {user?.userType === 'merchant' && (
                <Button
                  onPress={() => {
                    // Handle store management
                    toggleSettings();
                    navigation?.navigate('StoreManagement');
                  }}
                  containerStyle={styles.settingButton}
                >
                  Manage Stores
                </Button>
              )}

              <Button
                onPress={handleSwitchUserType}
                containerStyle={styles.settingButton}
              >
                Switch to {user?.userType === 'merchant' ? 'Shopper' : 'Merchant'} Mode
              </Button>

              <Button
                onPress={() => {
                  dispatch(signOut());
                  toggleSettings();
                  navigation?.navigate(ScreenNames.SIGN_IN);
                }}
                containerStyle={[styles.settingButton, styles.logoutButton]}
              >
                Log Out
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    width: width(100),
    paddingVertical: height(1),
    paddingHorizontal: width(2),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: width(5),
    borderTopRightRadius: width(5),
    paddingVertical: height(2),
    paddingHorizontal: width(4),
    minHeight: height(40),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height(3),
  },
  settingsContent: {
    width: '100%',
    paddingVertical: height(2),
  },
  settingButton: {
    marginVertical: height(1),
    backgroundColor: AppColors.primary,
    borderRadius: width(2),
    padding:20,
  },
  logoutButton: {
    backgroundColor: AppColors.red,
    marginTop: height(3),
  },
});

export default Header;
