import React, { useState, useEffect } from 'react';
import { db } from './db';
import { processSale } from './salesService';
import { syncOfflineSales } from './syncService'; // Wired up securely!

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cart, setCart] = useState([]);
  const [customerType, setCustomerType] = useState('retail');
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineSales();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      syncOfflineSales();
    }

    const seedDatabase = async () => {
      try {
        const count = await db.products.count();
        if (count === 0) {
          await db.products.bulkAdd([
            { id: '1', barcode: '1111', name: 'Trendy Unisex Denim Jacket', retailPrice: 1500, wholesalePrice: 1100, stockCount: 50 },
            { id: '2', barcode: '2222', name: 'Ladies Floral Two-Piece Set', retailPrice: 1800, wholesalePrice: 1400, stockCount: 40 },
            { id: '3', barcode: '3333', name: 'Heavy Cotton Men T-Shirt', retailPrice: 800, wholesalePrice: 550, stockCount: 100 }
          ]);
          console.log("🚀 Sample products safely cached offline!");
        }
      } catch (error) {
        console.error("Database seeding failed:", error);
      }
    };

    seedDatabase();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = await db.products.where('barcode').equals(barcodeInput.trim()).first();
    if (product) {
      setCart((prevCart) => {
        const exists = prevCart.find((item) => item.id === product.id);
        if (exists) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prevCart, { ...product, quantity: 1 }];
      });
      setMessage('');
    } else {
      setMessage('❌ Product barcode not found in local cache.');
    }
    setBarcodeInput('');
  };

  const handleIncreaseQty = (productId) => {
    setCart(prev => prev.map(item =>
      item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const handleDecreaseQty = (productId) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        if (item.quantity <= 1) return null;
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveItem = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const price = customerType === 'wholesale' ? item.wholesalePrice : item.retailPrice;
      return total + price * item.quantity;
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const totalAmount = calculateTotal();
      await processSale(cart, customerType, totalAmount, paymentMethod, isOnline);
      setCart([]);
      setMessage(`✅ Checkout Successful! Total: KSH ${totalAmount}.`);

      if (isOnline) {
        syncOfflineSales();
      }
    } catch (err) {
      setMessage('❌ Transaction error.');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '20px' }}>

      <div style={{
        padding: '10px', color: '#fff', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center',
        backgroundColor: isOnline ? '#10B981' : '#EF4444', marginBottom: '20px'
      }}>
        {isOnline ? '🟢 Connected Online (Sync Active)' : '🔴 System Running Offline (Saving to Local Cache)'}
      </div>

      <h1 style={{ color: '#1f2937' }}>🛒 Wa Morgan Fashions - POS Terminal</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>1. Transaction Options</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ marginRight: '15px' }}>
              <input type="radio" checked={customerType === 'retail'} onChange={() => setCustomerType('retail')} /> Retail Price
            </label>
            <label>
              <input type="radio" checked={customerType === 'wholesale'} onChange={() => setCustomerType('wholesale')} /> Wholesale Bulk
            </label>
          </div>

          <form onSubmit={handleBarcodeSubmit} style={{ marginTop: '25px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Scan Barcode (Type 1111, 2222, or 3333 to test):</label>
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan item or type barcode..."
              style={{ width: '80%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={{ padding: '10px 15px', marginLeft: '10px', backgroundColor: '#3B82F6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enter</button>
          </form>

          {message && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>2. Active Purchase Cart</h3>
          {cart.length === 0 ? <p style={{ color: '#6b7280' }}>Cart is currently empty.</p> : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Item Name</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
                </thead>
                <tbody>
                {cart.map((item) => {
                  const price = customerType === 'wholesale' ? item.wholesalePrice : item.retailPrice;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: '600' }}>{item.name}</div>
                        <small style={{ color: '#6b7280' }}>Code: {item.barcode}</small>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <button onClick={() => handleDecreaseQty(item.id)} style={{ padding: '2px 8px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => handleIncreaseQty(item.id)} style={{ padding: '2px 8px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                        </div>
                      </td>
                      <td>KSH {price}</td>
                      <td style={{ fontWeight: '600' }}>KSH {price * item.quantity}</td>
                      <td>
                        <button onClick={() => handleRemoveItem(item.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>

              <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '15px', textAlign: 'right' }}>
                <h2 style={{ margin: '0 0 15px 0' }}>Total: KSH {calculateTotal()}</h2>

                <label style={{ marginRight: '15px', fontWeight: 'bold' }}>Payment: </label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: '8px', marginRight: '15px', borderRadius: '4px' }}>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Cash">Cash</option>
                </select>

                <button onClick={handleCheckout} style={{ padding: '12px 25px', backgroundColor: '#10B981', color: '#fff', fontSize: '16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Complete Sale
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
