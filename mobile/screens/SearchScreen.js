import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { CAR_IMAGES } from '../config/constants';
import { globalStyles } from '../styles/globalStyles';
import { fetchFilteredCars, setFilterParams } from '../redux/slices/carSlice';
import FilterModal from '../components/FilterModal';
import StarRating from '../components/StarRating';

const SearchScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { filteredCars, loading, error, filterParams } = useSelector(state => state.cars);

  useEffect(() => {
    loadCars();
  }, []);
  
  const loadCars = () => {
    dispatch(fetchFilteredCars({}));
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadCars();
    setRefreshing(false);
  };
  
  const handleSearch = () => {
    const params = { ...filterParams, brand: searchQuery };
    dispatch(setFilterParams(params));
    dispatch(fetchFilteredCars(params));
  };
  
  const handleFilterApply = (newFilters) => {
    dispatch(fetchFilteredCars(newFilters));
    setFilterVisible(false);
  };
  
  const handleFilterReset = () => {
    setSearchQuery('');
    loadCars();
    setFilterVisible(false);
  };

  const renderCarItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.carCard, 
          { 
            backgroundColor: colors.card,
            ...colors.shadow
          }
        ]}
        onPress={() => navigation.navigate('CarDetails', { carId: item._id })}
        activeOpacity={0.7}
      >
        <Image
          source={item.images && item.images.length > 0 
            ? { uri: item.images[0] } 
            : CAR_IMAGES.placeholder
          }
          style={styles.carImage}
          resizeMode="cover"
        />
        
        <View style={styles.carInfo}>
          <Text style={[styles.carTitle, { color: colors.text }]}>
            {item.brand} {item.model}
          </Text>
          
          <View style={styles.badgeRow}>
            {item.isAutoApproved !== undefined && (
              <View style={[
                styles.approvalBadge, 
                { backgroundColor: item.isAutoApproved ? colors.success : colors.error }
              ]}>
                <Text style={styles.approvalText}>
                  {item.isAutoApproved ? "Auto Approved" : "Requires Approval"}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.detailsRow}>
            <Icon name="map-marker" size={14} color={colors.secondary} style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: colors.secondary }]} numberOfLines={1}>
              {item.pickUpLocation}
            </Text>
          </View>
          
          <View style={styles.detailsRow}>
            <Icon name="car" size={14} color={colors.secondary} style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: colors.secondary }]}>
              {item.transmission} • {item.fuel} • {item.year}
            </Text>
          </View>
          
          <View style={styles.bottomRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              ₱{item.pricePerDay}/day
            </Text>
            <StarRating rating={item.averageRating || 0} size={12} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const ListEmptyComponent = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>Loading cars...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="exclamation-circle" size={50} color={colors.error} />
          <Text style={[styles.emptyText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadCars}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Icon name="car" size={50} color={colors.secondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No cars found matching your criteria
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <View style={styles.searchContainer}>
          <View style={[
            styles.searchBar, 
            { 
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder
            }
          ]}>
            <Icon name="search" size={18} color={colors.secondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.inputText }]}
              placeholder="Search cars, brands..."
              placeholderTextColor={colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="times-circle" size={18} color={colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: colors.primary }]}
            onPress={() => setFilterVisible(true)}
          >
            <Icon name="filter" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={filteredCars}
        keyExtractor={(item) => item._id}
        renderItem={renderCarItem}
        contentContainerStyle={styles.carsList}
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carsList: {
    padding: 16,
  },
  carCard: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  carImage: {
    width: 120,
    height: 120,
  },
  carInfo: {
    flex: 1,
    padding: 12,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  approvalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  approvalText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  price: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});

export default SearchScreen;
