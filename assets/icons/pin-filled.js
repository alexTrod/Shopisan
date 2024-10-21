import * as React from "react";
import Svg, { Path } from "react-native-svg";

function PinFilled({ height, width }, props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.567 27.564C17.684 25.88 25 19.524 25 12.11 25 6.527 20.523 2 15 2S5 6.527 5 12.111c0 7.413 7.316 13.769 9.433 15.453a.9.9 0 001.134 0zM15 16.25a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
        fill="#E04A5D"
      />
    </Svg>
  );
}

export default PinFilled;
