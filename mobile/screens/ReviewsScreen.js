import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { fetchReviewsByCarId } from "../redux/slices/reviewSlice";
import Icon from "react-native-vector-icons/FontAwesome";
import StarRating from "../components/StarRating";

const { width, height } = Dimensions.get("window");

const createSimpleFilter = () => {
  const badWords = [
    "gago",
    "tanga",
    "tangina",
    "bullshit",
    "shit",
    "ass",
    "fuck",
    "fucked",
  ];
  return {
    clean: (text) => {
      if (!text) return "";
      let filteredText = text;
      badWords.forEach((word) => {
        const regex = new RegExp("\\b" + word + "\\b", "gi");
        filteredText = filteredText.replace(regex, "***");
      });
      return filteredText;
    },
  };
};

// Import bad-words only if available, otherwise use fallback
let Filter;
let filter;
try {
  // Dynamic import to avoid direct reference that might cause build issues
  Filter = require("bad-words");
  filter = new Filter();
} catch (error) {
  console.log("Bad-words library not available, using fallback filter");
  filter = createSimpleFilter();
}

const ReviewsScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { carId, carTitle } = route.params || {};
  const { reviews, loading, error, averageRating } = useSelector(
    (state) => state.reviews
  );
  const [selectedRatingFilter, setSelectedRatingFilter] = useState(0); // 0 means no filter
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  useEffect(() => {
    // Set the title in the header
    navigation.setOptions({
      title: `Reviews for ${carTitle || "Car"}`,
    });

    loadReviews();
  }, [carId, navigation, carTitle]);

  useEffect(() => {
    if (selectedRatingFilter === 0) {
      setFilteredReviews(reviews);
    } else {
      setFilteredReviews(
        reviews.filter(
          (review) => Math.round(review.rating) === selectedRatingFilter
        )
      );
    }
  }, [reviews, selectedRatingFilter]);

  const loadReviews = () => {
    if (carId) {
      dispatch(fetchReviewsByCarId(carId));
    } else {
      console.error("No car ID provided");
    }
  };

  // Function to filter bad words - with error handling
  const filterBadWords = (text) => {
    try {
      if (!text) return "";
      return filter.clean(text);
    } catch (error) {
      console.error("Error filtering bad words:", error);
      return text;
    }
  };

  // Function to censor a name by replacing middle characters with asterisks
  const censorName = (name) => {
    if (!name || name.length <= 2) return name; // Don't censor very short names
    
    const firstChar = name.charAt(0);
    const lastChar = name.charAt(name.length - 1);
    const middleChars = '*'.repeat(name.length - 2);
    
    return `${firstChar}${middleChars}${lastChar}`;
  };

  const handleImagePress = (imageUri) => {
    setSelectedImage(imageUri);
    setImageViewerVisible(true);
  };

  const renderReviewItem = ({ item }) => {
    const reviewDate = new Date(
      item.createdAt || Date.now()
    ).toLocaleDateString();

    return (
      <View style={[styles.reviewCard, { backgroundColor: colors.card }]}>
        <View style={styles.reviewHeader}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {item.renter?.avatar?.url ? (
                <Image
                  source={{ uri: item.renter.avatar.url }}
                  style={{ width: 30, height: 30, borderRadius: 20, marginTop: 10 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ 
                  width: 30, 
                  height: 30, 
                  borderRadius: 20, 
                  backgroundColor: colors.primary, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  marginTop: 10
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                    {item.renter?.firstName ? item.renter.firstName.charAt(0).toUpperCase() : "?"}
                  </Text>
                </View>
              )}
              <Text style={[styles.reviewerName, { color: colors.text }]}>
                {item.renter
                  ? `${censorName(item.renter?.firstName)} ${censorName(item.renter?.lastName)}`
                  : "Anonymous"}
              </Text>
            </View>
            <Text style={[styles.reviewDate, { color: colors.secondary, marginLeft: 38 }]}>
              {reviewDate}
            </Text>
          </View>
          <StarRating rating={item.rating} size={16} />
        </View>

        <Text style={[styles.reviewText, { color: colors.text }]}>
          {filterBadWords(item.comment)}
        </Text>

        {/* Review Images */}
        {item.images && item.images.length > 0 && (
          <View style={styles.reviewImagesContainer}>
            {item.images.map((image, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reviewImageWrapper}
                onPress={() => handleImagePress(image.url || image)}
              >
                <Image
                  source={{ uri: image.url || image }}
                  style={styles.reviewImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Full screen image viewer
  const ImageViewer = () => (
    <Modal
      visible={imageViewerVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageViewerVisible(false)}
    >
      <View style={styles.imageViewerContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setImageViewerVisible(false)}
        >
          <Icon name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={{ uri: selectedImage }}
          style={styles.fullScreenImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Reviews List Section */}
      <View style={styles.summarySection}>
        <View style={styles.ratingSummary}>
          <Text style={[styles.averageRating, { color: colors.text }]}>
            {averageRating.toFixed(1)}
          </Text>
          <StarRating rating={averageRating} size={24} />
          <Text style={[styles.reviewCount, { color: colors.secondary }]}>
            ({reviews.length} reviews)
          </Text>
        </View>

        {/* Rating Filter */}
        <View style={styles.ratingFilterContainer}>
          {[0, 5, 4, 3, 2, 1].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.filterButton,
                selectedRatingFilter === rating && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
                { borderColor: colors.border },
              ]}
              onPress={() => setSelectedRatingFilter(rating)}
            >
              {rating === 0 ? (
                <Text
                  style={[
                    styles.filterButtonText,
                    {
                      color:
                        selectedRatingFilter === 0 ? "#FFFFFF" : colors.text,
                    },
                  ]}
                >
                  All
                </Text>
              ) : (
                <View style={styles.filterButtonContent}>
                  <Text
                    style={[
                      styles.filterButtonText,
                      {
                        color:
                          selectedRatingFilter === rating
                            ? "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    {rating}
                  </Text>
                  <Icon
                    name="star"
                    size={12}
                    color={
                      selectedRatingFilter === rating ? "#FFFFFF" : "#FFD700"
                    }
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Loading or Error States */}
      {loading && filteredReviews.length === 0 ? (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centeredContent}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {typeof error === "object"
              ? error.message || JSON.stringify(error)
              : String(error)}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadReviews}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredReviews.length === 0 ? (
        <View style={styles.centeredContent}>
          <Icon name="comment-o" size={50} color={colors.secondary} />
          {selectedRatingFilter > 0 ? (
            <Text style={[styles.noReviewsText, { color: colors.text }]}>
              No {selectedRatingFilter}-star reviews yet.
            </Text>
          ) : (
            <Text style={[styles.noReviewsText, { color: colors.text }]}>
              No reviews yet for this car.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item, index) => item._id || `review-${index}`}
          contentContainerStyle={styles.reviewsList}
        />
      )}

      {/* Full Screen Image Viewer */}
      <ImageViewer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summarySection: {
    padding: 16,
    alignItems: "center",
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: "bold",
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 14,
    marginLeft: 8,
  },
  ratingFilterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  filterButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterButtonText: {
    fontWeight: "500",
    marginRight: 4,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  noReviewsText: {
    marginTop: 16,
    textAlign: "center",
  },
  reviewsList: {
    padding: 16,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  reviewImageWrapper: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
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
  fullScreenImage: {
    width: width,
    height: height * 0.8,
  },
});

export default ReviewsScreen;
