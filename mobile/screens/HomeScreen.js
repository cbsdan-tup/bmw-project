import React, { useEffect, useState } from 'react';
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
  FlatList,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { globalStyles } from '../styles/globalStyles';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  fetchFeaturedCars, 
  fetchFilteredCars,
  toggleFavorite, 
  setFilterParams,
  resetFilters
} from '../redux/slices/carSlice';
import { CAR_IMAGES, COMMON_COLORS } from '../config/constants';
import Icon from 'react-native-vector-icons/FontAwesome';
import StarRating from '../components/StarRating';
import FilterModal from '../components/FilterModal';
import api from '../services/api';
import { useToast } from '../context/ToastContext'; 

const HomeScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const toast = useToast(); 
  const { featuredCars, loading, error, favorites, filterParams } = useSelector(state => state.cars);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  
  useEffect(() => {
    loadFeaturedCars();
  }, []);

  const loadFeaturedCars = () => {
    dispatch(fetchFeaturedCars());
  };

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchFeaturedCars()).then(() => {
      setRefreshing(false);
    });
  };

  const handleCarPress = (carId) => {
    navigation.navigate('CarDetails', { carId });
  };

  const handleFavoritePress = async (carId) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    
    try {
      const response = await api.post('/favorite-car', {
        user: user._id,
        car: carId
      });
      
      // Toggle favorite in Redux store
      dispatch(toggleFavorite(carId));
      
      const car = featuredCars.find(car => car._id === carId);
      if (car && response.data.message.includes('added')) {
        toast.success(`${car.brand} ${car.model} was added to your favorites`);
      } else if (car) {
        toast.info(`${car.brand} ${car.model} was removed from your favorites`);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites. Please try again.');
    }
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
            position: 'relative',
            ...colors.shadow
          }
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
          source={car.images && car.images.length > 0 
            ? { 
                uri: typeof car.images[0] === 'string' 
                  ? car.images[0] 
                  : car.images[0]?.url || null 
              } 
            : CAR_IMAGES.placeholder
          }
          style={styles.carImage}
          resizeMode="cover"
          defaultSource={CAR_IMAGES.placeholder}
          onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
        />
        
        <Text style={[globalStyles.subtitle, { color: colors.text, marginBottom: 4 }]}>
          {car.brand} {car.model}
        </Text>
        
        <Text style={[globalStyles.text, { color: colors.secondary }]}>
          {car.vehicleType || "Luxury Car"}
        </Text>
        
        <View style={styles.detailsRow}>
          <Icon name="users" size={14} color={colors.secondary} style={styles.detailIcon} />
          <Text style={[globalStyles.text, { color: colors.secondary, fontSize: 13 }]}>
            {car.seatCapacity || 5}
          </Text>
          
          <Icon name="tachometer" size={14} color={colors.secondary} style={[styles.detailIcon, {marginLeft: 12}]} />
          <Text style={[globalStyles.text, { color: colors.secondary, fontSize: 13 }]}>
            {car.mileage} km/L
          </Text>
          
          <Icon name="cog" size={14} color={colors.secondary} style={[styles.detailIcon, {marginLeft: 12}]} />
          <Text style={[globalStyles.text, { color: colors.secondary, fontSize: 13 }]}>
            {car.transmission}
          </Text>
        </View>
        
        <View style={[globalStyles.row, { justifyContent: 'space-between', marginTop: 8 }]}>
          <Text style={[globalStyles.text, { color: colors.primary, fontWeight: '700' }]}>
            ₱{car.pricePerDay}/day
          </Text>
          <StarRating rating={rating} size={14} />
        </View>
        
        <View style={styles.locationRow}>
          <Icon name="map-marker" size={14} color={colors.secondary} style={styles.detailIcon} />
          <Text style={[globalStyles.text, { color: colors.secondary, fontSize: 13 }]} numberOfLines={1}>
            {car.pickUpLocation}
          </Text>
        </View>
        
        {car.isAutoApproved !== undefined && (
          <View style={[
            styles.approvalBadge, 
            { backgroundColor: car.isAutoApproved ? colors.success : colors.error }
          ]}>
            <Text style={styles.approvalText}>
              {car.isAutoApproved ? "Auto Approved" : "Requires Approval"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const handleError = (error) => {
    const errorMessage = typeof error === 'object' 
      ? (error.message || JSON.stringify(error)) 
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
          <Text style={{ color: '#fff' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Example recent searches (in a real app, these would be stored in AsyncStorage)
  const recentSearches = [
    "BMW X5 in Manila",
    "Automatic transmission",
    "Under ₱2000/day",
  ];

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
        <View style={[styles.headerSection, { backgroundColor: colors.primary }]}>
          <Text style={styles.welcomeText}>
            Welcome to BMW Rentals
          </Text>
          
          <TouchableOpacity 
            style={[styles.searchBar, { 
              backgroundColor: colors.background, 
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0.3 : 0.1,
                  shadowRadius: 4,
                },
                android: {
                  elevation: 4,
                },
              }),
            }]}
            onPress={() => setFilterVisible(true)}
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
                  style={[styles.recentSearchBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={() => setFilterVisible(true)}
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
            <TouchableOpacity onPress={() => navigation.navigate('AllCars')}>
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
                  {typeof error === 'object' ? JSON.stringify(error) : String(error)}
                </Text>
                <TouchableOpacity 
                  onPress={loadFeaturedCars} 
                  style={[styles.retryButton, { backgroundColor: colors.error }]}
                >
                  <Text style={{ color: '#fff' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : featuredCars.length > 0 ? (
              featuredCars.map(renderCarCard)
            ) : (
              <View style={styles.noDataContainer}>
                <Icon name="car" size={40} color={colors.secondary} style={{ marginBottom: 10 }} />
                <Text style={[globalStyles.text, { color: colors.text }]}>
                  No featured cars found
                </Text>
              </View>
            )}
          </ScrollView>
          
          {/* Special Offers Section */}
          <Text style={[globalStyles.subtitle, { color: colors.text }]}>
            Special Offers
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 16 }}
          >
            {/* Summer Discount Card */}
            <View style={[styles.offerCard, { 
              backgroundColor: colors.primary,
              ...colors.shadow
            }]}>
              <View style={styles.offerTextContainer}>
                <Text style={[globalStyles.subtitle, { color: '#fff', marginBottom: 8 }]}>Summer Discount</Text>
                <Text style={{ color: '#fff', marginBottom: 12 }}>Get 15% off on weekly rentals</Text>
                <View style={[styles.offerBadge, { shadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)' }]}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>SUMMER15</Text>
                </View>
              </View>
              <Image 
                source={require('../assets/images/summer-discount.png')} 
                style={styles.offerImage}
                resizeMode="contain"
              />
            </View>
            
            {/* Weekend Special Card */}
            <View style={[styles.offerCard, { 
              backgroundColor: colors.accent,
              ...colors.shadow
            }]}>
              <View style={styles.offerTextContainer}>
                <Text style={[globalStyles.subtitle, { color: '#fff', marginBottom: 8 }]}>Weekend Special</Text>
                <Text style={{ color: '#fff', marginBottom: 12 }}>20% off on weekend rentals</Text>
                <View style={[styles.offerBadge, { shadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)' }]}>
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>WEEKEND20</Text>
                </View>
              </View>
              <Image 
                source={require('../assets/images/weekend-special.png')} 
                style={styles.offerImage}
                resizeMode="contain"
              />
            </View>
          </ScrollView>
          
          {/* How It Works Section */}
          <Text style={[globalStyles.subtitle, { color: colors.text, marginTop: 8 }]}>
            How It Works
          </Text>
          
          <View style={styles.stepsContainer}>
            {[
              { icon: "user", title: "Create a profile", description: "Sign up and set up your account" },
              { icon: "car", title: "Choose a car", description: "Browse our collection of BMW vehicles" },
              { icon: "handshake-o", title: "Meet the seller", description: "Coordinate pickup details" },
              { icon: "check-circle", title: "Enjoy your ride", description: "Experience the ultimate driving machine" }
            ].map((step, index) => (
              <View 
                key={index} 
                style={[
                  styles.stepCard, 
                  { 
                    backgroundColor: colors.card,
                    ...colors.shadow
                  }
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                  <Icon name={step.icon} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                  <Text style={[styles.stepDescription, { color: colors.secondary }]}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
          
          {/* About Us Section */}
          <Text style={[globalStyles.subtitle, { color: colors.text, marginTop: 24 }]}>
            About BMW Rentals
          </Text>
          
          <View style={[
            globalStyles.card, 
            { 
              backgroundColor: colors.card, 
              marginBottom: 20,
              ...colors.shadow
            }
          ]}>
            <Text style={[globalStyles.text, { color: colors.text }]}>
              Welcome to our Car Rental service! We offer a wide selection of BMW vehicles to meet all your 
              transportation needs. Whether you need a quick city drive, a road trip, or a special occasion 
              car, we've got you covered.
            </Text>
            <TouchableOpacity 
              style={[
                styles.learnMoreButton, 
                { 
                  borderColor: colors.primary,
                  backgroundColor: isDarkMode ? 'rgba(51, 153, 255, 0.1)' : 'rgba(0, 102, 204, 0.05)'
                }
              ]}
            >
              <Text style={{ color: colors.primary }}>Learn More</Text>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#FFFFFF',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingContainer: {
    width: 280, 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  errorContainer: {
    width: 280, 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4
  },
  noDataContainer: {
    width: 280, 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  carImage: {
    height: 150, 
    borderRadius: 8, 
    marginBottom: 12,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  detailIcon: {
    marginRight: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  approvalBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12
  },
  approvalText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  offerCard: {
    width: 280,
    height: 150,
    borderRadius: 8,
    marginRight: 16,
    padding: 16,
    flexDirection: 'row',
  },
  offerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  offerImage: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  offerBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stepsContainer: {
    marginVertical: 16,
    flexDirection: 'column',
    gap: 12,
  },
  stepCard: {
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: '600',
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
    alignSelf: 'flex-start',
  }
});

export default HomeScreen;
