const Rental = require("../models/Rental");
const Review = require("../models/Review");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const Car = require("../models/Cars");
const sendNotification = require("../config/sendNotification");
const { sendExpoNotifications } = require("../utils/expoNotifications");

const isCarOnRental = async (carId) => {
  try {
    const statuses = ["Pending", "Confirmed", "Active"];
    const rental = await Rental.findOne({
      car: carId,
      status: { $in: statuses },
    });
    return rental ? true : false;
  } catch (error) {
    console.error("Error checking car rental status:", error);
    throw new Error("Error checking car rental status");
  }
};

const calculateRentalDays = (pickUpDate, returnDate) => {
  if (!pickUpDate || !returnDate) {
    return 0;
  }
  const pickUp = new Date(pickUpDate);
  const returnD = new Date(returnDate);
  const timeDiff = Math.abs(returnD - pickUp);
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return diffDays;
};

const formatDate = (dateStr) => {
  const dateObj = new Date(dateStr);

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  const formattedDate = dateObj.toLocaleString("en-US", options);
  const [datePart, timePart] = formattedDate.split(", ");
  return `${datePart.replace(/\//g, "-")} ${timePart}`;
};

const createRent = async (req, res) => {
  try {
    const {
      car,
      renter,
      pickUpDate,
      returnDate,
      status,
      paymentMethod,
      paymentStatus,
      discount,
      originalAmount,
      finalAmount
    } = req.body;

    if (!car || !renter || !pickUpDate || !returnDate || !status) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const carOnRental = await isCarOnRental(car);
    if (carOnRental) {
      return res.status(400).json({ message: "Car is currently on rental." });
    }

    let rental = new Rental({
      car,
      renter,
      pickUpDate,
      returnDate,
      status,
      paymentMethod,
      paymentStatus,
      discount,
      originalAmount,
      finalAmount
    });
    
    const carDetails = await Car.findById(car).populate("owner");
    const renterDetails = await User.findById(renter);

    const validationError = rental.validateSync();
    if (validationError) {
      const errorsArray = Object.keys(validationError.errors).map((key) => ({
        field: key,
        message: validationError.errors[key].message,
      }));
      return res
        .status(400)
        .json({ message: "Validation errors", errors: errorsArray });
    }

    let rentalStatus = status;

    if (!carDetails || !carDetails.isActive) {
      return res
        .status(400)
        .json({ message: "Car is not active. Cannot rent now" });
    }
    if (carDetails.isAutoApproved == true) {
      rentalStatus = "Confirmed";
    }

    if (!carDetails || !renterDetails) {
      return res.status(400).json({ message: "Car or Renter not found" });
    }

    rental.status = rentalStatus;
    await rental.save();

    const rentalDays = calculateRentalDays(pickUpDate, returnDate);
    const pricePerDay = carDetails.pricePerDay;
    const calculatedTotalPayment = rentalDays * pricePerDay;
    
    const totalPayment = finalAmount || calculatedTotalPayment;

    let discountInfo = '';
    if (discount && discount.code) {
      discountInfo = `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Discount Applied</td>
          <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;"><span style="color: #0066B1; font-weight: bold;">${discount.code}</span> (${discount.discountPercentage}%)</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Discount Amount</td>
          <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">₱${discount.discountAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Original Amount</td>
          <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333; text-decoration: line-through;">₱${(originalAmount || calculatedTotalPayment).toLocaleString()}</td>
        </tr>
      `;
    }

    const formattedPickUpDate = formatDate(pickUpDate);
    const formattedReturnDate = formatDate(returnDate);

    const rentalInfo = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>BMW Rental Confirmation</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { 
          font-family: 'Roboto', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .email-header {
          background-color: #0066B1;
          padding: 20px;
          text-align: center;
        }
        .email-logo {
          width: 180px;
          height: auto;
        }
        .email-title {
          color: #ffffff;
          font-size: 24px;
          margin-top: 10px;
          margin-bottom: 0;
        }
        .email-subtitle {
          color: #ffffff;
          font-size: 16px;
          margin-top: 5px;
          font-weight: 300;
        }
        .email-body {
          padding: 30px 20px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
        }
        .booking-details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .booking-details-table th {
          background-color: #0066B1;
          color: #ffffff;
          padding: 12px;
          text-align: left;
          font-weight: 500;
        }
        .booking-details-table td {
          padding: 12px;
          border-bottom: 1px solid #E1E1E1;
          color: #333333;
        }
        .section-title {
          background-color: #F2F2F2;
          padding: 10px 12px;
          font-weight: 500;
          color: #0066B1;
        }
        .total-row td {
          font-weight: bold;
          font-size: 18px;
          background-color: #F8F8F8;
        }
        .price-value {
          color: #0066B1;
          font-weight: bold;
        }
        .email-footer {
          background-color: #333333;
          color: #ffffff;
          padding: 20px;
          text-align: center;
          font-size: 14px;
        }
        .footer-links {
          margin-bottom: 10px;
        }
        .footer-links a {
          color: #ffffff;
          text-decoration: none;
          margin: 0 10px;
        }
        .car-image {
          width: 100%;
          height: auto;
          margin-bottom: 20px;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1 class="email-title">Booking Confirmation</h1>
          <p class="email-subtitle">Borrow My Wheels Rentals</p>
        </div>
        
        <div class="email-body">
          <p class="greeting">Dear ${renterDetails.firstName},</p>
          
          <p>Thank you for choosing <strong>BMW Rentals</strong>! Your booking has been confirmed. Below are the details of your reservation:</p>
                    
          <table class="booking-details-table">
            <thead>
              <tr>
                <th colspan="2">Booking Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="2" class="section-title">Car Information</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Car</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;"><strong>${carDetails.brand} ${carDetails.model}</strong> (${carDetails.year})</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Type</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${carDetails.vehicleType}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Capacity</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${carDetails.seatCapacity} Seats</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Fuel</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${carDetails.fuel}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Transmission</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${carDetails.transmission}</td>
              </tr>
              
              <tr>
                <td colspan="2" class="section-title">Reservation Details</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Status</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;"><span style="background-color: ${status === 'Confirmed' ? '#28a745' : '#FFC107'}; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${status}</span></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Pick-up Date</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${formattedPickUpDate}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Return Date</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${formattedReturnDate}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Pick Up Location</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${carDetails.pickUpLocation}</td>
              </tr>
              
              <tr>
                <td colspan="2" class="section-title">Payment Information</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Price Per Day</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">₱${pricePerDay.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Rental Day/s</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${rentalDays}</td>
              </tr>
              ${discountInfo}
              <tr class="total-row">
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1;">Total Payment</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1;" class="price-value">₱${totalPayment.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Mode of Payment</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Payment Status</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;"><span style="background-color: ${paymentStatus === 'Paid' ? '#28a745' : '#FFC107'}; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${paymentStatus}</span></td>
              </tr>
              
              <tr>
                <td colspan="2" class="section-title">Owner Information</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Owner</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${carDetails.owner?.firstName} ${carDetails.owner?.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">Owner Email Address</td>
                <td style="padding: 12px; border-bottom: 1px solid #E1E1E1; color: #333333;">${carDetails.owner?.email}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="background-color: #F2F2F2; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #0066B1;">Terms and Conditions</h3>
            <p style="margin-bottom: 0;">${carDetails.termsAndConditions || "N/A"}</p>
          </div>
          
          <p>If you have any questions or need to make changes to your reservation, please contact us or the car owner directly.</p>
          
          <p>We wish you a pleasant driving experience!</p>
          
          <p>Best regards,<br>
          <strong>BMW Rentals Team</strong></p>
        </div>
        
        <div class="email-footer">
          <div class="footer-links">
            <a href="#">Privacy Policy</a> | 
            <a href="#">Terms of Service</a> | 
            <a href="#">Contact Us</a>
          </div>
          <p>&copy; ${new Date().getFullYear()} Borrow My Wheels (BMW) Rentals. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailOptions = {
      email: renterDetails.email,
      subject: `BMW Rentals - Booking Confirmation #${rental._id.toString().substring(0, 8)}`,
      message: rentalInfo,
      html: true
    };

    sendEmail(emailOptions).catch((emailError) => {
      console.error("Failed to send email:", emailError);
    });

    // Log the full rental object to help debug
    console.log('Created rental:', JSON.stringify(rental));

    // Make sure we return the rental in a consistent way
    res.status(201).json({
      success: true,
      message: "Rental created successfully",
      rental,
      booking: {
        _id: rental._id.toString() 
      }
    });
  } catch (error) {
    console.error("Error creating rental:", error);
    res.status(500).json({ message: "Error creating rental", error });
  }
};

const updateRent = async (req, res) => {
  try {
    const { id } = req.params;
    const rental = await Rental.findByIdAndUpdate(id, req.body, {
      new: true,
    }).populate("renter car");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    console.log("Rental:", rental);

    // Check if renter exists and has push tokens
    if (rental.renter) {
      if (rental.renter.pushTokens && rental.renter.pushTokens.length > 0) {
        try {
          console.log(`Sending push notification to renter ${rental.renter._id} with ${rental.renter.pushTokens.length} tokens`);
          
          // Use the sendExpoNotifications function to send notifications
          const tickets = await sendExpoNotifications({
            tokens: rental.renter.pushTokens,
            title: "BMW Rental Status Notification",
            body: `Hi! Your rental status of vehicle ${rental.car?.brand} ${rental.car?.model} has been ${rental.status}`,
            data: { 
              rentalId: rental._id.toString(),
              status: rental.status,
              type: 'rentalUpdate',
              navigation: {
                screen: 'ProfileTab',
                params: {
                  screen: 'BookingDetails',
                  params: {
                    booking: {
                      _id: rental._id.toString()
                    }
                  }
                }
              }
            },
          });
          
          console.log(`Push notification result: ${tickets.length} tickets created`);
        } catch (error) {
          console.error("Error sending push notification:", error.message);
        }
      } else {
        console.log(`No push tokens available for renter ${rental.renter._id}`);
      }
    } else {
      console.log("No renter information found for this rental.");
    }

    res.json({ message: "Rental updated successfully", rental });
  } catch (error) {
    console.error("Error updating rental:", error.message);
    res
      .status(500)
      .json({ message: "Error updating rental", error: error.message });
  }
};

const deleteRent = async (req, res) => {
  try {
    const { id } = req.params;
    const rental = await Rental.findByIdAndDelete(id);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }
    res.json({ message: "Rental deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting rental", error });
  }
};

const calculateSalesChart = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const currentDate = new Date();
    const startOfRange = startDate
      ? new Date(startDate)
      : new Date(currentDate.getFullYear(), 0, 1);
    const endOfRange = endDate
      ? new Date(endDate)
      : new Date(currentDate.getFullYear(), 11, 31);

    const rentals = await Rental.find({
      returnDate: { $gte: startOfRange, $lte: endOfRange },
      status: "Returned",
    }).populate("car");

    const salesData = rentals.reduce((acc, rental) => {
      const returnDate = rental.returnDate;
      const dayKey = returnDate.toISOString().split("T")[0];

      const totalPrice =
        rental.car.pricePerDay *
        calculateRentalDays(rental.pickUpDate, rental.returnDate);

      if (!acc[dayKey]) {
        acc[dayKey] = { day: dayKey, sales: 0 };
      }
      acc[dayKey].sales += totalPrice;

      return acc;
    }, {});

    const salesChart = Object.values(salesData).sort(
      (a, b) => new Date(a.day) - new Date(b.day)
    );

    const daysInRange = [];
    for (
      let d = new Date(startOfRange);
      d <= endOfRange;
      d.setDate(d.getDate() + 1)
    ) {
      const dayKey = d.toISOString().split("T")[0];
      if (!salesData[dayKey]) {
        daysInRange.push({ day: dayKey, sales: 0 });
      } else {
        daysInRange.push(salesData[dayKey]);
      }
    }

    return res.status(200).json({ salesChart: daysInRange });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return res
      .status(500)
      .json({ message: "Server error, please try again later" });
  }
};
const top3CarsController = async (req, res) => {
  try {
    const rentals = await Rental.find({ status: "Returned" }).populate("car");

    const carRentalCount = {};

    rentals.forEach((rental) => {
      const carId = rental.car._id.toString();
      if (!carRentalCount[carId]) {
        carRentalCount[carId] = {
          car: rental.car,
          count: 0,
          carName: `${rental.car.brand} ${rental.car.model}`,
        };
      }
      carRentalCount[carId].count++;
    });

    const carArray = Object.values(carRentalCount);

    carArray.sort((a, b) => b.count - a.count);

    const top3Cars = carArray.slice(0, 3);

    return res.status(200).json({ top3Cars });
  } catch (error) {
    console.error("Error fetching top 3 cars:", error);
    return res
      .status(500)
      .json({ message: "Server error, please try again later" });
  }
};

const getAllRentDetails = async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate({
        path: "car",
        populate: { path: "owner" },
      })
      .populate("renter")
      .sort({ createdAt: -1 });

    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving rentals", error });
  }
};

