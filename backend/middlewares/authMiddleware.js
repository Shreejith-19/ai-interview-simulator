import { verifyToken } from "../utils/jwt.js";

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token missing",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded.userId;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token invalid",
    });
  }
};

export const optionalProtect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = verifyToken(token);
      req.user = decoded.userId;
    } catch {
      // Ignore invalid token in optionalProtect
    }
  }

  return next();
};

export default protect;