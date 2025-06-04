const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');

const sendEmail = require('../utils/sendEmail');
const ApiError = require('../utils/apiError');
const User = require('../module/userSchema'); // Make sure this path is correct
const createToken = (payload) =>
  jwt.sign({ userId: payload._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  });

// @desc    Signup
// @route   POST /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone, wilaya } = req.body;

  if (!name || !email || !password || !wilaya) {
    return res.status(400).json({
      error: 'Name, email, password, and wilaya are required.',
    });
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    wilaya,
  });

  const token = createToken(user._id);

  res.status(201).json({
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      wilaya: user.wilaya,
    },
    token,
  });
});

// @desc    Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError('Incorrect email or password', 401));
  }

  const token = createToken(user._id);

  res.status(201).json({ data: user, token });
});

// @desc   Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ApiError('You are not login, Please login to get access this route', 401)
    );
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const currentUser = await User.findById(decoded.userId);

  if (!currentUser) {
    return next(
      new ApiError('The user that belongs to this token no longer exists', 401)
    );
  }

  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError('User recently changed password. Please login again.', 401)
      );
    }
  }

  req.user = currentUser;
  next();
});

// @desc    Authorization (User Permissions)
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError('You are not allowed to access this route', 403)
      );
    }
    next();
  });

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgetPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ApiError(`There is no user with email ${req.body.email}`, 404));
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = crypto
    .createHash('sha256')
    .update(resetCode)
    .digest('hex');

  user.passwordResetCode = hashedResetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;

  await user.save();

  try {
    const message = `Hi ${user.name},\nWe received a request to reset your ElectroWorld account password.\nYour code: ${resetCode}\nEnter this code to complete the reset.\n\nThanks,\nThe ElectroWorld Team`;

    await sendEmail({
      email: user.email,
      subject: 'Your password reset code (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'Success',
      message: 'Reset code sent to email',
    });
  } catch (err) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;
    console.error('Error sending email:', err);
    await user.save();
    return next(new ApiError('There was an error sending the email', 500));
  }
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
  const hashedResetCode = crypto
    .createHash('sha256')
    .update(req.body.resetCode)
    .digest('hex');

  const user = await User.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError('Reset code invalid or expired', 400));
  }

  user.passwordResetVerified = true;
  await user.save();

  res.status(200).json({ status: 'Success' });
});

// @desc    Reset password
// @route   POST /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ApiError(`There is no user with email ${req.body.email}`, 404));
  }

  if (!user.passwordResetVerified) {
    return next(new ApiError('Reset code not verified', 400));
  }

  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;

  await user.save();

  const token = createToken(user._id);
  res.status(200).json({ token });
});
