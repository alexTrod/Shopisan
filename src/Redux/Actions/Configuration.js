import { ISLOADING } from "../Types";
export const isLoading = (payload) => {
  return {
    type: ISLOADING,
    payload: payload,
  };
};
