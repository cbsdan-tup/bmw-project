import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Icon from "react-native-vector-icons/FontAwesome";
import { useToast } from "../context/ToastContext";
import { CAR_IMAGES } from "../config/constants";
import * as SQLite from "expo-sqlite";

const CartScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const toast = useToast();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log("Opening database...");
        const database = await SQLite.openDatabaseAsync("bmwCartNew.db");

        console.log("Database opened successfully");
        setDb(database);

        await database.execAsync(
          `CREATE TABLE IF NOT EXISTS rent_cart (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              car_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              price REAL NOT NULL,
              brand TEXT NOT NULL,
              model TEXT NOT NULL,
              year INTEGER,
              vehicleType TEXT,
              transmission TEXT,
              pickUpLocation TEXT,
              imageUrl TEXT
            );`
        );
        console.log("Table created successfully");
      } catch (error) {
        console.error("Database setup error:", error);
        setDbError(error.message || String(error));
      }
    };

    initDatabase();
  }, []);

  useEffect(() => {
    const loadCartItems = async () => {
      if (!db || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Properly query the database with getAllAsync instead of execAsync
        const items = await db.getAllAsync(
          "SELECT * FROM rent_cart WHERE user_id = ?",
          [user._id || ""]
        );

        console.log("Items loaded from database:", items.length);

        // Transform SQLite data to match the app's cart item format
        const transformedItems = items.map((item) => ({
          _id: item.car_id, // Add _id field to match what CheckoutScreen expects
          productId: item.car_id,
          brand: item.brand,
          model: item.model,
          year: item.year,
          vehicleType: item.vehicleType,
          transmission: item.transmission,
          pickUpLocation: item.pickUpLocation,
          pricePerDay: item.price,
          images: item.imageUrl ? [item.imageUrl] : [],
        }));

        setCartItems(transformedItems);
        setIsLoading(false);
      } catch (error) {
        console.error("Error in loadCartItems:", error);
        setIsLoading(false);
      }
    };

    if (db && user) {
      loadCartItems();
    }
  }, [user, db]);

  const toggleItemSelection = (itemId) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const isAllSelected =
    cartItems.length > 0 &&
    Object.keys(selectedItems).length === cartItems.length &&
    Object.values(selectedItems).every((value) => value === true);

  const toggleAllSelection = () => {
    if (isAllSelected) {
      setSelectedItems({});
    } else {
      const newSelectedItems = {};
      cartItems.forEach((item) => {
        newSelectedItems[item.productId] = true;
      });
      setSelectedItems(newSelectedItems);
    }
  };

  const getSelectedCartItems = () => {
    if (!cartItems || !cartItems.length) return [];
    return cartItems.filter((item) => selectedItems[item.productId]);
  };

  const calculateTotal = () => {
    const selected = getSelectedCartItems();
    if (!selected || !selected.length) return 0;
    return selected.reduce((total, item) => total + item.pricePerDay, 0);
  };

  const handleAddCarPress = () => {
    if (!user) {
      toast.warning("Please login to add cars to your rentals");
      navigation.navigate("Login");
      return;
    }

    navigation.navigate("HomeScreen");
  };

  const handleRemoveItem = async (item) => {
    if (!item || !item.productId) {
      console.log("Invalid car data");
      return;
    }

    Alert.alert(
      "Remove Car",
      `Remove ${item.brand || "this car"} ${
        item.model || ""
      } from your rentals?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: async () => {
            try {
              setIsLoading(true);

              if (!db) {
                console.log("Database not initialized");
                setIsLoading(false);
                return;
              }

              // Use runAsync instead of execAsync for DELETE operations
              await db.runAsync(
                "DELETE FROM rent_cart WHERE car_id = ? AND user_id = ?",
                [item.productId, user._id || ""]
              );

              // Update the cart items state
              setCartItems((current) =>
                current.filter((car) => car.productId !== item.productId)
              );

              // Update selected items
              setSelectedItems((prev) => {
                const newSelected = { ...prev };
                delete newSelected[item.productId];
                return newSelected;
              });

              toast.info("Item removed from your rentals");
            } catch (error) {
              console.error("Error removing item from cart", error);
              console.log("An error occurred while removing the item");
            } finally {
              setIsLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleProceedToBooking = async () => {
    const selected = getSelectedCartItems();
    if (selected.length === 0) {
      toast.warning("Please select at least one car to proceed");
      return;
    }

    if (selected.length === 1) {
      try {
        navigation.navigate("BookingScreen", { car: selected[0] });
      } catch (error) {
        console.error("Error processing cart before booking", error);
        console.log("Failed to save your selection");
      }
    } else {
      toast.info("Please select only one car to book at a time");
    }
  };

  const handleClearAll = async () => {
    if (cartItems && cartItems.length > 0) {
      Alert.alert(
        "Clear Cart",
        "Are you sure you want to remove all cars from your rentals?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear All",
            onPress: async () => {
              try {
                setIsLoading(true);

                if (!db) {
                  console.log("Database not initialized");
                  return;
                }

                // Use runAsync for the DELETE operation
                await db.runAsync("DELETE FROM rent_cart WHERE user_id = ?", [
                  user._id || "",
                ]);

                setCartItems([]);
                setSelectedItems({});
                toast.info("Rentals cleared successfully");
              } catch (error) {
                console.error("Error clearing rentals", error);
                console.log("An error occurred while clearing your rentals");
              } finally {
                setIsLoading(false);
              }
            },
            style: "destructive",
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              styles.emptyText,
              { color: colors.secondary, marginTop: 16 },
            ]}
          >
            Loading your rental cart...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { paddingTop: 50 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.text,
            },
          ]}
        >
          My Rental Cart
        </Text>
        {cartItems && cartItems.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Icon name="trash" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {cartItems && cartItems.length > 0 ? (
        <>
          <View style={styles.selectionHeader}>
            <TouchableOpacity
              style={styles.selectAllContainer}
              onPress={toggleAllSelection}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.primary },
                  isAllSelected && { backgroundColor: colors.primary },
                ]}
              >
                {isAllSelected && (
                  <Icon name="check" size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={[styles.selectAllText, { color: colors.text }]}>
                Select All
              </Text>
            </TouchableOpacity>
            <Text style={[styles.itemCountText, { color: colors.secondary }]}>
              {cartItems.length} {cartItems.length === 1 ? "car" : "cars"}
            </Text>
          </View>

          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.footer, { backgroundColor: colors.card }]}>
            <View style={styles.totalContainer}>
              <Text style={[styles.totalLabel, { color: colors.secondary }]}>
                Selected: {getSelectedCartItems().length}
              </Text>
              <Text style={[styles.totalPrice, { color: colors.primary }]}>
                ₱{calculateTotal()}/day
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: colors.primary },
                getSelectedCartItems().length === 0 && { opacity: 0.6 },
              ]}
              onPress={handleProceedToBooking}
              disabled={getSelectedCartItems().length === 0}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="shopping-cart" size={60} color={colors.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Your rental cart is empty
          </Text>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            Add cars to your cart to book them for rental
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={handleAddCarPress}
          >
            <Text style={styles.browseButtonText}>Add Cars</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );

  function renderCartItem({ item }) {
    const isSelected = !!selectedItems[item.productId];

    return (
      <View style={[styles.cartItem, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: colors.primary },
            isSelected && { backgroundColor: colors.primary },
          ]}
          onPress={() => toggleItemSelection(item.productId)}
        >
          {isSelected && <Icon name="check" size={12} color="#FFFFFF" />}
        </TouchableOpacity>

        <Image
          source={
            item.images && item.images.length > 0
              ? {
                  uri:
                    typeof item.images[0] === "string"
                      ? item.images[0]
                      : item.images[0]?.url,
                }
              : CAR_IMAGES.placeholder
          }
          style={styles.carImage}
          defaultSource={CAR_IMAGES.placeholder}
        />

        <View style={styles.carInfo}>
          <Text style={[styles.carTitle, { color: colors.text }]}>
            {item.brand} {item.model}
          </Text>
          <Text style={[styles.carYear, { color: colors.secondary }]}>
            {item.year} • {item.vehicleType}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.secondary }]}>
              Daily Rate:
            </Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              ₱{item.pricePerDay}/day
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item)}
        >
          <Icon name="trash" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  backButton: {
    padding: 8,
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectAllContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  selectAllText: {
    fontSize: 16,
  },
  itemCountText: {
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  cartItem: {
    flexDirection: "row",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  carImage: {
    width: 80,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  carInfo: {
    flex: 1,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  carYear: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
  },
  removeButton: {
    padding: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "bold",
  },
  checkoutButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CartScreen;
