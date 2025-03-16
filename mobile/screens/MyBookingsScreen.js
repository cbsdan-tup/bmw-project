import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUserBookings,
  cancelBooking,
  setSelectedBooking,
  clearSelectedBooking,
  resetBookingError,
} from "../redux/slices/bookingSlice";
import Icon from "react-native-vector-icons/FontAwesome";
import { useToast } from "../context/ToastContext";
import { calculateRentalDays } from "../helper/utils";

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

const BookingCard = ({ booking, onPress }) => {
  const { colors } = useTheme();

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle cases where booking.car might be undefined
  if (!booking || !booking.car) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => onPress && onPress(booking)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Booking Information
            </Text>
            {booking && (
              <BookingStatusBadge status={booking.status || "Unknown"} />
            )}
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.bookingDetails}>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              Car details unavailable
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => onPress(booking)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {booking.car.brand || "Unknown"} {booking.car.model || ""}
          </Text>
          <BookingStatusBadge status={booking.status} />
        </View>
      </View>

      <View style={styles.cardContent}>
        {booking.car.images &&
          booking.car.images.length > 0 &&
          booking.car.images[0] && (
            <Image
              source={{ uri: booking.car.images[0].url }}
              style={styles.carImage}
              resizeMode="cover"
            />
          )}

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Icon
              name="calendar"
              size={16}
              color={colors.primary}
              style={styles.icon}
            />
            <Text style={[styles.detailLabel, { color: colors.secondary }]}>
              Pick-up:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(booking.pickUpDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon
              name="calendar-check-o"
              size={16}
              color={colors.primary}
              style={styles.icon}
            />
            <Text style={[styles.detailLabel, { color: colors.secondary }]}>
              Return:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(booking.returnDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon
              name="money"
              size={16}
              color={colors.primary}
              style={styles.icon}
            />
            <Text style={[styles.detailLabel, { color: colors.secondary }]}>
              Total:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              ₱
              {booking?.car?.pricePerDay *
                calculateRentalDays(booking.pickUpDate, booking.returnDate)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const BookingDetailsModal = ({ visible, booking, onClose }) => {
  const { colors } = useTheme();
  const toast = useToast();
  const dispatch = useDispatch();

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
      onClose();
    } catch (error) {
      toast.error(
        typeof error === "string" ? error : "Failed to cancel booking"
      );
    }
  }, [booking, dispatch, onClose, toast]);

  if (!booking) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Booking Details
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
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

            {(booking.status === "Pending" ||
              booking.status === "Confirmed") && (
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
        </View>
      </View>
    </Modal>
  );
};

const MyBookingsScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const toast = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");

  const { bookings, loading, error, selectedBooking } = useSelector(
    (state) => state.bookings
  );

  // Available status options for filtering
  const statusOptions = [
    "All",
    "Pending",
    "Confirmed",
    "Active",
    "Returned",
    "Canceled",
  ];

  // Filter and sort bookings
  const getFilteredAndSortedBookings = useCallback(() => {
    if (!bookings || !Array.isArray(bookings)) return [];

    // First filter the bookings based on selected status
    const filtered =
      statusFilter === "All"
        ? bookings
        : bookings.filter(
            (booking) => booking && booking.status === statusFilter
          );

    // Define the desired status order
    const statusOrder = {
      Active: 1,
      Confirmed: 2,
      Pending: 3,
      Returned: 4,
      Cancel: 5,
    };

    return [...filtered].sort((a, b) => {
      if (!a || !b) return 0;

      const orderA = statusOrder[a.status] || Number.MAX_SAFE_INTEGER; 
      const orderB = statusOrder[b.status] || Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      if (!a.updatedAt || !b.updatedAt) return 0;

      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);

      return dateB - dateA; 
    });
  }, [bookings, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    if (user?._id) {
      dispatch(fetchUserBookings(user._id));
    }

    return () => {
      isMounted = false;
    };
  }, [dispatch, user?._id]);

  useEffect(() => {
    if (error) {
      toast.error(
        typeof error === "string" ? error : "Failed to load bookings"
      );
      dispatch(resetBookingError());
    }
  }, [error, toast, dispatch]);

  const handleRefresh = useCallback(() => {
    if (user?._id) {
      dispatch(fetchUserBookings(user._id));
    }
  }, [dispatch, user?._id]);

  const handleBookingPress = useCallback(
    (booking) => {
      dispatch(setSelectedBooking(booking));
      setModalVisible(true);
    },
    [dispatch]
  );

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => {
      dispatch(clearSelectedBooking());
    }, 0);
  }, [dispatch]);

  // Filter selection handler
  const handleFilterChange = (status) => {
    setStatusFilter(status);
  };

  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading bookings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get filtered and sorted bookings
  const filteredAndSortedBookings = getFilteredAndSortedBookings();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Status Filter Section */}
      <View style={styles.filterContainer}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>
          Filter by status:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    statusFilter === status ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleFilterChange(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === status ? "#FFFFFF" : colors.text },
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredAndSortedBookings}
        renderItem={({ item }) => (
          <BookingCard booking={item} onPress={handleBookingPress} />
        )}
        keyExtractor={(item) =>
          item && item._id
            ? item._id.toString()
            : Math.random().toString(36).substring(7)
        }
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon
              name="calendar-o"
              size={70}
              color={colors.secondary}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {statusFilter === "All"
                ? "No bookings yet"
                : `No ${statusFilter.toLowerCase()} bookings`}
            </Text>
            <Text style={[styles.emptySubText, { color: colors.secondary }]}>
              {statusFilter === "All"
                ? "Your car bookings will appear here"
                : "Try selecting a different filter"}
            </Text>
          </View>
        }
      />

      <BookingDetailsModal
        visible={modalVisible}
        booking={selectedBooking}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  cardTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cardContent: {
    flexDirection: "row",
  },
  carImage: {
    width: 120,
    height: 120,
  },
  bookingDetails: {
    flex: 1,
    padding: 12,
    justifyContent: "space-around",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: {
    width: 20,
    textAlign: "center",
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 20,
  },
  modalContent: {
    margin: 20,
    borderRadius: 8,
    maxHeight: "90%",
    overflow: "hidden",
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalScrollView: {
    maxHeight: "85%",
  },
  modalScrollContent: {
    padding: 16,
  },
  modalBottomPadding: {
    height: 20,
  },
  modalBody: {
    flexGrow: 1,
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
  modalStatusBadge: {
    width: 100,
    alignItems: "center",
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  filtersScrollContent: {
    paddingRight: 16,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default MyBookingsScreen;
