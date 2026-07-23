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
  inputContainer: {
    width: "100%",
    backgroundColor: AppColors.white,
    borderRadius: width(5),
    paddingVertical: height(2),
  },
  button: {
    backgroundColor: AppColors.primary,
    width: "90%",
    paddingVertical: height(2),
    borderRadius: width(4),
    alignSelf: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    alignSelf: "center",
    backgroundColor: AppColors.white,
    borderColor: AppColors.secondary,
    borderWidth: width(0.2),
    borderRadius: width(3),
    marginBottom: height(1.5),
  },
  inputIconContainer: {
    borderRightColor: "#D8D8D8",
    borderRightWidth: 2,
    marginRight: height(0.5),
    paddingRight: height(0.8),
    paddingLeft: height(0.5),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: height(4),
    paddingVertical: height(1.5),
  },
  textInput: {
    flex: 1,
    paddingVertical: height(1.5),
    paddingHorizontal: width(2),
    fontSize: height(1.8),
    color: AppColors.black,
  },
  suffixContainer: {
    marginLeft: height(0.5),
    marginRight: height(1),
  },
});

export default styles;
