import * as React from "react";
import Svg, { Path } from "react-native-svg";

function GreeceFlag({ height, width }, props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path d="M4 31h28a4 4 0 001.935-.5H2.065A4 4 0 004 31z" fill="#0D5EB0" />
      <Path
        d="M8.5 19.5H0V22h36v-2.5H8.5zM0 27c.001.17.013.337.035.5h35.931c.021-.163.033-.33.034-.5v-2H0v2zm14-13h22v2.5H14V14zm0-5.5V11h22V9a3.97 3.97 0 00-.035-.5H14z"
        fill="#EEE"
      />
      <Path
        d="M14 11h22v3H14v-3zM0 22h36v3H0v-3zm2.065 8.5h31.87a4 4 0 002.031-3H.035a4 4 0 002.03 3zM0 14h5.5v5.5H0V14zm14 2.5V14H8.5v5.5H36v-3H14zm19.935-11A4 4 0 0032 5H4A4 4 0 00.034 8.5C.014 8.664 0 8.83 0 9v2h5.5V5.5h3V11H14V8.5h21.965a4 4 0 00-2.03-3z"
        fill="#0D5EB0"
      />
      <Path d="M8.5 11V5h-3v6H0v3h5.5v5.5h3V14H14v-3H8.5z" fill="#EEE" />
    </Svg>
  );
}

export default GreeceFlag;
