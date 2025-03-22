import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  Image,
  ScrollView,
  Dimensions
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { 
  fetchAllCars, 
  toggleCarStatus,
  deleteCar,
  clearError
} from '../../redux/slices/adminCarSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Image Gallery Component
const ImageGallery = ({ images, onImagePress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { colors } = useTheme();

  const handleScroll = (event) => {
    const slideWidth = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.round(offset / slideWidth);
    setActiveIndex(activeIndex);
  };

  if (!images || images.length === 0) {
    return (
      <View style={[styles.galleryPlaceholder, { backgroundColor: colors.primary + '20' }]}>
        <Icon name="car" size={40} color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>No images available</Text>
      </View>
    );
  }

  return (
    <View style={styles.galleryContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.gallery}
      >
        {images.map((image, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.galleryImageContainer} 
            onPress={() => onImagePress(index)}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: image }} 
              style={styles.galleryImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Pagination Dots */}
      {images.length > 1 && (
        <View style={styles.paginationContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                { 
                  backgroundColor: index === activeIndex ? colors.primary : colors.border,
                  width: index === activeIndex ? 16 : 8
                }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Full Screen Image Viewer Modal
const FullScreenImageViewer = ({ visible, images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const { colors } = useTheme();

  const handleScroll = (event) => {
    const slideWidth = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.round(offset / slideWidth);
    setCurrentIndex(activeIndex);
  };

  if (!visible || !images || images.length === 0) return null;

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.fullScreenContainer, { backgroundColor: 'black' }]}>
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeFullScreenButton}
          onPress={onClose}
        >
          <Icon name="times" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Images */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.fullScreenGallery}
          contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
        >
          {images.map((image, index) => (
            <View key={index} style={styles.fullScreenImageContainer}>
              <Image 
                source={{ uri: image }} 
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
        
        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <TouchableOpacity 
            style={[styles.navArrow, styles.leftArrow]}
            onPress={goToPrevious}
          >
            <Icon name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        {currentIndex < images.length - 1 && (
          <TouchableOpacity 
            style={[styles.navArrow, styles.rightArrow]}
            onPress={goToNext}
          >
            <Icon name="chevron-right" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        {/* Counter */}
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const CarItem = ({ car, onPress }) => {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[styles.carItem, { backgroundColor: colors.card }]}
      onPress={() => onPress(car)}
    >
      <View style={styles.thumbnailContainer}>
        {car.images && car.images.length > 0 ? (
          <Image 
            source={{ uri: car.images[0] }} 
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.primary + '20' }]}>
            <Icon name="car" size={24} color={colors.primary} />
          </View>
        )}
        <View style={[
          styles.statusBadge, 
          { backgroundColor: car.isActive ? colors.success : colors.error + '90' }
        ]}>
          <Text style={styles.statusText}>{car.isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
        </View>
        
        {/* Image count indicator */}
        {car.images && car.images.length > 1 && (
          <View style={styles.imageCountBadge}>
            <Icon name="times" size={10} color="#fff" style={{ marginRight: 3 }} />
            <Text style={styles.imageCountText}>{car.images.length}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.carInfo}>
        <Text style={[styles.carTitle, { color: colors.text }]} numberOfLines={1}>
          {car.brand} {car.model}
        </Text>
        
        <Text style={[styles.carYear, { color: colors.text + '99' }]}>Year: {car.year}</Text>
        
        {car.owner && (
          <Text style={[styles.ownerInfo, { color: colors.text + 'CC' }]} numberOfLines={1}>
            <Icon name="user" size={12} color={colors.text + 'CC'} /> {' '}
            {car.owner.firstName} {car.owner.lastName}
          </Text>
        )}
        
        <Text style={[styles.carDetails, { color: colors.text + '99' }]} numberOfLines={1}>
          {car.vehicleType} • {car.fuel} • {car.transmission}
        </Text>
        
        <View style={styles.carPriceContainer}>
          <Text style={[styles.carPrice, { color: colors.primary }]}>
            ${car.pricePerDay}/day
          </Text>
        </View>
      </View>
      
      <Icon name="angle-right" size={20} color={colors.text + '80'} />
    </TouchableOpacity>
  );
};

const CarDetailsModal = ({ visible, car, onClose, onToggleStatus, onDelete, onEdit, onViewRentals, colors }) => {
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);

  if (!car) return null;
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Car',
      'Are you sure you want to delete this car? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(car._id) }
      ]
    );
  };
  
  const handleToggleStatus = () => {
    Alert.alert(
      car.isActive ? 'Deactivate Car' : 'Activate Car',
      `Are you sure you want to ${car.isActive ? 'deactivate' : 'activate'} this car?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => onToggleStatus(car._id, !car.isActive) }
      ]
    );
  };

  const handleImagePress = (index) => {
    setInitialImageIndex(index);
    setFullScreenVisible(true);
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Car Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="times" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScroll}>
            {/* Image Gallery */}
            <ImageGallery 
              images={car.images} 
              onImagePress={handleImagePress}
            />
            
            <View style={styles.carDetailSection}>
              <Text style={[styles.carDetailTitle, { color: colors.text }]}>
                {car.brand} {car.model}
              </Text>
              
              {/* Owner Information */}
              {car.owner && (
                <View style={[styles.ownerInfoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Icon name="user" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <View>
                    <Text style={[styles.ownerName, { color: colors.text }]}>
                      {car.owner.firstName} {car.owner.lastName}
                    </Text>
                    <Text style={[styles.ownerEmail, { color: colors.text + '99' }]}>
                      {car.owner.email}
                    </Text>
                  </View>
                </View>
              )}
              
              <View style={styles.carDetailBadges}>
                <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{car.year}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{car.vehicleType}</Text>
                </View>
                <View style={[
                  styles.badge, 
                  { backgroundColor: car.isActive ? colors.success + '20' : colors.error + '20' }
                ]}>
                  <Text style={[
                    styles.badgeText, 
                    { color: car.isActive ? colors.success : colors.error }
                  ]}>
                    {car.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.carSpecsContainer}>
              <View style={styles.carSpecItem}>
                <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Price</Text>
                <Text style={[styles.carSpecValue, { color: colors.text }]}>${car.pricePerDay}/day</Text>
              </View>
              
              <View style={styles.carSpecItem}>
                <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Transmission</Text>
                <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.transmission}</Text>
              </View>
              
              <View style={styles.carSpecItem}>
                <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Fuel</Text>
                <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.fuel}</Text>
              </View>
              
              <View style={styles.carSpecItem}>
                <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Seats</Text>
                <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.seatCapacity}</Text>
              </View>
              
              <View style={styles.carSpecItem}>
                <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Mileage</Text>
                <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.mileage} km</Text>
              </View>
              
              <View style={styles.carSpecItem}>
                <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Displacement</Text>
                <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.displacement} cc</Text>
              </View>
              
              <View style={styles.carSpecItem}>
                <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Pick-up Location</Text>
                <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.pickUpLocation}</Text>
              </View>
              
              {car.description && (
                <View style={[styles.carSpecItem, styles.fullWidth]}>
                  <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Description</Text>
                  <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.description}</Text>
                </View>
              )}
              
              {car.termsAndConditions && (
                <View style={[styles.carSpecItem, styles.fullWidth]}>
                  <Text style={[styles.carSpecLabel, { color: colors.text + '80' }]}>Terms & Conditions</Text>
                  <Text style={[styles.carSpecValue, { color: colors.text }]}>{car.termsAndConditions}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.carActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={() => onEdit(car._id)}
              >
                <Icon name="pencil" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Edit Car</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.notification }]}
                onPress={() => onViewRentals(car._id, `${car.brand} ${car.model}`)}
              >
                <Icon name="calendar" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>View Rentals</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleToggleStatus}
              >
                <Icon 
                  name={car.isActive ? "ban" : "check-circle"} 
                  size={16} 
                  color="#fff" 
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.actionButtonText}>
                  {car.isActive ? 'Deactivate Car' : 'Activate Car'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={handleDelete}
              >
                <Icon name="trash" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Delete Car</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
      
      {/* Full Screen Image Viewer */}
      <FullScreenImageViewer
        visible={fullScreenVisible}
        images={car.images}
        initialIndex={initialImageIndex}
        onClose={() => setFullScreenVisible(false)}
      />
    </Modal>
  );
};

const CarsManagementScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const toast = useToast();
  const { cars, loading, error, pagination } = useSelector(state => state.adminCars);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCar, setSelectedCar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  useEffect(() => {
    loadCars();
  }, [page]);
  
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error]);
  
  const loadCars = useCallback(() => {
    dispatch(fetchAllCars({ page, search: searchQuery }));
  }, [dispatch, page, searchQuery]);
  
  const handleSearch = () => {
    setPage(1);
    loadCars();
  };
  
  const handleNextPage = () => {
    if (page < pagination.totalPages) {
      setPage(page + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const handleCarSelect = (car) => {
    setSelectedCar(car);
    setModalVisible(true);
  };
  
  const handleToggleStatus = useCallback((carId, isActive) => {
    dispatch(toggleCarStatus({ carId, isActive }))
      .unwrap()
      .then(() => {
        toast.success(`Car ${isActive ? 'activated' : 'deactivated'} successfully`);
        setModalVisible(false);
        loadCars();
      })
      .catch((err) => {
        toast.error(`Failed to update car status: ${err.message || 'Unknown error'}`);
      });
  }, [dispatch, toast, loadCars]);
  
  const handleDeleteCar = useCallback((carId) => {
    dispatch(deleteCar(carId))
      .unwrap()
      .then(() => {
        toast.success('Car deleted successfully');
        setModalVisible(false);
        loadCars();
      })
      .catch((err) => {
        toast.error(`Failed to delete car: ${err.message || 'Unknown error'}`);
      });
  }, [dispatch, toast, loadCars]);
  
  const handleEditCar = useCallback((carId) => {
    setModalVisible(false);
    navigation.navigate('EditCar', { carId });
  }, [navigation]);
  
  const handleViewRentals = useCallback((carId, carName) => {
    setModalVisible(false);
    navigation.navigate('CarRentals', { carId, carName });
  }, [navigation]);
  
  const renderCarItem = useCallback(({ item }) => (
    <CarItem car={item} onPress={handleCarSelect} />
  ), []);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border
            }]}
            placeholder="Search cars..."
            placeholderTextColor={colors.text + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity 
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
          >
            <Icon name="search" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.success }]}
          onPress={() => navigation.navigate('CreateCar')}
        >
          <Icon name="plus" size={16} color="#fff" style={styles.addButtonIcon} />
          <Text style={styles.addButtonText}>Add Car</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={cars}
            renderItem={renderCarItem}
            keyExtractor={item => item._id}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No cars found
              </Text>
            }
            style={styles.carList}
          />
          
          {pagination.totalPages > 0 && (
            <View style={styles.pagination}>
              <TouchableOpacity 
                style={[styles.pageButton, { 
                  backgroundColor: colors.card,
                  opacity: page === 1 ? 0.5 : 1
                }]}
                disabled={page === 1}
                onPress={handlePrevPage}
              >
                <Icon name="chevron-left" size={16} color={colors.text} />
              </TouchableOpacity>
              
              <Text style={[styles.pageText, { color: colors.text }]}>
                {page} / {pagination.totalPages}
              </Text>
              
              <TouchableOpacity 
                style={[styles.pageButton, { 
                  backgroundColor: colors.card,
                  opacity: page === pagination.totalPages ? 0.5 : 1
                }]}
                disabled={page === pagination.totalPages}
                onPress={handleNextPage}
              >
                <Icon name="chevron-right" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      <CarDetailsModal 
        visible={modalVisible}
        car={selectedCar}
        onClose={() => setModalVisible(false)}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteCar}
        onEdit={handleEditCar}
        onViewRentals={handleViewRentals}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    fontSize: 15,
  },
  searchButton: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carList: {
    flex: 1,
  },
  carItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  carInfo: {
    flex: 1,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  carYear: {
    fontSize: 14,
    marginTop: 2,
  },
  carDetails: {
    fontSize: 13,
    marginTop: 4,
  },
  carPriceContainer: {
    marginTop: 6,
  },
  carPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    opacity: 0.7,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 8,
  },
  pageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  pageText: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  carDetailSection: {
    padding: 16,
  },
  carDetailTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  carDetailBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  carSpecsContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  carSpecItem: {
    width: '50%',
    marginBottom: 16,
    paddingRight: 8,
  },
  fullWidth: {
    width: '100%',
  },
  carSpecLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  carSpecValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  carActions: {
    padding: 16,
  },
  actionButton: {
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  ownerInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  
  ownerInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  
  ownerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  ownerEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  
  imageCountBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  imageCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Gallery styles
  galleryContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  
  gallery: {
    width: '100%',
    height: 200,
  },
  
  galleryImageContainer: {
    width: SCREEN_WIDTH * 0.9, // 90% of screen width (accounts for modalContent width)
    height: 200,
  },
  
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  
  galleryPlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  paginationContainer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  
  // Full screen image viewer styles
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeFullScreenButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fullScreenGallery: {
    width: SCREEN_WIDTH,
  },
  
  fullScreenImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  
  navArrow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  leftArrow: {
    left: 20,
  },
  
  rightArrow: {
    right: 20,
  },
  
  imageCounter: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  
  imageCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CarsManagementScreen;
