const express = require('express');

const adminRouter = express.Router();
const adminController = require('../controllers/admin.controller');
const { isLoggedIn, hasNoPermission } = require('../middlewares/middlewares');
adminRouter.get(
  '/cafes',
  isLoggedIn,
  hasNoPermission,
  adminController.getCafeDataIsWaitingPosted,
);

module.exports = adminRouter;
