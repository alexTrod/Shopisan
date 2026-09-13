import { StyleSheet } from "react-native";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: width(6),
    paddingTop: height(6),
    paddingBottom: height(4),
  },
  logo: {
    height: height(8),
    width: height(8),
    marginBottom: height(3),
  },
  iconCircle: {
    height: height(9),
    width: height(9),
    borderRadius: height(4.5),
    backgroundColor: AppColors.primary_faded,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height(2.5),
  },
  title: {
    fontFamily: "Roboto-Medium",
    marginBottom: height(1.5),
  },
  message: {
    lineHeight: height(2.8),
    marginBottom: height(2),
  },
  email: {
    fontFamily: "Roboto-Medium",
    marginBottom: height(2),
  },
  bannerContainer: {
    width: "100%",
    marginBottom: height(2),
  },
  actions: {
    width: "100%",
    marginTop: "auto",
  },
  checkButton: {
    width: "100%",
    paddingVertical: height(1.5),
    borderRadius: width(4),
    marginBottom: height(1.5),
  },
  logoutButton: {
    width: "100%",
    paddingVertical: height(1.5),
    borderRadius: width(4),
    backgroundColor: AppColors.white,
    borderWidth: width(0.2),
    borderColor: AppColors.primary,
  },
});

export default styles;
