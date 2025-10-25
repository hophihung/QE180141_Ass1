# PayOS Integration Setup

## 🔧 Cấu hình PayOS

### 1. Tạo tài khoản PayOS
1. Truy cập https://my.payos.vn
2. Đăng ký tài khoản PayOS
3. Xác thực tài khoản theo hướng dẫn

### 2. Lấy API Keys
Trong PayOS Dashboard:
- **Client ID**: Lấy từ phần "Thông tin ứng dụng"
- **API Key**: Lấy từ phần "API Keys" 
- **Checksum Key**: Lấy từ phần "Webhook"

### 3. Cấu hình Environment Variables
Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/cloth_dev

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080

# JWT Authentication
JWT_SECRET=super-secret-change-me
JWT_EXPIRES_IN=2h
BCRYPT_ROUNDS=10

# PayOS Configuration
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# Frontend URL (for PayOS redirects)
CLIENT_APP_URL=http://localhost:8080
```

### 4. Cấu hình Webhook URL
Trong PayOS Dashboard:
1. Vào phần "Webhook"
2. Đặt Webhook URL: `https://your-domain.com/api/payments/webhook`
3. Chọn events: "Payment Success", "Payment Failed"

### 5. Test với ngrok (Development)
Nếu đang develop local, dùng ngrok để public webhook:

```bash
# Cài ngrok
npm install -g ngrok

# Chạy ngrok
ngrok http 5000

# Copy URL ngrok (ví dụ: https://abc123.ngrok.io)
# Đặt vào PayOS Dashboard: https://abc123.ngrok.io/api/payments/webhook
```

## 🚀 Luồng thanh toán

### 1. User Flow
```
/products → /cart → /checkout → PayOS Gateway → /order-success
```

### 2. Backend Flow
```
POST /api/orders/:id/pay
├── Tạo orderCode duy nhất
├── Gọi PayOS.createPaymentLink()
├── Lưu payment info vào order
└── Trả về paymentUrl

POST /api/payments/webhook
├── Xác minh webhook signature
├── Tìm order theo orderCode
├── Cập nhật status = "paid"
└── Trả về 200 OK
```

### 3. Frontend Flow
```
OrderDetail → Click "Pay with PayOS" → Redirect to PayOS → PayOS redirects to /order-success
```

## 🔍 Debug & Testing

### 1. Check Logs
```bash
# Backend logs
npm run dev

# Look for:
# - "Creating PayOS payment link:"
# - "📩 PayOS webhook received:"
# - "✅ Order status updated to 'paid':"
```

### 2. Test Webhook
```bash
# Test webhook với curl
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 123456789,
      "status": "PAID",
      "amount": 100000
    }
  }'
```

### 3. Common Issues
- **Invalid signature**: Kiểm tra PAYOS_CHECKSUM_KEY
- **Order not found**: Kiểm tra orderCode trong database
- **Payment URL not working**: Kiểm tra PAYOS_CLIENT_ID và PAYOS_API_KEY

## 📚 API Endpoints

### Orders
- `GET /api/orders` - Lấy danh sách orders
- `GET /api/orders/:id` - Lấy chi tiết order
- `POST /api/orders` - Tạo order từ cart
- `POST /api/orders/:id/pay` - Tạo PayOS payment link

### Payments
- `POST /api/payments/webhook` - Nhận webhook từ PayOS

## 🎯 Production Checklist

- [ ] Cập nhật CLIENT_APP_URL cho production
- [ ] Cấu hình webhook URL cho production domain
- [ ] Test toàn bộ luồng thanh toán
- [ ] Kiểm tra SSL certificate
- [ ] Monitor webhook logs

