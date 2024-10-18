import { StyleSheet } from "react-native";
import { height } from "../../utils/dimension";

const styles = StyleSheet.create({
  mainContainer: {
    marginVertical: height(0.5),
  },
  boxStyle: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  dropDownStyle: {},
});
export default styles;
