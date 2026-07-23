import * as yup from "yup";

const ForgotPasswordForm = yup.object().shape({
  email: yup.string().email("Invalid email format").required("Email is required."),
});

export default ForgotPasswordForm;
