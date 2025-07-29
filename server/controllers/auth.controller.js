import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import OTPModel from "../models/otp.model.js";
import { validateEmail, validatePassword } from "../utils/validateInput.js";
import { sendEmail } from "../index.js";
// Function to send verification email to new users
export const sendVerificationEmail = async (to, username, link) => {
    // HTML email content for verification
    let html = `
        <div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f7f9fc; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
        <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
            <div style="text-align: center;">
            <h2 style="color: #3b82f6;">Welcome to My Talking 👋</h2>
            <p style="font-size: 16px; color: #333;">Hi <strong>${username}</strong>,</p>
            </div>
            <p style="font-size: 15px; color: #444;">
            Thanks for signing up! You're almost ready to get started with <strong>My Talking</strong>. Please verify your email address by clicking the button below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" target="_blank" style="background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-size: 16px;">Verify Email</a>
            </div>
            <p style="font-size: 14px; color: #777;">
            If you didn't sign up for My Talking, you can safely ignore this email.
            </p>
            <p style="font-size: 13px; color: #aaa;">This verification link will expire in 15 minutes.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 13px; color: #999; text-align: center;">© ${new Date().getFullYear()} My Talking. All rights reserved.</p>
        </div>
        `;
    // Send the verification email using helper function
    await sendEmail(to, "Verify your email", html);

};

// Controller to verify email token and create new user account
export const verifyEmailCreateUser = async (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(400).send("Invalid or missing token.");

    try {
        // Verify middlewares token containing user data
        const userData = jwt.verify(token, process.env.JWT_SECRET_KEY);
        let { email } = userData;
        // Check if user with the given email already exists
        const userExists = await UserModel.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });
        // Create new user in database
        // sanitize user data
        const userDataToSave = {
            username: userData?.username, // Generate simple username without spaces
            profileInfo: {
                name: userData?.profileInfo?.name,
                profilePic: userData?.profileInfo?.profilePic,
                bgColor: userData?.profileInfo?.bgColor,
                about: userData?.profileInfo?.about,
            },
            password: userData?.password, // Password to be hashed server-side (not plain text)
            email: userData?.email,
            activeStatus: "online", // Initial active status for user
            connections: [], // List of user connections (empty initially)
            recentChatsTabs: [ // Recent chat tabs setup with default values
                {
                    tabType: "user",
                    tabID: "",
                    recentTime: "",
                    clearingTime: new Date().toISOString(),
                    isArchived: false,
                    isPinned: false,
                    disappearingTime: "Off"
                }
            ],
            visibility: { // Visibility settings for various profile elements
                profilePicVisibility: "private",
                profilePicActionedTo: [],
                aboutVisibility: "private",
                aboutActionedTo: [],
                activeStatusVisibility: "private",
                activeStatusActionedTo: [],
                storyVisibility: "private",
                storyActionedTo: [],
                chatDeliveryStatusVisibility: "private",
                chatDeliveryStatusActionedTo: [],
                chatSeenStatusVisibility: "private",
                chatSeenStatusActionedTo: [],
                storySeenStatusVisibility: "private",
                storySeenStatusActionedTo: [],
                addingToGroupAllowence: "private",
                addingToGroupActionedTo: []
            },
            blockedUsers: [], // Blocked users list initially empty
            recycleBinOfChats: [] // Recycle bin for deleted chats empty initially
        };
        const createdUser = await UserModel.create(userDataToSave);
        // Set tabID after creation using user's _id
        createdUser.recentChatsTabs[0].tabID = createdUser._id;
        await createdUser.save();

        // HTML content for account creation confirmation email
        const html = `
            <div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f4f6f9; padding: 25px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.06);">
            <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
            <div style="text-align: center;">
                <h2 style="color: #10b981;">🎉 Account Created Successfully</h2>
                <p style="font-size: 16px; color: #333;">Welcome aboard, <strong>${createdUser?.username}</strong>!</p>
            </div>
            <p style="font-size: 15px; color: #444;">
                Your account on <strong>My Talking</strong> has been created successfully. You can now log in and start chatting, connecting, and exploring all the features we offer.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/auth/login" target="_blank" style="background-color: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-size: 16px;">Log In Now</a>
            </div>
            <p style="font-size: 14px; color: #777;">
                If you didn’t create this account, please ignore this email or contact our support team immediately.
            </p>
            <hr style="margin: 30px 25px; border: none; border-top: 1px solid #ddd;" />
            <p style="font-size: 13px; color: #aaa; text-align: center;">© ${new Date().getFullYear()} My Talking. All rights reserved.</p>
            </div>
        `;
        // Send account creation confirmation email
        await sendEmail(createdUser?.email, "Your My Talking Account Has Been Created", html);
        // Respond success with user info
        res.status(201).json({
            message: "User registered successfully",
            createdUser,
            isCreatedAccount: true
        });
    } catch (err) {
        // Log error and send failure response if verification fails
        console.error("Email verification failed:", err);
        res.status(401).send("❌ Invalid or expired verification link.");
    }
};

