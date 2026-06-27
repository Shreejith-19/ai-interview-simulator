import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const getJwtSecret = () => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in .env");
  }

  return JWT_SECRET;
};

export const generateToken = (userId) => {
    //jwt sign() creates a new jwt token with the provided payload (userId) and secret key, and sets an expiration time of 7 days.
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: "7d" });
};

//returns the decoded payload of the provided JWT token
export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};