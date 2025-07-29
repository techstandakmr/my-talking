import UserModel from "../models/user.model.js";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { generateToken } from "../middlewares/generateToken.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "./auth.controller.js";
import { sendEmail } from "../index.js";
import OTPModel from "../models/otp.model.js";
import { validateEmail, validatePassword } from "../utils/validateInput.js";
// User signup controller
export const userSignup = async (req, resp) => {
    try {
        const { newUserData } = req.body;
        let { email, password, username } = newUserData;

        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) return resp.status(400).json({ message: emailCheck.error });
        const passwordCheck = validatePassword(password);

        if (!passwordCheck.isValid) return resp.status(400).json({ message: passwordCheck.errors.join(" ") });

        if (!newUserData) return resp.status(400).json({ message: "Invalid input" });

        // Check if user with the given email already exists
        const userExists = await UserModel.findOne({ email });
        if (userExists) return resp.status(400).json({ message: "User already exists" });

        // Generate salt and hash the password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a middlewares token with the new user data including hashed password, expires in 15 minutes
        const token = jwt.sign({ ...newUserData, password: hashedPassword }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" });

        // Prepare verification URL for email verification
        const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email/?token=${token}`; // or frontend route
        // Send verification email to the user
        await sendVerificationEmail(email, username, verifyUrl);

        // Respond with success message to check inbox for verification email
        return resp.status(200).json({ message: "Verification email sent. Please check your inbox.", isNeedToVerify: true });
    } catch (error) {
        // Log signup error and respond with internal server error message
        console.error("Signup Error:", error);
        resp.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// User login controller
export const userLogin = async (req, resp) => {
    try {
        const { email, password } = req.body;
        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) return resp.status(400).json({ message: emailCheck.error });

        const passwordCheck = validatePassword(password);
        if (!passwordCheck.isValid) return resp.status(400).json({ message: passwordCheck.errors.join(" ") });

        // Find user by email
        const foundUser = await UserModel.findOne({ email });
        if (!foundUser) return resp.status(400).json({ message: "User not found" });

        // Compare provided password with hashed password stored in DB
        const isMatch = await bcrypt.compare(password, foundUser?.password);
        if (!isMatch) return resp.status(400).json({ message: "Incorrect password" });

        // Generate middlewares token with user ID and email
        const token = jwt.sign({ _id: foundUser._id, email: foundUser.email }, process.env.JWT_SECRET_KEY);
        // send login alert
        let ip = 'Unknown';
        let location = 'Unknown';
        try {
            // Fetch IP and location info from ipinfo.io
            const response = await fetch('https://ipinfo.io/json?token=ac6ee70e825afc');
            if (response.ok) {
                const data = await response.json();
                ip = data.ip || ip;
                if (data.city && data.region && data.country) {
                    location = `${data.city}, ${data.region}, ${data.country}`;
                }
            }
        } catch (error) {
            console.error('IP fetch failed:', error);
        }

        const userAgent = req.get("User-Agent");
        const now = new Date();
        const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        const dateTime = now.toLocaleString('en-US', options);

        const html = `
                <div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f9fafb; padding: 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://resp.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
                <div style="text-align: center;">
                    <h2 style="color: #3B82F6;">Login Alert ⚠️</h2>
                    <p style="font-size: 16px; color: #333;">Hi <strong>${foundUser?.username}</strong>,</p>
                </div>
                <p style="font-size: 15px; color: #444;">
                    We noticed a new login to your <strong>My Talking </strong> account.
                </p>
                <ul style="font-size: 14px; color: #555; line-height: 1.6;">
                    <li><strong>Date & Time:</strong> ${dateTime}</li>
                    <li><strong>IP Address:</strong> ${ip}</li>
                    <li><strong>Location:</strong> ${location}</li>
                    <li><strong>Device/Browser:</strong> ${userAgent}</li>
                </ul>
                <p style="font-size: 14px; color: #777;">
                    If this was you, you can safely ignore this message. If you don't recognize this activity, please reset your password immediately.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL}/auth/reset-password" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">Reset Password</a>
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 13px; color: #999; text-align: center;">© ${now.getFullYear()} My Talking. All rights reserved.</p>
                </div>
            `;
        sendEmail(email, "Login Notification", html);
        // Set token as httpOnly, secure cookie and send login success response with token and user data
        resp.cookie(
            "chat_app_user_token",
            token,
            {
                httpOnly: true,
                secure: true, // Set to true in production (requires HTTPS)
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
            }
        ).json({ message: "Login successful", foundUser, token });
    } catch (error) {
        // Respond with 404 if login fails due to error
        resp.status(404).json(error);
    }
};

// Fetch user profile data based on middlewares token
export const userProfile = async (req, resp) => {
    try {
        // Retrieve the middlewares token from cookies or Authorization header
        const token = req.cookies?.chat_app_user_token || req.headers.authorization?.split(" ")[1];

        // If no token found, respond with unauthorized status
        if (!token) {
            return resp.status(401).json({
                success: false,
                message: "Invalid or expired token. Please log in again."
            });
        };

        // Verify middlewares token and decode payload
        const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY);
        // Check if user with the given email already exists
        const userExists = await UserModel.findOne({ _id: decoded?._id });
        if (!userExists) return resp.status(400).json({ message: "Account deleted" });
        // Respond with user ID extracted from decoded token
        return resp.status(200).json({
            success: true,
            currentUserID: decoded?._id
        });

    } catch (error) {
        // Handle invalid or expired token errors
        return resp.status(401).json({
            success: false,
            message: "Invalid or expired token. Please log in again."
        });
    }
};

// Fetch all users with filtered profile info based on visibility settings and connections
export const fetchAllUsers = async (req, resp) => {
    try {
        const currentUserID = req.additionallUeserData._id;

        // Fetch all users excluding their password field
        const allUsers = await UserModel.find({}, { password: 0 });

        // Helper function to check if current user is allowed to see certain profile info
        function allowProfileInfoToLegalUsers(currentUserData, checkingDataKey) {
            let visibilityKey = `${checkingDataKey}Visibility`;
            let actionedToKey = `${checkingDataKey}ActionedTo`;
            let sendingDataKey = visibilityKey == "profilePicVisibility" ? "profilePic" : visibilityKey == "aboutVisibility" ? "about" : "activeStatus";
            let checkingDataVisibility = currentUserData?.visibility?.[visibilityKey];
            let checkingDataActionedTo = currentUserData?.visibility?.[actionedToKey];
            let isFullAllowed = ["public", "connections"]?.includes(checkingDataVisibility);
            let isUserAllowed = isFullAllowed || checkingDataActionedTo?.some((actionedToInfo) =>
                checkingDataVisibility == "included" ?
                    (actionedToInfo?.isIncluded && actionedToInfo?.targetUserID?.toString() == currentUserID?.toString())
                    :
                    (
                        (!actionedToInfo?.isExcluded && actionedToInfo?.targetUserID?.toString() == currentUserID?.toString())
                            ?
                            true
                            :
                            currentUserData?.connections.some((connection) =>
                                (
                                    connection?.initiaterUserID.toString() === actionedToInfo?.targetUserID?.toString()
                                    ||
                                    connection?.targetUserID.toString() === actionedToInfo?.targetUserID?.toString()
                                ) &&
                                !checkingDataActionedTo?.some((actionedToInfo) => actionedToInfo?.targetUserID?.toString() == currentUserID?.toString())
                            )
                    )
            );
            // Return the profile info if allowed, otherwise empty string
            return isUserAllowed ? currentUserData?.profileInfo?.[sendingDataKey] : '';
        };

        // Map through users and filter profile info based on permissions and connections
        const filteredUsers = allUsers.map((currentUserData) => {
            const isCurrentUser = currentUserData?._id.toString() === currentUserID.toString();

            // Return full data if this is the current user
            if (isCurrentUser) return currentUserData;

            // Check if current user is connected to this user with accepted status
            const isConnected = currentUserData?.connections.some((connection) =>
                (
                    connection?.initiaterUserID.toString() === currentUserID.toString() ||
                    connection?.targetUserID.toString() === currentUserID.toString()
                )
                && connection.status === "accepted"
            );

            let profilePic = "";
            let about = "";
            let activeStatus = "";

            // Conditionally allow profilePic based on visibility
            if (currentUserData?.visibility?.profilePicVisibility != "private") {
                profilePic = currentUserData?.blockedUsers?.includes(currentUserID?.toString()) ? "" : allowProfileInfoToLegalUsers(currentUserData, "profilePic");
            };
            // Conditionally allow about based on visibility
            if (currentUserData?.visibility?.aboutVisibility != "private") {
                about = currentUserData?.blockedUsers?.includes(currentUserID?.toString()) ? "" : allowProfileInfoToLegalUsers(currentUserData, "about");
            };
            // Conditionally allow activeStatus based on visibility
            if (currentUserData?.visibility?.activeStatusVisibility != "private") {
                activeStatus = currentUserData?.blockedUsers?.includes(currentUserID?.toString()) ? "" : allowProfileInfoToLegalUsers(currentUserData, "activeStatus");
            }

            // Return user data with filtered profile info and connections if connected
            return {
                _id: currentUserData?._id,
                username: currentUserData?.username,
                profileInfo: {
                    name: currentUserData?.profileInfo?.name, // Always include name
                    bgColor: currentUserData?.profileInfo?.bgColor, // Always include bgColor
                    profilePic,
                    about,
                    activeStatus, // Include activeStatus if allowed
                },
                email: currentUserData?.email, // Always include email
                connections: isConnected ? currentUserData?.connections : [], // Only show connections if connected
            };
        });

        // Send filtered user list as response
        resp.status(200).json({ allUsers: filteredUsers });
    } catch (error) {
        // Handle errors with a 500 status and error details
        resp.status(500).json({ error: "Something went wrong", details: error });
    }
};

// Update user data with optional password hashing if password is changed
export const updateUserData = async (req, resp) => {
    try {
        let { filterCondition, updateOperation } = req.body;
        // If password is to be updated, hash it before saving
        if (updateOperation?.$set?.password) {
            // fetch data of current user , for new password, if user is trying to update password
            const foundUser = await UserModel.findOne({ email: filterCondition?.$or?.[0]?.email });
            if (!foundUser) return resp.status(400).json({ message: "User not found" });
            // Compare provided password with hashed password stored in DB, for new password
            const isOLdPassword = await bcrypt.compare(updateOperation?.$set?.password, foundUser?.password);
            if (isOLdPassword) return resp.status(401).json({ message: "Password already exists" });
            const salt = await bcrypt.genSalt(10);
            updateOperation.$set.password = await bcrypt.hash(updateOperation?.$set?.password, salt);
        };
        // Check if user is trying to update email , so check with the given email already exists or not
        const allowedUpdate = await UserModel.findOne({ email: updateOperation?.$set?.email });
        if (allowedUpdate) return resp.status(400).json({ message: "Email already exists" });
        // Perform the update operation on the user model
        let result = await UserModel.findOneAndUpdate(
            filterCondition,
            updateOperation,
            { new: true, runValidators: true }
        );
        if (updateOperation?.$set?.password) {
            let ip = 'Unknown';
            let location = 'Unknown';

            try {
                // Get IP + location
                const response = await fetch('https://ipinfo.io/json?token=ac6ee70e825afc');
                if (response.ok) {
                    const data = await response.json();
                    ip = data.ip || ip;
                    if (data.city && data.region && data.country) {
                        location = `${data.city}, ${data.region}, ${data.country}`;
                    }
                }
            } catch (err) {
                console.error('Error fetching IP/location:', err);
            }

            const userAgent = req.get("User-Agent");
            const now = new Date();
            const dateTime = now.toLocaleString('en-US', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });

            const html = `
                <div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f7f9fc; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://resp.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
                <div style="text-align: center;">
                    <h2 style="color: #34D399;">Password Changed Successfully ✅</h2>
                    <p style="font-size: 16px; color: #333;">Hi <strong>${result?.username}</strong>,</p>
                </div>
                <p style="font-size: 15px; color: #444;">
                    We wanted to let you know that your account password was changed successfully. If you made this change, no further action is required.
                </p>
                <hr style="margin: 30px 20px; border: none; border-top: 1px solid #eee;" />
                <h4 style="color: #333; font-size: 15px;">Security Details:</h4>
                <ul style="font-size: 14px; color: #555; line-height: 1.6;">
                    <li><strong>Date & Time:</strong> ${dateTime}</li>
                    <li><strong>IP Address:</strong> ${ip}</li>
                    <li><strong>Location:</strong> ${location}</li>
                    <li><strong>Device/Browser:</strong> ${userAgent}</li>
                </ul>
                <p style="font-size: 14px; color: #777;">
                    If you did <strong>not</strong> make this change, please reset your password immediately or contact our support team for help.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL}/auth/reset-password" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">Reset Password</a>
                </div>
                <p style="font-size: 13px; color: #aaa; margin-top: 20px;">This message is intended to keep your account safe. You don’t need to reply.</p>
                <p style="font-size: 13px; color: #999; text-align: center; margin-top: 30px;">© ${now.getFullYear()} My Talking Manager. All rights reserved.</p>
                </div>
            `;
            sendEmail(result?.email, "Password Changed", html);
        };
        if (updateOperation?.$set?.email) {
            let ip = 'Unknown';
            let location = 'Unknown';
            try {
                // Fetch IP and location info from ipinfo.io
                const response = await fetch('https://ipinfo.io/json?token=ac6ee70e825afc');
                if (response.ok) {
                    const data = await response.json();
                    ip = data.ip || ip;
                    if (data.city && data.region && data.country) {
                        location = `${data.city}, ${data.region}, ${data.country}`;
                    }
                }
            } catch (error) {
                console.error('IP fetch failed:', error);
            }

            const userAgent = req.get("User-Agent");
            const now = new Date();
            const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
            const dateTime = now.toLocaleString('en-US', options);
            let htmlForNewEmail = `<div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f9fafb; padding: 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                <div style="text-align: center;">
                    <h2 style="color: #3B82F6;">Email Changed ✅</h2>
                    <p style="font-size: 16px; color: #333;">Hi <strong>${result?.username}</strong>,</p>
                </div>
                <p style="font-size: 15px; color: #444;">
                    This is a confirmation that your email address for your <strong>My Talking</strong> account has been changed successfully.
                </p>
                <ul style="font-size: 14px; color: #555; line-height: 1.6;">
                    <li><strong>New Email:</strong> ${result?.email}</li>
                    <li><strong>Date & Time:</strong> ${dateTime}</li>
                    <li><strong>IP Address:</strong> ${ip}</li>
                    <li><strong>Location:</strong> ${location}</li>
                    <li><strong>Device/Browser:</strong> ${userAgent}</li>
                </ul>
                                <p style="font-size: 14px; color: #777;">
                    If this was you, you can safely ignore this message. If you don't recognize this activity, please reset your password immediately.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL}/auth/reset-password" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">Reset Password</a>
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 13px; color: #999; text-align: center;">© ${new Date().getFullYear()} My Talking. All rights reserved.</p>
                </div>`;
            sendEmail(result?.email, "Email Changed", htmlForNewEmail);

            let htmlForOldEmail = `<div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;  background-color: #f9fafb; padding: 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                <div style="text-align: center;">
                    <h2 style="color: #3B82F6;">Email Changed ✅</h2>
                    <p style="font-size: 16px; color: #333;">Hi <strong>${result?.username}</strong>,</p>
                </div>
                <p style="font-size: 15px; color: #444;">
                        Your email address for your <strong>My Talking</strong> account has been successfully updated.
                </p>
                <ul style="font-size: 14px; color: #555; line-height: 1.6;">
                       <li><strong>Old Email:</strong> ${updateOperation?.$set?.oldEmail}</li>
                    <li><strong>New Email:</strong> ${result?.email}</li>
                    <li><strong>Date & Time:</strong> ${dateTime}</li>
                    <li><strong>IP Address:</strong> ${ip}</li>
                    <li><strong>Location:</strong> ${location}</li>
                    <li><strong>Device/Browser:</strong> ${userAgent}</li>
                </ul>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 13px; color: #999; text-align: center;">© ${new Date().getFullYear()} My Talking. All rights reserved.</p>
                </div>`;
            await OTPModel.deleteOne({ email: updateOperation?.$set?.oldEmail });
            sendEmail(updateOperation?.$set?.oldEmail, "Email Changed", htmlForOldEmail);
        };

        // Respond with the update result
        resp.status(200).json({ "updated": result });
    } catch (error) {
        // Respond with 404 if update fails
        resp.status(404).json(error);
    }
};

// User logout controller - clear the authentication cookie
export const userLogout = async (req, resp) => {
    try {
        // Clear the middlewares cookie with matching options used during login
        resp.clearCookie("chat_app_user_token", {
            path: "/",             // match creation path
            httpOnly: true,        // httpOnly cookie for security
            secure: true,          // secure cookie for HTTPS only
            sameSite: "none"     // strict same-site policy
        });
        // Send success message on logout
        resp.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        // Respond with 404 if logout fails
        resp.status(404).json(error);
    }
};