// Controller to send OTP email for account deletion confirmation
export const sendAccountDeletionOTP = async (req, resp) => {
    const { email, password } = req.body;
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) return resp.status(400).json({ message: emailCheck.error });

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) return resp.status(400).json({ message: passwordCheck.errors.join(" ") });

    try {
        // Find user by email
        const user = await UserModel.findOne({ email });
        if (!user) return resp.status(400).json({ message: 'User not found' });
        // Check if provided password matches stored password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return resp.status(400).json({ message: 'Incorrect password' });
        // Generate 6-digit OTP code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP expiration time to 5 minutes from now
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

        // Save OTP with action type to DB
        const existing = await OTPModel.findOne({ email, actionType: "deleteAccount" });
        if (existing) {
            // Update it
            existing.code = otpCode;
            existing.expiresAt = otpExpiration;
            await existing.save();
        } else {
            // Create new
            await OTPModel.create({
                email,
                actionType: "deleteAccount",
                code: otpCode,
                expiresAt: otpExpiration,
            });
        };
        // Compose HTML email for OTP delivery
        const html = `<div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #fff0f0; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
        <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
            <div style="text-align: center;">
                <h2 style="color: #ef4444;">Account Deletion Request ⚠️</h2>
                <p style="font-size: 16px; color: #333;">Hi <strong>${user?.username}</strong>,</p>
            </div>
            <p style="font-size: 15px; color: #444;">
                You have requested to delete your My Talking account. Use the OTP below to confirm:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background-color: #ef4444; color: white; padding: 15px 25px; font-size: 20px; font-weight: bold; border-radius: 6px;">
                    ${otpCode}
                </div>
            </div>
            <p style="font-size: 14px; color: #777;">
                This OTP is valid for 5 minutes. Once confirmed, your account will be permanently deleted.
            </p>
            <p style="font-size: 13px; color: #aaa;">If you didn't make this request, you can ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 13px; color: #999; text-align: center;">© ${new Date().getFullYear()} My Talking. All rights reserved.</p>
        </div>
    `;
        // Send OTP email to user
        await sendEmail(email, "Account Deletion OTP", html);
        // Respond with success message
        resp.status(200).json({ message: 'OTP sent to email' });

    } catch (error) {
        // Respond with error if any failure occurs
        resp.status(404).json(error)
    }
};
// Controller to send OTP email for email reset request
export const sendEmailResetOTP = async (req, resp) => {
    const { email, password } = req.body;
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) return resp.status(400).json({ message: emailCheck.error });

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) return resp.status(400).json({ message: passwordCheck.errors.join(" ") });
    try {
        // Find user by email
        const user = await UserModel.findOne({ email });
        if (!user) return resp.status(400).json({ message: 'User not found' });
        // Check if provided password matches stored password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return resp.status(400).json({ message: 'Incorrect password' });
        // Generate 6-digit OTP code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP expiration time to 5 minutes from now
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

        // Save OTP with action type to DB
        const existing = await OTPModel.findOne({ email, actionType: "resetEmail" });
        if (existing) {
            // Update it
            existing.code = otpCode;
            existing.expiresAt = otpExpiration;
            await existing.save();
        } else {
            // Create new
            await OTPModel.create({
                email,
                actionType: "resetEmail",
                code: otpCode,
                expiresAt: otpExpiration,
            });
        };
        // Compose HTML email for OTP delivery
        const html = `<div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f7f9fc; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
        <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
          <div style="text-align: center;">
            <h2 style="color: #3b82f6;">Reset Your Email</h2>
            <p style="font-size: 16px; color: #333;">Hi <strong>${user?.username}</strong>,</p>
          </div>
          <p style="font-size: 15px; color: #444;">
            You requested to reset your email. Please use the OTP below to proceed with changing your account email:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="width: fit-content; margin: auto; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-size: 16px;">${otpCode}</div>
          </div>
          <p style="font-size: 13px; color: #aaa;">This OTP is valid for 5 minutes. Do not share it with anyone.</p>
            <p style="font-size: 13px; color: #aaa;">If you didn't make this request, you can ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 13px; color: #999; text-align: center;">© ${new Date().getFullYear()} My Talking. All rights reserved.</p>
        </div>`;
        // Send OTP email to user
        await sendEmail(email, "Email Reset OTP", html);

        // Respond with success message
        resp.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        // Respond with server error if something fails
        resp.status(500).json({ message: 'Server error' });
    }
};
// Controller to send OTP email for password reset request
export const sendPasswordResetOTP = async (req, resp) => {
    const { email } = req.body;
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) return resp.status(400).json({ message: emailCheck.error });
    try {
        // Find user by email
        const user = await UserModel.findOne({ email });
        if (!user) return resp.status(400).json({ message: 'User not found' });

        // Generate 6-digit OTP code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP expiration time to 5 minutes from now
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

        // Save OTP with action type to DB
        const existing = await OTPModel.findOne({ email, actionType: "resetPassword" });
        if (existing) {
            // Update it
            existing.code = otpCode;
            existing.expiresAt = otpExpiration;
            await existing.save();
        } else {
            // Create new
            await OTPModel.create({
                email,
                actionType: "resetPassword",
                code: otpCode,
                expiresAt: otpExpiration,
            });
        };
        // Compose HTML email for OTP delivery
        const html = `
                <div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f7f9fc; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
                    <div style="text-align: center;">
                        <h2 style="color: #3b82f6;">Reset Your Password 🔐</h2>
                        <p style="font-size: 16px; color: #333;">Hi <strong>${user?.username}</strong>,</p>
                    </div>
                    <p style="font-size: 15px; color: #444;">
                        You requested to reset your password. Use the OTP below to proceed:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 25px; font-size: 20px; font-weight: bold; border-radius: 6px;">
                            ${otpCode}
                        </div>
                    </div>
                    <p style="font-size: 14px; color: #777;">
                        This OTP is valid for 5 minutes. Do not share it with anyone.
                    </p>
                    <p style="font-size: 13px; color: #aaa;">If you didn't request a password reset, you can ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 13px; color: #999; text-align: center;">© ${new Date().getFullYear()} My Talking. All rights reserved.</p>
                </div>
            `;
        // Send OTP email to user
        await sendEmail(email, "Password Reset OTP", html);

        // Respond with success message
        resp.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        // Respond with server error if something fails
        resp.status(500).json({ message: 'Server error' });
    }
};

// Controller to verify OTP code submitted by user
export const verifyOtp = async (req, resp) => {
    const { email, otp, actionType } = req.body;

    try {
        // Find OTP record matching email, code and action type
        const otpRecord = await OTPModel.findOne({ email, code: otp, actionType });
        if (!otpRecord) return resp.status(400).json({ message: 'Invalid OTP' });

        // Check if OTP has expired
        if (otpRecord.expiresAt < new Date()) {
            return resp.status(400).json({ message: 'OTP expired' });
        };

        // Delete OTP record after successful verification
        await OTPModel.deleteOne({ _id: otpRecord._id });

        // Respond with OTP verified success
        resp.status(200).json({ message: 'OTP verified' });
    } catch (error) {
        // Respond with server error on failure
        resp.status(500).json({ message: 'Server error' });
    }
};
