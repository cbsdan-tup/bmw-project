import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Rating,
  Grid,
  CircularProgress,
} from "@mui/material";
import { errMsg, getToken, succesMsg } from "../../utils/helper";
import LoadingSpinner from "../layout/LoadingSpinner";

const CarRatingDialog = ({
  showRatingDialog,
  handleCloseRatingDialog,
  rentalId,
  renterId,
  mode,
  reviewId,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === "Edit") {
      fetchReviewInfo();
    }
  }, [mode]);

  const fetchReviewInfo = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/rentals/review/${rentalId}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );
      const review = response.data?.reviews[0];
      console.log(review);
      setRating(review.rating);
      setComment(review.comment);
      setImages(review.images || []);
    } catch (error) {
      console.error("Failed to fetch review info:", error);
    }
    setLoading(false);
  };

  const handleAddNewRating = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("rental", rentalId);
    formData.append("renter", renterId);
    formData.append("rating", rating);
    formData.append("comment", comment);
    images.forEach((image) => {
      formData.append(`images`, image);
    });

    try {
      await axios.post(`${import.meta.env.VITE_API}/reviews/create`, formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });
      handleCloseRatingDialog();
      succesMsg("You have successfully added a Review!");
    } catch (error) {
      console.error("Failed to add new rating:", error);
      errMsg("Error, You have failed to add a review!");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRating = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("rating", rating);
    formData.append("comment", comment);
    images.forEach((image) => {
      formData.append(`images`, image);
    });

    try {
      await axios.put(
        `${import.meta.env.VITE_API}/reviews/${reviewId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      handleCloseRatingDialog();
      succesMsg("Rating updated successfully!");
      window.location.reload()
    } catch (error) {
      console.error("Failed to edit rating:", error);
      errMsg("Failed to update rating!");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "Add") {
      handleAddNewRating();
    } else if (mode === "Edit") {
      handleEditRating();
    }
  };

  return (
    <Dialog
      open={showRatingDialog}
      onClose={handleCloseRatingDialog}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        {mode === "Add" ? "Add New Rating" : "Edit Rating"}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <LoadingSpinner message={mode == "Add" ? "Adding your review." : "Updating your review"} />
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Rating
                  name="rating"
                  value={rating}
                  onChange={(e, newValue) => setRating(newValue)}
                  precision={0.5}
                  required={true}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  required={true}
                />
              </Grid>
              <Grid item xs={12}>
                <input
                  accept="image/*"
                  type="file"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  id="image-upload"
                  required={true}
                />
                <label htmlFor="image-upload">
                  <Button variant="contained" component="span">
                    Upload Images
                  </Button>
                </label>
              </Grid>
              <Grid item xs={12}>
                {images.length > 0 && (
                  <div className="d-flex gap-3 align-items-start">
                    {images.map((image, index) => (
                      <p key={index}>
                        {image.url ? (
                          <img src={image.url} alt={`Image ${index}`} />
                        ) : (
                          image.name
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </Grid>
            </Grid>
          </form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseRatingDialog} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary">
          {mode === "Add" ? "Submit Rating" : "Update Rating"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CarRatingDialog;
