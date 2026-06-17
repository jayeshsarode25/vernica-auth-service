import { body, validationResult } from "express-validator";

const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array();
    return res.status(400).json({
      message: validationErrors[0]?.msg || "Validation failed",
      errors: validationErrors,
    });
  }
  next();
};

export const sendOtpValidator = [
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required"),
  body("name")
    .optional()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("email").optional().isEmail().withMessage("Invalid email address"),
  responseWithValidationErrors,
];

export const verifyOtpValidator = [
  body("phone").notEmpty().withMessage("Phone is required"),

  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must be numeric"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  responseWithValidationErrors,
];

export const login = [
  body("phone").notEmpty().withMessage("Phone number is required"),
  responseWithValidationErrors,
];

export const loginWithOtpValidator = [
  body("phone").notEmpty().withMessage("Phone is required"),

  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
  responseWithValidationErrors,
];

export const signUpEmailValidator = [
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Invalid Indian phone number"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),
  body("name")
    .optional()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  responseWithValidationErrors,
];
