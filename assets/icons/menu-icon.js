import * as React from "react";
import Svg, { Path } from "react-native-svg";

function MenuIcon({ height, width }, props) {
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
        d="M2 9h19M2 16h10"
        stroke="#000"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default MenuIcon;
