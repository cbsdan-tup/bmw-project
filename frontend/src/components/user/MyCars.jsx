import React, { useEffect, useState } from "react";
import axios from "axios";
import { Carousel, Card, Button, Form, Modal } from "react-bootstrap";
import LoadingSpinner from "../layout/LoadingSpinner";
import { getUser, getToken } from "../../utils/helper";
import Alert from "../layout/Alert";
import { Link } from "react-router-dom";
import CarFormModal from "./CarFormModal";

const MyCars = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);
  const [operation, setOperation] = useState("Add");
  const [carId, setCarId] = useState(null);

  const handleShow = () => {
    setOperation("Add");
    setCarId(null);
    setShow(true);
  };

  const handleClose = () => {
    setShow(false);
    setOperation("Add");
    setCarId(null)
  };

  const fetchUserCars = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      };

      const response = await axios.get(
        `${import.meta.env.VITE_API}/my-cars/${getUser()._id}`,
        config
      );
      console.log(response.data?.cars);
      setCars(response.data?.cars);
    } catch (error) {
      console.log(error);
      setError(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (id) => {
    setOperation("Edit");
    setCarId(id);
    setShow(true);
  };

  useEffect(() => {
    fetchUserCars();
  }, [show, carId]);

  return (
    <div className="container py-3">
      {error ? <Alert message={error} type="error" /> : <></>}
      <h1>My Cars</h1>
      <hr />
      <Button variant="primary" onClick={handleShow}>
        Add Car
      </Button>

      {loading ? (
        <LoadingSpinner message="Loading your cars..." />
      ) : cars.length !== 0 ? (
        <div className="row mt-3">
          {cars.map((car) => (
            <div key={car._id} className="col-md-4 mb-3">
              <Card>
                <Carousel>
                  {car.images.length > 0 ? (
                    car.images.map((image, index) => (
                      <Carousel.Item key={index}>
                        <Card.Img
                          variant="top"
                          src={image || "./src/assets/images/default-image.jpg"}
                          alt={`${car.brand} ${car.model}`}
                          className="fixed-height-image"
                        />
                      </Carousel.Item>
                    ))
                  ) : (
                    <Carousel.Item>
                      <Card.Img
                        variant="top"
                        src="./src/assets/images/default-image.jpg"
                        alt={`${car.brand} ${car.model}`}
                        className="fixed-height-image"
                      />
                    </Carousel.Item>
                  )}
                </Carousel>
                <Card.Body>
                  <Card.Title>
                    {car.brand} {car.model} ({car.year})
                  </Card.Title>
                  <Card.Text>
                    <strong>Price Per Day:</strong> ${car.pricePerDay}
                    <br />
                    <strong>Vehicle Type:</strong> {car.vehicleType}
                    <br />
                    <strong>Seat Capacity:</strong> {car.seatCapacity} seats
                    <br />
                    <strong>Transmission:</strong> {car.transmission}
                    <br />
                    <strong>Fuel:</strong> {car.fuel}
                    <br />
                    <strong>Availability:</strong>{" "}
                    {car.isActive ? "Active" : "Not Active"}
                  </Card.Text>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/car/${car._id}`)}
                  >
                    <Link to={`/car/info/${car._id}`} className="text-white">
                      View Details
                    </Link>
                  </Button>
                  <Button
                    className="btn-success"
                    onClick={() => handleEditClick(car._id)}
                  >
                    Edit Details
                  </Button>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <>
          <h2>You have no cars added.</h2>
        </>
      )}
      <CarFormModal
        show={show}
        handleClose={handleClose}
        operation={operation}
        carId={carId}
      />
    </div>
  );
};

export default MyCars;
