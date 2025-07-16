# Admin Revenue Analytics - Swagger Summary

## 🚀 Quick Access

**Swagger UI:** `http://localhost:3000/api-docs`

**Authentication:** Bearer Token (Admin role required)

## 📊 4 Endpoints trong Swagger

### 1. **GET /admin/revenue/total**
- **Tag:** `Admin - Revenue Analytics`
- **Mô tả:** Tổng doanh thu từ việc mua gói membership
- **Auth:** ✅ Bearer Token (Admin)
- **Parameters:** Không
- **Response:** `AdminRevenueStatsResponse`

### 2. **GET /admin/revenue/membership-stats**  
- **Tag:** `Admin - Revenue Analytics`
- **Mô tả:** Thống kê gói membership được mua nhiều nhất
- **Auth:** ✅ Bearer Token (Admin)
- **Parameters:** Không
- **Response:** `AdminMembershipStatsResponse`

### 3. **GET /admin/revenue/by-period**
- **Tag:** `Admin - Revenue Analytics`
- **Mô tả:** Doanh thu theo thời gian
- **Auth:** ✅ Bearer Token (Admin)
- **Parameters:** 
  - `startDate` (required): YYYY-MM-DD
  - `endDate` (required): YYYY-MM-DD
  - `groupBy` (optional): day, week, month, year
- **Response:** `AdminRevenueByPeriodResponse`

### 4. **GET /admin/revenue/payment-stats**
- **Tag:** `Admin - Revenue Analytics`
- **Mô tả:** Thống kê thanh toán chi tiết
- **Auth:** ✅ Bearer Token (Admin)
- **Parameters:** Không
- **Response:** `AdminPaymentStatsResponse`

## 📋 Response Schemas

| Schema | Mô tả |
|--------|--------|
| `AdminRevenueStatsResponse` | Tổng doanh thu và breakdown theo phương thức thanh toán |
| `AdminMembershipStatsResponse` | Thống kê gói membership, gói phổ biến nhất |
| `AdminRevenueByPeriodResponse` | Doanh thu theo thời gian với grouping |
| `AdminPaymentStatsResponse` | Thống kê thanh toán theo status và method |

## 🔧 Cách test nhanh

1. **Khởi động server:** `npm start`
2. **Truy cập:** `http://localhost:3000/api-docs`
3. **Đăng nhập admin:** `POST /auth/login`
4. **Copy token và Authorize**
5. **Tìm section:** `Admin - Revenue Analytics`
6. **Test từng endpoint**

## ⚡ Test Commands

```bash
# Tổng doanh thu
curl -X GET "http://localhost:3000/admin/revenue/total" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Thống kê membership
curl -X GET "http://localhost:3000/admin/revenue/membership-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Doanh thu theo tháng
curl -X GET "http://localhost:3000/admin/revenue/by-period?startDate=2024-01-01&endDate=2024-12-31&groupBy=month" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Thống kê thanh toán
curl -X GET "http://localhost:3000/admin/revenue/payment-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 Key Features

- ✅ **Tổng doanh thu** từ payments và memberships
- ✅ **Gói membership phổ biến nhất** với thống kê chi tiết
- ✅ **Doanh thu theo thời gian** (ngày/tuần/tháng/năm)
- ✅ **Thống kê thanh toán** theo status và method
- ✅ **Phân tích thất bại** và doanh thu bị mất
- ✅ **Breakdown theo phương thức** thanh toán
- ✅ **Authentication & Authorization** đầy đủ

---

**Tất cả đã sẵn sàng trong Swagger UI! 🎉** 