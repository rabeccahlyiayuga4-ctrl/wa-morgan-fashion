import { db } from './db';

// Process and save transactions securely
export async function processSale(cartItems, customerType, totalAmount, paymentMethod, isOnline) {
  const saleId = crypto.randomUUID(); // Generates a unique local ID
  const timestamp = new Date().toISOString();

  const saleRecord = {
    id: saleId,
    timestamp,
    customerType, // 'retail' or 'wholesale'
    totalAmount,
    paymentMethod, // 'M-Pesa' or 'Cash'
    isSynced: isOnline ? 1 : 0 // 0 means saved offline, waiting to sync
  };

  try {
    // 1. Save main transaction details
    await db.sales.add(saleRecord);

    // 2. Save individual items in the cart
    for (const item of cartItems) {
      await db.saleItems.add({
        id: crypto.randomUUID(),
        saleId,
        productId: item.id,
        quantity: item.quantity,
        priceSold: customerType === 'wholesale' ? item.wholesalePrice : item.retailPrice
      });

      // 3. Deduct stock instantly from local storage cache
      await db.products.where('id').equals(item.id).modify(prod => {
        prod.stockCount -= item.quantity;
      });
    }

    if (!isOnline) {
      console.log("⚠️ System Offline: Transaction saved safely to local browser storage.");
    }

    return { success: true, saleId };
  } catch (error) {
    console.error("Local database transaction failed:", error);
    throw error;
  }
}
