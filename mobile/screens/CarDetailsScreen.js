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
import { CAR_IMAGES } from "../config/constants";
import Icon from "react-native-vector-icons/FontAwesome";
import StarRating from "../components/StarRating";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

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
  const { carId } = route.params || {};
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

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

  const handleFavoritePress = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    
    try {
      const response = await api.post('/favorite-car', {
        user: user._id,
        car: currentCar._id
      });
      
      dispatch(toggleFavorite(currentCar._id));
      
      if (response.data.message.includes('added')) {
        toast.success(`${currentCar.brand} ${currentCar.model} was added to your favorites`);
      } else {
        toast.info(`${currentCar.brand} ${currentCar.model} was removed from your favorites`);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites. Please try again.');
    }
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

  const handleBookPress = () => {
    if (!user) {
      toast.warning('Please login to book this car');
      navigation.navigate("Login");
      return;
    }

    navigation.navigate("BookingScreen", { carId });
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
                    opacity: activeImageIndex === index ? 1 : 0.6,
                    backgroundColor: "#FFFFFF",
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Car Image */}
        <View style={styles.imageContainer}>
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

          {/* Owner Info */}
          {currentCar.owner && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Car Owner
              </Text>
              <View style={[styles.ownerBox, { backgroundColor: colors.card }]}>
                <View style={styles.ownerAvatarContainer}>
                  {currentCar.owner.profilePicture ? (
                    <Image
                      source={{ uri: currentCar.owner.profilePicture }}
                      style={styles.ownerAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.avatarInitial}>
                        {currentCar.owner.firstName?.[0] || "U"}
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
                <TouchableOpacity
                  style={[
                    styles.contactButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() =>
                    navigation.navigate("ChatScreen", {
                      recipientId: currentCar.owner._id,
                    })
                  }
                >
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Book Now Button */}
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: colors.primary }]}
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
        </View>
      </ScrollView>
      <ImageViewer />
    </SafeAreaView>
  );
};

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
    marginBottom: 16,
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
    borderBottomWidth: 1,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  bookButton: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
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
});

export default CarDetailsScreen;
