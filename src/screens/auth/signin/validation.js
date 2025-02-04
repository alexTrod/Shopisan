import * as yup from "yup";

const SignInFormValidation = yup.object().shape({
  loginIdentifier: yup.string()
    .required("Login identifier is required")
    .test('is-valid', 'Please enter a valid email address or username', value => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      return emailRegex.test(value) || usernameRegex.test(value);
    }),
  password: yup
    .string()
    .required("Password is required")
});

export default SignInFormValidation;
