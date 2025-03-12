import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase-config";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import styles from "./styles.module.css";
import axios from "axios";
import { authenticate, errMsg, succesMsg } from "../../utils/helper";
import SignInwithGoogle from "./SignWithGoogle";
import { toast } from "react-toastify";

const Login = () => {
  const [loading, setLoading] = useState(false);

  const initialValues = {
    email: "",
    password: "",
  };

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Required"),
    password: Yup.string().required("Required"),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const idToken = await result.user.getIdToken();
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
      const url = `${import.meta.env.VITE_API}/getUserInfo`;
      const { data: response } = await axios.post(
        url,
        { uid: result.user.uid },
        config
      );

      if (response.success) {
        const userInfo = {
          token: idToken,
          user: response.user,
        };
        succesMsg("Login Successfully!");
        authenticate(userInfo, () => (window.location = "/"));
      } else {
        errMsg("Login Failed");
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status <= 500
      ) {
        if (
          error.response.data.errors &&
          Array.isArray(error.response.data.errors)
        ) {
          error.response.data.errors.forEach((error) => {
            toast.error(error, {
              position: "bottom-right",
            });
          });
        }
        setErrors({ submit: error.response.data.message });
      } else if (error.message) {
        errMsg("Login Failed");
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.login_container}>
      <div className={styles.login_form_container}>
        <div className={styles.left}>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors }) => (
              <Form className={styles.form_container}>
                <h1 className="py-3">Login to your Account</h1>
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
                    className="text-danger text-start"
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
                    className="text-danger text-start"
                  />
                </div>

                <button
                  type="submit"
                  className={styles.green_btn}
                  disabled={isSubmitting || loading}
                  style={{width: "250px"}}
                >
                  {loading ? "Loading..." : "Log In"}
                </button>
                <SignInwithGoogle method="Sign In" />
              </Form>
            )}
          </Formik>
        </div>
        <div className={styles.right}>
          <h1 className="mb-4">New Here</h1>
          <Link to="/register" style={{textDecoration: "none"}}>
            <button type="button" className={styles.white_btn}>
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
