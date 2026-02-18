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
    paddingVertical: height(1),
    marginBottom: height(0.5),
    minHeight: height(7),
    overflow: 'hidden',
  },
  textFieldInnerContainer: {
    width: "90%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  textInput: {
    height: Platform.OS === "ios" ? height(6) : height(6.5),
    color: AppColors.black,
    fontSize: height(2),
    lineHeight: height(2.5),
  },
  error: {
    color: AppColors.red,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
  },
});
export default styles;
