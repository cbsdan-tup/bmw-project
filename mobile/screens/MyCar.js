import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import {
  MaterialIcons,
  FontAwesome,
  Ionicons,
  AntDesign,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const MyCar = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [activeRentals, setActiveRentals] = useState([]);
  const [myRentedCars, setMyRentedCars] = useState([]);
  const [myAvailableCars, setMyAvailableCars] = useState([]); // New state for available cars
  const [loading, setLoading] = useState(true);
  const [loadingMyCars, setLoadingMyCars] = useState(true);
  const [loadingAvailableCars, setLoadingAvailableCars] = useState(true); // New loading state
  const [error, setError] = useState(null);
  const [errorMyCars, setErrorMyCars] = useState(null);
  const [errorAvailableCars, setErrorAvailableCars] = useState(null); // New error state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("renting-out"); // 'renting-out' or 'available'
  const [selectedRenter, setSelectedRenter] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [renterModalVisible, setRenterModalVisible] = useState(false);

  // Make sure we have a fallback for textSecondary if it doesn't exist in your theme
  const textSecondaryColor = colors.textSecondary || colors.text + "80"; // 50% opacity fallback

  // Monitor authentication state using AuthContext
  useEffect(() => {
    console.log("MyCar - Auth State:", { user, isAuthenticated });
  }, [user, isAuthenticated]);

  const fetchActiveRentals = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?._id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      console.log("Fetching rentals for user ID:", user._id);

      // Try with different error handling
      try {
        const response = await api.get(`/my-rentals/${user._id}`);

        // Log the response
        console.log("API Response:", response.status, response.data);

        // Check if response has data
        if (!response.data) {
          throw new Error("No data returned from API");
        }

        // Filter rentals with status: Confirmed, Active, Pending
        const filteredRentals = Array.isArray(response.data)
          ? response.data.filter((rental) =>
              ["Confirmed", "Active", "Pending"].includes(rental.status)
            )
          : [];

        setActiveRentals(filteredRentals);
      } catch (apiError) {
        console.error(
          "API Error details:",
          apiError.response?.status,
          apiError.response?.data
        );
        throw new Error(
          `Server error: ${
            apiError.response?.data?.message || apiError.message
          }`
        );
      }
    } catch (err) {
      console.error("Error fetching rentals:", err);
      setError(
        `Failed to load your rentals: ${err.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMyCarsWithRentals = async () => {
    try {
      setLoadingMyCars(true);
      setErrorMyCars(null);

      if (!user?._id) {
        setErrorMyCars("User not authenticated");
        setLoadingMyCars(false);
        return;
      }

      console.log("Fetching owned cars with rentals for user ID:", user._id);

      try {
        const response = await api.get(`/user-cars-with-rentals/${user._id}`);

        // Log the response
        console.log("My Cars API Response:", response.status, response.data);

        // Check if response has data
        if (!response.data) {
          throw new Error("No data returned from API");
        }

        setMyRentedCars(response.data.activeRentedCars || []);
      } catch (apiError) {
        console.error(
          "API Error details:",
          apiError.response?.status,
          apiError.response?.data
        );
        throw new Error(
          `Server error: ${
            apiError.response?.data?.message || apiError.message
          }`
        );
      }
    } catch (err) {
      console.error("Error fetching my rented cars:", err);
      setErrorMyCars(
        `Failed to load your cars with rentals: ${
          err.message || "Unknown error"
        }`
      );
    } finally {
      setLoadingMyCars(false);
    }
  };

  // New function to fetch available cars (cars not being rented)
  const fetchMyAvailableCars = async () => {
    try {
      setLoadingAvailableCars(true);
      setErrorAvailableCars(null);

      if (!user?._id) {
        setErrorAvailableCars("User not authenticated");
        setLoadingAvailableCars(false);
        return;
      }

      console.log("Fetching available cars for user ID:", user._id);

      try {
        // Get all cars owned by the user
        const response = await api.get(`/my-cars/${user._id}`);

        console.log(
          "My Available Cars API Response:",
          response.status,
          response.data
        );

        if (!response.data || !response.data.cars) {
          throw new Error("No data returned from API");
        }

        // Get all cars with active rentals
        const rentedCarsResponse = await api.get(
          `/user-cars-with-rentals/${user._id}`
        );
        const rentedCarIds =
          rentedCarsResponse.data.activeRentedCars?.map((car) => car._id) || [];

        // Filter out cars that are already being rented
        const availableCars = response.data.cars.filter(
          (car) => !rentedCarIds.includes(car._id)
        );

        setMyAvailableCars(availableCars || []);
      } catch (apiError) {
        console.error(
          "API Error details:",
          apiError.response?.status,
          apiError.response?.data
        );
        throw new Error(
          `Server error: ${
            apiError.response?.data?.message || apiError.message
          }`
        );
      }
    } catch (err) {
      console.error("Error fetching my available cars:", err);
      setErrorAvailableCars(
        `Failed to load your available cars: ${err.message || "Unknown error"}`
      );
    } finally {
      setLoadingAvailableCars(false);
    }
  };

  useEffect(() => {
    // Only fetch when user is authenticated
    if (isAuthenticated && user?._id) {
      fetchActiveRentals();
      fetchMyCarsWithRentals();
      fetchMyAvailableCars(); // Fetch available cars
    }
  }, [isAuthenticated, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveRentals();
    fetchMyCarsWithRentals();
    fetchMyAvailableCars(); // Refresh available cars
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmed":
        return colors.success;
      case "Active":
        return "#FF9500";
      case "Pending":
        return colors.secondary;
      default:
        return colors.text;
    }
  };

  const openRenterDetails = async (rental) => {
    if (!rental || !rental.renter || !rental.renter._id) {
      console.error("Invalid rental data (missing renter):", rental);
      return;
    }

    try {
      // Handle both cases: when car is an ID string or an object
      let carData;
      if (typeof rental.car === "string") {
        // If car is just an ID string, fetch the car details
        console.log("Fetching car details for ID:", rental.car);
        const response = await api.get(`/cars/${rental.car}`);
        carData = response.data.car;
      } else if (rental.car && rental.car._id) {
        // If car is already an object with _id
        carData = rental.car;
      } else {
        console.error("Invalid car data:", rental.car);
        return;
      }

      console.log("Opening renter details for:", {
        renterId: rental.renter._id,
        carId: carData._id,
      });

      setSelectedRenter(rental.renter);
      setSelectedCar(carData);
      setRenterModalVisible(true);
    } catch (error) {
      console.error("Error opening renter details:", error);
    }
  };

  // Add this new function to mark messages as read
  const markMessagesAsRead = async (renterId, carId) => {
    try {
      if (!renterId || !carId) {
        console.error("Cannot mark messages as read: Missing IDs", {
          renterId,
          carId,
        });
        return;
      }

      console.log("Marking messages as read for:", { renterId, carId });
      await api.put(`/messages/read/${renterId}/${carId}`);
      console.log("Messages marked as read successfully");
    } catch (error) {
      console.error(
        "Error marking messages as read:",
        error.response?.data || error.message
      );
    }
  };

  // Update the navigate to chat function
  const navigateToChat = () => {
    if (!selectedRenter || !selectedCar) {
      console.error(
        "Cannot navigate to chat: Missing renter or car information"
      );
      return;
    }

    const renterId = selectedRenter._id;
    const carId = selectedCar._id;

    // Validate IDs
    if (!renterId || !carId) {
      console.error("Invalid IDs for chat navigation:", {
        renterId,
        carId,
        selectedRenter: selectedRenter
          ? JSON.stringify(selectedRenter)
          : "null",
        selectedCar: selectedCar ? JSON.stringify(selectedCar) : "null",
      });
      return;
    }

    console.log("Navigating to chat with:", {
      renterId,
      carId,
      renterName: `${selectedRenter.firstName || ""} ${
        selectedRenter.lastName || ""
      }`.trim(),
    });

    // Mark messages as read before navigating
    markMessagesAsRead(renterId, carId);

    // Close the modal
    setRenterModalVisible(false);

    // Navigate to chat screen with the required parameters
    navigation.navigate("ChatScreen", {
      recipientId: renterId,
      recipientName: `${selectedRenter.firstName || ""} ${
        selectedRenter.lastName || ""
      }`.trim(),
      carId: carId,
      carDetails: `${selectedCar.brand || ""} ${selectedCar.model || ""} ${
        selectedCar.year ? `(${selectedCar.year})` : ""
      }`,
      isOwner: true, // Indicates the user is the car owner in this chat
    });
  };

  const renderRentalCard = ({ item }) => {
    const car = item.car;
    if (!car) return null;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderCars,
          },
        ]}
      >
        <Image
          source={{
            uri: car.images[0]?.url || "https://via.placeholder.com/150",
          }}
          style={styles.carImage}
        />

        <View style={styles.cardContent}>
          <Text style={[styles.carTitle, { color: colors.text }]}>
            {car.brand} {car.model}
          </Text>

          <View style={styles.statusContainer}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>
              Status:
            </Text>
            <Text
              style={[
                styles.statusValue,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons
              name="date-range"
              size={16}
              color={colors.secondary}
            />
            <Text style={[styles.detailText, { color: colors.text }]}>
              Pickup: {formatDate(item.pickUpDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons
              name="event-return"
              size={16}
              color={colors.secondary}
            />
            <Text style={[styles.detailText, { color: colors.text }]}>
              Return: {formatDate(item.returnDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="money" size={16} color={colors.secondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              ₱{car.pricePerDay} per day
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.secondary}
            />
            <Text
              style={[styles.detailText, { color: colors.text }]}
              numberOfLines={1}
            >
              {car.pickUpLocation}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRenterAvatar = (renter) => {
    if (!renter) return null;

    if (renter.profileImage) {
      return (
        <Image
          source={{ uri: renter.profileImage }}
          style={styles.renterAvatar}
        />
      );
    } else {
      const initial = renter.firstName
        ? renter.firstName.charAt(0).toUpperCase()
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

  const renderCarRentalCard = ({ item }) => {
    // Verify that item has activeRentals and item is a car object
    if (!item || !item.activeRentals || item.activeRentals.length === 0)
      return null;

    return (
      <View
        style={[
          styles.carRentalCard,
          {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderCars,
          },
        ]}
      >
        <Image
          source={{
            uri:
              item.images && item.images.length > 0
                ? item.images[0]
                : "https://via.placeholder.com/150",
          }}
          style={styles.carImage}
        />

        <View style={styles.cardContent}>
          <Text style={[styles.carTitle, { color: colors.text }]}>
            {item.brand} {item.model}
          </Text>

          <View style={styles.carDetailsRow}>
            <View style={styles.carDetailItem}>
              <MaterialCommunityIcons
                name="car"
                size={16}
                color={colors.secondary}
              />
              <Text
                style={[styles.carDetailText, { color: textSecondaryColor }]}
              >
                {item.year}
              </Text>
            </View>
            <View style={styles.carDetailItem}>
              <MaterialCommunityIcons
                name="seat"
                size={16}
                color={colors.secondary}
              />
              <Text
                style={[styles.carDetailText, { color: textSecondaryColor }]}
              >
                {item.seatCapacity} seats
              </Text>
            </View>
            <View style={styles.carDetailItem}>
              <MaterialIcons
                name="attach-money"
                size={16}
                color={colors.secondary}
              />
              <Text
                style={[styles.carDetailText, { color: textSecondaryColor }]}
              >
                ₱{item.pricePerDay}/day
              </Text>
            </View>
          </View>

          <View style={styles.rentalHeaderRow}>
            <Text style={[styles.rentalCountText, { color: colors.primary }]}>
              {item.activeRentals.length} Active{" "}
              {item.activeRentals.length === 1 ? "Rental" : "Rentals"}
            </Text>
          </View>

          {item.activeRentals.map((rental, index) => (
            <View key={rental._id} style={styles.rentalItem}>
              <View style={styles.statusContainer}>
                <Text style={[styles.statusLabel, { color: colors.text }]}>
                  Status:
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(rental.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusValue,
                      { color: getStatusColor(rental.status) },
                    ]}
                  >
                    {rental.status}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.renterRow}
                onPress={() => openRenterDetails(rental)}
                activeOpacity={0.7}
              >
                {renderRenterAvatar(rental.renter)}
                <View style={styles.renterInfo}>
                  <Text style={[styles.renterText, { color: colors.text }]}>
                    {rental.renter
                      ? `${rental.renter.firstName || ""} ${
                          rental.renter.lastName || ""
                        }`.trim()
                      : "Unknown User"}
                  </Text>
                  <Text
                    style={[
                      styles.renterSubText,
                      { color: textSecondaryColor },
                    ]}
                  >
                    {rental.renter?.email || "No email provided"}
                  </Text>
                </View>
                <View style={styles.viewDetailsButton}>
                  <Text
                    style={[styles.viewDetailsText, { color: colors.primary }]}
                  >
                    Details
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.dateContainer}>
                <View style={styles.dateItem}>
                  <MaterialIcons
                    name="date-range"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    Pickup: {formatDate(rental.pickUpDate)}
                  </Text>
                </View>

                <View style={styles.dateItem}>
                  <MaterialIcons
                    name="event-return"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    Return: {formatDate(rental.returnDate)}
                  </Text>
                </View>
              </View>

              {index < item.activeRentals.length - 1 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.borderCars },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // New function to render available car card
  const renderAvailableCarCard = ({ item }) => {
    if (!item) return null;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderCars,
          },
        ]}
      >
        <Image
          source={{
            uri:
              item.images && item.images.length > 0
                ? item.images[0]
                : "https://via.placeholder.com/150",
          }}
          style={styles.carImage}
        />

        <View style={styles.cardContent}>
          <Text style={[styles.carTitle, { color: colors.text }]}>
            {item.brand} {item.model}
          </Text>

          <View style={styles.statusContainer}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>
              Status:
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.success + "20" },
              ]}
            >
              <Text style={[styles.statusValue, { color: colors.success }]}>
                Available
              </Text>
            </View>
          </View>

          <View style={styles.carDetailsRow}>
            <View style={styles.carDetailItem}>
              <MaterialCommunityIcons
                name="car"
                size={16}
                color={colors.secondary}
              />
              <Text
                style={[styles.carDetailText, { color: textSecondaryColor }]}
              >
                {item.year}
              </Text>
            </View>
            <View style={styles.carDetailItem}>
              <MaterialCommunityIcons
                name="seat"
                size={16}
                color={colors.secondary}
              />
              <Text
                style={[styles.carDetailText, { color: textSecondaryColor }]}
              >
                {item.seatCapacity} seats
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="money" size={16} color={colors.secondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              ₱{item.pricePerDay} per day
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.secondary}
            />
            <Text
              style={[styles.detailText, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.pickUpLocation}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const RenterModal = () => {
    if (!selectedRenter) return null;

    const getFullName = () => {
      const firstName = selectedRenter.firstName || "";
      const lastName = selectedRenter.lastName || "";
      return (firstName + " " + lastName).trim() || "Unknown User";
    };

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={renterModalVisible}
        onRequestClose={() => setRenterModalVisible(false)}
        statusBarTranslucent={false}
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
              Renter Details
            </Text>
            <TouchableOpacity
              onPress={() => setRenterModalVisible(false)}
              style={styles.closeButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <AntDesign name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContentContainer}
          >
            {/* Renter Profile Section */}
            <View
              style={[
                styles.renterProfileSection,
                {
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              {selectedRenter.profileImage ? (
                <Image
                  source={{ uri: selectedRenter.profileImage }}
                  style={styles.renterProfileImage}
                />
              ) : (
                <View
                  style={[
                    styles.profileImagePlaceholder,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.profileInitial,
                      { color: colors.cardBackground },
                    ]}
                  >
                    {selectedRenter.firstName
                      ? selectedRenter.firstName.charAt(0).toUpperCase()
                      : "?"}
                  </Text>
                </View>
              )}

              <Text style={[styles.renterName, { color: colors.text }]}>
                {getFullName()}
              </Text>
            </View>

            {/* Action Buttons */}
            <View
              style={[
                styles.actionButtonsContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.primary,
                    borderWidth: 1,
                    borderColor: colors.borderCars,
                  },
                ]}
                onPress={navigateToChat}
              >
                <Ionicons name="chatbubble-outline" size={18} color="white" />
                <Text style={styles.actionBtnText}>Chat</Text>
              </TouchableOpacity>

              {selectedRenter.email && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.secondary,
                      borderWidth: 1,
                      borderColor: colors.borderCars,
                    },
                  ]}
                  onPress={() =>
                    Linking.openURL(`mailto:${selectedRenter.email}`)
                  }
                >
                  <MaterialIcons name="email" size={18} color="white" />
                  <Text style={styles.actionBtnText}>Email</Text>
                </TouchableOpacity>
              )}

              {selectedRenter.phone && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.success,
                      borderWidth: 1,
                      borderColor: colors.borderCars,
                    },
                  ]}
                  onPress={() => Linking.openURL(`tel:${selectedRenter.phone}`)}
                >
                  <MaterialIcons name="phone" size={18} color="white" />
                  <Text style={styles.actionBtnText}>Call</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Contact Information */}
            <View
              style={[
                styles.contactInfoSection,
                {
                  backgroundColor: colors.cardBackground,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Contact Information
              </Text>

              <View style={styles.infoCards}>
                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderWidth: 1,
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
                      name="email"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Email
                    </Text>
                    <Text
                      style={[styles.infoValue, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {selectedRenter.email || "Not provided"}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.background,
                      borderWidth: 1,
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
                      name="phone"
                      size={22}
                      color={colors.success}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text
                      style={[styles.infoLabel, { color: textSecondaryColor }]}
                    >
                      Phone
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {selectedRenter.phone || "Not provided"}
                    </Text>
                  </View>
                </View>

                {selectedRenter.location && (
                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: colors.background,
                        borderWidth: 1,
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
                        style={[
                          styles.infoLabel,
                          { color: textSecondaryColor },
                        ]}
                      >
                        Location
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {selectedRenter.location}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Tips Section */}
            <View
              style={[
                styles.tipsSection,
                {
                  backgroundColor: colors.cardBackground,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: colors.borderCars,
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Quick Tips
              </Text>
              <View
                style={[
                  styles.tipCard,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color={colors.primary}
                  style={styles.tipIcon}
                />
                <Text style={[styles.tipText, { color: colors.text }]}>
                  Communication is key! Chat with{" "}
                  {selectedRenter.firstName || "the renter"} to coordinate
                  pickup details and answer any questions.
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Tab Navigation */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: colors.cardBackground },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "renting-out" && [
              styles.activeTab,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("renting-out")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "renting-out"
                    ? colors.primary
                    : textSecondaryColor,
              },
            ]}
          >
            My Cars Rented Out
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "available" && [
              styles.activeTab,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("available")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "available"
                    ? colors.primary
                    : textSecondaryColor,
              },
            ]}
          >
            My Available Cars
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollContent}
      >
        {activeTab === "renting-out" ? (
          // Cars being rented out view
          <>
            {loadingMyCars && !refreshing ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[styles.loadingText, { color: textSecondaryColor }]}
                >
                  Loading your rentals...
                </Text>
              </View>
            ) : errorMyCars ? (
              <View style={styles.messageContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={60}
                  color={colors.error || "#ff3b30"}
                />
                <Text
                  style={[
                    styles.errorText,
                    { color: colors.error || "#ff3b30" },
                  ]}
                >
                  {errorMyCars}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderWidth: 1,
                      borderColor: colors.borderCars,
                    },
                  ]}
                  onPress={fetchMyCarsWithRentals}
                >
                  <Text style={styles.actionButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : myRentedCars.length === 0 ? (
              <View style={styles.messageContainer}>
                <Ionicons
                  name="car-outline"
                  size={70}
                  color={colors.secondary}
                />
                <Text style={[styles.messageTitle, { color: colors.text }]}>
                  No cars being rented
                </Text>
                <Text
                  style={[
                    styles.messageSubtitle,
                    { color: textSecondaryColor },
                  ]}
                >
                  When someone rents your cars, they'll appear here
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderWidth: 1,
                      borderColor: colors.borderCars,
                    },
                  ]}
                  onPress={() => navigation.navigate("ListCar")}
                >
                  <Text style={styles.actionButtonText}>List a Car</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.carListContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {myRentedCars.length}{" "}
                  {myRentedCars.length === 1 ? "Car" : "Cars"} Being Rented
                </Text>
                <FlatList
                  data={myRentedCars}
                  renderItem={renderCarRentalCard}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        ) : (
          // Available cars view (replacing the renting view)
          <>
            {loadingAvailableCars && !refreshing ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[styles.loadingText, { color: textSecondaryColor }]}
                >
                  Loading your available cars...
                </Text>
              </View>
            ) : errorAvailableCars ? (
              <View style={styles.messageContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={60}
                  color={colors.error || "#ff3b30"}
                />
                <Text
                  style={[
                    styles.errorText,
                    { color: colors.error || "#ff3b30" },
                  ]}
                >
                  {errorAvailableCars}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderWidth: 1,
                      borderColor: colors.borderCars,
                    },
                  ]}
                  onPress={fetchMyAvailableCars}
                >
                  <Text style={styles.actionButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : myAvailableCars.length === 0 ? (
              <View style={styles.messageContainer}>
                <Ionicons
                  name="car-sport-outline"
                  size={70}
                  color={colors.secondary}
                />
                <Text style={[styles.messageTitle, { color: colors.text }]}>
                  You don't have any available cars
                </Text>
                <Text
                  style={[
                    styles.messageSubtitle,
                    { color: textSecondaryColor },
                  ]}
                >
                  List your vehicle and start earning
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderWidth: 1,
                      borderColor: colors.borderCars,
                    },
                  ]}
                  onPress={() => navigation.navigate("ListCar")}
                >
                  <Text style={styles.actionButtonText}>List a Car</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.carListContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {myAvailableCars.length}{" "}
                  {myAvailableCars.length === 1 ? "Car" : "Cars"} Available for
                  Rent
                </Text>
                <FlatList
                  data={myAvailableCars}
                  renderItem={renderAvailableCarCard}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <RenterModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  refreshButton: {
    padding: 8,
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
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 8,
  },
  carListContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  messageSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 150,
    // borderWidth and borderColor removed
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  loaderContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    // borderWidth and borderColor removed
  },
  carImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 16,
  },
  carTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    marginRight: 6,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  errorText: {
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 8,
  },
  rentalItem: {
    marginBottom: 8,
  },
  carRentalCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    // borderWidth and borderColor removed
  },
  rentalCountText: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
  },
  renterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  renterDetailsContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  renterProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "rgba(0,0,0,0.05)",
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: "bold",
  },
  renterName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
  },
  contactInfoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 8,
  },
  contactButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 6,
  },
  infoSection: {
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  carDetailsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 16,
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
  rentalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  renterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      Platform.OS === "ios" ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.03)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  renterAvatar: {
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
  renterInfo: {
    flex: 1,
  },
  renterText: {
    fontSize: 15,
    fontWeight: "500",
  },
  renterSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "500",
    marginRight: 2,
  },
  dateContainer: {
    marginBottom: 8,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  closeButton: {
    padding: 5,
  },
  modalScrollContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 15,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  infoCard: {
    width: "100%",
    borderRadius: 10,
    padding: 16,
    marginBottom: 15,
    alignItems: "center",
    // borderWidth and borderColor removed
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },

  // Enhanced Modal styles
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
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 15,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  infoCard: {
    width: "100%",
    borderRadius: 10,
    padding: 16,
    marginBottom: 15,
    alignItems: "center",
    // borderWidth and borderColor removed
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },

  // Enhanced Modal styles
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

  // Renter Profile Section
  renterProfileSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    // borderWidth and borderColor removed
  },
  renterProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: "bold",
  },
  renterName: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    // borderWidth and borderColor removed
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: "center",
    // borderWidth and borderColor removed
  },
  actionBtnText: {
    color: "white",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 15,
  },

  // Contact Info Section
  contactInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    // borderWidth and borderColor removed
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
    borderWidth: 1, // Add solid borderCars
    // borderColor: colors.borderCars, // Black borderCars color
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

  // Tips Section
  tipsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    // borderWidth and borderColor removed
  },
  tipCard: {
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  editButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default MyCar;
