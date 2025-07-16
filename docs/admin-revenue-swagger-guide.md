# Hướng dẫn sử dụng Swagger cho Admin Revenue Analytics

## Tổng quan

Tính năng **Admin Revenue Analytics** cung cấp 4 API endpoints mới để admin có thể xem thống kê doanh thu và membership. Tất cả các endpoints đều đã được tích hợp vào Swagger UI.

## Truy cập Swagger UI

1. **Khởi động server:**
   ```bash
   cd BE_Smoking-Cessation-Support-Platform
   npm start
   ```

2. **Truy cập Swagger UI:**
   ```
   http://localhost:3000/api-docs
   ```

## Xác thực (Authentication)

Tất cả endpoints yêu cầu **JWT token** của admin:

### Bước 1: Đăng nhập để lấy token
1. Mở Swagger UI
2. Tìm endpoint `POST /auth/login`
3. Nhập thông tin admin:
   ```json
   {
     "email": "admin@example.com",
     "password": "admin123"
   }
   ```
4. Copy `access_token` từ response

### Bước 2: Cấu hình Bearer Token
1. Click nút **"Authorize"** ở góc trên bên phải
2. Nhập token theo format: `Bearer your_token_here`
3. Click **"Authorize"**

## 4 Endpoints Revenue Analytics

### 1. 📊 **Tổng doanh thu** - `/admin/revenue/total`

**Endpoint:** `GET /admin/revenue/total`

**Mô tả:** Lấy tổng doanh thu từ việc mua gói membership

**Cách test:**
1. Tìm section **"Admin - Revenue Analytics"**
2. Click endpoint `GET /admin/revenue/total`
3. Click **"Try it out"**
4. Click **"Execute"**

**Response mẫu:**
```json
{
  "success": true,
  "message": "Lấy thống kê doanh thu thành công",
  "data": {
    "totalRevenue": 50000000,
    "totalTransactions": 250,
    "membershipRevenue": 45000000,
    "membershipSales": 180,
    "paymentMethodBreakdown": [
      {
        "_id": "momo",
        "revenue": 25000000,
        "transactions": 120
      },
      {
        "_id": "vnpay",
        "revenue": 20000000,
        "transactions": 130
      }
    ]
  }
}
```

### 2. 🏆 **Thống kê gói membership** - `/admin/revenue/membership-stats`

**Endpoint:** `GET /admin/revenue/membership-stats`

**Mô tả:** Xem gói membership nào được mua nhiều nhất

**Cách test:**
1. Tìm endpoint `GET /admin/revenue/membership-stats`
2. Click **"Try it out"**
3. Click **"Execute"**

**Response mẫu:**
```json
{
  "success": true,
  "message": "Lấy thống kê gói membership thành công",
  "data": {
    "orderStatistics": [...],
    "membershipStatistics": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "planName": "Pro",
        "planPrice": 200000,
        "totalSubscriptions": 120,
        "totalRevenue": 24000000
      }
    ],
    "mostPopularPlan": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "planName": "Pro",
      "totalSubscriptions": 120,
      "totalRevenue": 24000000
    }
  }
}
```

### 3. 📈 **Doanh thu theo thời gian** - `/admin/revenue/by-period`

**Endpoint:** `GET /admin/revenue/by-period`

**Mô tả:** Xem doanh thu theo khoảng thời gian

**Parameters:**
- `startDate` (required): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (required): Ngày kết thúc (YYYY-MM-DD)  
- `groupBy` (optional): Nhóm theo thời gian (day, week, month, year)

**Cách test:**
1. Tìm endpoint `GET /admin/revenue/by-period`
2. Click **"Try it out"**
3. Nhập parameters:
   - `startDate`: 2024-01-01
   - `endDate`: 2024-12-31
   - `groupBy`: month
4. Click **"Execute"**

**Response mẫu:**
```json
{
  "success": true,
  "message": "Lấy thống kê doanh thu theo thời gian thành công",
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "groupBy": "month"
    },
    "revenueByPeriod": [
      {
        "_id": { "year": 2024, "month": 6 },
        "totalRevenue": 5000000,
        "totalTransactions": 25,
        "averageTransactionValue": 200000
      }
    ],
    "summary": {
      "totalRevenue": 50000000,
      "totalTransactions": 250,
      "totalSubscriptions": 180
    }
  }
}
```

### 4. 💳 **Thống kê thanh toán** - `/admin/revenue/payment-stats`

