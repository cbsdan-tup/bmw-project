import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../context/ToastContext';
import { useDispatch, useSelector } from 'react-redux';
import { updateRentalStatus } from '../redux/slices/bookingSlice';
import { Picker } from '@react-native-picker/picker';
import api from '../services/api';

const MyCarRentalDetails = ({ route }) => {
  const { rental: initialRental, car } = route.params;
  const [rental, setRental] = useState(initialRental);
  const { colors } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.bookings);
  
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState(rental?.status || 'Pending');
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

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

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '#4CAF50';
      case 'Pending': return '#FFC107';
      case 'Refunded': return '#2196F3';
      default: return '#607D8B';
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'Pending': 
        return 'Rental request is awaiting your approval.';
      case 'Confirmed': 
        return 'You have approved the rental, but the car has not been picked up yet.';
      case 'Active': 
        return 'The car has been picked up and is currently in use.';
      case 'Returned': 
        return 'The car has been returned and rental is completed.';
      case 'Canceled': 
        return 'The rental has been canceled.';
      default:
        return '';
    }
  };

  const getAvailableStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case 'Pending':
        return [
          { value: 'Pending', label: 'Pending' },
          { value: 'Confirmed', label: 'Confirm Rental' },
          { value: 'Canceled', label: 'Cancel Rental' }
        ];
      case 'Confirmed':
        return [
          { value: 'Confirmed', label: 'Confirmed' },
          { value: 'Active', label: 'Mark as Active (Picked Up)' }
        ];
      case 'Active':
        return [
          { value: 'Active', label: 'Active' },
          { value: 'Returned', label: 'Mark as Returned' }
        ];
      case 'Returned':
      case 'Canceled':
        return [
          { value: currentStatus, label: currentStatus }
        ];
      default:
        return [];
    }
  };

  const canUpdateStatus = (currentStatus, newStatus) => {
    if (currentStatus === newStatus) return false;
    if (currentStatus === 'Returned' || currentStatus === 'Canceled') return false;
    
    const validTransitions = {
      'Pending': ['Confirmed', 'Canceled'],
      'Confirmed': ['Active'],
      'Active': ['Returned']
    };
    
    return validTransitions[currentStatus]?.includes(newStatus);
  };

  const getStatusGuidance = (currentStatus) => {
    switch (currentStatus) {
      case 'Pending':
        return 'You can either confirm or cancel this rental request.';
      case 'Confirmed':
        return 'Once the renter has picked up the car, mark the status as Active.';
      case 'Active':
        return 'When the car is returned, mark the status as Returned.';
      case 'Returned':
        return 'This rental has been completed.';
      case 'Canceled':
        return 'This rental has been canceled.';
      default:
        return '';
    }
  };

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
  const totalAmount = rentalDays * (car.pricePerDay || 0);
  const discountAmount = rental.discount ? (rental.discount.discountAmount || (totalAmount * rental.discount.discountPercentage / 100)) : 0;
  const finalAmount = rental.finalAmount || (totalAmount - discountAmount);

  const handleUpdateStatus = () => {
    dispatch(updateRentalStatus({
      rentalId: rental._id, 
      status: newStatus
    })).then((resultAction) => {
      if (updateRentalStatus.fulfilled.match(resultAction)) {
        toast.success(`Rental status updated to ${newStatus}`);
        setRental({...rental, status: newStatus});
        setUpdateModalVisible(false);
      }
    });
  };

  const navigateToChat = async () => {
    if (!rental || !rental.renter || !rental.renter._id) {
      toast.error('Cannot find renter information');
      return;
    }

    try {
      await api.put(`/messages/read/${rental.renter._id}/${car._id}`);
      navigation.navigate("ChatScreen", {
        recipientId: rental.renter._id,
        recipientName: `${rental.renter.firstName || ""} ${rental.renter.lastName || ""}`.trim(),
        carId: car._id,
        carDetails: `${car.brand || ""} ${car.model || ""} ${car.year ? `(${car.year})` : ""}`,
        isOwner: true,
      });
    } catch (error) {
      console.error("Error navigating to chat:", error);
      toast.error('Failed to open chat: ' + (error.message || 'Unknown error'));
    }
  };


  const emailRenter = () => {
    if (rental.renter?.email) {
      Linking.openURL(`mailto:${rental.renter.email}`);
    } else {
      toast.info('Renter email not available');
    }
  };

  const StatusUpdateModal = () => {
    const availableOptions = getAvailableStatusOptions(rental.status);
    const isUpdateDisabled = !canUpdateStatus(rental.status, newStatus);
    
    return (
      <Modal
        visible={updateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Update Rental Status</Text>
              <TouchableOpacity 
                onPress={() => setUpdateModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.currentStatusContainer}>
                <Text style={[styles.currentStatusLabel, { color: colors.textSecondary || colors.text + '80' }]}>
                  Current Status:
                </Text>
                <View style={[styles.statusBadgeModal, { backgroundColor: getStatusColor(rental.status) }]}>
                  <Text style={styles.statusBadgeText}>{rental.status}</Text>
                </View>
              </View>

              <View style={[styles.statusFlowGuide, { backgroundColor: colors.info + '15' }]}>
                <MaterialIcons name="info-outline" size={20} color={colors.info || colors.primary} style={styles.infoIcon} />
                <Text style={[styles.statusFlowText, { color: colors.text }]}>
                  {getStatusGuidance(rental.status)}
                </Text>
              </View>

              <Text style={[styles.updateStatusLabel, { color: colors.text }]}>
                Update Status To:
              </Text>
              
              <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Picker
                  selectedValue={newStatus}
                  onValueChange={(itemValue) => setNewStatus(itemValue)}
                  style={{ color: colors.text }}
                  dropdownIconColor={colors.text}
                  enabled={rental.status !== 'Returned' && rental.status !== 'Canceled'}
                >
                  {availableOptions.map(option => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>

              <Text style={[styles.statusDescription, { color: colors.textSecondary || colors.text + '80' }]}>
                {getStatusDescription(newStatus)}
              </Text>
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setUpdateModalVisible(false)}
                disabled={loading}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { 
                    backgroundColor: isUpdateDisabled ? colors.border : colors.primary,
                    opacity: isUpdateDisabled ? 0.6 : 1
                  }
                ]}
                onPress={handleUpdateStatus}
                disabled={loading || isUpdateDisabled}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF' }}>
                    {isUpdateDisabled ? (rental.status === newStatus ? 'No Change' : 'Not Allowed') : 'Update Status'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getUpdateButtonText = (status) => {
    switch (status) {
      case 'Pending': return 'Confirm or Cancel Rental';
      case 'Confirmed': return 'Mark as Active';
      case 'Active': return 'Mark as Returned';
      case 'Returned': return 'Rental Completed';
      case 'Canceled': return 'Rental Canceled';
      default: return 'Update Rental Status';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.carImageContainer}>
          <Image 
            source={{ uri: car.images && car.images.length > 0 ? car.images[0] : 'https://via.placeholder.com/400' }} 
            style={styles.carImage} 
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent']}
            style={styles.imageGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(rental.status) }
          ]}>
            <Text style={styles.statusText}>{rental.status}</Text>
          </View>
        </View>
        
        <View style={[styles.quickActions, { backgroundColor: colors.cardBackground }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }]} 
            onPress={navigateToChat}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.secondary }]} 
            onPress={emailRenter}
          >
            <MaterialIcons name="email" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Email</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.updateStatusButton, { 
            backgroundColor: colors.primary + '15',
            borderColor: colors.primary,
            opacity: rental.status === 'Returned' || rental.status === 'Canceled' ? 0.6 : 1
          }]}
          onPress={() => {
            setNewStatus(rental.status);
            setUpdateModalVisible(true);
          }}
          disabled={loading || rental.status === 'Returned' || rental.status === 'Canceled'}
        >
          <MaterialIcons 
            name={rental.status === 'Returned' || rental.status === 'Canceled' ? 
              "check-circle" : "update"} 
            size={20} 
            color={colors.primary} 
          />
          <Text style={[styles.updateStatusText, { color: colors.primary }]}>
            {getUpdateButtonText(rental.status)}
          </Text>
        </TouchableOpacity>

        <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Vehicle & Renter</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="directions-car" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Vehicle</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {`${car.brand} ${car.model} (${car.year})`}
              </Text>
            </View>
          </View>
          
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Renter</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {rental.renter ? `${rental.renter.firstName} ${rental.renter.lastName}` : 'Unknown Renter'}
              </Text>
              <Text style={[styles.detailSubvalue, { color: colors.text + '80' }]}>
                {rental.renter?.email}
              </Text>
              {rental.renter?.phone && (
                <Text style={[styles.detailSubvalue, { color: colors.text + '80' }]}>
                  Phone: {rental.renter.phone}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Pickup Information</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Pickup Location</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {car.pickUpLocation || 'Not specified'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Rental Period</Text>
          
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
          
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Return Date</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(rental.returnDate)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          
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
        
        <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Payment Information</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="attach-money" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Price Per Day</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                ₱{car.pricePerDay}
              </Text>
            </View>
          </View>
          
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          
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
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
              
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
                    -₱{discountAmount.toFixed(2)} saved
                  </Text>
                </View>
              </View>
              
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.detailRow}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="attach-money" size={20} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Final Amount</Text>
                  <Text style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                    ₱{finalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </>
          )}
          
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="payment" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Payment Method</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {rental.paymentMethod || 'Not specified'}
              </Text>
            </View>
          </View>
          
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="check-circle" size={20} color={getPaymentStatusColor(rental.paymentStatus)} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Payment Status</Text>
              <Text style={[styles.detailValue, { color: getPaymentStatusColor(rental.paymentStatus) }]}>
                {rental.paymentStatus || 'Unknown'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Timestamps</Text>
          
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
          
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          
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

        <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.secondary, marginBottom: 30 }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Terms & Conditions</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="description" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {car.termsAndConditions || 'No terms and conditions specified for this rental.'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusUpdateModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
  },
  carImageContainer: {
    position: 'relative',
    height: 220,
    width: '100%',
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: 16,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
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
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  detailsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginHorizontal: 16,
  },
  updateStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  updateStatusText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '85%',
    maxWidth: 420,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currentStatusLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  statusBadgeModal: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  updateStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  statusDescription: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderRadius: 8,
  },
  statusFlowGuide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  statusFlowText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default MyCarRentalDetails;