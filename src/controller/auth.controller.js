import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtp, verifyOtp } from "../services/otp.service.js";
import { AppError, catchAsync } from "../utils/error.utils.js";

const normalizeIndianPhone = (phone) => {
  if (phone === undefined || phone === null) {
    throw new AppError("Phone number is required", 400);
  }

  const digits = String(phone).trim().replace(/\D/g, "");
  const localNumber =
    digits.startsWith("91") && digits.length === 12
      ? digits.slice(2)
      : digits.slice(-10);

  if (!/^[6-9]\d{9}$/.test(localNumber)) {
    throw new AppError("Invalid Indian phone number", 400);
  }

  return `91${localNumber}`;
};

const phoneSuffixQuery = (formattedPhone) => ({
  $regex: `${formattedPhone.slice(-10)}$`,
});

const findUserByPhone = (formattedPhone, selectFields = "") => {
  const query = userModel.findOne({ phone: phoneSuffixQuery(formattedPhone) });
  return selectFields ? query.select(selectFields) : query;
};

const authCookieOptions = (options = {}) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  ...options,
});

const issueAuthCookie = (res, token, options = {}) => {
  res.cookie("token", token, authCookieOptions(options));
};

export const signUpWithPhone = catchAsync(async (req, res) => {
  const { phone, name, email } = req.body;
  const formattedPhone = normalizeIndianPhone(phone);

  let user = await findUserByPhone(formattedPhone);

  if (!user) {
    user = await userModel.create({
      phone: formattedPhone,
      name: name || "Guest",
      email: email || "",
      isPhoneVerified: false,
    });
  } else if (user.phone !== formattedPhone) {
    user.phone = formattedPhone;
  }

  const sessionId = await sendOtp(formattedPhone);

  user.twoFactorSessionId = sessionId;
  user.otpLastSentAt = new Date();
  await user.save();

  res.status(200).json({ message: "OTP sent successfully" });
});

export const signUpVerifyOtp = catchAsync(async (req, res) => {
  const { phone, otp, password } = req.body;
  const formattedPhone = normalizeIndianPhone(phone);

  if (!otp || !password) {
    throw new AppError("Phone, OTP, and password are required", 400);
  }

  const user = await findUserByPhone(
    formattedPhone,
    "+password +twoFactorSessionId",
  );

  if (!user) {
    throw new AppError("User not found. Please request OTP again.", 404);
  }

  if (!user.twoFactorSessionId) {
    throw new AppError("OTP session expired. Please request OTP again.", 400);
  }

  await verifyOtp(user.twoFactorSessionId, otp);

  user.password = await bcrypt.hash(password, 10);
  user.isPhoneVerified = true;
  user.phone = formattedPhone;
  user.twoFactorSessionId = undefined;
  user.otpLastSentAt = undefined;
  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { userId: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  issueAuthCookie(res, token);

  res.status(200).json({
    message: "User verified and registered successfully",
    user: {
      id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
    },
  });
});

export const signUpWithEmail = catchAsync(async (req, res) => {
  const { phone, email, name, password } = req.body;
  const formattedPhone = normalizeIndianPhone(phone);

  const isExist = await userModel.findOne({
    $or: [{ email }, { phone: phoneSuffixQuery(formattedPhone) }],
  });

  if (isExist) {
    throw new AppError("User with this email or phone already exists", 409);
  }

  const user = await userModel.create({
    phone: formattedPhone,
    email,
    name: name || "Guest",
    password: await bcrypt.hash(password, 10),
    isPhoneVerified: false,
  });

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );



  issueAuthCookie(res, token);

  res.status(201).json({
    message: "User signed up successfully",
    user: {
      _id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      isPhoneVerified: user.isPhoneVerified,
    },
  });
});

export const loginWithPhone = catchAsync(async (req, res) => {
  const formattedPhone = normalizeIndianPhone(req.body.phone);

  const user = await userModel.findOne({
    phone: phoneSuffixQuery(formattedPhone),
    isActive: true,
    isBlocked: { $ne: true },
  });

  if (!user) {
    throw new AppError("User not found. Please sign up first.", 404);
  }

  if (!user.isPhoneVerified) {
    throw new AppError("Phone number not verified. Please verify to login.", 403);
  }

  const sessionId = await sendOtp(formattedPhone);

  user.phone = formattedPhone;
  user.twoFactorSessionId = sessionId;
  user.otpLastSentAt = new Date();
  await user.save();

  res.status(200).json({ message: "Login OTP sent successfully" });
});

