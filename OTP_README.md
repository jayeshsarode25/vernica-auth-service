# OTP Authentication Guide

This auth service uses 2Factor.in OTP for phone signup and phone login.
The backend does not generate or store OTP codes. 2Factor generates the OTP,
returns a session id, and verifies the OTP later using that session id.

## Important Files

- `src/services/otp.service.js`
  - Calls the 2Factor.in send OTP API.
  - Calls the 2Factor.in verify OTP API.
  - Converts provider/network failures into API errors.

- `src/controller/auth.controller.js`
  - Contains phone signup, signup OTP verification, phone login, login OTP
    verification, and resend OTP logic.
  - Normalizes phone numbers into Indian format: `91xxxxxxxxxx`.
  - Stores only `twoFactorSessionId` on the user record.
  - Clears `twoFactorSessionId` after a successful verification.
  - Keeps JWT cookie login behavior after OTP verification.

- `src/models/user.model.js`
  - Stores `twoFactorSessionId` and `otpLastSentAt`.
  - Does not store the OTP value.

- `.env`
  - Stores your real 2Factor API key.

- `.env.example`
  - Shows required env variable names only.
  - Never put a real API key in this file.

## Required Environment Variables

```env
TWO_FACTOR_API_KEY=your_2factor_api_key
TWO_FACTOR_TEMPLATE=OTP1
```

Remove old Twilio variables if they still exist:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_PHONE_NUMBER=
```

## 2Factor APIs Used

Send OTP:

```txt
GET https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE}/AUTOGEN/{TEMPLATE_NAME}
```

Verify OTP:

```txt
GET https://2factor.in/API/V1/{API_KEY}/SMS/VERIFY/{SESSION_ID}/{OTP}
```

In this code, `PHONE` is always sent as `91xxxxxxxxxx`.

## Phone Number Formatting

The helper `normalizeIndianPhone()` accepts common inputs like:

```txt
9876543210
+919876543210
91 98765 43210
```

It stores and sends them as:

```txt
919876543210
```

Only valid Indian mobile numbers starting with `6`, `7`, `8`, or `9` are
accepted.

## Signup OTP Flow

Route:

```txt
POST /api/auth/signup-phone
```

Request:

```json
{
  "phone": "9876543210",
  "name": "User Name",
  "email": "user@example.com"
}
```

What happens:

1. Phone is normalized to `919876543210`.
2. User is created if not already present.
3. Backend calls 2Factor AUTOGEN send OTP API.
4. 2Factor returns a session id.
5. Backend stores the session id in `user.twoFactorSessionId`.

Response:

```json
{
  "message": "OTP sent successfully"
}
```

## Signup OTP Verify Flow

Route:

```txt
POST /api/auth/verify-phone-otp
```

Request:

```json
{
  "phone": "9876543210",
  "otp": "123456",
  "password": "secret123"
}
```

What happens:

1. Phone is normalized.
2. User is loaded with `twoFactorSessionId`.
3. Backend calls 2Factor VERIFY API using that session id and OTP.
4. If valid, phone is marked verified.
5. Password is saved.
6. `twoFactorSessionId` is cleared.
7. JWT token is set in the `token` cookie.

## Login OTP Flow

Route:

```txt
POST /api/auth/login-phone
```

Request:

```json
{
  "phone": "9876543210"
}
```

What happens:

1. Phone is normalized.
2. Existing verified active user is found.
3. Backend calls 2Factor AUTOGEN send OTP API.
4. New `twoFactorSessionId` is stored on the user.

Response:

```json
{
  "message": "Login OTP sent successfully"
}
```

## Login OTP Verify Flow

Route:

```txt
POST /api/auth/verify-login-otp
```

Request:

```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

What happens:

1. Phone is normalized.
2. User is loaded with `twoFactorSessionId`.
3. Backend verifies OTP with 2Factor.
4. `twoFactorSessionId` is cleared.
5. `lastLogin` is updated.
6. JWT token is set in the `token` cookie.

## Resend OTP Flow

Route:

```txt
POST /api/auth/resend-otp
```

Request:

```json
{
  "phone": "9876543210",
  "type": "login"
}
```

Allowed `type` values:

```txt
login
signup
```

What happens:

1. Phone is normalized.
2. User is checked.
3. If the previous OTP was sent less than 60 seconds ago, request is rejected.
4. Backend calls 2Factor AUTOGEN send OTP API again.
5. New `twoFactorSessionId` replaces the previous one.

## Why Am I Receiving a Call Instead of SMS?

The current code sends this endpoint:

```txt
/SMS/{PHONE}/AUTOGEN/{TEMPLATE_NAME}
```

So the backend is requesting SMS OTP, not voice OTP.

If you still receive a call, it is usually because of 2Factor delivery routing,
account settings, template/DLT configuration, or SMS delivery fallback. Some
2Factor documentation describes automatic voice fallback when SMS delivery is
congested.

To force SMS-only behavior, check these in your 2Factor dashboard/account:

1. Make sure `TWO_FACTOR_TEMPLATE=OTP1` is an SMS OTP template.
2. Make sure the template is approved and mapped for SMS/DLT if required.
3. Ask 2Factor support to disable Voice OTP fallback for your API key/template.
4. Ask 2Factor support which endpoint or account setting guarantees SMS-only
   delivery for AUTOGEN OTP.

This backend does not call a `VOICE` endpoint and does not contain call OTP
logic.

## Quick Debug Checklist

1. Confirm `.env` has the right API key:

```env
TWO_FACTOR_API_KEY=your_real_key
TWO_FACTOR_TEMPLATE=OTP1
```

2. Restart the auth server after changing `.env`.

3. Watch the response from `/signup-phone` or `/login-phone`.

4. If the API returns success and you receive a call, contact 2Factor support
   with the request time, phone number, template name, and session id from the
   user document.

5. Do not log OTP values. The OTP is generated and owned by 2Factor.

