import React from "react";
import { View } from "react-native";

const Spacer = ({ horizontal, vertical }) => {
  return (
    <View
      style={{
        height: vertical ?? 0,
        width: horizontal ?? 0,
      }}
    />
  );
};

export default Spacer;
