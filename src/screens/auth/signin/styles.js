import { StyleSheet } from "react-native";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";

const styles = StyleSheet.create({
  mainViewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: height(5),
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: width(5),
    paddingVertical: height(1),
    marginBottom: height(2),
  },
  title: {
    color: AppColors.black,
    fontWeight: "bold",
    fontSize: width(4),
    marginBottom: height(2),
  },
  inputContainer: {
    width: "100%",
    backgroundColor: AppColors.white,
    borderRadius: width(5),
    paddingVertical: height(2),
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
    alignSelf: "center",
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
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: height(1),
  },
  radioButton: {
    padding: height(1.5),
    borderRadius: width(2),
    borderWidth: width(0.2),
    borderColor: AppColors.grey_100,
    flex: 1,
    marginHorizontal: width(1),
    alignItems: "center",
  },
  radioButtonSelected: {
    backgroundColor: AppColors.primary_light,
    borderColor: AppColors.primary,
  },
});
export default styles;
