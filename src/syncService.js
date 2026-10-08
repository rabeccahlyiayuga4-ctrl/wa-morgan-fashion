import { db } from './db';



/**
 * Grabs all unsynced local sales records and pushes them
 * to the central cloud server in chronological order.
 */
export async function syncOfflineSales() {
  // 1. Fetch all transactions marked as unsynced (isSynced === 0)
  const unsyncedSales = await db.sales.where('isSynced').equals(0).toArray();

  if (unsyncedSales.length === 0) {
    return; // Nothing to sync!
  }

  console.log(`🔄 Found ${unsyncedSales.length} unsynced sales records. Initiating sync...`);

  for (const sale of unsyncedSales) {
    // 2. Fetch the specific individual items tied to this transaction ID
    const items = await db.saleItems.where('saleId').equals(sale.id).toArray();

    try {
      // 3. Send a POST request to your cloud backend API endpoint
      const response = await fetch('https://wamorgan.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sale, items })
      });

      if (response.ok) {
        // 4. If the server successfully saves it, update local status to 1 (Synced)
        await db.sales.update(sale.id, { isSynced: 1 });
        console.log(`✅ Transaction ${sale.id} securely uploaded to cloud.`);
      } else {
        console.warn(`⚠️ Cloud server rejected transaction ${sale.id}. Will retry later.`);
        break; // Stop loop to avoid spamming a struggling server
      }
    } catch (error) {
      console.error(`❌ Network error while attempting to sync transaction ${sale.id}:`, error);
      break; // Stop execution if connection dropped out mid-loop
    }
  }
}
