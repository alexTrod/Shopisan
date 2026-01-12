import * as React from "react";
import Svg, { Path } from "react-native-svg";

function AlertCircleIcon({ height, width, color = "#E53935", ...props }) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        fill={color}
      />
    </Svg>
  );
}

export default AlertCircleIcon;
