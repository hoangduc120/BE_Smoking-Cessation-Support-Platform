const express = require("express");
const router = express.Router();

const authRoute = require("./auth.route");
const blogRoute = require("./blog.route");


const routes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/blogs",
    route: blogRoute,
  },
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
