import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  TextInput,
  Pressable,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import Slider from '@react-native-community/slider';
import { COMMON_COLORS } from '../styles/theme';

const FilterModal = ({ visible, onClose, onApply, onReset, initialValues }) => {
  const { colors, isDarkMode } = useTheme();
  const [filters, setFilters] = useState(initialValues || {
    transmission: "",
    pickUpLocation: "",
    brand: "",
    pricePerDay: "",
    year: "",
    rating: ""
  });
  const [displayRating, setDisplayRating] = useState(0);

  useEffect(() => {
    if (initialValues) {
      setFilters(initialValues);
      setDisplayRating(Number(initialValues.rating) || 0);
    }
  }, [initialValues, visible]);

  const handleInputChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating) => {
    if (rating === displayRating) {
      setFilters(prev => ({
        ...prev,
        rating: ""
      }));
      setDisplayRating(0);
    } else {
      setFilters(prev => ({
        ...prev,
        rating: rating.toString()
      }));
      setDisplayRating(rating);
    }
  };

  const handleApply = () => {
    // Filter out empty values
    const filteredParams = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== "")
    );
    onApply(filteredParams);
  };

  const handleReset = () => {
    setFilters({
      transmission: "",
      pickUpLocation: "",
      brand: "",
      pricePerDay: "",
      year: "",
      rating: ""
    });
    setDisplayRating(0);
    onReset();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[
          styles.modalView, 
          { 
            backgroundColor: colors.background,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
              },
              android: {
                elevation: 5,
              },
            }),
          }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Cars</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filtersContainer}>
            {/* Brand Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Brand</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.inputText,
                  borderColor: colors.inputBorder
                }]}
                value={filters.brand}
                onChangeText={(text) => handleInputChange('brand', text)}
                placeholder="Enter car brand"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
            
            {/* Location Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Pick Up Location</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.inputText,
                  borderColor: colors.inputBorder
                }]}
                value={filters.pickUpLocation}
                onChangeText={(text) => handleInputChange('pickUpLocation', text)}
                placeholder="Enter location"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
            
            {/* Transmission Picker */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Transmission</Text>
              <View style={[styles.pickerContainer, { 
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder
              }]}>
                <Picker
                  selectedValue={filters.transmission}
                  onValueChange={(value) => handleInputChange('transmission', value)}
                  style={{ color: colors.inputText }}
                  dropdownIconColor={colors.inputText}
                >
                  <Picker.Item label="Select Transmission" value="" />
                  <Picker.Item label="Manual" value="Manual" />
                  <Picker.Item label="Automatic" value="Automatic" />
                </Picker>
              </View>
            </View>
            
            {/* Price Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Maximum Price Per Day (₱)</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.inputText,
                  borderColor: colors.inputBorder
                }]}
                value={filters.pricePerDay}
                onChangeText={(text) => handleInputChange('pricePerDay', text)}
                placeholder="Enter max price"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="numeric"
              />
            </View>
            
            {/* Year Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Year</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.inputText,
                  borderColor: colors.inputBorder
                }]}
                value={filters.year}
                onChangeText={(text) => handleInputChange('year', text)}
                placeholder="Enter car year"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="numeric"
              />
            </View>
            
            {/* Rating Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Minimum Rating</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleRatingChange(star)}
                    hitSlop={{ top: 10, right: 5, bottom: 10, left: 5 }}
                  >
                    <Icon
                      name={displayRating >= star ? "star" : "star-o"}
                      size={30}
                      color={COMMON_COLORS.starColor}
                      style={styles.starIcon}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.error }]} 
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]} 
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20
  },
  closeButton: {
    padding: 5,
  },
  filtersContainer: {
    maxHeight: '70%'
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    height: 48,
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    height: 48,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  starIcon: {
    marginRight: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default FilterModal;
