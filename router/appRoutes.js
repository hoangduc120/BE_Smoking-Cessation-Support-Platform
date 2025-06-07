const express = require("express");
const router = express.Router();

const authRoute = require("./auth.route");
const blogRoute = require("./blog.route");
const userRoute = require("./user.route");
const quitPlanRoute = require("./quitPlan.route");
const badgeRoute = require("./badge.route");
const chatRoute = require("./chatmessage.route");
const surveyRoute = require("./survey.route");
const memberShipPlanRoute = require("./memberShipPlan.route");
const userMemberShipRoute = require("./userMemberShip.route");
const paymentRoute = require("./payment.route");
const quitProgressRoute = require("./quitProgress.route");
const planMonitorRoute = require("./planMonitor.route");

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
  {
    path: "/packages",
    route: memberShipPlanRoute,
  },
  {
    path: "/memberships",
    route: userMemberShipRoute,
  },
  {
    path: "/payment",
    route: paymentRoute,
  },
  {
    path: "/quitprogress",
    route: quitProgressRoute,
  },
  {
    path: "/monitor",
    route: planMonitorRoute,
  },
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
