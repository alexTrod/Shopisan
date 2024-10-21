import * as React from "react";
import Svg, { Path } from "react-native-svg";

function LogoutIcon({ height, width }, props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M13.333 8H7m5 2l2-2-2-2M8.667 4.667V4a1.333 1.333 0 00-1.334-1.333H4A1.333 1.333 0 002.667 4v8A1.333 1.333 0 004 13.333h3.333A1.333 1.333 0 008.667 12v-.667"
        stroke="#E04A5D"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default LogoutIcon;
