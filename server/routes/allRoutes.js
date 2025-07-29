import {
    userSignup,
    userLogin,
    userProfile,
    fetchAllUsers,
    userLogout,
    updateUserData
} from "../controllers/user.controller.js"; // Import user-related controller functions
import { sendAccountDeletionOTP, verifyOtp, sendEmailResetOTP, sendPasswordResetOTP, verifyEmailCreateUser } from "../controllers/auth.controller.js"; // Import auth-related controller functions
import {
    createChat,
    fetchAllChats,
    updateChatData
} from "../controllers/chat.controller.js"; // Import chat-related controller functions
import {
    fetchCallsData,
    updateCallData
} from "../controllers/call.controller.js"; // Import call-related controller functions
import {
    fetchGroupsData
} from "../controllers/group.controller.js"; // Import group-related controller functions
import {
    fetchChatBroadcastsData,
    updateChatBroadcast
} from "../controllers/chatBroadcast.controller.js"; // Import chat broadcast-related controller functions
import {
    fetchStoriesData
} from "../controllers/story.controller.js"; // Import story-related controller function
import { jwtVerify } from "../middlewares/jwtVerify.js"; // Import JWT verification middleware
import express from "express"; // Import express framework
const router = express.Router(); // Create new router instance
import rateLimit from "express-rate-limit";
// 👮 OTP Abuse Protection
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    max: 3,
    message: { message: "Too many OTP requests. Please try again later." },
});

// 👮 Login Protection
export const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 min
    max: 5,
    message: { message: "Too many login attempts. Please wait 5 minutes." },
});
// user related routes
router.post("/auth/userSignup", userSignup); // User signup route
router.get("/auth/verify-email-create-user", verifyEmailCreateUser); // Verify email during user creation
router.post("/auth/send-otp-for-account-delete", jwtVerify, otpLimiter, sendAccountDeletionOTP); // Send OTP email for account deletion verification
router.post("/auth/send-otp-for-reset-password", otpLimiter, sendPasswordResetOTP); // Send OTP email for password reset
router.post("/auth/send-otp-for-reset-email", jwtVerify, otpLimiter, sendEmailResetOTP); // Send OTP email for password reset
router.patch("/auth/reset-password", updateUserData); // Reset password route (updates user data)
router.post("/auth/verify-otp", verifyOtp); // Verify OTP route
router.post("/auth/userLogin", loginLimiter, userLogin); // User login route
router.get("/auth/userProfile", userProfile); // Get user profile route
router.post("/auth/userLogout", jwtVerify, userLogout); // User logout route with JWT verification
router.get("/fetchAllUsers", jwtVerify, fetchAllUsers); // Fetch all users route with JWT verification
router.patch("/updateUserData", jwtVerify, updateUserData); // Update user data route with JWT verification
// chat related routes
router.post("/createChat", jwtVerify, createChat); // Create a new chat route
router.get("/fetchAllChats", jwtVerify, fetchAllChats); // Fetch all chats route
router.patch("/updateChatData", jwtVerify, updateChatData); // Update chat data route
// router.get("/allchats", jwtVerify, AllChatsData); // Commented out unused route

// story related routes
router.get("/fetchStoriesData", jwtVerify, fetchStoriesData); // Fetch all stories data route

// call related routes
router.patch("/updateCallData", jwtVerify, updateCallData); // Update call data route
router.get("/fetchCallsData", jwtVerify, fetchCallsData); // Fetch calls data route

// group related routes
router.get("/fetchGroupsData", jwtVerify, fetchGroupsData); // Fetch groups data route

// chat broadcast related routes
router.patch("/updateChatBroadcast", jwtVerify, updateChatBroadcast); // Update chat broadcast route
router.get("/fetchChatBroadcastsData", jwtVerify, fetchChatBroadcastsData); // Fetch chat broadcasts data route

export default router; // Export router for use in app
