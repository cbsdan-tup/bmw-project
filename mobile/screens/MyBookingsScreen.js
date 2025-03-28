import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUserBookings,
  setSelectedBooking,
  resetBookingError,
} from "../redux/slices/bookingSlice";
import Icon from "react-native-vector-icons/FontAwesome";
import { useToast } from "../context/ToastContext";
import { calculateRentalDays } from "../helper/utils";
import { useNavigation } from "@react-navigation/native";

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

const BookingCard = ({ booking, onPress }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

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
          <View style={{ flexDirection: "row", gap: 5 }}>
            {booking.status === "Returned" && (
              <RatingStatusBadge
                status={booking.hasReview ? "Rated" : "Not Rated"}
              />
            )}
            <BookingStatusBadge status={booking.status} />
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() =>
                navigation.navigate("ChatScreen", {
                  recipientId: booking?.car?.owner._id,
                  carId: booking?._id,
                })
              }
            >
              <Icon
                name="phone"
                size={23}
                color={colors.primary}
                style={styles.icon}
              >
              </Icon>
            </TouchableOpacity>
          </View>
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

const MyBookingsScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigation = useNavigation();
  const [statusFilter, setStatusFilter] = useState("All");

  const { bookings, loading, error } = useSelector(
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
      dispatch(fetchUserBookings(user?._id));
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
      // Instead of showing a modal, navigate to the BookingDetails screen
      navigation.navigate("BookingDetails", { booking });
    },
    [navigation]
  );

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
