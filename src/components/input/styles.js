import { Platform, StyleSheet } from "react-native";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";

const styles = StyleSheet.create({
  mainContainer: {
    marginVertical: height(1),
  },
  textFieldContainer: {
    width: width(90),
    marginTop: height(0.5),
    alignSelf: "center",
    backgroundColor: AppColors.white,
    borderRadius: width(3),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: width(2),
    paddingVertical: height(0.5),
    marginBottom: height(0.5),
  },
  textFieldInnerContainer: {
    width: "90%",
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  textInput: {
    width: "85%",
    height: Platform.OS === "ios" ? height(6) : height(6.5),
    color: AppColors.black,
  },
  error: {
    color: AppColors.red,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
  },
});
export default styles;
