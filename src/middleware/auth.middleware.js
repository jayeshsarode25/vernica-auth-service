import jwt from "jsonwebtoken";
import config from "../config/config.js";

export function createAuthMiddleware(role = ["user"]) {
  return async function authMiddleware(req, res, next) {
    console.info("[auth] protected route incoming cookies", {
      method: req.method,
      path: req.originalUrl,
      cookieNames: Object.keys(req.cookies || {}),
      hasTokenCookie: Boolean(req.cookies?.token),
      hasAuthorizationHeader: Boolean(req.headers?.authorization),
    });

    const cookieToken = req.cookies?.token;
    const token =
      cookieToken || req.headers?.authorization?.split(" ")[1];

    if (!token) {
      console.info("[auth] protected route rejected: no token", {
        path: req.originalUrl,
      });

      return res.status(401).json({
        message: "Unauthorized: No token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId ?? decoded.id ?? decoded._id;
      const auth = {
        hasTokenCookie: Boolean(cookieToken),
        userId,
        role: decoded.role,
        authenticated: Boolean(decoded),
      };

      if (!role.includes(auth.role)) {
        console.info("[auth] protected route rejected: insufficient role", {
          path: req.originalUrl,
          userId: auth.userId,
          role: auth.role,
          allowedRoles: role,
        });

        return res.status(403).json({
          message: "Forbidden: Insufficient permissions",
        });
      }

      req.auth = auth;
      req.user = { ...decoded, userId: auth.userId, id: auth.userId, role: auth.role };
      console.info("[auth] protected route authenticated", {
        path: req.originalUrl,
        userId: req.auth.userId,
        role: req.auth.role,
        authenticated: req.auth.authenticated,
      });
      next();
    } catch (err) {
      console.info("[auth] protected route rejected: invalid token", {
        path: req.originalUrl,
        error: err.message,
      });

      return res.status(401).json({
        message: "Unauthorized: Invalid token",
      });
    }
  };
}

export default createAuthMiddleware;
