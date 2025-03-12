import React, { useEffect, useState } from "react";
import { Form, Formik, Field, ErrorMessage } from "formik";
import { Modal } from "react-bootstrap";
import { errMsg, succesMsg } from "../../utils/helper";
import LoadingSpinner from "../layout/LoadingSpinner";
import UpdatingCarSchema from "../schema/UpdatingCarSchema";
import carSchema from "../schema/CarSchema";
import { getUser, getToken } from "../../utils/helper";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const CarFormModal = ({ show, handleClose, operation, carId }) => {
  const [imagePreviews, setImagePreviews] = useState([]);
  const [carData, setCarData] = useState({});
  const [loading, setLoading] = useState(false);

  let navigate = useNavigate();

  const handleNewSubmit = async (values, { setSubmitting, resetForm }) => {
    const data = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (key === "images" && value) {
        value.forEach((image) => {
          data.append("images", image);
        });
      } else {
        data.append(key, value);
      }
    });

    try {
      await axios.post(`${import.meta.env.VITE_API}/CreateCar`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${getToken()}`,
        },
      });
      succesMsg("Car created successfully!");
      resetForm();
      handleClose();
      navigate("/my-cars");
    } catch (error) {
      errMsg("Error: " + error.message);
      console.log(error);
    }

    setSubmitting(false);
  };

  const updateCar = async (values, { setSubmitting, resetForm }) => {
    setSubmitting(true);
    const data = new FormData();
    for (const key in values) {
      if (key !== "images") {
        data.append(key, values[key]);
      }
    }

    if (values.images) {
      values.images.forEach((image) => {
        data.append("images", image);
      });
    }

    try {
      await axios.put(`${import.meta.env.VITE_API}/Cars/${carId}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${getToken()}`,
        },
      });
      succesMsg("Car updated successfully!");
      resetForm();
      handleClose();
      navigate("/my-cars");
    } catch (error) {
      errMsg("Error: " + error.message);
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  };
  const getCarDetails = async (id) => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/Cars/${id}`
      );
      console.log(data);
      setCarData(data.car);
      setImagePreviews(data.car?.images);
    } catch (error) {
      errMsg("Error fetching the data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const initialValues = {
    model: "",
    brand: "",
    year: "",
    seatCapacity: "",
    fuel: "",
    mileage: "",
    transmission: "",
    displacement: "",
    vehicleType: "",
    pricePerDay: "",
    isAutoApproved: false,
    description: "",
    termsAndConditions: "",
    pickUpLocation: "",
    owner: getUser()._id,
    isActive: true,
    images: [],
  };
  const initialUpdateValues = (carData) => {
    console.log(carData);
    return {
      model: carData.model || "",
      brand: carData.brand || "",
      year: carData.year || "",
      seatCapacity: carData.seatCapacity || "",
      fuel: carData.fuel || "",
      mileage: carData.mileage || "",
      transmission: carData.transmission || "",
      displacement: carData.displacement || "",
      vehicleType: carData.vehicleType || "",
      pricePerDay: carData.pricePerDay || "",
      isAutoApproved: carData.isAutoApproved || false,
      description: carData.description || "",
      termsAndConditions: carData.termsAndConditions || "",
      pickUpLocation: carData.pickUpLocation || "",
      owner: carData.owner?._id || "",
      isActive: carData.isActive || true,
      images: [],
    };
  };

  useEffect(() => {
    console.log(carId);
    console.log("print");
    if (typeof operation === "undefined" || !operation) {
      return errMsg("No set operation!");
    } else if (operation !== "Add" && operation !== "Edit") {
      return errMsg("Set operation not defined!");
    }

    if (operation === "Edit") {
      if (typeof carId === "undefined") {
        return errMsg("Car ID not defined");
      }
      try {
        getCarDetails(carId);
        console.log("fetched");
      } catch (error) {
        return errMsg("Error: " + error.message);
      }
    }
  }, [carId]);
  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {operation == "Add" ? "Add New Car" : "Edit Car"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <LoadingSpinner
            message={
              operation == "Add" ? "Adding your Car" : "Updating your Car"
            }
          />
        ) : (
          <Formik
            initialValues={
              operation == "Add" ? initialValues : initialUpdateValues(carData)
            }
            validationSchema={
              operation == "Add" ? carSchema : UpdatingCarSchema
            }
            onSubmit={operation == "Add" ? handleNewSubmit : updateCar}
          >
            {({ isSubmitting, setFieldValue }) => (
              <Form>
                <div style={styles.formGroup}>
                  <label>Model:</label>
                  <Field
                    type="text"
                    name="model"
                    placeholder="Model"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="model"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Brand:</label>
                  <Field
                    type="text"
                    name="brand"
                    placeholder="Brand"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="brand"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Year:</label>
                  <Field
                    type="number"
                    name="year"
                    placeholder="Year"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="year"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Display on Featured Cars:</label>
                  <Field as="select" name="isActive" style={styles.select}>
                    <option value="">Select Vehicle Type</option>
                    <option value="true">Display</option>
                    <option value="false">Do not display</option>
                  </Field>
                  <ErrorMessage
                    name="isActive"
                    component="div"
                    className="text-danger"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label>Seat Capacity:</label>
                  <Field
                    type="number"
                    name="seatCapacity"
                    placeholder="Seat Capacity"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="seatCapacity"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Fuel Type:</label>
                  <Field as="select" name="fuel" style={styles.select}>
                    <option value="">Select Fuel Type</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                    <option value="Plugin Hybrid">Plugin Hybrid</option>
                  </Field>
                  <ErrorMessage
                    name="fuel"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Mileage:</label>
                  <Field
                    type="number"
                    name="mileage"
                    placeholder="Mileage"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="mileage"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Transmission:</label>
                  <Field as="select" name="transmission" style={styles.select}>
                    <option value="">Select Transmission</option>
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </Field>
                  <ErrorMessage
                    name="transmission"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Displacement:</label>
                  <Field
                    type="number"
                    name="displacement"
                    placeholder="Displacement"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="displacement"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Vehicle Type:</label>
                  <Field as="select" name="vehicleType" style={styles.select}>
                    <option value="">Select Vehicle Type</option>
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="Sport Car">Sport Car</option>
                  </Field>
                  <ErrorMessage
                    name="vehicleType"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Price Per Day:</label>
                  <Field
                    type="number"
                    name="pricePerDay"
                    placeholder="Price Per Day"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="pricePerDay"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Description:</label>
                  <Field
                    as="textarea"
                    name="description"
                    placeholder="Description"
                    style={styles.textarea}
                  />
                  <ErrorMessage
                    name="description"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Terms and Conditions:</label>
                  <Field
                    as="textarea"
                    name="termsAndConditions"
                    placeholder="Terms and Conditions"
                    style={styles.textarea}
                  />
                  <ErrorMessage
                    name="termsAndConditions"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Pick Up Location:</label>
                  <Field
                    type="text"
                    name="pickUpLocation"
                    placeholder="Pick Up Location"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="pickUpLocation"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup} className="d-none">
                  <label>Owner:</label>
                  <Field
                    type="text"
                    name="owner"
                    placeholder="Owner"
                    style={styles.input}
                  />
                  <ErrorMessage
                    name="owner"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label htmlFor="customFile">Upload Images:</label>
                  <div className="custom-file">
                    <input
                      type="file"
                      name="images"
                      className="custom-file-input"
                      id="customFile"
                      accept="image/jpeg, image/jpg, image/png"
                      onChange={(event) => {
                        const files = event.target.files;
                        let myFiles = Array.from(files);
                        setFieldValue("images", myFiles);
                      }}
                      multiple
                    />
                    <label className="custom-file-label" htmlFor="customFile">
                      Choose file
                    </label>
                  </div>
                  <ErrorMessage
                    name="images"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div style={styles.formGroup}>
                  {imagePreviews.map((preview, index) => (
                    <img
                      key={index}
                      src={preview.url}
                      alt={`Preview ${index}`}
                      style={{
                        width: "100px",
                        height: "100px",
                        marginRight: "10px",
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  style={styles.button}
                  disabled={isSubmitting}
                >
                  {!isSubmitting ? "Submit" : "Submitting..."}
                </button>
              </Form>
            )}
          </Formik>
        )}
      </Modal.Body>
    </Modal>
  );
};

const styles = {
  formContainer: {
    maxWidth: "900px",
    width: "100%",
    margin: "0 auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    backgroundColor: "#f9f9f9",
  },
  header: {
    textAlign: "center",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ddd",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ddd",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    height: "100px",
  },
  fileInput: {
    width: "100%",
  },
  button: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default CarFormModal;
