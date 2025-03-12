const mongoose = require("mongoose");
const { format } = require("date-fns");

const rentalSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cars",
    required: true,
  },

  renter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  pickUpDate: {
    type: Date,
    required: true,
    set: (val) => format(new Date(val), "yyyy-MM-dd HH:mm:ss"),
  },
  returnDate: {
    type: Date,
    required: true,
    set: (val) => format(new Date(val), "yyyy-MM-dd HH:mm:ss"),
  },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Active", "Returned", "Canceled"],
    required: true,
    default: "Pending",
  },
  paymentMethod: {
    type: String,
    enum: ["GCash", "Cash", "Credit Card"],
    required: true,
    default: "GCash"
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Refunded"],
    required: true,
    default: "Pending"
  },
  discountCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DiscountCode",
  },

}, { timestamps: true });

module.exports = mongoose.model("Rental", rentalSchema);
