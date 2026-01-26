const express = require("express");
const matterController = require("../controllers/matterController");
const { protect, restrictTo } = require("../controllers/authController");

const matterRouter = express.Router();

// ============================================
// MIDDLEWARE
// ============================================

// Protect all routes (require authentication)
matterRouter.use(protect);

// ============================================
// DASHBOARD & STATISTICS
// ============================================

/**
 * @route   GET /api/matters/stats
 * @desc    Get matter statistics for dashboard
 * @access  Private (All authenticated users)
 */
matterRouter.get("/stats", matterController.getMatterStats);

// ============================================
// MY MATTERS (User-specific queries)
// ============================================

/**
 * @route   GET /api/matters/my-matters
 * @desc    Get matters assigned to the logged-in user
 * @access  Private (All authenticated users)
 * @query   page, limit, sort, status, priority, matterType, search, startDate, endDate
 * @example GET /api/matters/my-matters?page=1&limit=20&status=active&priority=high
 */
matterRouter.get("/my-matters", matterController.getMyMatters);

// ============================================
// STANDARD CRUD OPERATIONS
// ============================================

/**
 * @route   GET /api/matters
 * @desc    Get all matters with filtering, sorting, and pagination
 * @access  Private (All authenticated users)
 * @query   page, limit, sort, populate, select, debug, includeStats,
 *          matterType, status, priority, client, accountOfficer,
 *          search, startDate, endDate, includeDeleted, onlyDeleted
 * @example GET /api/matters?page=1&limit=50&matterType=litigation&status=active
 */
matterRouter.get("/", matterController.getAllMatters);

/**
 * @route   POST /api/matters
 * @desc    Create a new matter (any type)
 * @access  Private (Admin, Lawyer, HR only)
 * @body    matterType, title, description, client, accountOfficer,
 *          status, priority, natureOfMatter, detailData (type-specific)
 * @example POST /api/matters
 *          {
 *            "matterType": "litigation",
 *            "title": "Smith vs. Jones Contract Dispute",
 *            "client": "507f1f77bcf86cd799439011",
 *            "accountOfficer": "507f1f77bcf86cd799439012",
 *            "status": "active",
 *            "priority": "high",
 *            "detailData": {
 *              "suitNo": "CV/2024/123",
 *              "courtName": "High Court Lagos"
 *            }
 *          }
 */
matterRouter.post(
  "/",
  restrictTo("admin", "lawyer", "hr"),
  matterController.createMatter,
);

/**
 * @route   GET /api/matters/:id
 * @desc    Get single matter by ID with full details
 * @access  Private (All authenticated users)
 * @param   id - Matter ID
 * @query   include - Comma-separated related entities to populate (documents, tasks, events, invoices, reports)
 * @example GET /api/matters/507f1f77bcf86cd799439013?include=documents,tasks
 */
matterRouter.get("/:id", matterController.getMatter);

/**
 * @route   PATCH /api/matters/:id
 * @desc    Update matter (core fields only)
 * @access  Private (Admin, Lawyer, HR only)
 * @param   id - Matter ID
 * @body    title, description, status, priority, natureOfMatter, accountOfficer, detailData
 * @example PATCH /api/matters/507f1f77bcf86cd799439013
 *          {
 *            "status": "completed",
 *            "priority": "normal",
 *            "detailData": {
 *              "judgmentDate": "2024-12-15"
 *            }
 *          }
 */
matterRouter.patch(
  "/:id",
  restrictTo("admin", "lawyer", "hr"),
  matterController.updateMatter,
);

/**
 * @route   DELETE /api/matters/:id
 * @desc    Soft delete a matter
 * @access  Private (Admin, Lawyer only)
 * @param   id - Matter ID
 * @example DELETE /api/matters/507f1f77bcf86cd799439013
 */
matterRouter.delete(
  "/:id",
  restrictTo("admin", "lawyer"),
  matterController.deleteMatter,
);

// ============================================
// ADVANCED SEARCH & QUERYING
// ============================================

/**
 * @route   POST /api/matters/search
 * @desc    Advanced search for matters with complex criteria
 * @access  Private (All authenticated users)
 * @body    criteria (MongoDB query), options (pagination, sorting)
 * @example POST /api/matters/search
 *          {
 *            "criteria": {
 *              "status": "active",
 *              "priority": { "$in": ["high", "urgent"] },
 *              "dateOpened": {
 *                "$gte": "2024-01-01",
 *                "$lte": "2024-12-31"
 *              }
 *            },
 *            "options": {
 *              "page": 1,
 *              "limit": 50,
 *              "sort": "-dateOpened",
 *              "populate": "client,accountOfficer",
 *              "includeStats": true
 *            }
 *          }
 */
