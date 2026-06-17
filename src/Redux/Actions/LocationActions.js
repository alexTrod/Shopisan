export const setCustomLocation = (location, source = "unknown") => ({
  type: "SET_CUSTOM_LOCATION",
  payload: { ...location, source },
});
