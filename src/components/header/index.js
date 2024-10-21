import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import CustomText, { LargeText } from "../text";
import MenuIcon from "../../../assets/icons/menu-icon";
import SettingsIcon from "../../../assets/icons/settings-icon";

const Header = ({
  title = "",
  containerStyle,
  children,
  showBack,
  onBackPress,
  rightIcon = false,
  onRightPress,
  showLeft = true,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {showBack && (
        <Pressable onPress={onBackPress}>
          <MenuIcon height={height(3)} width={height(3)} />
        </Pressable>
      )}
      {title && (
        <CustomText
          size={2.5}
          textStyles={{ fontFamily: "Mulish-Bold" }}
          color={AppColors.primary}
        >
          {title}
        </CustomText>
      )}
      {!children && (
        <Pressable onPress={onRightPress}>
          <SettingsIcon height={height(3)} width={height(3)} />
        </Pressable>
      )}
      {children}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    width: width(100),
    flexDirection: "row",
    justifyContent: "space-between",
    // alignItems: "center",
    paddingVertical: height(1),
    paddingHorizontal: width(2),
  },
});
