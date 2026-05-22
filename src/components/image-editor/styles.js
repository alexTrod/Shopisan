import { StyleSheet } from "react-native";
import { AppColors } from "../../utils";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.92)", // Semi-transparent white
  },
  editorArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  viewport: {
    overflow: "hidden",
    borderRadius: 9999, // Circular
    borderWidth: 3,
    borderColor: AppColors.primary,
    backgroundColor: "#f0f0f0",
  },
  image: {
    resizeMode: "cover",
  },
  overlayMask: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTop: {
    flex: 0,
    width: "100%",
    backgroundColor: "transparent",
  },
  overlayMiddle: {
    flexDirection: "row",
    width: "100%",
  },
  overlaySide: {
    flex: 0,
    backgroundColor: "transparent",
  },
  cropArea: {
    borderRadius: 9999, // Circular
    borderWidth: 0,
  },
  overlayBottom: {
    flex: 0,
    width: "100%",
    backgroundColor: "transparent",
  },
  instructions: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  resetButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 20,
  },
  resetButtonText: {
    color: "#333",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 15,
    backgroundColor: "#fff",
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  doneButton: {
    backgroundColor: AppColors.primary,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default styles;
