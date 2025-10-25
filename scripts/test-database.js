// Script để test database connection và tạo test order
const mongoose = require('mongoose');

// Kết nối MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cloth_dev';
    console.log('🔗 Connecting to:', uri);
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    
    // Kiểm tra collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

// Test database function
const testDatabase = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }
    
    // Kiểm tra Order collection
    const Order = mongoose.model('Order', new mongoose.Schema({
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number,
        image: String
      }],
      totalAmount: Number,
      status: { type: String, enum: ['pending', 'paid', 'shipped', 'cancelled'], default: 'pending' },
      paymentInfo: {
        payos: {
          orderCode: Number,
          paymentUrl: String,
          transactionId: String,
          webhookPayload: Object
        },
        paidAt: Date
      }
    }, { timestamps: true }));
    
    // Đếm orders
    const orderCount = await Order.countDocuments();
    console.log(`📊 Total orders in database: ${orderCount}`);
    
    // Tạo test order nếu không có
    if (orderCount === 0) {
      console.log('🧪 Creating test order...');
      
      const testOrder = new Order({
        user: new mongoose.Types.ObjectId(),
        items: [{
          product: new mongoose.Types.ObjectId(),
          name: 'TEST',
          price: 0.10,
          quantity: 1,
          image: null
        }],
        totalAmount: 0.10,
        status: 'pending',
        paymentInfo: {
          payos: {
            orderCode: 1761361573618378,
            paymentUrl: 'https://pay.payos.vn/web/e17f5a8c3bfc4b51b720b71027534e2e/',
            transactionId: null
          }
        }
      });
      
      await testOrder.save();
      console.log('✅ Test order created:', testOrder._id.toString());
      console.log('   Short ID:', testOrder._id.toString().slice(-6));
    }
    
    // Liệt kê orders
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Recent orders:');
    orders.forEach(order => {
      const shortId = order._id.toString().slice(-6);
      console.log(`- #${shortId} | ${order.status} | $${order.totalAmount} | ${order.createdAt}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testDatabase();
