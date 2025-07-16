/**
 * Admin Revenue Analytics Test Script
 * 
 * Script để test tất cả các endpoints revenue analytics
 * Sử dụng để kiểm tra Swagger documentation và API functionality
 */

const axios = require('axios');

// Cấu hình
const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
    email: 'admin@example.com',
    password: 'admin123'
};

class AdminRevenueTest {
    constructor() {
        this.token = null;
        this.baseURL = BASE_URL;
    }

    /**
     * Đăng nhập admin và lấy token
     */
    async login() {
        try {
            console.log('🔐 Đang đăng nhập admin...');

            const response = await axios.post(`${this.baseURL}/auth/login`, ADMIN_CREDENTIALS);

            if (response.data.success) {
                this.token = response.data.data.access_token;
                console.log('✅ Đăng nhập thành công!');
                console.log(`Token: ${this.token.substring(0, 20)}...`);
                return true;
            } else {
                console.error('❌ Đăng nhập thất bại:', response.data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Lỗi đăng nhập:', error.response?.data?.message || error.message);
            return false;
        }
    }

    /**
     * Tạo headers với Bearer token
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Test endpoint: GET /admin/revenue/total
     */
    async testTotalRevenue() {
        try {
            console.log('\n📊 Test: Tổng doanh thu');
            console.log('Endpoint: GET /admin/revenue/total');

            const response = await axios.get(`${this.baseURL}/admin/revenue/total`, {
                headers: this.getHeaders()
            });

            if (response.data.success) {
                console.log('✅ Thành công!');
                console.log('Dữ liệu:', JSON.stringify(response.data.data, null, 2));
            } else {
                console.log('❌ Thất bại:', response.data.message);
            }
        } catch (error) {
            console.error('❌ Lỗi:', error.response?.data?.message || error.message);
        }
    }

    /**
     * Test endpoint: GET /admin/revenue/membership-stats
     */
    async testMembershipStats() {
        try {
            console.log('\n🏆 Test: Thống kê gói membership');
            console.log('Endpoint: GET /admin/revenue/membership-stats');

            const response = await axios.get(`${this.baseURL}/admin/revenue/membership-stats`, {
                headers: this.getHeaders()
            });

            if (response.data.success) {
                console.log('✅ Thành công!');
                console.log('Gói phổ biến nhất:', response.data.data.mostPopularPlan);
                console.log('Tổng thống kê:', response.data.data.totalStats);
            } else {
                console.log('❌ Thất bại:', response.data.message);
            }
        } catch (error) {
            console.error('❌ Lỗi:', error.response?.data?.message || error.message);
        }
    }

    /**
     * Test endpoint: GET /admin/revenue/by-period
     */
    async testRevenueByPeriod() {
        try {
            console.log('\n📈 Test: Doanh thu theo thời gian');
            console.log('Endpoint: GET /admin/revenue/by-period');

            const params = {
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                groupBy: 'month'
            };

            const response = await axios.get(`${this.baseURL}/admin/revenue/by-period`, {
                headers: this.getHeaders(),
                params: params
            });

            if (response.data.success) {
                console.log('✅ Thành công!');
                console.log('Khoảng thời gian:', response.data.data.period);
                console.log('Tổng kết:', response.data.data.summary);
            } else {
                console.log('❌ Thất bại:', response.data.message);
            }
        } catch (error) {
            console.error('❌ Lỗi:', error.response?.data?.message || error.message);
        }
    }

    /**
     * Test endpoint: GET /admin/revenue/payment-stats
     */
    async testPaymentStats() {
        try {
            console.log('\n💳 Test: Thống kê thanh toán');
            console.log('Endpoint: GET /admin/revenue/payment-stats');

            const response = await axios.get(`${this.baseURL}/admin/revenue/payment-stats`, {
                headers: this.getHeaders()
            });

            if (response.data.success) {
                console.log('✅ Thành công!');
                console.log('Tổng thanh toán:', response.data.data.totalPayments);
                console.log('Thanh toán thành công:', response.data.data.successfulPayments);
                console.log('Thanh toán thất bại:', response.data.data.failedPaymentsCount);
            } else {
                console.log('❌ Thất bại:', response.data.message);
            }
        } catch (error) {
            console.error('❌ Lỗi:', error.response?.data?.message || error.message);
        }
    }

    /**
     * Test với parameters không hợp lệ
     */
    async testInvalidParameters() {
        try {
            console.log('\n⚠️ Test: Parameters không hợp lệ');
            console.log('Endpoint: GET /admin/revenue/by-period (thiếu startDate)');

            const response = await axios.get(`${this.baseURL}/admin/revenue/by-period`, {
                headers: this.getHeaders(),
                params: {
                    endDate: '2024-12-31'
                    // Thiếu startDate
                }
            });

            console.log('❌ Không nên thành công:', response.data);
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('✅ Validation đúng! Lỗi 400:', error.response.data.message);
            } else {
                console.error('❌ Lỗi không mong muốn:', error.response?.data?.message || error.message);
            }
        }
    }

    /**
     * Test không có token
     */
    async testUnauthorized() {
        try {
            console.log('\n🔒 Test: Không có token');
            console.log('Endpoint: GET /admin/revenue/total (no token)');

            const response = await axios.get(`${this.baseURL}/admin/revenue/total`);

            console.log('❌ Không nên thành công:', response.data);
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Authentication đúng! Lỗi 401:', error.response.data.message);
            } else {
                console.error('❌ Lỗi không mong muốn:', error.response?.data?.message || error.message);
            }
        }
    }

    /**
     * Chạy tất cả tests
     */
    async runAllTests() {
        console.log('🚀 Bắt đầu test Admin Revenue Analytics APIs\n');
        console.log('='.repeat(60));

        // Đăng nhập
        const loginSuccess = await this.login();
        if (!loginSuccess) {
            console.log('❌ Không thể đăng nhập. Dừng test.');
            return;
        }

        // Test các endpoints
        await this.testTotalRevenue();
        await this.testMembershipStats();
        await this.testRevenueByPeriod();
        await this.testPaymentStats();

        // Test edge cases
        await this.testInvalidParameters();
        await this.testUnauthorized();

        console.log('\n' + '='.repeat(60));
        console.log('🎉 Hoàn thành tất cả tests!');
        console.log('📋 Kiểm tra kết quả ở trên để đảm bảo các API hoạt động đúng.');
    }
}

// Chạy test
async function main() {
    const tester = new AdminRevenueTest();
    await tester.runAllTests();
}

// Export để có thể sử dụng như module
module.exports = AdminRevenueTest;

// Chạy trực tiếp nếu gọi file này
if (require.main === module) {
    main().catch(console.error);
} 