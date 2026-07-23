import * as React from "react";
import Svg, { Path } from "react-native-svg";

function ChevronRight({ height, width, color = "#9E9E9E", ...props }) {
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
        d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
        fill={color}
      />
    </Svg>
  );
}

export default ChevronRight;
