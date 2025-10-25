# 🔍 Debug Order 404 Error

## Kiểm tra Order trong Database

### 1. Kết nối MongoDB
```bash
# Mở MongoDB Compass hoặc CLI
mongodb://127.0.0.1:27017/cloth_dev
```

### 2. Tìm Order theo ID
```javascript
// Trong MongoDB Compass hoặc CLI
db.orders.findOne({_id: ObjectId("68fc3c85bc3c9a572f3c4e45")})
```

### 3. Tìm Order theo orderCode
```javascript
// Tìm theo orderCode từ PayOS
db.orders.findOne({"paymentInfo.payos.orderCode": 1761361573618378})
```

### 4. Liệt kê tất cả orders gần đây
```javascript
// Xem orders gần đây
db.orders.find().sort({createdAt: -1}).limit(10)
```

## Debug Steps

### 1. Check Backend Logs
```bash
cd backend
npm run dev

# Look for:
# - "Creating PayOS payment link:"
# - "Order created with ID:"
# - "Payment link created successfully:"
```

### 2. Check Order Creation
```javascript
// Trong backend/src/routes/orderRoutes.ts
// Thêm log khi tạo order:
console.log("Order created:", {
  id: order.id,
  userId: order.user,
  totalAmount: order.totalAmount,
  status: order.status
});
```

### 3. Check PayOS Integration
```javascript
// Trong backend/src/routes/orderRoutes.ts
// Thêm log khi tạo payment link:
console.log("PayOS payment link created:", {
  orderId: order.id,
  orderCode: orderCode,
  paymentUrl: paymentLink.checkoutUrl
});
```

## Common Issues & Solutions

### Issue 1: Order ID Mismatch
**Problem**: PayOS redirect với order ID khác
**Solution**: Kiểm tra orderCode mapping

### Issue 2: Order Not Saved
**Problem**: Order không được lưu vào database
**Solution**: Kiểm tra database connection và order creation logic

### Issue 3: Route Handling
**Problem**: Frontend không xử lý đúng route
**Solution**: Kiểm tra App.tsx routes

### Issue 4: Database Connection
**Problem**: Backend không kết nối được database
**Solution**: Kiểm tra MONGODB_URI và database status
