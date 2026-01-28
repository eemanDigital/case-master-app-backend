const PaginationServiceFactory = require("../services/PaginationServiceFactory");
const modelConfigs = require("../config/modelConfigs");
const Matter = require("../models/matterModel");
const LitigationDetail = require("../models/litigationDetailModel");
const CorporateDetail = require("../models/corporateDetailModel");
const AdvisoryDetail = require("../models/advisoryDetailModel");
const PropertyDetail = require("../models/propertyDetailModel");
const {
  RetainerDetail,
  GeneralDetail,
} = require("../models/retainerAndGeneralDetailModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Initialize pagination service for Matter model
const matterPaginationService = PaginationServiceFactory.createService(
  Matter,
  modelConfigs.Matter,
);

// Map matter types to their detail models
const DETAIL_MODEL_MAP = {
  litigation: LitigationDetail,
  corporate: CorporateDetail,
  advisory: AdvisoryDetail,
  property: PropertyDetail,
  retainer: RetainerDetail,
  general: GeneralDetail,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the appropriate detail model based on matter type
 */
const getDetailModel = (matterType) => {
  return DETAIL_MODEL_MAP[matterType];
};

/**
 * Build query filter with firm isolation
 */
const buildFirmQuery = (req, additionalFilters = {}) => {
  return {
    firmId: req.firmId,
    isDeleted: false,
    ...additionalFilters,
  };
};

/**
 * Populate detail based on matter type
 */
const populateDetailByType = async (matter) => {
  const detailFieldMap = {
    litigation: "litigationDetail",
    corporate: "corporateDetail",
    advisory: "advisoryDetail",
    property: "propertyDetail",
    retainer: "retainerDetail",
    general: "generalDetail",
  };

  const detailField = detailFieldMap[matter.matterType];
  if (detailField) {
    await matter.populate(detailField);
  }
  return matter;
};

// ============================================
// CREATE MATTER
// ============================================

/**
 * @desc    Create a new matter (any type)
 * @route   POST /api/matters
 * @access  Private
 */
exports.createMatter = catchAsync(async (req, res, next) => {
  const { matterType, detailData, ...matterData } = req.body;

  console.log("Creating matter with data:", req.body);

  // Validate matter type
  if (!matterType) {
    return next(new AppError("Matter type is required", 400));
  }

  // Validate detail model exists
  const DetailModel = getDetailModel(matterType);
  if (!DetailModel) {
    return next(new AppError(`Invalid matter type: ${matterType}`, 400));
  }

  try {
    // Create the main Matter document WITHOUT TRANSACTION
    const newMatter = await Matter.create({
      ...matterData,
      matterType,
      firmId: req.firmId,
      createdBy: req.user._id,
    });

    // Create type-specific detail document if data provided
    if (detailData && Object.keys(detailData).length > 0) {
      await DetailModel.create({
        ...detailData,
        matterId: newMatter._id,
        firmId: req.firmId,
        createdBy: req.user._id,
      });
    }

    // Fetch the created matter with details
    const populatedMatter = await Matter.findById(newMatter._id)
      .populate("accountOfficer", "firstName lastName email photo")
      .populate("client", "firstName lastName email phone");

    await populateDetailByType(populatedMatter);

    res.status(201).json({
      status: "success",
      data: {
        matter: populatedMatter,
      },
    });
  } catch (error) {
    console.error("Error creating matter:", error);
    return next(error);
  }
});
// ============================================
// GET ALL MATTERS (Using Pagination Service)
// ============================================

/**
 * @desc    Get all matters with filtering, sorting, pagination
 * @route   GET /api/matters
 * @access  Private
 */
exports.getAllMatters = catchAsync(async (req, res, next) => {
  const {
    // Standard pagination params
    page = 1,
    limit = 50,
    sort = "-dateOpened",
    populate,
    select,
    debug,
    includeStats,

    // Matter-specific filters
    matterType,
    status,
    priority,
    client,
    accountOfficer,

    // Advanced search
    search,
    startDate,
    endDate,

    // Other params
    includeDeleted,
    onlyDeleted,
  } = req.query;

  // Use the pagination service
  const result = await matterPaginationService.paginate(
    {
      page,
      limit,
      sort,
      search,
      populate,
      select,
      debug,
      includeStats,
      matterType,
      status,
      priority,
      client,
      accountOfficer,
      startDate,
      endDate,
      includeDeleted,
      onlyDeleted,
    },
    {}, // customFilter
    req.firmId, // firmId for multi-tenancy
  );

  // Populate type-specific details for each matter if needed
  if (populate && populate.includes("details")) {
    for (const matter of result.data) {
      await populateDetailByType(matter);
    }
  }

  res.status(200).json({
    status: "success",
    ...result,
  });
});

// ============================================
// GET SINGLE MATTER
// ============================================

/**
 * @desc    Get single matter by ID with full details
 * @route   GET /api/matters/:id
 * @access  Private
 */
exports.getMatter = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { include } = req.query;

  // Build query with firm isolation
  let query = Matter.findOne(buildFirmQuery(req, { _id: id }))
    .populate("accountOfficer", "firstName lastName email phone photo role")
    .populate("client", "firstName lastName email phone address")
    .populate("createdBy", "firstName lastName")
    .populate("lastModifiedBy", "firstName lastName");

  // Populate type-specific detail
  const matter = await query;

  if (!matter) {
    return next(new AppError("Matter not found", 404));
  }

  // Populate type-specific details
  await populateDetailByType(matter);

  // Optionally populate related entities
  if (include) {
    const includes = include.split(",");
    const relatedFields = [
      "documents",
      "tasks",
      "events",
      "invoices",
      "reports",
    ];

    for (const field of includes) {
      if (relatedFields.includes(field)) {
        await matter.populate(field);
      }
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      matter,
    },
  });
});

