import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
  FlatList,
  Modal,
  StatusBar,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { fetchCarByID, toggleFavorite } from "../redux/slices/carSlice";
import {
  createBooking,
  resetBookingSuccess,
  fetchUserBookings,
} from "../redux/slices/bookingSlice";
import { CAR_IMAGES } from "../config/constants";
import Icon from "react-native-vector-icons/FontAwesome";
import StarRating from "../components/StarRating";
import { useToast } from "../context/ToastContext";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Picker } from "@react-native-picker/picker";
import api from "./../services/api";

const { width, height } = Dimensions.get("window");

const CarDetailsScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const toast = useToast();
  const { currentCar, loading, error, favorites } = useSelector(
    (state) => state.cars
  );
  const {
    loading: bookingLoading,
    error: bookingError,
    bookingSuccess,
  } = useSelector((state) => state.bookings);
  const { carId } = route.params || {};
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [pickupDate, setPickupDate] = useState(null);
  const [returnDate, setReturnDate] = useState(null);
  const [isPickupDatePickerVisible, setPickupDatePickerVisibility] =
    useState(false);
  const [isReturnDatePickerVisible, setReturnDatePickerVisibility] =
    useState(false);
  const [paymentMode, setPaymentMode] = useState("");
  const [rentalDays, setRentalDays] = useState(0);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showInquiriesModal, setShowInquiriesModal] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  const [showRentalHistoryModal, setShowRentalHistoryModal] = useState(false);
  const [carRentals, setCarRentals] = useState([]);
  const [loadingRentals, setLoadingRentals] = useState(false);

  const markMessagesAsRead = async (senderId) => {
    try {
      await api.put(`/messages/read/${senderId}/${carId}`);
      setUnreadCounts((prev) => ({
        ...prev,
        [senderId]: 0,
      }));
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const fetchCarInquiries = async () => {
    if (!carId) return;

    setLoadingInquiries(true);
    try {
      const response = await api.get(`/car-inquiries/${carId}`);
      const validInquiries = response.data.inquiries.filter(
        (inquiry) =>
          inquiry.sender &&
          inquiry.messages &&
          inquiry.messages.length > 0 &&
          inquiry.sender._id !== currentCar.owner._id
      );

      const counts = {};
      validInquiries.forEach((inquiry) => {
        counts[inquiry.sender._id] = inquiry.unreadCount || 0;
      });
      setUnreadCounts(counts);
      setInquiries(validInquiries);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      toast.error("Failed to load inquiries");
    } finally {
      setLoadingInquiries(false);
    }
  };

  const fetchCarRentals = async () => {
    if (!carId) return;

    setLoadingRentals(true);
    try {
      const response = await api.get(`/car-rentals/${carId}`);
      // Sort by date (newest first) and limit to latest 10
      const sortedRentals = (response.data || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
      setCarRentals(sortedRentals);
    } catch (error) {
      console.error("Error fetching car rentals:", error);
      toast.error("Failed to load rental history");
    } finally {
      setLoadingRentals(false);
    }
  };

  useEffect(() => {
    if (carId) {
      dispatch(fetchCarByID(carId));
    }
  }, [carId, dispatch]);

  useEffect(() => {
    if (currentCar && favorites) {
      setIsFavorite(favorites.includes(currentCar._id));
    }
  }, [currentCar, favorites]);

  useEffect(() => {
    if (bookingError) {
      toast.error(bookingError);
    }
  }, [bookingError, toast]);

  useEffect(() => {
    if (pickupDate && returnDate) {
      const pickupTime = new Date(pickupDate).getTime();
      const returnTime = new Date(returnDate).getTime();
      const diffTime = returnTime - pickupTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setRentalDays(diffDays > 0 ? diffDays : 0);
    }
  }, [pickupDate, returnDate]);

  useEffect(() => {
    if (showInquiriesModal) {
      fetchCarInquiries();
    }
  }, [showInquiriesModal]);

  useEffect(() => {
    if (showRentalHistoryModal) {
      fetchCarRentals();
    }
  }, [showRentalHistoryModal]);

  const handleFavoritePress = () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }

    dispatch(
      toggleFavorite({
        carId: currentCar._id,
        userId: user._id,
        carDetails: currentCar,
      })
    )
      .unwrap()
      .then((result) => {
        if (result.isAdded) {
          toast.success(
            `${currentCar.brand} ${currentCar.model} was added to your favorites`
          );
        } else {
          toast.info(
            `${currentCar.brand} ${currentCar.model} was removed from your favorites`
          );
        }
      })
      .catch((error) => {
        toast.error(error || "Failed to update favorites. Please try again.");
      });
  };

  const handleSharePress = async () => {
    if (!currentCar) return;

    try {
      await Share.share({
        message: `Check out this ${currentCar.brand} ${currentCar.model} for rent at ₱${currentCar.pricePerDay}/day!`,
        url: `bmwrental://car/${carId}`,
      });
    } catch (error) {
      console.error("Error sharing car:", error);
    }
  };

  const showPickupDatePicker = () => {
    setPickupDatePickerVisibility(true);
  };

  const hidePickupDatePicker = () => {
    setPickupDatePickerVisibility(false);
  };

  const showReturnDatePicker = () => {
    setReturnDatePickerVisibility(true);
  };

  const hideReturnDatePicker = () => {
    setReturnDatePickerVisibility(false);
  };

  const handleConfirmPickupDate = (date) => {
    setPickupDate(date);
    hidePickupDatePicker();
  };

  const handleConfirmReturnDate = (date) => {
    setReturnDate(date);
    hideReturnDatePicker();
  };

  const handleBookPress = () => {
    if (!user) {
      toast.warning("Please login to book this car");
      navigation.navigate("Login");
      return;
    }

    setShowBookingModal(true);
    if (!pickupDate && !returnDate) {
      setPaymentMode("");
      setRentalDays(0);
    }
  };

  const validateBookingForm = () => {
    if (!pickupDate) {
      toast.error("Please select a pickup date");
      return false;
    }

    if (!returnDate) {
      toast.error("Please select a return date");
      return false;
    }

    if (!paymentMode) {
      toast.error("Please select a payment method");
      return false;
    }

    if (rentalDays <= 0) {
      toast.error("Invalid rental period");
      return false;
    }

    return true;
  };

  const handleShowConfirmation = () => {
    if (!validateBookingForm()) return;

    navigation.navigate("CheckoutScreen", {
      car: currentCar,
      pickupDate,
      returnDate,
      rentalDays,
      paymentMode,
    });

    setShowBookingModal(false);
  };

  const handleImagePress = (index) => {
    setActiveImageIndex(index);
    setIsImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setIsImageViewerVisible(false);
  };

  const handleViewReviews = () => {
    navigation.navigate("Reviews", {
      carId: currentCar._id,
      carTitle: `${currentCar.brand} ${currentCar.model}`,
    });
  };

  const getProfilePictureUri = (sender) => {
    if (!sender) return null;
    if (sender.avatar && sender.avatar.url) {
      return sender.avatar.url;
    }

    return null;
  };

  const getStatusColor = (status, colors) => {
    switch (status) {
      case "Confirmed":
        return colors.success;
      case "Pending":
        return colors.warning;
      case "Completed":
        return colors.primary;
      case "Cancelled":
        return colors.error;
      case "Active":
        return "#8e44ad";
      default:
        return colors.secondary;
    }
  };

  const InquiriesModal = () => {
    if (!showInquiriesModal) return null;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInquiriesModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.inquiriesModal, { backgroundColor: colors.card }]}
          >
            <View style={styles.bookingFormHandle} />
            <Text style={[styles.inquiriesTitle, { color: colors.text }]}>
              Car Inquiries
            </Text>

            <FlatList
              data={inquiries}
              keyExtractor={(item) => item.sender._id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.inquiryItem,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => {
                    markMessagesAsRead(item.sender._id);
                    setShowInquiriesModal(false);
                    navigation.navigate("ChatScreen", {
                      recipientId: item.sender._id,
                      carId: currentCar._id,
                    });
                  }}
                >
                  <View style={styles.inquiryUserInfo}>
                    {getProfilePictureUri(item.sender) ? (
                      <Image
                        source={{ uri: getProfilePictureUri(item.sender) }}
                        style={styles.inquiryUserAvatar}
                        onError={(e) => {
                          console.log(
                            "Error loading avatar:",
                            e.nativeEvent.error
                          );
                        }}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.avatarInitial}>
                          {item.sender && item.sender.firstName
                            ? item.sender.firstName[0].toUpperCase()
                            : "U"}
                        </Text>
                      </View>
                    )}

                    <View style={styles.inquiryUserDetails}>
                      <Text
                        style={[styles.inquiryUserName, { color: colors.text }]}
                      >
                        {`${item.sender.firstName} ${item.sender.lastName}`}
                      </Text>
                      <Text
                        style={[
                          styles.inquiryLastMessage,
                          { color: colors.secondary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.lastMessage?.content || "No messages"}
                        {item.lastMessage?.images?.length > 0 && " 📷"}
                      </Text>
                      <Text
                        style={[
                          styles.inquiryTimestamp,
                          { color: colors.secondary },
                        ]}
                      >
                        {new Date(
                          item.lastMessage?.createdAt
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                    {unreadCounts[item.sender._id] > 0 && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.unreadCount}>
                          {unreadCounts[item.sender._id]}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Icon
                    name="chevron-right"
                    size={16}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                loadingInquiries ? (
                  <ActivityIndicator
                    color={colors.primary}
                    style={{ marginTop: 20 }}
                  />
                ) : (
                  <View style={styles.emptyInquiries}>
                    <Icon name="inbox" size={40} color={colors.secondary} />
                    <Text
                      style={[
                        styles.emptyInquiriesText,
                        { color: colors.secondary },
                      ]}
                    >
                      No inquiries yet
                    </Text>
                  </View>
                )
              }
            />

            <TouchableOpacity
              style={styles.closeInquiriesButton}
              onPress={() => setShowInquiriesModal(false)}
            >
              <Text style={{ color: colors.secondary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const RentalHistoryModal = () => {
    if (!showRentalHistoryModal) return null;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRentalHistoryModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.rentalHistoryModal,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.bookingFormHandle} />
            <View style={styles.modalHeaderContainer}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Rental History
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
                {carRentals.length > 0 ? "Latest rentals" : "No rental history"}
              </Text>
            </View>

            {loadingRentals ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginVertical: 30 }}
                size="large"
              />
            ) : carRentals.length > 0 ? (
              <FlatList
                data={carRentals}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.rentalItem,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <View style={styles.rentalHeader}>
                      <View style={styles.rentalUserInfo}>
                        {item.renter?.avatar?.url ? (
                          <Image
                            source={{ uri: item.renter.avatar.url }}
                            style={styles.renterAvatar}
                            onError={(e) => {
                              console.log(
                                "Error loading renter avatar:",
                                e.nativeEvent.error
                              );
                            }}
                          />
                        ) : (
                          <View
                            style={[
                              styles.avatarPlaceholder,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <Text style={styles.avatarInitial}>
                              {item.renter?.firstName
                                ? item.renter.firstName[0].toUpperCase()
                                : "U"}
                            </Text>
                          </View>
                        )}

                        <View style={styles.rentalUserDetails}>
                          <Text
                            style={[styles.renterName, { color: colors.text }]}
                          >
                            {item.renter?.firstName || "Anonymous"}{" "}
                            {item.renter?.lastName
                              ? item.renter.lastName[0] + "."
                              : ""}
                          </Text>
                          <Text
                            style={[
                              styles.rentalDate,
                              { color: colors.secondary },
                            ]}
                            numberOfLines={1}
                          >
                            {new Date(
                              item.createdAt || item.pickUpDate
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: getStatusColor(
                              item.status,
                              colors
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>{item.status}</Text>
                      </View>
                    </View>

                    <View style={styles.rentalDates}>
                      <View style={styles.dateContainer}>
                        <View style={styles.dateIconContainer}>
                          <Icon
                            name="calendar-check-o"
                            size={18}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.dateColumn}>
                          <Text
                            style={[
                              styles.dateLabel,
                              { color: colors.secondary },
                            ]}
                          >
                            Pick-up
                          </Text>
                          <Text
                            style={[styles.dateValue, { color: colors.text }]}
                          >
                            {new Date(item.pickUpDate).toLocaleDateString()}
                          </Text>
                          <Text
                            style={[
                              styles.timeValue,
                              { color: colors.secondary },
                            ]}
                          >
                            {new Date(item.pickUpDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dateConnector}>
                        <View
                          style={[
                            styles.connector,
                            { backgroundColor: colors.border },
                          ]}
                        />
                        <Icon
                          name="arrow-right"
                          size={14}
                          color={colors.secondary}
                        />
                        <View
                          style={[
                            styles.connector,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      </View>

                      <View style={styles.dateContainer}>
                        <View style={styles.dateIconContainer}>
                          <Icon
                            name="calendar-times-o"
                            size={18}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.dateColumn}>
                          <Text
                            style={[
                              styles.dateLabel,
                              { color: colors.secondary },
                            ]}
                          >
                            Return
                          </Text>
                          <Text
                            style={[styles.dateValue, { color: colors.text }]}
                          >
                            {new Date(item.returnDate).toLocaleDateString()}
                          </Text>
                          <Text
                            style={[
                              styles.timeValue,
                              { color: colors.secondary },
                            ]}
                          >
                            {new Date(item.returnDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.rentalFooter,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      <View style={styles.paymentMethodContainer}>
                        <Icon
                          name={getPaymentIcon(item.paymentMethod)}
                          size={14}
                          color={colors.secondary}
                          style={styles.paymentIcon}
                        />
                        <Text
                          style={[styles.paymentMethod, { color: colors.text }]}
                        >
                          {item.paymentMethod || "Cash"}
                        </Text>
                      </View>
                      <View style={styles.paymentStatusContainer}>
                        <Text
                          style={[
                            styles.paymentStatus,
                            {
                              color:
                                item.paymentStatus === "Paid"
                                  ? colors.success
                                  : colors.error,
                            },
                          ]}
                        >
                          {item.paymentStatus || "Pending"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyRentals}>
                <Icon name="calendar" size={60} color={colors.border} />
                <Text
                  style={[styles.emptyRentalsText, { color: colors.secondary }]}
                >
                  No rental history found
                </Text>
                <Text
                  style={[
                    styles.emptyRentalsSubtext,
                    { color: colors.secondary },
                  ]}
                >
                  Previous rentals of this car will appear here
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.closeModalButton,
                { borderTopColor: colors.border },
              ]}
              onPress={() => setShowRentalHistoryModal(false)}
            >
              <Text style={{ color: colors.secondary, fontWeight: "500" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Helper function to get payment method icon
  const getPaymentIcon = (method) => {
    switch (method?.toLowerCase() || "") {
      case "credit card":
        return "credit-card";
      case "gcash":
        return "mobile";
      case "cash":
        return "money";
      default:
        return "credit-card-alt";
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading car details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Icon name="exclamation-circle" size={40} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => dispatch(fetchCarByID(carId))}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCar) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Icon name="car" size={40} color={colors.secondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Car not found
          </Text>
          <TouchableOpacity
            style={[styles.returnButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.returnButtonText}>Return to Search</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ImageViewer = () => {
    return (
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <StatusBar hidden />
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeImageViewer}
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <FlatList
            data={currentCar.images || []}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            pagingEnabled
            initialScrollIndex={activeImageIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.floor(
                e.nativeEvent.contentOffset.x / width
              );
              setActiveImageIndex(newIndex);
            }}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.fullScreenImageContainer}>
                <Image
                  source={{
                    uri: typeof item === "string" ? item : item?.url || null,
                  }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          <View style={styles.paginationContainer}>
            {(currentCar.images || []).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    width: activeImageIndex === index ? 12 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
    );
  };

  const BookingFormModal = () => {
    if (!showBookingModal || confirmDialogVisible) {
      return null;
    }

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.bookingFormModal, { backgroundColor: colors.card }]}
          >
            <View style={styles.bookingFormHandle} />

            <Text style={[styles.bookingFormTitle, { color: colors.text }]}>
              Book This Car
            </Text>

            <TouchableOpacity
              style={[styles.datePicker, { borderColor: colors.border }]}
              onPress={showPickupDatePicker}
            >
              <Icon
                name="calendar"
                size={18}
                color={colors.primary}
                style={styles.datePickerIcon}
              />
              <Text
                style={[
                  styles.datePickerText,
                  { color: pickupDate ? colors.text : colors.secondary },
                ]}
              >
                {pickupDate
                  ? pickupDate.toLocaleString()
                  : "Select Pick-up Date"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePicker, { borderColor: colors.border }]}
              onPress={showReturnDatePicker}
            >
              <Icon
                name="calendar"
                size={18}
                color={colors.primary}
                style={styles.datePickerIcon}
              />
              <Text
                style={[
                  styles.datePickerText,
                  { color: returnDate ? colors.text : colors.secondary },
                ]}
              >
                {returnDate
                  ? returnDate.toLocaleString()
                  : "Select Return Date"}
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.pickerContainer, { borderColor: colors.border }]}
            >
              <Picker
                selectedValue={paymentMode}
                onValueChange={(itemValue) => setPaymentMode(itemValue)}
                style={[styles.picker, { color: colors.text }]}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Select Payment Method" value="" />
                <Picker.Item label="Credit Card" value="Credit Card" />
                <Picker.Item label="GCash" value="GCash" />
                <Picker.Item label="Cash" value="Cash" />
              </Picker>
            </View>

            {pickupDate && returnDate && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text
                    style={[styles.summaryLabel, { color: colors.secondary }]}
                  >
                    Price per day:
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    ₱{currentCar.pricePerDay}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text
                    style={[styles.summaryLabel, { color: colors.secondary }]}
                  >
                    Rental days:
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {rentalDays}
                  </Text>
                </View>

                <View
                  style={[styles.totalRow, { borderTopColor: colors.border }]}
                >
                  <Text style={[styles.totalLabel, { color: colors.text }]}>
                    Total:
                  </Text>
                  <Text style={[styles.totalAmount, { color: colors.primary }]}>
                    ₱{rentalDays * currentCar.pricePerDay}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleShowConfirmation}
            >
              <Text style={styles.confirmButtonText}>Continue to Book</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBookingModal(false)}
            >
              <Text style={{ color: colors.secondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const DatePickerModals = () => (
    <>
      <DateTimePickerModal
        isVisible={isPickupDatePickerVisible}
        mode="datetime"
        onConfirm={handleConfirmPickupDate}
        onCancel={hidePickupDatePicker}
        minimumDate={new Date()}
      />

      <DateTimePickerModal
        isVisible={isReturnDatePickerVisible}
        mode="datetime"
        onConfirm={handleConfirmReturnDate}
        onCancel={hideReturnDatePicker}
        minimumDate={pickupDate || new Date()}
      />
    </>
  );

  const resetBookingState = () => {
    setConfirmDialogVisible(false);
    setShowBookingModal(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.imageContainer, { marginTop: 15 }]}>
          {currentCar.images && currentCar.images.length > 0 ? (
            <>
              <FlatList
                data={currentCar.images}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.floor(
                    e.nativeEvent.contentOffset.x / width
                  );
                  setActiveImageIndex(newIndex);
                }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleImagePress(index)}
                  >
                    <Image
                      source={{
                        uri:
                          typeof item === "string" ? item : item?.url || null,
                      }}
                      style={styles.carImageFull}
                      resizeMode="cover"
                      defaultSource={CAR_IMAGES.placeholder}
                    />
                  </TouchableOpacity>
                )}
              />
              <View style={styles.paginationContainer}>
                {currentCar.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      {
                        backgroundColor:
                          activeImageIndex === index
                            ? colors.primary
                            : "rgba(255,255,255,0.6)",
                      },
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Image
              source={CAR_IMAGES.placeholder}
              style={styles.carImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.imageOverlayButtons}>
            {user && (
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(0,0,0,0.6)"
                      : "rgba(255,255,255,0.8)",
                  },
                ]}
                onPress={handleFavoritePress}
              >
                <Icon
                  name={isFavorite ? "bookmark" : "bookmark-o"}
                  size={24}
                  color={isFavorite ? colors.primary : colors.text}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDarkMode
                    ? "rgba(0,0,0,0.6)"
                    : "rgba(255,255,255,0.8)",
                },
              ]}
              onPress={handleSharePress}
            >
              <Icon name="share-alt" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: isDarkMode
                  ? "rgba(0,0,0,0.6)"
                  : "rgba(255,255,255,0.8)",
              },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.carTitle, { color: colors.text }]}>
                {currentCar.brand} {currentCar.model}
              </Text>
              <Text style={[styles.carType, { color: colors.secondary }]}>
                {currentCar.vehicleType || "Luxury Vehicle"}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: colors.secondary }]}>
                Price
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                ₱{currentCar.pricePerDay}/day
              </Text>
            </View>
          </View>

          <View style={styles.ratingContainer}>
            {currentCar.isAutoApproved !== undefined && (
              <View
                style={[
                  styles.approvalBadge,
                  {
                    backgroundColor: currentCar.isAutoApproved
                      ? colors.success
                      : colors.error,
                  },
                ]}
              >
                <Text style={styles.approvalText}>
                  {currentCar.isAutoApproved
                    ? "Auto Approved"
                    : "Requires Approval"}
                </Text>
              </View>
            )}
            <View style={styles.ratingRow}>
              <StarRating rating={currentCar?.averageRating || 0} size={18} />
              <Text
                style={[
                  styles.ratingText,
                  { color: colors.secondary, marginLeft: 8 },
                ]}
              >
                {currentCar?.averageRating || 0} ({currentCar?.reviewCount || 0}{" "}
                reviews)
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleViewReviews}
              style={styles.viewReviewsButton}
            >
              <Text style={{ color: colors.primary }}>View Reviews</Text>
            </TouchableOpacity>
          </View>

          {user &&
          currentCar.isOnRental !== true &&
          currentCar?.owner?._id !== user?._id ? (
            <TouchableOpacity
              style={[
                styles.bookButton,
                { backgroundColor: colors.primary, marginBottom: 15 },
              ]}
              onPress={handleBookPress}
            >
              <Icon
                name="calendar-check-o"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.bookButtonText}>Book Now</Text>
            </TouchableOpacity>
          ) : user && currentCar?.owner?._id === user?._id ? (
            <View
              style={[
                styles.sectionContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[styles.locationBox, { backgroundColor: colors.card }]}
              >
                <Text
                  style={[
                    styles.locationText,
                    { color: colors.text, textAlign: "center" },
                  ]}
                >
                  You owned this vehicle.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.viewInquiriesButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setShowInquiriesModal(true)}
              >
                <Icon
                  name="envelope"
                  size={16}
                  color="#FFFFFF"
                  style={styles.inquiriesIcon}
                />
                <Text style={styles.viewInquiriesButtonText}>
                  View Inquiries
                </Text>
              </TouchableOpacity>
            </View>
          ) : currentCar.isOnRental === true ? (
            <View
              style={[
                styles.sectionContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[styles.locationBox, { backgroundColor: colors.card }]}
              >
                <Text
                  style={[
                    styles.locationText,
                    { color: colors.text, textAlign: "center" },
                  ]}
                >
                  This Car is currently on Rental
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.sectionContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[styles.locationBox, { backgroundColor: colors.card }]}
              >
                <Text
                  style={[
                    styles.locationText,
                    { color: colors.text, textAlign: "center" },
                  ]}
                >
                  Sign in to book this vehicle
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.bookButton,
                  { backgroundColor: colors.primary, marginTop: 10 },
                ]}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.bookButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Car Features */}
          <View
            style={[
              styles.sectionContainer,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Car Features
            </Text>
            <View style={styles.featuresGrid}>
              {[
                {
                  icon: "users",
                  label: `${currentCar.seatCapacity || 5} Seats`,
                },
                { icon: "cog", label: currentCar.transmission || "Automatic" },
                {
                  icon: "tachometer",
                  label: `${currentCar.mileage || 15} km/L`,
                },
                { icon: "tint", label: currentCar.fuel || "Petrol" },
                { icon: "calendar", label: `Year ${currentCar.year || 2023}` },
                { icon: "bolt", label: `${currentCar.displacement || 2000}cc` },
              ].map((feature, index) => (
                <View
                  key={index}
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: colors.card,
                      ...colors.shadow,
                    },
                  ]}
                >
                  <Icon name={feature.icon} size={16} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          {currentCar.description && (
            <View
              style={[
                styles.sectionContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Description
              </Text>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                {currentCar.description}
              </Text>
            </View>
          )}

          {/* Owner Terms and Condition */}
          {currentCar.description && (
            <View
              style={[
                styles.sectionContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Terms and Condition
              </Text>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                {currentCar.termsAndConditions}
              </Text>
            </View>
          )}

          {/* Location */}
          <View
            style={[
              styles.sectionContainer,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pickup Location
            </Text>
            <View
              style={[styles.locationBox, { backgroundColor: colors.card }]}
            >
              <Icon
                name="map-marker"
                size={18}
                color={colors.primary}
                style={styles.locationIcon}
              />
              <Text style={[styles.locationText, { color: colors.text }]}>
                {currentCar.pickUpLocation || "Manila, Philippines"}
              </Text>
            </View>
          </View>

          {currentCar.owner && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Car Owner
              </Text>
              <View
                style={[
                  styles.ownerBox,
                  { backgroundColor: colors.card, borderBottomWidth: 1 },
                ]}
              >
                <View style={styles.ownerAvatarContainer}>
                  {currentCar.owner?.avatar?.url ? (
                    <Image
                      source={{ uri: currentCar.owner.avatar.url }}
                      style={styles.ownerAvatar}
                      onError={() => console.log("Error loading owner avatar")}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.avatarInitial}>
                        {currentCar.owner?.firstName?.[0] || "U"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.ownerInfo}>
                  <Text style={[styles.ownerName, { color: colors.text }]}>
                    {currentCar.owner?.firstName} {currentCar.owner?.lastName}
                  </Text>
                  <Text
                    style={[styles.ownerJoined, { color: colors.secondary }]}
                  >
                    Member since{" "}
                    {currentCar.owner?.createdAt
                      ? new Date(currentCar.owner.createdAt).getFullYear()
                      : "2022"}
                  </Text>
                </View>
                {user &&
                  currentCar?.owner?._id !== user?._id &&
                  currentCar.isOnRental !== true && (
                    <TouchableOpacity
                      style={[
                        styles.contactButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() =>
                        navigation.navigate("ChatScreen", {
                          recipientId: currentCar.owner._id,
                          carId: currentCar._id,
                        })
                      }
                    >
                      <Icon
                        name="comment"
                        size={16}
                        color="#FFFFFF"
                        style={styles.contactIcon}
                      />
                      <Text style={styles.contactButtonText}>Message</Text>
                    </TouchableOpacity>
                  )}
              </View>
              <TouchableOpacity
                style={[
                  styles.historyButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowRentalHistoryModal(true)}
              >
                <Icon
                  name="history"
                  size={16}
                  color={colors.primary}
                  style={styles.historyIcon}
                />
                <Text
                  style={[styles.historyButtonText, { color: colors.primary }]}
                >
                  View Rental History
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      <ImageViewer />
      <BookingFormModal />
      <DatePickerModals />
      <InquiriesModal />
      <RentalHistoryModal />
      {/* Floating Rentals Button */}
      <TouchableOpacity
        style={[styles.floatingCartButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("Rentals", { screen: "CartScreen" })}
      >
        <Icon name="car" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const newStyles = StyleSheet.create({
  inquiryLastMessage: {
    fontSize: 14,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

const rentalHistoryStyles = StyleSheet.create({
  rentalHistoryModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 10,
    maxHeight: "80%",
  },
  modalHeaderContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  rentalItem: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rentalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rentalUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  renterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rentalUserDetails: {
    marginLeft: 12,
    flex: 1,
  },
  renterName: {
    fontSize: 16,
    fontWeight: "600",
  },
  rentalDate: {
    fontSize: 13,
    marginTop: 2,
  },
  rentalId: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  rentalDates: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dateIconContainer: {
    marginRight: 8,
  },
  dateColumn: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  timeValue: {
    fontSize: 12,
  },
  dateConnector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    width: 60,
    justifyContent: "center",
  },
  connector: {
    height: 1,
    flex: 1,
  },
  rentalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  paymentMethodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    marginRight: 6,
  },
  paymentMethod: {
    fontSize: 14,
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyRentals: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyRentalsText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  emptyRentalsSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  closeModalButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  historyIcon: {
    marginRight: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    margin: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  returnButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  returnButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 250,
  },
  carImage: {
    width: "100%",
    height: "100%",
  },
  carImageFull: {
    width: width,
    height: 250,
  },
  paginationContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  imageOverlayButtons: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 12,
    right: 16,
    flexDirection: "row",
  },
  iconButton: {
    padding: 10,
    borderRadius: 25,
    marginLeft: 10,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 12,
    left: 16,
    padding: 10,
    borderRadius: 25,
  },
  infoContainer: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  carTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  carType: {
    fontSize: 16,
    marginTop: 4,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 14,
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
  },
  ratingContainer: {
    marginBottom: 0,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
  },
  viewReviewsButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  approvalBadge: {
    marginLeft: "auto",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  approvalText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  sectionContainer: {
    marginBottom: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -4,
  },
  featureItem: {
    width: (width - 48) / 3,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 13,
  },
  descriptionText: {
    lineHeight: 22,
    fontSize: 15,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationText: {
    fontSize: 15,
    flex: 1,
  },
  ownerBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    gap: 5,
  },
  ownerAvatarContainer: {
    marginRight: 16,
  },
  ownerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  ownerJoined: {
    fontSize: 14,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  bookButton: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  fullScreenImageContainer: {
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: width,
    height: height * 0.8,
  },
  bookingForm: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  bookingFormTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  datePickerIcon: {
    marginRight: 10,
  },
  datePickerText: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  summaryContainer: {
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontWeight: "bold",
  },
  totalAmount: {
    fontWeight: "bold",
    fontSize: 18,
  },
  confirmButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1000,
  },
  bookingFormModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 10,
    maxHeight: "90%",
    elevation: 20,
    zIndex: 1000,
    position: "relative",
  },
  bookingFormHandle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ccc",
    marginBottom: 15,
  },
  inquiriesModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 10,
    maxHeight: "80%",
  },
  inquiriesTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  inquiryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    justifyContent: "space-between",
  },
  inquiryUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  inquiryUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  inquiryUserDetails: {
    marginLeft: 12,
    flex: 1,
  },
  inquiryUserName: {
    fontSize: 16,
    fontWeight: "500",
  },
  inquiryTimestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyInquiries: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyInquiriesText: {
    marginTop: 12,
    fontSize: 16,
  },
  closeInquiriesButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  viewInquiriesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    width: "100%",
  },
  floatingCartButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  viewInquiriesButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  inquiriesIcon: {
    marginRight: 4,
  },
  ...newStyles,
  ...rentalHistoryStyles,
});

export default CarDetailsScreen;
