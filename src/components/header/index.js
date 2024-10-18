import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import CustomText, { LargeText } from "../text";

const Header = ({
  title = "",
  containerStyle,
  children,
  showBack,
  textStyle,
  onBackPress,
  rightIcon = false,
  onRightPress,
  showLeft = true,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {showBack && (
        <Pressable onPress={onBackPress}>
          <AntDesign
            name={"arrowleft"}
            color={!showLeft ? AppColors.transparent : AppColors.white}
            size={height(3)}
          />
        </Pressable>
      )}
      {title && (
        <CustomText
          size={3}
          textStyles={{ fontWeight: "bold" }}
          color={AppColors.white}
        >
          {title}
        </CustomText>
      )}
      {!children && (
        <Pressable onPress={onRightPress}>
          <MaterialIcons
            name={"logout"}
            color={rightIcon ? AppColors.white : AppColors.transparent}
            size={height(3)}
          />
        </Pressable>
      )}
      {children}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.primary,
    width: width(100),
    flexDirection: "row",
    justifyContent: "space-between",
    // alignItems: "center",
    paddingVertical: height(1),
    paddingHorizontal: width(2),
  },
});
