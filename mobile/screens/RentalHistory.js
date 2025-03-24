import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  MaterialIcons,
  FontAwesome,
  Ionicons,
  AntDesign,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const RentalHistory = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const [pastRentals, setPastRentals] = useState([]);
  const [reviewedRentals, setReviewedRentals] = useState([]);
  const [myCarsRentals, setMyCarsRentals] = useState([]); // New state for user's cars rentals
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [rentalModalVisible, setRentalModalVisible] = useState(false);
  const [carRentalModalVisible, setCarRentalModalVisible] = useState(false); // New modal for car rentals
  const [selectedCarRental, setSelectedCarRental] = useState(null); // Selected car rental for details

  // Ensure there is a fallback for textSecondary if it doesn't exist in the theme
  const textSecondaryColor = colors.textSecondary || colors.text + "80"; // 50% opacity fallback

  // Monitor authentication state using AuthContext
  useEffect(() => {
    console.log("RentalHistory - Auth State:", { user, isAuthenticated });
  }, [user, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?._id) {
        fetchRentalHistory();
        fetchMyCarRentals(); // Fetch rentals for user's cars
      }
    }, [isAuthenticated, user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchRentalHistory(), fetchMyCarRentals()]).finally(() =>
      setRefreshing(false)
    );
  }, []);

  const fetchRentalHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?._id) {
        console.error("User not authenticated");
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      console.log("Fetching rental history for user ID:", user._id);

      try {
        // Update the API endpoint to match the backend route
        const response = await api.get(`/my-rentals/${user._id}`);

        // Log the response
        console.log("API Response:", response.status, response.data);

        // Filter for returned rentals
        const completedRentals = response.data.filter(
          (rental) => rental.status === "Returned"
        );

        console.log("Completed rentals count:", completedRentals.length);

        // Separate reviewed and non-reviewed rentals
        const reviewed = completedRentals.filter((rental) => rental.hasReview);
        console.log("Reviewed rentals count:", reviewed.length);

        setPastRentals(completedRentals);
        setReviewedRentals(reviewed);
      } catch (apiError) {
        console.error(
          "API Error details:",
          apiError.response?.status,
          apiError.response?.data
        );

        // Log the full URL that was requested to help debugging
        console.error(
          "Requested URL:",
          `${api.defaults.baseURL}/my-rentals/${user._id}`
        );

        throw new Error(
          `Server error: ${
            apiError.response?.data?.message || apiError.message
          }`
        );
      }
    } catch (err) {
      console.error("Error fetching rental history:", err);
      setError(
        `Failed to load rental history: ${err.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch rentals for user's cars
  const fetchMyCarRentals = async () => {
    try {
      if (!user?._id) {
        console.error("User not authenticated");
        return;
      }

      console.log("Fetching car rentals for user ID:", user._id);

      try {
        const response = await api.get(`/user-completed-rentals/${user._id}`);
        console.log(
          "API Response (Car Rentals):",
          response.status,
          response.data
        );

        if (response.data.success && response.data.completedRentedCars) {
          setMyCarsRentals(response.data.completedRentedCars);
        } else {
          setMyCarsRentals([]);
        }
      } catch (apiError) {
        console.error(
          "API Error details (Car Rentals):",
          apiError.response?.status,
          apiError.response?.data
        );
        console.error(
          "Requested URL:",
          `${api.defaults.baseURL}/user-completed-rentals/${user._id}`
        );
      }
    } catch (err) {
      console.error("Error fetching car rentals:", err);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate("Login");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalPrice = (rental) => {
    const pickUp = new Date(rental.pickUpDate);
    const returnDate = new Date(rental.returnDate);
    const timeDiff = Math.abs(returnDate - pickUp);
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return (days * rental.car?.pricePerDay).toFixed(2);
  };

  const calculateRentalDuration = (rental) => {
    const pickUp = new Date(rental.pickUpDate);
    const returnDate = new Date(rental.returnDate);
    const timeDiff = Math.abs(returnDate - pickUp);
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return days === 1 ? "1 day" : `${days} days`;
  };

  const openRentalDetails = (rental) => {
    setSelectedRental(rental);
    setRentalModalVisible(true);
  };

  const openCarRentalDetails = (carRental) => {
    setSelectedCarRental(carRental);
    setCarRentalModalVisible(true);
  };

  const renderOwnerAvatar = (owner) => {
    if (!owner) return null;

    if (owner.profileImage) {
      return (
        <Image
          source={{ uri: owner.profileImage }}
          style={styles.ownerAvatar}
        />
      );
    } else {
      const initial = owner.firstName
        ? owner.firstName.charAt(0).toUpperCase()
        : "?";
      return (
        <View
          style={[
            styles.avatarPlaceholder,
            { backgroundColor: colors.secondary },
          ]}
        >
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      );
    }
  };

  const HistoryCard = ({ rental }) => {
    return (
      <TouchableOpacity
        style={[
          styles.rentalCard,
          { backgroundColor: colors.card, borderColor: colors.borderCars },
        ]}
        onPress={() => openRentalDetails(rental)}
        activeOpacity={0.8}
      >
        <View style={styles.carDetails}>
          <View style={styles.carImageContainer}>
            <Image
              source={{
                uri:
                  rental.car?.images && rental.car.images.length > 0
                    ? rental.car.images[0]
                    : "https://via.placeholder.com/150",
              }}
              style={styles.carImageThumb}
            />
          </View>
          <View style={styles.carInfoContainer}>
            <Text style={[styles.carTitle, { color: colors.text }]}>
              {rental.car?.brand} {rental.car?.model}
            </Text>
            <Text style={[styles.carSubtitle, { color: colors.secondary }]}>
              Year: {rental.car?.year}
            </Text>
          </View>
          <Text style={[styles.statusBadge, { backgroundColor: "#4CAF50" }]}>
            {rental.status}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rentalInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Rented: {formatDate(rental.pickUpDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="event-available"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Returned: {formatDate(rental.returnDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Duration: {calculateRentalDuration(rental)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="attach-money"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Total Paid: ₱{calculateTotalPrice(rental)}
            </Text>
          </View>
        </View>

        {rental.hasReview ? (
          <View
            style={[
              styles.reviewTag,
              {
                backgroundColor: colors.primary + "20",
                borderColor: colors.borderCars,
              },
            ]}
          >
            <MaterialIcons name="star" size={14} color={colors.primary} />
            <Text style={[styles.reviewTagText, { color: colors.primary }]}>
              You've reviewed this rental
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.addReviewButton,
              {
                backgroundColor: colors.secondary + "20",
                borderColor: colors.borderCars,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("AddReview", { rentalId: rental._id });
            }}
          >
            <MaterialIcons
              name="rate-review"
              size={14}
              color={colors.secondary}
            />
            <Text style={[styles.reviewTagText, { color: colors.secondary }]}>
              Add a review
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.viewDetailsContainer}>
          <Text style={[styles.viewDetailsText, { color: colors.primary }]}>
            View Details
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={18}
            color={colors.primary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Component to render a car with its rentals
  const CarRentalCard = ({ carRental }) => {
    const totalRentals = carRental.completedRentals.length;
    const totalEarnings = carRental.completedRentals
      .reduce((total, rental) => {
        const pickUp = new Date(rental.pickUpDate);
        const returnDate = new Date(rental.returnDate);
        const timeDiff = Math.abs(returnDate - pickUp);
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return total + days * carRental.pricePerDay;
      }, 0)
      .toFixed(2);

    return (
      <TouchableOpacity
        style={[
          styles.rentalCard,
          { backgroundColor: colors.card, borderColor: colors.borderCars },
        ]}
        onPress={() => openCarRentalDetails(carRental)}
        activeOpacity={0.8}
      >
        <View style={styles.carDetails}>
          <View style={styles.carImageContainer}>
            <Image
              source={{
                uri:
                  carRental.images && carRental.images.length > 0
                    ? carRental.images[0]
                    : "https://via.placeholder.com/150",
              }}
              style={styles.carImageThumb}
            />
          </View>
          <View style={styles.carInfoContainer}>
            <Text style={[styles.carTitle, { color: colors.text }]}>
              {carRental.brand} {carRental.model}
            </Text>
            <Text style={[styles.carSubtitle, { color: colors.secondary }]}>
              Year: {carRental.year}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.rentalInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="people" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Total Rentals: {totalRentals}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="attach-money"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Total Earnings: ₱{totalEarnings}
            </Text>
          </View>
        </View>

        <View style={styles.viewDetailsContainer}>
          <Text style={[styles.viewDetailsText, { color: colors.primary }]}>
            View Rental History
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={18}
            color={colors.primary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const RentalModal = () => {
    if (!selectedRental) return null;

    const getOwnerFullName = () => {
      const owner = selectedRental.car?.owner;
      if (!owner) return "Unknown Owner";

      const firstName = owner.firstName || "";
      const lastName = owner.lastName || "";
      return (firstName + " " + lastName).trim() || "Unknown Owner";
    };

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={rentalModalVisible}
        onRequestClose={() => setRentalModalVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Rental Details
            </Text>
            <TouchableOpacity
              onPress={() => setRentalModalVisible(false)}
              style={styles.closeButton}
            >
              <AntDesign name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContentContainer}
          >
            {/* Car Image Section */}
            <View style={styles.carImageSection}>
              <Image
                source={{
                  uri:
                    selectedRental.car?.images &&
                    selectedRental.car.images.length > 0
                      ? selectedRental.car.images[0]
                      : "https://via.placeholder.com/150",
                }}
                style={styles.carModalImage}
              />
            </View>

            {/* Car Details Section */}
            <View
              style={[
                styles.detailsSection,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedRental.car?.brand} {selectedRental.car?.model}
              </Text>

              <View style={styles.carDetailsRow}>
                <View style={styles.carDetailItem}>
                  <MaterialCommunityIcons
                    name="car"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text
                    style={[
                      styles.carDetailText,
                      { color: textSecondaryColor },
                    ]}
                  >
                    {selectedRental.car?.year}
                  </Text>
                </View>
                <View style={styles.carDetailItem}>
                  <MaterialCommunityIcons
                    name="seat"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text
                    style={[
                      styles.carDetailText,
                      { color: textSecondaryColor },
                    ]}
                  >
                    {selectedRental.car?.seatCapacity} seats
                  </Text>
                </View>
                <View style={styles.carDetailItem}>
                  <MaterialIcons
                    name="attach-money"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text
                    style={[
                      styles.carDetailText,
                      { color: textSecondaryColor },
                    ]}
                  >
                    ₱{selectedRental.car?.pricePerDay}/day
                  </Text>
                </View>
              </View>
            </View>

            {/* Rental Details Section */}
            <View
              style={[
                styles.detailsSection,
                {
                  backgroundColor: colors.cardBackground,
                  marginTop: 16,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Rental Information
              </Text>

              <View style={styles.infoCards}>
                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="event"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Pickup Date
                    </Text>
                    <Text
                      style={[styles.infoValue, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {formatDate(selectedRental.pickUpDate)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: colors.success + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="event-available"
                      size={22}
                      color={colors.success}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Return Date
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatDate(selectedRental.returnDate)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: colors.secondary + "20" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={22}
                      color={colors.secondary}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Duration
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {calculateRentalDuration(selectedRental)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <FontAwesome
                      name="money"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Total Amount
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      ₱{calculateTotalPrice(selectedRental)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: colors.success + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="payment"
                      size={22}
                      color={colors.success}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Payment Method
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {selectedRental.paymentMethod} (
                      {selectedRental.paymentStatus})
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: colors.secondary + "20" },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={22}
                      color={colors.secondary}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Pickup Location
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {selectedRental.car?.pickUpLocation || "Not specified"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Car Owner Section */}
            <View
              style={[
                styles.detailsSection,
                {
                  backgroundColor: colors.cardBackground,
                  marginTop: 16,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Car Owner
              </Text>

              <View style={styles.ownerInfoContainer}>
                <View style={styles.ownerRow}>
                  {renderOwnerAvatar(selectedRental.car?.owner)}
                  <View style={styles.ownerInfo}>
                    <Text style={[styles.ownerName, { color: colors.text }]}>
                      {getOwnerFullName()}
                    </Text>
                    <Text
                      style={[styles.ownerEmail, { color: textSecondaryColor }]}
                    >
                      {selectedRental.car?.owner?.email || "No email provided"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Review Section */}
            <View
              style={[
                styles.detailsSection,
                {
                  backgroundColor: colors.cardBackground,
                  marginTop: 16,
                  marginBottom: 20,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Your Review
              </Text>

              {selectedRental.hasReview ? (
                <View
                  style={[
                    styles.reviewContainer,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                >
                  <View style={styles.reviewHeader}>
                    <MaterialIcons name="star" size={20} color="#FFC107" />
                    <Text style={[styles.reviewRating, { color: colors.text }]}>
                      You've rated this rental
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.reviewMessage,
                      { color: textSecondaryColor },
                    ]}
                  >
                    Thank you for providing your feedback!
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.addReviewContainer,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                  ]}
                  onPress={() => {
                    setRentalModalVisible(false);
                    navigation.navigate("AddReview", {
                      rentalId: selectedRental._id,
                    });
                  }}
                >
                  <MaterialIcons
                    name="rate-review"
                    size={24}
                    color={colors.secondary}
                  />
                  <Text
                    style={[styles.addReviewText, { color: colors.secondary }]}
                  >
                    Add your review for this rental
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Modal for displaying car rental details
  const CarRentalModal = () => {
    if (!selectedCarRental) return null;

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={carRentalModalVisible}
        onRequestClose={() => setCarRentalModalVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedCarRental.brand} {selectedCarRental.model} - Rental
              History
            </Text>
            <TouchableOpacity
              onPress={() => setCarRentalModalVisible(false)}
              style={styles.closeButton}
            >
              <AntDesign name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContentContainer}
          >
            {/* Car Image Section */}
            <View style={styles.carImageSection}>
              <Image
                source={{
                  uri:
                    selectedCarRental.images &&
                    selectedCarRental.images.length > 0
                      ? selectedCarRental.images[0]
                      : "https://via.placeholder.com/150",
                }}
                style={styles.carModalImage}
              />
            </View>

            {/* Car Details Section */}
            <View
              style={[
                styles.detailsSection,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedCarRental.brand} {selectedCarRental.model}
              </Text>

              <View style={styles.carDetailsRow}>
                <View style={styles.carDetailItem}>
                  <MaterialCommunityIcons
                    name="car"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text
                    style={[
                      styles.carDetailText,
                      { color: textSecondaryColor },
                    ]}
                  >
                    {selectedCarRental.year}
                  </Text>
                </View>
                <View style={styles.carDetailItem}>
                  <MaterialCommunityIcons
                    name="seat"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text
                    style={[
                      styles.carDetailText,
                      { color: textSecondaryColor },
                    ]}
                  >
                    {selectedCarRental.seatCapacity} seats
                  </Text>
                </View>
                <View style={styles.carDetailItem}>
                  <MaterialIcons
                    name="attach-money"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text
                    style={[
                      styles.carDetailText,
                      { color: textSecondaryColor },
                    ]}
                  >
                    ₱{selectedCarRental.pricePerDay}/day
                  </Text>
                </View>
              </View>
            </View>

            {/* Completed Rentals List */}
            <View
              style={[
                styles.detailsSection,
                {
                  backgroundColor: colors.cardBackground,
                  marginTop: 16,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Completed Rentals
              </Text>

              {selectedCarRental.completedRentals.map((rental, index) => (
                <View
                  key={rental._id}
                  style={[
                    styles.rentalHistoryItem,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderCars,
                    },
                    index > 0 && { marginTop: 12 },
                  ]}
                >
                  <View style={styles.rentalHistoryHeader}>
                    <View style={styles.renterInfo}>
                      {rental.renter?.profileImage ? (
                        <Image
                          source={{ uri: rental.renter.profileImage }}
                          style={styles.renterAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarPlaceholder,
                            { backgroundColor: colors.secondary },
                          ]}
                        >
                          <Text style={styles.avatarInitial}>
                            {rental.renter?.firstName
                              ? rental.renter.firstName.charAt(0).toUpperCase()
                              : "?"}
                          </Text>
                        </View>
                      )}
                      <View style={styles.renterDetails}>
                        <Text
                          style={[styles.renterName, { color: colors.text }]}
                        >
                          {rental.renter?.firstName} {rental.renter?.lastName}
                        </Text>
                        <Text
                          style={[
                            styles.renterEmail,
                            { color: textSecondaryColor },
                          ]}
                        >
                          {rental.renter?.email || "No email provided"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.rentalStatusBadge,
                        { backgroundColor: "#4CAF50" },
                      ]}
                    >
                      {rental.status}
                    </Text>
                  </View>

                  <View style={styles.rentalDetails}>
                    <View style={styles.rentalDetailRow}>
                      <MaterialIcons
                        name="event"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.rentalDetailText,
                          { color: colors.text },
                        ]}
                      >
                        Rented: {formatDate(rental.pickUpDate)}
                      </Text>
                    </View>
                    <View style={styles.rentalDetailRow}>
                      <MaterialIcons
                        name="event-available"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.rentalDetailText,
                          { color: colors.text },
                        ]}
                      >
                        Returned: {formatDate(rental.returnDate)}
                      </Text>
                    </View>
                    <View style={styles.rentalDetailRow}>
                      <MaterialIcons
                        name="payment"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.rentalDetailText,
                          { color: colors.text },
                        ]}
                      >
                        Payment: {rental.paymentMethod} ({rental.paymentStatus})
                      </Text>
                    </View>

                    {/* Calculate the rental duration and amount */}
                    {(() => {
                      const pickUp = new Date(rental.pickUpDate);
                      const returnDate = new Date(rental.returnDate);
                      const timeDiff = Math.abs(returnDate - pickUp);
                      const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
                      const totalAmount = (
                        days * selectedCarRental.pricePerDay
                      ).toFixed(2);

                      return (
                        <>
                          <View style={styles.rentalDetailRow}>
                            <MaterialCommunityIcons
                              name="timer-outline"
                              size={14}
                              color={colors.primary}
                            />
                            <Text
                              style={[
                                styles.rentalDetailText,
                                { color: colors.text },
                              ]}
                            >
                              Duration: {days === 1 ? "1 day" : `${days} days`}
                            </Text>
                          </View>
                          <View style={styles.rentalDetailRow}>
                            <MaterialIcons
                              name="attach-money"
                              size={14}
                              color={colors.primary}
                            />
                            <Text
                              style={[
                                styles.rentalDetailText,
                                { color: colors.text },
                              ]}
                            >
                              Earnings: ₱{totalAmount}
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>

                  {/* Display if there's a review for this rental */}
                  {rental.hasReview && (
                    <View
                      style={[
                        styles.reviewIndicator,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name="star"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.reviewIndicatorText,
                          { color: colors.primary },
                        ]}
                      >
                        This rental has been reviewed
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const AuthErrorScreen = () => (
    <View style={styles.centerContainer}>
      <MaterialIcons name="lock" size={60} color={colors.secondary} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        Login Required
      </Text>
      <Text style={[styles.errorText, { color: colors.secondary }]}>
        Please login to view your rental history
      </Text>
      <TouchableOpacity
        style={[
          styles.loginButton,
          { backgroundColor: colors.primary, borderColor: colors.borderCars },
        ]}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.buttonText}>Login Now</Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyHistoryScreen = () => (
    <View style={styles.centerContainer}>
      <MaterialIcons name="history" size={60} color={colors.secondary} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        No Rental History
      </Text>
      <Text style={[styles.errorText, { color: colors.secondary }]}>
        You haven't completed any rentals yet
      </Text>
    </View>
  );

  const ErrorScreen = () => (
    <View style={styles.centerContainer}>
      <MaterialIcons name="error-outline" size={60} color={colors.error} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorText, { color: colors.secondary }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[
          styles.retryButton,
          { backgroundColor: colors.primary, borderColor: colors.borderCars },
        ]}
        onPress={fetchRentalHistory}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading your rental history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Tab Navigation */}

      {!isAuthenticated ? (
        <AuthErrorScreen />
      ) : error ? (
        <ErrorScreen />
      ) : (
        <>
          <FlatList
            data={myCarsRentals}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <CarRentalCard carRental={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.rentalList,
              myCarsRentals.length === 0 && styles.emptyList,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <MaterialIcons
                  name="directions-car"
                  size={60}
                  color={colors.secondary}
                />
                <Text style={[styles.errorTitle, { color: colors.text }]}>
                  No Car Rentals
                </Text>
                <Text style={[styles.errorText, { color: colors.secondary }]}>
                  You don't have any completed rentals for your cars
                </Text>
              </View>
            }
            ListHeaderComponent={
              <Text style={[styles.title, { color: colors.text }]}>
                Car Rental History
              </Text>
            }
          />
        </>
      )}

      <RentalModal />
      <CarRentalModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 16,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  rentalList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  rentalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
  },
  carDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  carImageContainer: {
    marginRight: 12,
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  carImageThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  carInfoContainer: {
    flex: 1,
  },
  carTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  carSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 10,
  },
  rentalInfo: {
    marginTop: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  reviewTag: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  addReviewButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
  viewDetailsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 4,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  modalScrollContent: {
    flex: 1,
  },
  modalScrollContentContainer: {
    paddingBottom: 20,
  },
  carImageSection: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
  },
  carModalImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  detailsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  infoCards: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  ownerInfoContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "500",
  },
  ownerEmail: {
    fontSize: 13,
  },
  reviewContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewRating: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  reviewMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  addReviewContainer: {
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addReviewText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
  },
  carDetailsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 8,
    flexWrap: "wrap",
  },
  carDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  carDetailText: {
    fontSize: 13,
    marginLeft: 4,
  },
  renterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  renterInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  renterDetails: {
    flex: 1,
  },
  renterName: {
    fontSize: 16,
    fontWeight: "500",
  },
  renterEmail: {
    fontSize: 13,
  },
  rentalHistoryItem: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
  },
  rentalHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rentalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  rentalDetails: {
    marginBottom: 10,
  },
  rentalDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  rentalDetailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  reviewIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  reviewIndicatorText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
});

export default RentalHistory;
