import React, { forwardRef } from "react";
import { Controller } from "react-hook-form";
import { TextInput, View, Text } from "react-native";
import styles from "./styles";
import CustomText, { SmallText } from "../text";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";

const Input = (
  {
    control,
    name,
    placeholder,
    keytype,
    onSubmit,
    keyboardType,
    maxLength,
    icon = () => null,
    containerStyles = {},
    textAlignVertical = "center",
    textInputStyle = {},
    multiline,
    editable = true,
    error = null,
    textFieldContainer,
    textFieldInnerContainer,
    secureTextEntry = false,
    autoCapitalize = "none",
    label,
    prefix,
    suffix,
    testID,
    ...restProps
  },
  ref,
) => {
  return (
    <View style={[styles.mainContainer, containerStyles]}>
      {label && (
        <CustomText
          size={2}
          textStyles={{ paddingHorizontal: width(2) }}
          color={AppColors.black}
        >
          {label}
        </CustomText>
      )}

      <View style={[styles.textFieldContainer, textFieldContainer]}>
        <View style={[styles.textFieldInnerContainer, textFieldInnerContainer]}>
          <View style={styles.rowContainer}>
            {prefix && (
              <View
                style={{
                  borderRightColor: "#D8D8D8",
                  borderRightWidth: 2,
                  marginRight: height(0.5),
                  paddingRight: height(0.8),
                  paddingLeft: height(0.5),
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: height(4),
                }}
              >
                {prefix}
              </View>
            )}
            <Controller
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder={placeholder}
                  placeholderTextColor={AppColors.snowWhite}
                  autoCapitalize={autoCapitalize}
                  blurOnSubmit={false}
                  ref={ref}
                  editable={editable}
                  value={value}
                  keyboardType={keyboardType}
                  onSubmitEditing={onSubmit}
                  maxLength={maxLength}
                  multiline={multiline}
                  style={[styles.textInput, textInputStyle, { flex: 1 }]}
                  returnKeyType={keytype}
                  onChangeText={onChange}
                  textAlignVertical={textAlignVertical}
                  onBlur={onBlur}
                  secureTextEntry={secureTextEntry}
                  allowFontScaling={true}
                  testID={testID}
                  {...restProps}
                />
              )}
              name={name}
            />
            {suffix && (
              <View
                style={{ marginLeft: height(0.5), marginRight: height(0.5) }}
              >
                {suffix}
              </View>
            )}
          </View>
        </View>
      </View>
      {error?.message && (
        <Text style={styles.error}>{error && `*${error?.message}`}</Text>
      )}
    </View>
  );
};

export const InputField = forwardRef(Input);
