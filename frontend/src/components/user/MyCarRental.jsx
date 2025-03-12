import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, Button, Table } from "react-bootstrap";
import {
  getUser,
  getToken,
  formatDate,
  succesMsg,
  errMsg,
} from "../../utils/helper";
import { Link } from "react-router-dom";
import LoadingSpinner from "../layout/LoadingSpinner";

const MyCarRental = () => {
  const [rentals, setRentals] = useState([]);
  const [selectedRental, setSelectedRental] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      };
      const ownerId = getUser()._id;

      const response = await axios.get(
        `${import.meta.env.VITE_API}/my-car-rentals/${ownerId}`,
        config
      );
      console.log(response.data);
      setRentals(response.data);
    } catch (error) {
      console.error("Error fetching rentals", error);
      errMsg("Error fetching rentals")
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRentals();
  }, []);

  const handleViewRental = (rental) => {
    setSelectedRental(rental);
    setStatus(rental.status);
    setShowModal(true);
  };

  const handleUpdateStatus = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      };
      const response = await axios.put(
        `${import.meta.env.VITE_API}/rentals/${selectedRental._id}`,
        { status },
        config
      );
      setSelectedRental({ ...selectedRental, status: response.data.status });
      setShowModal(false);
      setRentals((prevRentals) =>
        prevRentals.map((r) =>
          r._id === selectedRental._id
            ? { ...r, status: response.data.status }
            : r
        )
      );
      succesMsg("Successfully update the status!");
      fetchRentals();
    } catch (error) {
      console.error("Error updating rental status", error);
      errMsg("Failed to update the status!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
        <LoadingSpinner message="Loading..." />
      ) : (
        <div className="container py-3">
          <h1>My Car Rentals</h1>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Car</th>
                <th>Renter</th>
                <th>Status</th>
                <th>Pick Up Date</th>
                <th>Return Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rentals && rentals.length > 0 ? (
                rentals.map((rental, index) => (
                  <tr key={rental._id}>
                    <td>{index + 1}</td>
                    <td>
                      <Link to={`/car/info/${rental.car._id}`}>
                        {rental.car.model} {rental.car.brand}
                      </Link>
                    </td>
                    <td>
                      {rental.renter.firstName} {rental.renter.lastName}
                    </td>
                    <td>{rental.status}</td>
                    <td>{formatDate(rental.pickUpDate)}</td>
                    <td>{formatDate(rental.returnDate)}</td>
                    <td>
                      <Button
                        variant="primary"
                        onClick={() => handleViewRental(rental)}
                        disabled={rental.status === "Canceled" || rental.status === "Returned"}
                        >
                        Update
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">No rentals found.</td>
                </tr>
              )}
            </tbody>
          </Table>

          <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Rental Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedRental && (
                <>
                  <p>
                    <strong>Car:</strong> {selectedRental.car.model}{" "}
                    {selectedRental.car.brand}
                  </p>
                  <p>
                    <strong>Renter:</strong> {selectedRental.renter.firstName}{" "}
                    {selectedRental.renter.lastName}
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedRental.status}
                  </p>
                  <label htmlFor="status">Update Status</label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="form-control"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Active">Active</option>
                    <option value="Returned">Returned</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={handleUpdateStatus}>
                Save Changes
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      )}
    </>
  );
};

export default MyCarRental;