export const loginVerifyOtp = catchAsync(async (req, res) => {
  const { otp } = req.body;
  const formattedPhone = normalizeIndianPhone(req.body.phone);

  if (!otp) {
    throw new AppError("Phone and OTP are required", 400);
  }

  const user = await findUserByPhone(formattedPhone, "+twoFactorSessionId");

  if (!user) {
    throw new AppError("User not found. Please request OTP again.", 404);
  }

  if (!user.twoFactorSessionId) {
    throw new AppError("OTP session expired. Please request OTP again.", 400);
  }

  await verifyOtp(user.twoFactorSessionId, otp);

  user.phone = formattedPhone;
  user.twoFactorSessionId = undefined;
  user.otpLastSentAt = undefined;
  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { userId: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  issueAuthCookie(res, token, { sameSite: "lax" });

  res.status(200).json({
    message: "Login successful",
    user: {
      _id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
      lastLogin: user.lastLogin,
    },
  });
});

export const resendOtp = catchAsync(async (req, res) => {
  const formattedPhone = normalizeIndianPhone(req.body.phone);
  const otpType = req.body.type || "login";

  if (!["login", "signup"].includes(otpType)) {
    throw new AppError("Invalid OTP type", 400);
  }

  const user = await findUserByPhone(formattedPhone);

  if (!user) {
    throw new AppError("User not found. Please request OTP again.", 404);
  }

  if (otpType === "login" && !user.isPhoneVerified) {
    throw new AppError("Phone number not verified. Please verify to login.", 403);
  }

  if (
    user.otpLastSentAt &&
    Date.now() - new Date(user.otpLastSentAt).getTime() < 60 * 1000
  ) {
    throw new AppError("Please wait 60 seconds before resending OTP", 429);
  }

  const sessionId = await sendOtp(formattedPhone);

  user.phone = formattedPhone;
  user.twoFactorSessionId = sessionId;
  user.otpLastSentAt = new Date();
  await user.save();

  res.json({ message: "OTP sent successfully" });
});

export const googleOAuthCallback = catchAsync(async (req, res) => {
  const googleUser = req.user;

  if (!googleUser) {
    throw new AppError("Google authentication failed", 401);
  }

  const email = googleUser.emails?.[0]?.value;
  if (!email) {
    throw new AppError("Google account has no email", 400);
  }

  const name =
    googleUser.displayName ||
    `${googleUser.name?.givenName ?? ""} ${googleUser.name?.familyName ?? ""}`.trim();

  let user = await userModel.findOne({
    $or: [{ email }, { googleId: googleUser.id }],
  });

  const isNewUser = !user;

  if (!user) {
    user = await userModel.create({
      email,
      googleId: googleUser.id,
      name,
      authProvider: "google",
    });
  }


  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "2d" },
  );

  res.cookie("token", token, authCookieOptions());

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectStatus = isNewUser ? "registered" : "logged-in";

  res.redirect(`${frontendUrl}/auth/google/callback?status=${redirectStatus}`);
});

export const forgetPassword = catchAsync(async () => {
  throw new AppError("Forget password not implemented yet", 501);
});

export const resetPassword = catchAsync(async () => {
  throw new AppError("Reset password not implemented yet", 501);
});

export const getMe = catchAsync(async (req, res) => {
  const user = await userModel.findById(req.user.id).select("-password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({ user });
});

export const logout = catchAsync(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.status(200).json({ message: "Logged out successfully" });
});

export const getUserCount = catchAsync(async (req, res) => {
  const totalUsers = await userModel.countDocuments();
  res.json({ totalUsers });
});

export const getUser = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, search = "", role } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const filter = {
    ...(role && { role }),
    ...(search && {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    userModel
      .find(filter)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .select("-password"),
    userModel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    users,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

export const getUserById = catchAsync(async (req, res) => {
  const user = await userModel.findById(req.params.id).select("-password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json(user);
});

export const deleteUser = catchAsync(async (req, res) => {
  const user = await userModel.findByIdAndDelete(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({ success: true, message: "User deleted successfully" });
});

export const blockUser = catchAsync(async (req, res) => {
  const user = await userModel.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.isBlocked = !user.isBlocked;
  user.isActive = !user.isBlocked;
  await user.save();

  res.json({
    success: true,
    message: `User ${user.isBlocked ? "blocked" : "unblocked"}`,
    user,
  });
});

export const getUserAddresses = catchAsync(async (req, res) => {
  const user = await userModel.findById(req.user.id).select("addresses");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    message: "Addresses fetched successfully",
    addresses: user.addresses,
  });
});

export const addUserAddress = catchAsync(async (req, res) => {
  const { street, city, state, pincode, country, isDefault } = req.body;

  const user = await userModel.findByIdAndUpdate(
    req.user.id,
    { $push: { addresses: { street, city, state, pincode, country, isDefault } } },
    { new: true },
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(201).json({
    message: "Address added successfully",
    address: user.addresses[user.addresses.length - 1],
  });
});

export const deleteUserAddress = catchAsync(async (req, res) => {
  const { addressId } = req.params;

  const addressExists = await userModel.findOne({
    _id: req.user.id,
    "addresses._id": addressId,
  });

  if (!addressExists) {
    throw new AppError("Address not found", 404);
  }

  const user = await userModel.findByIdAndUpdate(
    req.user.id,
    { $pull: { addresses: { _id: addressId } } },
    { new: true },
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    message: "Address deleted successfully",
    addresses: user.addresses,
  });
});
