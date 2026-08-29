import { StyleSheet } from "react-native";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";

const styles = StyleSheet.create({
  mainViewContainer: {
    flexGrow: 1,
    marginTop: height(5),
    alignItems: "center",
    // justifyContent: "center",
    // paddingTop:height(4),
  },
  title: {
    color: AppColors.black,
    fontWeight: "bold",
    fontSize: width(4),
    marginBottom: height(2),
  },
  inputContainer: {
    width: width(90),
    marginVertical: height(1),
    backgroundColor: AppColors.transparent,
    paddingVertical: height(0),
    paddingHorizontal: width(2),
    borderRadius: width(2),
    marginTop: height(2),
  },
  logo: {
    marginBottom: height(4),
    height: height(10),
    width: width(40),
    // resizeMode:'contain'
  },
  button: {
    backgroundColor: AppColors.primary,
    width: "90%",
    paddingVertical: height(1.5),
    borderRadius: width(4),
  },
  buttonSecondary: {
    paddingVertical: height(1),
    paddingHorizontal: width(10),
    borderRadius: width(4),
    backgroundColor: AppColors.white,
    color: AppColors.primary,
    borderWidth: width(0.2),
    borderColor: AppColors.primary,
  },
  switch: {
    marginRight: 5,
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
    // height: height(3),
  },
  userTypeContainer: {
    width: '90%',
    alignSelf: 'center',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: height(1),
  },
  radioButton: {
    padding: width(3),
    borderRadius: width(2),
    borderWidth: 1,
    borderColor: AppColors.grey_100,
    flex: 1,
    marginHorizontal: width(1),
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: AppColors.primary_light,
    borderColor: AppColors.primary,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: height(1.5),
    marginBottom: height(0.5),
    paddingHorizontal: width(1),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: AppColors.primary,
  },
  checkboxTick: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 18,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: AppColors.grey_300,
    lineHeight: 19,
  },
  termsLink: {
    color: AppColors.primary,
    textDecorationLine: "underline",
  },
});

export default styles;