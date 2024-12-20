import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import CustomText, { LargeText } from "../text";
import MenuIcon from "../../../assets/icons/menu-icon";
import SettingsIcon from "../../../assets/icons/settings-icon";
import { useState } from "react";
import { Modal, TouchableOpacity, Text } from "react-native";
import HamburgerMenu from '../hamburger-menu';


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
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
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
        { /*
        showBack && (
          <Pressable onPress={toggleMenu}>
            <MenuIcon height={height(3)} width={height(3)} />
          </Pressable>
        )
          */}
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
            position:"absolute",
            right:0,
            }          
          ]}
        >
          {!children && (
            <Pressable onPress={onRightPress}>
              <SettingsIcon height={height(3)} width={height(3)} />
            </Pressable>
          )}
          {children}
        </View>

      </View>
      {/*<HamburgerMenu visible={menuVisible} onClose={toggleMenu} />*/}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    width: width(100),

    paddingVertical: height(1),
    paddingHorizontal: width(2),
  },
});
