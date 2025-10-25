// Script để test order status update API
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

// Test function
const testOrderStatus = async (orderId) => {
  try {
    await connectDB();
    
    console.log(`🔍 Testing order status update for: ${orderId}`);
    
    // Tìm order
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    let order;
    
    if (orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      const orders = await Order.find({}).exec();
      order = orders.find(o => o._id.toString().endsWith(orderId));
    }
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    
    console.log('✅ Order found:', {
      id: order._id,
      status: order.status,
      userId: order.user,
      totalAmount: order.totalAmount
    });
    
    // Test update status
    console.log('🔄 Updating order status to "paid"...');
    order.status = 'paid';
    order.paymentInfo = {
      ...(order.paymentInfo ?? {}),
      paidAt: new Date().toISOString(),
      status: 'success'
    };
    
    await order.save();
    
    console.log('✅ Order status updated successfully');
    console.log('📊 Updated order:', {
      id: order._id,
      status: order.status,
      paidAt: order.paymentInfo?.paidAt
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Chạy script
const orderId = process.argv[2];
if (!orderId) {
  console.log('Usage: node test-order-status.js <orderId>');
  console.log('Example: node test-order-status.js 68fc7657801ccd18aa67e118');
  process.exit(1);
}

testOrderStatus(orderId);
