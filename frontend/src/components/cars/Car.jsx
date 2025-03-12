import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "react-bootstrap";
import { Link, useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "../layout/LoadingSpinner";
import TextField from "@mui/material/TextField";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import { Table } from "react-bootstrap";
import { Carousel } from "react-bootstrap";
const { Filter } = await import("bad-words");

import {
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  Grid,
  CardContent,
  CardMedia,
  Rating,
} from "@mui/material";

import Alert from "../layout/Alert";
import { toast } from "react-toastify";
import {
  getUser,
  getToken,
  calculateRentalDays,
  errMsg,
} from "../../utils/helper";

const Car = () => {
  const { id: carId } = useParams();
  const [carData, setCarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pickupDate, setPickupDate] = useState(null);
  const [returnDate, setReturnDate] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);

  const [carRentals, setCarRentals] = useState([]);

  const [rentalDays, setRentalDays] = useState(null);
  const [paymentMode, setPaymentMode] = useState("");
  const [carRating, setCarRating] = useState([]);

  let navigate = useNavigate();

  const handlePickupDateChange = (newValue) => {
    setPickupDate(newValue);
    if (newValue > returnDate) {
      setReturnDate(null);
    }
  };

  const handleReturnDateChange = (newValue) => {
    setReturnDate(newValue);
  };

  const handleChange = (event) => {
    setPaymentMode(event.target.value);
  };

  const calculateRental = () => {
    try {
      if (!pickupDate || !returnDate) {
        return;
      }
      const days = calculateRentalDays(pickupDate, returnDate);
      setRentalDays(days);
    } catch (error) {
      return;
    }
  };
  const handleDialogOpen = () => {
    try {
      if (!pickupDate || !returnDate) {
        toast.error("Please enter the pickup and return date!", {
          position: "bottom-right",
        });
        return;
      }
      if (paymentMode == "") {
        toast.error("Please enter the mode of payment.", {
          position: "bottom-right",
        });
        return;
      }
      const days = calculateRentalDays(pickupDate, returnDate);
      setRentalDays(days);
      console.log(days);

      setOpenDialog(true);
    } catch (error) {
      errMsg(error.message);
      console.log(message);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleConfirmBooking = async () => {
    try {
      const bookingData = {
        car: carId,
        renter: getUser()._id,
        pickUpDate: pickupDate.toISOString().slice(0, 19),
        returnDate: returnDate.toISOString().slice(0, 19),
        status: "Pending",
        paymentMethod: paymentMode,
        paymentStatus: "Paid",
      };

      console.log(bookingData);
      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      };
      const response = await axios.post(
        `${import.meta.env.VITE_API}/createRental`,
        bookingData,
        config
      );

      toast.success("Booking confirmed! Please wait for owner approval", {
        position: "bottom-right",
      });
      navigate("/my-rentals");
      setOpenDialog(false);
    } catch (error) {
      console.log(error);
      toast.error("Error" + error?.response?.data?.message, {
        position: "bottom-right",
      });
    }
  };

  const fetchCarRentals = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      };
      const response = await axios.get(
        `${import.meta.env.VITE_API}/car-rentals/${carId}`,
        config
      );
      console.log(response);
      setCarRentals(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchCarRating = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      };
      const response = await axios.get(
        `${import.meta.env.VITE_API}/car/reviews/${carId}`,
        config
      );
      console.log(response);
      setCarRating(response.data.reviews);
      console.log(response.data.reviews);
    } catch (error) {
      console.log(error);
    }
  };

  const badWords = new Filter();
  const filterComment = (comment) => {
    if (!comment) return null;

    if (/\*{2,}/.test(comment)) return null;

    const normalizedComment = comment
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .toLowerCase();

    const words = normalizedComment.split(" ");
    const containsProfanity = words.some((word) => badWords.isProfane(word));

    return containsProfanity ? null : comment;
  };

  useEffect(() => {
    const fetchCarData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/Cars/${carId}`
        );
        setCarData(response.data.car);
      } catch (err) {
        setError("Failed to fetch car data. Please try again.");
        console.log("error", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCarData();
    fetchCarRentals();
    fetchCarRating();
    calculateRental();
  }, [carId]);

  let isCarOnRental = false;

  if (carRentals.length > 0) {
    isCarOnRental = carRentals.some(
      (rental) =>
        rental.status === "Pending" ||
        rental.status === "Confirmed" ||
        rental.status === "Active"
    );
  }

  return (
    <>
      {!loading ? (
        <div className="" style={{ position: "relative" }}>
          <div
            className="container py-2"
            style={{ position: "absolute", zIndex: "100" }}
          >
            <Button
              style={{ padding: "5px 10px", marginTop: "20px" }}
              className="dark-blue-bg"
            >
              <Link
                to="/"
                className="text-white"
                style={{ textDecoration: "none" }}
              >
                <i className="fa fa-arrow-left me-2"></i>
                Go Back
              </Link>
            </Button>
          </div>
          <Carousel style={{ height: "60vh" }}>
            {carData?.images?.length > 0 ? (
              carData.images.map((image, index) => (
                <Carousel.Item key={index}>
                  <img
                    className="d-block w-100 fixed-carousel-height-image"
                    src={image.url}
                    alt={`Car image ${index + 1}`}
                  />
                </Carousel.Item>
              ))
            ) : (
              <Carousel.Item>
                <img
                  className="d-block w-100"
                  src="/placeholder.jpg"
                  alt="No images available"
                />
              </Carousel.Item>
            )}
          </Carousel>
          <div className="container mt-3" style={{ position: "relative" }}>
            {error ? <Alert message={error} type="error" /> : <></>}
            <h1 className="dark-blue-text">
              {carData.brand} {carData.model} ({carData.year})
            </h1>

            <div className="mt-3 col-12 col-md-4 d-flex align-items-center justify-content-start gap-4 px-0">
              <div className="d-flex flex-column flex-md-row align-items-center gap-2">
                <i className="fa fa-gear fs-3" style={{ opacity: "0.8" }}></i>
                <h4 className="m-0 light-blue-text">{carData.transmission}</h4>
              </div>
              <div className="d-flex flex-column flex-md-row align-items-center gap-2">
                <i
                  className="fa fa-gauge-high fs-3"
                  style={{ opacity: "0.8" }}
                ></i>
                <h4 className="m-0 light-blue-text">{carData.mileage}</h4>
              </div>
              <div className="d-flex flex-column flex-md-row align-items-center gap-2">
                <i
                  className="fa fa-gas-pump fs-3"
                  style={{ opacity: "0.8" }}
                ></i>
                <h4 className="m-0 light-blue-text">{carData.fuel}</h4>
              </div>
            </div>

            <div className="row mt-4">
              <div className="col-12 col-md-8 p-3">
                <h4 className="border-bottom mb-3">Information</h4>
                <div className="row">
                  <div className="m-0 mb-3 fs-6 d-flex align-items-center gap-2">
                    <i
                      className="fa fa-money-bill-wave fs-4 me-2"
                      style={{ opacity: "0.8" }}
                    ></i>
                    <span className="fw-bold">
                      ₱{carData.pricePerDay} a day
                    </span>
                  </div>
                  <div className="m-0 mb-3 fs-6 d-flex align-items-center gap-2">
                    <i
                      className="fa fa-car fs-4 me-2"
                      style={{ opacity: "0.8" }}
                    ></i>
                    <span className="fw-bold">{carData.vehicleType}</span>
                  </div>
                  <div className="m-0 mb-3 fs-6 d-flex align-items-center gap-2">
                    <i
                      className="fa fa-users fs-4 me-2"
                      style={{ opacity: "0.8" }}
                    ></i>
                    <span className="fw-bold">
                      {carData.seatCapacity} Seat Capacity
                    </span>
                  </div>
                  <div className="m-0 mb-3 fs-6 d-flex align-items-center gap-2">
                    <i
                      className="fa fa-location fs-4 me-2"
                      style={{ opacity: "0.8" }}
                    ></i>
                    <span className="fw-bold">{carData.pickUpLocation}</span>
                  </div>

                  <div className="m-0 py-2 mt-4">
                    <h4 className="border-bottom">Description:</h4>{" "}
                    <p className="m-0">
                      {carData.description || "No description available"}
                    </p>
                  </div>
                  <div className="m-0 py-2 mt-4">
                    <h4 className="border-bottom">Terms and Conditions:</h4>{" "}
                    <p className="m-0">
                      {carData.termsAndConditions || "No Terms and Conditions"}
                    </p>
                  </div>
                  <p className="m-0 mt-4">
                    <h4 className="border-top mt-3 py-2">Owner</h4>{" "}
                    <div className="d-flex align-items-center gap-2">
                      <img
                        src={
                          carData.owner?.avatar?.url ||
                          "/images/default-image.jpg"
                        }
                        style={{
                          borderRadius: "50%",
                          objectFit: "cover",
                          width: "50px",
                          height: "50px",
                        }}
                        width="40"
                      />
                      <div className="d-flex flex-column">
                        <span className="fw-bold">
                          {carData.owner?.firstName} {carData.owner?.lastName}
                        </span>
                        <span>{carData.owner?.email}</span>
                      </div>
                    </div>
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-4 p-3">
                {getUser() ? (
                  carData.owner._id == getUser()._id ? (
                    <h3 className="text-warning fst-italic">
                      You cannot book your own car
                    </h3>
                  ) : isCarOnRental ? (
                    <h3>This car is currently on rental. Cannot Book Now.</h3>
                  ) : (
                    <Card
                      className="mt-3 p-3"
                      style={{ position: "sticky", top: "85px" }}
                    >
                      <h2>Book Now:</h2>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Box display="flex" flexDirection="column" gap={2}>
                          <DateTimePicker
                            label="Pick-up Date"
                            value={pickupDate}
                            onChange={handlePickupDateChange}
                            renderInput={(params) => <TextField {...params} />}
                            disablePast
                          />
                          <DateTimePicker
                            label="Return Date"
                            value={returnDate}
                            onChange={handleReturnDateChange}
                            renderInput={(params) => <TextField {...params} />}
                            disablePast
                            minDateTime={pickupDate}
                          />
                          <InputLabel
                            id="payment-mode-label"
                            className="p-0 m-0 mt-2"
                          >
                            Mode of Payment
                          </InputLabel>
                          <Select
                            labelId="payment-mode-label"
                            id="payment-mode"
                            value={paymentMode}
                            onChange={(e) => {
                              handleChange(e);
                              calculateRental()
                            }}
                            label="Mode of Payment"
                          >
                            <MenuItem value="" selected>
                              <em>Select Payment</em>
                            </MenuItem>
                            <MenuItem value="Credit Card">Credit Card</MenuItem>
                            <MenuItem value="GCash">GCash</MenuItem>
                            <MenuItem value="Cash" selected>
                              Cash
                            </MenuItem>
                          </Select>
                          <Button
                            variant="contained"
                            color="primary"
                            className="btn-primary"
                            onClick={handleDialogOpen}
                          >
                            Book
                          </Button>
                          <div className="">
                            <div className="d-flex align-items-center justify-content-between">
                              <p className="fs-5 m-0">Per day</p>
                              <p className="fs-5 fw-bold m-0">
                                ₱{carData.pricePerDay}
                              </p>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <p className="fs-5 m-0">Rental Days</p>
                              <p className="fs-5 fw-bold m-0">
                                {rentalDays || 0}
                              </p>
                            </div>
                            <div className="d-flex align-items-center justify-content-between border-top mt-2 py-1">
                              <p className="fs-5 m-0 fw-bold">Total</p>
                              <p className="fs-5 fw-bold m-0">
                                ₱{(rentalDays || 0) * carData.pricePerDay}
                              </p>
                            </div>
                          </div>
                        </Box>
                      </LocalizationProvider>
                    </Card>
                  )
                ) : (
                  <>
                    <h3>You are not yet logged in to book this vehicle</h3>
                    <Link to="/login" className="mt-3">
                      <Button className="btn-primary">Login here</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {carRating.length > 0 && (
              <div className="mt-5">
                <h3 className="pb-3 dark-blue-text">Car Rating</h3>

                {carRating.map((rating) => (
                  <>
                    <div className="row py-3 ">
                      <div class="col-12 col-md-4 row gap-2 pb-3 border-bottom">
                        <div className="col-12 d-flex align-items-center justify-content-start gap-2">
                          <div className="">
                            <img
                              src={`${rating.renter.avatar?.url || "/images/default-image.jpg"}`}
                              alt="profile"
                              style={{
                                borderRadius: "50%",
                                width: "60px",
                                height: "60px",
                              }}
                            />
                          </div>
                          <div className="d-flex flex-column">
                            <div>{rating.renter.firstName} *</div>
                            <div>
                              <Rating
                                value={rating.rating}
                                precision={0.5}
                                readOnly
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          {filterComment(rating.comment) ? (
                            <></>
                          ) : (
                            <span style={{ color: "red", fontWeight: "bold" }}>
                              Warning: This comment contains inappropriate
                              language.
                            </span>
                          )}
                          {rating.comment}
                        </div>
                      </div>
                      <div class="col-12 col-md-4 pb-3 border-bottom">
                        <Carousel>
                          {rating.images.length > 0 ? (
                            rating.images.map((image, idx) => (
                              <Carousel.Item key={idx}>
                                <CardMedia
                                  component="img"
                                  alt={`Review Image ${idx + 1}`}
                                  height="140"
                                  image={image.url}
                                  title={`Review Image ${idx + 1}`}
                                />
                              </Carousel.Item>
                            ))
                          ) : (
                            <Carousel.Item>
                              <CardMedia
                                component="img"
                                alt={`No Review Image`}
                                height="140"
                                image={"/default-image.jpg"}
                              />
                            </Carousel.Item>
                          )}
                        </Carousel>
                      </div>
                    </div>
                  </>
                ))}
              </div>
            )}
            {carRentals.length > 0 && (
              <div className="mt-5 row">
                <h3 className="dark-blue-text col-12">Car Rentals</h3>
                <Table striped bordered hover className="col-8">
                  <thead>
                    <tr>
                      <th>Rental ID</th>
                      <th>Renter</th>
                      <th>Pick-Up Date</th>
                      <th>Return Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carRentals.map((rental) => (
                      <tr key={rental._id}>
                        <td>{rental._id}</td>
                        <td>{rental.renter.firstName} ***</td>
                        <td>{new Date(rental.pickUpDate).toLocaleString()}</td>
                        <td>{new Date(rental.returnDate).toLocaleString()}</td>
                        <td>{rental.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

<Dialog open={openDialog} onClose={handleDialogClose} fullWidth={true} maxWidth="lg">
      <div className="row p-0 m-0">
        <div className="col-12 col-md-6 p-0 m-0">
          <DialogTitle className="w-100 text-start fs-3 fw-bold dark-blue-text ">
            Confirm Your Booking
          </DialogTitle>
          
      <DialogContent className="w-100 row px-4">
      <Typography variant="h6" className="border-bottom mb-2">
            <strong>Car</strong>
          </Typography>
          <Typography variant="body1 mb-2">
            <strong>
              <i className="fa fa-car"></i>
            </strong>{" "}
            {carData.brand} {carData.model} ({carData.year})
          </Typography>
          <Typography variant="body1 mb-2">
            <strong>
              <i className="fa fa-car-side"></i>
            </strong>{" "}
            {carData.vehicleType}
          </Typography>
          <Typography variant="body1 mb-2">
            <strong>
              <i className="fa fa-users"></i>
            </strong>{" "}
            {carData.seatCapacity} Capacity
          </Typography>

          <Typography variant="h6" className="border-bottom mt-4 mb-2">
            <strong>Owner</strong>
          </Typography>
          <Typography variant="body3 mb-2">
            <strong>
              <i className="fa fa-location-dot fs-5 me-2"></i>
            </strong>{" "}
            Taguig City
          </Typography>

          <div>
            <Typography variant="body3 mb-2">
              <strong>
                <i className="fa fa-user fs-5 me-2"></i>
              </strong>{" "}
              {carData.owner.firstName}{" "}{carData.owner.lastName}
            </Typography>
            <Typography variant="body3 mb-2">
              <strong>
                <i className="fa fa-envelope fs-5 me-2"></i>
              </strong>{" "}
              {carData.owner.email}
            </Typography>
            <Typography variant="body3 mb-2">
            <strong className="d-flex gap-2 align-items-center mt-3">
              <span>Description</span>
            </strong>{" "}
            {carData.description}
          </Typography>
          </div>
      </DialogContent>
        </div>
        <div className="col-12 col-md-6 p-0 p-4 dark-blue-bg text-white">
        <Typography variant="h5" className="border-bottom mb-3 pb-2">
            <strong>Booking</strong>
          </Typography>
          <div
            className="d-flex justify-content-between flex-column"
            style={{height: "85%" }}
          >
            <div>
              <Typography
                variant="body1"
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <strong>Pick-up Date:</strong> <span>{pickupDate?.toLocaleString()}</span>
              </Typography>
              <Typography
                variant="body1"
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <strong>Return Date:</strong> <span>{returnDate?.toLocaleString()}</span>
              </Typography>
              <Typography
                variant="body1"
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <strong>Price Per Day:</strong> <span>₱{carData.pricePerDay}</span>
              </Typography>
              <Typography
                variant="body1"
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <strong>Rental Day/s:</strong> <span>{rentalDays}</span>
              </Typography>
            </div>
            <div className="border-top mt-4 pt-3">
              <Typography
                variant="body1"
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <strong>Total Payment:</strong> <strong>₱{rentalDays * carData.pricePerDay}</strong>
              </Typography>
              <Typography
                variant="body1"
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <strong>Mode of Payment:</strong> <strong>{paymentMode}</strong>
              </Typography>
            </div>

          </div>
          
        </div>
        <div className="row px-0 m-0">
          <div className="col-12 col-md-6">
            {" "}
          </div>
          <DialogActions className="light-blue-bg col-12 col-md-6  dark-blue-bg text-white">
          <Button onClick={handleDialogClose} className="fw-bold fs-6 text-danger">
            Cancel
          </Button>
          <Button onClick={handleConfirmBooking} className="text-white fw-bold fs-6">
            Confirm
          </Button>
        </DialogActions>    

        </div>
      </div>
  
    </Dialog>

          </div>
        </div>
      ) : (
        <LoadingSpinner message="loading..." />
      )}
    </>
  );
};

export default Car;
