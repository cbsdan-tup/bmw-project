import * as Yup from 'yup';

const carSchema = Yup.object().shape({
  isActive: Yup.boolean().required('This field is required'),
  isAutoApproved: Yup.boolean().required('This field is required'),
  model: Yup.string()
    .required('Model is required'),
  brand: Yup.string()
    .required('Brand is required'),
  year: Yup.number()
    .min(2009, 'Year must be at least 2009')
    .max(new Date().getFullYear(), `Year cannot be later than ${new Date().getFullYear()}`)
    .required('Year is required'),
  seatCapacity: Yup.number()
    .min(1, 'Seat Capacity must be at least 1')
    .required('Seat Capacity is required'),
  fuel: Yup.string()
    .oneOf(['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plugin Hybrid'], '{VALUE} is not a valid fuel type')
    .required('Fuel type is required'),
  mileage: Yup.number()
    .min(1, 'Mileage must be at least 1')
    .required('Mileage is required'),
  transmission: Yup.string()
    .oneOf(['Manual', 'Automatic'], '{VALUE} is not a valid transmission type')
    .required('Transmission is required'),
  displacement: Yup.number()
    .min(1, 'Displacement must be at least 1')
    .required('Displacement is required'),
  vehicleType: Yup.string()
    .oneOf(['Sedan', 'SUV', 'Sport Car'], '{VALUE} is not a valid vehicle type')
    .required('Vehicle type is required'),
  pricePerDay: Yup.number()
    .min(1, 'Price per day must be at least 1')
    .required('Price per day is required'),
  description: Yup.string()
    .max(255, 'Description cannot exceed 255 characters')
    .required('Description is required'),
  termsAndConditions: Yup.string()
    .max(255, 'Terms and conditions cannot exceed 255 characters')
    .required('Terms and Conditions are required'),
  pickUpLocation: Yup.string()
    .max(255, 'Pickup location cannot exceed 255 characters')
    .required('Pick Up Location is required'),
  owner: Yup.string()
    .required('Owner is required'),
  images: Yup.mixed()
    .test('is-images-array', 'At least one image is required', (value) => {
      return value && value.length > 0;
    })
});

export default carSchema;