matterRouter.post("/search", matterController.searchMatters);

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * @route   PATCH /api/matters/bulk-update
 * @desc    Update multiple matters at once
 * @access  Private (Admin, Lawyer only)
 * @body    matterIds (array), updates (object)
 * @example PATCH /api/matters/bulk-update
 *          {
 *            "matterIds": ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"],
 *            "updates": {
 *              "status": "completed",
 *              "priority": "normal"
 *            }
 *          }
 */
matterRouter.patch(
  "/bulk-update",
  restrictTo("admin", "lawyer"),
  matterController.bulkUpdateMatters,
);

// ============================================
// RECYCLE BIN & RESTORATION
// ============================================

/**
 * @route   PATCH /api/matters/:id/restore
 * @desc    Restore a soft-deleted matter
 * @access  Private (Admin, Lawyer only)
 * @param   id - Matter ID
 * @example PATCH /api/matters/507f1f77bcf86cd799439013/restore
 */
matterRouter.patch(
  "/:id/restore",
  restrictTo("admin", "lawyer"),
  matterController.restoreMatter,
);

// ============================================
// MATTER-TYPE SPECIFIC QUERIES (Optional - can be expanded)
// ============================================

/**
 * @route   GET /api/matters/type/:matterType
 * @desc    Get matters by specific type
 * @access  Private (All authenticated users)
 * @param   matterType - litigation, corporate, advisory, property, retainer, general
 * @query   Standard pagination and filtering parameters
 * @example GET /api/matters/type/litigation?status=active&page=1&limit=20
 */
// Note: This endpoint can be implemented in the controller if needed
// matterRouter.get("/type/:matterType", matterController.getMattersByType);

/**
 * @route   GET /api/matters/status/:status
 * @desc    Get matters by specific status
 * @access  Private (All authenticated users)
 * @param   status - active, pending, completed, closed
 * @query   Standard pagination and filtering parameters
 * @example GET /api/matters/status/active?matterType=litigation&page=1&limit=20
 */
// Note: This endpoint can be implemented in the controller if needed
// matterRouter.get("/status/:status", matterController.getMattersByStatus);

// ============================================
// FILTERING SHORTCUTS
// ============================================

/**
 * @route   GET /api/matters/pending
 * @desc    Get all pending matters (status = pending)
 * @access  Private (All authenticated users)
 * @query   Standard pagination parameters
 * @example GET /api/matters/pending?page=1&limit=20
 */
// Note: This endpoint can be implemented in the controller if needed
// matterRouter.get("/pending", matterController.getPendingMatters);

/**
 * @route   GET /api/matters/urgent
 * @desc    Get all urgent matters (priority = urgent or high)
 * @access  Private (All authenticated users)
 * @query   Standard pagination parameters
 * @example GET /api/matters/urgent?page=1&limit=20
 */
// Note: This endpoint can be implemented in the controller if needed
// matterRouter.get("/urgent", matterController.getUrgentMatters);

// ============================================
// ACTIVITY & TIMELINE
// ============================================

/**
 * @route   GET /api/matters/:id/timeline
 * @desc    Get matter activity timeline
 * @access  Private (All authenticated users)
 * @param   id - Matter ID
 * @example GET /api/matters/507f1f77bcf86cd799439013/timeline
 */
// Note: This endpoint can be implemented if you have activity tracking
// matterRouter.get("/:id/timeline", matterController.getMatterTimeline);

/**
 * @route   GET /api/matters/recent-activity
 * @desc    Get recently updated matters
 * @access  Private (All authenticated users)
 * @query   days (default: 7), limit (default: 10)
 * @example GET /api/matters/recent-activity?days=30&limit=20
 */
// Note: This endpoint can be implemented in the controller if needed
// matterRouter.get("/recent-activity", matterController.getRecentActivity);

// ============================================
// EXPORT & REPORTING
// ============================================

/**
 * @route   GET /api/matters/export
 * @desc    Export matters data (CSV, PDF, Excel)
 * @access  Private (Admin, Lawyer only)
 * @query   format (csv, pdf, excel), filters (same as getAllMatters)
 * @example GET /api/matters/export?format=csv&status=active&matterType=litigation
 */
// Note: This endpoint can be implemented in the controller if needed
// matterRouter.get("/export", restrictTo("admin", "lawyer"), matterController.exportMatters);

// ============================================
// VALIDATION & UTILITIES
// ============================================

/**
 * @route   GET /api/matters/validate-matter-number/:matterNumber
 * @desc    Check if matter number is available
 * @access  Private (Admin, Lawyer, HR only)
 * @param   matterNumber - Proposed matter number
 * @example GET /api/matters/validate-matter-number/LIT/2024/001
 */
// Note: This endpoint can be implemented in the controller if needed
// matterRouter.get("/validate-matter-number/:matterNumber", restrictTo("admin", "lawyer", "hr"), matterController.validateMatterNumber);

module.exports = matterRouter;
