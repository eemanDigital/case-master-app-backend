const Matter = require("../models/Matter.model");
const LitigationDetail = require("../models/LitigationDetail.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// ============================================
// LITIGATION-SPECIFIC OPERATIONS
// ============================================

/**
 * @desc    Get all litigation matters with court details
 * @route   GET /api/litigation
 * @access  Private
 */
exports.getAllLitigationMatters = catchAsync(async (req, res, next) => {
  const {
    courtName,
    suitNo,
    judge,
    currentStage,
    status,
    page = 1,
    limit = 50,
    sort = "-dateOpened",
  } = req.query;

  // Build matter filter
  const matterFilter = {
    firmId: req.user.firmId,
    matterType: "litigation",
    isDeleted: false,
  };

  if (status) matterFilter.status = status;

  // Build litigation detail filter
  const detailFilter = { firmId: req.user.firmId };
  if (courtName) detailFilter.courtName = courtName;
  if (suitNo) detailFilter.suitNo = { $regex: suitNo, $options: "i" };
  if (currentStage) detailFilter.currentStage = currentStage;

  // Get litigation details first if filtering by court-specific fields
  let matterIds = null;
  if (courtName || suitNo || currentStage || judge) {
    if (judge) {
      detailFilter["judge.name"] = { $regex: judge, $options: "i" };
    }

    const litigationDetails =
      await LitigationDetail.find(detailFilter).select("matterId");
    matterIds = litigationDetails.map((d) => d.matterId);
    matterFilter._id = { $in: matterIds };
  }

  // Execute query
  const skip = (page - 1) * limit;

  const matters = await Matter.find(matterFilter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .populate("accountOfficer", "firstName lastName email photo")
    .populate("client", "firstName lastName email phone")
    .populate("litigationDetail");

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
// GET UPCOMING HEARINGS
// ============================================

/**
 * @desc    Get upcoming court hearings
 * @route   GET /api/litigation/upcoming-hearings
 * @access  Private
 */
exports.getUpcomingHearings = catchAsync(async (req, res, next) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + Number(days));

  const litigationDetails = await LitigationDetail.find({
    firmId: req.user.firmId,
    isDeleted: false,
    nextHearingDate: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate({
      path: "matter",
      select: "matterNumber title client accountOfficer status priority",
      populate: [
        { path: "client", select: "firstName lastName email phone" },
        {
          path: "accountOfficer",
          select: "firstName lastName email photo",
        },
      ],
    })
    .sort({ nextHearingDate: 1 });

  // Filter out matters that are deleted
  const filteredHearings = litigationDetails.filter(
    (detail) => detail.matter && !detail.matter.isDeleted,
  );

  res.status(200).json({
    status: "success",
    results: filteredHearings.length,
    data: {
      hearings: filteredHearings,
    },
  });
});

// ============================================
// ADD HEARING TO LITIGATION
// ============================================

/**
 * @desc    Add a hearing to a litigation matter
 * @route   POST /api/litigation/:matterId/hearings
 * @access  Private
 */
exports.addHearing = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const hearingData = req.body;

  // Verify matter exists and is litigation
  const matter = await Matter.findOne({
    _id: matterId,
    firmId: req.user.firmId,
    matterType: "litigation",
    isDeleted: false,
  });

  if (!matter) {
    return next(new AppError("Litigation matter not found", 404));
  }

  // Update litigation detail
  const litigationDetail = await LitigationDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { hearings: hearingData },
    },
    { new: true, runValidators: true },
  );

  if (!litigationDetail) {
    return next(new AppError("Litigation details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      litigationDetail,
    },
  });
});

// ============================================
// UPDATE HEARING
// ============================================

/**
 * @desc    Update a specific hearing
 * @route   PATCH /api/litigation/:matterId/hearings/:hearingId
 * @access  Private
 */
exports.updateHearing = catchAsync(async (req, res, next) => {
  const { matterId, hearingId } = req.params;
  const updateData = req.body;

  const litigationDetail = await LitigationDetail.findOneAndUpdate(
    {
      matterId,
      firmId: req.user.firmId,
      "hearings._id": hearingId,
    },
    {
      $set: {
        "hearings.$": { ...updateData, _id: hearingId },
      },
    },
    { new: true, runValidators: true },
  );

  if (!litigationDetail) {
    return next(new AppError("Hearing not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      litigationDetail,
    },
  });
});

// ============================================
// ADD COURT ORDER
// ============================================

/**
 * @desc    Add a court order to litigation
 * @route   POST /api/litigation/:matterId/court-orders
 * @access  Private
 */
exports.addCourtOrder = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const orderData = req.body;

  const matter = await Matter.findOne({
    _id: matterId,
    firmId: req.user.firmId,
    matterType: "litigation",
    isDeleted: false,
  });

  if (!matter) {
    return next(new AppError("Litigation matter not found", 404));
  }

  const litigationDetail = await LitigationDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { courtOrders: orderData },
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    status: "success",
    data: {
      litigationDetail,
    },
  });
});

