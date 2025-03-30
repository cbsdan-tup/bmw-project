import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Icon from "react-native-vector-icons/FontAwesome";
import { 
  createBooking, 
  resetBookingSuccess, 
  fetchUserBookings 
} from "../redux/slices/bookingSlice";
import { validateDiscountCode, clearDiscount } from "../redux/slices/carSlice";

const CheckoutScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const toast = useToast();
  
  const { car, pickupDate, returnDate, rentalDays, paymentMode } = route.params || {};
  
  const { loading, error, bookingSuccess } = useSelector(
    (state) => state.bookings
  );
  
  const { discount, discountLoading, discountError } = useSelector(
    (state) => state.cars
  );

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [errorDisplayed, setErrorDisplayed] = useState(false);

  // Calculate prices
  const subtotal = rentalDays * car?.pricePerDay || 0;
  const discountAmount = appliedDiscount 
    ? Math.round((subtotal * appliedDiscount.discountPercentage) / 100) 
    : 0;
  const totalPayment = subtotal - discountAmount;

  // Clean up resources when unmounting
  useEffect(() => {
    return () => {
      dispatch(clearDiscount());
      dispatch(resetBookingSuccess());
    };
  }, [dispatch]);

  // Handle booking success
  useEffect(() => {
    if (bookingSuccess) {
      console.log('Booking success response:', JSON.stringify(bookingSuccess));
      toast.success("Booking confirmed! Check your email for receipt.");
      dispatch(resetBookingSuccess());
      dispatch(fetchUserBookings(user?._id));

      // Reset local state
      setDiscountCode("");
      setAppliedDiscount(null);
      setDiscountApplied(false);
      setErrorDisplayed(false);
      dispatch(clearDiscount());

      // Handle different response structures to ensure we get the booking ID
      let bookingId = null;
      
      // Check different possible locations of the booking ID
      if (bookingSuccess.booking && bookingSuccess.booking._id) {
        bookingId = bookingSuccess.booking._id.toString();
      } else if (bookingSuccess.rental && bookingSuccess.rental._id) {
        bookingId = bookingSuccess.rental._id.toString();
      } else if (bookingSuccess._id) {
        bookingId = bookingSuccess._id.toString();
      }

      console.log("Booking Id: ", bookingId);
      
      if (bookingId) {
        // First, navigate back to the home tab to clear the current stack
        navigation.navigate('HomeTab');
        
        // Then, after a short delay, navigate to the booking details in ProfileTab
        setTimeout(() => {
          navigation.navigate('ProfileTab', {
            screen: 'ProfileMain'
          });
          
          // Add another small delay before navigating to the booking details
          setTimeout(() => {
            navigation.navigate('ProfileTab', {
              screen: 'BookingDetails',
              params: {
                booking: {
                  _id: bookingId
                }
              }
            });
          }, 100);
        }, 100);
      } else {
        // Fallback if no booking ID is found
        navigation.navigate('ProfileTab', {
          screen: 'MyBookings'
        });
      }
    }
  }, [bookingSuccess]);

  // Handle booking errors
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

  // Handle discount validation errors
  useEffect(() => {
    if (discountError && !errorDisplayed) {
      toast.error(discountError);
      setErrorDisplayed(true);
      
      // Clear the error after displaying it
      setTimeout(() => {
        dispatch(clearDiscount());
        setErrorDisplayed(false);
      }, 100);
    }
  }, [discountError, toast, errorDisplayed, dispatch]);

  // Apply discount when validated
  useEffect(() => {
    if (discount && !discountError && !discountApplied) {
      // Validate current date against discount dates
      const now = new Date();
      const startDate = new Date(discount.startDate);
      const endDate = discount.endDate ? new Date(discount.endDate) : null;
      
      if (now < startDate) {
        toast.error(`This discount code is not valid until ${startDate.toLocaleDateString()}`);
        return;
      }
      
      if (endDate && now > endDate) {
        toast.error(`This discount code expired on ${endDate.toLocaleDateString()}`);
        return;
      }
      
      setAppliedDiscount(discount);
      setDiscountApplied(true);
      toast.success(`Discount applied: ${discount.discountPercentage}% off!`);
    }
  }, [discount, discountError, discountApplied, toast]);

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code");
      return;
    }
    
    setAppliedDiscount(null);
    setDiscountApplied(false);
    setErrorDisplayed(false);
    
    dispatch(validateDiscountCode({
      code: discountCode.trim(),
      userId: user?._id
    }));
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountApplied(false);
    setErrorDisplayed(false);
    dispatch(clearDiscount());
  };

  const handleConfirmBooking = () => {
    // Ensure all required data is included with proper structure
    const bookingData = {
      car: car._id,
      renter: user._id,
      pickUpDate: pickupDate.toISOString(),
      returnDate: returnDate.toISOString(),
      status: "Pending",
      paymentMethod: paymentMode,
      paymentStatus: "Paid",
      // Make sure discount structure matches what the server expects
      discount: appliedDiscount ? {
        code: appliedDiscount.code,
        discountPercentage: appliedDiscount.discountPercentage,
        discountAmount: discountAmount
      } : null,
      originalAmount: subtotal,
      finalAmount: totalPayment
    };

    console.log('Submitting booking data:', JSON.stringify(bookingData));

    dispatch(createBooking(bookingData))
      .unwrap()
      .then((response) => {
        console.log('Booking success response:', JSON.stringify(response));
      })
      .catch((err) => {
        console.log("Booking error:", err);
      });
  };

  if (!car) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          backgroundColor={colors.background}
          barStyle={colors.isDark ? "light-content" : "dark-content"}
        />
        <View style={styles.errorContainer}>
          <Icon name="exclamation-circle" size={40} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            Car information is missing
          </Text>
          <TouchableOpacity
            style={[styles.returnButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.returnButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.safeContainer, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar
        backgroundColor={colors.background}
        barStyle={colors.isDark ? "light-content" : "dark-content"}
      />
      
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Confirm Booking
          </Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
        >
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={[styles.confirmDialog, { backgroundColor: colors.card }]}>
              <View style={styles.dialogContent}>
                {/* Car Section */}
                <View style={styles.dialogSection}>
                  <Text style={[styles.dialogSectionTitle, { color: colors.text }]}>
                    Car Details
                  </Text>
                  <View style={styles.carInfoContainer}>
                    <Icon 
                      name="car" 
                      size={24} 
                      color={colors.primary} 
                      style={styles.carIcon}
                    />
                    <View style={styles.carTextContainer}>
                      <Text style={[styles.carTitle, { color: colors.text }]}>
                        {car.brand} {car.model} ({car.year})
                      </Text>
                      <Text style={[styles.carSubtitle, { color: colors.secondary }]}>
                        {car.vehicleType} - {car.seatCapacity} Seats
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Booking Details Section */}
                <View style={styles.dialogSection}>
                  <Text style={[styles.dialogSectionTitle, { color: colors.text }]}>
                    Booking Details
                  </Text>

                  <View style={[styles.detailsCard, { backgroundColor: colors.background }]}>
                    <View style={styles.dialogRow}>
                      <View style={styles.labelIconContainer}>
                        <Icon name="calendar" size={16} color={colors.primary} style={styles.labelIcon} />
                        <Text style={[styles.dialogLabel, { color: colors.secondary }]}>
                          Pick-up:
                        </Text>
                      </View>
                      <Text style={[styles.dialogValue, { color: colors.text }]}>
                        {pickupDate?.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.dialogRow}>
                      <View style={styles.labelIconContainer}>
                        <Icon name="calendar-check-o" size={16} color={colors.primary} style={styles.labelIcon} />
                        <Text style={[styles.dialogLabel, { color: colors.secondary }]}>
                          Return:
                        </Text>
                      </View>
                      <Text style={[styles.dialogValue, { color: colors.text }]}>
                        {returnDate?.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.dialogRow}>
                      <View style={styles.labelIconContainer}>
                        <Icon name="clock-o" size={16} color={colors.primary} style={styles.labelIcon} />
                        <Text style={[styles.dialogLabel, { color: colors.secondary }]}>
                          Duration:
                        </Text>
                      </View>
                      <Text style={[styles.dialogValue, { color: colors.text }]}>
                        {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
                      </Text>
                    </View>

                    <View style={styles.dialogRow}>
                      <View style={styles.labelIconContainer}>
                        <Icon name="map-marker" size={16} color={colors.primary} style={styles.labelIcon} />
                        <Text style={[styles.dialogLabel, { color: colors.secondary }]}>
                          Location:
                        </Text>
                      </View>
                      <Text style={[styles.dialogValue, { color: colors.text }]}>
                        {car?.pickUpLocation}
                      </Text>
                    </View>

                    <View style={styles.dialogRow}>
                      <View style={styles.labelIconContainer}>
                        <Icon name="credit-card" size={16} color={colors.primary} style={styles.labelIcon} />
                        <Text style={[styles.dialogLabel, { color: colors.secondary }]}>
                          Payment:
                        </Text>
                      </View>
                      <Text style={[styles.dialogValue, { color: colors.text }]}>
                        {paymentMode}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Discount Code Section */}
                <View style={styles.dialogSection}>
                  <Text style={[styles.dialogSectionTitle, { color: colors.text }]}>
                    Discount Code
                  </Text>
                  
                  {appliedDiscount ? (
                    <View style={[styles.appliedDiscountContainer, 
                      { borderColor: colors.success, backgroundColor: `${colors.success}20` }]}>
                      <View style={styles.appliedDiscountInfo}>
                        <View style={styles.discountHeaderRow}>
                          <Icon name="tag" size={16} color={colors.success} />
                          <Text style={[styles.appliedDiscountCode, { color: colors.success }]}>
                            {appliedDiscount.code}
                          </Text>
                        </View>
                        <Text style={[styles.discountValue, { color: colors.success }]}>
                          {appliedDiscount.discountPercentage}% off
                        </Text>
                        {appliedDiscount.description && (
                          <Text style={[styles.appliedDiscountDescription, { color: colors.text }]}>
                            {appliedDiscount.description}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.removeDiscountButton}
                        onPress={handleRemoveDiscount}
                      >
                        <Icon name="times-circle" size={22} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.discountInputContainer}>
                      <TextInput
                        style={[
                          styles.discountInput,
                          { 
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: colors.background
                          }
                        ]}
                        value={discountCode}
                        onChangeText={setDiscountCode}
                        placeholder="Enter discount code"
                        placeholderTextColor={colors.secondary}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={[
                          styles.applyButton,
                          { backgroundColor: colors.primary }
                        ]}
                        onPress={handleApplyDiscount}
                        disabled={discountLoading}
                      >
                        {discountLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.applyButtonText}>Apply</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Updated pricing section */}
                <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
                  <View style={styles.subtotalRow}>
                    <Text style={[styles.subtotalLabel, { color: colors.secondary }]}>
                      Subtotal:
                    </Text>
                    <Text style={[styles.subtotalValue, { color: colors.text }]}>
                      ₱{subtotal.toLocaleString()}
                    </Text>
                  </View>
                  
                  {appliedDiscount && (
                    <View style={styles.discountRow}>
                      <Text style={[styles.discountLabel, { color: colors.secondary }]}>
                        Discount ({appliedDiscount.discountPercentage}%):
                      </Text>
                      <Text style={[styles.discountAmount, { color: colors.success }]}>
                        -₱{discountAmount.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.finalTotalRow}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>
                      Total Payment:
                    </Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>
                      ₱{totalPayment.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: colors.error }]}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.dialogButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dialogButton, 
                    { backgroundColor: colors.primary },
                    loading && styles.disabledButton
                  ]}
                  onPress={handleConfirmBooking}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogButtonText}>Confirm Booking</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    elevation: 2,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 15,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  confirmDialog: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  dialogContent: {
    marginBottom: 20,
  },
  dialogSection: {
    marginBottom: 24,
  },
  dialogSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  carInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  carIcon: {
    marginRight: 12,
  },
  carTextContainer: {
    flex: 1,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  carSubtitle: {
    fontSize: 14,
  },
  detailsCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
  },
  labelIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelIcon: {
    marginRight: 8,
  },
  dialogRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dialogLabel: {
    fontSize: 15,
  },
  dialogValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  discountInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    fontWeight: '500',
  },
  applyButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  appliedDiscountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginBottom: 15,
  },
  appliedDiscountInfo: {
    flex: 1,
  },
  discountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appliedDiscountCode: {
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  appliedDiscountDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  removeDiscountButton: {
    padding: 8,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subtotalLabel: {
    fontSize: 16,
  },
  subtotalValue: {
    fontSize: 16,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountLabel: {
    fontSize: 16,
  },
  discountAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalSection: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  dialogButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CheckoutScreen;
