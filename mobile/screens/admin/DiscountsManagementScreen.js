import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  TextInput,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllDiscounts, deleteDiscount } from '../../redux/slices/adminDiscountSlice';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';

const DiscountsManagementScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  // Add new state variables for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [filteredDiscounts, setFilteredDiscounts] = useState([]);
  
  const { discounts, loading, error } = useSelector(state => state.adminDiscounts);

  useEffect(() => {
    loadDiscounts();
  }, []);
  
  // New effect to filter discounts when discounts, searchTerm or activeFilter changes
  useEffect(() => {
    filterDiscounts();
  }, [discounts, searchTerm, activeFilter]);

  const loadDiscounts = async () => {
    await dispatch(fetchAllDiscounts());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiscounts();
    setRefreshing(false);
  };
  
  // Function to determine if a discount is currently active
  const isDiscountActive = (discount) => {
    const currentDate = new Date();
    const startDate = new Date(discount.startDate);
    const endDate = new Date(discount.endDate);
    return currentDate >= startDate && currentDate <= endDate;
  };
  
  // Filter discounts based on search term and active filter
  const filterDiscounts = () => {
    if (!discounts) {
      setFilteredDiscounts([]);
      return;
    }
    
    let result = [...discounts];
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      result = result.filter(discount => 
        discount.code.toLowerCase().includes(searchTermLower) || 
        (discount.description && discount.description.toLowerCase().includes(searchTermLower))
      );
    }
    
    // Apply active/inactive filter
    if (activeFilter !== 'all') {
      const isActive = activeFilter === 'active';
      result = result.filter(discount => isDiscountActive(discount) === isActive);
    }
    
    setFilteredDiscounts(result);
  };
  
  // Clear search and reset filters
  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
  };

  const handleDeleteDiscount = (discountId) => {
    Alert.alert(
      "Delete Discount",
      "Are you sure you want to delete this discount?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteDiscount(discountId)).unwrap();
              Alert.alert("Success", "Discount deleted successfully");
            } catch (error) {
              Alert.alert("Error", error || "Failed to delete discount");
            }
          }
        }
      ]
    );
  };

  const renderDiscountItem = ({ item }) => {
    const startDate = item.startDate ? format(new Date(item.startDate), 'MMM dd, yyyy') : 'N/A';
    const endDate = item.endDate ? format(new Date(item.endDate), 'MMM dd, yyyy') : 'N/A';
    const isActive = isDiscountActive(item);

    return (
      <View style={[styles.discountCard, { backgroundColor: colors.card }]}>
        {/* Add an active/inactive indicator */}
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: isActive ? '#4CAF50' : '#FF5722' }
        ]}>
          <Text style={styles.statusText}>{isActive ? 'Active' : 'Inactive'}</Text>
        </View>
        
        <View style={styles.discountHeader}>
          <View style={styles.discountLogoContainer}>
            {item.discountLogo?.imageUrl ? (
              <Image 
                source={{ uri: item.discountLogo.imageUrl }} 
                style={styles.discountLogo} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.placeholderLogo, { backgroundColor: colors.border }]}>
                <Icon name="percent" size={24} color={colors.text} />
              </View>
            )}
          </View>
          <View style={styles.discountHeaderDetails}>
            <Text style={[styles.discountCode, { color: colors.text }]}>{item.code}</Text>
            <Text style={[styles.discountPercentage, { color: colors.primary }]}>
              {item.discountPercentage}% OFF
            </Text>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <View style={styles.discountDetails}>
          <Text style={[styles.detailText, { color: colors.text }]}>
            <Text style={styles.detailLabel}>Description: </Text>
            {item.description || 'No description'}
          </Text>
          <Text style={[styles.detailText, { color: colors.text }]}>
            <Text style={styles.detailLabel}>Type: </Text>
            {item.isOneTime ? 'One-time use' : 'Multiple use'}
          </Text>
          <Text style={[styles.detailText, { color: colors.text }]}>
            <Text style={styles.detailLabel}>Valid from: </Text>
            {startDate} to {endDate}
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('EditDiscount', { discountId: item._id })}
          >
            <Icon name="edit" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: '#ff4d4f' }]}
            onPress={() => handleDeleteDiscount(item._id)}
          >
            <Icon name="trash" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Render search and filter header
  const renderSearchAndFilter = () => (
    <View style={styles.searchAndFilterContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by code or description"
          placeholderTextColor={colors.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          clearButtonMode="while-editing"
        />
        {searchTerm !== '' && (
          <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
            <Icon name="times-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.filterContainer}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>Filter:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'all' && [styles.activeFilterButton, { borderColor: colors.primary }]
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[
              styles.filterButtonText, 
              { color: activeFilter === 'all' ? colors.primary : colors.text }
            ]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'active' && [styles.activeFilterButton, { borderColor: colors.primary }]
            ]}
            onPress={() => setActiveFilter('active')}
          >
            <Text style={[
              styles.filterButtonText, 
              { color: activeFilter === 'active' ? colors.primary : colors.text }
            ]}>Active</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'inactive' && [styles.activeFilterButton, { borderColor: colors.primary }]
            ]}
            onPress={() => setActiveFilter('inactive')}
          >
            <Text style={[
              styles.filterButtonText, 
              { color: activeFilter === 'inactive' ? colors.primary : colors.text }
            ]}>Inactive</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Show filter stats */}
      {(searchTerm !== '' || activeFilter !== 'all') && (
        <View style={styles.filterStatsContainer}>
          <Text style={[styles.filterStatsText, { color: colors.textSecondary }]}>
            Showing {filteredDiscounts.length} {activeFilter !== 'all' ? activeFilter : ''} discount
            {filteredDiscounts.length !== 1 ? 's' : ''}
            {searchTerm !== '' ? ` matching "${searchTerm}"` : ''}
          </Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading discounts...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('CreateDiscount')}
      >
        <Icon name="plus" size={16} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Create New Discount</Text>
      </TouchableOpacity>
      
      {/* Add search and filter UI */}
      {renderSearchAndFilter()}
      
      <FlatList
        data={filteredDiscounts}
        renderItem={renderDiscountItem}
        keyExtractor={(item) => item._id}
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
          <View style={styles.emptyContainer}>
            <Icon name="percent" size={50} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>

              {searchTerm !== '' || activeFilter !== 'all' 
                ? 'No matching discounts found' 
                : 'No discounts available'}
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              {searchTerm !== '' || activeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new discount to get started'}
            </Text>
            {(searchTerm !== '' || activeFilter !== 'all') && (
              <TouchableOpacity 
                style={[styles.clearFiltersButtonEmpty, { backgroundColor: colors.primary }]}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  discountCard: {
    borderRadius: 10,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 16,
  },
  discountLogo: {
    width: '100%',
    height: '100%',
  },
  placeholderLogo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountHeaderDetails: {
    flex: 1,
  },
  discountCode: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  discountPercentage: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  discountDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    marginBottom: 6,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 4,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffccc7',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // New styles for search and filter
  searchAndFilterContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  clearButton: {
    padding: 6,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterStatsText: {
    fontSize: 14,
  },
  clearFiltersButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearFiltersButtonEmpty: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DiscountsManagementScreen;
