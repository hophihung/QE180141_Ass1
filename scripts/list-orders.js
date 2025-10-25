// Script để liệt kê tất cả orders
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

// List orders function
const listOrders = async () => {
  try {
    await connectDB();
    
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    
    console.log('📋 All orders in database:');
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .select('_id user status totalAmount createdAt paymentInfo')
      .exec();
    
    if (orders.length === 0) {
      console.log('❌ No orders found in database');
    } else {
      orders.forEach((order, index) => {
        const shortId = order._id.toString().slice(-6);
        const payosInfo = order.paymentInfo?.payos;
        console.log(`${index + 1}. Order #${shortId}`);
        console.log(`   Full ID: ${order._id}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Amount: $${order.totalAmount}`);
        console.log(`   Created: ${order.createdAt}`);
        if (payosInfo) {
          console.log(`   PayOS orderCode: ${payosInfo.orderCode}`);
          console.log(`   Transaction ID: ${payosInfo.transactionId || 'N/A'}`);
        }
        console.log('   ---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

listOrders();
