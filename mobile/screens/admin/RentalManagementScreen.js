import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import {
  fetchAllRentals,
  fetchRentalStats,
  updateRentalStatus,
  clearRentalErrors,
  setCurrentPage
} from '../../redux/slices/adminRentalSlice';

const { width } = Dimensions.get('window');

// Get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'Pending': return '#FFC107';
    case 'Confirmed': return '#4CAF50';
    case 'Active': return '#2196F3';
    case 'Returned': return '#9C27B0';
    case 'Canceled': return '#F44336';
    default: return '#607D8B';
  }
};

// Get payment status color
const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'Paid': return '#4CAF50';
    case 'Pending': return '#FFC107';
    case 'Refunded': return '#2196F3';
    default: return '#607D8B';
  }
};

// Get status gradient colors
const getStatusGradient = (status) => {
  switch (status) {
    case 'Pending': return ['#FFA000', '#FFC107'];
    case 'Confirmed': return ['#2E7D32', '#4CAF50'];
    case 'Active': return ['#1565C0', '#2196F3'];
    case 'Returned': return ['#6A1B9A', '#9C27B0'];
    case 'Canceled': return ['#C62828', '#F44336'];
    default: return ['#455A64', '#607D8B'];
  }
};

// Get status description helper
const getStatusDescription = (status) => {
  switch (status) {
    case 'Pending': 
      return 'Rental request is awaiting approval or confirmation.';
    case 'Confirmed': 
      return 'Rental has been approved but car has not been picked up yet.';
    case 'Active': 
      return 'The car has been picked up and is currently in use.';
    case 'Returned': 
      return 'The car has been returned and rental is completed.';
    case 'Canceled': 
      return 'The rental has been canceled by either the renter or admin.';
    default:
      return '';
  }
};

