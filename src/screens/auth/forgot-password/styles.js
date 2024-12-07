import { StyleSheet } from "react-native";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";

const styles = StyleSheet.create({
  mainViewContainer: {
    flex: 1,
    alignItems: "center",
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
    backgroundColor: AppColors.white,
    paddingVertical: height(2),
    paddingHorizontal: width(2),
    borderRadius: width(2),
    marginTop: height(5),
  },
  logo: {
    marginBottom: height(4),
    height: height(10),
    width: width(40),
  },
  button: {
    backgroundColor: AppColors.primary,
    width: "90%",
    paddingVertical: height(2),
    borderRadius: width(4),
  },
});
export default styles;
