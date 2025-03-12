import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Table } from "react-bootstrap";
import LoadingSpinner from "../layout/LoadingSpinner";
import Alert from "../layout/Alert";
import { getToken, getUser, formatDate, succesMsg } from "../../utils/helper";
import { Link } from "react-router-dom";
import RentalInfoDialog from "../rental/RentalInfoDialog";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import CarRatingDialog from "../cars/CarRatingDialog";

const MyRentals = () => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRental, setSelectedRental] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelRentalId, setCancelRentalId] = useState(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingMode, setRatingMode] = useState("");

  const handleViewRental = (rental) => {
    const rentalDays = formatDate(
      new Date(rental.pickUpDate),
      new Date(rental.returnDate)
    );
    setSelectedRental({ ...rental, rentalDays });
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedRental(null);
  };

  const handleConfirmBooking = () => {
    console.log("Booking confirmed", selectedRental);
    setOpenDialog(false);
  };

  const handleCancelRental = (rentalId) => {
    console.log(rentalId);
    setCancelRentalId(rentalId);
    setShowCancelConfirm(true);
  };

  const confirmCancelRental = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      };

      const response = await axios.put(
        `${import.meta.env.VITE_API}/rentals/${cancelRentalId}`,
        { status: "Canceled" },
        config
      );

      if (response.status >= 200 && response.status < 300) {
        setRentals((prevRentals) =>
          prevRentals.map((rental) =>
            rental._id === cancelRentalId
              ? { ...rental, status: "Cancelled" }
              : rental
          )
        );
        succesMsg("Rental was canceled");
      } else {
        setError("Failed to update rental status. Please try again.");
      }
    } catch (error) {
      setError("Error updating rental status. Please try again.");
    } finally {
      setShowCancelConfirm(false);
      setCancelRentalId(null);
    }
  };

  const handleAddRating = (rental) => {
    setSelectedRental(rental);
    setShowRatingDialog(true);
    setRatingMode("Add");
  };
  const handleViewRating = (rental) => {
    setSelectedRental(rental);
    setShowRatingDialog(true);
    setRatingMode("Edit");
  };

  const handleCloseRatingDialog = () => {
    setShowRatingDialog(false);
    setSelectedRental(null);
    setRatingMode("");
  };

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const userId = getUser()._id;

        setLoading(true);
        const config = {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        };

        const response = await axios.get(
          `${import.meta.env.VITE_API}/my-rentals/${userId}`,
          config
        );

        if (!response.data.message) {
          console.log(response.data);
          setRentals(response.data);
        }
      } catch (error) {
        setError("Error retrieving rentals. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, [showRatingDialog]);

  if (loading) {
    return (
      <div className="text-center">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  const reviewId = selectedRental?.reviews[0]?._id || null

  return (
    <div className="container py-3">
      {error && <Alert message={error} type="error" />}
      <h2>My Rentals</h2>
      {rentals.length === 0 ? (
        <>
          <Alert message="You have no rentals at the moment." type="success" />
          <h1>No Rentals</h1>
        </>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Car</th>
              <th>Pick-Up Date</th>
              <th>Return Date</th>
              <th>Status</th>
              <th>Price Per Day</th>
              <th>Discount Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rentals.map((rental) => (
              <tr key={rental._id}>
                <td>{rental._id}</td>
                <td>
                  <Link to={`/car/info/${rental.car?._id}`}>
                    {rental.car.brand} {rental.car.model}
                  </Link>
                </td>
                <td>{new Date(rental.pickUpDate).toLocaleString()}</td>
                <td>{new Date(rental.returnDate).toLocaleString()}</td>
                <td>{rental.status}</td>
                <td>₱{rental.car.pricePerDay}</td>
                <td>{rental.discountCode || "N/A"}</td>
                <td>
                  <Button
                    variant="primary"
                    onClick={() => handleViewRental(rental)}
                  >
                    View
                  </Button>
                  {rental.status === "Pending" ? (
                    <Button
                      variant="danger"
                      onClick={() => handleCancelRental(rental._id)}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <></>
                  )}
                  {rental.status === "Returned" ? (
                    rental.reviews &&
                    rental.reviews.some(
                      (review) => review.renter.toString() === getUser()._id
                    ) ? (
                      <Button
                        variant="warning"
                        onClick={() => handleViewRating(rental)}
                      >
                        View Rating
                      </Button>
                    ) : (
                      <Button
                        variant="warning"
                        onClick={() => handleAddRating(rental)}
                      >
                        Rate
                      </Button>
                    )
                  ) : (
                    <></> 
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {selectedRental && (
        <RentalInfoDialog
          open={openDialog}
          handleClose={handleDialogClose}
          handleConfirm={handleConfirmBooking}
          rentalData={selectedRental}
          rentalDays={selectedRental.rentalDays}
          paymentMode={selectedRental.paymentMode}
        />
      )}

      {selectedRental && (
        <CarRatingDialog
          showRatingDialog={showRatingDialog}
          handleCloseRatingDialog={handleCloseRatingDialog}
          rentalId={selectedRental._id}
          renterId={getUser()._id}
          mode={ratingMode}
          reviewId={reviewId}
        />
      )}

      <Dialog
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
      >
        <DialogTitle>Cancel Rental</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this rental?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelConfirm(false)} color="primary">
            No
          </Button>
          <Button onClick={confirmCancelRental} color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MyRentals;
