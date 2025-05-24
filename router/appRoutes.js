const express = require("express");
const router = express.Router();

const authRoute = require("./auth.route");
const blogRoute = require("./blog.route");
const quitPlanRoute = require("./quitPlan.route"); // 🆕 thêm dòng này
const badgeRoute = require("./badge.route");       // 🆕 nếu có route xem huy hiệu

const routes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/blogs",
    route: blogRoute,
  },
  {
    path: "/plans",         // 🆕 route kế hoạch bỏ thuốc
    route: quitPlanRoute,
  },
  {
    path: "/badges",        // 🆕 route để xem danh sách huy hiệu người dùng (nếu có)
    route: badgeRoute,
  }
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
