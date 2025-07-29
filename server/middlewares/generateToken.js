import jwt from "jsonwebtoken"

export const generateToken = (payload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY)
    return token;
} 