const myRentals = async (req, res) => {
  try {
    const { renterId } = req.params;

    if (renterId && renterId.length !== 24) {
      const user = await User.findOne({ firebaseUID: renterId });

      if (!user) {
        return res.status(404).json({
          message: "User not found with the provided ID",
        });
      }

      const rentals = await Rental.find({ renter: user._id })
        .populate({
          path: "car",
          populate: { path: "owner" },
        })
        .populate("renter")
        .sort({ createdAt: -1 });

      if (rentals.length === 0) {
        return res
          .status(200)
          .json({ message: "No rentals found for this user" });
      }

      const rentalsWithReviews = await Promise.all(
        rentals.map(async (rental) => {
          const reviews = await Review.find({
            rental: rental._id,
            renter: user._id,
          });

          const hasReview = reviews.length > 0;
          const averageRating = reviews.length
            ? reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length
            : null;

          return {
            ...rental.toObject(),
            reviews,
            averageRating,
            hasReview,
          };
        })
      );

      res.json(rentalsWithReviews);
    } else {
      const rentals = await Rental.find({ renter: renterId })
        .populate({
          path: "car",
          populate: { path: "owner" },
        })
        .populate("renter")
        .sort({ createdAt: -1 });

      if (rentals.length === 0) {
        return res
          .status(200)
          .json({ message: "No rentals found for this user" });
      }

      const rentalsWithReviews = await Promise.all(
        rentals.map(async (rental) => {
          const reviews = await Review.find({
            rental: rental._id,
            renter: renterId,
          });

          const hasReview = reviews.length > 0;
          const averageRating = reviews.length
            ? reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length
            : null;

          return {
            ...rental.toObject(),
            reviews,
            averageRating,
            hasReview,
          };
        })
      );

      res.json(rentalsWithReviews);
    }
  } catch (error) {
    console.error("Error in myRentals:", error);
    res
      .status(500)
      .json({ message: "Error retrieving rentals", error: error.message });
  }
};

