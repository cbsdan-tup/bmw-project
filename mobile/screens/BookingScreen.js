import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/FontAwesome";
import { CAR_IMAGES } from "../config/constants";
import { useAuth } from "../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";

const BookingScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const route = useRoute();
  const { car } = route.params;
  const dispatch = useDispatch();
  const { loading: bookingLoading = false } = useSelector(
    (state) => state.booking || {}
  );

  // Payment mode state - update with available payment methods
  const [paymentMode, setPaymentMode] = useState("Credit Card");

  // Handle hardware back button - update to use proper screen name
  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        handleGoBack
      );
      return () => backHandler.remove();
    }, [])
  );

  // Handle going back to cart screen - update this to use proper screen name
  const handleGoBack = () => {
    navigation.navigate("CartScreen");
    return true; // Prevent default behavior
  };

  // State for date picking
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 1))
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState("date");
  const [endPickerMode, setEndPickerMode] = useState("date");

  // Calculate rental days and total price
  const [rentalDays, setRentalDays] = useState(1);
  const [totalPrice, setTotalPrice] = useState(car.pricePerDay);

  useEffect(() => {
    // Log car object on component mount to debug missing ID issues
    console.log("BookingScreen received car:", JSON.stringify(car));
    console.log("Car ID types available:", {
      _id: car?._id,
      id: car?.id,
      productId: car?.productId,
    });

    // Ensure car has _id property set when component mounts
    if (car && !car._id && (car.id || car.productId)) {
      const carId = car.id || car.productId;
      console.log(`Setting missing _id to ${carId}`);
      car._id = carId;
    }
  }, [car]);

  useEffect(() => {
    // Calculate days between start and end date
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setRentalDays(diffDays || 1);

    // Calculate total price
    const basePrice = car.pricePerDay * diffDays;

    setTotalPrice(basePrice);
  }, [startDate, endDate, car.pricePerDay]);

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false);

    if (event.type === "dismissed") {
      return;
    }

    const currentDate = selectedDate || startDate;
    setStartDate(currentDate);

    // If we were in date mode, switch to time mode
    if (startPickerMode === "date") {
      setStartPickerMode("time");
      setShowStartPicker(true);
      return;
    }

    // If we were in time mode, reset to date mode
    setStartPickerMode("date");

    // Adjust end date if needed
    if (currentDate > endDate) {
      const newEndDate = new Date(currentDate);
      newEndDate.setHours(currentDate.getHours() + 1);
      setEndDate(newEndDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false);

    if (event.type === "dismissed") {
      return;
    }

    const currentDate = selectedDate || endDate;

    // If we were in date mode, switch to time mode
    if (endPickerMode === "date") {
      if (currentDate > startDate) {
        setEndDate(currentDate);
        setEndPickerMode("time");
        setShowEndPicker(true);
      } else {
        toast.warning("End date must be after start date");
      }
      return;
    }

    // If we were in time mode
    if (currentDate > startDate) {
      setEndDate(currentDate);
      setEndPickerMode("date");
    } else {
      toast.warning("End time must be after start time");
    }
  };

  const formatDate = (date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleConfirmBooking = () => {
    // Enhanced validation with better error messages
    if (!car) {
      toast.error("Car information is completely missing");
      return;
    }

    // Check multiple possible ID formats and ensure car._id is set
    const carId = car._id || car.id || car.productId;
    if (!carId) {
      console.error("Car object is missing ID field:", JSON.stringify(car));
      toast.error("Car ID is missing. Please try again.");
      return;
    }

    // Always update the car object to ensure _id exists
    if (!car._id) {
      console.log(`Car missing _id, adding it now: ${carId}`);
      car._id = carId;
    }

    if (!startDate) {
      toast.error("Please select a pickup date");
      return;
    }

    if (!endDate) {
      toast.error("Please select a return date");
      return;
    }

    if (rentalDays <= 0) {
      toast.error("Invalid rental period");
      return;
    }

    if (!paymentMode) {
      toast.error("Please select a payment method");
      return;
    }

    // Create a deep clone with guaranteed _id field
    const enhancedCarObject = {
      ...car,
      _id: carId, // Ensure _id is set even if it was using a different property name
    };

    console.log(
      "Final car object for checkout:",
      JSON.stringify({
        _id: enhancedCarObject._id,
        brand: enhancedCarObject.brand,
        model: enhancedCarObject.model,
      })
    );

    // Navigate with the enhanced car object
    navigation.navigate("CheckoutScreen", {
      car: enhancedCarObject,
      pickupDate: startDate,
      returnDate: endDate,
      rentalDays,
      paymentMode,
    });
  };

  // Function to handle cancel booking - update to use proper screen name
  const handleCancelBooking = () => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking and return to your cart?",
      [
        { text: "Stay Here", style: "cancel" },
        {
          text: "Return to Cart",
          onPress: () => navigation.navigate("CartScreen"),
          style: "destructive",
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Car Details */}
        <View style={[styles.carCard, { backgroundColor: colors.card }]}>
          <Image
            source={
              car.images && car.images.length > 0
                ? {
                    uri:
                      typeof car.images[0] === "string"
                        ? car.images[0]
                        : car.images[0]?.url,
                  }
                : CAR_IMAGES.placeholder
            }
            style={styles.carImage}
            defaultSource={CAR_IMAGES.placeholder}
          />
          <View style={styles.carInfo}>
            <Text style={[styles.carTitle, { color: colors.text }]}>
              {car.brand} {car.model}
            </Text>
            <Text style={[styles.carDetails, { color: colors.secondary }]}>
              {car.year} • {car.vehicleType}
            </Text>
            <View style={styles.rateContainer}>
              <Text style={[styles.rateLabel, { color: colors.secondary }]}>
                Daily Rate:
              </Text>
              <Text style={[styles.rate, { color: colors.primary }]}>
                ₱{car.pricePerDay}/day
              </Text>
            </View>
          </View>
        </View>

        {/* Rental Period Selection */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Rental Period
          </Text>

          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.secondary }]}>
              Start Date:
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: colors.border }]}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={{ color: colors.text }}>
                {formatDate(startDate)}
              </Text>
              <Icon name="calendar" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.secondary }]}>
              End Date:
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: colors.border }]}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={{ color: colors.text }}>{formatDate(endDate)}</Text>
              <Icon name="calendar" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.durationInfo}>
            <Icon name="clock-o" size={18} color={colors.primary} />
            <Text style={[styles.durationText, { color: colors.text }]}>
              {rentalDays} day{rentalDays > 1 ? "s" : ""}
            </Text>
          </View>

          {/* Date Pickers (hidden by default) */}
          {showStartPicker && (
            <DateTimePicker
              key={`start-${startPickerMode}`} // Add this key
              value={startDate}
              mode={startPickerMode}
              is24Hour={true}
              display="default"
              minimumDate={new Date()}
              onChange={handleStartDateChange}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              key={`end-${endPickerMode}`} // Add this key
              value={endDate}
              mode={endPickerMode}
              is24Hour={true}
              display="default"
              minimumDate={new Date(startDate.getTime() + 60 * 60 * 1000)}
              onChange={handleEndDateChange}
            />
          )}
        </View>

        {/* Payment Mode Selection */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Payment Method
          </Text>

          <View style={styles.paymentOptions}>
            {/* Credit Card Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMode === "Credit Card" && [
                  styles.selectedPayment,
                  { borderColor: colors.primary },
                ],
              ]}
              onPress={() => setPaymentMode("Credit Card")}
            >
              <View style={styles.paymentIconContainer}>
                <Icon name="credit-card" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.paymentLabel, { color: colors.text }]}>
                Credit Card
              </Text>
              {paymentMode === "Credit Card" && (
                <View
                  style={[
                    styles.checkmark,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* GCash Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMode === "GCash" && [
                  styles.selectedPayment,
                  { borderColor: colors.primary },
                ],
              ]}
              onPress={() => setPaymentMode("GCash")}
            >
              <View style={styles.paymentIconContainer}>
                <Icon name="money" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.paymentLabel, { color: colors.text }]}>
                GCash
              </Text>
              {paymentMode === "GCash" && (
                <View
                  style={[
                    styles.checkmark,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Cash Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMode === "Cash" && [
                  styles.selectedPayment,
                  { borderColor: colors.primary },
                ],
              ]}
              onPress={() => setPaymentMode("Cash")}
            >
              <View style={styles.paymentIconContainer}>
                <Icon name="money" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.paymentLabel, { color: colors.text }]}>
                Cash
              </Text>
              {paymentMode === "Cash" && (
                <View
                  style={[
                    styles.checkmark,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Price Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>
              Rental Fee
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ₱{car.pricePerDay} × {rentalDays} day{rentalDays > 1 ? "s" : ""}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total Price
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              ₱{totalPrice}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer with Action Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={handleCancelBooking}
        >
          <Text style={{ color: colors.text }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          onPress={handleConfirmBooking}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholderIcon: {
    width: 36,
  },
  carCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  carImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  carInfo: {
    marginTop: 8,
  },
  carTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  carDetails: {
    fontSize: 16,
    marginTop: 4,
  },
  rateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  rateLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  rate: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    width: "60%",
  },
  durationInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  durationText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "500",
  },
  serviceDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  serviceSelection: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 80,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 8,
  },
  confirmButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dialogButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  dialogButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Payment method styles
  paymentOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  paymentOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedPayment: {
    borderWidth: 2,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default BookingScreen;
