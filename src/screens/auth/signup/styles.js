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
    marginVertical: height(2),
    backgroundColor: AppColors.transparent,
    paddingVertical: height(2),
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
    paddingVertical: height(2),
    borderRadius: width(4),
  },
  buttonSecondary: {
    paddingVertical: height(2),
    paddingHorizontal: width(10),
    borderRadius: width(4),
    backgroundColor: AppColors.red_100,
    color: AppColors.red_100,
    borderWidth: width(0.2),
    borderColor: AppColors.primary_darker,
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
});

export default styles;
