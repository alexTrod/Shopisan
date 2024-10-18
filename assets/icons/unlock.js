import React from "react";
import Svg, { Path } from "react-native-svg";

function Unlock_outline({ height, width, style }) {
  return (
    <Svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      viewBox="0 0 24 24"
      style={style}
    >
      <Path fill="#000" d="M0 0H24V24H0z" opacity="0.01"></Path>
      <Path
        fill="#000"
        fillRule="evenodd"
        d="M10 8h7a3 3 0 013 3v8a3 3 0 01-3 3H7a3 3 0 01-3-3v-8a3 3 0 013-3h1V6a4 4 0 118 0 1 1 0 11-2 0 2 2 0 10-4 0v2zm7 12a1 1 0 001-1v-8a1 1 0 00-1-1H7a1 1 0 00-1 1v8a1 1 0 001 1h10z"
        clipRule="evenodd"
      ></Path>
      <Path
        fill="#000"
        fillRule="evenodd"
        d="M9 15a3 3 0 116 0 3 3 0 01-6 0zm2 0a1 1 0 102 0 1 1 0 00-2 0z"
        clipRule="evenodd"
      ></Path>
    </Svg>
  );
}

export default Unlock_outline;
