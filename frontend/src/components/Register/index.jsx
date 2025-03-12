import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase-config";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./styles.module.css";
import axios from "axios";
import { errMsg } from "../../utils/helper";
import SignWithGoogle from "../login/SignWithGoogle";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const initialValues = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    avatar: null,
  };

  const validationSchema = Yup.object({
    firstName: Yup.string().required("First Name is required"),
    lastName: Yup.string().required("Last Name is required"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    avatar: Yup.mixed().nullable().required("Avatar is required"),
  });

  // Form submission
  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setLoading(true);
    try {
      const { firstName, lastName, email, password, avatar } = values;
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = auth.currentUser;

      const formData = new FormData();
      formData.append("uid", user.uid);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      formData.append("password", password);
      if (avatar) formData.append("avatar", avatar);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      // Send the form data to the backend
      await axios.post(
        `${import.meta.env.VITE_API}/register`,
        formData,
        config
      );

      toast.success("User Registered Successfully!", {
        position: "bottom-right",
      });

      navigate("/login");
    } catch (error) {
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status <= 500
      ) {
        const { errors, message } = error.response.data;
        if (errors) {
          errors.forEach((err) => {
            toast.error(err, {
              position: "bottom-right",
            });
          });
        }
        setErrors({ submit: message });
      }
      if (error.message) {
        errMsg("Error " + error.message);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.signup_container}>
      <div className={styles.signup_form_container}>
        <div className={styles.left}>
          <h1 className="mb-4">Welcome Back</h1>
          <Link to="/login" style={{textDecoration: "none"}}>
            <button type="button" className={styles.white_btn}>
              Log In
            </button>
          </Link>
        </div>
        <div className={styles.right}>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ setFieldValue, isSubmitting, errors }) => (
              <Form className={styles.form_container}>
                <h1>Create Account</h1>
                <div>
                  <Field
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    className={styles.input}
                  />
                  <ErrorMessage
                    name="firstName"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div>
                  <Field
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    className={styles.input}
                  />
                  <ErrorMessage
                    name="lastName"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div>
                  <Field
                    type="email"
                    name="email"
                    placeholder="Email"
                    className={styles.input}
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div>
                  <Field
                    type="password"
                    name="password"
                    placeholder="Password"
                    className={styles.input}
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div>
                  <input
                    type="file"
                    name="avatar"
                    accept="image/jpeg, image/jpg, image/png"
                    className={styles.input}
                    onChange={(event) =>
                      setFieldValue("avatar", event.currentTarget.files[0])
                    }
                  />
                  <ErrorMessage
                    name="avatar"
                    component="div"
                    className="text-danger"
                  />
                </div>
                <button
                  type="submit"
                  className={styles.green_btn}
                  disabled={isSubmitting || loading}
                >
                  {loading ? "Loading..." : "Sign Up"}
                </button>
              </Form>
            )}
          </Formik>
          <SignWithGoogle method="Sign Up" />
        </div>
      </div>
    </div>
  );
};

export default Register;
