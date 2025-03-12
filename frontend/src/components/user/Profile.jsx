import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Avatar,
  Grid,
  Paper,
  Button,
} from "@mui/material";
import {
  authenticate,
  errMsg,
  getToken,
  getUser,
  succesMsg,
} from "../../utils/helper";
import LoadingSpinner from "../layout/LoadingSpinner";
import _ from "lodash";
import { Form, Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const Profile = () => {
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
const [newAvatar, setNewAvatar] = useState("")

  const handleAvatarClick = () => {
    document.getElementById("avatarUpload").click();
  };

  const fetchUserData = async () => {
    setLoading(true);

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const url = `${import.meta.env.VITE_API}/getUserInfo`;
      const { data: response } = await axios.post(
        url,
        { uid: getUser().uid },
        config
      );

      if (response.user) {
        setUserData(response.user);
        let currentAccountLoggedIn = {
          user: response.user,
          token: getToken(),
        };
        authenticate(currentAccountLoggedIn, () => {});
      }
    } catch (error) {
      errMsg("Error: " + error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (values, { setSubmitting }) => {
    setSubmitting(true);
    setLoading(true);
    setLoading(true);
    try {
      const { firstName, lastName, avatar } = values;

      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      if (avatar) {
        formData.append("avatar", avatar);
      }

      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await axios.put(
        `${import.meta.env.VITE_API}/update-profile/${getUser()._id}`,
        formData,
        config
      );
      console.log(response);
      succesMsg("User information updated successfully!");
      setIsUpdated(true);
      fetchUserData();
    } catch (error) {
      errMsg("Error: " + error.message);
      console.log(error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };
  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewAvatar(e.target.result)
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [isUpdated]);

  const validationSchema = Yup.object({
    firstName: Yup.string().required("First Name is required"),
    lastName: Yup.string().required("Last Name is required"),
  });

  return (
    <>
      {loading ? (
        <LoadingSpinner message="Fetching your data" />
      ) : (
        <div className="container py-3 min-height-100vh d-flex align-items-center justify-content-center flex-column">
          <h1>Profile</h1>
          {!userData && (
            <Container maxWidth="sm">
              <Typography variant="h6" color="error">
                Failed to load user data.
              </Typography>
            </Container>
          )}
          {
            <Container maxWidth="sm">
              <Paper style={{ padding: "16px", marginTop: "16px" }}>
                <Grid container direction="column" alignItems="center">
                  <Formik
                    initialValues={{
                      firstName: userData.firstName,
                      lastName: userData.lastName,
                      role: userData.role,
                      createdAt: userData.createdAt,
                      avatar: null,
                    }}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                  >
                    {({ setFieldValue, isSubmitting, errors }) => (
                      <Form className="d-flex align-items-start flex-column justify-content-center gap-3 w-75">
                        <div className="d-flex align-items-center justify-content-center w-100 py-2">

                        <Avatar
                          alt={userData.firstName}
                          src={
                            newAvatar || userData.avatar?.url ||
                            "./src/assets/images/default-image.jpg"
                          }
                          style={{
                            width: "80px",
                            height: "80px",
                          }}
                          sx={{
                            backgroundColor: "primary.main",
                            ":hover": {
                              opacity: "0.7",
                              cursor: "pointer",
                            },
                          }}
                          onClick={handleAvatarClick}
                        />
                        <input
                          id="avatarUpload"
                          type="file"
                          name="avatar"
                          accept="image/jpeg, image/jpg, image/png"
                          style={{ display: "none" }}
                          onChange={(event) => {
                            setFieldValue(
                              "avatar",
                              event.currentTarget.files[0]
                            );
                            handleAvatarChange(event)
                          }}
                          className="d-none"
                        />
                        </div>
                        <Field
                          type="text"
                          name="firstName"
                          placeholder="First Name"
                          className="inputField"
                        />
                        <ErrorMessage
                          name="firstName"
                          component="div"
                          className="text-danger"
                          style={{fontSize: "14px"}}
                        />

                        <Field
                          type="text"
                          name="lastName"
                          placeholder="First Name"
                          className="inputField"
                        />
                        <ErrorMessage
                          name="lastName"
                          component="div"
                          className="text-danger"
                          style={{fontSize: "14px"}}
                        />

                        <Field
                          label="Role"
                          value={userData.role}
                          InputProps={{
                            readOnly: true,
                          }}
                          className="inputField"
                        />
                        <Field
                          label="Account Created"
                          value={new Date(
                            userData.createdAt
                          ).toLocaleDateString()}
                          InputProps={{
                            readOnly: true,
                          }}
                          className="inputField"
                        />
                        <Grid container justifyContent="center">
                          <Button
                            variant="contained"
                            type="submit"
                            sx={{
                              backgroundColor: "primary.dark",
                            }}
                            className="my-3"
                            disabled={isSubmitting || loading}
                          >
                            {!isSubmitting ? "Update" : "Updating"}
                          </Button>
                        </Grid>
                      </Form>
                    )}
                  </Formik>
                </Grid>
              </Paper>
            </Container>
          }
        </div>
      )}
    </>
  );
};

export default Profile;
