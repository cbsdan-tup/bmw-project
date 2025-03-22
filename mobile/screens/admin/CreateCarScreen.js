import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { createNewCar } from '../../redux/slices/adminCarSlice';
import { validateUserEmail } from '../../redux/slices/adminUserSlice';

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

const CreateCarScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);
  
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
  const [isAutoApproved, setIsAutoApproved] = useState(false);
  
  // Owner state
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerDetails, setOwnerDetails] = useState(null);
  
  // Images state
  const [images, setImages] = useState([]);
  
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

  // Validate owner email
  const validateOwnerEmail = async () => {
    if (!ownerEmail.trim()) {
      toast.error("Please enter an owner email");
      return false;
    }
    
    setValidatingEmail(true);
    
    try {
      const result = await dispatch(validateUserEmail(ownerEmail)).unwrap();
      setOwnerDetails(result.user);
      toast.success(`User found: ${result.user.firstName} ${result.user.lastName}`);
      setValidatingEmail(false);
      return true;
    } catch (error) {
      toast.error(error || "User not found with this email");
      setOwnerDetails(null);
      setValidatingEmail(false);
      return false;
    }
  };

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
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}`,
          type: 'image/jpeg'
        }));
        
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      toast.error("Error picking images: " + error.message);
    }
  };
  
  // Remove image
  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };
  
  // Validate form
  const validateForm = () => {
    if (!brand || !model || !year || !pricePerDay || !vehicleType || !fuel || 
        !transmission || !seatCapacity || !mileage || !displacement || !pickUpLocation) {
      toast.error("Please fill all required fields");
      return false;
    }
    
    if (images.length === 0) {
      toast.error("Please add at least one image");
      return false;
    }
    
    if (!ownerDetails) {
      toast.error("Please validate the owner's email first");
      return false;
    }
    
    return true;
  };
  
  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
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
      formData.append('isAutoApproved', isAutoApproved);
      formData.append('isActive', true);
      
      // Add owner ID from validated email
      formData.append('owner', ownerDetails._id);
      
      // Add images
      images.forEach(image => {
        formData.append('images', image);
      });
      
      // Create new car
      await dispatch(createNewCar(formData)).unwrap();
      toast.success("Car created successfully");
      navigation.navigate('CarsManagement');
    } catch (error) {
      toast.error(error || "Failed to create car");
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel button
  const handleCancel = () => {
    Alert.alert(
      "Cancel Car Creation",
      "Are you sure you want to cancel? All entered data will be lost.",
      [
        { text: "Continue Editing", style: "cancel" },
        { text: "Cancel", onPress: () => navigation.goBack() }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Create New Car</Text>
          
          {/* Owner Email Field */}
          <View style={styles.ownerSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Owner Information</Text>
            <View style={styles.ownerEmailContainer}>
              <View style={styles.ownerEmailInputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Owner Email *</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                    flex: 1
                  }]}
                  value={ownerEmail}
                  onChangeText={setOwnerEmail}
                  placeholder="Enter owner's email"
                  placeholderTextColor={colors.text + '80'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!ownerDetails}
                />
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.validateButton, 
                  { 
                    backgroundColor: ownerDetails ? colors.success : colors.primary,
                    opacity: validatingEmail ? 0.7 : 1
                  }
                ]}
                onPress={validateOwnerEmail}
                disabled={validatingEmail || !!ownerDetails}
              >
                {validatingEmail ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : ownerDetails ? (
                  <Icon name="check" size={16} color="#FFF" />
                ) : (
                  <Text style={styles.validateButtonText}>Validate</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {ownerDetails && (
              <View style={[styles.ownerInfoBox, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                <Icon name="user" size={16} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[styles.ownerInfoText, { color: colors.text }]}>
                  {ownerDetails.firstName} {ownerDetails.lastName} ({ownerDetails.email})
                </Text>
                <TouchableOpacity 
                  style={styles.clearOwnerButton}
                  onPress={() => {
                    setOwnerDetails(null);
                    setOwnerEmail('');
                  }}
                >
                  <Icon name="times" size={16} color={colors.text + '80'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
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
              <Text style={[styles.inputLabel, { color: colors.text }]}>Price Per Day (₱) *</Text>
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
          <View style={styles.formRow}>
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
          
          {/* Auto-Approval */}
          <TouchableOpacity 
            style={styles.autoApproveContainer}
            onPress={() => setIsAutoApproved(!isAutoApproved)}
          >
            <Icon 
              name={isAutoApproved ? 'check-square-o' : 'square-o'} 
              size={24} 
              color={colors.primary} 
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.autoApproveText, { color: colors.text }]}>Auto-approve rentals</Text>
          </TouchableOpacity>
          
          {/* Images Section */}
          <View style={styles.imagesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Car Images *</Text>
            
            {/* Images */}
            {images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imageScroll}
              >
                {images.map((item, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: item.uri }} style={styles.image} />
                    <TouchableOpacity 
                      style={[styles.removeImageBtn, { backgroundColor: colors.error + 'CC' }]}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="trash" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {/* Add Images Button */}
            <TouchableOpacity 
              style={[styles.addImagesButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={pickImages}
            >
              <Icon name="camera" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.addImagesText, { color: colors.primary }]}>
                {images.length === 0 ? 'Add Images' : 'Add More Images'}
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
                <Text style={styles.saveButtonText}>Create Car</Text>
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
  autoApproveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  autoApproveText: {
    fontSize: 16,
    fontWeight: '500',
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
  imageScroll: {
    flexDirection: 'row',
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
  ownerSection: {
    marginBottom: 20,
  },
  ownerEmailContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  ownerEmailInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  validateButton: {
    height: 46,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  validateButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  ownerInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
  },
  ownerInfoText: {
    flex: 1,
    fontSize: 14,
  },
  clearOwnerButton: {
    padding: 5,
  },
  // New styles for custom selector
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

export default CreateCarScreen;
