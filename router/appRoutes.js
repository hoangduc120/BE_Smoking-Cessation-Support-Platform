const express = require("express");
const router = express.Router();

const authRoute = require("./auth.route");
const blogRoute = require("./blog.route");
const userRoute = require("./user.route");
const quitPlanRoute = require("./quitPlan.route");
const badgeRoute = require("./badge.route");
const chatRoute = require("./chatmessage.route");
const surveyRoute = require("./survey.route");

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
  },
  {
    path: "/chat",
    route: chatRoute,
  },
  {
    path: "/surveys",
    route: surveyRoute,
  },
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
