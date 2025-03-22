import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { fetchCarRentals, clearCarErrors } from '../../redux/slices/adminCarSlice';

const RentalStatusBadge = ({ status }) => {
  const { colors } = useTheme();
  const badgeColors = {
    'Pending': { bg: '#FFC107', text: '#000' },
    'Confirmed': { bg: '#2196F3', text: '#FFF' },
    'Active': { bg: '#4CAF50', text: '#FFF' },
    'Completed': { bg: '#9E9E9E', text: '#FFF' },
    'Canceled': { bg: '#F44336', text: '#FFF' },
  };

  const defaultColor = { bg: colors.notification, text: colors.text };
  const color = badgeColors[status] || defaultColor;

  return (
    <View style={[styles.statusBadge, { backgroundColor: color.bg }]}>
      <Text style={[styles.statusText, { color: color.text }]}>{status}</Text>
    </View>
  );
};

const CarRentalsScreen = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const { colors } = useTheme();
  const toast = useToast();
  
  const { carId, carName } = route.params;
  const { rentals, loading, error } = useSelector(state => state.adminCars);
  
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadCarRentals();
  }, [carId]);
  
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearCarErrors());
    }
  }, [error, dispatch, toast]);
  
  const loadCarRentals = useCallback(() => {
    dispatch(fetchCarRentals(carId));
  }, [dispatch, carId]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCarRentals().finally(() => setRefreshing(false));
  }, [loadCarRentals]);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const renderRentalItem = ({ item }) => (
    <View style={[styles.rentalItem, { backgroundColor: colors.card }]}>
      <View style={styles.rentalHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.userAvatar, { backgroundColor: colors.primary + '20' }]}>
            {item.user && (
              item.user.avatar && item.user.avatar.url ? (
                <Image source={{ uri: item.user.avatar.url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {item.user.firstName && item.user.firstName.charAt(0)}
                  {item.user.lastName && item.user.lastName.charAt(0)}
                </Text>
              )
            )}
          </View>
          <View>
            <Text style={[styles.userName, { color: colors.text }]}>
              {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Unknown User'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.text + '99' }]}>
              {item.user ? item.user.email : 'No email'}
            </Text>
          </View>
        </View>
        <RentalStatusBadge status={item.status} />
      </View>
      
      <View style={[styles.rentalDetails, { borderColor: colors.border }]}>
        <View style={styles.rentalDetail}>
          <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>Rental ID:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
            {item._id.slice(-8)}
          </Text>
        </View>
        
        <View style={styles.rentalDetailRow}>
          <View style={styles.dateDetail}>
            <Icon name="calendar-check-o" size={14} color={colors.primary} style={styles.dateIcon} />
            <View>
              <Text style={[styles.dateLabel, { color: colors.text + '99' }]}>Pick-up</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(item.startDate)}</Text>
            </View>
          </View>
          
          <View style={styles.dateDetail}>
            <Icon name="calendar-times-o" size={14} color={colors.error} style={styles.dateIcon} />
            <View>
              <Text style={[styles.dateLabel, { color: colors.text + '99' }]}>Return</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(item.endDate)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.rentalDetail}>
          <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>Duration:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {item.duration} days
          </Text>
        </View>
        
        <View style={styles.rentalDetail}>
          <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>Total Price:</Text>
          <Text style={[styles.detailValue, styles.priceValue, { color: colors.primary }]}>
            ${item.totalPrice}
          </Text>
        </View>
        
        {item.review && (
          <View style={[styles.reviewContainer, { backgroundColor: colors.background }]}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewTitle, { color: colors.text }]}>Review</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name={star <= item.review.rating ? "star" : "star-o"}
                    size={14}
                    color="#FFB800"
                    style={{ marginRight: 2 }}
                  />
                ))}
              </View>
            </View>
            <Text style={[styles.reviewText, { color: colors.text }]}>{item.review.comment}</Text>
          </View>
        )}
      </View>
    </View>
  );
  
  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="calendar-o" size={50} color={colors.text + '40'} />
      <Text style={[styles.emptyText, { color: colors.text }]}>No rentals found for this car</Text>
      <Text style={[styles.emptySubtext, { color: colors.text + '80' }]}>
        This car hasn't been rented yet
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Rental History for {carName}
        </Text>
      </View>
      
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={(item) => item._id}
          renderItem={renderRentalItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={ListEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  rentalItem: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rentalDetails: {
    padding: 16,
    borderTopWidth: 1,
  },
  rentalDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rentalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateLabel: {
    fontSize: 12,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  reviewContainer: {
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default CarRentalsScreen;
