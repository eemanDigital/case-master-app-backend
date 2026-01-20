const Matter = require("../models/Matter.model");
const CorporateDetail = require("../models/CorporateDetail.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// ============================================
// CORPORATE-SPECIFIC OPERATIONS
// ============================================

/**
 * @desc    Get all corporate matters
 * @route   GET /api/corporate
 * @access  Private
 */
exports.getAllCorporateMatters = catchAsync(async (req, res, next) => {
  const {
    transactionType,
    companyName,
    status,
    page = 1,
    limit = 50,
    sort = "-dateOpened",
  } = req.query;

  const matterFilter = {
    firmId: req.user.firmId,
    matterType: "corporate",
    isDeleted: false,
  };

  if (status) matterFilter.status = status;

  // Filter by corporate-specific fields if provided
  let matterIds = null;
  if (transactionType || companyName) {
    const detailFilter = { firmId: req.user.firmId };
    if (transactionType) detailFilter.transactionType = transactionType;
    if (companyName)
      detailFilter.companyName = { $regex: companyName, $options: "i" };

    const corporateDetails =
      await CorporateDetail.find(detailFilter).select("matterId");
    matterIds = corporateDetails.map((d) => d.matterId);
    matterFilter._id = { $in: matterIds };
  }

  const skip = (page - 1) * limit;

  const matters = await Matter.find(matterFilter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .populate("accountOfficer", "firstName lastName email photo")
    .populate("client", "firstName lastName email phone")
    .populate("corporateDetail");

  const total = await Matter.countDocuments(matterFilter);

  res.status(200).json({
    status: "success",
    results: matters.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
    data: {
      matters,
    },
  });
});

// ============================================
// ADD MILESTONE
// ============================================

/**
 * @desc    Add milestone to corporate transaction
 * @route   POST /api/corporate/:matterId/milestones
 * @access  Private
 */
exports.addMilestone = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const milestoneData = req.body;

  const matter = await Matter.findOne({
    _id: matterId,
    firmId: req.user.firmId,
    matterType: "corporate",
    isDeleted: false,
  });

  if (!matter) {
    return next(new AppError("Corporate matter not found", 404));
  }

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { milestones: milestoneData },
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// UPDATE MILESTONE
// ============================================

/**
 * @desc    Update milestone status
 * @route   PATCH /api/corporate/:matterId/milestones/:milestoneId
 * @access  Private
 */
exports.updateMilestone = catchAsync(async (req, res, next) => {
  const { matterId, milestoneId } = req.params;
  const updateData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    {
      matterId,
      firmId: req.user.firmId,
      "milestones._id": milestoneId,
    },
    {
      $set: {
        "milestones.$": { ...updateData, _id: milestoneId },
      },
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Milestone not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// UPDATE DUE DILIGENCE
// ============================================

/**
 * @desc    Update due diligence information
 * @route   PATCH /api/corporate/:matterId/due-diligence
 * @access  Private
 */
exports.updateDueDiligence = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const dueDiligenceData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      dueDiligence: dueDiligenceData,
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Corporate details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// ADD REGULATORY APPROVAL
// ============================================

/**
 * @desc    Add regulatory approval requirement
 * @route   POST /api/corporate/:matterId/regulatory-approvals
 * @access  Private
 */
exports.addRegulatoryApproval = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const approvalData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { regulatoryApprovals: approvalData },
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Corporate details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// UPDATE REGULATORY APPROVAL
// ============================================

/**
 * @desc    Update regulatory approval status
 * @route   PATCH /api/corporate/:matterId/regulatory-approvals/:approvalId
 * @access  Private
 */
exports.updateRegulatoryApproval = catchAsync(async (req, res, next) => {
  const { matterId, approvalId } = req.params;
  const updateData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    {
      matterId,
      firmId: req.user.firmId,
      "regulatoryApprovals._id": approvalId,
    },
    {
      $set: {
        "regulatoryApprovals.$": { ...updateData, _id: approvalId },
      },
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Regulatory approval not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// ADD SHAREHOLDER
// ============================================

/**
 * @desc    Add shareholder to corporate matter
 * @route   POST /api/corporate/:matterId/shareholders
 * @access  Private
 */
exports.addShareholder = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const shareholderData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { shareholders: shareholderData },
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Corporate details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// UPDATE SHAREHOLDER
// ============================================

/**
 * @desc    Update shareholder information
 * @route   PATCH /api/corporate/:matterId/shareholders/:index
 * @access  Private
 */
exports.updateShareholder = catchAsync(async (req, res, next) => {
  const { matterId, index } = req.params;
  const shareholderData = req.body;

  const corporateDetail = await CorporateDetail.findOne({
    matterId,
    firmId: req.user.firmId,
  });

  if (!corporateDetail) {
    return next(new AppError("Corporate details not found", 404));
  }

  if (index >= corporateDetail.shareholders.length) {
    return next(new AppError("Invalid shareholder index", 400));
  }

  corporateDetail.shareholders[index] = {
    ...corporateDetail.shareholders[index],
    ...shareholderData,
  };

  await corporateDetail.save();

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// ADD DIRECTOR
// ============================================

/**
 * @desc    Add director to corporate matter
 * @route   POST /api/corporate/:matterId/directors
 * @access  Private
 */
exports.addDirector = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const directorData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { directors: directorData },
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Corporate details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// ADD KEY AGREEMENT
// ============================================

/**
 * @desc    Add key agreement to transaction
 * @route   POST /api/corporate/:matterId/agreements
 * @access  Private
 */
exports.addKeyAgreement = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const agreementData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { keyAgreements: agreementData },
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Corporate details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// UPDATE KEY AGREEMENT
// ============================================

/**
 * @desc    Update key agreement status
 * @route   PATCH /api/corporate/:matterId/agreements/:agreementId
 * @access  Private
 */
exports.updateKeyAgreement = catchAsync(async (req, res, next) => {
  const { matterId, agreementId } = req.params;
  const updateData = req.body;

  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    {
      matterId,
      firmId: req.user.firmId,
      "keyAgreements._id": agreementId,
    },
    {
      $set: {
        "keyAgreements.$": { ...updateData, _id: agreementId },
      },
    },
    { new: true, runValidators: true },
  );

  if (!corporateDetail) {
    return next(new AppError("Agreement not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
    },
  });
});

// ============================================
// RECORD TRANSACTION CLOSING
// ============================================

/**
 * @desc    Record transaction closing details
 * @route   PATCH /api/corporate/:matterId/closing
 * @access  Private
 */
exports.recordClosing = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const { actualClosingDate } = req.body;

  const matter = await Matter.findOne({
    _id: matterId,
    firmId: req.user.firmId,
    matterType: "corporate",
    isDeleted: false,
  });

  if (!matter) {
    return next(new AppError("Corporate matter not found", 404));
  }

  // Update corporate detail
  const corporateDetail = await CorporateDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      actualClosingDate,
    },
    { new: true, runValidators: true },
  );

  // Update matter status
  matter.status = "completed";
  matter.actualClosureDate = actualClosingDate;
  await matter.save();

  res.status(200).json({
    status: "success",
    data: {
      corporateDetail,
      matter,
    },
  });
});

// ============================================
// GET CORPORATE STATISTICS
// ============================================

/**
 * @desc    Get corporate-specific statistics
 * @route   GET /api/corporate/stats
 * @access  Private
 */
exports.getCorporateStats = catchAsync(async (req, res, next) => {
  const firmQuery = { firmId: req.user.firmId, isDeleted: false };

  // By transaction type
  const byType = await CorporateDetail.aggregate([
    { $match: firmQuery },
    {
      $group: {
        _id: "$transactionType",
        count: { $sum: 1 },
        totalValue: { $sum: "$dealValue.amount" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Pending approvals
  const pendingApprovals = await CorporateDetail.aggregate([
    { $match: firmQuery },
    { $unwind: "$regulatoryApprovals" },
    {
      $match: {
        "regulatoryApprovals.status": "pending",
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ]);

  // Due diligence status
  const dueDiligenceStatus = await CorporateDetail.aggregate([
    { $match: firmQuery },
    {
      $group: {
        _id: "$dueDiligence.status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Upcoming closings (next 30 days)
  const upcomingClosings = await CorporateDetail.countDocuments({
    ...firmQuery,
    expectedClosingDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      byType,
      pendingApprovals: pendingApprovals[0]?.count || 0,
      dueDiligenceStatus,
      upcomingClosings,
    },
  });
});

// ============================================
// GET PENDING APPROVALS
// ============================================

/**
 * @desc    Get all corporate matters with pending regulatory approvals
 * @route   GET /api/corporate/pending-approvals
 * @access  Private
 */
exports.getPendingApprovals = catchAsync(async (req, res, next) => {
  const corporateDetails = await CorporateDetail.find({
    firmId: req.user.firmId,
    isDeleted: false,
    "regulatoryApprovals.status": "pending",
  })
    .populate({
      path: "matter",
      select: "matterNumber title client accountOfficer status priority",
      populate: [
        { path: "client", select: "firstName lastName email" },
        { path: "accountOfficer", select: "firstName lastName email" },
      ],
    })
    .sort({ "regulatoryApprovals.applicationDate": 1 });

  // Filter out deleted matters
  const filtered = corporateDetails.filter(
    (detail) => detail.matter && !detail.matter.isDeleted,
  );

  res.status(200).json({
    status: "success",
    results: filtered.length,
    data: {
      matters: filtered,
    },
  });
});

module.exports = exports;
