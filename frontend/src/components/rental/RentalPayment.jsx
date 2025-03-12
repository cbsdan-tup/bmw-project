import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Input,
  FormHelperText,
} from "@mui/material";

const RentalPayment = ({ openPaymentDialog, onPaymentDialogClose, totalPayment, paymentMode }) => {
  const [creditCardInfo, setCreditCardInfo] = useState({
    cardNumber: "",
    cardHolderName: "",
    expiryDate: "",
    cvv: "",
  });
  const [gcashNumber, setGcashNumber] = useState("");

  const handleCreditCardChange = (e) => {
    const { name, value } = e.target;
    setCreditCardInfo((prevInfo) => ({
      ...prevInfo,
      [name]: value,
    }));
  };

  const handleGcashChange = (e) => {
    setGcashNumber(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (paymentMode === "CreditCard") {
      console.log("Credit Card Info:", creditCardInfo);
    } else if (paymentMode === "GCash") {
      console.log("GCash Number:", gcashNumber);
    }
    // Add your payment processing logic here
    onClose();
  };

  return (
    <Dialog open={openPaymentDialog} onClose={onPaymentDialogClose} maxWidth="lg" fullWidth>
      <DialogTitle>Payment Details</DialogTitle>
      <DialogContent>
        <p>Total Payment: ₱{totalPayment}</p>
        <form onSubmit={handleSubmit}>
          {paymentMode === "CreditCard" && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel htmlFor="cardNumber">Card Number</InputLabel>
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    value={creditCardInfo.cardNumber}
                    onChange={handleCreditCardChange}
                  />
                  <FormHelperText>Enter your credit card number</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel htmlFor="cardHolderName">
                    Card Holder Name
                  </InputLabel>
                  <Input
                    id="cardHolderName"
                    name="cardHolderName"
                    value={creditCardInfo.cardHolderName}
                    onChange={handleCreditCardChange}
                  />
                  <FormHelperText>Enter the name on the card</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel htmlFor="expiryDate">Expiry Date</InputLabel>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    value={creditCardInfo.expiryDate}
                    onChange={handleCreditCardChange}
                    placeholder="MM/YY"
                  />
                  <FormHelperText>Enter the expiry date</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel htmlFor="cvv">CVV</InputLabel>
                  <Input
                    id="cvv"
                    name="cvv"
                    value={creditCardInfo.cvv}
                    onChange={handleCreditCardChange}
                  />
                  <FormHelperText>Enter the CVV code</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {paymentMode === "GCash" && (
            <FormControl fullWidth required>
              <InputLabel htmlFor="gcashNumber">GCash Number</InputLabel>
              <Input
                id="gcashNumber"
                value={gcashNumber}
                onChange={handleGcashChange}
              />
              <FormHelperText>Enter your GCash number</FormHelperText>
            </FormControl>
          )}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onPaymentDialogClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary">
          Submit Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RentalPayment; 
