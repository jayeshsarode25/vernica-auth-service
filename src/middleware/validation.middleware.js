import { body, param, query, validationResult } from "express-validator";

const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array();
    return res.status(400).json({
      success: false,
      message: validationErrors[0]?.msg || "Validation failed",
      errors: validationErrors,
    });
  }
  next();
};

const responseWithContactValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
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

export const contactQueryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters")
    .escape(),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 2, max: 180 })
    .withMessage("Subject must be between 2 and 180 characters")
    .escape(),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10, max: 3000 })
    .withMessage("Message must be between 10 and 3000 characters")
    .escape(),
  responseWithContactValidationErrors,
];

export const contactQueryListValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive number"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("search").optional().trim().escape(),
  query("name").optional().trim().escape(),
  query("email").optional().trim().escape(),
  query("subject").optional().trim().escape(),
  query("status")
    .optional()
    .isIn(["pending", "read", "resolved"])
    .withMessage("Invalid contact query status"),
  responseWithValidationErrors,
];

export const mongoIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid contact query ID"),
  responseWithValidationErrors,
];

export const contactQueryStatusValidator = [
  param("id").isMongoId().withMessage("Invalid contact query ID"),
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["read", "resolved"])
    .withMessage("Status must be read or resolved"),
  responseWithValidationErrors,
];
