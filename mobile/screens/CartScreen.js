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
    // Initialize the database connection
    const initDatabase = async () => {
      try {
        console.log("CartScreen: Opening database connection...");
        const database = SQLite.openDatabase("bmwRentCart.db");

        // This is the critical line that was missing - set the database to state
        setDb(database);

        console.log("CartScreen: Database connection established");

        // Create table in a separate transaction after setting the db state
        setTimeout(() => {
          if (database) {
            database.transaction(
              (tx) => {
                tx.executeSql(
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
                    imageUrl TEXT,
                    UNIQUE(car_id, user_id)
                  );`,
                  [],
                  () => {
                    console.log(
                      "CartScreen: rent_cart table created or already exists"
                    );
                  },
                  (_, error) => {
                    console.error("CartScreen: Error creating table:", error);
                    return true; // Roll back transaction
                  }
                );
              },
              (error) => {
                console.error("CartScreen: Transaction error:", error);
              },
              () => {
                console.log("CartScreen: Table creation transaction completed");
              }
            );
          }
        }, 100); // Small delay to ensure database is ready
      } catch (error) {
        console.error("CartScreen: Database initialization error:", error);
        toast.error("Failed to open database");
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
        console.log("CartScreen: Loading cart items for user:", user._id);

        // First check if the table exists
        db.transaction((tx) => {
          tx.executeSql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='rent_cart';",
            [],
            (_, { rows }) => {
              if (rows.length === 0) {
                // Table doesn't exist, create it
                console.log(
                  "CartScreen: rent_cart table doesn't exist, creating it"
                );
                tx.executeSql(
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
                      imageUrl TEXT,
                      UNIQUE(car_id, user_id)
                    );`,
                  [],
                  () => {
                    console.log("CartScreen: rent_cart table created");
                    setCartItems([]);
                    setIsLoading(false);
                  },
                  (_, error) => {
                    console.error("CartScreen: Error creating table:", error);
                    setIsLoading(false);
                    return true;
                  }
                );
                return;
              }

              // Table exists, load cart items
              loadItemsFromTable(tx);
            },
            (_, error) => {
              console.error(
                "CartScreen: Error checking if table exists:",
                error
              );
              setIsLoading(false);
              toast.error("Failed to check database tables");
            }
          );
        });
      } catch (error) {
        console.error("CartScreen: Error in loadCartItems:", error);
        setIsLoading(false);
        toast.error("An unexpected error occurred");
      }
    };

    // Helper function to load items from table
    const loadItemsFromTable = (tx) => {
      tx.executeSql(
        "SELECT * FROM rent_cart WHERE user_id = ?",
        [user._id || ""],
        (_, { rows }) => {
          const items = rows._array || [];
          console.log("CartScreen: Items loaded from database:", items.length);

          // Transform SQLite data to match the app's cart item format
          const transformedItems = items.map((item) => ({
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
        },
        (_, error) => {
          console.error("CartScreen: Error fetching cart items:", error);
          setIsLoading(false);
          toast.error("Failed to load your rental cart");
        }
      );
    };

    if (db && user) {
      loadCartItems();
    } else {
      setIsLoading(false);
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
      toast.error("Invalid car data");
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
                toast.error("Database not initialized");
                setIsLoading(false);
                return;
              }

              db.transaction(
                (tx) => {
                  tx.executeSql(
                    "DELETE FROM rent_cart WHERE car_id = ? AND user_id = ?",
                    [item.productId, user._id || ""],
                    (_, result) => {
                      if (result.rowsAffected > 0) {
                        // Update the cart items state
                        setCartItems((current) =>
                          current.filter(
                            (car) => car.productId !== item.productId
                          )
                        );

                        // Update selected items
                        if (selectedItems[item.productId]) {
                          const newSelected = { ...selectedItems };
                          delete newSelected[item.productId];
                          setSelectedItems(newSelected);
                        }

                        toast.info("Item removed from your rentals");
                      } else {
                        toast.error("Failed to remove item");
                      }
                      setIsLoading(false);
                    },
                    (_, error) => {
                      console.error("Error deleting from cart:", error);
                      toast.error("Database error occurred");
                      setIsLoading(false);
                    }
                  );
                },
                (error) => {
                  console.error("Transaction error:", error);
                  toast.error("Transaction error occurred");
                  setIsLoading(false);
                }
              );
            } catch (error) {
              console.error("Error removing item from cart", error);
              toast.error("An error occurred while removing the item");
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
        toast.error("Failed to save your selection");
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
                  toast.error("Database not initialized");
                  setIsLoading(false);
                  return;
                }

                db.transaction(
                  (tx) => {
                    tx.executeSql(
                      "DELETE FROM rent_cart WHERE user_id = ?",
                      [user._id || ""],
                      (_, result) => {
                        if (result.rowsAffected > 0) {
                          setCartItems([]);
                          setSelectedItems({});
                          toast.info("Rentals cleared successfully");
                        } else {
                          toast.error("Failed to clear rentals");
                        }
                        setIsLoading(false);
                      },
                      (_, error) => {
                        console.error("Error clearing cart:", error);
                        toast.error("Database error occurred");
                        setIsLoading(false);
                      }
                    );
                  },
                  (error) => {
                    console.error("Transaction error:", error);
                    toast.error("Transaction error occurred");
                    setIsLoading(false);
                  }
                );
              } catch (error) {
                console.error("Error clearing rentals", error);
                toast.error("An error occurred while clearing your rentals");
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
            <Text style={{ color: colors.error }}>Clear All</Text>
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
