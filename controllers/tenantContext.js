const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/userModel");
const Firm = require("../models/firmModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

/**
 * ===============================
 * TENANT CONTEXT MIDDLEWARE
 * ===============================
 *
 * This middleware extracts the firmId from the authenticated user's JWT token
 * and attaches it to req.firmId for use in all subsequent route handlers.
 *
 * This ensures complete tenant isolation - users can only access data
 * belonging to their firm.
 *
 * CRITICAL: All protected routes must use this middleware!
 */

exports.tenantContext = catchAsync(async (req, res, next) => {
  // 1) Extract token from Authorization header or cookie
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verify JWT token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new AppError("Your token has expired. Please log in again.", 401)
      );
    }
    return next(new AppError("Invalid token. Please log in again.", 401));
  }

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select("+firmId");

  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  // 4) Check if user is active
  if (!currentUser.isActive) {
    return next(
      new AppError(
        "Your account has been deactivated. Please contact admin.",
        403
      )
    );
  }

  // 5) Check if user is deleted
  if (currentUser.isDeleted) {
    return next(
      new AppError("This account has been deleted and cannot be accessed.", 403)
    );
  }

  // 6) Check if user is suspended
  if (currentUser.role === "suspended") {
    return next(
      new AppError(
        "Your account has been suspended. Please contact admin.",
        403
      )
    );
  }

  // 7) Verify firm exists and is active
  const firm = await Firm.findById(currentUser.firmId);

  if (!firm) {
    return next(
      new AppError(
        "Your firm account no longer exists. Please contact support.",
        403
      )
    );
  }

  if (!firm.isActive) {
    return next(
      new AppError(
        "Your firm account has been suspended. Please contact support.",
        403
      )
    );
  }

  // 8) Check if subscription is active (for Nigerian market)
  if (!firm.isSubscriptionActive()) {
    return next(
      new AppError(
        "Your firm's subscription has expired. Please renew to continue using CaseMaster.",
        402 // 402 Payment Required
      )
    );
  }

  // 9) Check if password was changed after token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // ✅ GRANT ACCESS - Attach user, firmId, and firm to request object
  req.user = currentUser;
  req.firmId = currentUser.firmId; // ✅ CRITICAL: This is used in all queries
  req.firm = firm;

  next();
});

/**
 * ===============================
 * OPTIONAL: SUBDOMAIN-BASED TENANT DETECTION
 * ===============================
 *
 * Use this if you want firms to access via subdomain
 * e.g., smithlaw.casemaster.ng
 *
 * This middleware can be used in addition to or instead of
 * token-based tenant detection depending on your architecture.
 */

exports.tenantContextBySubdomain = catchAsync(async (req, res, next) => {
  const host = req.headers.host;

  // Extract subdomain from host
  // e.g., smithlaw.casemaster.ng -> smithlaw
  const parts = host.split(".");

  // Skip if accessing main domain
  if (parts.length < 3 || parts[0] === "www" || parts[0] === "app") {
    return next();
  }

  const subdomain = parts[0];

  // Find firm by subdomain
  const firm = await Firm.findOne({ subdomain });

  if (!firm) {
    return next(
      new AppError("Law firm not found. Please check your URL.", 404)
    );
  }

  if (!firm.isActive) {
    return next(
      new AppError("This law firm's account has been suspended.", 403)
    );
  }

  // Attach firm information to request
  req.firmId = firm._id;
  req.firm = firm;

  next();
});

/**
 * ===============================
 * RESTRICT TO SPECIFIC ROLES
 * ===============================
 *
 * Use after tenantContext middleware to restrict access to specific roles
 */

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'super-admin']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

/**
 * ===============================
 * CHECK IF USER IS VERIFIED
 * ===============================
 */

exports.isVerified = catchAsync(async (req, res, next) => {
  if (req.user && req.user.isVerified) {
    return next();
  } else {
    return next(new AppError("Account Not Verified", 403));
  }
});

/**
 * ===============================
 * USAGE LIMIT CHECKS (Nigerian Market)
 * ===============================
 */

/**
 * Check if firm can add more users
 */
exports.checkUserLimit = catchAsync(async (req, res, next) => {
  const firm = await Firm.findById(req.firmId);

  if (!firm) {
    return next(new AppError("Firm not found", 404));
  }

  // Count current users in the firm
  const currentUserCount = await User.countDocuments({
    firmId: req.firmId,
    isActive: true,
    isDeleted: false,
  });

  if (!firm.canAddUser(currentUserCount)) {
    return next(
      new AppError(
        `Your firm has reached the maximum number of users (${firm.limits.users}). Please upgrade your plan.`,
        403
      )
    );
  }

  next();
});

/**
 * Check if firm can create more cases this month
 */
exports.checkCaseLimit = catchAsync(async (req, res, next) => {
  const firm = await Firm.findById(req.firmId);

  if (!firm) {
    return next(new AppError("Firm not found", 404));
  }

  if (!firm.canCreateCase()) {
    return next(
      new AppError(
        `Your firm has reached the monthly case limit (${firm.limits.casesPerMonth}). Please upgrade your plan or wait until next month.`,
        403
      )
    );
  }

  next();
});

/**
 * Check if firm has storage available
 */
exports.checkStorageLimit = catchAsync(async (req, res, next) => {
  const firm = await Firm.findById(req.firmId);

  if (!firm) {
    return next(new AppError("Firm not found", 404));
  }

  // Calculate file size in GB
  const fileSizeGB = req.file ? req.file.size / (1024 * 1024 * 1024) : 0;

  if (!firm.hasStorageAvailable(fileSizeGB)) {
    return next(
      new AppError(
        `Your firm has reached the storage limit (${firm.limits.storageGB}GB). Please upgrade your plan or delete some files.`,
        403
      )
    );
  }

  next();
});
