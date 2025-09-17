import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";

const CustomText = ({
  children,
  size = 2,
  textAlign = "auto",
  color = AppColors.black,
  textStyles,
  textProps,
  onPress,
  textDecorationLine = "none",
  allowFontScaling = true,
  numberOfLines,
  adjustsFontSizeToFit = false,
}) => {
  const styles = StyleSheet.create({
    text: {
      fontSize: height(size),
      color: color,
      textAlign: textAlign,
      textDecorationLine: textDecorationLine,
    },
  });

  return (
    <Pressable disabled={!onPress} onPress={onPress}>
      <Text 
        style={[styles.text, textStyles]} 
        allowFontScaling={allowFontScaling}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
        {...textProps}
      >
        {children}
      </Text>
    </Pressable>
  );
};

export const LargeText = (props) => <CustomText {...props} size={6.5} />;
export const MediumText = (props) => <CustomText {...props} size={4.5} />;
export const SmallText = (props) => <CustomText {...props} size={4} />;
export const UnderLineText = (props) => (
  <CustomText {...props} size={4.5} textDecorationLine="underline" />
);

export default CustomText;
