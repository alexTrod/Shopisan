import * as yup from "yup";

const SinupFormValidation = yup.object().shape({
  email: yup.string().required("Email is required.").email("Invalid Email"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password too short"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
  fullName: yup.string().required("Full name is required."),
  herdId: yup.string().required("Herd Id is required."),
  county: yup.string().required("County is required."),
});

export default SinupFormValidation;
