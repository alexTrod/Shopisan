import * as yup from "yup";

const SignInFormValidation = yup.object().shape({
  email: yup.string().required("Email is required.").email("Invalid Email"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password too short"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
  username: yup.string().required("Username is required"),
});

export default SignInFormValidation;