// Enhanced Rental Detail Modal - Now with owner information and pickup details
const RentalDetailModal = ({ visible, rental, onClose, colors }) => {
  // Animation value
  const animationRef = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.timing(animationRef, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animationRef, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animationRef]);

  const translateY = animationRef.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  if (!rental) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateRentalDays = (pickUpDate, returnDate) => {
    const pickUp = new Date(pickUpDate);
    const returnD = new Date(returnDate);
    const timeDiff = Math.abs(returnD - pickUp);
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays || 1;
  };

  const rentalDays = calculateRentalDays(rental.pickUpDate, rental.returnDate);
  const totalAmount = rentalDays * (rental.car?.pricePerDay || 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.card,
              transform: [{ translateY }],
              ...styles.enhancedShadow
            }
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Rental Details</Text>
            <TouchableOpacity 
              style={styles.closeIconButton} 
              onPress={onClose}
            >
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.detailsContainer}>
            {/* Car and Renter Info */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Vehicle & Customer</Text>
              
              <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="directions-car" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Vehicle</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {`${rental.car?.brand} ${rental.car?.model} (${rental.car?.year})`}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="person" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Customer</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {`${rental.renter?.firstName} ${rental.renter?.lastName}`}
                    </Text>
                    <Text style={[styles.detailSubvalue, { color: colors.text + '80' }]}>
                      {rental.renter?.email}
                    </Text>
                  </View>
                </View>

                {/* New: Owner Information */}
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="business" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Car Owner</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {rental.car?.owner ? `${rental.car.owner.firstName} ${rental.car.owner.lastName}` : 'Not specified'}
                    </Text>
                    <Text style={[styles.detailSubvalue, { color: colors.text + '80' }]}>
                      {rental.car?.owner?.email || 'No email available'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Pickup Location */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Pickup Information</Text>
              
              <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="location-on" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Pickup Location</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {rental.car?.pickUpLocation || 'Not specified'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Rental Period */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Rental Period</Text>
              
              <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="date-range" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Pick-up Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(rental.pickUpDate)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    {/* Fixed invalid icon name */}
                    <MaterialIcons name="event" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Return Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(rental.returnDate)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="timer" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Duration</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {`${rentalDays} days`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Payment Information */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Payment Information</Text>
              
              <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="attach-money" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Price Per Day</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      ₱{rental.car?.pricePerDay}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="receipt" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Total Amount</Text>
                    <Text style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                      ₱{totalAmount}
                    </Text>
                  </View>
                </View>

                {rental.discount && rental.discount.code && (
                  <>
                    <View style={styles.detailDivider} />
                    
                    <View style={styles.detailRow}>
                      <View style={styles.iconContainer}>
                        <MaterialIcons name="local-offer" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Discount Applied</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {rental.discount.code} ({rental.discount.discountPercentage}% off)
                        </Text>
                        <Text style={[styles.detailSubvalue, { color: colors.text }]}>
                          -₱{rental.discount.discountAmount || (totalAmount * rental.discount.discountPercentage / 100).toFixed(2)} saved
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.detailDivider} />
                    
                    <View style={styles.detailRow}>
                      <View style={styles.iconContainer}>
                        <MaterialIcons name="attach-money" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Final Amount</Text>
                        <Text style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                          ₱{rental.finalAmount || (totalAmount - (rental.discount.discountAmount || (totalAmount * rental.discount.discountPercentage / 100)))}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="payment" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Payment Method</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {rental.paymentMethod}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="check-circle" size={20} color={getPaymentStatusColor(rental.paymentStatus)} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Payment Status</Text>
                    <Text style={[styles.detailValue, { color: getPaymentStatusColor(rental.paymentStatus) }]}>
                      {rental.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Status Information */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Status & Timestamps</Text>
              
              <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="info" size={20} color={getStatusColor(rental.status)} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Current Status</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(rental.status), fontWeight: '700' }]}>
                      {rental.status}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="access-time" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Created At</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(rental.createdAt)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="update" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Last Updated</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(rental.updatedAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Terms and Conditions */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Terms & Conditions</Text>
              
              <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="description" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {rental.car?.termsAndConditions || 'No terms and conditions specified for this rental.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
          
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Enhanced Status Update Modal - Fixed animation
const StatusUpdateModal = ({ visible, rental, onClose, onUpdate, colors }) => {
  const [status, setStatus] = useState('');
  const animationRef = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rental) {
      setStatus(rental.status);
    }
  }, [rental]);

  useEffect(() => {
    if (visible) {
      Animated.timing(animationRef, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animationRef, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animationRef]);

  const handleUpdate = () => {
    onUpdate(status);
  };

  if (!rental) return null;

  const translateY = animationRef.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.card,
              transform: [{ translateY }],
              maxHeight: 'auto',
              ...styles.enhancedShadow
            }
          ]}
        >
          {/* Rest of the modal content remains the same */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Update Status</Text>
            <TouchableOpacity 
              style={styles.closeIconButton} 
              onPress={onClose}
            >
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusModalBody}>
            <View style={styles.carInfoBox}>
              <MaterialIcons name="directions-car" size={24} color={colors.primary} style={styles.carIcon} />
              <View>
                <Text style={[styles.carInfoTitle, { color: colors.text }]}>
                  {rental.car ? `${rental.car.brand} ${rental.car.model}` : 'Unknown Car'}
                </Text>
                <Text style={[styles.carInfoSubtitle, { color: colors.text + '80' }]}>
                  {rental.renter ? `${rental.renter.firstName} ${rental.renter.lastName}` : 'Unknown Renter'}
                </Text>
              </View>
            </View>
            
            <View style={styles.currentStatusBox}>
              <Text style={[styles.currentStatusLabel, { color: colors.text + '80' }]}>Current Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(rental.status) }]}>
                <Text style={styles.statusBadgeText}>{rental.status}</Text>
              </View>
            </View>
            
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>Update Status To:</Text>
              <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Picker
                  selectedValue={status}
                  onValueChange={(itemValue) => setStatus(itemValue)}
                  style={{ color: colors.text }}
                  dropdownIconColor={colors.text}
                >
                  <Picker.Item label="Pending" value="Pending" />
                  <Picker.Item label="Confirmed" value="Confirmed" />
                  <Picker.Item label="Active" value="Active" />
                  <Picker.Item label="Returned" value="Returned" />
                  <Picker.Item label="Canceled" value="Canceled" />
                </Picker>
              </View>
              
              <Text style={[styles.statusDescription, { color: colors.text + '80' }]}>
                {getStatusDescription(status)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdate}
            >
              <Text style={{ color: '#FFFFFF' }}>Update Status</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const RentalManagementScreen = () => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const toast = useToast();
  
  const { rentals, statistics, loading, error, updateSuccess, pagination } = useSelector(state => state.adminRentals);
  const { currentPage, totalPages } = pagination;
  
  const [statusFilter, setStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  // New state variables for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('renter');
  const [showSearchBar, setShowSearchBar] = useState(false);
  
  // New state variables for section visibility
  const [showFilterSection, setShowFilterSection] = useState(true);
  const [showOverviewSection, setShowOverviewSection] = useState(true);
  
  // New state variable for sort direction
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' for newest first (default), 'asc' for oldest first

  // Format date helper function for displaying in list items
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // Load rentals with search, pagination, and sorting
  const loadRentals = useCallback(() => {
    dispatch(fetchAllRentals({
      status: statusFilter,
      page: currentPage,
      limit: 10,
      searchQuery: searchQuery.trim(),
      searchType: searchQuery.trim() ? searchType : '',
      sort: `createdAt:${sortDirection}` // Add sort parameter
    }));
  }, [dispatch, statusFilter, currentPage, searchQuery, searchType, sortDirection]);

  // Toggle sort direction and force reload
  const toggleSortDirection = useCallback(() => {
    // Show loading indicator
    if (!loading) {
      dispatch({ type: 'adminRentals/fetchAll/pending' });
    }
    
    const newSortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    setSortDirection(newSortDirection);
    
    // Immediately trigger a data reload with the new sort direction
    dispatch(fetchAllRentals({
      status: statusFilter,
      page: currentPage,
      limit: 10,
      searchQuery: searchQuery.trim(),
      searchType: searchQuery.trim() ? searchType : '',
      sort: `createdAt:${newSortDirection}`
    }));
  }, [dispatch, sortDirection, statusFilter, currentPage, searchQuery, searchType]);

  useFocusEffect(
    useCallback(() => {
      loadRentals();
      dispatch(fetchRentalStats());
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
      
      return () => {
        dispatch(clearRentalErrors());
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }).start();
      };
    }, [loadRentals, dispatch])
  );
  
  // Handle errors and success
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearRentalErrors());
    }
    
    if (updateSuccess) {
      toast.success('Rental status updated successfully');
      dispatch(clearRentalErrors());
      setStatusModalVisible(false);
    }
  }, [error, updateSuccess, dispatch, toast]);
  
  // Refresh list
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(setCurrentPage(1)); // Reset to first page
    dispatch(fetchAllRentals({
      status: statusFilter,
      page: 1,
      limit: 10,
      searchQuery: searchQuery.trim(),
      searchType: searchQuery.trim() ? searchType : '',
      sort: `createdAt:${sortDirection}` // Add sort parameter
    }))
      .then(() => dispatch(fetchRentalStats()))
      .finally(() => setRefreshing(false));
  }, [dispatch, statusFilter, searchQuery, searchType, sortDirection]);
  
  // Handle pagination
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      dispatch(setCurrentPage(currentPage + 1));
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      dispatch(setCurrentPage(currentPage - 1));
    }
  };
  
  // Search functions
  const handleSearch = () => {
    dispatch(setCurrentPage(1)); // Reset to first page when searching
    loadRentals();
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    dispatch(setCurrentPage(1));
    // This will trigger a re-render and loadRentals will run without the search filter
  };
  
  // Handle status update
  const handleUpdateStatus = (newStatus) => {
    if (selectedRental) {
      dispatch(updateRentalStatus({
        id: selectedRental._id,
        status: newStatus
      }));
    }
  };
  
  // View rental details
  const handleViewRental = (rental) => {
    setSelectedRental(rental);
    setDetailModalVisible(true);
  };
  
  // Edit rental status
  const handleEditStatus = (rental) => {
    setSelectedRental(rental);
    setStatusModalVisible(true);
  };
  
  // Render filter section with toggle button
  const renderFilterSection = () => (
    <View style={styles.sectionWithToggle}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>
          Filter by Status:
        </Text>
        <TouchableOpacity
          onPress={() => setShowFilterSection(!showFilterSection)}
          style={styles.toggleButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialIcons 
            name={showFilterSection ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
      
      {showFilterSection && (
        <View style={[styles.filterPickerWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Picker
            selectedValue={statusFilter}
            onValueChange={(itemValue) => {
              setStatusFilter(itemValue);
              dispatch(setCurrentPage(1)); // Reset to first page when changing filters
            }}
            style={{ color: colors.text }}
            dropdownIconColor={colors.text}
            mode="dropdown"
          >
            <Picker.Item label="All Rentals" value="All" />
            <Picker.Item label="Pending" value="Pending" />
            <Picker.Item label="Confirmed" value="Confirmed" />
            <Picker.Item label="Active" value="Active" />
            <Picker.Item label="Returned" value="Returned" />
            <Picker.Item label="Canceled" value="Canceled" />
          </Picker>
        </View>
      )}
    </View>
  );
  
  // Render statistics cards with toggle button
  const renderStatistics = () => {
    if (!statistics) return null;
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Rentals Overview
          </Text>
          <TouchableOpacity
            onPress={() => setShowOverviewSection(!showOverviewSection)}
            style={styles.toggleButton}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <MaterialIcons 
              name={showOverviewSection ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
        
        {showOverviewSection && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}
          >
            <StatCard
              title="Total"
              count={(statistics.Pending || 0) + 
                    (statistics.Confirmed || 0) + 
                    (statistics.Active || 0) + 
                    (statistics.Returned || 0) + 
                    (statistics.Canceled || 0)}
              colors={['#455A64', '#607D8B']}
              icon="pie-chart"
            />

            <StatCard
              title="Pending"
              count={statistics.Pending || 0}
              colors={['#FFA000', '#FFC107']}
              icon="clock-o"
            />
            
            <StatCard
              title="Confirmed"
              count={statistics.Confirmed || 0}
              colors={['#2E7D32', '#4CAF50']}
              icon="check-circle"
            />
            
            <StatCard
              title="Active"
              count={statistics.Active || 0} 
              colors={['#1565C0', '#2196F3']}
              icon="car"
            />
            
            <StatCard
              title="Returned"
              count={statistics.Returned || 0}
              colors={['#6A1B9A', '#9C27B0']}
              icon="check-square"
            />
            
            <StatCard
              title="Canceled"
              count={statistics.Canceled || 0}
              colors={['#C62828', '#F44336']}
              icon="ban"
            />
          </ScrollView>
        )}
      </View>
    );
  };
  
  // Stat card component
  const StatCard = ({ title, count, colors, icon }) => (
    <View style={styles.statCardContainer}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <View style={styles.statIconContainer}>
          <Icon name={icon} size={24} color="#FFF" />
        </View>
        <Text style={styles.statNumber}>{count}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </LinearGradient>
    </View>
  );
  
  // Render rental item
  const renderRentalItem = ({ item }) => {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity 
          style={[styles.rentalItem, { backgroundColor: colors.card }]}
          onPress={() => handleViewRental(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={getStatusGradient(item.status)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rentalStatusBar}
          />
          
          <View style={styles.rentalContent}>
            <View style={styles.rentalHeader}>
              <View style={styles.carInfoContainer}>
                <Text style={[styles.carName, { color: colors.text }]}>
                  {item.car ? `${item.car.brand} ${item.car.model}` : 'Unknown Car'}
                </Text>
                <Text style={[styles.rentalId, { color: colors.text + '99' }]}>
                  ID: {item._id.substring(0, 10)}...
                </Text>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            
            {/* Creation date - new addition */}
            <View style={styles.creationDateContainer}>
              <MaterialIcons name="event-note" size={16} color={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.creationDateText, { color: colors.primary }]}>
                Created: {formatDate(item.createdAt)}
              </Text>
            </View>
            
            <View style={styles.rentalInfo}>
              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={16} color={colors.text + '80'} style={styles.infoIcon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {item.renter ? `${item.renter.firstName} ${item.renter.lastName}` : 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="date-range" size={16} color={colors.text + '80'} style={styles.infoIcon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {new Date(item.pickUpDate).toLocaleDateString()} - {new Date(item.returnDate).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="payment" size={16} color={colors.text + '80'} style={styles.infoIcon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {item.paymentMethod} 
                  <Text style={{ color: getPaymentStatusColor(item.paymentStatus), fontWeight: '600' }}>
                    {' '}({item.paymentStatus})
                  </Text>
                </Text>
              </View>
            </View>
            
            <View style={styles.rentalActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleViewRental(item)}
              >
                <Icon name="eye" size={14} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                onPress={() => handleEditStatus(item)}
              >
                <Icon name="pencil" size={14} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionText}>Update Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  const renderEmptyList = () => {
    if (loading && !refreshing) return null;
    
    return (
      <View style={styles.emptyState}>
        <Image
          source={require('../../assets/images/no-data.png')} // Make sure to have this image
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No rentals found</Text>
        <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
          {statusFilter === 'All' 
            ? 'There are no rental records in the system yet.' 
            : `No ${statusFilter} rentals at the moment.`}
        </Text>
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: colors.primary }]}
          onPress={onRefresh}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render search bar
  const renderSearchBar = () => {
    if (!showSearchBar) {
      return (
        <>
        </>
      );
    }
    
    return (
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={styles.searchInputRow}>
          <View style={[styles.searchTypePickerContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Picker
              selectedValue={searchType}
              onValueChange={(itemValue) => setSearchType(itemValue)}
              style={styles.searchTypePicker}
              dropdownIconColor={colors.text}
              mode="dropdown"
            >
              <Picker.Item label="Renter" value="renter" />
              <Picker.Item label="Owner" value="owner" />
            </Picker>
          </View>
          
          <View style={styles.searchFieldContainer}>
            <View style={[styles.searchInputWrapper, { backgroundColor: colors.background }]}>
              <MaterialIcons name="search" size={20} color={colors.text + '80'} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={`Search by ${searchType}...`}
                placeholderTextColor={colors.text + '80'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                autoFocus
              />
              
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={clearSearch}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <MaterialIcons name="clear" size={18} color={colors.text + '80'} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
        
        <View style={styles.searchButtonsContainer}>
          <TouchableOpacity
            style={[styles.searchActionButton, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
          >
            <MaterialIcons name="search" size={18} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={styles.searchActionButtonText}>Search</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.searchActionButton, { backgroundColor: colors.border }]}
            onPress={() => {
              setShowSearchBar(false);
              if (searchQuery) {
                clearSearch();
              }
            }}
          >
            <MaterialIcons name="close" size={18} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={styles.searchActionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Pagination controls
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[
            styles.paginationButton,
            { backgroundColor: currentPage > 1 ? colors.primary : colors.border }
          ]}
          onPress={handlePrevPage}
          disabled={currentPage <= 1}
        >
          <MaterialIcons name="chevron-left" size={24} color="#FFF" />
          <Text style={styles.paginationButtonText}>Previous</Text>
        </TouchableOpacity>
        
        <View style={styles.paginationInfo}>
          <Text style={[styles.paginationText, { color: colors.text }]}>
            {currentPage} of {totalPages}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.paginationButton,
            { backgroundColor: currentPage < totalPages ? colors.primary : colors.border }
          ]}
          onPress={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          <Text style={styles.paginationButtonText}>Next</Text>
          <MaterialIcons name="chevron-right" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  // Visual feedback in the sort button
  const renderSortButton = () => (
    <TouchableOpacity
      style={[
        styles.sortButton, 
        { backgroundColor: colors.primary + '20' } // Add slight color to show it's active
      ]}
      onPress={toggleSortDirection}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
    >
      <MaterialIcons 
        name={sortDirection === 'desc' ? "arrow-downward" : "arrow-upward"} 
        size={20} 
        color={colors.primary} 
      />
      <Text style={[styles.sortButtonText, { color: colors.primary, fontWeight: '700' }]}>
        {sortDirection === 'desc' ? 'Newest' : 'Oldest'}
      </Text>
    </TouchableOpacity>
  );

  // In the renderListHeader function, use the new renderSortButton
  const renderListHeader = () => (
    <View style={styles.listHeaderContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {statusFilter === 'All' ? 'All Rentals' : `${statusFilter} Rentals`}
      </Text>
      
      {!showSearchBar && (
        <View style={styles.headerActionButtons}>
          {renderSortButton()}
          
          <TouchableOpacity
            style={styles.searchIconButton}
            onPress={() => setShowSearchBar(true)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <MaterialIcons name="search" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.compactViewButton}
            onPress={() => {
              setShowFilterSection(false);
              setShowOverviewSection(false);
            }}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <MaterialIcons name="fullscreen" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.primary} />
      
      {/* Header Card with Search Bar */}
      <View style={[styles.headerCard, { backgroundColor: colors.card }]}>
        {renderSearchBar()}
        
        {/* Filter Section */}
        <View style={styles.filterSection}>
          {renderFilterSection()}
        </View>
      </View>
      
      {/* Statistics Section */}
      {renderStatistics()}
      
      {/* Rentals List */}
      <View style={[
        styles.listContainer, 
        { marginTop: (!showFilterSection && !showOverviewSection) ? -16 : 0 } // Add more space when both sections are hidden
      ]}>
        {renderListHeader()}
        
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading rentals...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={rentals}
              renderItem={renderRentalItem}
              keyExtractor={(item) => item._id}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={renderEmptyList}
              contentContainerStyle={styles.listContentContainer}
              showsVerticalScrollIndicator={false}
            />
            
            {/* Pagination Controls */}
            {renderPaginationControls()}
          </>
        )}
      </View>
      
      {/* Modals */}
      <RentalDetailModal
        visible={detailModalVisible}
        rental={selectedRental}
        onClose={() => setDetailModalVisible(false)}
        colors={colors}
      />
      
      <StatusUpdateModal
        visible={statusModalVisible}
        rental={selectedRental}
        onClose={() => setStatusModalVisible(false)}
        onUpdate={handleUpdateStatus}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 4,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterLabel: {
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 8,
  },
  filterPickerWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsScrollContent: {
    paddingBottom: 8,
    paddingRight: 16,
  },
  statCardContainer: {
    marginRight: 12,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statCard: {
    width: 120,
    height: 100,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  listContainer: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  rentalItem: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  rentalStatusBar: {
    height: 8,
  },
  rentalContent: {
    padding: 16,
  },
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  carInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  carName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  rentalId: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  rentalInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
  },
  rentalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
    elevation: 1,
  },
  actionIcon: {
    marginRight: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyImage: {
    width: width * 0.5,
    height: width * 0.5,
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  enhancedShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  detailsContainer: {
    padding: 16,
  },
  detailsSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  detailCard: {
    borderRadius: 10,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailSubvalue: {
    fontSize: 14,
    marginTop: 2,
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusModalBody: {
    padding: 16,
  },
  carInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  carIcon: {
    marginRight: 12,
  },
  carInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  carInfoSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  currentStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currentStatusLabel: {
    fontSize: 14,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  statusDescription: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  searchContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  searchTypePickerContainer: {
    width: 110, 
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    marginRight: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchTypePicker: {
    width: '100%',
  },
  searchFieldContainer: {
    flex: 1,
    height: 44,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  clearSearchButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchActionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  searchActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 15,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    alignSelf: 'flex-end',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  listHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIconButton: {
    padding: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  paginationButtonText: {
    color: '#FFFFFF',
    marginHorizontal: 4,
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionWithToggle: {
    width: '100%',
  },
  
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  toggleButton: {
    padding: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  headerActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  searchIconButton: {
    padding: 8,
    marginRight: 8,
  },
  
  compactViewButton: {
    padding: 8,
  },
  // Styles for new elements
  creationDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, 
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  creationDateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default RentalManagementScreen;
