import * as React from "react";
import Svg, { Path } from "react-native-svg";

function PinUnfilled({ height, width }, props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 20 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.567 25.564C12.684 23.88 20 17.524 20 10.11 20 4.527 15.523 0 10 0S0 4.527 0 10.111c0 7.413 7.316 13.769 9.433 15.453a.9.9 0 001.134 0zM10 14.25a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
        fill="#D9D8DD"
      />
    </Svg>
  );
}

export default PinUnfilled;
