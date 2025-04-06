import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as SQLite from "expo-sqlite";
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
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [cartsInDb, setCartsInDb] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const [carsLoaded, setCarsLoaded] = useState(false);
  const [discountsLoaded, setDiscountsLoaded] = useState(false);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log("Opening database...");
        if (db) {
          try {
            console.log("Closing existing database connection");
            await db.closeAsync();
          } catch (closeError) {
            console.log("Error closing existing database:", closeError);
          }
        }

        const database = await SQLite.openDatabaseAsync("bmwCartNew.db");
        console.log("Database opened successfully");

        if (!database) {
          throw new Error("Failed to open database - received null");
        }

        setDb(database);

        await database.execAsync(
          `CREATE TABLE IF NOT EXISTS rent_cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            car_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            price REAL NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER,
            vehicleType TEXT,
            transmission TEXT,
            pickUpLocation TEXT,
            imageUrl TEXT
          );`
        );

        setDbReady(true);
        console.log("Database is ready for use");

        if (user) {
          loadCartItems(database);
        }
      } catch (error) {
        console.error("Database setup error:", error);
        setDbError(error.message || String(error));
        setDbReady(false);
      }
    };

    initDatabase();

    return () => {
      if (db) {
        console.log("Closing database on component unmount");
        db.closeAsync().catch((err) =>
          console.log("Error closing database:", err)
        );
      }
    };
  }, []);

  const loadCartItems = async (database) => {
    const dbToUse = database || db;

    if (!dbToUse || !dbReady) {
      console.log("Database not ready or null, skipping cart load");
      setCartCount(0);
      return;
    }

    if (!user) {
      setCartCount(0);
      return;
    }

    try {
      console.log(`Attempting to load cart items for user: ${user._id}`);

      const userId = user._id || "";
      if (!userId) {
        console.log("Invalid user ID, skipping cart load");
        setCartCount(0);
        return;
      }

      const items = await dbToUse.getAllAsync(
        "SELECT * FROM rent_cart WHERE user_id = ?",
        [userId]
      );

      console.log(`Found ${items.length} items in cart for user: ${userId}`);

      setCartsInDb(items.map((item) => item.car_id));
      setCartCount(items.length);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      setCartCount(0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (db && dbReady && user) {
        console.log("HomeScreen focused - reloading cart items");
        loadCartItems();

        if (!carsLoaded) loadFeaturedCars();
        if (!discountsLoaded) loadDiscounts();
      } else {
        console.log("Skipping cart reload - database or user not ready", {
          dbAvailable: !!db,
          dbReady,
          userAvailable: !!user,
        });
      }
      return () => {};
    }, [db, dbReady, user, carsLoaded, discountsLoaded, loadFeaturedCars, loadDiscounts])
  );

  useEffect(() => {
    if (db && dbReady && user) {
      loadCartItems();
    }
  }, [db, dbReady, user]);

  useEffect(() => {
    if (discounts && discounts.length > 0) {
      const now = new Date();
      const active = discounts.filter((discount) => {
        const endDate = new Date(discount.endDate);
        return endDate >= now;
      });
      setActiveDiscounts(active);
    }
  }, [discounts]);

  const loadFeaturedCars = useCallback(() => {
    console.log("Loading featured cars");
    return dispatch(fetchFeaturedCars())
      .then(() => {
        setCarsLoaded(true);
        console.log("Featured cars loaded successfully");
      })
      .catch((error) => {
        console.error("Error loading featured cars:", error);
      });
  }, [dispatch]);

  const loadDiscounts = useCallback(() => {
    console.log("Loading discounts");
    return dispatch(fetchAllDiscounts())
      .then(() => {
        setDiscountsLoaded(true);
        console.log("Discounts loaded successfully");
      })
      .catch((error) => {
        console.error("Error loading discounts:", error);
      });
  }, [dispatch]);

  useEffect(() => {
    if (!carsLoaded) loadFeaturedCars();
    if (!discountsLoaded) loadDiscounts();
  }, [loadFeaturedCars, loadDiscounts, carsLoaded, discountsLoaded]);

  const loadRecentSearches = useCallback(async () => {
    const searches = await getRecentSearches();
    setRecentSearches(searches);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    console.log("Manual refresh initiated by user");

    Promise.all([
      loadFeaturedCars(),
      loadDiscounts(),
      loadRecentSearches(),
    ])
      .then(() => {
        setRefreshing(false);
      })
      .catch(() => {
        setRefreshing(false);
      });
  }, [loadFeaturedCars, loadDiscounts, loadRecentSearches]);

  const handleCarPress = (carId) => {
    navigation.navigate("CarDetails", { carId });
  };

  const handleDiscountPress = (discount) => {
    navigation.navigate("DiscountScreen", { discountCode: discount.code });
  };

  const handleFavoritePress = (carId) => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }

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
        console.log(error || "Failed to update favorites. Please try again.");
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

  const handleAddToRent = async (car) => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }

    try {
      if (!db || !dbReady) {
        console.log("Database not initialized or not ready. Please restart the app.");
        toast.error("Database error. Please restart the app.");
        return;
      }

      if (!car?._id || !user?._id) {
        console.log("Invalid car or user data.");
        toast.error("Invalid data. Please try again.");
        return;
      }

      const existingItems = await db.getAllAsync(
        "SELECT * FROM rent_cart WHERE car_id = ? AND user_id = ?",
        [car._id, user._id]
      );

      if (existingItems && existingItems.length > 0) {
        toast.info(`${car.brand} ${car.model} is already in your rent cart`);
        return;
      }

      const insertData = {
        car_id: car._id,
        user_id: user._id,
        price: parseFloat(car.pricePerDay) || 0,
        brand: car.brand?.toString() || "",
        model: car.model?.toString() || "",
        year: car.year ? parseInt(car.year) : null,
        vehicleType: car.vehicleType?.toString() || "Sedan",
        transmission: car.transmission?.toString() || "Automatic",
        pickUpLocation: car.pickUpLocation?.toString() || "",
        imageUrl: (car.images?.[0]?.url || car.images?.[0] || "").toString(),
      };

      const result = await db.runAsync(
        `INSERT INTO rent_cart (
          car_id, user_id, price, brand, model, 
          year, vehicleType, transmission, pickUpLocation, imageUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          insertData.car_id,
          insertData.user_id,
          insertData.price,
          insertData.brand,
          insertData.model,
          insertData.year,
          insertData.vehicleType,
          insertData.transmission,
          insertData.pickUpLocation,
          insertData.imageUrl,
        ]
      );

      if (result.changes > 0) {
        toast.success(`${car.brand} ${car.model} added to your rent cart`);
        await loadCartItems();
      } else {
        throw new Error("Failed to add car to cart");
      }
    } catch (error) {
      console.error("Database operation error:", error);
      toast.error("Failed to add car to cart. Please try again.");
    }
  };

  const renderCarCard = (car, index) => {
    const isFavorite = favorites.includes(car._id);
    const rating = car.averageRating || 0;
    const isOwner = user && car.owner === user._id;
    const isInCart = cartsInDb.includes(car._id);

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

        {user && !isOwner && (
          <TouchableOpacity
            style={[
              styles.addToRentButton,
              { backgroundColor: isInCart ? colors.secondary : colors.primary },
            ]}
            onPress={() => handleAddToRent(car)}
            disabled={isInCart}
          >
            <Icon
              name={isInCart ? "check" : "plus"}
              size={15}
              color="#FFFFFF"
            />
          </TouchableOpacity>
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

  const getPatternImage = () => {
    return isDarkMode
      ? require("../assets/images/dark-pattern.png")
      : require("../assets/images/light-pattern.png");
  };

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

    if (discount.discountPercentage >= 30) {
      return ["Amazing Deal", "Mega Discount", "Huge Savings"][index % 3];
    }

    return promoTitles[index % promoTitles.length];
  };

  useEffect(() => {
    if (dbError) {
      console.log("Database error detected:", dbError);
      toast.error(`Database error: ${dbError}`);
    }
  }, [dbError]);

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
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={() =>
                    navigation.navigate("SearchTab", { query: search })
                  }
                >
                  <Text style={styles.recentSearchText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ padding: 16 }}>
          <View style={{ marginVertical: 16 }}>
            <Text
              style={[
                globalStyles.subtitle,
                { color: colors.text, marginBottom: 8 },
              ]}
            >
              Featured Cars
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : error ? (
                handleError(error)
              ) : featuredCars.length > 0 ? (
                featuredCars.map((car, index) => renderCarCard(car, index))
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={[globalStyles.text, { color: colors.text }]}>
                    No cars available at the moment
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          <Text
            style={[
              globalStyles.subtitle,
              { color: colors.text, marginBottom: 8 },
            ]}
          >
            Discounts & Offers
          </Text>
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

                      <View style={styles.offerTextContainer}>
                        <Text style={[styles.offerTitle, { color: "white" }]}>
                          {generatePromoTitle(discount, index)}
                        </Text>

                        <View style={styles.codeContainer}>
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
                      </View>

                      <View style={styles.imageContainer}>
                        {discount.discountLogo &&
                        discount.discountLogo.imageUrl ? (
                          <Image
                            source={{ uri: discount.discountLogo.imageUrl }}
                            style={styles.offerImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.discountCircle}>
                            <Text style={styles.discountPercentText}>
                              {discount.discountPercentage}%
                            </Text>
                          </View>
                        )}
                      </View>
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
                description:
                  "Browse our collection of quality and assured vehicles from our verified car owners",
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
              <Text
                style={{ color: colors.primary }}
                onPress={() => {
                  navigation.navigate("AboutUsScreen");
                }}
              >
                Learn More
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        initialValues={filterParams}
      />
      <TouchableOpacity
        style={[styles.floatingCartButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("Rentals", { screen: "CartScreen" })}
      >
        <Icon name="car" size={24} color="#FFFFFF" />
        {cartCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{cartCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  badgeContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
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
    marginBottom: 16,
    textAlign: "center",
  },
  adminButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    justifyContent: "space-between",
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
    paddingRight: 10,
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
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 5,
  },
  offerImage: {
    width: 80,
    height: 80,
    alignSelf: "center",
  },
  discountCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
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
  addToRentButton: {
    position: "absolute",
    bottom: 8,
    right: 14,
    width: 36,
    height: 28,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default HomeScreen;
