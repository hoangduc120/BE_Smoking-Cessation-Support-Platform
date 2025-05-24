const express = require("express");
const router = express.Router();

const authRoute = require("./auth.route");
const blogRoute = require("./blog.route");
const userRoute = require("./user.route");
const quitPlanRoute = require("./quitPlan.route");
const badgeRoute = require("./badge.route");

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
    path: "/users",
    route: userRoute,
  },
  {
    path: "/plans",
    route: quitPlanRoute,
  },
  {
    path: "/badges",
    route: badgeRoute,
  }
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
