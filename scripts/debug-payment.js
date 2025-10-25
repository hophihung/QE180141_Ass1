// Script để debug payment và webhook
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
const debugPayment = async (orderId) => {
  try {
    await connectDB();
    
    console.log(`🔍 Debugging payment for order: ${orderId}`);
    
    // Tìm order theo ID (có thể là partial ID)
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    let order;
    
    // Thử tìm theo full ObjectId trước
    if (orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      // Tìm theo partial ID (6 ký tự cuối)
      const orders = await Order.find({}).exec();
      order = orders.find(o => o._id.toString().endsWith(orderId));
    }
    
    if (order) {
      console.log('✅ Order found:', {
        id: order._id,
        userId: order.user,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        paymentInfo: order.paymentInfo
      });
      
      // Kiểm tra PayOS info
      if (order.paymentInfo?.payos) {
        console.log('📊 PayOS Info:', {
          orderCode: order.paymentInfo.payos.orderCode,
          paymentUrl: order.paymentInfo.payos.paymentUrl,
          transactionId: order.paymentInfo.payos.transactionId,
          webhookPayload: order.paymentInfo.payos.webhookPayload
        });
      } else {
        console.log('❌ No PayOS payment info found');
      }
      
      // Kiểm tra trạng thái thanh toán
      if (order.paymentInfo?.paidAt) {
        console.log('💰 Payment completed at:', order.paymentInfo.paidAt);
      } else {
        console.log('⏳ Payment not completed yet');
      }
      
    } else {
      console.log('❌ Order not found');
    }
    
    // Tìm orders gần đây
    console.log('\n🔍 Recent orders:');
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id user status totalAmount createdAt paymentInfo');
    
    recentOrders.forEach(order => {
      const payosInfo = order.paymentInfo?.payos;
      console.log(`- ${order._id} | ${order.status} | $${order.totalAmount} | ${order.createdAt}`);
      if (payosInfo) {
        console.log(`  PayOS: orderCode=${payosInfo.orderCode}, transactionId=${payosInfo.transactionId || 'N/A'}`);
      }
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
  console.log('Usage: node debug-payment.js <orderId>');
  console.log('Example: node debug-payment.js 4e9e7a');
  process.exit(1);
}

debugPayment(orderId);
