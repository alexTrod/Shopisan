import { StyleSheet } from "react-native";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";

const styles = StyleSheet.create({
  mainViewContainer: {
    flexGrow: 1,
    marginTop: height(5),
    paddingHorizontal: width(10),
    // alignItems: "center",
    // justifyContent: "center",
    // paddingTop:height(4),
  },

  button: {
    backgroundColor: AppColors.primary,
    width: "90%",
    paddingVertical: height(2),
    borderRadius: width(4),
    marginTop: height(4),
  },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  radioButtonOuter: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  radioButtonInner: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: AppColors.primary,
  },
  flag: {
    width: 40,
    height: 30,
    marginRight: 15,
  },
  countryText: {
    fontSize: 16,
    color: AppColors.primary,
  },
});
export default styles;
