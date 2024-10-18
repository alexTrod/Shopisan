import React, { useMemo } from "react";
import { TouchableOpacity, ActivityIndicator, View } from "react-native";
import styles from "./styles";
import LinearGradient from "react-native-linear-gradient";
import { AppColors } from "../../utils";
import CustomText, { SmallText } from "../text";

const Button = ({
  onPress,
  children = null, // Provide a default value here
  variant = "primary",
  withShadow = false,
  containerStyle = {},
  touchableOpacityProps,
  textStyle = {},
  textProps = {},
  disabled = false,
  buttonTextColor = AppColors.white,
  colors = [AppColors.primary, AppColors.primary2],
  loading = false,
  size = 2, // Default size is
}) => {
  const getStyles = useMemo(() => {
    return {
      container: {
        ...styles.container,
        ...(disabled
          ? styles.disableContainer
          : variant === "primary"
          ? styles.primaryContainer
          : styles.secondaryContainer),
        ...(withShadow && styles.shadow),
      },
    };
  }, [variant, withShadow, disabled]);

  return (
    <View style={[getStyles.container, containerStyle]}>
      <TouchableOpacity
        disabled={disabled}
        onPress={onPress}
        {...touchableOpacityProps}
        // style={getStyles.touchableOpacity}
      >
        <CustomText
          color={disabled ? AppColors.white : buttonTextColor}
          textStyles={textStyle}
          textProps={textProps}
          size={size}
        >
          {loading ? (
            <ActivityIndicator color={AppColors.white} size={"small"} />
          ) : (
            children
          )}
        </CustomText>
      </TouchableOpacity>
    </View>
  );
};

export default Button;
