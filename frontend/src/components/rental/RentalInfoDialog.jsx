import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from '@mui/material';
import { calculateRentalDays } from '../../utils/helper';

const RentalInfoDialog = ({ open, handleClose, handleConfirm, rentalData, paymentMode }) => {
  const carData = rentalData.car;
  const { pickUpDate, returnDate } = rentalData;
  const rentalDays = calculateRentalDays(pickUpDate, returnDate)
  return (
    <Dialog open={open} onClose={handleClose} fullWidth={true} maxWidth="lg">
      <DialogTitle className="w-100 text-center fs-4 fw-bold">Rental Information</DialogTitle>
      <DialogContent className="w-100">
        <Typography variant="h6">
          <strong>Car:</strong> {carData.brand} {carData.model} ({carData.year})
        </Typography>
        <Typography variant="body2">
          <strong>Type:</strong> {carData.vehicleType}
        </Typography>
        <Typography variant="body2">
          <strong>Capacity:</strong> {carData.seatCapacity}
        </Typography>
        <Typography variant="body2">
          <strong>Fuel:</strong> {carData.fuel}
        </Typography>
        <Typography variant="body2">
          <strong>Transmission:</strong> {carData.transmission}
        </Typography>
        <hr />
        <Typography variant="body1">
          <strong>Status:</strong> {rentalData.status}
        </Typography>
        <Typography variant="body1">
          <strong>Pick-up Date:</strong> {new Date(pickUpDate).toLocaleString()}
        </Typography>
        <Typography variant="body1">
          <strong>Return Date:</strong> {new Date(returnDate).toLocaleString()}
        </Typography>
        <Typography variant="body1">
          <strong>Price Per Day:</strong> ₱{carData.pricePerDay}
        </Typography>
        <Typography variant="body1">
          <strong>Rental Day/s:</strong> {rentalDays}
        </Typography>
        <Typography variant="body1">
          <strong>Payment:</strong> ₱{rentalDays * carData.pricePerDay}
        </Typography>
        <Typography variant="body1">
          <strong>Mode of Payment:</strong> {paymentMode || "GCash"}
        </Typography>
        <hr />
        <Typography variant="body1">
          <strong>Renter:</strong> {rentalData.renter?.firstName} {rentalData.renter?.lastName}
        </Typography>
        <Typography variant="body1">
          <strong>Owner Email Address:</strong> {rentalData.renter?.email}
        </Typography>
        <hr />
        <Typography variant="body1">
          <strong>Owner:</strong> {carData.owner?.firstName} {carData.owner?.lastName}
        </Typography>
        <Typography variant="body1">
          <strong>Owner Email Address:</strong> {carData.owner.email}
        </Typography>
        <Typography variant="body1">
          <strong>Pick Up Location:</strong> {carData.pickUpLocation}
        </Typography>
        <Typography variant="body1">
          <strong>Terms and Conditions:</strong> {carData.termsAndConditions}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Exit
        </Button>
        <Button onClick={handleConfirm} color="primary">
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RentalInfoDialog;
