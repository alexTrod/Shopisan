import * as React from "react";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

function ProfileUnfilled({ height, width }, props) {
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
        d="M21.567 9.25c0 3.729-2.938 6.75-6.564 6.75-3.625 0-6.564-3.021-6.564-6.75 0-3.728 2.94-6.75 6.564-6.75 3.626 0 6.564 3.022 6.564 6.75zm-.93 10.554c2.087.423 3.45 1.112 4.034 2.225a3.079 3.079 0 010 2.769c-.584 1.112-1.892 1.846-4.055 2.224-.964.194-1.94.32-2.92.378-.908.1-1.817.1-2.736.1h-1.655a7.887 7.887 0 00-1.005-.067c-.98-.05-1.957-.173-2.92-.367-2.087-.4-3.45-1.112-4.034-2.224A3.048 3.048 0 015 23.441c-.004-.492.11-.978.335-1.412.574-1.113 1.936-1.835 4.045-2.225.968-.19 1.947-.312 2.93-.367 1.8-.145 3.608-.145 5.408 0 .98.057 1.955.18 2.92.367z"
        fill="url(#paint0_linear_1_1634)"
        opacity={0.2}
      />
      <Defs>
        <LinearGradient
          id="paint0_linear_1_1634"
          x1={8.4376}
          y1={5.625}
          x2={25.3057}
          y2={21.0023}
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#575274" />
          <Stop offset={1} stopColor="#2D2942" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

export default ProfileUnfilled;
