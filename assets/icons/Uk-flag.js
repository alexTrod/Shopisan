import * as React from "react";
import Svg, { G, Path, Defs, ClipPath } from "react-native-svg";

function UKFlag({ height, width }, props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <G clipPath="url(#clip0_1_277)">
        <Path
          d="M0 9.059V13h5.628L0 9.059zM4.664 31H13v-5.837L4.664 31zM23 25.164V31h8.335L23 25.164zM0 23v3.941L5.63 23H0zM31.337 5H23v5.837L31.337 5zM36 26.942V23h-5.631L36 26.942zM36 13V9.059L30.371 13H36zM13 5H4.664L13 10.837V5z"
          fill="#00247D"
        />
        <Path
          d="M25.14 23l9.712 6.801a4 4 0 00.99-1.749L28.627 23H25.14zM13 23h-2.141l-9.711 6.8c.521.53 1.189.909 1.938 1.085L13 23.943V23zm10-10h2.141l9.711-6.8a4 4 0 00-1.937-1.085L23 12.057V13zm-12.141 0L1.148 6.2a4 4 0 00-.991 1.749L7.372 13h3.487z"
          fill="#CF1B2B"
        />
        <Path
          d="M36 21H21v10h2v-5.836L31.335 31H32a4 4 0 002.852-1.199L25.14 23h3.487l7.215 5.052c.093-.337.158-.686.158-1.052v-.058L30.369 23H36v-2zM0 21v2h5.63L0 26.941V27c0 1.091.439 2.078 1.148 2.8l9.711-6.8H13v.943l-9.914 6.941c.294.07.598.116.914.116h.664L13 25.163V31h2V21H0zM36 9a3.98 3.98 0 00-1.148-2.8L25.141 13H23v-.943l9.915-6.942A4 4 0 0032 5h-.663L23 10.837V5h-2v10h15v-2h-5.629L36 9.059V9zM13 5v5.837L4.664 5H4a4 4 0 00-2.852 1.2l9.711 6.8H7.372L.157 7.949A4 4 0 000 9v.059L5.628 13H0v2h15V5h-2z"
          fill="#EEE"
        />
        <Path d="M21 15V5h-6v10H0v6h15v10h6V21h15v-6H21z" fill="#CF1B2B" />
      </G>
      <Defs>
        <ClipPath id="clip0_1_277">
          <Path fill="#fff" d="M0 0H36V36H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

export default UKFlag;
