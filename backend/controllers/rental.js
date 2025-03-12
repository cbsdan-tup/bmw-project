const Rental = require("../models/Rental");
const Review = require("../models/Review");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const Car = require("../models/Cars");
const sendNotification = require("../config/sendNotification");

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
    } = req.body;

    if (!car || !renter || !pickUpDate || !returnDate || !status) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const carOnRental = await isCarOnRental(car);
    if (carOnRental) {
      return res.status(400).json({ message: "Car is currently on rental." });
    }

    let rental = new Rental(req.body);
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
    const totalPayment = rentalDays * pricePerDay;

    const formattedPickUpDate = formatDate(pickUpDate);
    const formattedReturnDate = formatDate(returnDate);

    const rentalInfo = `
        <table border="1" cellpadding="10" cellspacing="0">
        <thead>
            <tr>
            <th colspan="2">Booking Details</th>
            </tr>
        </thead>
        <tbody>
            <tr>
            <td>Car</td>
            <td>${carDetails.brand} ${carDetails.model} (${
      carDetails.year
    })</td>
            </tr>
            <tr>
            <td>Type</td>
            <td>${carDetails.vehicleType}</td>
            </tr>
            <tr>
            <td>Capacity</td>
            <td>${carDetails.seatCapacity}</td>
            </tr>
            <tr>
            <td>Fuel</td>
            <td>${carDetails.fuel}</td>
            </tr>
            <tr>
            <td>Transmission</td>
            <td>${carDetails.transmission}</td>
            </tr>
            <tr>
            <td>Status</td>
            <td>${status}</td>
            </tr>
            <tr>
            <td>Pick-up Date</td>
            <td>${formattedPickUpDate}</td>
            </tr>
            <tr>
            <td>Return Date</td>
            <td>${formattedReturnDate}</td>
            </tr>
            <tr>
            <td>Price Per Day</td>
            <td>₱${pricePerDay}</td>
            </tr>
            <tr>
            <td>Rental Day/s</td>
            <td>${rentalDays}</td>
            </tr>
            <tr>
            <td>Payment</td>
            <td>₱${totalPayment}</td>
            </tr>
            <tr>
            <td>Mode of Payment</td>
            <td>${paymentMethod}</td>
            </tr>
            <tr>
            <td>Payment Status</td>
            <td>${paymentStatus}</td>
            </tr>
            <tr>
            <td>Owner</td>
            <td>${carDetails.owner?.firstName} ${carDetails.owner?.lastName}</td>
            </tr>
            <tr>
            <td>Owner Email Address</td>
            <td>${carDetails.owner?.email}</td>
            </tr>
            <tr>
            <td>Pick Up Location</td>
            <td>${carDetails.pickUpLocation}</td>
            </tr>
            <tr>
            <td>Terms and Conditions</td>
            <td>${carDetails.termsAndConditions || "N/A"}</td>
            </tr>
        </tbody>
        </table>
      `;

    const emailOptions = {
      email: renterDetails.email,
      subject: "BMW Bookings",
      message: `
          Dear ${renterDetails.firstName},\n\n
          Your booking for the car ${carDetails.brand} ${carDetails.model} (${carDetails.year}) has been confirmed.\n\n
          Booking Details:\n
          ${rentalInfo}\n
          Thank you for choosing BMW Rentals!\n
        `,
    };

    sendEmail(emailOptions).catch((emailError) => {
      console.error("Failed to send email:", emailError);
    });

    res.status(201).json({
      message: "Rental created successfully",
      rental,
      rentalDetails: rentalInfo,
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

    if (rental.renter && rental.renter.permissionToken) {
      const payload = {
        permissionToken: rental.renter.permissionToken,
        title: "BMW Rental Status Notification",
        body: `Hi! Your rental status of vehicle ${rental.car?.brand} ${rental.car?.model} has been ${rental.status}.`,
      };

      try {
        const notifResult = await sendNotification(payload);
        console.log("Notification sent:", notifResult);
      } catch (error) {
        console.error("Error sending notification:", error.message);
      }
    } else {
      console.log("No permission token found for renter.");
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

    // If no startDate or endDate is provided, default to the current year
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
      const dayKey = returnDate.toISOString().split("T")[0]; // Format as "YYYY-MM-DD"

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

    // If no sales data found, return zero data for the full range
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
      .populate("renter discountCode")
      .sort({ createdAt: -1 });

    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving rentals", error });
  }
};

const myRentals = async (req, res) => {
  try {
    const { renterId } = req.params;

    const rentals = await Rental.find({ renter: renterId })
      .populate({
        path: "car",
        populate: { path: "owner" },
      })
      .populate("renter discountCode")
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

        const averageRating = reviews.length
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length
          : null;

        return {
          ...rental.toObject(),
          reviews, 
          averageRating, 
        };
      })
    );

    res.json(rentalsWithReviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving rentals", error });
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
      .populate("discountCode")
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
      .populate("renter discountCode")
      .sort({ createdAt: -1 });
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }
    res.json(rental);
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
      .populate("renter discountCode")
      .sort({ createdAt: -1 });

    if (rentals.length === 0) {
      return res.status(404).json({ message: "No rentals found for this car" });
    }

    res.json(rentals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving rentals", error });
  }
};

const getMonthlyIncome = async (req, res) => {
  try {
      const rentals = await Rental.find({ status: 'Returned' })
          .populate('car', 'pricePerDay model');

      if (rentals.length === 0) {
          return res.status(200).json({ message: 'No transactions found', incomeData: [] });
      }

      const monthlyIncome = {};

      rentals.forEach(rental => {
          const daysRented = Math.ceil(
              (new Date(rental.returnDate) - new Date(rental.pickUpDate)) / (1000 * 60 * 60 * 24)
          );
          const totalIncome = daysRented * rental.car.pricePerDay;
          const estimatedIncome = totalIncome * 0.15; 

          const rentalDate = new Date(rental.pickUpDate);
          const monthYearKey = `${rentalDate.getFullYear()}-${rentalDate.getMonth() + 1}`; 

          if (!monthlyIncome[monthYearKey]) {
              monthlyIncome[monthYearKey] = { totalIncome: 0, month: monthYearKey, estimatedIncome: 0 };
          }

          monthlyIncome[monthYearKey].estimatedIncome += estimatedIncome; 
      });

      const incomeDataArray = Object.values(monthlyIncome).map(({ estimatedIncome, month }) => ({
          estimatedIncome,
          month,
      }));

      res.status(200).json(incomeDataArray);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to fetch income data' });
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
};
