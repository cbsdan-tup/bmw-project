import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Icon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import StarRating from "../components/StarRating";
import { useToast } from "../context/ToastContext";

const { width } = Dimensions.get("window");
const cardWidth = width - 32;

const MyFavoritesScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();
  const [favoriteCars, setFavoriteCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFavoriteCars = async () => {
    try {
      setLoading(true);

      if (!user) {
        setError("You need to be logged in to view favorites");
        setLoading(false);
        return;
      }

      const response = await api.get(`/favorite-cars/${user._id}`);

      setFavoriteCars(response.data.favoriteCars || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching favorite cars:", err);

      if (err.response && err.response.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to load favorite cars");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavoriteCars();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchFavoriteCars();
    });
    return unsubscribe;
  }, [navigation]);

  const removeFavorite = async (favoriteId) => {
    removeFavoriteConfirmed(favoriteId);
  };

  const removeFavoriteConfirmed = async (favoriteId) => {
    try {
      setLoading(true);
      await api.delete(`/favorite-car/${favoriteId}`);
      setFavoriteCars((prevFavorites) =>
        prevFavorites.filter((fav) => fav._id !== favoriteId)
      );
      toast.success("Car removed from favorites");
    } catch (err) {
      console.error("Error removing favorite:", err);
      toast.error("Failed to remove car from favorites");
    } finally {
      setLoading(false);
    }
  };

  const navigateToCarDetails = (carId) => {
    navigation.navigate("Home", {
      screen: "CarDetails",
      params: { carId: carId },
    });
  };

  const renderCarItem = ({ item }) => {
    const car = item.car;
    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.cardImageContainer}
          onPress={() => navigateToCarDetails(car._id)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: car.images[0]?.url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <View style={styles.carBadge}>
              <Text style={styles.carBadgeText}>{car.year || "New"}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {car.brand} {car.model}
              </Text>

              <View style={styles.ratingContainer}>
                <StarRating rating={car.averageRating || 0} size={12} />
                <Text style={[styles.reviewCount, { color: colors.secondary }]}>
                  ({car.reviewCount || 0} reviews)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.favoriteButton, { backgroundColor: colors.error }]}
              onPress={() => removeFavorite(item._id)}
            >
              <Icon name="trash" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <Icon
                name="tachometer"
                size={14}
                color={colors.primary}
                style={styles.specIcon}
              />
              <Text style={[styles.specText, { color: colors.secondary }]}>
                {car.mileage || "N/A"} Km/L
              </Text>
            </View>

            <View style={styles.specItem}>
              <Icon
                name="gear"
                size={14}
                color={colors.primary}
                style={styles.specIcon}
              />
              <Text style={[styles.specText, { color: colors.secondary }]}>
                {car.transmission || "Auto"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Icon
                name="users"
                size={14}
                color={colors.primary}
                style={styles.specIcon}
              />
              <Text style={[styles.specText, { color: colors.secondary }]}>
                {car.seatCapacity || "5"} Seats
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.locationContainer}>
              <Icon name="map-marker" size={14} color={colors.secondary} />
              <Text
                style={[styles.locationText, { color: colors.secondary }]}
                numberOfLines={1}
              >
                {car.pickUpLocation}
              </Text>
            </View>

            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: colors.secondary }]}>
                Daily Rate
              </Text>
              <Text style={[styles.priceValue, { color: colors.primary }]}>
                ${car.pricePerDay}/day
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      {error ? (
        <>
          <Icon name="warning" size={60} color={colors.error} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Error</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={fetchFavoriteCars}
          >
            <Text style={styles.browseButtonText}>Try Again</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Icon name="heart-o" size={80} color={colors.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No favorites yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
            Find your perfect BMW and add it to favorites
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("Search")}
          >
            <Text style={styles.browseButtonText}>Browse Cars</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  if (loading && favoriteCars.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <FlatList
        data={favoriteCars}
        renderItem={renderCarItem}
        keyExtractor={(item) => item._id}
        numColumns={1}
        key="single-column"
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyListComponent}
        refreshing={loading}
        onRefresh={fetchFavoriteCars}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  cardContainer: {
    width: cardWidth,
    borderRadius: 10,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardImageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  carBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  carBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  specIcon: {
    marginRight: 4,
  },
  specText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 12,
  },
  priceValue: {
    fontWeight: "bold",
    fontSize: 16,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 500,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 24,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 22,
  },
  browseButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default MyFavoritesScreen;
