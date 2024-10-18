import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import CustomText from "../text";
import Button from "../button";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";

const CustomModal = ({
  visible,
  onClose,
  SvgImage,
  primaryText,
  secondaryText,
  buttonText,
  containerStyle,
  textStyle,
  buttonStyle,
  buttonTextStyle,
  PrimarytextStyle,
  suffix,
  loading,
}) => {
  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, containerStyle]}>
          {SvgImage && SvgImage}

          {primaryText && (
            <CustomText
              size={1.8}
              textStyles={[styles.primaryText, PrimarytextStyle]}
            >
              {primaryText}
            </CustomText>
          )}

          {/* <Text style={[styles.primaryText, textStyle]}>{primaryText}</Text> */}
          {/*           <Text style={[styles.secondaryText, textStyle]}>{secondaryText}</Text>
           */}
          {secondaryText && (
            <CustomText
              size={1}
              textStyles={[styles.secondaryText, textStyle]}
              textAlign="center"
            >
              {secondaryText}
            </CustomText>
          )}
          {suffix && suffix}
          {buttonText && (
            <Button
              loading={loading}
              containerStyle={[buttonStyle]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, buttonTextStyle]}>
                {buttonText}
              </Text>
            </Button>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    borderWidth: width(0.1),
    borderColor: AppColors.primary,
    width: "80%",
    backgroundColor: AppColors.black,
    padding: width(3),
    borderRadius: width(3),
    alignItems: "center",
    justifyContent: "space-evenly",
    shadowColor: "#800080", // Purple shadow color
    shadowOffset: {
      width: 0,
      height: 1, // Small shadow height
    },
    shadowOpacity: 0.5,
    shadowRadius: 1, // Small shadow radius
    elevation: 1,
  },
  primaryText: {
    color: AppColors.white,
    //fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  secondaryText: {
    color: AppColors.white,
    //fontSize: 16,
    marginVertical: 10,
  },
  button: {
    backgroundColor: AppColors.black,
    height: height(5),
    marginTop: height(1),
  },
  buttonText: {
    color: "white",
  },
});

export default CustomModal;
