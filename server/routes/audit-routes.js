const express = require('express');
const DeploymentAudit = require('../models/DeploymentAudit');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');

/**
 * @title Audit Routes
 * @author SoroMint Team
 * @notice Handles querying of deployment audit logs
 * @dev Provides endpoints for both users and admins
 */

const router = express.Router();

/**
 * @route GET /api/deployments/logs
 * @group Audit - Audit log operations
 * @description Get deployment logs for the authenticated user
 * @access Private
 * @security [JWT]
 */
router.get('/logs', authenticate, asyncHandler(async (req, res) => {
  const logs = await DeploymentAudit.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  
  res.json(logs);
}));

/**
 * @route GET /api/admin/deployments/logs
 * @group Audit - Audit log operations
 * @description Get all deployment logs (Admin only)
 * @access Private/Admin
 * @security [JWT]
 */
router.get('/admin/logs', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { status, userId, tokenName } = req.query;
  const filter = {};
  
  if (status) filter.status = status;
  if (userId) filter.userId = userId;
  if (tokenName) filter.tokenName = new RegExp(tokenName, 'i');
  
  const logs = await DeploymentAudit.find(filter)
    .populate('userId', 'publicKey username')
    .sort({ createdAt: -1 })
    .limit(100);
  
  res.json(logs);
}));

module.exports = router;
