import axios from "axios";

const TWO_FACTOR_BASE_URL = "https://2factor.in/API/V1";

const createOperationalError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const getTwoFactorConfig = () => {
  const apiKey = process.env.TWO_FACTOR_API_KEY;
  const template = process.env.TWO_FACTOR_TEMPLATE || "OTP1";

  if (!apiKey) {
    throw createOperationalError("2Factor API key is not configured", 500);
  }

  return {
    apiKey: encodeURIComponent(apiKey),
    template: encodeURIComponent(template),
  };
};

export const sendOtp = async (phone) => {
  const { apiKey, template } = getTwoFactorConfig();
  const url = `${TWO_FACTOR_BASE_URL}/${apiKey}/SMS/${encodeURIComponent(
    phone,
  )}/AUTOGEN/${template}`;

  try {
    const { data } = await axios.get(url, { timeout: 10000 });

    if (data?.Status !== "Success" || !data?.Details) {
      throw createOperationalError(
        data?.Details || "2Factor failed to send OTP",
        502,
      );
    }

    return data.Details;
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }

    const providerMessage =
      error.response?.data?.Details ||
      error.response?.data?.Status ||
      error.message ||
      "2Factor request failed";

    throw createOperationalError(
      `Failed to send OTP: ${providerMessage}`,
      502,
    );
  }
};

export const verifyOtp = async (sessionId, otp) => {
  const { apiKey } = getTwoFactorConfig();
  const url = `${TWO_FACTOR_BASE_URL}/${apiKey}/SMS/VERIFY/${encodeURIComponent(
    sessionId,
  )}/${encodeURIComponent(otp)}`;

  try {
    const { data } = await axios.get(url, { timeout: 10000 });

    if (data?.Status !== "Success") {
      throw createOperationalError("Invalid or expired OTP", 400);
    }

    return true;
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }

    const statusCode = error.response ? 400 : 502;
    const message =
      statusCode === 400
        ? "Invalid or expired OTP"
        : `Failed to verify OTP: ${error.message}`;

    throw createOperationalError(message, statusCode);
  }
};
