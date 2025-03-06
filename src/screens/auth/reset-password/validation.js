import * as yup from "yup";
import { ObjectSchema } from "yup";

const ResetFormValidation = yup.object().shape({
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password too short"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
});

export default ResetFormValidation;
