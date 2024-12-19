import { Platform, StyleSheet } from "react-native";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  menuContainer: {
    width: "50%",
    height: "100%",
    backgroundColor: AppColors.white,
    paddingVertical: height(2),
    paddingHorizontal: width(4),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: height(2),
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
  },
  menuText: {
    color: AppColors.primary,
    fontSize: height(2.5),
    marginLeft: width(2),
    fontFamily: "Mulish-Bold",
  },
  menuIcon: {
    color: AppColors.primary,
    fontSize: height(3),
  },
});

export default styles;
