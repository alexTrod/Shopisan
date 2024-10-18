import * as React from "react";
import Svg, { Path } from "react-native-svg";

function BelgiqueFlag({ height, width }, props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path d="M12.375 5.625h11.25v24.75h-11.25V5.625z" fill="#F9CB38" />
      <Path
        d="M5.625 5.625C1.897 5.625 0 8.395 0 11.813v12.374c0 3.418 1.897 6.188 5.625 6.188h6.75V5.625h-6.75z"
        fill="#25333A"
      />
      <Path
        d="M30.375 5.625h-6.75v24.75h6.75c3.728 0 5.625-2.77 5.625-6.188V11.813c0-3.417-1.897-6.187-5.625-6.187z"
        fill="#EC1C24"
      />
    </Svg>
  );
}

export default BelgiqueFlag;
