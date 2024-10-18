import React, { forwardRef } from "react";
import { View } from "react-native";
import styles from "./styles";
import { SelectList } from "react-native-dropdown-select-list";
import { Controller } from "react-hook-form";
import CustomText from "../text";
import { AppColors } from "../../utils";
import { height } from "../../utils/dimension";

const DropDownMenu = (
  {
    setSelected = () => {},
    data,
    title,
    placeholder,
    dropDownShown,
    boxStyle,
    onSelect,
    dropDownStyle,
    dropDownItemStyle,
    mainStyleContainer,
    dropdownTextStyles,
    inputStyles,
    arrowicon,
    fieldName = "",
    formControl,
    errorMsg,
    defaultOption,
  },
  ref
) => {
  return (
    <View style={[styles.mainContainer, mainStyleContainer]}>
      {title && (
        <CustomText
          size={2}
          textStyles={{ fontSize: height(2) }}
          color={AppColors.black}
        >
          {title}
        </CustomText>
      )}

      <View style={[{ borderColor: AppColors?.secondary }]}>
        <Controller
          control={formControl}
          name={fieldName}
          render={({ field: { onChange, value } }) => (
            <SelectList
              // arrowicon={arrowicon}
              setSelected={(val) => {
                setSelected(val);
                onChange(val);
              }}
              data={data}
              save="value"
              defaultOption={defaultOption}
              search={false}
              placeholder={placeholder}
              onSelect={onSelect}
              dropdownShown={dropDownShown}
              boxStyles={{
                borderBottomColor: AppColors?.secondary,
                ...styles.boxStyle,
                ...boxStyle,
                paddingHorizontal: 0,
              }}
              dropdownStyles={{
                ...styles.dropDownStyle,
                ...dropDownStyle,
              }}
              dropdownItemStyles={dropDownItemStyle}
              dropdownTextStyles={{ ...dropdownTextStyles }}
              inputStyles={{
                padding: 0,
                ...inputStyles,
              }}
            />
          )}
        />
      </View>
      {errorMsg && (
        <CustomText
          color={AppColors.red}
          textProps={{
            marginTop: height(1),
          }}
          size={1.7}
        >
          *{errorMsg}
        </CustomText>
      )}
    </View>
  );
};

export default forwardRef(DropDownMenu);
