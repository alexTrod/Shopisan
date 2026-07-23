import * as yup from "yup";

const StoreRegisterValidation = yup.object().shape({
  email: yup.string().required("Email is required.").email("Invalid Email"),

  username: yup.string().required("User name is required"),
  shop: yup.string().required("Shop is required"),
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
});

export default StoreRegisterValidation;
