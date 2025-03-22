import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image,
  Modal,
  Platform,
  TextInput,
  RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../../context/ThemeContext';
import { fetchAllReviews, deleteReview, setSortOption } from '../../redux/slices/adminReviewSlice';
import StarRating from '../../components/StarRating';
import { useToast } from '../../context/ToastContext';

const ReviewsManagementScreen = () => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const toast = useToast();
  
  const { reviews, loading, error, pagination, sort } = useSelector(state => state.adminReviews);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('all'); 
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [searching, setSearching] = useState(false); // Add a searching state

  useEffect(() => {
    loadReviews();
  }, [page, sort]);

  const loadReviews = async () => {
    dispatch(fetchAllReviews({
      page,
      limit: 10,
      search: searchQuery,
      searchMode,
      sort
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    dispatch(fetchAllReviews({
      page: 1,
      limit: 10,
      search: searchQuery,
      searchMode,
      sort
    })).then(() => {
      setRefreshing(false);
    });
  };

  const handleSearch = () => {
    setPage(1);
    setSearching(true); // Add a searching state
    
    dispatch(fetchAllReviews({
      page: 1,
      limit: 10,
      search: searchQuery,
      searchMode,
      sort
    }))
    .unwrap()
    .then((result) => {
      setSearchModalVisible(false);
      setSearching(false);
      
      // Provide feedback about search results
      const count = result.reviews?.length || 0;
      toast.info(`Found ${count} ${count === 1 ? 'review' : 'reviews'} matching "${searchQuery}"`);
    })
    .catch(error => {
      setSearching(false);
      toast.error('Search failed: ' + error);
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchMode('all');
    setPage(1);
    dispatch(fetchAllReviews({
      page: 1,
      limit: 10,
      search: '',
      searchMode: 'all',
      sort
    }));
  };

  const handleSortChange = (newSort) => {
    dispatch(setSortOption(newSort));
    setPage(1);
    setSortModalVisible(false);
    dispatch(fetchAllReviews({
      page: 1,
      limit: 10,
      search: searchQuery,
      searchMode,
      sort: newSort
    }));
  };

  const handleViewImages = (review) => {
    setSelectedReview(review);
    if (review.images && review.images.length > 0) {
      setSelectedImage(review.images[0].url);
      setImageModalVisible(true);
    } else {
      toast.info('No images available for this review');
    }
  };

  const confirmDelete = (reviewId) => {
    setReviewToDelete(reviewId);
    setConfirmModalVisible(true);
  };

  const handleDeleteReview = () => {
    dispatch(deleteReview(reviewToDelete))
      .unwrap()
      .then(() => {
        toast.success('Review deleted successfully');
        setConfirmModalVisible(false);
        setReviewToDelete(null);
      })
      .catch((error) => {
        toast.error(`Failed to delete review: ${error}`);
        setConfirmModalVisible(false);
        setReviewToDelete(null);
      });
  };

  // Generate initials from user's first and last name
  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Avatar component that shows either image or initials
  const UserAvatar = ({ user, size = 40 }) => {
    if (!user) return null;
    
    const { firstName, lastName, avatar } = user;
    const hasAvatar = avatar && avatar.url;
    const initials = getInitials(firstName, lastName);
    
    if (hasAvatar) {
      return (
        <Image 
          source={{ uri: avatar.url }}
          style={[
            styles.avatar, 
            { 
              width: size, 
              height: size, 
              borderRadius: size/2 
            }
          ]}
          defaultSource={require('../../assets/images/default-profile.jpg')}
        />
      );
    }
    
    return (
      <View 
        style={[
          styles.initialsAvatar, 
          { 
            width: size, 
            height: size, 
            borderRadius: size/2,
            backgroundColor: colors.primary 
          }
        ]}
      >
        <Text style={styles.initialsText}>{initials}</Text>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => {
    return (
      <View style={[styles.reviewCard, { backgroundColor: colors.card }]}>
        <View style={styles.reviewHeader}>
          <View style={styles.userContainer}>
            <UserAvatar user={item.renter} size={40} />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {item.renter && `${item.renter.firstName} ${item.renter.lastName}`}
              </Text>
              <Text style={{ color: colors.secondary, fontSize: 12 }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <StarRating rating={item.rating} size={16} />
        </View>
        
        <Text style={[styles.carDetails, { color: colors.primary }]}>
          {item.rental && item.rental.car && `${item.rental.car.brand} ${item.rental.car.model}`}
        </Text>
        
        <Text style={[styles.reviewText, { color: colors.text }]}>
          {item.comment}
        </Text>
        
        <View style={styles.actionButtons}>
          {item.images && item.images.length > 0 && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.accent }]} 
              onPress={() => handleViewImages(item)}
            >
              <Icon name="image" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>View Images</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.error }]} 
            onPress={() => confirmDelete(item._id)}
          >
            <Icon name="trash" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  };

  const getSortOptionLabel = () => {
    switch(sort) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'rating_high': return 'Highest Rating';
      case 'rating_low': return 'Lowest Rating';
      default: return 'Newest First';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search and Sort Bar */}
      <View style={styles.toolbarContainer}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, flex: 1, marginRight: 8 }]}>
          <TouchableOpacity 
            style={styles.searchInputContainer}
            onPress={() => setSearchModalVisible(true)}
          >
            <Icon name="search" size={18} color={colors.secondary} style={styles.searchIcon} />
            <Text 
              style={[
                styles.searchInputPlaceholder, 
                { 
                  color: searchQuery ? colors.text : colors.secondary 
                }
              ]}
              numberOfLines={1}
            >
              {searchQuery || "Search..."}
            </Text>
            {searchQuery ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <Icon name="times-circle" size={18} color={colors.secondary} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.sortButton, { backgroundColor: colors.card }]}
          onPress={() => setSortModalVisible(true)}
        >
          <Icon name="sort" size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>
      
      {/* Active filters and sort display */}
      <View style={styles.filtersContainer}>
        {searchQuery && searchMode !== 'all' && (
          <View style={[styles.filterBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={{ color: colors.primary, fontSize: 14 }}>
              Search: {searchMode === 'user' ? 'User' : searchMode === 'car' ? 'Car' : 'Comment'}
            </Text>
            <TouchableOpacity onPress={clearSearch} style={{marginLeft: 4}}>
              <Icon name="times" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={[styles.filterBadge, { backgroundColor: colors.accent + '20' }]}>
          <Text style={{ color: colors.accent, fontSize: 14 }}>
            Sort: {getSortOptionLabel()}
          </Text>
          <TouchableOpacity onPress={() => setSortModalVisible(true)} style={{marginLeft: 4}}>
            <Icon name="exchange" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Reviews List */}
      {loading && reviews.length === 0 ? (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centeredContent}>
          <Text style={{ color: colors.error }}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]} 
            onPress={loadReviews}
          >
            <Text style={{ color: '#fff' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centeredContent}>
          <Icon name="star-o" size={48} color={colors.secondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No reviews found</Text>
          {searchQuery && (
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: 16 }]} 
              onPress={clearSearch}
            >
              <Text style={{ color: '#fff' }}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={renderFooter}
          onEndReached={() => {
            if (!loading && page < pagination.totalPages) {
              setPage(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
      
      {/* Advanced Search Modal */}
      <Modal
        visible={searchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.searchModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.searchModalTitle, { color: colors.text }]}>Search Reviews</Text>
            
            <TextInput
              style={[styles.searchModalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter search term..."
              placeholderTextColor={colors.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            
            <Text style={[styles.searchModalSubtitle, { color: colors.text }]}>Search in:</Text>
            
            <View style={styles.searchOptions}>
              {[
                { id: 'all', label: 'All Fields', icon: 'search' },
                { id: 'user', label: 'User Names', icon: 'user' },
                { id: 'car', label: 'Car Details', icon: 'car' },
                { id: 'comment', label: 'Comments', icon: 'comment' }
              ].map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.searchOption,
                    searchMode === option.id && { 
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => setSearchMode(option.id)}
                >
                  <Icon 
                    name={option.icon} 
                    size={16} 
                    color={searchMode === option.id ? colors.primary : colors.secondary} 
                  />
                  <Text 
                    style={[
                      styles.searchOptionText,
                      { color: searchMode === option.id ? colors.primary : colors.text }
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.searchModalButtons}>
              <TouchableOpacity
                style={[styles.searchModalButton, { backgroundColor: colors.secondary }]}
                onPress={() => setSearchModalVisible(false)}
              >
                <Text style={styles.searchModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.searchModalButton, { backgroundColor: colors.primary }]}
                onPress={handleSearch}
              >
                <Text style={styles.searchModalButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sortModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.searchModalTitle, { color: colors.text }]}>Sort Reviews</Text>
            
            <FlatList
              data={[
                { id: 'newest', label: 'Newest First', icon: 'calendar' },
                { id: 'oldest', label: 'Oldest First', icon: 'calendar-o' },
                { id: 'rating_high', label: 'Highest Rating', icon: 'star' },
                { id: 'rating_low', label: 'Lowest Rating', icon: 'star-o' }
              ]}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    sort === item.id && { 
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => handleSortChange(item.id)}
                >
                  <Icon 
                    name={item.icon} 
                    size={16} 
                    color={sort === item.id ? colors.primary : colors.secondary} 
                  />
                  <Text 
                    style={[
                      styles.sortOptionText,
                      { color: sort === item.id ? colors.primary : colors.text }
                    ]}
                  >
                    {item.label}
                  </Text>
                  {sort === item.id && (
                    <Icon name="check" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 5 }}
              onPress={() => setSortModalVisible(false)}
            >
              <Text style={styles.searchModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setImageModalVisible(false)}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
          
          {selectedReview?.images && selectedReview.images.length > 1 && (
            <View style={styles.imageSelectorContainer}>
              <FlatList
                data={selectedReview.images}
                horizontal
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedImage(item.url)}
                    style={[
                      styles.thumbnailContainer,
                      selectedImage === item.url && styles.selectedThumbnail
                    ]}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.thumbnailImage}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </Modal>
      
      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.confirmationModalContainer}>
          <View style={[styles.confirmationModalContent, { backgroundColor: colors.card }]}>
            <Icon name="exclamation-triangle" size={40} color={colors.error} style={styles.confirmIcon} />
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete Review</Text>
            <Text style={[styles.confirmText, { color: colors.secondary }]}>
              Are you sure you want to delete this review? This action cannot be undone.
            </Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.secondary }]} 
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.error }]} 
                onPress={handleDeleteReview}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    borderRadius: 8,
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterBadgeContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#e0e0e0',
  },
  initialsAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfo: {
    marginLeft: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  carDetails: {
    fontWeight: '500',
    marginBottom: 8,
  },
  reviewText: {
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchModalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  searchModalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  searchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    width: '48%',
  },
  searchOptionText: {
    marginLeft: 8,
    fontSize: 14,
  },
  searchModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  searchModalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  modalImage: {
    width: '90%',
    height: '60%',
  },
  imageSelectorContainer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 5,
    overflow: 'hidden',
  },
  selectedThumbnail: {
    borderColor: '#fff',
  },
  thumbnailImage: {
    width: 50,
    height: 50,
  },
  confirmationModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  confirmationModalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmIcon: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  confirmText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  toolbarContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sortButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
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
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  sortModalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },
  sortOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
});

export default ReviewsManagementScreen;
