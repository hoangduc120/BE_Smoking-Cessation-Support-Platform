# Hệ thống Gói Thành viên (Membership System)

## Tổng quan
Hệ thống gói thành viên cho phép user trải nghiệm và nâng cấp các tính năng trên platform hỗ trợ cai thuốc lá.

## Các gói thành viên

### 1. Gói Base (Miễn phí)
- **Giá**: Miễn phí
- **Thời hạn**: Vĩnh viễn
- **Tính năng**:
  - `basic_features`: Các tính năng cơ bản
  - `community_access`: Truy cập cộng đồng
- **Giới hạn**:
  - Blog: Tối đa 2 bài/ngày
  - Quit Plan: Tối đa 1 kế hoạch đang hoạt động
  - Không có Custom Quit Plan

### 2. Gói Pro
- **Giá**: 99,000 VND/tháng
- **Thời hạn**: 30 ngày
- **Tính năng**:
  - Tất cả tính năng của Base
  - `unlimited_blog_posts`: Đăng blog không giới hạn
  - `advanced_quit_plans`: Kế hoạch cai thuốc nâng cao
  - `priority_support`: Hỗ trợ ưu tiên
  - `analytics_dashboard`: Bảng phân tích
  - `coach_interaction`: Tương tác với coach
- **Giới hạn**:
  - Blog: Không giới hạn
  - Quit Plan: Tối đa 3 kế hoạch đang hoạt động
  - Không có Custom Quit Plan

### 3. Gói Premium
- **Giá**: 199,000 VND/tháng
- **Thời hạn**: 30 ngày
- **Tính năng**:
  - Tất cả tính năng của Pro
  - `custom_quit_plan`: Tạo kế hoạch cai thuốc tùy chỉnh
- **Giới hạn**:
  - Blog: Không giới hạn
  - Quit Plan: Tối đa 5 kế hoạch đang hoạt động
  - Có Custom Quit Plan

## API Endpoints

### 1. Đăng ký gói thành viên
```http
POST /api/user-membership/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id",
  "packageId": "package_id",
  "durationType": "month" // hoặc "week"
}
```

### 2. Kích hoạt gói sau thanh toán
```http
PUT /api/user-membership/activate/:membershipId
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentInfo": {
    "orderId": "order_123",
    "transactionId": "trans_456",
    "amount": 99000,
    "bankCode": "NCB"
  }
}
```

### 3. Lấy thông tin chi tiết gói của user
```http
GET /api/user-membership/details/:userId
Authorization: Bearer <token>
```

### 4. Kiểm tra quyền truy cập tính năng
```http
GET /api/user-membership/access/:userId/:feature
Authorization: Bearer <token>
```

### 5. Lấy lịch sử gói thành viên
```http
GET /api/user-membership/history/:userId
Authorization: Bearer <token>
```

### 6. Lấy gói có thể nâng cấp
```http
GET /api/user-membership/upgrade-options/:userId
Authorization: Bearer <token>
```

## Middleware bảo vệ tính năng

### 1. Kiểm tra quyền truy cập tính năng
```javascript
const { checkFeatureAccess } = require('../middlewares/membershipMiddleware');

// Bảo vệ route yêu cầu tính năng cụ thể
router.post('/advanced-feature', 
  authMiddleware,
  checkFeatureAccess(['advanced_quit_plans']),
  controller.advancedFeature
);
```

### 2. Kiểm tra giới hạn blog
```javascript
const { checkBlogPostLimit } = require('../middlewares/membershipMiddleware');

// Bảo vệ route tạo blog
router.post('/blogs', 
  authMiddleware,
  checkBlogPostLimit,
  blogController.createBlog
);
```

### 3. Kiểm tra quyền Custom Quit Plan
```javascript
const { checkCustomQuitPlanAccess } = require('../middlewares/membershipMiddleware');

// Bảo vệ route Custom Quit Plan (chỉ Premium)
router.post('/custom-quit-plan', 
  authMiddleware,
  checkCustomQuitPlanAccess,
  planController.createCustomPlan
);
```

## Quy trình hoạt động

### 1. User đăng ký gói mới
1. User chọn gói Pro/Premium
2. Gọi API `/register` → Tạo record với status `pending`
3. User được chuyển đến trang thanh toán
4. Sau khi thanh toán thành công → Gọi API `/activate`
5. Gói được kích hoạt với status `paid`

### 2. Kiểm tra quyền truy cập
1. User truy cập tính năng được bảo vệ
2. Middleware kiểm tra gói hiện tại của user
3. So sánh với yêu cầu của tính năng
4. Cho phép hoặc từ chối truy cập

### 3. Hết hạn gói
1. Scheduler chạy mỗi giờ kiểm tra gói hết hạn
2. Cập nhật status từ `paid` → `expired`
3. User tự động quay về gói Base

## Tính năng nâng cao

### 1. Tự động cập nhật gói hết hạn
```javascript
const UserMemberShipService = require('./services/userMemberShip.service');

// Chạy mỗi giờ
setInterval(async () => {
  await UserMemberShipService.checkAndUpdateExpiredMemberships();
}, 60 * 60 * 1000);
```

### 2. Thông báo gói sắp hết hạn
```javascript
// Lấy danh sách gói sắp hết hạn (7 ngày)
const expiringSoon = await UserMembership.find({
  paymentStatus: 'paid',
  endDate: {
    $gte: new Date(),
    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
});
```

### 3. Kiểm tra khả năng nâng cấp
```javascript
const canUpgrade = await UserMemberShipService.canUpgradePlan(userId, targetPlanId);
if (canUpgrade.canUpgrade) {
  // Cho phép nâng cấp
} else {
  // Hiển thị lý do không thể nâng cấp
}
```

## Cách tích hợp vào Frontend

### 1. Kiểm tra trạng thái gói
```javascript
const checkMembershipStatus = async (userId) => {
  const response = await fetch(`/api/user-membership/details/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  
  if (data.success) {
    return data.data; // Thông tin chi tiết gói
  }
};
```

### 2. Xử lý lỗi không có quyền
```javascript
// Khi API trả về 403
if (response.status === 403) {
  const error = await response.json();
  if (error.upgradeRequired) {
    // Hiển thị popup yêu cầu nâng cấp
    showUpgradeModal(error.currentPlan, error.requiredFeatures);
  }
}
```

### 3. Hiển thị gói hiện tại
```javascript
const MembershipBadge = ({ userMembership }) => {
  const { currentPlan, daysLeft, isExpiringSoon } = userMembership;
  
  return (
    <div className={`badge ${currentPlan.name.toLowerCase()}`}>
      <span>{currentPlan.name}</span>
      {daysLeft > 0 && (
        <span className={isExpiringSoon ? 'warning' : ''}>
          {daysLeft} ngày còn lại
        </span>
      )}
    </div>
  );
};
```

## Lưu ý quan trọng

1. **Bảo mật**: Luôn kiểm tra quyền ở backend, không tin tưởng frontend
2. **Performance**: Cache thông tin gói để tránh query database liên tục
3. **User Experience**: Hiển thị rõ ràng lý do tại sao user cần nâng cấp
4. **Thanh toán**: Đảm bảo xử lý thanh toán an toàn và reliable
5. **Notification**: Thông báo trước khi gói sắp hết hạn 