// ============================================
// UPDATE MATTER
// ============================================

/**
 * @desc    Update matter (core fields only)
 * @route   PATCH /api/matters/:id
 * @access  Private
 */
exports.updateMatter = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { detailData, ...matterData } = req.body;

  // Fields that should not be updated directly
  const restrictedFields = [
    "firmId",
    "matterNumber",
    "createdBy",
    "createdAt",
    "matterType", // Changing matter type requires special handling
  ];

  restrictedFields.forEach((field) => delete matterData[field]);

  // Find matter first to get current type
  const existingMatter = await Matter.findOne(buildFirmQuery(req, { _id: id }));

  if (!existingMatter) {
    return next(new AppError("Matter not found", 404));
  }

  const session = await Matter.startSession();
  session.startTransaction();

  try {
    // Update main matter document
    const matter = await Matter.findOneAndUpdate(
      buildFirmQuery(req, { _id: id }),
      {
        ...matterData,
        lastModifiedBy: req.user._id,
        lastActivityDate: Date.now(),
      },
      {
        new: true,
        runValidators: true,
        session,
      },
    );

    // Update type-specific details if provided
    if (detailData && Object.keys(detailData).length > 0) {
      const DetailModel = getDetailModel(existingMatter.matterType);

      if (DetailModel) {
        await DetailModel.findOneAndUpdate(
          { matterId: matter._id, firmId: req.firmId },
          {
            ...detailData,
            lastModifiedBy: req.user._id,
          },
          {
            new: true,
            runValidators: true,
            upsert: true,
            session,
          },
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    // Fetch updated matter with details
    const updatedMatter = await Matter.findById(matter._id)
      .populate("accountOfficer", "firstName lastName email photo")
      .populate("client", "firstName lastName email phone");

    await populateDetailByType(updatedMatter);

    res.status(200).json({
      status: "success",
      data: {
        matter: updatedMatter,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

// ============================================
// DELETE MATTER (SOFT DELETE)
// ============================================

/**
 * @desc    Soft delete a matter
 * @route   DELETE /api/matters/:id
 * @access  Private
 */
exports.deleteMatter = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const session = await Matter.startSession();
  session.startTransaction();

  try {
    const matter = await Matter.findOne(buildFirmQuery(req, { _id: id }));

    if (!matter) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Matter not found", 404));
    }

    // Soft delete the matter
    await matter.softDelete(req.user._id);

    // Soft delete the associated detail
    const DetailModel = getDetailModel(matter.matterType);
    if (DetailModel) {
      await DetailModel.findOneAndUpdate(
        { matterId: matter._id, firmId: req.firmId },
        {
          isDeleted: true,
          deletedAt: Date.now(),
          deletedBy: req.user._id,
        },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

// ============================================
// RESTORE MATTER
// ============================================

/**
 * @desc    Restore a soft-deleted matter
 * @route   PATCH /api/matters/:id/restore
 * @access  Private
 */
exports.restoreMatter = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const session = await Matter.startSession();
  session.startTransaction();

  try {
    const matter = await Matter.findOne({
      firmId: req.firmId,
      _id: id,
      isDeleted: true,
    });

    if (!matter) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Deleted matter not found", 404));
    }

    // Restore the matter
    await matter.restore();

    // Restore the associated detail
    const DetailModel = getDetailModel(matter.matterType);
    if (DetailModel) {
      await DetailModel.findOneAndUpdate(
        { matterId: matter._id, firmId: req.firmId },
        {
          isDeleted: false,
          $unset: { deletedAt: 1, deletedBy: 1 },
        },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      data: {
        matter,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

// ============================================
// GET MATTER STATISTICS (Enhanced)
// ============================================

/**
 * @desc    Get matter statistics for dashboard
 * @route   GET /api/matters/stats
 * @access  Private
 */
exports.getMatterStats = catchAsync(async (req, res, next) => {
  const firmQuery = { firmId: req.firmId, isDeleted: false };

  // Use parallel execution for better performance
  const [overviewStats, typeStats, statusStats, priorityStats, activityStats] =
    await Promise.all([
      // Overview statistics
      Matter.aggregate([
        { $match: firmQuery },
        {
          $group: {
            _id: null,
            totalMatters: { $sum: 1 },
            activeMatters: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            pendingMatters: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            completedMatters: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            closedMatters: {
              $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
            },
            highPriorityMatters: {
              $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
            },
            urgentPriorityMatters: {
              $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] },
            },
            averageAgeDays: {
              $avg: {
                $divide: [
                  { $subtract: [new Date(), "$dateOpened"] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
        },
      ]),

      // Statistics by matter type
      Matter.aggregate([
        { $match: firmQuery },
        {
          $group: {
            _id: "$matterType",
            count: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Statistics by status
      Matter.aggregate([
        { $match: firmQuery },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Statistics by priority
      Matter.aggregate([
        { $match: firmQuery },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Recent activity (last 30 days)
      Matter.aggregate([
        {
          $match: {
            ...firmQuery,
            lastActivityDate: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$lastActivityDate" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 10 },
      ]),
    ]);

  // Get my matters count
  const myMattersCount = await Matter.countDocuments({
    ...firmQuery,
    accountOfficer: req.user._id,
  });

  res.status(200).json({
    status: "success",
    data: {
      overview: overviewStats[0] || {
        totalMatters: 0,
        activeMatters: 0,
        pendingMatters: 0,
        completedMatters: 0,
        closedMatters: 0,
      },
      byType: typeStats,
      byStatus: statusStats,
      byPriority: priorityStats,
      recentActivity: activityStats,
      myMatters: myMattersCount,
    },
  });
});

// ============================================
// GET MY MATTERS (Using Pagination Service)
// ============================================

/**
 * @desc    Get matters assigned to the logged-in user
 * @route   GET /api/matters/my-matters
 * @access  Private
 */
exports.getMyMatters = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 50,
    sort = "-dateOpened",
    populate,
    select,
    debug,
    status,
    priority,
    matterType,
    search,
    startDate,
    endDate,
  } = req.query;

  // Add accountOfficer filter for "my matters"
  const customFilter = {
    accountOfficer: req.user._id,
  };

  // Use pagination service
  const result = await matterPaginationService.paginate(
    {
      page,
      limit,
      sort,
      populate,
      select,
      debug,
      status,
      priority,
      matterType,
      search,
      startDate,
      endDate,
    },
    customFilter,
    req.firmId,
  );

  res.status(200).json({
    status: "success",
    ...result,
  });
});

// ============================================
// SEARCH MATTERS (Advanced)
// ============================================

/**
 * @desc    Advanced search for matters
 * @route   POST /api/matters/search
 * @access  Private
 */
exports.searchMatters = catchAsync(async (req, res, next) => {
  const { criteria = {}, options = {} } = req.body;

  // Add firmId to criteria
  const firmCriteria = {
    ...criteria,
    firmId: req.firmId,
  };

  // Use advanced search from pagination service
  const result = await matterPaginationService.advancedSearch(
    firmCriteria,
    options,
    req.firmId,
  );

  res.status(200).json({
    status: "success",
    ...result,
  });
});

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * @desc    Update multiple matters
 * @route   PATCH /api/matters/bulk-update
 * @access  Private (Admin/Lawyer only)
 */
exports.bulkUpdateMatters = catchAsync(async (req, res, next) => {
  const { matterIds, updates } = req.body;

  if (!matterIds || !Array.isArray(matterIds) || matterIds.length === 0) {
    return next(new AppError("Please provide matter IDs to update", 400));
  }

  if (!updates || Object.keys(updates).length === 0) {
    return next(new AppError("Please provide updates to apply", 400));
  }

  // Restrict certain fields from bulk updates
  const restrictedFields = [
    "firmId",
    "matterNumber",
    "createdBy",
    "createdAt",
    "_id",
  ];

  restrictedFields.forEach((field) => delete updates[field]);

  // Add last modified info
  const finalUpdates = {
    ...updates,
    lastModifiedBy: req.user._id,
    lastActivityDate: Date.now(),
  };

  // Update matters
  const result = await Matter.updateMany(
    {
      _id: { $in: matterIds },
      firmId: req.firmId,
    },
    finalUpdates,
    { runValidators: true },
  );

  res.status(200).json({
    status: "success",
    data: {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    },
  });
});

module.exports = exports;
