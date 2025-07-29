import jwt from "jsonwebtoken"

// Middleware to verify JWT token from cookies or Authorization header
export const jwtVerify = (req, res, next) => {
    const tokenFromCookie = req.cookies?.chat_app_user_token;
    const tokenFromHeader = req.headers.authorization?.split(" ")[1];
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, userData) => {
        if (err) {
            console.log("JWT Error:", err.message);
            return res.status(401).json({ message: "Invalid token" });
        }
        req.additionallUeserData = userData;
        next();
    });
};