// ============================================
// RECORD JUDGMENT
// ============================================

/**
 * @desc    Record judgment for litigation
 * @route   PATCH /api/litigation/:matterId/judgment
 * @access  Private
 */
exports.recordJudgment = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const judgmentData = req.body;

  const matter = await Matter.findOne({
    _id: matterId,
    firmId: req.user.firmId,
    matterType: "litigation",
    isDeleted: false,
  });

  if (!matter) {
    return next(new AppError("Litigation matter not found", 404));
  }

  // Update judgment in litigation detail
  const litigationDetail = await LitigationDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      judgment: judgmentData,
      currentStage: "judgment",
    },
    { new: true, runValidators: true },
  );

  // Update matter status based on judgment outcome
  if (judgmentData.outcome) {
    const statusMap = {
      won: "won",
      lost: "lost",
      "partially-won": "completed",
      dismissed: "closed",
      "struck-out": "closed",
    };

    if (statusMap[judgmentData.outcome]) {
      matter.status = statusMap[judgmentData.outcome];
      if (judgmentData.judgmentDate) {
        matter.actualClosureDate = judgmentData.judgmentDate;
      }
      await matter.save();
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      litigationDetail,
      matter,
    },
  });
});

// ============================================
// RECORD SETTLEMENT
// ============================================

/**
 * @desc    Record settlement for litigation
 * @route   PATCH /api/litigation/:matterId/settlement
 * @access  Private
 */
exports.recordSettlement = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const settlementData = req.body;

  const matter = await Matter.findOne({
    _id: matterId,
    firmId: req.user.firmId,
    matterType: "litigation",
    isDeleted: false,
  });

  if (!matter) {
    return next(new AppError("Litigation matter not found", 404));
  }

  // Update settlement in litigation detail
  const litigationDetail = await LitigationDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      settlement: { ...settlementData, isSettled: true },
      currentStage: "settled",
    },
    { new: true, runValidators: true },
  );

  // Update matter status
  matter.status = "settled";
  if (settlementData.settlementDate) {
    matter.actualClosureDate = settlementData.settlementDate;
  }
  await matter.save();

  res.status(200).json({
    status: "success",
    data: {
      litigationDetail,
      matter,
    },
  });
});

// ============================================
// FILE APPEAL
// ============================================

/**
 * @desc    Record appeal information
 * @route   PATCH /api/litigation/:matterId/appeal
 * @access  Private
 */
exports.fileAppeal = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const appealData = req.body;

  const matter = await Matter.findOne({
    _id: matterId,
    firmId: req.user.firmId,
    matterType: "litigation",
    isDeleted: false,
  });

  if (!matter) {
    return next(new AppError("Litigation matter not found", 404));
  }

  const litigationDetail = await LitigationDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      appeal: { ...appealData, isAppealed: true },
      currentStage: "appeal",
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    status: "success",
    data: {
      litigationDetail,
    },
  });
});

// ============================================
// GET LITIGATION STATISTICS
// ============================================

/**
 * @desc    Get litigation-specific statistics
 * @route   GET /api/litigation/stats
 * @access  Private
 */
exports.getLitigationStats = catchAsync(async (req, res, next) => {
  const firmQuery = { firmId: req.user.firmId, isDeleted: false };

  // Count by court
  const byCourt = await LitigationDetail.aggregate([
    { $match: firmQuery },
    {
      $group: {
        _id: "$courtName",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Count by stage
  const byStage = await LitigationDetail.aggregate([
    { $match: firmQuery },
    {
      $group: {
        _id: "$currentStage",
        count: { $sum: 1 },
      },
    },
  ]);

  // Hearings in next 7 days
  const upcomingHearings = await LitigationDetail.countDocuments({
    ...firmQuery,
    nextHearingDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Won vs Lost cases
  const outcomes = await LitigationDetail.aggregate([
    { $match: firmQuery },
    {
      $group: {
        _id: "$judgment.outcome",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      byCourt,
      byStage,
      upcomingHearings,
      outcomes,
    },
  });
});

// ============================================
// ADD PROCESS FILED BY PARTY
// ============================================

/**
 * @desc    Add a process filed by a party
 * @route   POST /api/litigation/:matterId/processes
 * @access  Private
 */
exports.addProcessFiled = catchAsync(async (req, res, next) => {
  const { matterId } = req.params;
  const { party, processData } = req.body; // party: 'firstParty' | 'secondParty' | 'otherParty'

  if (!["firstParty", "secondParty", "otherParty"].includes(party)) {
    return next(new AppError("Invalid party specified", 400));
  }

  const updatePath =
    party === "otherParty"
      ? "otherParty.0.processesFiled"
      : `${party}.processesFiled`;

  const litigationDetail = await LitigationDetail.findOneAndUpdate(
    { matterId, firmId: req.user.firmId },
    {
      $push: { [updatePath]: processData },
    },
    { new: true, runValidators: true },
  );

  if (!litigationDetail) {
    return next(new AppError("Litigation details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      litigationDetail,
    },
  });
});

module.exports = exports;
