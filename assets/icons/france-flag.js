import * as React from "react";
import Svg, { Path } from "react-native-svg";

function FranceFlag({ height, width }, props) {
  return (
    <Svg
      xmlns="http://www.w3.org/2000/svg"
      width={height}
      height={width}
      viewBox="0 0 36 36"
      {...props}
    >
      <Path fill="#ed2939" d="M36 27a4 4 0 01-4 4h-8V5h8a4 4 0 014 4z" />
      <Path fill="#002495" d="M4 5a4 4 0 00-4 4v18a4 4 0 004 4h8V5z" />
      <Path fill="#eee" d="M12 5h12v26H12z" />
    </Svg>
  );
}

export default FranceFlag;
