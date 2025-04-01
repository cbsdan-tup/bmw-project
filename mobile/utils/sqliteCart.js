import SQLite from "react-native-sqlite-storage";

SQLite.enablePromise(true);

const openDatabase = async () => {
  try {
    console.log("Attempting to open database...");
    const db = await SQLite.openDatabase({
      name: "bmwRentCart.db",
      location: "www",
      createFromLocation: 1,
    });

    console.log("Database opened, creating table...");
    await createCartTable(db);
    console.log("Database initialized successfully");

    return db;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

// Create the cart_items table with proper constraints
const createCartTable = async (db) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS cart_items (id INTEGER PRIMARY KEY AUTOINCREMENT, car_id TEXT NOT NULL, user_id TEXT NOT NULL, price REAL NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL, year INTEGER NOT NULL, vehicleType TEXT NOT NULL, transmission TEXT NOT NULL, pickUpLocation TEXT NOT NULL, imageUrl TEXT)",
        [],
        (_, result) => {
          console.log("Cart table initialized successfully");
          resolve(result);
        },
        (_, error) => {
          console.error("Error creating cart table:", error);
          reject(error);
        }
      );
    });
  });
};

const saveCartItem = async (item) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "INSERT INTO cart_items (car_Id, user_id, price, brand, model, year, vehicleType, transmission, pickUpLocation, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          item.carId,
          item.user_id,
          item.pricePerDay,
          item.brand,
          item.model,
          item.year,
          item.vehicleType,
          item.transmission,
          item.pickUpLocation,
          item.images && item.images.length > 0
            ? item.images[0].url || item.images[0]
            : "",
        ],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

const getCartItems = async (userId) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM cart_items WHERE user_id = ?",
        [userId],
        (_, { rows: { _array } }) => resolve(_array),
        (_, error) => reject(error)
      );
    });
  });
};

const clearCart = async (userId) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "DELETE FROM cart_items WHERE user_id = ?",
        [userId],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

const removeCartItem = async (car_Id, userId) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "DELETE FROM cart_items WHERE car_Id = ? AND user_id = ?",
        [car_Id, userId],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export { saveCartItem, getCartItems, clearCart, removeCartItem, openDatabase };
