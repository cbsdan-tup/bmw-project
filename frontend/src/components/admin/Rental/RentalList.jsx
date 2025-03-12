import React, { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MDBDataTable } from 'mdbreact'
import Loader from '../../layout/Loader'
import axios from 'axios'
import { toast } from 'react-toastify'
import { getToken, formatDate } from '../../../utils/helper'
import 'react-toastify/dist/ReactToastify.css'
import Sidebar from '../Sidebar'
import Swal from 'sweetalert2'
import { Modal, Button, Form } from 'react-bootstrap'
import RentalInfoDialog from "../../rental/RentalInfoDialog";

const RentalList = () => {
  const [rentals, setRentals] = useState([])
  const [error, setError] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedRental, setSelectedRental] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [openDialog, setOpenDialog] = useState(false);

  let navigate = useNavigate()

  const getRentals = async () => {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
      const { data } = await axios.get(`${import.meta.env.VITE_API}/rentals`, config)
      setRentals(data)
      setLoading(false)
    } catch (error) {
      setError(error.response.data)
    }
  }

  const handleViewRental = (rental) =>{
    const rentalDays = formatDate(new Date(rental.pickUpDate), new Date(rental.returnDate));
    setSelectedRental({ ...rental, rentalDays });
    setOpenDialog(true);
  }
  useEffect(() => {
    getRentals()

    if (error) {
      toast.error(error.message, {
        position: 'bottom-right'
      })
    }
    if (error.status === '401') {
      toast.error(error.message, {
        position: 'bottom-right'
      })
      navigate('/')
    }
  }, [])
  
  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedRental(null);
  };

  const handleConfirmBooking = () => {
    console.log("Booking confirmed", selectedRental);
    setOpenDialog(false);
  };
  
  const rentalLists = () => {
    const data = {
      columns: [
        {
          label: "ID",
          field: "id",
          sort: "asc"
        },
        {
          label: "Car",
          field: "car",
          sort: "asc"
        },
        {
          label: "Renter",
          field: "renter",
          sort: "asc"
        },
        {
          label: "Owner",
          field: "owner"
        },
        {
          label: "Status",
          field: "status"
        },
        {
          label: "Date Created",
          field: "createdAt"
        },
        {
          label: "Last Modified",
          field: "updatedAt"
        },
        {
          label: "Actions",
          field: "actions"
        }
      ],
      rows: []
    }

    rentals.forEach(rental => {
      data.rows.push({
        id: rental._id,
        car: `${rental.car?.brand} ${rental.car?.model}`,
        renter: `${rental.renter?.firstName} ${rental.renter?.lastName}`,
        owner: `${rental.car?.owner?.firstName} ${rental.car?.owner?.lastName}`,
        status: rental?.status,
        createdAt: formatDate(rental.createdAt),
        updatedAt: formatDate(rental.updatedAt),
        actions: (
          <div className='d-flex align-items-center justify-content-center'>
            <button
              className="btn btn-primary py-1 px-2"
              onClick={() => handleEditStatus(rental)}
            >
              <i className="fa fa-pencil"></i> Edit Status
            </button>
            <button
              className="btn btn-success py-1 px-2"
              onClick={() => handleViewRental(rental)}
            >
              <i className="fa fa-eye"></i> View
            </button>
          </div>
        )
      })
    })

    return data
  }

  const handleEditStatus = (rental) => {
    setSelectedRental(rental)
    setNewStatus(rental.status)
    setShowModal(true)
  }

  const handleConfirmUpdate = async () => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/rentals/${selectedRental._id}`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        }
      )
      toast.success('Status updated successfully!', {
        position: 'bottom-right'
      })
      setShowModal(false)
      getRentals() 
    } catch (error) {
      toast.error('Failed to update status. Please try again.', {
        position: 'bottom-right'
      })
    }
  }

  const handleCloseModal = () => setShowModal(false)

  return (
    <>
      <div>
        <Sidebar />
      </div>
      <div className='p-3 margin-left-300'>
        <h1>Rentals</h1>
        <hr />
        <div className='row'>
          {loading ? (
            <Loader />
          ) : (
            <MDBDataTable data={rentalLists()} bordered striped hover />
          )}
        </div>
        {selectedRental && (
        <RentalInfoDialog
          open={openDialog}
          handleClose={handleDialogClose}
          handleConfirm={handleConfirmBooking }
          rentalData={selectedRental}
          rentalDays={selectedRental.rentalDays}
          paymentMode={selectedRental.paymentMode}
        />
      )}
      </div>

      {/* Status Update Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Update Rental Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to change the status of this rental?</p>
          <Form.Group>
            <Form.Label>New Status</Form.Label>
            <Form.Control
              as="select"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Returned">Returned</option>
              <option value="Canceled">Canceled</option>
            </Form.Control>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleConfirmUpdate}>
            Confirm Update
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default RentalList
