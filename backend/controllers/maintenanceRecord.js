const MaintenanceRecord = require('../models/MaintenanceRecord.js');
const Cars = require('../models/Cars.js');
const cloudinary = require('cloudinary')

exports.createRecord = async (req, res) => {
  try {
      if (!req.files || req.files.length === 0) {
          return res.status(400).json({
              success: false,
              message: 'No images uploaded.'
          });
      }

      let imagesLinks = [];

      for (let file of req.files) {
          try {
              const result = await cloudinary.v2.uploader.upload(file.path, {
                  folder: 'MaintenanceRecords',
                  width: 150,
                  crop: 'scale'
              });

              imagesLinks.push({
                  public_id: result.public_id,
                  url: result.secure_url
              });
          } catch (error) {
              console.log('Error uploading to Cloudinary:', error);
              return res.status(500).json({
                  success: false,
                  message: 'Error uploading images to Cloudinary',
                  error: error.message
              });
          }
      }

      req.body.images = imagesLinks;

    const { car, maintenanceDate, description, cost } = req.body;

    const newRecord = new MaintenanceRecord({
      car,
      maintenanceDate,
      description,
      cost,
      images: imagesLinks,
      createdAt: new Date(),
    });

    const savedRecord = await newRecord.save();
    res.status(201).json({message: "Successfully created maintenance record!", savedRecord});
  } catch (error) {
    res.status(400).json({ message: 'Failed to create record', error: error.message });
  }
};

exports.getAllRecords = async (req, res) => {
  try {
    const records = await MaintenanceRecord.find().populate('car');
    res.status(200).json({message: "Succesfully fetched records", records});
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve records', error: error.message });
  }
};

exports.getRecordDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await MaintenanceRecord.findById(id).populate('car');

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve record', error: error.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { car, maintenanceDate, description, cost } = req.body;

    let recordImg = await MaintenanceRecord.findById(id);
    if (!recordImg) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < recordImg.images.length; i++) {
        await cloudinary.v2.uploader.destroy(recordImg.images[i].public_id);
      }

      let imagesLinks = [];
      for (let file of req.files) {
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: 'MaintenanceRecords',
          width: 150,
          crop: 'scale'
        });
        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url
        });
      }

      req.body.images = imagesLinks; 
    }

    const updatedRecord = await MaintenanceRecord.findByIdAndUpdate(
      id,
      { car, maintenanceDate, description, cost, images: req.body.images || recordImg.images },
      { new: true, runValidators: true }
    );

    res.status(200).json({message: "Successfully updated maintenance record!", updatedRecord});
  } catch (error) {
    res.status(400).json({ message: 'Failed to update record', error: error.message });
  }
};


exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await MaintenanceRecord.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.status(200).json({ message: 'Record deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete record', error: error.message });
  }
};

exports.getMaintenanceCostVsRentalIncome = async (req, res) => {
  try {
      const cars = await Cars.find();

      const carData = await Promise.all(
          cars.map(async (car) => {
              // Calculate total maintenance cost for the car
              const maintenanceRecords = await MaintenanceRecord.find({ car: car._id });
              const totalMaintenanceCost = maintenanceRecords.reduce((total, record) => total + record.cost, 0);

              // Calculate total rental income for the car
              const rentals = await Rental.find({ car: car._id, status: 'Returned' });
              const totalRentalIncome = rentals.reduce((total, rental) => {
                  const daysRented = Math.ceil(
                      (new Date(rental.returnDate) - new Date(rental.pickUpDate)) / (1000 * 60 * 60 * 24)
                  );
                  return total + (daysRented * car.pricePerDay);
              }, 0);

              return {
                  carModel: car.model, // Assuming `model` is a field in the Car schema
                  totalMaintenanceCost,
                  totalRentalIncome,
              };
          })
      );

      res.status(200).json(carData);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to fetch maintenance cost vs. rental income data' });
  }
};
