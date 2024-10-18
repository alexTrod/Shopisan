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
    ...restProps
  },
  ref
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
                  marginRight: height(1),
                  width: height(4),
                }}
              >
                {prefix}
              </View>
            )}
            <Controller
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <>
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
                    style={[styles.textInput, textInputStyle]}
                    returnKeyType={keytype}
                    onChangeText={onChange}
                    textAlignVertical={textAlignVertical}
                    onBlur={onBlur}
                    secureTextEntry={secureTextEntry}
                    {...restProps}
                  />
                </>
              )}
              name={name}
            />
          </View>

          {suffix && suffix}
        </View>
      </View>
      {error?.message && (
        <Text style={styles.error}>{error && `*${error?.message}`}</Text>
      )}
    </View>
  );
};

export const InputField = forwardRef(Input);
