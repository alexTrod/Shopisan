import * as React from "react";
import Svg, { Path } from "react-native-svg";

function PostIcon({ height, width }, props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M3.333 14c-.366 0-.68-.13-.941-.391A1.286 1.286 0 012 12.667V3.333c0-.366.13-.68.392-.941.261-.26.575-.392.941-.392h6v1.333h-6v9.334h9.334v-6H14v6c0 .366-.13.68-.391.942-.261.261-.575.391-.942.391H3.333zm2-2.667V10h5.334v1.333H5.333zm0-2V8h5.334v1.333H5.333zm0-2V6h5.334v1.333H5.333zm6-1.333V4.667H10V3.333h1.333V2h1.334v1.333H14v1.334h-1.333V6h-1.334z"
        fill="#E04A5D"
      />
    </Svg>
  );
}

export default PostIcon;
