import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUserCars,
  deleteCar,
  clearError,
  updateCarStatus,
} from "../redux/slices/carSlice";

const PutCarOnRent = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { userCars, loading, error } = useSelector((state) => state.cars);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchUserCars(user._id));
    }
  }, [user?._id, dispatch]);

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
              await dispatch(deleteCar(carId)).unwrap();
              Alert.alert("Success", "Car deleted successfully!");
            },
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting car:", error);
      Alert.alert("Error", "Failed to delete car");
    }
  };

  const handleEdit = (car) => {
    navigation.navigate("CarForm", { editingCar: car });
  };

  const handleToggleStatus = async (car) => {
    try {
      const newStatus = !car.isActive;

      Alert.alert(
        "Confirm Status Change",
        `Are you sure you want to ${newStatus ? "activate" : "deactivate"} this car listing?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Confirm",
            onPress: async () => {
              await dispatch(
                updateCarStatus({
                  carId: car._id,
                  isActive: newStatus,
                })
              ).unwrap();

              Alert.alert(
                "Success",
                `Car has been ${newStatus ? "activated" : "deactivated"} successfully!`
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error toggling car status:", error);
      Alert.alert("Error", "Failed to update car status");
    }
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
        Status:{" "}
        <Text
          style={{
            fontWeight: "bold",
            color: car.isActive ? "green" : "red",
          }}
        >
          {car.isActive ? "Active" : "Inactive"}
        </Text>
      </Text>
      <View style={styles.cardButtons}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={() => handleEdit(car)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: car.isActive ? "#ff9500" : "#4CAF50" },
          ]}
          onPress={() => handleToggleStatus(car)}
        >
          <Text style={styles.buttonText}>
            {car.isActive ? "Deactivate" : "Activate"}
          </Text>
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

  if (loading && !userCars.length) {
    return (
      <View style={[styles.container, {
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center'
      }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading your cars...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.listContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("CarForm")}
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
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                You haven't listed any cars yet
              </Text>
              <Text style={[styles.emptySubText, { color: colors.secondary }]}>
                Tap the button above to add a car for rent
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptySubText: {
    textAlign: "center",
    fontSize: 14,
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
  toggleButton: {
    padding: 8,
    borderRadius: 5,
    flex: 1.2,
    marginHorizontal: 5,
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default PutCarOnRent;
