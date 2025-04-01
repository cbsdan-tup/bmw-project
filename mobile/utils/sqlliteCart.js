import SQLite from "react-native-sqlite-storage";

SQLite.enablePromise(true);

const openDatabase = async () => {
  return await SQLite.openDatabase({
    name: "bmwRentCart.db",
    location: "default",
  });
};

const saveCartItem = async (item) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS cart_items (id INTEGER PRIMARY KEY AUTOINCREMENT, productId TEXT, user_id TEXT, price REAL, brand TEXT, model TEXT, year INTEGER, vehicleType TEXT, transmission TEXT, pickUpLocation TEXT, imageUrl TEXT)",
        []
      );
      tx.executeSql(
        "INSERT INTO cart_items (productId, user_id, price, brand, model, year, vehicleType, transmission, pickUpLocation, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          item.productId,
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

const removeCartItem = async (productId, userId) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "DELETE FROM cart_items WHERE productId = ? AND user_id = ?",
        [productId, userId],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export { saveCartItem, getCartItems, clearCart, removeCartItem };
