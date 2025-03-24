import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/AuthContext";
import { auth } from "../config/firebase-config";
import api from "../services/api";
import { MaterialIcons } from "@expo/vector-icons";

const PutCarOnRent = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [userCars, setUserCars] = useState([]);
  const [carData, setCarData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    vehicleType: "Sedan",
    transmission: "Automatic",
    fuel: "Petrol",
    seatCapacity: "",
    displacement: "",
    mileage: "",
    pricePerDay: "",
    description: "",
    pickUpLocation: "",
    termsAndConditions: "",
    isActive: true,
    isAutoApproved: false,
    owner: "", // Replace with actual user ID from auth context
  });
  const [images, setImages] = useState([]);
  const [editingCar, setEditingCar] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [removedImageIds, setRemovedImageIds] = useState([]);

  // Debug auth state
  useEffect(() => {
    console.log("PutCarOnRent - Auth State:", { user, isAuthenticated });
    if (user?._id) {
      setCurrentUserId(user._id);
      setCarData((prev) => ({
        ...prev,
        owner: user._id,
      }));
    }
  }, [user, isAuthenticated]);

  const fetchUserCars = async () => {
    try {
      if (!user?._id) return;
      const response = await api.get(`/my-cars/${user._id}`);
      setUserCars(response.data.cars || []);
      setShowForm(response.data.cars?.length === 0);
    } catch (error) {
      console.error("Error fetching user cars:", error);
      if (error?.response?.status === 401) {
        // Handle unauthorized error - could redirect to login or refresh token
        alert("Session expired. Please login again.");
        // Optional: Trigger logout or token refresh
      } else {
        alert("Failed to fetch your listed cars");
      }
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchUserCars();
    }
  }, [user?._id]);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera access is needed to take photos"
      );
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      // Add new image to existing images array
      setImages([...images, ...result.assets.map((asset) => asset.uri)]);
    }
    setShowImageOptions(false);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Gallery access is needed to select photos"
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      // Add new images to existing images array
      setImages([...images, ...result.assets.map((asset) => asset.uri)]);
    }
    setShowImageOptions(false);
  };

  const removeImage = (index) => {
    // If we're editing and the image is a URL (from server), track its ID for removal
    if (editingCar && images[index] && images[index].startsWith("http")) {
      const imageToRemove = editingCar.images.find((img) => {
        const imgUrl = typeof img === "string" ? img : img.url;
        return imgUrl === images[index];
      });

      if (imageToRemove && imageToRemove.public_id) {
        setRemovedImageIds([...removedImageIds, imageToRemove.public_id]);
      }
    }

    // Remove from UI
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSubmit = async () => {
    try {
      if (!user?._id) {
        Alert.alert("Authentication Required", "Please login first");
        return;
      }

      if (images.length === 0 && !editingCar) {
        Alert.alert("Image Required", "Please select at least one image");
        return;
      }

      // Form validation
      const requiredFields = [
        "brand",
        "model",
        "year",
        "seatCapacity",
        "pricePerDay",
        "pickUpLocation",
      ];
      const missingFields = requiredFields.filter((field) => !carData[field]);

      if (missingFields.length > 0) {
        Alert.alert(
          "Missing Information",
          `Please fill in all required fields: ${missingFields.join(", ")}`
        );
        return;
      }

      setLoading(true);
      const formData = new FormData();

      // Ensure owner is a single string value
      const ownerId = user._id.toString();
      formData.append("owner", ownerId);

      // Add all car data fields except owner (since we handled it above)
      Object.keys(carData).forEach((key) => {
        if (
          key !== "owner" &&
          carData[key] !== null &&
          carData[key] !== undefined
        ) {
          formData.append(key, carData[key].toString());
        }
      });

      // Handle multiple images
      const imagesToUpload = images.filter((img) => !img.startsWith("http"));

      if (imagesToUpload.length > 0) {
        imagesToUpload.forEach((localUri, index) => {
          const filename = localUri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";

          formData.append("images", {
            uri: localUri,
            name: filename,
            type: type,
          });
        });
      }

      // For edit mode, include existing images that weren't removed
      if (editingCar) {
        const existingImagesUrls = images.filter((img) =>
          img.startsWith("http")
        );
        if (existingImagesUrls.length > 0) {
          formData.append("existingImages", JSON.stringify(existingImagesUrls));
        }

        // Include IDs of images to be removed
        if (removedImageIds.length > 0) {
          formData.append("removedImageIds", JSON.stringify(removedImageIds));
        }
      }

      let response;
      if (editingCar) {
        // Ensure we're using the correct ID format
        const carId = editingCar._id.toString();
        response = await api.put(`/Cars/${carId}`, formData, {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        });
        if (response.data.success) {
          setUserCars((prevCars) =>
            prevCars.map((car) => (car._id === carId ? response.data.car : car))
          );
        }
      } else {
        response = await api.post("/CreateCar", formData, {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        });
        if (response.data.success) {
          // Add the new car to the state directly
          setUserCars((prevCars) => [...prevCars, response.data.car]);
        }
      }

      if (response.data.success) {
        Alert.alert(
          "Success",
          editingCar ? "Car updated successfully!" : "Car listed successfully!"
        );
        // Reset form
        setCarData({
          brand: "",
          model: "",
          year: new Date().getFullYear().toString(),
          vehicleType: "Sedan",
          transmission: "Automatic",
          fuel: "Petrol",
          seatCapacity: "",
          displacement: "",
          mileage: "",
          pricePerDay: "",
          description: "",
          pickUpLocation: "",
          termsAndConditions: "",
          isActive: true,
          isAutoApproved: false,
          owner: user._id,
        });
        setImages([]);
        setEditingCar(null);
        setShowForm(false);
      }

      // Reset the removedImageIds when form is reset
      setRemovedImageIds([]);
    } catch (error) {
      console.error("Error saving car:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save car listing"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (carId) => {
    try {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this car? This action cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            onPress: async () => {
              setLoading(true);
              const response = await api.delete(`/Cars/${carId}`);
              setLoading(false);
              if (response.data.success) {
                Alert.alert("Success", "Car deleted successfully!");
                // Update the state directly instead of fetching again
                setUserCars((prevCars) =>
                  prevCars.filter((car) => car._id !== carId)
                );
              }
            },
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error("Error deleting car:", error);
      if (error?.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again.");
      } else {
        Alert.alert("Error", "Failed to delete car");
      }
    }
  };

  const handleEdit = (car) => {
    setEditingCar(car);
    setCarData({
      brand: car.brand || "",
      model: car.model || "",
      year: car.year?.toString() || "",
      vehicleType: car.vehicleType || "Sedan",
      transmission: car.transmission || "Automatic",
      fuel: car.fuel || "Petrol",
      seatCapacity: car.seatCapacity?.toString() || "",
      displacement: car.displacement?.toString() || "",
      mileage: car.mileage?.toString() || "",
      pricePerDay: car.pricePerDay?.toString() || "",
      description: car.description || "",
      pickUpLocation: car.pickUpLocation || "",
      termsAndConditions: car.termsAndConditions || "",
      isActive: car.isActive ?? true,
      isAutoApproved: car.isAutoApproved ?? false,
      owner: car.owner || user._id,
    });

    // Reset removedImageIds when starting a new edit
    setRemovedImageIds([]);

    // Handle images from the existing car
    if (car.images && car.images.length > 0) {
      const imageUrls = car.images.map((img) =>
        typeof img === "string" ? img : img.url
      );
      setImages(imageUrls);
    } else {
      setImages([]);
    }
    setShowForm(true);
  };

  const CarCard = ({ car }) => (
    <View
      style={[
        styles.carCard,
        { backgroundColor: colors.card, borderColor: colors.borderCars },
      ]}
    >
      {car.images && car.images.length > 0 && (
        <Image
          source={{
            uri:
              typeof car.images[0] === "string"
                ? car.images[0]
                : car.images[0].url,
          }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}
      <Text style={[styles.carTitle, { color: colors.text }]}>
        {car.brand} {car.model}
      </Text>
      <Text style={[styles.carDetails, { color: colors.text }]}>
        Year: {car.year}
      </Text>
      <Text style={[styles.carDetails, { color: colors.text }]}>
        Price per day: ₱{car.pricePerDay}
      </Text>
      <Text style={[styles.carDetails, { color: colors.text }]}>
        Status: {car.isActive ? "Active" : "Inactive"}
      </Text>
      <View style={styles.cardButtons}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={() => handleEdit(car)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: "red" }]}
          onPress={() => handleDelete(car._id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListCarsView = () => (
    <View style={styles.listContainer}>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.addButtonText}>Put Car on Rent</Text>
      </TouchableOpacity>
      <Text style={[styles.listTitle, { color: colors.text }]}>
        Your Listed Cars
      </Text>

      <FlatList
        data={userCars}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <CarCard car={item} />}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.text }]}>
            You haven't listed any cars yet
          </Text>
        }
      />
    </View>
  );

  // Render an image preview item with delete button
  const renderImageItem = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item }} style={styles.imagePreview} />
      <TouchableOpacity
        style={styles.deleteImageButton}
        onPress={() => removeImage(index)}
      >
        <MaterialIcons name="delete" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  // Image options modal component
  const ImageOptionsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showImageOptions}
      onRequestClose={() => setShowImageOptions(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Add Images
          </Text>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
            onPress={pickImages}
          >
            <MaterialIcons name="photo-library" size={24} color="white" />
            <Text style={styles.modalButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
            onPress={openCamera}
          >
            <MaterialIcons name="camera-alt" size={24} color="white" />
            <Text style={styles.modalButtonText}>Take a Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modalCancelButton,
              { borderColor: colors.borderCars },
            ]}
            onPress={() => setShowImageOptions(false)}
          >
            <Text style={[styles.modalCancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {editingCar ? "Updating..." : "Submitting..."}
          </Text>
        </View>
      )}

      <ImageOptionsModal />

      {showForm ? (
        <ScrollView style={styles.scrollView}>
          <TouchableOpacity
            style={[styles.backButton]}
            onPress={() => userCars.length > 0 && setShowForm(false)}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              {userCars.length > 0 ? "← Back to list" : ""}
            </Text>
          </TouchableOpacity>

          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Car Images {images.length > 0 ? `(${images.length})` : ""}
            </Text>
            <TouchableOpacity
              style={[styles.imageButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowImageOptions(true)}
            >
              <MaterialIcons
                name="add-photo-alternate"
                size={20}
                color="white"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Add Images</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <View style={styles.imagesContainer}>
                <FlatList
                  data={images}
                  renderItem={renderImageItem}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            )}

            {images.length === 0 && (
              <Text
                style={[
                  styles.helperText,
                  {
                    color: colors.secondary,
                    textAlign: "center",
                    marginTop: 10,
                  },
                ]}
              >
                Please add at least one image of your car
              </Text>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Car Details
            </Text>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Brand *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.brand}
                onChangeText={(text) => setCarData({ ...carData, brand: text })}
                placeholder="Enter car brand"
                placeholderTextColor={colors.secondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Model *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.model}
                onChangeText={(text) => setCarData({ ...carData, model: text })}
                placeholder="Enter car model"
                placeholderTextColor={colors.secondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Year *</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.year}
                onChangeText={(text) => setCarData({ ...carData, year: text })}
                placeholder="Enter year (2009 or later)"
                keyboardType="numeric"
                placeholderTextColor={colors.secondary}
              />
            </View>

            <View
              style={[styles.formGroup, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                Vehicle Type *
              </Text>
              <Picker
                selectedValue={carData.vehicleType}
                style={[styles.picker, { color: colors.text }]}
                onValueChange={(value) =>
                  setCarData({ ...carData, vehicleType: value })
                }
              >
                <Picker.Item label="Sedan" value="Sedan" />
                <Picker.Item label="SUV" value="SUV" />
                <Picker.Item label="Sport Car" value="Sport Car" />
              </Picker>
            </View>

            <View
              style={(styles.formGroup, { backgroundColor: colors.background })}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                Transmission *
              </Text>
              <Picker
                selectedValue={carData.transmission}
                style={[styles.picker, { color: colors.text }]}
                onValueChange={(value) =>
                  setCarData({ ...carData, transmission: value })
                }
              >
                <Picker.Item label="Automatic" value="Automatic" />
                <Picker.Item label="Manual" value="Manual" />
              </Picker>
            </View>

            <View
              style={(styles.formGroup, { backgroundColor: colors.background })}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                Fuel Type *
              </Text>
              <Picker
                selectedValue={carData.fuel}
                style={[styles.picker, { color: colors.text }]}
                onValueChange={(value) =>
                  setCarData({ ...carData, fuel: value })
                }
              >
                <Picker.Item label="Petrol" value="Petrol" />
                <Picker.Item label="Diesel" value="Diesel" />
                <Picker.Item label="Hybrid" value="Hybrid" />
                <Picker.Item label="Electric" value="Electric" />
                <Picker.Item label="Plugin Hybrid" value="Plugin Hybrid" />
              </Picker>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Specifications
            </Text>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Seat Capacity *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.seatCapacity}
                onChangeText={(text) =>
                  setCarData({ ...carData, seatCapacity: text })
                }
                placeholder="Enter seat capacity"
                keyboardType="numeric"
                placeholderTextColor={colors.secondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Displacement (cc) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.displacement}
                onChangeText={(text) =>
                  setCarData({ ...carData, displacement: text })
                }
                placeholder="Enter engine displacement"
                keyboardType="numeric"
                placeholderTextColor={colors.secondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Mileage (km/l) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.mileage}
                onChangeText={(text) =>
                  setCarData({ ...carData, mileage: text })
                }
                placeholder="Enter mileage"
                keyboardType="numeric"
                placeholderTextColor={colors.secondary}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Rental Information
            </Text>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Price Per Day *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.pricePerDay}
                onChangeText={(text) =>
                  setCarData({ ...carData, pricePerDay: text })
                }
                placeholder="Enter price per day"
                keyboardType="numeric"
                placeholderTextColor={colors.secondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.borderCars,
                    height: 100,
                  },
                ]}
                value={carData.description}
                onChangeText={(text) =>
                  setCarData({ ...carData, description: text })
                }
                placeholder="Enter car description"
                multiline
                placeholderTextColor={colors.secondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Terms and Conditions
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.borderCars,
                    height: 100,
                  },
                ]}
                value={carData.termsAndConditions}
                onChangeText={(text) =>
                  setCarData({ ...carData, termsAndConditions: text })
                }
                placeholder="Enter terms and conditions"
                multiline
                placeholderTextColor={colors.secondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Pickup Location *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.borderCars },
                ]}
                value={carData.pickUpLocation}
                onChangeText={(text) =>
                  setCarData({ ...carData, pickUpLocation: text })
                }
                placeholder="Enter pickup location"
                placeholderTextColor={colors.secondary}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchContainer}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Auto Approve Rentals:
                </Text>
                <Switch
                  trackColor={{
                    false: colors.borderCars,
                    true: colors.primary,
                  }}
                  thumbColor={carData.isAutoApproved ? "#fff" : "#f4f3f4"}
                  ios_backgroundColor={colors.borderCars}
                  onValueChange={(value) =>
                    setCarData({ ...carData, isAutoApproved: value })
                  }
                  value={carData.isAutoApproved}
                />
              </View>
              <Text style={[styles.helperText, { color: colors.secondary }]}>
                When enabled, rental requests will be automatically approved
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              { marginBottom: 60 },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? "Processing..."
                : editingCar
                ? "Update Listing"
                : "Submit Listing"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ListCarsView />
      )}
    </SafeAreaView>
  );
};

const additionalStyles = {
  addressText: {
    marginTop: 8,
    fontSize: 12,
    fontStyle: "italic",
  },
  formSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    // borderBottomColor: colors.borderCars,
    paddingBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  imagesContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  imageContainer: {
    position: "relative",
    marginRight: 10,
  },
  deleteImageButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  helperText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "80%",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 10,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  modalCancelButton: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    // borderColor: colors.borderCars,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  modalCancelText: {
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 5,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlignVertical: "top",
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  listTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  carCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    // borderColor is applied dynamically in the component
  },
  carTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  carDetails: {
    fontSize: 14,
    marginBottom: 3,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  imageButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  imagePreview: {
    width: 150,
    height: 100,
    borderRadius: 8,
  },
  cardButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  editButton: {
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  ...additionalStyles,
});

export default PutCarOnRent;
