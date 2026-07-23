import * as yup from "yup";
import i18n from "../../../translations/i18n";

const SignInFormValidation = yup.object().shape({
  email: yup.string()
    .required(() => i18n.t("email_required"))
    .email(() => i18n.t("email_invalid")),
  password: yup
    .string()
    .required(() => i18n.t("password_required"))
    .min(6, () => i18n.t("password_too_short")),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], () => i18n.t("passwords_must_match"))
    .required(() => i18n.t("confirm_password_required")),
  username: yup.string().required(() => i18n.t("username_required")),
});

export default SignInFormValidation;
