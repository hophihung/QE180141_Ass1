// Script để debug order 404 error
const mongoose = require('mongoose');

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cloth_dev');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Debug function
const debugOrder = async (orderId) => {
  try {
    await connectDB();
    
    console.log(`🔍 Looking for order: ${orderId}`);
    
    // Tìm order theo ID
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const order = await Order.findById(orderId);
    
    if (order) {
      console.log('✅ Order found:', {
        id: order._id,
        userId: order.user,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        paymentInfo: order.paymentInfo
      });
    } else {
      console.log('❌ Order not found');
      
      // Tìm orders gần đây
      console.log('🔍 Recent orders:');
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id user status totalAmount createdAt');
      
      recentOrders.forEach(order => {
        console.log(`- ${order._id} | ${order.status} | $${order.totalAmount} | ${order.createdAt}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Chạy script
const orderId = process.argv[2];
if (!orderId) {
  console.log('Usage: node debug-order.js <orderId>');
  console.log('Example: node debug-order.js 68fc3c85bc3c9a572f3c4e45');
  process.exit(1);
}

debugOrder(orderId);
