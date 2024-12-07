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
  switch: {
    marginRight: 5,
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
});
export default styles;