**Endpoint:** `GET /admin/revenue/payment-stats`

**Mô tả:** Xem thống kê chi tiết về thanh toán

**Cách test:**
1. Tìm endpoint `GET /admin/revenue/payment-stats`
2. Click **"Try it out"**
3. Click **"Execute"**

**Response mẫu:**
```json
{
  "success": true,
  "message": "Lấy thống kê thanh toán thành công",
  "data": {
    "paymentStatusBreakdown": [
      {
        "_id": "success",
        "count": 250,
        "totalAmount": 50000000
      },
      {
        "_id": "failed",
        "count": 25,
        "totalAmount": 5000000
      }
    ],
    "paymentMethodBreakdown": [
      {
        "_id": "momo",
        "count": 120,
        "totalAmount": 25000000,
        "averageAmount": 208333
      }
    ],
    "totalPayments": 275,
    "successfulPayments": 250,
    "failedPaymentsCount": 25
  }
}
```

## Schemas (Data Models)

Swagger đã bao gồm 4 schemas mới:

1. **`AdminRevenueStatsResponse`** - Response cho tổng doanh thu
2. **`AdminMembershipStatsResponse`** - Response cho thống kê membership
3. **`AdminRevenueByPeriodResponse`** - Response cho doanh thu theo thời gian
4. **`AdminPaymentStatsResponse`** - Response cho thống kê thanh toán

## Các trường hợp lỗi phổ biến

### 1. **401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Giải pháp:** Kiểm tra JWT token đã được cung cấp chưa

### 2. **403 Forbidden**
```json
{
  "success": false,
  "message": "Forbidden - Admin role required"
}
```
**Giải pháp:** Đảm bảo tài khoản có role `admin`

### 3. **400 Bad Request** (cho `/admin/revenue/by-period`)
```json
{
  "success": false,
  "message": "startDate và endDate là bắt buộc"
}
```
**Giải pháp:** Cung cấp đầy đủ startDate và endDate

### 4. **400 Bad Request** (cho groupBy)
```json
{
  "success": false,
  "message": "groupBy phải là: day, week, month, hoặc year"
}
```
**Giải pháp:** Sử dụng đúng giá trị groupBy

## Test Cases đề xuất

### Test Case 1: Kiểm tra tổng doanh thu
```bash
curl -X GET "http://localhost:3000/admin/revenue/total" \
  -H "Authorization: Bearer your_token_here"
```

### Test Case 2: Xem gói membership phổ biến nhất
```bash
curl -X GET "http://localhost:3000/admin/revenue/membership-stats" \
  -H "Authorization: Bearer your_token_here"
```

### Test Case 3: Doanh thu theo tháng
```bash
curl -X GET "http://localhost:3000/admin/revenue/by-period?startDate=2024-01-01&endDate=2024-12-31&groupBy=month" \
  -H "Authorization: Bearer your_token_here"
```

### Test Case 4: Thống kê thanh toán
```bash
curl -X GET "http://localhost:3000/admin/revenue/payment-stats" \
  -H "Authorization: Bearer your_token_here"
```

## Lưu ý quan trọng

1. **Bảo mật:** Tất cả endpoints chỉ dành cho admin
2. **Performance:** Các query sử dụng MongoDB aggregation để tối ưu hiệu suất
3. **Data Format:** Tất cả số tiền được trả về bằng VND (không có decimal)
4. **Timezone:** Thời gian sử dụng UTC
5. **Pagination:** Hiện tại chưa có pagination, sẽ thêm nếu cần thiết

## Troubleshooting

### 1. Server không khởi động được
```bash
# Kiểm tra dependencies
npm install

# Kiểm tra MongoDB connection
# Đảm bảo MongoDB đang chạy
```

### 2. Swagger UI không hiển thị endpoints mới
```bash
# Restart server
npm start

# Clear browser cache
Ctrl + F5 (Windows) / Cmd + R (Mac)
```

### 3. Không có dữ liệu trả về
- Kiểm tra có payments/orders trong database không
- Kiểm tra PaymentStatus = 'success' và OrderStatus = 'completed'

## Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra server logs
2. Kiểm tra MongoDB connection
3. Verify JWT token và admin role
4. Check network connectivity

---

**Tài liệu này cung cấp hướng dẫn chi tiết để sử dụng Swagger cho tính năng Admin Revenue Analytics. Tất cả endpoints đều đã sẵn sàng để test và sử dụng!** 