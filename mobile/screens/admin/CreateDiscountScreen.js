import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Switch, 
  Image, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { createDiscount, clearError } from '../../redux/slices/adminDiscountSlice';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import { format } from 'date-fns';

const CreateDiscountScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { loading, error } = useSelector(state => state.adminDiscounts);

  const [code, setCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [description, setDescription] = useState('');
  const [isOneTime, setIsOneTime] = useState(false);
  const [logo, setLogo] = useState(null);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Default 30 days from now
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('Selected image:', selectedImage);
        
        // Make sure we include all necessary properties
        setLogo({
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          type: selectedImage.type || `image/${selectedImage.uri.split('.').pop().toLowerCase()}`,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      
      // If end date is before new start date, update end date
      if (endDate < selectedDate) {
        setEndDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)); // Add 1 day
      }
    }
  };
  
  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const validateForm = () => {
    if (!code.trim()) return 'Discount code is required';
    
    const percentage = parseFloat(discountPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      return 'Discount percentage must be between 1 and 100';
    }
    
    if (!description.trim()) return 'Description is required';
    if (!logo) return 'Logo image is required';
    
    if (endDate <= startDate) {
      return 'End date must be after start date';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    try {
      // Show loading indicator first
      Alert.alert(
        "Creating Discount",
        "Please wait while we process your request...",
        [{ text: "OK" }],
        { cancelable: false }
      );
      
      // Prepare form data
      const formData = new FormData();
      formData.append('code', code.trim());
      formData.append('discountPercentage', discountPercentage.toString());
      formData.append('isOneTime', isOneTime ? 'true' : 'false');
      formData.append('description', description.trim());
      formData.append('startDate', startDate.toISOString());
      formData.append('endDate', endDate.toISOString());
      
      // Fix the image upload by ensuring proper formatting
      if (logo) {
        const fileNameParts = logo.uri.split('/');
        const fileName = fileNameParts[fileNameParts.length - 1];
        const fileExt = fileName.split('.').pop().toLowerCase();
        
        // Set mime type correctly based on file extension
        let mimeType = 'image/jpeg';
        if (fileExt === 'png') mimeType = 'image/png';
        else if (fileExt === 'jpg' || fileExt === 'jpeg') mimeType = 'image/jpeg';
        
        console.log('Processing image:', {
          uri: logo.uri,
          name: fileName,
          type: mimeType
        });
        
        // This is the critical part - make sure the format exactly matches what multer expects
        formData.append('logo', {
          uri: Platform.OS === 'ios' ? logo.uri.replace('file://', '') : logo.uri,
          name: fileName,
          type: mimeType,
        });
      }
      
      console.log('Submitting form data with logo');
      
      // Use direct dispatch with better error handling
      const response = await dispatch(createDiscount(formData)).unwrap();
      console.log('Discount created successfully:', response);
      
      // Show success and navigate back
      Alert.alert('Success', 'Discount created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Form submission error:', err);
      
      let errorMessage = 'Failed to create discount. Please check your internet connection and try again.';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (Array.isArray(err)) {
        errorMessage = err.join('\n');
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Error', errorMessage, [
        { text: 'OK' },
        { 
          text: 'Try Again',
          onPress: () => handleSubmit()
        }
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Discount Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Discount Code*</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.card, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={code}
              onChangeText={setCode}
              placeholder="Enter discount code (e.g., SUMMER2023)"
              placeholderTextColor={colors.textSecondary}
              maxLength={20}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Discount Percentage (%)*</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.card, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={discountPercentage}
              onChangeText={setDiscountPercentage}
              placeholder="Enter percentage (1-100)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description*</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.card, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description for this discount"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={[styles.formGroup, styles.switchContainer]}>
            <Text style={[styles.label, { color: colors.text }]}>One-time Use Only</Text>
            <Switch
              value={isOneTime}
              onValueChange={setIsOneTime}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={isOneTime ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Validity Period</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, { 
                backgroundColor: colors.card,
                borderColor: colors.border 
              }]}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={{ color: colors.text }}>
                {format(startDate, 'MMMM dd, yyyy')}
              </Text>
              <Icon name="calendar" size={18} color={colors.primary} />
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onStartDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>End Date</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, { 
                backgroundColor: colors.card,
                borderColor: colors.border 
              }]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={{ color: colors.text }}>
                {format(endDate, 'MMMM dd, yyyy')}
              </Text>
              <Icon name="calendar" size={18} color={colors.primary} />
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={onEndDateChange}
                minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)} // Start date + 1 day
              />
            )}
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Logo Image</Text>
          
          <TouchableOpacity 
            style={[styles.imagePickerContainer, { borderColor: colors.border }]}
            onPress={pickImage}
          >
            {logo ? (
              <Image source={{ uri: logo.uri }} style={styles.logoPreview} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon name="camera" size={40} color={colors.primary} />
                <Text style={[styles.placeholderText, { color: colors.text }]}>
                  Tap to select logo image
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {typeof error === 'string' ? error : 'An error occurred'}
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Create Discount</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerButton: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imagePickerContainer: {
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffccc7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 14,
  },
  submitButton: {
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default CreateDiscountScreen;
