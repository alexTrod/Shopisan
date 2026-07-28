import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View, Pressable, Modal } from "react-native";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import CustomText from "../text";
import SettingsIcon from "../../../assets/icons/settings-icon";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { signOut } from "../../Redux/Actions/UserActions";
import { ScreenNames } from "../../Routes/routes";
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
  navigation,
}) => {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const dispatch = useDispatch();

  const toggleSettings = () => {
    //setSettingsVisible(!settingsVisible);
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
            textStyles={{ fontFamily: "Roboto-Medium" }}
            color={AppColors.primary}
          >
            {title}
          </CustomText>
        )}
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
                textStyles={{ fontFamily: "Roboto-Medium" }}
                color={AppColors.primary}
              >
                Settings
              </CustomText>
              <Pressable onPress={toggleSettings}>
                <AntDesign name="close" size={24} color={AppColors.black} />
              </Pressable>
            </View>

            <View style={styles.settingsContent}>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: height(3),
  },
  settingsContent: {
    width: "100%",
    paddingVertical: height(2),
  },
  settingButton: {
    marginVertical: height(1),
    backgroundColor: AppColors.primary,
    borderRadius: width(2),
    padding: 20,
  },
  logoutButton: {
    backgroundColor: AppColors.red,
    marginTop: height(3),
  },
});

export default Header;
