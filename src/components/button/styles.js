import { StyleSheet } from "react-native";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";

const styles = StyleSheet.create({
  container: {
    borderRadius: width(10),
    paddingVertical: height(1.5), // Increased for better touch target
    paddingHorizontal: width(4), // Added horizontal padding
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    minHeight: height(6), // Minimum height for accessibility
    flexShrink: 1, // Allow shrinking if needed
  },
  primaryContainer: {
    backgroundColor: AppColors.primary,
  },
  secondaryContainer: {
    backgroundColor: AppColors.primary,
  },
  disableContainer: {
    backgroundColor: AppColors.wihte5,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default styles;
