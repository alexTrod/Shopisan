import React, { forwardRef, useState } from "react";
import { Controller } from "react-hook-form";
import { TextInput, View, Text, Pressable } from "react-native";
import styles from "./styles";
import CustomText, { SmallText } from "../text";
import { AppColors } from "../../utils";
import { width } from "../../utils/dimension";
import DatePicker from "react-native-date-picker";

const CalenderComp = (
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
  const [isVisible, setIsVisible] = useState(false);
  console.log(isVisible);
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

      <Pressable
        onPress={() => setIsVisible(true)}
        style={[styles.textFieldContainer, textFieldContainer]}
      >
        <View style={[styles.textFieldInnerContainer, textFieldInnerContainer]}>
          <View style={styles.rowContainer}>
            {prefix && prefix}
            <Controller
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TextInput
                    onPressIn={() => setIsVisible(true)}
                    readOnly={true}
                    placeholder={placeholder}
                    placeholderTextColor={AppColors.secondary}
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
                  {isVisible && (
                    <DatePicker
                      style={{ position: "absolute", bottom: 0 }}
                      date={new Date()}
                      mode="date"
                      onDateChange={(val) => {
                        onChange(val?.toLocaleDateString());
                      }}
                      modal
                      open={isVisible}
                      onConfirm={(val) => {
                        onChange(val?.toLocaleDateString());
                        setIsVisible(false);
                      }}
                      onCancel={() => {
                        setIsVisible(false);
                      }}
                    />
                  )}
                </>
              )}
              name={name}
            />
          </View>

          {suffix && suffix}
        </View>
      </Pressable>
      {error?.message && (
        <Text style={styles.error}>{error && `*${error?.message}`}</Text>
      )}
    </View>
  );
};

export const CalenderField = forwardRef(CalenderComp);
