import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Table, Alert } from "react-bootstrap";
import LoadingSpinner from "../../layout/LoadingSpinner";
import { succesMsg } from "../../../utils/helper";
import { getToken } from "../../../utils/helper";
import Sidebar from "../Sidebar";
import CarouselLayout from "../../layout/CarouselLayout";
import { Link } from "react-router-dom";
const { Filter } = await import("bad-words"); 

const ReviewList = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [reviewImages, setReviewImages] = useState([]);

  const handleShowCarousel = (images) => {
    setShowCarousel(true);
    setReviewImages(images);
  };

  const handleHideCarousel = () => {
    setReviewImages([]);
    setShowCarousel(false);
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/admin/reviews/`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
        setReviews(response.data?.reviews || []);
      } catch (error) {
        setError("Error fetching reviews");
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  
  const badWords = new Filter();
  const filterComment = (comment) => {
    if (!comment) return null; 

    if (/\*{2,}/.test(comment)) return null; 

    const normalizedComment = comment
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .toLowerCase();

    const words = normalizedComment.split(" ");
    const containsProfanity = words.some((word) => badWords.isProfane(word));

    return containsProfanity ? null : comment; 
  };

  const handleDelete = (reviewId) => {
    $('#confirmDeleteModal').modal('show');
    
    $('#confirmDeleteButton').off('click').on('click', async () => {
      try {
        await axios.delete(`${import.meta.env.VITE_API}/reviews/${reviewId}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
  
        setReviews((prevReviews) =>
          prevReviews.filter((review) => review._id !== reviewId)
        );
  
        succesMsg("Successfully deleted a review");
      } catch (error) {
        setError("Error deleting review");
        console.error("Error deleting review:", error);
      } finally {
        $('#confirmDeleteModal').modal('hide');
      }
    });
  };  

  if (loading) {
    return <LoadingSpinner message="Loading" />;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      <div>
        <Sidebar />
      </div>
      <div className="margin-left-300 p-3">
        <h1>Reviews</h1>
        <hr />
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Review ID</th>
              <th>Car</th>
              <th>Renter</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Images</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review._id}>
                <td>{review._id}</td>
                <td><Link to={`/car/info/${review.rental.car._id}`}>{`${review.rental.car.model} ${review.rental.car.brand}`}</Link></td>
                <td>{`${review.renter.firstName} ${review.renter.lastName}`}</td>
                <td>{review.rating}</td>
                <td>
                  {review.comment}
                {filterComment(review.comment) ? (
                    <></>
                  ) : (
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      Warning: This comment contains inappropriate language.
                    </span>
                  )}
                </td>
                <td>
                  {review.images && review.images.length > 0 ? (
                    <Button
                      className="btn-warning"
                      onClick={() => handleShowCarousel(review.images)}
                    >
                      <i className="fa fa-eye"></i>
                    </Button>
                  ) : (
                    <p>No images</p>
                  )}
                </td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(review._id)}
                  >
                    <i className="fa fa-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div
        className="modal fade"
        id="confirmDeleteModal"
        tabIndex="-1"
        aria-labelledby="confirmDeleteModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="confirmDeleteModalLabel">
                Confirm Deletion
              </h5>
              <button
                type="button"
                className="btn-close"
                data-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              Are you sure you want to delete this review?
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleConfirm()}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      {reviewImages && (
        <CarouselLayout
          images={reviewImages}
          show={showCarousel}
          handleClose={handleHideCarousel}
        />
      )}
    </>
  );
};

export default ReviewList;
