import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchUserFavorites, deleteFavoriteCar } from '../redux/slices/carSlice';
import { CAR_IMAGES } from '../config/constants';
import Icon from 'react-native-vector-icons/FontAwesome';
import StarRating from '../components/StarRating';
import { useToast } from '../context/ToastContext';

const { width } = Dimensions.get("window");
const cardWidth = width - 32;

const MyFavoritesScreen = () => {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const toast = useToast();
  
  const { favoriteCarsData, loading: reduxLoading, error: reduxError } = useSelector(state => state.cars);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && user._id) {
      loadFavorites();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadFavorites = () => {
    if (!user || !user._id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    dispatch(fetchUserFavorites(user._id))
      .unwrap()
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading favorites:", err);
        setError(err?.message || "Failed to load your favorite cars");
        setLoading(false);
      });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
    setRefreshing(false);
  };

  const handleDeleteFavorite = (favorite) => {
    if (!favorite || !favorite._id) {
      toast.error("Cannot remove this item. Invalid favorite data.");
      return;
    }
    
    Alert.alert(
      'Remove from Favorites',
      `Are you sure you want to remove ${favorite.car?.brand || ''} ${favorite.car?.model || ''} from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteFavoriteCar({
              favoriteId: favorite._id,
              carDetails: favorite
            }))
            .unwrap()
            .then(() => {
              toast.success(`${favorite.car?.brand || ''} ${favorite.car?.model || ''} was removed from favorites`);
            })
            .catch((err) => {
              toast.error(err || 'Failed to remove from favorites');
            });
          }
        }
      ]
    );
  };

  const handleCarPress = (carId) => {
    if (!carId) return;
    navigation.navigate('Home', { screen: "CarDetails", params: {carId: carId} });
  };

  // Render a single favorite car item
  const renderFavoriteItem = ({ item }) => {
    if (!item || !item.car) return null;
    
    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleCarPress(item.car._id)}
        >
          <View style={styles.cardImageContainer}>
            <Image
              source={
                item.car.images && item.car.images.length > 0
                  ? { uri: item.car.images[0]?.url }
                  : CAR_IMAGES.placeholder
              }
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <View style={styles.carBadge}>
                <Text style={styles.carBadgeText}>
                  {item.car.vehicleType || "Car"}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.car.brand} {item.car.model}
              </Text>
              <TouchableOpacity 
                onPress={() => handleDeleteFavorite(item)}
                style={[styles.favoriteButton, { backgroundColor: colors.error + '20' }]}
              >
                <Icon name="trash" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingContainer}>
              <StarRating 
                rating={item.car.averageRating || 0} 
                size={14} 
              />
              <Text style={[styles.reviewCount, { color: colors.secondary }]}>
                ({item.car.reviewCount || 0})
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Icon 
                  name="users" 
                  size={14} 
                  color={colors.secondary}
                  style={styles.specIcon}
                />
                <Text style={[styles.specText, { color: colors.secondary }]}>
                  {item.car.seatCapacity || 5} Seats
                </Text>
              </View>
              
              <View style={styles.specItem}>
                <Icon 
                  name="cog" 
                  size={14} 
                  color={colors.secondary}
                  style={styles.specIcon}
                />
                <Text style={[styles.specText, { color: colors.secondary }]}>
                  {item.car.transmission || "Auto"}
                </Text>
              </View>
            </View>
            
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Icon 
                  name="tachometer" 
                  size={14} 
                  color={colors.secondary}
                  style={styles.specIcon}
                />
                <Text style={[styles.specText, { color: colors.secondary }]}>
                  {item.car.mileage || "N/A"} km/L
                </Text>
              </View>
              
              <View style={styles.specItem}>
                <Icon 
                  name="calendar" 
                  size={14} 
                  color={colors.secondary}
                  style={styles.specIcon}
                />
                <Text style={[styles.specText, { color: colors.secondary }]}>
                  {item.car.year || "N/A"}
                </Text>
              </View>
            </View>
            
            <View style={styles.footer}>
              <View style={styles.locationContainer}>
                <Icon 
                  name="map-marker" 
                  size={14} 
                  color={colors.secondary} 
                />
                <Text 
                  style={[styles.locationText, { color: colors.secondary }]}
                  numberOfLines={1}
                >
                  {item.car.pickUpLocation || "Location unavailable"}
                </Text>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={[styles.priceLabel, { color: colors.secondary }]}>Price</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>
                  ₱{item.car.pricePerDay || 0}/day
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };
  
  // If not authenticated
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Icon name="user-circle" size={60} color={colors.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Not Logged In
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
            Please login to view your favorite cars
          </Text>
          <TouchableOpacity 
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.browseButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Content to render
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={favoriteCarsData}
        renderItem={renderFavoriteItem}
        keyExtractor={(item, index) => item?._id || index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
                Loading your favorites...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Icon name="exclamation-circle" size={60} color={colors.error} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Something went wrong
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.error }]}>
                {error}
              </Text>
              <TouchableOpacity 
                style={[styles.browseButton, { backgroundColor: colors.primary }]}
                onPress={loadFavorites}
              >
                <Text style={styles.browseButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="heart-o" size={60} color={colors.secondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Favorites Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
                Cars you add to favorites will appear here
              </Text>
              <TouchableOpacity 
                style={[styles.browseButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.browseButtonText}>Browse Cars</Text>
              </TouchableOpacity>
            </View>
          )
        }
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
    gap: 20,
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
