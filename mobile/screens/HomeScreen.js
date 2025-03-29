import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
  Dimensions,
  Animated,
  ImageBackground,
  Clipboard,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { globalStyles } from "../styles/globalStyles";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  fetchFeaturedCars,
  fetchFilteredCars,
  fetchUserFavorites,
  toggleFavorite,
  setFilterParams,
  resetFilters,
} from "../redux/slices/carSlice";
import { fetchAllDiscounts } from "../redux/slices/adminDiscountSlice";
import { CAR_IMAGES } from "../config/constants";
import Icon from "react-native-vector-icons/FontAwesome";
import StarRating from "../components/StarRating";
import FilterModal from "../components/FilterModal";
import { useToast } from "../context/ToastContext";
import { getRecentSearches } from "../utils/RecentSearchesManager";

const { width } = Dimensions.get("window");

const HomeScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const toast = useToast();
  const { featuredCars, loading, error, favorites, filterParams } = useSelector(
    (state) => state.cars
  );
  const { discounts, loading: discountsLoading } = useSelector(
    (state) => state.adminDiscounts
  );
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeDiscounts, setActiveDiscounts] = useState([]);
  const [codeOpacity] = useState(new Animated.Value(1));

  useEffect(() => {
    loadFeaturedCars();
    loadRecentSearches();
    loadDiscounts();
  }, []);

  useEffect(() => {
    if (discounts && discounts.length > 0) {
      // Filter active discounts (those that haven't expired)
      const now = new Date();
      const active = discounts.filter((discount) => {
        const endDate = new Date(discount.endDate);
        return endDate >= now;
      });
      setActiveDiscounts(active);
    }
  }, [discounts]);

  const loadFeaturedCars = () => {
    dispatch(fetchFeaturedCars());
  };

  const loadRecentSearches = async () => {
    const searches = await getRecentSearches();
    setRecentSearches(searches);
  };

  const loadDiscounts = () => {
    dispatch(fetchAllDiscounts());
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchFeaturedCars()),
      dispatch(fetchAllDiscounts()),
    ]).then(() => {
      loadRecentSearches();
      setRefreshing(false);
    });
  };

  const handleCarPress = (carId) => {
    navigation.navigate("CarDetails", { carId });
  };

  const handleDiscountPress = (discount) => {
    // Pass only the discount code instead of the whole discount object
    navigation.navigate("DiscountScreen", { discountCode: discount.code });
  };

  const handleFavoritePress = (carId) => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }

    // Find the car to pass full car details
    const car = featuredCars.find((car) => car._id === carId);

    dispatch(
      toggleFavorite({
        carId,
        userId: user._id,
        carDetails: car,
      })
    )
      .unwrap()
      .then((result) => {
        if (result.isAdded) {
          toast.success(
            `${car.brand} ${car.model} was added to your favorites`
          );
        } else {
          toast.info(
            `${car.brand} ${car.model} was removed from your favorites`
          );
        }
      })
      .catch((error) => {
        toast.error(error || "Failed to update favorites. Please try again.");
      });
  };

  const handleFilterApply = (newFilters) => {
    dispatch(setFilterParams(newFilters));
    dispatch(fetchFilteredCars(newFilters));
    setFilterVisible(false);
  };

  const handleFilterReset = () => {
    dispatch(resetFilters());
    dispatch(fetchFeaturedCars());
    setFilterVisible(false);
  };

  const renderCarCard = (car, index) => {
    const isFavorite = favorites.includes(car._id);
    const rating = car.averageRating || 0;

    return (
      <TouchableOpacity
        key={car._id || index}
        onPress={() => handleCarPress(car._id)}
        style={[
          globalStyles.card,
          {
            backgroundColor: colors.card,
            marginRight: 16,
            width: 280,
            position: "relative",
            ...colors.shadow,
          },
        ]}
        activeOpacity={0.7}
      >
        {user && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleFavoritePress(car._id)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Icon
              name={isFavorite ? "bookmark" : "bookmark-o"}
              size={22}
              color={isFavorite ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        )}

        <Image
          source={
            car.images && car.images.length > 0
              ? {
                  uri:
                    typeof car.images[0] === "string"
                      ? car.images[0]
                      : car.images[0]?.url || null,
                }
              : CAR_IMAGES.placeholder
          }
          style={styles.carImage}
          resizeMode="cover"
          defaultSource={CAR_IMAGES.placeholder}
          onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
        />

        <Text
          style={[
            globalStyles.subtitle,
            { color: colors.text, marginBottom: 4 },
          ]}
        >
          {car.brand} {car.model}
        </Text>

        <Text style={[globalStyles.text, { color: colors.secondary }]}>
          {car.vehicleType || "Luxury Car"}
        </Text>

        <View style={styles.detailsRow}>
          <Icon
            name="users"
            size={14}
            color={colors.secondary}
            style={styles.detailIcon}
          />
          <Text
            style={[
              globalStyles.text,
              { color: colors.secondary, fontSize: 13 },
            ]}
          >
            {car.seatCapacity || 5}
          </Text>

          <Icon
            name="tachometer"
            size={14}
            color={colors.secondary}
            style={[styles.detailIcon, { marginLeft: 12 }]}
          />
          <Text
            style={[
              globalStyles.text,
              { color: colors.secondary, fontSize: 13 },
            ]}
          >
            {car.mileage} km/L
          </Text>

          <Icon
            name="cog"
            size={14}
            color={colors.secondary}
            style={[styles.detailIcon, { marginLeft: 12 }]}
          />
          <Text
            style={[
              globalStyles.text,
              { color: colors.secondary, fontSize: 13 },
            ]}
          >
            {car.transmission}
          </Text>
        </View>

        <View
          style={[
            globalStyles.row,
            { justifyContent: "space-between", marginTop: 8 },
          ]}
        >
          <Text
            style={[
              globalStyles.text,
              { color: colors.primary, fontWeight: "700" },
            ]}
          >
            ₱{car.pricePerDay}/day
          </Text>
          <StarRating rating={rating} size={14} />
        </View>

        <View style={styles.locationRow}>
          <Icon
            name="map-marker"
            size={14}
            color={colors.secondary}
            style={styles.detailIcon}
          />
          <Text
            style={[
              globalStyles.text,
              { color: colors.secondary, fontSize: 13 },
            ]}
            numberOfLines={1}
          >
            {car.pickUpLocation}
          </Text>
        </View>

        {car.isAutoApproved !== undefined && (
          <View
            style={[
              styles.approvalBadge,
              {
                backgroundColor: car.isAutoApproved
                  ? colors.success
                  : colors.error,
              },
            ]}
          >
            <Text style={styles.approvalText}>
              {car.isAutoApproved ? "Auto Approved" : "Requires Approval"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleError = (error) => {
    const errorMessage =
      typeof error === "object"
        ? error.message || JSON.stringify(error)
        : String(error);

    return (
      <View style={styles.errorContainer}>
        <Text style={[globalStyles.text, { color: colors.error }]}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          onPress={loadFeaturedCars}
          style={[styles.retryButton, { backgroundColor: colors.error }]}
        >
          <Text style={{ color: "#fff" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const copyDiscountCode = (code) => {
    Clipboard.setString(code);

    // Flash animation for feedback
    Animated.sequence([
      Animated.timing(codeOpacity, {
        toValue: 0.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(codeOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    toast.success("Discount code copied to clipboard!");
  };

  // Get pattern image based on theme
  const getPatternImage = () => {
    return isDarkMode
      ? require("../assets/images/dark-pattern.png") // You'll need to add these images to your project
      : require("../assets/images/light-pattern.png");
  };

  // Function to generate appealing promo titles
  const generatePromoTitle = (discount, index) => {
    const promoTitles = [
      "Special Offer",
      "Just For You",
      "Limited Deal",
      "Flash Sale",
      "Hot Deal",
      "Premium Offer",
      "Save Big",
    ];

    // If discount is high (>30%), use more exciting titles
    if (discount.discountPercentage >= 30) {
      return ["Amazing Deal", "Mega Discount", "Huge Savings"][index % 3];
    }

    // Return a title based on index to ensure variety
    return promoTitles[index % promoTitles.length];
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header Section with Search */}
        <View
          style={[styles.headerSection, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.welcomeText}>Welcome to BMW Rentals</Text>
          <TouchableOpacity
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.background,
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDarkMode ? 0.3 : 0.1,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 4,
                  },
                }),
              },
            ]}
            onPress={() => navigation.navigate("SearchTab")}
            activeOpacity={0.8}
          >
            <Icon name="search" size={18} color={colors.secondary} />
            <Text style={[styles.searchText, { color: colors.secondary }]}>
              Search for a car...
            </Text>
            <Icon name="sliders" size={18} color={colors.secondary} />
          </TouchableOpacity>

          {recentSearches.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recentSearchesScroll}
            >
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.recentSearchBadge,
                    { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                  onPress={() =>
                    navigation.navigate("SearchTab", {
                      screen: "SearchScreen",
                      params: { query: search },
                    })
                  }
                >
                  <Text style={styles.recentSearchText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ padding: 16 }}>
          {/* Featured Cars Section */}
          <View style={styles.sectionHeader}>
            <Text style={[globalStyles.subtitle, { color: colors.text }]}>
              Featured Cars
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("AllCars")}>
              <Text style={{ color: colors.primary }}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Featured Cars Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16, marginBottom: 24 }}
          >
            {loading && featuredCars.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={[globalStyles.text, { color: colors.error }]}>
                  {typeof error === "object"
                    ? JSON.stringify(error)
                    : String(error)}
                </Text>
                <TouchableOpacity
                  onPress={loadFeaturedCars}
                  style={[
                    styles.retryButton,
                    { backgroundColor: colors.error },
                  ]}
                >
                  <Text style={{ color: "#fff" }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : featuredCars.length > 0 ? (
              featuredCars.map(renderCarCard)
            ) : (
              <View style={styles.noDataContainer}>
                <Icon
                  name="car"
                  size={40}
                  color={colors.secondary}
                  style={{ marginBottom: 10 }}
                />
                <Text style={[globalStyles.text, { color: colors.text }]}>
                  No featured cars found
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Special Offers Section */}
          <View style={styles.sectionHeader}>
            <Text style={[globalStyles.subtitle, { color: colors.text }]}>
              Special Offers
            </Text>
            {activeDiscounts.length > 3 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("AllDiscounts")}
              >
                <Text style={{ color: colors.primary }}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 16 }}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {discountsLoading ? (
              <View
                style={[
                  styles.offerCard,
                  {
                    backgroundColor: colors.card,
                    justifyContent: "center",
                    alignItems: "center",
                    ...colors.shadow,
                  },
                ]}
              >
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : activeDiscounts.length > 0 ? (
              activeDiscounts.map((discount, index) => (
                <TouchableOpacity
                  key={discount._id || index}
                  onPress={() => handleDiscountPress(discount)}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={
                      index % 2 === 0
                        ? [colors.primary, "#004080"]
                        : [colors.accent, "#6b3d00"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.offerCard}
                  >
                    <ImageBackground
                      source={getPatternImage()}
                      style={styles.patternBackground}
                      imageStyle={{ opacity: 0.05 }}
                    >
                      <View style={styles.offerBadge}>
                        <Text style={styles.offerBadgeText}>
                          {discount.discountPercentage}% OFF
                        </Text>
                      </View>

                      <View style={styles.offerTextContainer} numberOfLines={0}>
                        <Text style={styles.offerTitle}>
                          {generatePromoTitle(discount, index)}
                        </Text>

                        <View
                          style={[styles.codeContainer, { marginRight: 10 }]}
                        >
                          <Text style={styles.codeLabel}>Use code:</Text>
                          <View style={styles.codeBox}>
                            <Text style={styles.codeText}>{discount.code}</Text>
                            <TouchableOpacity
                              style={styles.copyButton}
                              onPress={() => copyDiscountCode(discount.code)}
                            >
                              <Icon name="copy" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={[styles.validityContainer, { gap: 7 }]}>
                          <Icon
                            name="calendar"
                            size={12}
                            color="rgba(255,255,255,0.9)"
                          />
                          <Text
                            style={[
                              styles.validityText,
                              { color: "#fff", marginTop: 0 },
                            ]}
                          >
                            Valid until{" "}
                            {new Date(discount.endDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      {discount.discountLogo &&
                      discount.discountLogo.imageUrl ? (
                        <Image
                          source={{ uri: discount.discountLogo.imageUrl }}
                          style={[styles.offerImage]}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.discountCircle}>
                          <Text style={styles.discountPercentText}>
                            {discount.discountPercentage}%
                          </Text>
                        </View>
                      )}
                    </ImageBackground>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            ) : (
              <View
                style={[
                  styles.offerCard,
                  {
                    backgroundColor: colors.card,
                    justifyContent: "center",
                    alignItems: "center",
                    ...colors.shadow,
                  },
                ]}
              >
                <Icon
                  name="tag"
                  size={40}
                  color={colors.secondary}
                  style={{ marginBottom: 10 }}
                />
                <Text
                  style={[
                    globalStyles.text,
                    { color: colors.text, textAlign: "center" },
                  ]}
                >
                  No active discounts available at the moment
                </Text>
              </View>
            )}
          </ScrollView>

          {/* How It Works Section */}
          <Text
            style={[
              globalStyles.subtitle,
              { color: colors.text, marginTop: 8 },
            ]}
          >
            How It Works
          </Text>

          <View style={styles.stepsContainer}>
            {[
              {
                icon: "user",
                title: "Create a profile",
                description: "Sign up and set up your account",
              },
              {
                icon: "car",
                title: "Choose a car",
                description: "Browse our collection of quality and assured vehicles from our verified car owners",
              },
              {
                icon: "handshake-o",
                title: "Meet the seller",
                description: "Coomunicate and coordinate pickup details",
              },
              {
                icon: "check-circle",
                title: "Enjoy your ride",
                description: "Experience the ultimate driving machine",
              },
            ].map((step, index) => (
              <View
                key={index}
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: colors.card,
                    ...colors.shadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Icon name={step.icon} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    {step.title}
                  </Text>
                  <Text
                    style={[
                      styles.stepDescription,
                      { color: colors.secondary },
                    ]}
                  >
                    {step.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* About Us Section */}
          <Text
            style={[
              globalStyles.subtitle,
              { color: colors.text, marginTop: 24 },
            ]}
          >
            About BMW Rentals
          </Text>

          <View
            style={[
              globalStyles.card,
              {
                backgroundColor: colors.card,
                marginBottom: 20,
                ...colors.shadow,
              },
            ]}
          >
            <Text style={[globalStyles.text, { color: colors.text }]}>
              Welcome to our Car Rental service! We offer a wide selection of
              BMW vehicles to meet all your transportation needs. Whether you
              need a quick city drive, a road trip, or a special occasion car,
              we've got you covered.
            </Text>
            <TouchableOpacity
              style={[
                styles.learnMoreButton,
                {
                  borderColor: colors.primary,
                  backgroundColor: isDarkMode
                    ? "rgba(51, 153, 255, 0.1)"
                    : "rgba(0, 102, 204, 0.05)",
                },
              ]}
            >
              <Text style={{ color: colors.primary }} onPress={()=>{
                navigation.navigate("AboutUsScreen")
              }}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        initialValues={filterParams}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
  },
  adminButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchText: {
    marginLeft: 8,
    flex: 1,
  },
  recentSearchesScroll: {
    marginTop: 8,
    marginBottom: 8,
  },
  recentSearchBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  recentSearchText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loadingContainer: {
    width: 280,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    width: 280,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  noDataContainer: {
    width: 350,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  carImage: {
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#e0e0e0",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 8,
    borderRadius: 20,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  detailIcon: {
    marginRight: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  approvalBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  approvalText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  offerCard: {
    width: 280,
    height: 170,
    borderRadius: 16,
    marginRight: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  patternBackground: {
    flex: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  offerBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 16,
  },
  offerBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  offerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  offerTitle: {
    fontWeight: "700",
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    width: "100%",
    textAlign: "left",
    lineHeight: 24,
  },
  codeContainer: {
    marginBottom: 16,
  },
  codeLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginBottom: 6,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingLeft: 12,
    paddingVertical: 8,
    maxWidth: 160,
  },
  codeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
    letterSpacing: 1,
  },
  copyButton: {
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  validityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  validityText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginLeft: 6,
  },
  offerImage: {
    width: 90,
    height: 90,
    alignSelf: "center",
    marginRight: 8,
  },
  discountCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  discountPercentText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  stepsContainer: {
    marginVertical: 16,
    flexDirection: "column",
    gap: 12,
  },
  stepCard: {
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
  },
  learnMoreButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  validityText: {
    fontSize: 12,
    marginTop: 8,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default HomeScreen;
