import Dexie from 'dexie';

// Initialize the local browser database for Wa Morgan Fashions
export const db = new Dexie('WaMorganPOS');

// Define the tables and searchable keys
db.version(1).stores({
  products: 'id, barcode, name, retailPrice, wholesalePrice, stockCount',
  sales: 'id, timestamp, customerType, totalAmount, paymentMethod, isSynced',
  saleItems: 'id, saleId, productId, quantity, priceSold'
});
