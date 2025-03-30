import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  ScrollView,
  TextInput,
  SafeAreaView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useDispatch } from "react-redux";
import {
  cancelBooking,
  fetchUserBookings,
} from "../redux/slices/bookingSlice";
import { createReview } from "../redux/slices/reviewSlice";
import Icon from "react-native-vector-icons/FontAwesome";
import { useToast } from "../context/ToastContext";
import { calculateRentalDays } from "../helper/utils";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";

const BookingStatusBadge = ({ status, style }) => {
  const { colors } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case "Confirmed":
        return colors.success;
      case "Pending":
        return colors.warning;
      case "Active":
        return colors.info;
      case "Returned":
        return colors.secondary;
      case "Canceled":
        return colors.error;
      default:
        return colors.secondary;
    }
  };

  return (
    <View
      style={[styles.statusBadge, { backgroundColor: getStatusColor() }, style]}
    >
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
};

const RatingStatusBadge = ({ status, style }) => {
  const { colors } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case "Rated":
        return colors.success;
      default:
        return colors.info;
    }
  };

  return (
    <View
      style={[styles.statusBadge, { backgroundColor: getStatusColor() }, style]}
    >
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
};

const BookingDetailsScreen = ({ route }) => {
  const { booking: initialBooking } = route.params;
  const { colors } = useTheme();
  const toast = useToast();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingData, setBookingData] = useState(null);

  const { user } = useAuth();

  const booking = bookingData || initialBooking;

  const bookingId = initialBooking?._id;

  const fetchBookingDetails = useCallback(async () => {
    if (!bookingId) {
      setError("No booking ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Fetching booking details for ID:", bookingId);

      const response = await api.get(`/rentals/${bookingId}`);
      console.log("Booking details fetched:", response.data);

      setBookingData(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching booking details:", err);
      setError(err.message || "Failed to load booking details");
      setLoading(false);

      toast.error("Failed to load booking details");
    }
  }, [bookingId, toast]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleCancelBooking = useCallback(async () => {
    if (!booking) return;

    try {
      await dispatch(cancelBooking(booking._id)).unwrap();
      toast.success("Booking cancelled successfully");
      navigation.goBack();
    } catch (error) {
      toast.error(
        typeof error === "string" ? error : "Failed to cancel booking"
      );
    }
  }, [booking, dispatch, navigation, toast]);

  const handleOpenReviewModal = () => {
    if (booking.hasReview) {
      navigation.navigate("MyReviews", { userId: user?._id });
    } else {
      setRating(0);
      setComment("");
      setReviewImages([]);
      setReviewModalVisible(true);
    }
  };

  const handleCloseReviewModal = () => {
    setReviewModalVisible(false);
  };

  const handleAddImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        toast.error("Permission to access media library is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.cancelled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setReviewImages([...reviewImages, selectedImage]);
      }
    } catch (error) {
      toast.error("Error selecting image");
      console.error("Image picker error:", error);
    }
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...reviewImages];
    updatedImages.splice(index, 1);
    setReviewImages(updatedImages);
  };

  const handleRatingSelect = (value) => {
    setRating(value);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      setIsSubmittingReview(true);

      console.log("Creating review for booking:", booking);

      const formData = new FormData();
      formData.append("rental", booking._id);

      const renterId =
        typeof booking.renter === "object"
          ? booking.renter._id
          : booking.renter;
      formData.append("renter", renterId);

      formData.append("rating", rating);
      formData.append("comment", comment);

      if (reviewImages.length > 0) {
        console.log(`Adding ${reviewImages.length} images to review`);
        reviewImages.forEach((image) => {
          const imageName = image.uri.split("/").pop();
          const imageType =
            "image/" + (imageName.split(".").pop() === "png" ? "png" : "jpeg");

          formData.append("images", {
            uri: image.uri,
            name: imageName,
            type: imageType,
          });
        });
      }

      console.log("Submitting review with data:", {
        rental: booking._id,
        renter: renterId,
        rating: rating,
        comment: comment,
        imagesCount: reviewImages.length,
      });

      const result = await dispatch(createReview(formData)).unwrap();
      console.log("Review creation result:", result);

      toast.success("Review submitted successfully");

      handleCloseReviewModal();

      if (user?._id) {
        dispatch(fetchUserBookings(user._id));
      }

      navigation.navigate("MyReviews", { userId: user?._id });
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error(error?.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const renderReviewModal = () => {
    const carName = booking?.car
      ? `${booking.car.brand} ${booking.car.model}`
      : "Unknown Car";

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={reviewModalVisible}
        onRequestClose={handleCloseReviewModal}
      >
        <View style={styles.reviewModalOverlay}>
          <View
            style={[
              styles.reviewModalContent,
              { backgroundColor: colors.card },
            ]}
          >
            <View
              style={[
                styles.reviewModalHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.reviewModalTitle, { color: colors.text }]}>
                Rate Your Experience
              </Text>
              <TouchableOpacity onPress={handleCloseReviewModal}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reviewModalBody}>
              <View style={styles.carInfoSection}>
                {booking?.car?.images && booking.car.images.length > 0 ? (
                  <Image
                    source={{ uri: booking.car.images[0].url }}
                    style={styles.reviewCarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.carImagePlaceholder,
                      {
                        backgroundColor: colors.border,
                        width: "100%",
                        height: 180,
                        borderRadius: 8,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <Icon name="car" size={60} color={colors.secondary} />
                  </View>
                )}
                <Text style={[styles.reviewCarTitle, { color: colors.text }]}>
                  {carName}
                </Text>
              </View>

              <Text style={[styles.reviewSectionTitle, { color: colors.text }]}>
                Rate Your Experience
              </Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
                    key={`rating-${value}`}
                    style={styles.ratingButton}
                    onPress={() => handleRatingSelect(value)}
                  >
                    <Icon
                      name={value <= rating ? "star" : "star-o"}
                      size={40}
                      color={value <= rating ? "#FFD700" : colors.secondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.reviewSectionTitle, { color: colors.text }]}>
                Write Your Review
              </Text>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
                placeholder="Share your experience with this car..."
                placeholderTextColor={colors.secondary}
                value={comment}
                onChangeText={setComment}
                multiline={true}
              />

              <Text style={[styles.reviewSectionTitle, { color: colors.text }]}>
                Add Photos
              </Text>

              {reviewImages.length > 0 && (
                <View style={styles.reviewImagesRow}>
                  {reviewImages.map((image, index) => (
                    <View
                      key={`img-${index}`}
                      style={styles.reviewImageContainer}
                    >
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.reviewImagePreview}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <Icon name="trash" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.addImageButton,
                  {
                    borderColor: colors.primary,
                    marginTop: reviewImages.length > 0 ? 10 : 0,
                  },
                ]}
                onPress={handleAddImage}
              >
                <Icon
                  name="camera"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.addImageText, { color: colors.primary }]}>
                  {reviewImages.length === 0 ? "Add Photos" : "Add More Photos"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitReviewButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    marginBottom={12}
                  />
                ) : (
                  <Text style={[styles.submitReviewText, { marginBottom: 12 }]}>
                    Submit Review
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading booking details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="exclamation-triangle" size={50} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchBookingDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>Booking not found</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.detailsScrollView}
        contentContainerStyle={styles.detailsScrollContent}
        showsVerticalScrollIndicator={true}
      >
        {booking.car &&
          booking.car.images &&
          booking.car.images.length > 0 &&
          booking.car.images[0] && (
            <Image
              source={{ uri: booking.car.images[0].url }}
              style={styles.modalImage}
              resizeMode="cover"
            />
          )}

        {booking.car && (
          <Text style={[styles.carTitle, { color: colors.text }]}>
            {booking.car.brand || "Unknown"} {booking.car.model || ""}
          </Text>
        )}
        {booking.status === "Pending" && (
          <View style={styles.detailSection}>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailItemLabel,
                  { color: colors.secondary },
                ]}
              >
                Please wait for owner confirmation. You can contact the
                owner through gmail at{" "}
                <Text style={{ fontWeight: 600 }}>
                  {booking?.car?.owner?.email}
                </Text>{" "}
                or chat through the app.
              </Text>
            </View>
          </View>
        )}
        {booking.status === "Confirmed" && (
          <View style={styles.detailSection}>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailItemLabel,
                  { color: colors.secondary },
                ]}
              >
                Please go to pick up location at{" "}
                <Text style={{ fontWeight: 600 }}>
                  {booking.car?.pickUpLocation}
                </Text>{" "}
                on exactly{" "}
                <Text style={{ fontWeight: 600 }}>
                  {formatDate(booking.pickUpDate)}
                </Text>{" "}
                to get the car and return by{" "}
                <Text style={{ fontWeight: 600 }}>
                  {formatDate(booking.returnDate)}
                </Text>
                .
              </Text>
            </View>
          </View>
        )}
        {booking.status === "Active" && (
          <View style={styles.detailSection}>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailItemLabel,
                  { color: colors.secondary },
                ]}
              >
                The vehicle is currently at your care. Please drive
                carefully and return to owner by{" "}
                <Text style={{ fontWeight: 600 }}>
                  {formatDate(booking.returnDate)}
                </Text>{" "}
                at{" "}
                <Text style={{ fontWeight: 600 }}>
                  {booking.car.pickUpLocation}
                </Text>
                .
              </Text>
            </View>
          </View>
        )}
        {booking.status === "Returned" && (
          <View style={styles.detailSection}>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailItemLabel,
                  { color: colors.secondary },
                ]}
              >
                You have returned the vehicle. You can now rate your
                experience in renting the vehicle.
              </Text>
            </View>
          </View>
        )}
        {booking.status === "Canceled" && (
          <View style={styles.detailSection}>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailItemLabel,
                  { color: colors.secondary },
                ]}
              >
                You have canceled the booking.
              </Text>
            </View>
          </View>
        )}
        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Booking Information
          </Text>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Status:
            </Text>
            <BookingStatusBadge
              status={booking.status}
              style={styles.modalStatusBadge}
            />
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Pick-up Date:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {formatDate(booking.pickUpDate)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Return Date:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {formatDate(booking.returnDate)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Created:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {formatDate(booking.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Payment Details
          </Text>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Payment Method:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {booking.paymentMethod}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Payment Status:
            </Text>
            <Text
              style={[
                styles.detailItemValue,
                {
                  color:
                    booking.paymentStatus === "Paid"
                      ? colors.success
                      : booking.paymentStatus === "Pending"
                      ? colors.warning
                      : colors.text,
                },
              ]}
            >
              {booking.paymentStatus}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Price Per Day:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              ₱{booking.car.pricePerDay}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Days{" "}
              {booking.status === "Returned" ? "Rented" : "To be Rented"}:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {calculateRentalDays(booking.pickUpDate, booking.returnDate)}
            </Text>
          </View>

          {booking.discount && booking.discount.code && (
            <>
              <View style={styles.detailItem}>
                <Text
                  style={[styles.detailItemLabel, { color: colors.secondary }]}
                >
                  Original Amount:
                </Text>
                <Text style={[styles.detailItemValue, { color: colors.text, textDecorationLine: 'line-through' }]}>
                  ₱{booking.originalAmount?.toLocaleString() || 
                     (calculateRentalDays(booking.pickUpDate, booking.returnDate) * booking.car.pricePerDay).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text
                  style={[styles.detailItemLabel, { color: colors.secondary }]}
                >
                  Discount Code:
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    {booking.discount.code} ({booking.discount.discountPercentage}%)
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Text
                  style={[styles.detailItemLabel, { color: colors.secondary }]}
                >
                  Discount Amount:
                </Text>
                <Text style={[styles.detailItemValue, { color: colors.success }]}>
                  -₱{booking.discount.discountAmount?.toLocaleString() || '0'}
                </Text>
              </View>
            </>
          )}

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Total Payment
            </Text>
            <Text
              style={[
                styles.detailItemValue,
                { color: colors.text, fontWeight: "600" },
              ]}
            >
              ₱
              {booking.finalAmount?.toLocaleString() || 
                (calculateRentalDays(booking.pickUpDate, booking.returnDate) * booking.car.pricePerDay).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Car Details
          </Text>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Year:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {booking.car.year}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Fuel Type:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {booking.car.fuel}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Transmission:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {booking.car.transmission}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text
              style={[styles.detailItemLabel, { color: colors.secondary }]}
            >
              Pick-up Location:
            </Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>
              {booking.car.pickUpLocation}
            </Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Vehicle Owner
          </Text>

          {booking.car.owner && (
            <>
              <View style={styles.detailItem}>
                <Text
                  style={[
                    styles.detailItemLabel,
                    { color: colors.secondary },
                  ]}
                >
                  Name:
                </Text>
                <Text
                  style={[styles.detailItemValue, { color: colors.text }]}
                >
                  {booking.car.owner.firstName} {booking.car.owner.lastName}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text
                  style={[
                    styles.detailItemLabel,
                    { color: colors.secondary },
                  ]}
                >
                  Email:
                </Text>
                <Text
                  style={[styles.detailItemValue, { color: colors.text }]}
                >
                  {booking.car.owner.email}
                </Text>
              </View>

              {booking.car.owner.contactNumber && (
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailItemLabel,
                      { color: colors.secondary },
                    ]}
                  >
                    Contact:
                  </Text>
                  <Text
                    style={[styles.detailItemValue, { color: colors.text }]}
                  >
                    {booking.car.owner.contactNumber}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {booking.status === "Returned" && (
          <TouchableOpacity
            style={[
              styles.reviewButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleOpenReviewModal}
          >
            <Icon
              name="star"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.reviewButtonText}>
              {booking.hasReview ? "View Your Review" : "Leave a Review"}
            </Text>
          </TouchableOpacity>
        )}

        {booking.status === "Pending" && (
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.error }]}
            onPress={handleCancelBooking}
          >
            <Icon
              name="times-circle"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        <View style={styles.modalBottomPadding} />
      </ScrollView>
      {renderReviewModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detailsScrollView: {
    flex: 1,
  },
  detailsScrollContent: {
    padding: 16,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  carTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  detailItemLabel: {
    fontSize: 16,
  },
  detailItemValue: {
    fontSize: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalStatusBadge: {
    width: 100,
    alignItems: "center",
  },
  modalBottomPadding: {
    height: 20,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  reviewModalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  reviewModalContent: {
    margin: 20,
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  reviewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewModalBody: {
    padding: 16,
  },
  carInfoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  reviewCarImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewCarTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
  },
  ratingSelector: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  ratingButton: {
    padding: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
    minHeight: 100,
    marginTop: 5,
    fontSize: 16,
  },
  reviewImagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  reviewImageContainer: {
    position: "relative",
    margin: 5,
  },
  reviewImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(220, 0, 0, 0.8)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addImageText: {
    fontSize: 16,
    fontWeight: "500",
  },
  submitReviewButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  submitReviewText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  discountBadge: {
    backgroundColor: '#28a745',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default BookingDetailsScreen;
