import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { fetchUserReviews, updateReview } from '../redux/slices/reviewSlice';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useToast } from '../context/ToastContext';
import * as ImagePicker from 'expo-image-picker';

const MyReviewsScreen = () => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params || {};
  const toast = useToast();
  
  const { userReviews, userReviewsLoading, userReviewsError } = useSelector((state) => state.reviews);
  
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [editedRating, setEditedRating] = useState(0);
  const [editedComment, setEditedComment] = useState('');
  const [editedImages, setEditedImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUserReviews();
  }, []);

  const loadUserReviews = async () => {
    if (userId) {
      await dispatch(fetchUserReviews(userId));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserReviews();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-o'}
          size={16}
          color={i <= rating ? '#FFD700' : colors.secondary}
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };
  
  const handleOpenReviewModal = (review) => {
    setSelectedReview(review);
    setEditedRating(review.rating);
    setEditedComment(review.comment);
    setEditedImages(review.images || []);
    setNewImages([]);
    setModalVisible(true);
  };
  
  const handleCloseModal = () => {
    setSelectedReview(null);
    setModalVisible(false);
    setEditedRating(0);
    setEditedComment('');
    setEditedImages([]);
    setNewImages([]);
  };
  
  const handleRatingChange = (value) => {
    setEditedRating(value);
  };
  
  const handleDeleteImage = (index) => {
    Alert.alert(
      "Delete Image", 
      "Are you sure you want to remove this image?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            const updatedImages = [...editedImages];
            updatedImages.splice(index, 1);
            setEditedImages(updatedImages);
          }
        }
      ]
    );
  };
  
  const handleAddImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        toast.error('Permission to access media library is required!');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.cancelled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setNewImages([...newImages, selectedImage]);
      }
    } catch (error) {
      toast.error('Error selecting image');
      console.error('Image picker error:', error);
    }
  };
  
  const handleRemoveNewImage = (index) => {
    const updatedImages = [...newImages];
    updatedImages.splice(index, 1);
    setNewImages(updatedImages);
  };

  const handleSubmitEdit = async () => {
    if (!selectedReview) return;
    
    try {
      setIsSubmitting(true);
      
      // Create form data for the request
      const formData = new FormData();
      formData.append('rating', editedRating);
      formData.append('comment', editedComment);
      
      // Add retained images from the original set
      formData.append('retainedImages', JSON.stringify(editedImages.map(img => img.public_id)));
      
      // Add new images
      newImages.forEach((image, index) => {
        const imageName = image.uri.split('/').pop();
        const imageType = 'image/' + (imageName.split('.').pop() === 'png' ? 'png' : 'jpeg');
        
        formData.append('images', {
          uri: image.uri,
          name: imageName,
          type: imageType
        });
      });
      
      await dispatch(updateReview({ 
        reviewId: selectedReview._id, 
        reviewData: formData,
        isFormData: true
      })).unwrap();
      
      toast.success('Review updated successfully');
      handleCloseModal();
      loadUserReviews(); // Reload reviews to show updated data
    } catch (error) {
      toast.error(error?.message || 'Failed to update review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderReviewItem = ({ item }) => {
    const carName = item.rental?.car ? `${item.rental.car.brand} ${item.rental.car.model}` : 'Unknown Car';
    const reviewDate = item.createdAt ? formatDate(item.createdAt) : '';
    
    return (
      <TouchableOpacity
        style={[styles.reviewCard, { backgroundColor: colors.card }]}
        onPress={() => handleOpenReviewModal(item)}
      >
        <View style={styles.reviewHeader}>
          <View style={styles.carInfo}>
            {item.rental?.car?.images && item.rental.car.images.length > 0 ? (
              <Image
                source={{ uri: item.rental.car.images[0].url }}
                style={styles.carImage}
              />
            ) : (
              <View style={[styles.carImagePlaceholder, { backgroundColor: colors.border }]}>
                <Icon name="car" size={20} color={colors.secondary} />
              </View>
            )}
            <View style={styles.carDetails}>
              <Text style={[styles.carName, { color: colors.text }]} numberOfLines={1}>
                {carName}
              </Text>
              <Text style={[styles.reviewDate, { color: colors.secondary }]}>
                {reviewDate}
              </Text>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            {renderStars(item.rating)}
          </View>
        </View>
        
        <Text style={[styles.reviewComment, { color: colors.text }]}>
          {item.comment}
        </Text>
        
        {item.images && item.images.length > 0 && (
          <View style={styles.reviewImagesContainer}>
            {item.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image.url }}
                style={styles.reviewImage}
              />
            ))}
          </View>
        )}

        <View style={styles.editHintContainer}>
          <Icon name="pencil" size={14} color={colors.secondary} />
          <Text style={[styles.editHintText, { color: colors.secondary }]}>
            Tap to edit this review
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => {
    if (userReviewsLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.text, marginTop: 20 }]}>
            Loading your reviews...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="star-o" size={60} color={colors.secondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No reviews yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
          Reviews you write will appear here
        </Text>
      </View>
    );
  };

  // Edit Review Modal
  const renderEditModal = () => {
    if (!selectedReview) return null;
    
    const carName = selectedReview.rental?.car 
      ? `${selectedReview.rental.car.brand} ${selectedReview.rental.car.model}`
      : 'Unknown Car';
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Review</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <View style={styles.carInfoModal}>
                {selectedReview.rental?.car?.images && selectedReview.rental.car.images.length > 0 ? (
                  <Image
                    source={{ uri: selectedReview.rental.car.images[0].url }}
                    style={styles.carImageModal}
                  />
                ) : (
                  <View style={[styles.carImagePlaceholder, { 
                    backgroundColor: colors.border,
                    width: 80,
                    height: 80,
                  }]}>
                    <Icon name="car" size={30} color={colors.secondary} />
                  </View>
                )}
                <Text style={[styles.carNameModal, { color: colors.text }]}>
                  {carName}
                </Text>
              </View>
              
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Rating</Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => handleRatingChange(star)}
                    style={styles.starButton}
                  >
                    <Icon
                      name={star <= editedRating ? 'star' : 'star-o'}
                      size={30}
                      color={star <= editedRating ? '#FFD700' : colors.secondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Rest of the modal content remains unchanged */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Comment</Text>
              <TextInput
                style={[styles.commentInput, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={editedComment}
                onChangeText={setEditedComment}
                multiline
                numberOfLines={4}
                placeholder="Share your experience..."
                placeholderTextColor={colors.secondary}
              />
              
              {/* Existing Images */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Photos</Text>
              {editedImages.length > 0 ? (
                <View style={styles.imagesContainer}>
                  {editedImages.map((image, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image 
                        source={{ uri: image.url }} 
                        style={styles.editImage} 
                      />
                      <TouchableOpacity 
                        style={styles.deleteImageButton} 
                        onPress={() => handleDeleteImage(index)}
                      >
                        <Icon name="trash" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.noImagesText, { color: colors.secondary }]}>
                  No images attached to this review
                </Text>
              )}
              
              {/* New Images */}
              {newImages.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
                    New Photos to Add
                  </Text>
                  <View style={styles.imagesContainer}>
                    {newImages.map((image, index) => (
                      <View key={`new-${index}`} style={styles.imageContainer}>
                        <Image 
                          source={{ uri: image.uri }} 
                          style={styles.editImage} 
                        />
                        <TouchableOpacity 
                          style={styles.deleteImageButton} 
                          onPress={() => handleRemoveNewImage(index)}
                        >
                          <Icon name="trash" size={18} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </>
              )}
              
              <TouchableOpacity
                style={[styles.addPhotoButton, { 
                  borderColor: colors.primary, 
                  marginTop: 15
                }]}
                onPress={handleAddImage}
              >
                <Icon name="camera" size={18} color={colors.primary} style={styles.addPhotoIcon} />
                <Text style={[styles.addPhotoText, { color: colors.primary }]}>
                  Add Photos
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmitEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Review</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {userReviewsError ? (
        <View style={styles.errorContainer}>
          <Icon name="exclamation-circle" size={50} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {typeof userReviewsError === 'string' ? userReviewsError : 'Failed to load reviews'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadUserReviews}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {renderEditModal()}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  rightHeaderPlaceholder: {
    width: 36,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  carImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  carImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carDetails: {
    flex: 1,
  },
  carName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    margin: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editHintText: {
    fontSize: 12,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    height: '80%',  // Fixed height instead of maxHeight
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  carInfoModal: {
    alignItems: 'center',
    marginBottom: 20,
  },
  carImageModal: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 10,
  },
  carNameModal: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    paddingHorizontal: 8,
  },
  commentInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  imageContainer: {
    position: 'relative',
    margin: 5,
  },
  editImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  deleteImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(220, 0, 0, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImagesText: {
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    marginRight: 8,
  },
  addPhotoText: {
    fontWeight: '500',
  },
});

export default MyReviewsScreen;
