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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/AuthContext";
import { auth } from "../config/firebase-config";
import api from "../services/api";

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
  const [image, setImage] = useState(null);
  const [editingCar, setEditingCar] = useState(null);

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!user?._id) {
        alert("Please login first");
        return;
      }

      if (!image && !editingCar) {
        alert("Please select an image");
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

      // Only append image if it's a new image (not a URL)
      if (image && !image.startsWith("http")) {
        const localUri = image;
        const filename = localUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("images", {
          uri: localUri,
          name: filename,
          type: type,
        });
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
        alert(
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
        setImage(null);
        setEditingCar(null);
        setShowForm(false);
      }
    } catch (error) {
      console.error("Error saving car:", error);
      alert(error.response?.data?.message || "Failed to save car listing");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (carId) => {
    try {
      const response = await api.delete(`/Cars/${carId}`);
      fetchUserCars();
      if (response.data.success) {
        alert("Car deleted successfully!");
        // Update the state directly instead of fetching again
        setUserCars((prevCars) => prevCars.filter((car) => car._id !== carId));
      }
    } catch (error) {
      console.error("Error deleting car:", error);
      if (error?.response?.status === 401) {
        alert("Session expired. Please login again.");
      } else {
        alert("Failed to delete car");
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

    // Handle image from the existing car
    if (car.images && car.images.length > 0) {
      const imageUrl =
        typeof car.images[0] === "string" ? car.images[0] : car.images[0].url;
      setImage(imageUrl);
    } else {
      setImage(null);
    }
    setShowForm(true);
  };

  const CarCard = ({ car }) => (
    <View style={[styles.carCard, { backgroundColor: colors.card }]}>
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Car Image
            </Text>
            <TouchableOpacity
              style={[styles.imageButton, { backgroundColor: colors.primary }]}
              onPress={pickImage}
            >
              <Text style={styles.buttonText}>Pick an image</Text>
            </TouchableOpacity>
            {image && (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Brand *</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={carData.brand}
              onChangeText={(text) => setCarData({ ...carData, brand: text })}
              placeholder="Enter car brand"
              placeholderTextColor={colors.secondary}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Model *</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
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
                { color: colors.text, borderColor: colors.border },
              ]}
              value={carData.year}
              onChangeText={(text) => setCarData({ ...carData, year: text })}
              placeholder="Enter year (2009 or later)"
              keyboardType="numeric"
              placeholderTextColor={colors.secondary}
            />
          </View>

          <View style={styles.formGroup}>
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

          <View style={styles.formGroup}>
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

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Fuel Type *
            </Text>
            <Picker
              selectedValue={carData.fuel}
              style={[styles.picker, { color: colors.text }]}
              onValueChange={(value) => setCarData({ ...carData, fuel: value })}
            >
              <Picker.Item label="Petrol" value="Petrol" />
              <Picker.Item label="Diesel" value="Diesel" />
              <Picker.Item label="Hybrid" value="Hybrid" />
              <Picker.Item label="Electric" value="Electric" />
              <Picker.Item label="Plugin Hybrid" value="Plugin Hybrid" />
            </Picker>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Seat Capacity *
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
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
                { color: colors.text, borderColor: colors.border },
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
                { color: colors.text, borderColor: colors.border },
              ]}
              value={carData.mileage}
              onChangeText={(text) => setCarData({ ...carData, mileage: text })}
              placeholder="Enter mileage"
              keyboardType="numeric"
              placeholderTextColor={colors.secondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Price Per Day *
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
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
                { color: colors.text, borderColor: colors.border, height: 100 },
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
                { color: colors.text, borderColor: colors.border, height: 100 },
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
                { color: colors.text, borderColor: colors.border },
              ]}
              value={carData.pickUpLocation}
              onChangeText={(text) =>
                setCarData({ ...carData, pickUpLocation: text })
              }
              placeholder="Enter pickup location"
              placeholderTextColor={colors.secondary}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              { marginBottom: 60},
              loading && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Listing..." : "Submit Listing"}
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
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
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
