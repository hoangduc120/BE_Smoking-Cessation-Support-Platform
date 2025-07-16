const { StatusCodes } = require('http-status-codes');


const checkActiveUser = (req, res, next) => {
    // Kiểm tra xem user đã được load trong authMiddleware chưa
    if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'User information not found. Please ensure authentication middleware is applied first.',
        });
    }

    // Kiểm tra isActive
    if (!req.user.isActive) {
        return res.status(StatusCodes.FORBIDDEN).json({
            message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin để được hỗ trợ.',
            code: 'ACCOUNT_DEACTIVATED'
        });
    }

    // Kiểm tra isDeleted
    if (req.user.isDeleted) {
        return res.status(StatusCodes.FORBIDDEN).json({
            message: 'Tài khoản của bạn đã bị xóa. Vui lòng liên hệ admin để được hỗ trợ.',
            code: 'ACCOUNT_DELETED'
        });
    }

    next();
};


const checkActiveUserOptional = (options = {}) => {
    const { skipForRoles = [], allowInactive = false } = options;

    return (req, res, next) => {
        // Skip check nếu user có role được miễn trừ
        if (req.role && skipForRoles.includes(req.role)) {
            return next();
        }

        // Nếu allowInactive = true, chỉ cần check isDeleted
        if (allowInactive) {
            if (req.user && req.user.isDeleted) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    message: 'Tài khoản của bạn đã bị xóa.',
                    code: 'ACCOUNT_DELETED'
                });
            }
            return next();
        }

        // Thực hiện check thông thường
        return checkActiveUser(req, res, next);
    };
};

module.exports = {
    checkActiveUser,
    checkActiveUserOptional
}; 