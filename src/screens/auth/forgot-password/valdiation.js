import * as yup from "yup";

const ForgotPasswordForm = yup.object().shape({
  email: yup.string().required("Email is required.").email("Invalid Email"),
});

export default ForgotPasswordForm;