const myCarRental = async (req, res) => {
  try {
    const { ownerId } = req.params;

    const rentals = await Rental.find()
      .populate({
        path: "car",
        match: { owner: ownerId },
        populate: {
          path: "owner",
        },
      })
      .populate("renter")
      .sort({ createdAt: -1 });

    const filteredRentals = rentals.filter(
      (rental) => rental.car && rental.car.owner
    );

    if (filteredRentals.length === 0) {
      return res
        .status(200)
        .json({ message: "No rentals found for this user" });
    }

    res.json(filteredRentals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving rentals", error });
  }
};

const getRentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const rental = await Rental.findById(id)
      .populate({
        path: "car",
        populate: { path: "owner" },
      })
      .populate("renter")
      .sort({ createdAt: -1 });
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }
    
    // Fetch reviews for this rental
    const reviews = await Review.find({ rental: rental._id });
    
    // Calculate if there's a review and the average rating
    const hasReview = reviews.length > 0;
    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;
    
    // Combine rental with review information
    const rentalWithReviews = {
      ...rental.toObject(),
      reviews,
      hasReview,
      averageRating
    };
    
    res.json(rentalWithReviews);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving rental", error });
  }
};

const getRentalsByCarId = async (req, res) => {
  try {
    const { carId } = req.params;

    const rentals = await Rental.find({ car: carId })
      .populate({
        path: "car",
        populate: { path: "owner" },
      })
      .populate("renter")
      .sort({ createdAt: -1 });

    if (rentals.length === 0) {
      return res.status(200).json([]);
    }

    res.json(rentals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving rentals", error });
  }
};

const getMonthlyIncome = async (req, res) => {
  try {
    const rentals = await Rental.find({ status: "Returned" }).populate(
      "car",
      "pricePerDay model"
    );

    if (rentals.length === 0) {
      return res
        .status(200)
        .json({ message: "No transactions found", incomeData: [] });
    }

    const monthlyIncome = {};

    rentals.forEach((rental) => {
      const daysRented = Math.ceil(
        (new Date(rental.returnDate) - new Date(rental.pickUpDate)) /
          (1000 * 60 * 60 * 24)
      );
      const totalIncome = daysRented * rental.car.pricePerDay;
      const estimatedIncome = totalIncome * 0.15;

      const rentalDate = new Date(rental.pickUpDate);
      const monthYearKey = `${rentalDate.getFullYear()}-${
        rentalDate.getMonth() + 1
      }`;

      if (!monthlyIncome[monthYearKey]) {
        monthlyIncome[monthYearKey] = {
          totalIncome: 0,
          month: monthYearKey,
          estimatedIncome: 0,
        };
      }

      monthlyIncome[monthYearKey].estimatedIncome += estimatedIncome;
    });

    const incomeDataArray = Object.values(monthlyIncome).map(
      ({ estimatedIncome, month }) => ({
        estimatedIncome,
        month,
      })
    );

    res.status(200).json(incomeDataArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch income data" });
  }
};

const checkCarRentalStatus = async (req, res) => {
  try {
    const { carId } = req.params;

    if (!carId) {
      return res.status(400).json({ message: "Car ID is required" });
    }

    const activeRentals = await Rental.find({
      car: carId,
      status: { $in: ["Pending", "Confirmed", "Active"] },
    });

    return res.status(200).json({
      success: true,
      isOnRental: activeRentals.length > 0,
      activeRentals: activeRentals.length,
      rentals: activeRentals.length > 0 ? activeRentals : [],
    });
  } catch (error) {
    console.error("Error checking car rental status:", error);
    res.status(500).json({
      message: "Error checking car rental status",
      error: error.message,
    });
  }
};

module.exports = {
  createRent,
  updateRent,
  deleteRent,
  getAllRentDetails,
  getRentDetails,
  myRentals,
  myCarRental,
  getRentalsByCarId,
  getMonthlyIncome,
  calculateSalesChart,
  top3CarsController,
  checkCarRentalStatus,
};
