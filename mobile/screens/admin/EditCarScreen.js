import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
  ScrollView,
  Modal
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { fetchCarById, updateCar, clearCarErrors } from '../../redux/slices/adminCarSlice';

// Custom Selector component to replace DropDownPicker
const CustomSelector = ({ label, value, items, onSelect, colors }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={[styles.inputLabel, { color: colors.text }]}>{label} *</Text>
      <TouchableOpacity
        style={[styles.selectorButton, { 
          backgroundColor: colors.card,
          borderColor: colors.border
        }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: value ? colors.text : colors.text + '80' }}>
          {value || `Select ${label.toLowerCase()}...`}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.text + '80'} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select {label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="times" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {items.map((item) => (
                <TouchableOpacity 
                  key={item.value}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border },
                    value === item.value && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={{ color: colors.text }}>{item.label}</Text>
                  {value === item.value && (
                    <Icon name="check" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const EditCarScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const toast = useToast();
  
  const { carId } = route.params;
  const { carDetails, loading, error } = useSelector(state => state.adminCars);

  // Form state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [description, setDescription] = useState('');
  const [pickUpLocation, setPickUpLocation] = useState('');
  const [seatCapacity, setSeatCapacity] = useState('');
  const [fuel, setFuel] = useState('');
  const [transmission, setTransmission] = useState('');
  const [mileage, setMileage] = useState('');
  const [displacement, setDisplacement] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  
  // Images state
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  
  const fuelItems = [
    { label: 'Petrol', value: 'Petrol' },
    { label: 'Diesel', value: 'Diesel' },
    { label: 'Hybrid', value: 'Hybrid' },
    { label: 'Electric', value: 'Electric' },
    { label: 'Plugin Hybrid', value: 'Plugin Hybrid' },
  ];
  
  const transmissionItems = [
    { label: 'Automatic', value: 'Automatic' },
    { label: 'Manual', value: 'Manual' },
  ];
  
  const vehicleTypeItems = [
    { label: 'Sedan', value: 'Sedan' },
    { label: 'SUV', value: 'SUV' },
    { label: 'Sport Car', value: 'Sport Car' },
  ];

  // Load car details when component mounts
  useEffect(() => {
    dispatch(fetchCarById(carId));
  }, [dispatch, carId]);
  
  // Set form values when car details are loaded
  useEffect(() => {
    if (carDetails && carDetails._id === carId) {
      setBrand(carDetails.brand || '');
      setModel(carDetails.model || '');
      setYear(carDetails.year ? carDetails.year.toString() : '');
      setPricePerDay(carDetails.pricePerDay ? carDetails.pricePerDay.toString() : '');
      setDescription(carDetails.description || '');
      setPickUpLocation(carDetails.pickUpLocation || '');
      setSeatCapacity(carDetails.seatCapacity ? carDetails.seatCapacity.toString() : '');
      setFuel(carDetails.fuel || '');
      setTransmission(carDetails.transmission || '');
      setMileage(carDetails.mileage ? carDetails.mileage.toString() : '');
      setDisplacement(carDetails.displacement ? carDetails.displacement.toString() : '');
      setVehicleType(carDetails.vehicleType || '');
      setTermsAndConditions(carDetails.termsAndConditions || '');
      
      // Set existing images
      if (carDetails.images && Array.isArray(carDetails.images)) {
        setExistingImages(
          carDetails.images.map((img, index) => ({
            id: index.toString(),
            uri: typeof img === 'string' ? img : img.url || '',
            public_id: img.public_id || null
          }))
        );
      }
    }
  }, [carDetails, carId]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearCarErrors());
    }
  }, [error, dispatch, toast]);
  
  // Image picker
  const pickImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        toast.error("Permission to access camera roll is required!");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 1,
        allowsMultipleSelection: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add new images
        setNewImages([...newImages, ...result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}`,
          type: 'image/jpeg'
        }))]);
      }
    } catch (error) {
      toast.error("Error picking images: " + error.message);
    }
  };
  
  // Remove existing image
  const removeExistingImage = (imageId) => {
    const imageToRemove = existingImages.find(img => img.id === imageId);
    
    if (imageToRemove && imageToRemove.public_id) {
      setImagesToDelete([...imagesToDelete, imageToRemove.public_id]);
    }
    
    setExistingImages(existingImages.filter(img => img.id !== imageId));
  };
  
  // Remove new image
  const removeNewImage = (index) => {
    setNewImages(newImages.filter((_, i) => i !== index));
  };
  
  // Submit form
  const handleSubmit = async () => {
    // Validate form
    if (!brand || !model || !year || !pricePerDay || !vehicleType || !fuel || !transmission) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('brand', brand);
    formData.append('model', model);
    formData.append('year', year);
    formData.append('pricePerDay', pricePerDay);
    formData.append('description', description);
    formData.append('pickUpLocation', pickUpLocation);
    formData.append('seatCapacity', seatCapacity);
    formData.append('fuel', fuel);
    formData.append('transmission', transmission);
    formData.append('mileage', mileage);
    formData.append('displacement', displacement);
    formData.append('vehicleType', vehicleType);
    formData.append('termsAndConditions', termsAndConditions);
    
    // Add images to delete
    if (imagesToDelete.length > 0) {
      imagesToDelete.forEach(id => {
        formData.append('imagesToDelete[]', id);
      });
    }
    
    // Add new images
    if (newImages.length > 0) {
      newImages.forEach(image => {
        formData.append('images', image);
      });
    }
    
    // Update car
    dispatch(updateCar({ carId, carData: formData }))
      .unwrap()
      .then(() => {
        toast.success("Car updated successfully");
        navigation.goBack();
      })
      .catch(err => {
        toast.error(err || "Failed to update car");
      });
  };
  
  // Cancel edit
  const handleCancel = () => {
    Alert.alert(
      "Cancel Editing",
      "Are you sure you want to cancel? Any unsaved changes will be lost.",
      [
        { text: "Continue Editing", style: "cancel" },
        { text: "Cancel", onPress: () => navigation.goBack() }
      ]
    );
  };

  if (loading && !carDetails) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Render existing images list
  const renderExistingImagesList = () => {
    if (existingImages.length === 0) return null;
    
    return (
      <>
        <Text style={[styles.subSectionTitle, { color: colors.text }]}>Current Images</Text>
        <FlatList
          data={existingImages}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.uri }} style={styles.image} />
              <TouchableOpacity 
                style={[styles.removeImageBtn, { backgroundColor: colors.error + 'CC' }]}
                onPress={() => removeExistingImage(item.id)}
              >
                <Icon name="trash" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageScroll}
        />
      </>
    );
  };
  
  // Render new images list
  const renderNewImagesList = () => {
    if (newImages.length === 0) return null;
    
    return (
      <>
        <Text style={[styles.subSectionTitle, { color: colors.text }]}>New Images</Text>
        <FlatList
          data={newImages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({item, index}) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.uri }} style={styles.image} />
              <TouchableOpacity 
                style={[styles.removeImageBtn, { backgroundColor: colors.error + 'CC' }]}
                onPress={() => removeNewImage(index)}
              >
                <Icon name="trash" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageScroll}
        />
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Edit Car Details</Text>
          
          {/* Brand & Model */}
          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Brand *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g. BMW"
                placeholderTextColor={colors.text + '80'}
              />
            </View>
            
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Model *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={model}
                onChangeText={setModel}
                placeholder="e.g. X5"
                placeholderTextColor={colors.text + '80'}
              />
            </View>
          </View>
          
          {/* Year & Price */}
          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Year *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={year}
                onChangeText={setYear}
                placeholder="e.g. 2023"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Price Per Day ($) *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={pricePerDay}
                onChangeText={setPricePerDay}
                placeholder="e.g. 150"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          {/* Vehicle Type - Using custom selector */}
          <CustomSelector 
            label="Vehicle Type"
            value={vehicleType}
            items={vehicleTypeItems}
            onSelect={setVehicleType}
            colors={colors}
          />
          
          {/* Transmission - Using custom selector */}
          <CustomSelector 
            label="Transmission"
            value={transmission}
            items={transmissionItems}
            onSelect={setTransmission}
            colors={colors}
          />
          
          {/* Fuel - Using custom selector */}
          <CustomSelector 
            label="Fuel Type"
            value={fuel}
            items={fuelItems}
            onSelect={setFuel}
            colors={colors}
          />
          
          {/* Seats & Mileage */}
          <View style={[styles.formRow, { marginTop: 15 }]}>
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Seat Capacity *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={seatCapacity}
                onChangeText={setSeatCapacity}
                placeholder="e.g. 5"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Mileage (km) *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={mileage}
                onChangeText={setMileage}
                placeholder="e.g. 10000"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          {/* Displacement & Location */}
          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Displacement (cc) *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={displacement}
                onChangeText={setDisplacement}
                placeholder="e.g. 2000"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.formColumn}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Pick-up Location *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={pickUpLocation}
                onChangeText={setPickUpLocation}
                placeholder="e.g. Munich Airport"
                placeholderTextColor={colors.text + '80'}
              />
            </View>
          </View>
          
          {/* Description */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
          <TextInput
            style={[styles.textAreaInput, { 
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
              textAlignVertical: 'top'
            }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter car description..."
            placeholderTextColor={colors.text + '80'}
            multiline
            numberOfLines={4}
          />
          
          {/* Terms & Conditions */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Terms & Conditions</Text>
          <TextInput
            style={[styles.textAreaInput, { 
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
              textAlignVertical: 'top'
            }]}
            value={termsAndConditions}
            onChangeText={setTermsAndConditions}
            placeholder="Enter terms & conditions..."
            placeholderTextColor={colors.text + '80'}
            multiline
            numberOfLines={4}
          />
          
          {/* Images Section */}
          <View style={styles.imagesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Car Images</Text>
            
            {/* Existing Images */}
            {renderExistingImagesList()}
            
            {/* New Images */}
            {renderNewImagesList()}
            
            {/* Add Images Button */}
            <TouchableOpacity 
              style={[styles.addImagesButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={pickImages}
            >
              <Icon name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.addImagesText, { color: colors.primary }]}>
                Add Images
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  formColumn: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 100,
    marginBottom: 15,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
  },
  imagesSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  imageScroll: {
    marginBottom: 15,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addImagesText: {
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Custom selector styles
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
});

export default EditCarScreen;
