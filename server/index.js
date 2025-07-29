import express, { json } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import ChatModel from "./models/chat.model.js";
import StoryModel from "./models/story.model.js";
import GroupModel from "./models/group.model.js";
import ChatBroadcastModel from "./models/chatBroadcastModel.model.js";
import UserModel from "./models/user.model.js";
import CallModel from "./models/call.model.js";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import allRoutes from "./routes/allRoutes.js";
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from "mongodb";
import _ from "lodash";
import { jwtVerify } from "./middlewares/jwtVerify.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import fetch from 'node-fetch';
import { v2 as cloudinary } from 'cloudinary';
import { load } from 'cheerio';
import session from "express-session";
import passport from "passport";
import nodemailer from "nodemailer";
import axios from "axios";
import { Runware } from "@runware/sdk-js";
import urlMetadata from 'url-metadata';
import UserAgent from 'user-agents';
import mongodbConnect from "./config/config.js";
dotenv.config(); // Load environment variables from .env file
const app = express();
const corsOptions = {
    // origin: process.env.FRONTEND_URL,  // Allowed frontend origin
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(session({
    secret: process.env.JWT_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: "none"
    }
}));
app.use(cookieParser());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
// Allow max 100 reqs per 15 mins from any IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: "Too many requests from this IP, please try again later." },
});
app.use(globalLimiter); // Apply to all routes
app.use("/api", allRoutes);

const __filename = fileURLToPath(import.meta.url); // Get current file path
const __dirname = path.dirname(__filename); // Get current directory path

// Serve static files from uploads folder with CORS enabled
app.use('/uploads', cors(corsOptions), express.static(path.join(__dirname, 'uploads')));

const transporter = nodemailer.createTransport({
    service: "gmail", // Use Gmail service for sending email
    auth: {
        user: process.env.EMAIL_USER, // Email user from env
        pass: process.env.APA_PASSWORD, // Email app password from env
    },
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,     // Cloudinary cloud name from env
    api_key: process.env.CLOUDINARY_API_KEY,           // Cloudinary API key from env
    api_secret: process.env.CLOUDINARY_API_SECRET,     // Cloudinary API secret from env
});

export const sendEmail = async (to, subject, html) => {
    // console.log("sendEmail",to, subject, html);
    // // Re-create nodemailer transporter for each sendEmail call
    // const transporter = nodemailer.createTransport({
    //     service: "gmail",
    //     auth: {
    //         user: process.env.EMAIL_USER,
    //         pass: process.env.APA_PASSWORD,
    //     },
    // });
    //     console.log("sendEmail2",transporter);
    // const mailOptions = {
    //     from: `"Chat App" <${process.env.EMAIL_USER}>`, // Sender email and name
    //     to,      // Recipient email
    //     subject, // Email subject
    //     html,    // Email content as HTML
    // };
    // const info = await transporter.sendMail(mailOptions); // Send email
    // console.log("INFO",info),mailOptions;


    try {
        const response = await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: {
                    name: "Chat App",
                    email: process.env.EMAIL_USER, // must match verified sender
                },
                to: [{ email: to }],
                subject,
                htmlContent: html,
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log("Email sent via Brevo:", response.data, to);
        return { data: response.data, success: true };
    } catch (err) {
        console.error("Brevo email send failed:", err.response?.data || err.message, to);
        return { data: err.response?.data || err.message, success: false }
        // throw new Error("Email failed to send");
    }
};

// api for feedback
const sendFeedback = async (req, resp) => {
    let { to, subject, html } = req.body;
    let result = await sendEmail(to, subject, html);
    if (result.success) {
        resp.status(200).json({ message: "success" });
    } else {
        return resp.status(400).json({ message: "Failed" });
    };
};
app.post("/api/feedback", jwtVerify, sendFeedback);
export const generateAIImage = async (prompt) => {
    console.log("prompt", prompt)
    try {
        // if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        //     throw new Error("Prompt is required and must be a non-empty string");
        // }
        // // const response = await openai.images.generate({
        // //     // prompt,
        // //     model: "dall-e-3", // OR "dall-e-2" if DALL·E 3 is unavailable to you
        // //     prompt: prompt.trim(),
        // //     n: 1,
        // //     size: "1024x1024",
        // // });
        // const response = await openai.responses.create({
        //     model: "gpt-4.1-mini",
        //     input: prompt,
        //     tools: [{ type: "image_generation" }],
        // });
        // const generatedImage = response.data.data[0];
        // console.log("generatedImage", generatedImage)
        const response = await openai.responses.create({
            model: "gpt-4.1-mini",
            input: "Generate an image of gray tabby cat hugging an otter with an orange scarf",
            tools: [{ type: "image_generation" }],
        });

        // Save the image to a file
        const imageData = response.output
            .filter((output) => output.type === "image_generation_call")
            .map((output) => output.result);

        if (imageData.length > 0) {
            const imageBase64 = imageData[0];
            fs.writeFileSync("otter.png", Buffer.from(imageBase64, "base64"));
        }
        return { text: "Image generated" };
    } catch (err) {
        console.error('Error:', err);
        return { err }
    }
}

async function handleAIResponse(prompt, repliedChatID) {
    // Fetch all AI assistant chats from the database to use as conversation history
    let allAIChatsHistory = await ChatModel.find({
        aiAssistant: true
    }, { text: 1, _id: 0 });

    // Convert each chat's text into message format for the AI model
    let allAIChatsText = allAIChatsHistory?.map(chat => {
        return { role: "user", content: JSON.parse(chat?.text)?.map(g => g?.value)?.join(' ') }
    });

    // If the message is a reply, fetch the replied chat data
    let repliedChat = await ChatModel.findOne({ customID: repliedChatID }, { text: 1, _id: 0 }) || null;

    try {
        // Send chat completion request to Groq API using LLaMA-3.3-70B
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                // model: "llama-3.3-70b-versatile", // Model used for AI response
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system", content: process.env.SYSTEM_PROMPT // System prompt from .env file
                    },
                    ...allAIChatsText, // Chat history for better context
                    ...(
                        repliedChat
                            ? [{ role: "user", content: JSON.parse(repliedChat?.text)?.map(g => g?.value)?.join(' ') }]
                            : []
                    ),
                    { role: "user", content: prompt }, // User's actual message
                ],
                temperature: 0.7, // Controls randomness in the output
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`, // API key
                },
            }
        );

        // Function to format and structure AI response into rich text chunks
        function parseAIResponse(rawText) {
            const result = [];

            // Regex to detect different formats: bold, italic, code, links, headings, tabs, newlines
            const tokenRegex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`|https?:\/\/[^\s]+|\t|\n|^#{1,6}\s+(.*)$)/gm;

            let lastIndex = 0;
            let match;

            // Loop through all matches to format segments
            while ((match = tokenRegex.exec(rawText)) !== null) {
                // Add plain text between matches
                if (match.index > lastIndex) {
                    const plain = rawText.slice(lastIndex, match.index);
                    result.push({ type: 'text', value: plain, format: [], isLink: false });
                }

                const fullMatch = match[0];

                // Handle newline
                if (fullMatch === '\n') {
                    result.push({ type: 'newline' });

                    // Handle tab
                } else if (fullMatch === '\t') {
                    result.push({ type: 'text', value: '    ', format: [], isLink: false });

                    // Handle links
                } else if (fullMatch.startsWith('http')) {
                    result.push({ type: 'text', value: fullMatch, format: [], isLink: true });

                    // Handle bold (with nested italic/code formatting)
                } else if (match[2]) {
                    const formats = [];
                    const inner = match[2];

                    if (/\*(.*?)\*/.test(inner)) formats.push('italic');
                    if (/`(.*?)`/.test(inner)) formats.push('code');

                    formats.unshift('bold'); // Always add bold first

                    // Clean up inner text by removing formatting symbols
                    const cleaned = inner.replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
                    result.push({ type: 'text', value: cleaned, format: formats, isLink: false });

                    // Handle italic
                } else if (match[3]) {
                    result.push({ type: 'text', value: match[3], format: ['italic'], isLink: false });

                    // Handle inline code
                } else if (match[4]) {
                    result.push({ type: 'text', value: match[4], format: ['code'], isLink: false });
                }

                // Move pointer forward
                lastIndex = tokenRegex.lastIndex;
            }

            // Add any remaining plain text after the last token
            if (lastIndex < rawText.length) {
                const remaining = rawText.slice(lastIndex);
                result.push({ type: 'text', value: remaining, format: [], isLink: false });
            }

            return result;
        };

        // Log the full message object and plain content (for debugging)
        console.log("TEXT", response.data.choices[0].message, response.data.choices[0].message.content);

        // Return parsed result in standard format
        return { type: "text", data: parseAIResponse(response.data.choices[0].message.content) };

    } catch (err) {
        // Log any error during AI request and return error message
        console.error("AI Error:", err, err?.response?.data || err.message);
        return { err: "Failed to get AI response" };
    }
};

async function fetchMetadata(textData) {
    let parsedTextData = JSON.parse(textData);
    let textHasLink = parsedTextData?.some(g => g?.isLink);
    if (!textHasLink) return JSON.stringify(parsedTextData);
    const userAgent = new UserAgent();
    const newTextData = await Promise.all(
        parsedTextData.map(async (parts) => {
            if (parts?.isLink) {
                const { value: url } = parts;
                try {
                    const metadata = await urlMetadata(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        },
                    });

                    if (!metadata?.favicons[0]?.href) {
                        const urlObj = new URL(url);
                        metadata.image = `${urlObj.origin}/favicon.ico`;
                    } else {
                        metadata.image = `${metadata?.favicons[0]?.href}`;

                    };
                    const title = metadata['title'] || '';
                    const ogTitle = metadata['og:title'] || '';
                    const description = metadata['description'] || '';
                    const ogDescription = metadata['og:description'] || '';

                    const filtered = {
                        title: title === ogTitle ? title : ogTitle || title,
                        description: description === ogDescription ? description : ogDescription || description,
                        logo: metadata['og:image'] != '' ? metadata['og:image'] : metadata['image'],
                        // image: metadata['image'],
                        // 'og:image': metadata['og:image'],
                    };
                    console.log('metadataHAI', filtered, metadata);
                    return {
                        ...parts,
                        ...filtered,
                    };
                } catch (err) {
                    // fallback to Microlink API
                    try {
                        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
                        const data = await response.json();

                        if (data.status !== 'success') {
                            throw new Error(data?.data?.message || 'Microlink failed');
                        }

                        const m = data.data;

                        const fallback = {
                            title: m.title.toLowerCase() == 'error' ? url : m.title || '',
                            description: m.title.toLowerCase() == 'error' ? url : m.description || '',
                            logo: m.image?.url || '',
                        };
                        console.log("microlinkDATA", fallback, m)
                        return {
                            ...parts,
                            ...fallback,
                        };
                    } catch (fallbackErr) {
                        return parts;
                    }
                }
            }

            return parts;
        })
    );
    return JSON.stringify(newTextData);
};

app.get('/urlmetadata2', async (req, res) => {
    const { url } = req.query;
    console.log("urlmetadata2 url", url);
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required.' });
    }

    const userAgent = new UserAgent();

    try {
        const metadata = await urlMetadata(url, {
            headers: {
                'User-Agent': userAgent.toString(),
            },
        });

        // Extract specific fields
        const filtered = {
            source: 'url-metadata',
            title: metadata['title'] || metadata['og:title'] || '',
            description: metadata['description'] || metadata['og:description'] || '',
            'og:title': metadata['og:title'] || '',
            'og:description': metadata['og:description'] || '',
            'og:image': metadata['og:image'] || '',
            image: metadata['image'] || '',
        };

        console.log("urlmetadata2 metadata", filtered);
        return res.json(filtered);

    } catch (err) {
        console.error('❌ url-metadata failed. Falling back to Microlink:', err.message);

        // fallback to Microlink API
        try {
            const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (data.status !== 'success') {
                throw new Error(data?.data?.message || 'Microlink failed');
            }

            const m = data.data;

            const fallback = {
                source: 'microlink',
                title: m.title || '',
                description: m.description || '',
                'og:title': m.title || '',
                'og:description': m.description || '',
                'og:image': m.image?.url || '',
                image: m.image?.url || '',
            };

            console.log("urlmetadata2 Microlink fallback", fallback);
            return res.json(fallback);

        } catch (fallbackErr) {
            console.error('❌ Microlink also failed:', fallbackErr.message);
            return res.status(500).json({
                error: 'Failed to fetch metadata from both sources.',
                details: fallbackErr.message,
            });
        }
    }
});
app.get('/urlmetadata3', async (req, res) => {
    const { url } = req.query;
    console.log("urlmetadata3 url", url);
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required.' });
    }

    try {
        const metadata = await urlMetadata(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
        });
        console.log("urlmetadata3 data", metadata);
        // Manual favicon fallback if missing
        if (!metadata.image) {
            const urlObj = new URL(url);
            metadata.image = `${urlObj.origin}/favicon.ico`;
        }

        return res.json({ source: 'url-metadata', ...metadata });

    } catch (err) {
        console.error('❌ Metadata fetch failed:', err.message);
        return res.status(500).json({
            error: 'Failed to fetch metadata.',
            details: err.message,
        });
    }
});

const handleFile = async (newFile) => {
    try {
        // Destructure base64 data, file type, name, and other remaining fields from newFile object
        const { fileBaseData, fileType, fileName, ...remainingFile } = newFile;

        // Extract the pure base64 string after the prefix "data:<type>;base64,"
        const base64Data = fileBaseData?.split(';base64,').pop();

        // Get the main MIME type category (e.g. image, video, audio)
        const mimeType = fileType.split('/')[0]; // image, video, audio
        if (!fileBaseData || !fileType || !fileName) {
            console.log("err1", "Invalid file input")
            return { err: 'Invalid file input' };
        }

        // Upload the file to Cloudinary using base64 data URI format
        const uploadResult = await cloudinary.uploader.upload(
            `data:${fileType};base64,${base64Data}`,
            {
                folder: 'chat_uploads', // Upload folder name in Cloudinary
                public_id: fileName.split('.')[0], // Use filename without extension as public ID
                resource_type: mimeType === 'image' ? 'image' : mimeType === 'video' ? 'video' : 'auto', // Set resource type
                overwrite: true, // Overwrite existing file with same public ID
            }
        );

        // Return the remaining file data plus new properties from upload result
        return {
            success: true,
            ...remainingFile,
            fileType,
            fileName,
            fileURL: uploadResult?.secure_url, // URL to access uploaded file
            publicId: uploadResult?.public_id, // Cloudinary public ID
        };
    } catch (err) {
        console.log("err", err);
        return { err }; // Rethrow error to caller
    }
};

const copyFileWithNewName = async (sourceUrl, fileType) => {
    try {
        // Get main MIME type category
        const mimeType = fileType.split('/')[0];

        // Upload file again to Cloudinary from source URL with new public ID (filename)
        const result = await cloudinary.uploader.upload(sourceUrl, {
            folder: 'chat_uploads', // Same folder as before
            resource_type: mimeType === 'image' ? 'image' : mimeType === 'video' ? 'video' : 'auto', // Resource type
            overwrite: true, // Overwrite if exists
        });

        // Return new file URL and public ID (similar to returning new file path)
        return { fileURL: result.secure_url, public_id: result?.public_id };
    } catch (err) {
        console.error('Error copying file in Cloudinary:', err); // Log error if copying fails
        throw err; // Rethrow error to caller
    }
};

const deleteFile = async (publicId, fileType) => {
    try {
        // Delete file from Cloudinary by public ID with correct resource type
        await cloudinary.uploader.destroy(publicId, {
            resource_type: fileType.startsWith('video/') || fileType.startsWith('audio/') ? 'video' : 'image',
        });

        // No return, silent success similar to your original implementation
    } catch (err) {
        if (err.http_code === 404) {
            console.warn("File not found in Cloudinary:", publicId); // Warn if file not found in Cloudinary
        } else {
            console.error("Error deleting file from Cloudinary:", err); // Log other errors during delete
        }
    }
};

const startServer = async () => {
    try {
        mongodbConnect();
        // const PORT = process.env.PORT || 3030;
        const PORT = 3030;
        const server = app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
        });
        const wss = new WebSocketServer({ server });
        wss.on("connection", async (connection, req) => {
            // Extract the cookies from request headers and split them by ";"
            const token = req?.headers?.cookie?.split(";");

            if (token) {
                // Iterate over each cookie string
                token.map((str) => {
                    // Check if the cookie string starts with the token name "chat_app_user_token"
                    if (str?.trim().startsWith("chat_app_user_token")) {
                        // Extract the token value after the "=" sign
                        let token = str.split("=")[1];
                        if (token) {
                            // Verify the JWT token with the secret key
                            jwt.verify(token, process.env.JWT_SECRET_KEY, (err, userData) => {
                                if (err) throw err; // Throw error if verification fails

                                // Destructure the user ID from the decoded token data
                                const { _id } = userData;

                                // Assign the user ID to the current WebSocket connection object
                                // console.log('web socket', userData);
                                connection.currentUserID = _id;
                            });
                        }
                    }
                })
            };
            // Function to send data to a specific user or connection
            // sendTo function has 4 parameters:
            // 1. to (userID): The recipient's user ID
            // 2. sendingType (string): The event type or message type being sent
            // 3. dataName (string): The key name for the data being sent
            // 4. sendingData (object/string): The actual data to be sent
            function sendTo(to, sendingType, dataName, sendingData) {
                [...wss.clients] // Get all WebSocket clients
                    .filter((client) => client.currentUserID === to) // Find the client with matching userID
                    .map((To) => {
                        // Send the data as JSON string to the matched client
                        To.send(JSON.stringify({ type: sendingType, [dataName]: sendingData }));
                    });
            };
            // Async function to get a single chat's data by their ID from the database
            async function getSingleChatData(customID) {
                let chatData = await ChatModel.findOne({ customID }); // Find chat document by customID
                return chatData; // Return the chat data object
            };
            // Async function to get a single user's data by their ID from the database
            async function getSingleUserData(_id) {
                let userData = await UserModel.findOne({ _id }); // Find user document by _id
                return userData; // Return the user data object
            };

            // Async function to get a single broadcast message data by its ID
            async function getSingleBroadcastData(_id) {
                let broadcastData = await ChatBroadcastModel.findOne({ _id }); // Find broadcast document by _id
                return broadcastData; // Return the broadcast data object
            };

            // Async function to get a single group data by its ID
            async function getSingleGroupData(_id) {
                let groupData = await GroupModel.findOne({ _id }); // Find group document by _id
                return groupData; // Return the group data object
            };

            // Function to get all connections of the current user excluding blocked users
            function getNonBlockedConnections(currentUserData) {
                let currentUserID = currentUserData?._id; // Current user's ID
                let connections = currentUserData?.connections; // Array of connection objects

                // Filter connections to exclude blocked users
                let filterdConnections = connections?.filter(connectionInfo => {
                    // Determine the target user ID from connection info
                    let targetUserID = connectionInfo?.initiaterUserID?.toString() == currentUserID
                        ? connectionInfo?.targetUserID?.toString()
                        : connectionInfo?.initiaterUserID?.toString();

                    // Return true if target user is not in blockedUsers list
                    return !currentUserData?.blockedUsers?.includes(targetUserID);
                })?.map((connectionInfo) => {
                    // Map the filtered connections to their target user IDs as strings
                    let targetUserID = connectionInfo?.initiaterUserID?.toString() == currentUserID
                        ? connectionInfo?.targetUserID?.toString()
                        : connectionInfo?.initiaterUserID?.toString();
                    return targetUserID?.toString();
                });

                return filterdConnections; // Return the filtered user IDs
            };

            // Function to send profile info updates to legal users based on visibility settings
            function sendProfileInfoToLegalUsers(currentUserData, visibilityKey, actionedToKey) {
                // Determine which profileInfo field to update based on visibilityKey
                let updatingDataKey = visibilityKey == "profilePicVisibility" ? "profilePic"
                    : visibilityKey == "aboutVisibility" ? "about"
                        : "activeStatus";

                // Get visibility setting for current user data
                let checkingDataVisibility = currentUserData?.visibility?.[visibilityKey];
                // Get list of users affected by visibility action (included/excluded)
                let checkingDataActionedTo = currentUserData?.visibility?.[actionedToKey];
                // Get all non-blocked connections of the current user
                let nonBlockedConnections = getNonBlockedConnections(currentUserData);

                if (checkingDataVisibility == "included" || checkingDataVisibility == "excluded") {
                    // Filter included users based on isIncluded flag
                    let includedUsers = checkingDataActionedTo?.filter((actionedToInfo) => (actionedToInfo?.isIncluded));
                    // Filter excluded users based on visibility setting and flags
                    let excludedUsers = checkingDataActionedTo?.filter((actionedToInfo) => checkingDataVisibility == "included" ?
                        (!actionedToInfo?.isIncluded) : actionedToInfo?.isExcluded
                    );

                    // Determine users allowed to see the info based on visibility setting
                    let currentInfoAllowedTo = checkingDataVisibility == "included"
                        ? includedUsers?.map((info) => info?.targetUserID?.toString())
                        : [
                            // Users not explicitly actioned to + those not excluded
                            ...nonBlockedConnections?.filter(connectedUserID => {
                                return (
                                    !checkingDataActionedTo?.some((actionedToInfo) => actionedToInfo?.targetUserID?.toString() == connectedUserID)
                                )
                            }),
                            ...checkingDataActionedTo?.filter((actionedToInfo) => !actionedToInfo?.isExcluded)?.map((info) => info?.targetUserID?.toString())
                        ];

                    // Determine users NOT allowed to see the info based on visibility setting
                    let currentInfoNotAllowedTo = checkingDataVisibility == "included"
                        ? [
                            // Users not actioned to + excluded users
                            ...nonBlockedConnections?.filter(connectedUserID => {
                                return (
                                    !checkingDataActionedTo?.some((actionedToInfo) => actionedToInfo?.targetUserID?.toString() == connectedUserID)
                                )
                            }),
                            ...excludedUsers?.map((info) => info?.targetUserID?.toString())
                        ]
                        : excludedUsers?.map((info) => info?.targetUserID?.toString());

                    // Send profile info update to all allowed users
                    currentInfoAllowedTo?.forEach(allowedUserID => {
                        sendTo(
                            allowedUserID,
                            "user:profileInfo:change",
                            "newProfileInfo",
                            {
                                userID: currentUserData?._id,
                                updatingData: {
                                    [updatingDataKey]: currentUserData?.profileInfo?.[updatingDataKey],
                                    ...(updatingDataKey === "profilePic" && {
                                        publicId: currentUserData?.profileInfo?.publicId
                                    }),
                                }
                            },
                        );
                    });

                    // Send empty profile info to users not allowed to see it (hide info)
                    currentInfoNotAllowedTo?.forEach(nowAllowedUserID => {
                        sendTo(
                            nowAllowedUserID,
                            "user:profileInfo:change",
                            "newProfileInfo",
                            {
                                userID: currentUserData?._id,
                                updatingData: {
                                    [updatingDataKey]: "",
                                }
                            }
                        );
                    })
                } else {
                    // If visibility is public, connections only, or private
                    nonBlockedConnections?.forEach(connectedUserID => {
                        sendTo(
                            connectedUserID,
                            "user:profileInfo:change",
                            "newProfileInfo",
                            {
                                userID: currentUserData?._id,
                                updatingData: {
                                    // Hide info if private, otherwise show current info
                                    [updatingDataKey]: checkingDataVisibility == "private" ? "" : currentUserData?.profileInfo?.[updatingDataKey],
                                }
                            }
                        );
                    });
                };
            };

            // Async function to update user's profile info like name, about, activeStatus, or profile pic
            async function handleChangeUserPorfileInfo(newProfileInfo) {
                const {
                    currentUserID,        // ID of user making the change
                    visibilityKey,        // e.g. "aboutVisibility"
                    actionedToKey,        // e.g. "aboutActionedTo"
                    updatingDataKey,      // e.g. "about"
                    updatingValue,        // The new data (text or file info)
                } = newProfileInfo;

                // Handle saving new profile pic file, if provided
                let profilePicInfo = (updatingValue?.fileURL) ? await handleFile(updatingValue) : null;
                if (profilePicInfo?.err) {
                    sendTo(currentUserID, 'setting:failed', '', null);
                    return;
                }
                // Delete old profile pic file if oldPublicId is provided
                (updatingValue?.oldPublicId) && await deleteFile(updatingValue?.oldPublicId, "image/");

                // Compose the property path to update inside profileInfo
                const updatingProperty = `profileInfo.${updatingDataKey}`;

                try {
                    const setObject = {};
                    if (updatingDataKey === "profilePic") {
                        // Set new profile pic URL and publicId
                        setObject["profileInfo.profilePic"] = profilePicInfo?.fileURL || "";
                        setObject["profileInfo.publicId"] = profilePicInfo?.publicId || "";
                    } else {
                        // Set text fields like name or about
                        setObject[updatingProperty] = updatingValue?.name || updatingValue?.description || updatingValue?.activeStatus;
                        if (updatingDataKey === "name") {
                            // If updating name, also update bgColor if provided
                            setObject["profileInfo.bgColor"] = updatingValue?.bgColor || "";
                        }
                    };

                    // Update user document in DB and get the new data back
                    let updatedUserData = await UserModel.findOneAndUpdate(
                        { _id: currentUserID },
                        { $set: setObject },
                        { new: true, runValidators: true }
                    );
                    // Notify the user who changed their info
                    sendTo(
                        currentUserID,
                        "user:profileInfo:change",
                        "newProfileInfo",
                        {
                            userID: currentUserID,
                            updatingData: {
                                [updatingDataKey]: updatedUserData?.profileInfo?.[updatingDataKey],
                                ...(updatingDataKey == "profilePic" && { publicId: updatedUserData?.profileInfo?.publicId }),
                            },
                        }
                    );

                    if (updatingDataKey == "name") {
                        // If name changed, notify all connected users about the name change
                        updatedUserData?.connections?.forEach(connectionInfo => {
                            let targetUserID = connectionInfo?.initiaterUserID?.toString() == currentUserID
                                ? connectionInfo?.targetUserID?.toString()
                                : connectionInfo?.initiaterUserID?.toString();
                            sendTo(targetUserID, 'user:profileInfo:change', 'newProfileInfo', {
                                userID: currentUserID,
                                updatingData: {
                                    name: updatedUserData?.profileInfo?.name,
                                }
                            });
                        });
                    } else {
                        // For other fields, send profile info updates to legal users based on visibility rules
                        sendProfileInfoToLegalUsers(updatedUserData, visibilityKey, actionedToKey);
                    };
                } catch (error) {
                    // Notify user if updating failed
                    sendTo(currentUserID, 'setting:failed', '', null);
                }
            };
            // Async function to update user's email to connections
            async function handleChangeUserEmail(currentUserID) {
                const currentUserData = await getSingleUserData(currentUserID);
                currentUserData?.connections?.forEach(connectionInfo => {
                    let targetUserID = connectionInfo?.initiaterUserID?.toString() == currentUserID
                        ? connectionInfo?.targetUserID?.toString()
                        : connectionInfo?.initiaterUserID?.toString();
                    sendTo(targetUserID, 'user:email:update', 'emailInfo', {
                        userID: currentUserID,
                        email: currentUserData?.email
                    });
                });
            };
            // function to handle the missed call
            async function handleMissedCall(callData) {
                let { callee, status, customID, ringDuration, deletedByUsers } = callData;
                // Update the call document with new status and ring duration
                const updatedCallData = await CallModel.updateOne(
                    { customID },
                    {
                        $set: { status, ringDuration }
                    }
                );
                // Notify the callee about the missed call, only when the call data is not deleted by callee, as if caller is blocked the callee , so the callee will not receive the missed call notification
                if (!deletedByUsers?.includes(callee)) {
                    sendTo(
                        callee,
                        'call:missed',
                        'callData',
                        callData
                    );
                };
            };
            // function to handle the call ended
            async function handleCallEnded(callData) {
                let { remotePeer, status, customID, ringDuration, callDuration } = callData;
                console.log("remotePeer", remotePeer)
                // Update the call document with status, ring duration, and call duration
                const updatedCallData = await CallModel.updateOne(
                    { customID },
                    {
                        $set: { status, ringDuration, callDuration }
                    }
                );
                // Notify the remote peer that the call has ended
                sendTo(
                    remotePeer,
                    'call:ended',
                    'callData',
                    callData
                );
            };
            async function indicateOnlineUsers() {
                const allClients = [...wss.clients];

                // 1. Get all user IDs (for offline detection and call handling)
                const allUsers = await UserModel.find();
                const allUserIDs = allUsers.map(user => user._id.toString());

                // 2. Get current online user IDs from WebSocket clients
                const onlineUserIDs = _.uniq(
                    allClients.map(client => client?.currentUserID).filter(Boolean)
                );

                // 3. Detect offline users by comparing all users with currently online users
                const offlineUserIDs = allUserIDs.filter(id => !onlineUserIDs.includes(id));

                // 4. Update offline users' activeStatus to timestamp if they were previously "online"
                await UserModel.updateMany(
                    {
                        _id: { $in: offlineUserIDs },
                        "profileInfo.activeStatus": "online"
                    },
                    {
                        $set: { "profileInfo.activeStatus": new Date().toISOString() }
                    }
                );
                console.log("offlineUserIDs1", offlineUserIDs);
                // 5. Handle missed calls and calls that ended when user went offline
                const callsToUpdate = await CallModel.find({
                    $or: [
                        { status: { $in: ["calling", "ringing"] } },
                        { status: "accepted", callDuration: "" }
                    ]
                });

                // getTimeDifference calculates the difference between two timestamps and returns it as a formatted string
                function getTimeDifference(timestamp1, timestamp2) {
                    const date1 = new Date(timestamp1);
                    const date2 = new Date(timestamp2);
                    let diffInSeconds = Math.abs(Math.floor((date1 - date2) / 1000));
                    console.log("date1", date1, "date2", date2, diffInSeconds);

                    const hours = Math.floor(diffInSeconds / 3600);
                    const minutes = Math.floor((diffInSeconds % 3600) / 60);
                    const seconds = diffInSeconds % 60;

                    const pad = num => String(num).padStart(2, '0');

                    if (hours > 0) {
                        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
                    } else {
                        return `${pad(minutes)}:${pad(seconds)}`;
                    }
                };
                // Loop through calls that need updating for missed or ended status
                for (const callObject of callsToUpdate) {
                    let call = callObject?.toObject();
                    const callerID = call?.caller?.toString();
                    const calleeID = call?.callee?.toString();
                    console.log("offlineUserIDs", offlineUserIDs, "callerID", callerID, "calleeID", calleeID);
                    // Missed call: If call status is "calling" and caller is offline, mark as missed
                    if (["calling", "ringing"]?.includes(call?.status) && offlineUserIDs?.includes(callerID)) {
                        console.log("callA", call?.callingTime, new Date().toISOString(), getTimeDifference(call?.callingTime, new Date().toISOString()))
                        let updatedCallData = {
                            ...call,
                            caller: callerID,
                            callee: calleeID,
                            status: 'missed_call',
                            ringDuration: getTimeDifference(call?.callingTime, new Date().toISOString())
                        };
                        await handleMissedCall(updatedCallData);
                    }

                    // Ended call: If call status is "accepted" but no callDuration, and either party is offline
                    else if (call?.status === "accepted" && call?.callDuration == "") {
                        const isCallerOffline = offlineUserIDs?.includes(callerID);
                        const isCalleeOffline = offlineUserIDs?.includes(calleeID);
                        if (isCallerOffline || isCalleeOffline) {
                            let updatedCallData = {
                                ...call, status: 'accepted',
                                // callDuration from call accepted time to now
                                callDuration: getTimeDifference(call?.updatedAt.toISOString(), new Date().toISOString()),
                                // ringDuration from calling time to answer time
                                ringDuration: getTimeDifference(call?.callingTime, call?.updatedAt.toISOString()),
                                // remotePeer is the one who is still online
                                remotePeer: isCallerOffline ?
                                    calleeID : callerID
                            };
                            await handleCallEnded(updatedCallData);
                        }
                    }
                }

                // 6. For all offline users, trigger profile change logic to update their activeStatus
                const updatedOfflineUsers = await UserModel.find({ _id: { $in: offlineUserIDs } });

                updatedOfflineUsers.forEach(user => {
                    const offlineData = {
                        currentUserID: user._id.toString(),
                        visibilityKey: "activeStatusVisibility",
                        actionedToKey: "activeStatusActionedTo",
                        updatingDataKey: "activeStatus",
                        updatingValue: { activeStatus: new Date().toISOString() }
                    };
                    handleChangeUserPorfileInfo(offlineData);
                });
            };
            connection.on("message", async (socketMessage) => {
                const webSocketMessageData = JSON.parse(socketMessage.toString()); // Parse incoming WebSocket message data
                async function handleNewConnectionRequest(connectionInfos) {
                    for (let connectionInfo of connectionInfos) {
                        const { initiaterUserID, targetUserID } = connectionInfo;

                        // Check if any connection already exists between A and B (both directions)
                        const existingConnection = await UserModel.findOne({
                            _id: { $in: [initiaterUserID, targetUserID] },
                            connections: {
                                $elemMatch: {
                                    $or: [
                                        { initiaterUserID, targetUserID },
                                        { initiaterUserID: targetUserID, targetUserID: initiaterUserID }
                                    ]
                                }
                            }
                        });

                        if (existingConnection) continue; // skip if connection already exists

                        // Add connection to both users
                        await UserModel.updateMany(
                            { _id: { $in: [initiaterUserID, targetUserID] } },
                            { $addToSet: { connections: connectionInfo } }
                        );

                        // Notify users
                        sendTo(initiaterUserID, 'connection:requested', 'connectionInfo', connectionInfo);
                        const initiaterUserData = await getSingleUserData(initiaterUserID);
                        sendTo(targetUserID, 'connections:requests', 'connectionInfos', [
                            { ...connectionInfo, initiaterUserData }
                        ]);
                    }
                };
                /**
                 * Handles the removal of a connection between two users.
                 * This function is used in three cases:
                 * 1. When the initiating user cancels a pending connection request.
                 * 2. When the target user rejects a pending connection request.
                 * 3. When either user removes an already accepted connection.
                 */
                async function handleConnectionRemove(connectionInfos) {
                    for (let connectionInfo of connectionInfos) {
                        // Destructure user IDs involved in the connection
                        let { initiaterUserID, targetUserID, remover } = connectionInfo;
                        // Filter to find both users involved in the connection
                        let filterCondition = {
                            _id: { $in: [targetUserID, initiaterUserID] }, // Match both users
                        };

                        // Define update operation to remove the connection from both users' records
                        let updateOperation = {
                            $pull: {
                                connections: {
                                    // Remove any connection entry that matches either side
                                    $or: [
                                        { initiaterUserID: targetUserID },
                                        { targetUserID: targetUserID }
                                    ]
                                }
                            }
                        };

                        // Perform update for both users in the database
                        await UserModel.updateMany(filterCondition, updateOperation);

                        // Notify the user about the connection removal (real-time feedback)
                        sendTo(
                            remover == "targetUser" ? initiaterUserID : targetUserID, // User to notify
                            "remove:connections",      // Event name
                            "connectionInfos",         // Data label
                            [connectionInfo]           // Data payload
                        );
                    };
                };

                async function handleConnectionAccept(connectionInfos) {
                    for (let connectionInfo of connectionInfos) {
                        // Destructure connection info
                        let { initiaterUserID, connectionID } = connectionInfo;
                        // Filter to find the connection by its ID inside connections array
                        let filterCondition = {
                            "connections.connectionID": connectionID
                        };

                        // Update operation to set connection status to "accepted"
                        let updateOperation = {
                            $set: { "connections.$.status": "accepted" }
                        };

                        // Update both users' connections with accepted status
                        await UserModel.updateMany(filterCondition, updateOperation);

                        // Notify the initiator user about acceptance
                        sendTo(initiaterUserID, 'connections:accepted', 'connectionInfos', [connectionInfo]);
                    };
                };

                // Function to check if either user has blocked the other
                async function checkTheBlockingStatus(initiaterUserID, targetUserID) {
                    let initiaterUserData = await getSingleUserData(initiaterUserID);
                    let targetUserData = await getSingleUserData(targetUserID);

                    // Check if either user has blocked the other by user ID
                    let isBlockedEachOther = (
                        initiaterUserData?.blockedUsers?.includes(targetUserID) ||
                        targetUserData?.blockedUsers?.includes(initiaterUserID)
                    ) ? true : false;

                    return isBlockedEachOther;
                };

                // Function to check allowance for chat deliveryStatus, seenStatus, story's seenStatus, and profileInfo visibility between users
                function checkAndAllowSomePrivacy(currentUserData, checkingDataKey, targetUser) {
                    // Compose keys for visibility and actionedTo arrays
                    let visibilityKey = `${checkingDataKey}Visibility`;
                    let actionedToKey = `${checkingDataKey}ActionedTo`;
                    let checkingDataVisibility = currentUserData?.visibility?.[visibilityKey];
                    let checkingDataActionedTo = currentUserData?.visibility?.[actionedToKey];
                    let targetUserBlocked = currentUserData?.blockedUsers?.includes(targetUser?.toString());
                    if (checkingDataVisibility != "private" && !targetUserBlocked) {
                        // Check if visibility is public or connections-only
                        let isFullAllowed = ["public", "connections"]?.includes(checkingDataVisibility);

                        // Check if the target user is allowed based on included/excluded lists
                        let isUserAllowed = isFullAllowed || checkingDataActionedTo?.some((actionedToInfo) =>
                            checkingDataVisibility == "included" ?
                                (actionedToInfo?.isIncluded && actionedToInfo?.targetUserID?.toString() == targetUser?.toString())
                                :
                                (
                                    (!actionedToInfo?.isExcluded && actionedToInfo?.targetUserID?.toString() == targetUser?.toString())
                                        ?
                                        true
                                        :
                                        !checkingDataActionedTo?.some((actionedToInfo) => actionedToInfo?.targetUserID?.toString() == targetUser?.toString())
                                )
                        );
                        return isUserAllowed;
                    } else {
                        // Private visibility means no access allowed
                        return false
                    };
                };

                // Function to change profile info or chat delivery, seen, and story seen status visibility settings
                async function handleChangePrivacy(newConditionData, isUpdateToOtherUsers) {
                    const {
                        currentUserID,
                        visibilityKey,           // e.g. "profilePicVisibility"
                        actionedToKey,           // e.g. "profilePicActionedTo"
                        visibilityValue,         // e.g. "included"
                        actionedToValues         // e.g. [{ targetUserID, isIncluded: true }]
                    } = newConditionData;

                    // Prepare dynamic keys for visibility and actionedTo properties
                    const visibilityProperty = `visibility.${visibilityKey}`;
                    const actionedToProperty = `visibility.${actionedToKey}`;

                    // Create update object conditionally including actionedTo if provided
                    const updateObject = {
                        $set: {
                            [visibilityProperty]: visibilityValue,
                            ...(Array.isArray(actionedToValues) && actionedToValues.length > 0 && {
                                [actionedToProperty]: actionedToValues
                            })
                        }
                    };

                    try {
                        // Update the user's visibility settings in the database
                        const result = await UserModel.updateOne(
                            { _id: currentUserID },
                            updateObject
                        );

                        // Notify the user of the successful setting update
                        sendTo(currentUserID, 'setting:updated', '', null);

                        if (isUpdateToOtherUsers) {
                            // If update affects other users, send updated profile info to those users
                            const currentUserData = await getSingleUserData(currentUserID);
                            sendProfileInfoToLegalUsers(currentUserData, visibilityKey, actionedToKey);
                        };
                    } catch (error) {
                        // Notify the user if the setting update failed
                        sendTo(currentUserID, 'setting:failed', '', null);
                    }
                };

                // Update group adding allowance settings for a user
                async function handleChangeGroupAddingMeAllowence({ userID, addingToGroupAllowence, addingToGroupActionedTo }) {
                    await UserModel.updateOne(
                        { _id: userID },
                        {
                            $set: {
                                "visibility.addingToGroupAllowence": addingToGroupAllowence,
                                ...(addingToGroupActionedTo.length > 0 && {
                                    "visibility.addingToGroupActionedTo": addingToGroupActionedTo
                                })
                            }
                        }
                    );

                    // Notify the user about the updated group adding settings
                    sendTo(userID, 'setting:updated', '', null);
                };

                // Function to toggle blocking or unblocking a user
                async function toggleUserBlocking({ actionType, initiatorID, targetUserID }) {
                    const isBlocking = actionType == "block";

                    // Define filter condition based on blocking or unblocking
                    const filterCondition = {
                        _id: initiatorID,
                        blockedUsers: isBlocking ? { $ne: targetUserID } : targetUserID // Ensure valid condition for block/unblock
                    };

                    // Define update operation to add or remove from blockedUsers array
                    const updateOperation = isBlocking
                        ? { $addToSet: { blockedUsers: targetUserID } } // Add user to blocked list
                        : { $pull: { blockedUsers: targetUserID } };   // Remove user from blocked list

                    // Execute the update operation in the database
                    const result = await UserModel.updateOne(filterCondition, updateOperation);

                    // If the operation was successful
                    if (result?.modifiedCount > 0) {
                        if (isBlocking) {
                            // When blocking: restrict profile visibility by clearing sensitive fields
                            sendTo(targetUserID, "user:profileInfo:change", "newProfileInfo",
                                {
                                    userID: initiatorID,
                                    updatingData: {
                                        about: "",
                                    },
                                }
                            );
                            sendTo(targetUserID, "user:profileInfo:change", "newProfileInfo",
                                {
                                    userID: initiatorID,
                                    updatingData: {
                                        profilePic: "",
                                    },
                                }
                            );
                            sendTo(targetUserID, "user:profileInfo:change", "newProfileInfo",
                                {
                                    userID: initiatorID,
                                    updatingData: {
                                        activeStatus: "",
                                    },
                                }
                            );
                            // Notify initiator of successful blocking
                            sendTo(initiatorID, "user:block:success", "", null);
                        } else {
                            // When unblocking: restore visibility settings by notifying legal users
                            const initiatorData = await getSingleUserData(initiatorID);
                            sendProfileInfoToLegalUsers(initiatorData, "aboutVisibility", "aboutActionedTo");
                            sendProfileInfoToLegalUsers(initiatorData, "profilePicVisibility", "profilePicActionedTo");
                            sendProfileInfoToLegalUsers(initiatorData, "activeStatusVisibility", "activeStatusActionedTo");
                        }
                    }
                };
                // function to add or update recent chats tab for the sender and receiver
                async function addOrUpdateRecentTab(tabInfo, userID) {
                    // userID is the user who is adding the tab or updating the tab
                    let { tabID, recentTime, clearingTime, disappearingTime } = tabInfo;
                    // Update the tab if it exists, else add a new one
                    let filterCondition = {
                        _id: userID,
                        "recentChatsTabs.tabID": tabID?.toString() // Check if tabID already exists in recentChatsTabs
                    };

                    let updateOperation = {
                        $set: {
                            "recentChatsTabs.$.recentTime": recentTime,
                            "recentChatsTabs.$.clearingTime": clearingTime,
                            "recentChatsTabs.$.disappearingTime": disappearingTime
                        }
                    };

                    // Attempt to update the existing tab entry
                    let updateResult = await UserModel.updateOne(filterCondition, updateOperation);
                    // If no tab was updated, add a new one
                    if (updateResult.matchedCount === 0 && tabInfo?.tabID) {
                        filterCondition = {
                            _id: userID
                        };

                        updateOperation = {
                            $push: {
                                recentChatsTabs: tabInfo // Add new tab
                            }
                        };

                        // Insert a new recentChatsTabs entry
                        await UserModel.updateOne(filterCondition, updateOperation);
                    }
                };
                // Function to handle new chat messages
                async function handleNewChats(newChats) {
                    let savedChatsArray = []; // To store all successfully created chats
                    console.log("newChatsCH1", newChats?.length, newChats)
                    // Using for...of to handle async operations properly
                    for (let newChat of newChats) {
                        let { customID, chatType, isGroupType, senderID, receiversInfo, file, text, isForwarded, tabInfo, isEdited, disappearingTime } = newChat;
                        let newChatClone = { ...newChat };
                        let fileData = null;
                        // fetch meta data of url if the chat is text type and text has some URL
                        if (chatType == "text" && text) {
                            text = await fetchMetadata(text);
                        };
                        // Handle file upload if necessary (only if the file is not forwarded)
                        if (file) {
                            // copy the file if it is forwarded
                            if (isForwarded && chatType != "unsent") {
                                // Copy the file with a new name to avoid conflicts
                                let copiedFileData = await copyFileWithNewName(file?.fileURL, file?.fileType);
                                fileData = {
                                    ...file,
                                    public_id: copiedFileData?.public_id,
                                    fileURL: copiedFileData?.fileURL,
                                };
                            };
                            // create a new file if it is not forwarded
                            if (!isForwarded && chatType != "unsent") {
                                // Upload the file using handleFile
                                fileData = await handleFile(file);
                                if (fileData?.err) {
                                    sendTo(
                                        senderID,
                                        'new:chats',
                                        'newChats',
                                        [{ ...newChat, isFailed: true }] //isFailed is a temporary value for tracking if file chat is failed , it is used in client side, not saved in DB
                                    );
                                    return;
                                }
                            };
                            // Delete the old file if it was edited
                            if (isEdited) {
                                // Remove the old file using its public ID
                                await deleteFile(newChat?.file?.oldFilePublicId, file?.fileType);
                                if (chatType == "unsent") {
                                    fileData = null;
                                };
                            };
                        } else {
                            // Use existing file data if forwarded
                            fileData = file;
                        };
                        // Get active WebSocket users connected to the server
                        const onlineUsers = [...wss.clients].map(client => ({
                            currentUserID: client.currentUserID
                        }));
                        // Remove duplicate users by their currentUserID
                        let activeUsers = _.uniqBy(onlineUsers, "currentUserID");
                        // Update chat delivery status based on active users
                        receiversInfo = await Promise.all(
                            receiversInfo?.map(async (receiverInfo) => {
                                // Check if sender is blocked by the receiver, or oppsite
                                let blockingStatus = await checkTheBlockingStatus(senderID, receiverInfo?.receiverID);
                                // !isEdited && !isGroupType && await checkTheBlockingStatus(senderID, receiversInfo[0]?.receiverID)
                                // Retrieve receiver's user data
                                const receiverData = await getSingleUserData(receiverInfo.receiverID);
                                // Check privacy settings for delivery and seen status
                                const deliveredStatusAllowedByReceiver = checkAndAllowSomePrivacy(receiverData, "chatDeliveryStatus", senderID);
                                const seenStatusAllowedByReceiver = checkAndAllowSomePrivacy(receiverData, "chatSeenStatus", senderID);

                                // Determine if receiver is currently online
                                const isUserOnline = activeUsers.some(user => receiverInfo.receiverID === user.currentUserID);
                                // Determine if the message is considered delivered
                                const isDelivered = deliveredStatusAllowedByReceiver && isUserOnline && !blockingStatus;
                                // Timestamp for delivery time
                                let deliveredTime = new Date().toISOString();
                                // Check if all receivers are the same as the sender (single receiver scenario)
                                let senderAndReceiverSame = receiversInfo?.every(receiverInfo => receiverInfo?.receiverID?.toString() === senderID?.toString());
                                // Prepare tab info for the receiver's recent chats tab
                                let tabInfoForReceiver = {
                                    tabType: newChat?.isGroupType ? 'group' : 'user', // Determine tab type
                                    tabID: newChat?.isGroupType ? newChat?.toGroupID : newChat?.senderID,
                                    recentTime: deliveredTime, // Use deliveredTime if receiver is online
                                    clearingTime: "", // Keep clearingTime empty since it's a new message
                                    isArchived: false,
                                    isPinned: false,
                                    disappearingTime
                                };
                                // add or update the recent chats tab for the receiver only when the chats is not deleted by the receiver
                                !newChat?.deletedByUsers?.includes(receiverInfo?.receiverID) &&
                                    await addOrUpdateRecentTab(tabInfoForReceiver, receiverInfo.receiverID);
                                return {
                                    ...receiverInfo,
                                    status: senderAndReceiverSame ? "seen" : isDelivered ? 'delivered' : 'sent', //set delivered for senderAndReceiverSame and check when sender and receivers are differents
                                    deliveredTime,
                                    isDeliveredStatusAllowed: senderAndReceiverSame ? true : deliveredStatusAllowedByReceiver,
                                    isSeenStatusAllowed: senderAndReceiverSame ? true : (deliveredStatusAllowedByReceiver && seenStatusAllowedByReceiver),
                                    isInBlocking: isGroupType ? false : blockingStatus //it is temporary property for tracking blocking from any side , so if group message, set to true , else blocking status,
                                };
                            })
                        );
                        // Update newChatClone with processed file data and updated receiversInfo
                        newChatClone = {
                            ...newChatClone,
                            text,
                            file: fileData,
                            receiversInfo: receiversInfo,
                            deletedByUsers: [
                                ...receiversInfo?.filter((receiversInfo) => receiversInfo?.isInBlocking)?.map((receiversInfo) => receiversInfo?.receiverID),
                                ...newChatClone?.deletedByUsers
                            ] // if any one of sender, receiver blocked each other, add receiverID in deletedByUsers, else by dwfault []; 
                        };

                        // ai assistance chatting response - start
                        let aIResponse = null;

                        // Check if AI assistant feature is enabled and the message is sent by the current user
                        if (newChat?.aiAssistant && newChat?.senderID == connection.currentUserID) {

                            // Call the function to generate AI response based on the user message and optional reply context
                            aIResponse = await handleAIResponse(
                                JSON.parse(newChat?.text)?.map(g => g?.value)?.join(' '), // Extract and join message text parts
                                newChat?.repliedToInfo?.repliedToID || null // Pass the repliedToID if available
                            );

                            // If AI response failed, notify the sender with a failed message
                            if (aIResponse?.err) {
                                sendTo(
                                    senderID,
                                    'new:chats',
                                    'newChats',
                                    [{ ...newChat, isFailed: true }] // isFailed flag is used on client side to indicate failure; not stored in DB
                                );
                                return; // Stop further processing
                            };
                        };
                        // ai assistance chatting response - end

                        // update the chat data if it is edited 
                        let savedChat = {};
                        if (isEdited) {
                            // Update existing chat document by customID
                            savedChat = await ChatModel.findOneAndUpdate(
                                { customID: customID },  // Find by customID
                                { $set: { ...newChat, file: fileData, receiversInfo: receiversInfo } }, // Update all fields
                                { new: true, runValidators: true } // Return updated doc
                            );
                        } else {
                            // Save chat to database as new entry
                            savedChat = await ChatModel.create(newChatClone);
                        };
                        // Handle group invitation chat type, invite members if needed
                        let invitedGroup = newChat?.chatType == "group-invitaion" ? await handleInviteMembersToGroup(
                            { groupID: newChat?.targetGroupID, invitedUsers: newChat?.invitedUsers }
                        ) : {};
                        if (savedChat) {
                            //add or update the recenet chats tabs in sender's side
                            await addOrUpdateRecentTab({
                                ...tabInfo,
                                clearingTime: "", // Reset clearingTime as it is a new message
                                isArchived: false,
                                isPinned: false,
                                disappearingTime
                            }, senderID);
                            // Add the saved chat to the array
                            savedChatsArray.push(savedChat?._doc);
                        }

                        // Once all chats are saved
                        if (savedChatsArray.length === newChats.length) {
                            // Send all created chats to the sender for updating some informations
                            sendTo(
                                senderID,
                                'new:chats',
                                'newChats',
                                savedChatsArray
                            );
                            // Get unique receivers across all saved chats
                            let uniqueReceivers = _.uniqBy(
                                savedChatsArray.flatMap(chat => chat.receiversInfo),
                                "receiverID"
                            );
                            for (let receiverInfo of uniqueReceivers) {
                                // Filter only chats relevant to the current receiver and make ensuring to exlcude the chat who is in blocking condition
                                let chatsDataForReceiver = savedChatsArray.filter(plainChatData => {
                                    // let plainChatData = chatData.toObject();
                                    return (
                                        plainChatData?.receiversInfo?.some(receiverInfo2 =>
                                            receiverInfo2?.receiverID?.toString() === receiverInfo?.receiverID?.toString()
                                        ) && !plainChatData?.deletedByUsers?.includes(receiverInfo?.receiverID?.toString()) //when sender is edited the chat, also check the receiver did not deleted yet
                                    )
                                })?.map(plainChatData => {
                                    return {
                                        ...plainChatData,
                                        receiversInfo: plainChatData.receiversInfo.filter(info => info?.receiverID?.toString() === receiverInfo?.receiverID?.toString()), // Keep only relevant receiverInfo
                                        // Prepare tabInfo for receivers
                                        targetGroupData: invitedGroup //pass the target group data for invited users
                                    }
                                });
                                // Notify receiver about new chats
                                sendTo(
                                    receiverInfo?.receiverID?.toString(), // Target receiver
                                    'new:chats', // Event name for new chats
                                    'newChats', // Identifier for the event
                                    chatsDataForReceiver // Convert Mongoose documents to plain objects
                                );
                            };
                        };
                        // If AI response is valid, prepare a new chat message as a response from the AI assistant
                        if (aIResponse) {
                            // Reuse the original chat data and override specific fields for AI response
                            let aIResponseChatData = {
                                ...newChat, // Inherit base chat data
                                customID: "683008d58200d47fd4987a86" + Date.now(), // Unique ID using AI assistant's ID + timestamp
                                senderID: "683008d58200d47fd4987a86", // Sender ID set to AI assistant's fixed ID
                                text: aIResponse?.type == "text" ? JSON.stringify(aIResponse?.data) : '', // Serialize text data
                                chatType: aIResponse?.type, // Set chat type (text/file/etc.)
                                file: aIResponse?.type == "file" ? aIResponse?.data : '', // If type is file, set file data
                                sentTime: new Date().toISOString(), // Timestamp of when message was generated
                                receiversInfo: [{
                                    status: 'seen', // Mark the message as seen
                                    deliveredTime: new Date().toISOString(), // Time of delivery
                                    seenTime: new Date().toISOString(), // Time of seen
                                    isDeliveredStatusAllowed: true, // Delivery status allowed
                                    isSeenStatusAllowed: true, // Seen status allowed
                                    receiverID: connection.currentUserID // Recipient is the current user
                                }], // Array of recipient metadata
                                deletedByUsers: ["683008d58200d47fd4987a86"], // AI assistant marks its own message as deleted (not shown in its view)
                            };

                            // Add the AI response message to the chat list
                            newChats?.push(aIResponseChatData);
                        };
                    }
                };
                // Function to update chat status for one or more chat data entries
                async function handleChatStatus(chatsData) {
                    try {
                        // chatsData is an array, each object represents one chat's update info
                        // Example of one object: { customID, senderID, receiversInfo: [{ receiverID, status, deliveredTime, seenTime }] }

                        // Array to collect all update promises
                        let updatePromises = [];

                        // Loop through each chat update request
                        for (let chatData of chatsData) {
                            let { customID, receiversInfo } = chatData;

                            // Loop through each receiverInfo object (could be multiple users in group chat)
                            for (let receiver of receiversInfo) {
                                let { receiverID, status, deliveredTime, seenTime } = receiver;

                                // Define the filter to match the correct chat and the correct receiver inside the array
                                let filterCondition = {
                                    customID,
                                    "receiversInfo.receiverID": receiverID,
                                };

                                // Define the update operation using $set with positional operator $
                                const updateOperation = {
                                    $set: {
                                        "receiversInfo.$.status": status,
                                        "receiversInfo.$.deliveredTime": deliveredTime,
                                        "receiversInfo.$.seenTime": seenTime,
                                    },
                                };

                                // Push the update promise to the array
                                updatePromises.push(ChatModel.updateOne(filterCondition, updateOperation));
                            }
                        }

                        // Wait for all database update operations to finish
                        await Promise.all(updatePromises);
                        // Send WebSocket event to notify sender (assumes same senderID for all updates)
                        for (let chatData of chatsData) {
                            sendTo(
                                chatData?.senderID,
                                'update:chats:status',
                                'chatsData',
                                [chatData]
                            );
                        };

                    } catch (error) {
                        // Log any errors encountered during update
                        console.error("Error updating chat status:", error);
                    }
                };

                // Function to delete chats by a specific recipient, or delete permanently if all participants deleted it
                async function handleDeleteChats(chatsData) {
                    let { currentUserID, chatIDsForDelete } = chatsData;

                    // Mark chats as deleted by the current user, avoiding redundant marking
                    const updatePromises = chatIDsForDelete?.map(async (chatID) => {
                        let filterCondition = {
                            customID: chatID,
                            deletedByUsers: { $ne: currentUserID } // Avoid redundant marking
                        };
                        let updateOperation = {
                            $addToSet: { deletedByUsers: currentUserID } // Add current user to deletedByUsers set
                        };
                        return ChatModel.updateMany(filterCondition, updateOperation);
                    });

                    // Wait for all update operations to complete before proceeding
                    const results = await Promise.all(updatePromises);

                    // Proceed only if all updates successfully modified at least one document
                    if (results.every(result => result.modifiedCount > 0)) {
                        // Fetch all chats to check which qualify for permanent deletion
                        let chatsForDeletePermanently = await ChatModel.find({});

                        // Loop through each chat to determine if it should be deleted permanently
                        chatsForDeletePermanently?.forEach(async (chatData) => {
                            // Safe JSON parser to avoid errors on malformed JSON
                            const safeParseJSON = (value) => {
                                try {
                                    return JSON.parse(value) || [];
                                } catch (e) {
                                    return [];
                                }
                            };

                            // Collect all participant IDs (sender and all receivers)
                            const allParticipants = [
                                chatData?.senderID,
                                ...chatData?.receiversInfo?.map(r => r?.receiverID)
                            ].filter(Boolean); // Remove null or undefined IDs

                            // Check if all participants have marked the chat as deleted
                            const deletedByAll = allParticipants.every(userID =>
                                chatData?.deletedByUsers?.includes(userID)
                            );

                            if (deletedByAll) {
                                // Collect file public IDs to delete, depending on chatType
                                let fileURLs = chatData?.chatType === "file"
                                    ? [chatData?.file?.publicId] // For file type, delete single file
                                    : chatData?.chatType?.startsWith("system-")
                                        ? safeParseJSON(chatData?.text)?.map(textData =>
                                            // Extract publicId of profilePic files in system messages
                                            (textData?.publicId && textData?.usedFor === "profilePic") ? textData?.publicId : null
                                        ).filter(Boolean) // Remove nulls
                                        : [];
                                if (fileURLs?.length > 0) {
                                    // Delete all associated files asynchronously
                                    fileURLs?.forEach(async (publicId) => {
                                        if (publicId) await deleteFile(publicId, "image/");
                                    });
                                };
                                // Permanently remove the chat document from the database
                                await ChatModel.deleteOne({ customID: chatData.customID });

                            }
                        });
                    }
                };

                async function handleNewStories(storiesArray) {
                    let savedStoriesArray = []; // To store all successfully saved stories
                    for (let storyData of storiesArray) {
                        let { senderID, customID, storyType, text, mediaFile, isEdited, isForwarded } = storyData;
                        // Fetch current user data of the sender
                        const currentUserData = await getSingleUserData(senderID);
                        // Get non-blocked and allowed connections for story visibility
                        let nonBlockedAndAllowedConnections = getNonBlockedConnections(currentUserData)?.filter((connectedUserID) =>
                            checkAndAllowSomePrivacy(currentUserData, "story", connectedUserID)
                        );
                        let newStoryClone = { ...storyData };
                        let fileData = null;
                        // fetch meta data of url if the chat is text type and text has some URL
                        if (storyType == "text" && text) {
                            text = await fetchMetadata(text);
                        };
                        // let receiversInfo = await Promise.all(
                        //     nonBlockedAndAllowedConnections?.map(async (connectedUserID) => {
                        //         let blockingStatus = await checkTheBlockingStatus(senderID, connectedUserID);
                        //         if (blockingStatus) return null; // Filter out blocked users

                        //         let receiverData = await getSingleUserData(connectedUserID);
                        //         let seenStatusAllowedByReceiver = checkAndAllowSomePrivacy(receiverData, "storySeenStatus", senderID);

                        //         return {
                        //             receiverID: connectedUserID,
                        //             seenTime: null, // Initially unseen
                        //             isSeenStatusAllowed: seenStatusAllowedByReceiver
                        //         };
                        //     })
                        // ).filter(Boolean); // Remove nulls (filtered-out blocked users)
                        let receiversInfo = await Promise.all(
                            (nonBlockedAndAllowedConnections || []).map(async (connectedUserID) => {
                                let blockingStatus = await checkTheBlockingStatus(senderID, connectedUserID);
                                if (blockingStatus) return null;

                                let receiverData = await getSingleUserData(connectedUserID);
                                let seenStatusAllowedByReceiver = checkAndAllowSomePrivacy(receiverData, "storySeenStatus", senderID);

                                return {
                                    receiverID: connectedUserID,
                                    seenTime: null,
                                    isSeenStatusAllowed: seenStatusAllowedByReceiver
                                };
                            })
                        ).then(results => results.filter(Boolean));

                        // Handle file upload if story type is media
                        if (storyType == 'media') {
                            // Copy the media file if story is forwarded
                            if (isForwarded) {
                                let copiedFileData = await copyFileWithNewName(mediaFile?.fileURL, mediaFile?.fileType);
                                fileData = {
                                    ...mediaFile,
                                    public_id: copiedFileData?.public_id,
                                    fileURL: copiedFileData?.fileURL,
                                };
                            };
                            // Handle new file upload if not forwarded
                            if (!isForwarded) {
                                fileData = await handleFile(mediaFile);
                                if (fileData?.err) {
                                    sendTo(
                                        storyData?.senderID,
                                        'new:stories',
                                        'storiesData',
                                        [{ ...storyData, isFailed: true }] //isFailed is a temporary value for tracking if file chat is failed , it is used in client side, not saved in DB
                                    );
                                    return;
                                }
                            };
                            // Delete old file if story was edited
                            if (isEdited) {
                                await deleteFile(storyData?.mediaFile?.oldFilePublicId, mediaFile?.fileType)
                            };
                        }

                        // Update story clone with status and file data
                        newStoryClone = {
                            ...newStoryClone,
                            statusForSender: "sent",
                            mediaFile: fileData,
                            receiversInfo: receiversInfo,
                            text
                        };

                        // Save or update the story in the database
                        let savedStory = {};
                        if (isEdited) {
                            savedStory = await StoryModel.findOneAndUpdate(
                                { customID: customID },  // Find story by customID
                                { $set: { ...storyData, mediaFile: fileData } }, // Update fields including file data
                                { new: true, runValidators: true } // Return updated document
                            );
                        } else {
                            // Create new story document
                            savedStory = await StoryModel.create(newStoryClone);
                        };
                        if (savedStory) {
                            savedStoriesArray.push(savedStory); // Store saved story
                        }
                    }

                    // Once all stories are saved, send them to the sender and receivers
                    if (savedStoriesArray.length === storiesArray.length) {
                        // Send all saved stories to the sender
                        sendTo(
                            storiesArray[0]?.senderID,
                            'new:stories',
                            'storiesData',
                            savedStoriesArray
                        );

                        // Convert Mongoose documents to plain JavaScript objects
                        let plainStoriesData = savedStoriesArray.map(story => story.toObject());

                        // Get unique receiver IDs from all stories
                        let uniqueReceivers = _.uniqBy(
                            plainStoriesData.flatMap(story => story.receiversInfo),
                            "receiverID"
                        );

                        // For each unique receiver, filter relevant stories and send
                        for (let receiverInfo of uniqueReceivers) {
                            let receiverID = receiverInfo?.receiverID?.toString();
                            // Filter stories relevant to this receiver and not blocked
                            let storiesDataForReceiver = plainStoriesData?.filter(story =>
                                story?.receiversInfo?.some(info => info?.receiverID?.toString() === receiverID)
                            )
                                .map(story => ({
                                    ...story,
                                    receiversInfo: story.receiversInfo.filter(info => info?.receiverID?.toString() === receiverID) // Only relevant receiver info
                                }));

                            // Send filtered stories to the current receiver
                            sendTo(
                                receiverID, // Target receiver
                                'new:stories', // Event name for new stories
                                'storiesData', // Event identifier
                                storiesDataForReceiver
                            );
                        }
                    }
                };
                //handle to story's watching information
                async function handleStoryWatching(storyData) {
                    // Define the filter condition to find the story and specific receiver who hasn't seen it yet
                    let filterCondition = {
                        customID: storyData?.customID,
                        receiversInfo: {
                            $elemMatch: {
                                receiverID: storyData?.watchedBy,
                                seenTime: null, // Only update if story was unseen
                            },
                        },
                    };

                    // Define the update operation to set seenTime for that receiver
                    const updateOperation = {
                        $set: {
                            "receiversInfo.$.seenTime": storyData?.seenTime, // Mark as seen with timestamp
                        },
                    };
                    // Perform the update on the database
                    let updateStoryData = await StoryModel.updateOne(filterCondition, updateOperation);
                    if (updateStoryData.modifiedCount > 0) {
                        // Notify the sender about the watching update
                        sendTo(
                            storyData?.senderID,
                            'update:story:watching',
                            'storyData',
                            storyData
                        );
                    };
                };
                async function handleDeleteStoryForSome(removingStoryForSome) {
                    let { customID, senderID, targetReceivers } = removingStoryForSome;

                    // Prepare filter to find story with receivers to remove
                    let filterCondition = {
                        customID,
                        receiversInfo: {
                            $elemMatch: {
                                receiverID: { $in: targetReceivers }
                            },
                        },
                    };

                    // Prepare update operation to remove target receivers from receiversInfo
                    const updateOperation = {
                        $pull: {
                            receiversInfo: {
                                receiverID: { $in: targetReceivers }
                            },
                        },
                    };

                    // Perform update once to remove all specified receivers
                    let updateStoryData = await StoryModel.updateOne(filterCondition, updateOperation);

                    // If update was successful, notify sender and all removed receivers
                    if (updateStoryData.modifiedCount > 0) {
                        sendTo(senderID, 'stories:removed', '', null)
                        targetReceivers.forEach((receiverID) => {
                            sendTo(receiverID, 'remove:stories', 'removingStoriesIDs', [customID])
                        });
                        // await Promise.all(
                        // );
                    }
                };
                // Function to handle deleting a story for **all receivers**
                async function handleDeleteStoryForAll(removeStoriesFromAll) {
                    let deletedStoriesIDs = []; // To store all successfully deleted stories' IDs

                    // Use for...of loop to handle asynchronous delete operations sequentially
                    for (let story of removeStoriesFromAll) {
                        let { customID, senderID, targetReceivers } = story;

                        // Delete the story document from the database by customID
                        const deleteResult = await StoryModel.deleteOne({ customID });

                        // If deletion was successful, record the deleted story ID
                        if (deleteResult.deletedCount > 0) {
                            deletedStoriesIDs.push(customID);
                        };
                        // Once all stories are deleted, notify sender and all target receivers
                        if (deletedStoriesIDs?.length == removeStoriesFromAll?.length) {
                            sendTo(senderID, 'stories:removed', '', null)
                            targetReceivers?.map((receiverID) => {
                                sendTo(
                                    receiverID,
                                    'remove:stories',
                                    'removingStoriesIDs',
                                    deletedStoriesIDs
                                );
                            });
                        };
                    };
                };

                // function to check the allowance of target member , for adding him in group
                async function checkAddingAllowanceOfTargetMember(currentUserData, targetUserID) {

                    // Get the visibility settings related to adding members to group
                    let addingToGroupAllowence = currentUserData?.visibility?.addingToGroupAllowence;
                    let addingToGroupActionedTo = currentUserData?.visibility?.addingToGroupActionedTo;

                    // If allowance is not private, check if targetUserID is allowed based on rules
                    if (addingToGroupAllowence != "private") {
                        // Check if allowance is fully public or connections only
                        let isFullAllowed = ["public", "connections"]?.includes(addingToGroupAllowence);

                        // Determine if targetUserID is included or excluded based on allowance type
                        let addingAllowence = isFullAllowed || addingToGroupActionedTo?.some((actionedToInfo) =>
                            addingToGroupAllowence == "included" ?
                                // included means only users marked as included are allowed
                                (actionedToInfo?.isIncluded && actionedToInfo?.targetUserID?.toString() == targetUserID?.toString())
                                :
                                // else excluded means exclude some users or allow those not explicitly excluded
                                (
                                    (!actionedToInfo?.isExcluded && actionedToInfo?.targetUserID?.toString() == targetUserID?.toString())
                                        ?
                                        true
                                        :
                                        !addingToGroupActionedTo?.some((actionedToInfo) => actionedToInfo?.targetUserID?.toString() == targetUserID?.toString())
                                )
                        );
                        return addingAllowence; // Return the result of allowance check
                    } else {
                        return false // If private, do not allow adding
                    };
                };

                //handle to the create group
                async function handleCreateGroup(newGroupData) {
                    let {
                        groupData,
                        groupCreatingChatData,
                        groupAddingChatData,
                        tabInfo
                    } = newGroupData;

                    let { members } = groupData;
                    let profilePicInfo = groupData?.profilePicInfo;

                    // Handle saving of the group profile picture file if it exists
                    profilePicInfo = profilePicInfo && await handleFile(profilePicInfo);
                    if (profilePicInfo?.err) {
                        sendTo(groupData?.createdBy, 'group:creation:failed', '', null);
                        return;
                    }
                    // Check allowance for each member if they can be added by the creator
                    let checkedMembers = (await Promise.all(
                        members.map(async (memberID) => {
                            let memberData = await getSingleUserData(memberID);
                            let addingAllowance = await checkAddingAllowanceOfTargetMember(memberData, groupData?.createdBy?.toString());
                            return addingAllowance ? memberID : null; // keep the memberID if allowed, else null
                        })
                    )).filter(Boolean); // remove nulls from array

                    // Filter receiversInfo for creating and adding chats based on allowed members
                    let receiversInfo = groupCreatingChatData?.receiversInfo?.filter((receiverInfo) =>
                        checkedMembers?.includes(receiverInfo?.receiverID)
                    );

                    // Create the group in database with allowed members plus the creator
                    const createdGroup = await GroupModel.create({
                        messagePermission: groupData?.messagePermission,
                        createdBy: groupData?.createdBy,
                        admins: groupData?.admins,
                        pastMembers: [],
                        profileInfo: {
                            name: groupData?.profileInfo?.name,
                            bgColor: groupData?.profileInfo?.bgColor,
                            description: groupData?.profileInfo?.description,
                            profilePic: profilePicInfo?.fileURL,
                            publicId: profilePicInfo?.fileURL
                        },
                        members: [...checkedMembers, groupData?.createdBy]
                    });

                    // If group created successfully, send messages and notifications
                    if (createdGroup) {
                        let tabInfoClone = { ...tabInfo, tabID: createdGroup?._id?.toString() };

                        await handleNewChats([
                            {
                                ...groupCreatingChatData,
                                toGroupID: createdGroup._id?.toString(),
                                tabInfo: tabInfoClone,
                                text: JSON.stringify([
                                    {
                                        type: 'text',
                                        value: `created`, // Message content indicating group created
                                        targetGroupID: createdGroup._id?.toString() // Target group ID
                                    }
                                ]),
                                isEdited: false,
                                receiversInfo
                            },
                            // If there are members other than creator, send added messages
                            ...(
                                checkedMembers?.filter((memberID) => memberID != groupData?.createdBy?.toString())?.length > 0
                                    ? [{
                                        ...groupAddingChatData,
                                        toGroupID: createdGroup._id?.toString(),
                                        tabInfo: tabInfoClone,
                                        text: JSON.stringify([
                                            {
                                                type: 'text',
                                                value: `added`,
                                                targetUsers: checkedMembers
                                            }
                                        ]),
                                        receiversInfo
                                    }]
                                    : []
                            )
                        ]);
                        // Notify the creator that group creation was successful
                        sendTo(
                            createdGroup?.createdBy?.toString(),
                            'group:create:success',
                            'newGroupData',
                            createdGroup
                        );

                        // Notify all other members (except creator) about the new group addition or update
                        createdGroup?.members?.forEach((memberID) => {
                            memberID?.toString() != createdGroup?.createdBy?.toString() &&
                                sendTo(
                                    memberID?.toString(),
                                    'add:or:update:group',
                                    'groupData',
                                    createdGroup
                                );
                        });

                        // Identify members who were not allowed to be added (for invitation)
                        let membersForInvite = members?.filter((memberID) =>
                            !checkedMembers?.includes(memberID)
                        );

                        // Create invitation chats for members not allowed in group initially
                        let invitaionChats = membersForInvite?.map(async (memberID) => {
                            return {
                                ...groupCreatingChatData,
                                customID: memberID + Date.now(), // Unique ID for invite chat
                                toGroupID: null, // Personal chat, no group ID
                                isGroupType: false,
                                chatType: "group-invitaion", // Type indicating group invite chat
                                text: JSON.stringify([{
                                    type: 'text',
                                    value: `Group invitaion`, // Invite message text
                                    targetGroupID: createdGroup?._id?.toString(), // Group for which invite is sent
                                    invitingTime: new Date().toISOString() // Timestamp to check expiry of invite
                                }]),
                                receiversInfo: [{
                                    receiverID: memberID, // Invitee's ID
                                    // other chat properties will be set in handleNewChats function
                                }],
                                tabInfo: {
                                    ...tabInfo,
                                    tabType: "user",
                                    tabID: memberID,
                                    recentTime: new Date().toISOString()
                                },
                                invitedUsers: [memberID], // Add invited member ID
                                targetGroupID: createdGroup?._id?.toString(), // Target group ID for invite
                            }
                        });

                        // Wait for all invite chats to be ready
                        const readyInvitaionChats = await Promise.all(invitaionChats);

                        // Handle sending invite chats
                        await handleNewChats(readyInvitaionChats);
                    } else {
                        sendTo(groupData?.createdBy, 'group:creation:failed', '', null);
                    };
                };

                // function to add invite members to the group
                async function handleInviteMembersToGroup(invitingInfo) {
                    let { groupID, invitedUsers } = invitingInfo;

                    // Fetch the group data by ID
                    const group = await GroupModel.findById(groupID);
                    if (!group) return null;

                    // Get current members as string array
                    const currentMemberIDs = group.members.map(id => id.toString());
                    console.log("invitedUsers", invitedUsers)
                    // Filter invited members to exclude those already in the group
                    const filteredIDs = invitedUsers.filter(id => !currentMemberIDs.includes(id));
                    if (filteredIDs.length === 0) return group; // no new members to invite

                    // Convert IDs to mongoose ObjectId format for DB update
                    const objectIds = filteredIDs.map(id => new mongoose.Types.ObjectId(id));

                    // Update group by adding new invitedUsers using $addToSet to avoid duplicates
                    let updatedGroup = await GroupModel.findOneAndUpdate(
                        { _id: groupID },
                        { $addToSet: { invitedUsers: { $each: objectIds } } },
                        { new: true, runValidators: true }
                    );

                    if (!updatedGroup) return null;

                    // Notify all current members about the updated group data
                    for (let memberID of updatedGroup.members) {
                        sendTo(
                            memberID.toString(),
                            'add:or:update:group',
                            'groupData',
                            updatedGroup
                        );
                    };
                    return updatedGroup;
                };

                // Remove the left group data when a member rejoins the group
                async function removeLeftGroupDataFromMember(groupID, memberIDs) {
                    // Create update promises to remove the groupID from pastGroups of each member
                    const updatePromises = memberIDs.map(memberID => {
                        return UserModel.updateOne(
                            { _id: memberID },
                            { $pull: { pastGroups: { groupID: groupID?.toString() } } } // Remove past group record for the member
                        );
                    });

                    // Wait for all update operations to complete
                    await Promise.all(updatePromises);
                };
                // Function to add members to a group
                async function handleAddMemberToGroup(addingInfo) {
                    let { groupID, newMemberIDs, managerID, addingChatData } = addingInfo;

                    // Validate each new member if they can be added by the manager
                    let checkedMembers = (await Promise.all(
                        newMemberIDs.map(async (memberID) => {
                            let memberData = await getSingleUserData(memberID); // Fetch user data
                            let addingAllowance = await checkAddingAllowanceOfTargetMember(memberData, managerID); // Check permissions
                            return addingAllowance ? memberData?._id?.toString() : null; // keep the memberID if allowed
                        })
                    )).filter(Boolean); // Filter out members not allowed

                    // Convert valid member IDs to mongoose ObjectId
                    const objectIds = checkedMembers.map(id => new mongoose.Types.ObjectId(id));

                    // Update group: add new members and remove them from pastMembers or invitedUsers
                    let updatedGroup = await GroupModel.findOneAndUpdate(
                        { _id: groupID },
                        {
                            $addToSet: { members: { $each: objectIds } }, // Add members only if not already present
                            $pull: {
                                pastMembers: { memberID: { $in: objectIds } }, // Remove from pastMembers if re-adding
                                invitedUsers: { $in: objectIds } // Remove from invitedUsers if re-adding
                            },
                        },
                        { new: true, runValidators: true } // Return the updated group document
                    );

                    // Notify all current members and handle re-additional logic
                    if (updatedGroup) {
                        // If the creator is being re-added, ensure they are also an admin
                        let isCreatorExitingGroup = checkedMembers?.find((memberID) => memberID == updatedGroup?.createdBy?.toString());
                        if (isCreatorExitingGroup) {
                            updatedGroup = await GroupModel.findOneAndUpdate(
                                { _id: groupID },
                                { $addToSet: { admins: isCreatorExitingGroup } }, // Restore admin rights
                                { new: true, runValidators: true }
                            );
                        };

                        // Clean up any old left group data for the re-added members
                        await removeLeftGroupDataFromMember(updatedGroup?._id?.toString(), objectIds);

                        // Notify each group member about the updated group
                        for (let memberID of updatedGroup?.members) {
                            sendTo(memberID?.toString(), 'add:or:update:group', 'groupData', updatedGroup);
                        };

                        // Send chat message notifying about newly added members
                        if (checkedMembers?.length > 0) {
                            let updatedAddingChatData = {
                                ...addingChatData,
                                receiversInfo: updatedGroup?.members?.filter(memberID => memberID !== addingChatData?.senderID)?.concat(checkedMembers)?.map((memberID) => ({
                                    status: 'sending',
                                    deliveredTime: null,
                                    seenTime: null,
                                    receiverID: memberID,
                                })),
                                text: JSON.stringify([{
                                    type: 'text',
                                    value: `added`,
                                    targetUsers: checkedMembers
                                }]),
                            };
                            await handleNewChats([updatedAddingChatData]);
                        };

                        // Identify users who cannot be directly added and must receive invitations
                        let membersForInvite = newMemberIDs?.filter((memberID) =>
                            !checkedMembers?.includes(memberID)
                        );

                        // Create invitation chats for those members
                        let invitaionChats = membersForInvite?.map(async (memberID) => {
                            return {
                                ...addingChatData,
                                customID: memberID + Date.now(),
                                toGroupID: null,
                                isGroupType: false,
                                chatType: "group-invitaion",
                                text: JSON.stringify([{
                                    type: 'text',
                                    value: `Group invitaion`,
                                    targetGroupID: groupID,
                                    invitingTime: new Date().toISOString()
                                }]),
                                receiversInfo: [{
                                    receiverID: memberID,
                                }],
                                tabInfo: {
                                    ...addingChatData?.tabInfo,
                                    tabType: "user",
                                    tabID: memberID,
                                    recentTime: new Date().toISOString()
                                },
                                invitedUsers: [memberID],
                                targetGroupID: groupID,
                                repliedToInfo: null
                            }
                        });

                        // Send invitations to the selected users
                        const readyInvitaionChats = await Promise.all(invitaionChats);
                        await handleNewChats(readyInvitaionChats);
                    }
                };

                // Function to handle a member joining the group and notify others
                async function handleJoinToGroup(groupJoiningInfo) {
                    let { groupID, newMemberIDs, joinerUserID, groupJoiningChatData } = groupJoiningInfo;

                    const objectIds = newMemberIDs.map(id => new mongoose.Types.ObjectId(id));

                    // Add members to group and remove them from pastMembers and invitedUsers
                    let updatedGroup = await GroupModel.findOneAndUpdate(
                        { _id: groupID },
                        {
                            $addToSet: { members: { $each: objectIds } },
                            $pull: {
                                pastMembers: { memberID: { $in: objectIds } },
                                invitedUsers: { $in: objectIds }
                            },
                        },
                        { new: true, runValidators: true }
                    );

                    // If successfully added
                    if (updatedGroup) {
                        // If the creator is rejoining, ensure they are restored as admin
                        let isCreatorExitingGroup = joinerUserID == updatedGroup?.createdBy?.toString();
                        if (isCreatorExitingGroup) {
                            updatedGroup = await GroupModel.findOneAndUpdate(
                                { _id: groupID },
                                { $addToSet: { admins: joinerUserID } },
                                { new: true, runValidators: true }
                            );
                        };

                        // Remove left group data from member
                        await removeLeftGroupDataFromMember(updatedGroup?._id?.toString(), objectIds);

                        // Notify joiner of success
                        sendTo(joinerUserID, 'group:join:success', 'newGroupData', updatedGroup);

                        // Notify others via chat
                        await handleNewChats([{
                            ...groupJoiningChatData,
                            receiversInfo: updatedGroup?.members?.filter((memberID) => memberID != joinerUserID)?.map((memberID) => ({
                                status: 'sending',
                                deliveredTime: null,
                                seenTime: null,
                                receiverID: memberID,
                            }))
                        }]);

                        // Send group update to all members
                        for (let memberID of updatedGroup?.members) {
                            sendTo(memberID?.toString(), 'add:or:update:group', 'groupData', updatedGroup);
                        }
                    }
                };

                // Function to add left group info to user's profile
                async function addLeftGroupDataToMember(groupData, targetMembersData) {
                    const groupID = groupData?._id?.toString();
                    const profile = groupData?.profileInfo || {};

                    const updatePromises = targetMembersData.map(memberData => {
                        const leftGroupData = {
                            groupID,
                            name: profile?.name || '',
                            profilePic: profile?.profilePic || '',
                            bgColor: profile?.bgColor || '',
                            description: profile?.description || '',
                            createdBy: groupData?.createdBy || null,
                            members: groupData?.members || [],
                            admins: groupData?.admins || [],
                            pastMembers: groupData?.pastMembers || [],
                            exitedAt: memberData?.leftTime || new Date().toISOString(),
                        };

                        // Add left group data only if not already exists
                        return UserModel.updateOne(
                            {
                                _id: memberData?.memberID,
                                pastGroups: { $not: { $elemMatch: { groupID } } }
                            },
                            { $addToSet: { pastGroups: leftGroupData } }
                        );
                    });

                    await Promise.all(updatePromises);
                }

                // Function to remove members from group
                async function handleRemoveMemberFromGroup(removingInfo) {
                    let { groupID, targetMemberIDs, removingChatData } = removingInfo;

                    const objectIds = targetMemberIDs.map(memberID => new mongoose.Types.ObjectId(memberID));

                    // Prepare member exit data
                    const targetMembersData = targetMemberIDs.map(memberID => {
                        return {
                            memberID: new mongoose.Types.ObjectId(memberID),
                            exitedAt: new Date().toISOString()
                        }
                    });

                    // Remove members and admins, and mark as pastMembers
                    let updatedGroup = await GroupModel.findOneAndUpdate(
                        {
                            _id: groupID,
                            $or: [
                                { pastMembers: { $not: { $elemMatch: { memberID: { $in: objectIds } } } } },
                                { pastMembers: { $size: 0 } }
                            ]
                        },
                        {
                            $pull: {
                                members: { $in: objectIds },
                                admins: { $in: objectIds }
                            },
                            $push: { pastMembers: { $each: targetMembersData } }
                        },
                        { new: true, runValidators: true }
                    );

                    // If updated successfully
                    if (updatedGroup) {
                        // Save past group data to each removed member
                        await addLeftGroupDataToMember(updatedGroup, targetMembersData);

                        // Send system message about removal
                        await handleNewChats([removingChatData]);

                        // Notify all remaining members about group update
                        for (let memberID of updatedGroup?.members) {
                            sendTo(memberID?.toString(), 'add:or:update:group', 'groupData', updatedGroup);
                        };

                        // Notify removed users individually
                        for (let memberID of targetMemberIDs) {
                            sendTo(
                                memberID,
                                'remove:group:member',
                                'removingInfo',
                                { groupID, targetMembersData }
                            );
                        };

                        // If all current admins were removed, promote a new one
                        let isAdminExitingGroup = updatedGroup?.admins?.every((memberID) => targetMemberIDs?.includes(memberID?.toString()));
                        if (isAdminExitingGroup) {
                            await handlePromoteMembersToAdmins({
                                groupID,
                                targetMemberIDs: [updatedGroup?.members[0]?.toString()],
                                actionChatData: {
                                    ...removingChatData,
                                    customID: updatedGroup?.members[0]?.toString() + Date.now(),
                                    senderID: updatedGroup?.members[0]?.toString(),
                                    chatType: "system-member-promoting",
                                    receiversInfo: updatedGroup?.members?.map((memberID) => ({
                                        status: 'sending',
                                        deliveredTime: null,
                                        seenTime: null,
                                        receiverID: memberID,
                                    })),
                                    text: JSON.stringify([{
                                        type: 'text',
                                        value: "became new admin",
                                    }])
                                }
                            });
                        };
                    }
                };

                // Function to promote specified group members to admins
                async function handlePromoteMembersToAdmins(promotingInfo) {
                    const { groupID, targetMemberIDs, actionChatData } = promotingInfo;
                    const objectIds = targetMemberIDs.map(memberID => new mongoose.Types.ObjectId(memberID));

                    // Update group: Add users to 'admins' array if they are already members and not already admins
                    const updatedGroup = await GroupModel.findOneAndUpdate(
                        {
                            _id: groupID,
                            members: { $all: objectIds },       // Ensure all target users are group members
                            admins: { $nin: objectIds }         // Ensure they are not already admins
                        },
                        {
                            $addToSet: { admins: { $each: objectIds } } // Add members to admins using $addToSet to avoid duplicates
                        },
                        { new: true, runValidators: true }
                    );

                    if (updatedGroup) {
                        // Send system chat about the admin promotion
                        await handleNewChats([actionChatData]);

                        // Notify all group members with updated group data
                        for (let memberID of updatedGroup?.members) {
                            sendTo(
                                memberID?.toString(),
                                'add:or:update:group',
                                'groupData',
                                updatedGroup
                            );
                        }
                    }
                };

                // Function to demote specified admins to regular members
                async function handleDemoteMembersFromAdmins(demotingInfo) {
                    const { groupID, targetMemberIDs, actionChatData } = demotingInfo;
                    const objectIds = targetMemberIDs.map(memberID => new mongoose.Types.ObjectId(memberID));

                    // Update group: Remove users from 'admins' array
                    const updatedGroup = await GroupModel.findOneAndUpdate(
                        { _id: groupID },
                        { $pull: { admins: { $in: objectIds } } }, // Remove from admins
                        { new: true, runValidators: true }
                    );

                    if (updatedGroup) {
                        // Send system chat about the admin demotion
                        await handleNewChats([actionChatData]);

                        // Notify all group members with updated group data
                        for (let memberID of updatedGroup?.members) {
                            sendTo(
                                memberID?.toString(),
                                'add:or:update:group',
                                'groupData',
                                updatedGroup
                            );
                        }
                    }
                };

                // Function to update group profile information (name, description, profilePic)
                async function handleChangeGroupePorfileInfo(newProfileInfo) {
                    const {
                        groupID,
                        changerID,
                        updatingDataKey,       // The key to update: "name", "description", or "profilePic"
                        updatingValue,         // New value to set, could be a string or file info
                        changingChatData       // Chat data for notification
                    } = newProfileInfo;

                    // If updating a profile picture, handle file upload
                    let profilePicInfo = (updatingValue?.fileURL)
                        ? await handleFile(updatingValue)
                        : null;
                    if (profilePicInfo?.err) {
                        sendTo(changerID, 'setting:failed', '', null);
                        return;
                    }
                    // If an old profile picture exists, delete it
                    if (updatingValue?.oldPublicId) {
                        await deleteFile(updatingValue.oldPublicId, "image/");
                    }

                    const updatingProperty = `profileInfo.${updatingDataKey}`;
                    const setObject = {};

                    // Prepare set object based on key being updated
                    if (updatingDataKey === "profilePic") {
                        setObject["profileInfo.profilePic"] = profilePicInfo?.fileURL || "";
                        setObject["profileInfo.publicId"] = profilePicInfo?.publicId || "";
                    } else {
                        setObject[updatingProperty] = updatingValue?.name || updatingValue?.description;
                        if (updatingDataKey === "name") {
                            setObject["profileInfo.bgColor"] = updatingValue?.bgColor || "";
                        }
                    };

                    try {
                        // Update group profile info in DB
                        const updatedGroup = await GroupModel.findOneAndUpdate(
                            { _id: groupID },
                            { $set: setObject },
                            { new: true, runValidators: true }
                        );

                        // Notify all group members of the updated profile info
                        await Promise.all(
                            updatedGroup.members.map(memberID =>
                                sendTo(
                                    memberID?.toString(),
                                    'group:profileInfo:change',
                                    'newProfileInfo',
                                    {
                                        groupID,
                                        updatingData: {
                                            [updatingDataKey]: updatedGroup?.profileInfo?.[updatingDataKey],
                                            ...(updatingDataKey === "profilePic" && {
                                                publicId: updatedGroup?.profileInfo?.publicId
                                            }),
                                        }
                                    }
                                )
                            )
                        );

                        // Notify the user who changed the info
                        sendTo(changerID, 'setting:updated', '', null);
                        let copiedFileData = updatingValue?.fileURL && await copyFileWithNewName(profilePicInfo?.fileURL, "image/");
                        // Update system chat with the new profile pic info if applicable
                        let updatedProfilePichChangingText = JSON.parse(changingChatData?.text)?.map((textData) => {
                            if (textData?.type == "emoji" && textData?.newProfilePic) {
                                return { ...textData, url: copiedFileData?.fileURL, publicId: copiedFileData?.publicId }
                            };
                            return textData;
                        });

                        // Send the profile change as a new system message
                        handleNewChats([{
                            ...changingChatData,
                            text: updatingDataKey === "profilePic" ? JSON.stringify(updatedProfilePichChangingText) : changingChatData?.text
                        }]);
                    } catch (error) {
                        // Notify changer in case of error
                        sendTo(changerID, 'setting:failed', '', null);
                    }
                };

                // Function to change group message permission (e.g., admins only or all members)
                async function handleChangeGroupMessagePermission(groupData) {
                    let { groupID, newRule, changerID, changingChatData } = groupData;

                    // Update group's messagePermission in the DB
                    let updatedGroup = await GroupModel.findOneAndUpdate(
                        { _id: groupID },
                        { $set: { "messagePermission": newRule } },
                        { new: true, runValidators: true }
                    );

                    if (updatedGroup) {
                        // Notify the user who made the change
                        sendTo(changerID, 'setting:updated', '', null);

                        // Notify all group members about the new message permission
                        await Promise.all(
                            updatedGroup?.members?.map(memberID =>
                                sendTo(
                                    memberID?.toString(),
                                    'group:message:permission:change',
                                    'groupData',
                                    { groupID, newRule }
                                )
                            )
                        );

                        // Send a system chat about the change
                        handleNewChats([changingChatData]);
                    } else {
                        // Notify if update failed
                        sendTo(changerID, 'setting:failed', '', null);
                    };
                };

                // Function to delete a group permanently
                async function deleteGroupPermanently(groupID) {
                    let groupData = await getSingleGroupData(groupID);
                    let allChatsOfTheGroup = await ChatModel.find({ toGroupID: groupID }, { customID: 1, _id: 0 });
                    let chatIDsForDelete = allChatsOfTheGroup?.map(chat => chat?.customID);
                    // delete group chats by each member
                    for (let memberID of groupData?.members) {
                        await handleDeleteChats({ currentUserID: memberID, chatIDsForDelete });
                    };
                    // Delete group from database
                    await GroupModel.findOneAndDelete({ _id: groupID });
                    // Notify invited users to remove the group info
                    let allMembers = [...groupData?.members, ...groupData?.invitedUsers];
                    for (let memberID of allMembers) {
                        sendTo(
                            memberID?.toString(),
                            'remove:group:data',
                            'groupID',
                            groupID
                        );
                    };
                };

                // handle to the create broadcast
                async function handleCreateBroadcast(newBroadcastData) {
                    let {
                        broadcastData,
                        broadcastCreatingChatData,
                        broadcastAddingChatData,
                        tabInfo
                    } = newBroadcastData;

                    let { members } = broadcastData;
                    let profilePicInfo = broadcastData?.profilePicInfo;

                    // Handle profile picture upload if provided
                    profilePicInfo = profilePicInfo && await handleFile(profilePicInfo);
                    if (profilePicInfo?.err) {
                        sendTo(broadcastData?.createdBy, 'broadcast:creation:failed', '', null);
                        return;
                    }

                    // Create new broadcast including the creator as a member
                    const createdBroadcast = await ChatBroadcastModel.create({
                        profileInfo: {
                            name: broadcastData?.profileInfo?.name,
                            bgColor: broadcastData?.profileInfo?.bgColor,
                            description: broadcastData?.profileInfo?.description,
                            profilePic: profilePicInfo?.fileURL,
                            publicId: profilePicInfo?.fileURL
                        },
                        members: [...members, broadcastData?.createdBy],
                        createdBy: broadcastData?.createdBy,
                    });

                    // If broadcast is successfully created
                    if (createdBroadcast) {
                        let tabInfoClone = { ...tabInfo, tabID: createdBroadcast?._id?.toString() };

                        // Send system messages for broadcast creation and adding members
                        await handleNewChats([
                            {
                                ...broadcastCreatingChatData,
                                toBroadcastID: createdBroadcast._id?.toString(),
                                tabInfo: tabInfoClone,
                                text: JSON.stringify([
                                    {
                                        type: 'text',
                                        value: `created`, // System message about creation
                                        targetBroadcastID: createdBroadcast._id?.toString()
                                    }
                                ]),
                                isEdited: false
                            },
                            {
                                ...broadcastAddingChatData,
                                toBroadcastID: createdBroadcast._id?.toString(),
                                tabInfo: tabInfoClone
                            }
                        ]);

                        // Notify creator about successful broadcast creation
                        sendTo(
                            createdBroadcast?.createdBy?.toString(),
                            'broadcast:create:success',
                            'newBroadcastData',
                            createdBroadcast
                        );
                    } else {
                        sendTo(broadcastData?.createdBy, 'broadcast:creation:failed', '', null);
                    };
                };

                // Function to add members to a broadcast
                async function handleAddMemberToBroadcast(addingInfo) {
                    let { broadcastID, newMemberIDs, addingChatData } = addingInfo;

                    // Convert all new member IDs to ObjectId
                    const objectIds = newMemberIDs.map(id => new mongoose.Types.ObjectId(id));

                    // Add members to broadcast if they’re not already in
                    let updatedBroadcast = await ChatBroadcastModel.findOneAndUpdate(
                        { _id: broadcastID },
                        {
                            $addToSet: { members: { $each: objectIds } }, // Prevent duplicates
                        },
                        { new: true, runValidators: true } // Return updated broadcast
                    );

                    // If updated successfully, send update and chat message
                    if (updatedBroadcast) {
                        await handleNewChats([addingChatData]);
                        sendTo(
                            updatedBroadcast?.createdBy?.toString(),
                            'add:or:update:broadcast',
                            'broadcastData',
                            updatedBroadcast
                        );
                    }
                };

                // Function to remove members from a broadcast
                async function handleRemoveMemberFromBroadcast(removingInfo) {
                    let { broadcastID, targetMemberIDs, removingChatData } = removingInfo;

                    // Convert member IDs to ObjectId
                    const objectIds = targetMemberIDs.map(memberID => new mongoose.Types.ObjectId(memberID));

                    // Remove specified members from the broadcast
                    let updatedBroadcast = await ChatBroadcastModel.findOneAndUpdate(
                        {
                            _id: broadcastID
                        },
                        {
                            $pull: {
                                members: { $in: objectIds }, // Pull matching members
                            }
                        },
                        { new: true, runValidators: true } // Return updated broadcast
                    );

                    // If removal successful, send update and system message
                    if (updatedBroadcast) {
                        await handleNewChats([removingChatData]);
                        sendTo(
                            updatedBroadcast?.createdBy?.toString(),
                            'add:or:update:broadcast',
                            'broadcastData',
                            updatedBroadcast
                        );
                    }
                };

                // function to update broadcast's profile info (name, des, profile pic)
                async function handleChangeBroadcastPorfileInfo(newProfileInfo) {
                    const {
                        broadcastID,
                        changerID,
                        updatingDataKey,           // e.g. "name"
                        updatingValue,             // Updated text or file data
                        changingChatData
                    } = newProfileInfo;

                    // If updating a profile picture, handle file upload
                    let profilePicInfo = (updatingValue?.fileURL)
                        ? await handleFile(updatingValue)
                        : null;
                    // console.log("setting:failed", profilePicInfo?.err)
                    if (profilePicInfo?.err) {
                        sendTo(changerID, 'setting:failed', '', null);
                        return;
                    };
                    // If an old profile picture exists, delete it
                    if (updatingValue?.oldPublicId) {
                        await deleteFile(updatingValue.oldPublicId, "image/");
                    }

                    const updatingProperty = `profileInfo.${updatingDataKey}`;
                    const setObject = {};

                    // Prepare set object based on key being updated
                    if (updatingDataKey === "profilePic") {
                        setObject["profileInfo.profilePic"] = profilePicInfo?.fileURL || "";
                        setObject["profileInfo.publicId"] = profilePicInfo?.publicId || "";
                    } else {
                        setObject[updatingProperty] = updatingValue?.name || updatingValue?.description;
                        if (updatingDataKey === "name") {
                            setObject["profileInfo.bgColor"] = updatingValue?.bgColor || "";
                        }
                    };
                    try {
                        // Update broadcast document in DB
                        let updatedBroadcast = await ChatBroadcastModel.findOneAndUpdate(
                            { _id: broadcastID },
                            { $set: setObject },
                            { new: true, runValidators: true }
                        );

                        // Notify the changer with updated info
                        sendTo(
                            changerID,
                            'broadcast:profileInfo:change',
                            'newProfileInfo',
                            {
                                broadcastID,
                                updatingData: {
                                    [updatingDataKey]: updatedBroadcast?.profileInfo?.[updatingDataKey],
                                    ...(updatingDataKey === "profilePic" && {
                                        publicId: updatedBroadcast?.profileInfo?.publicId
                                    }),
                                }
                            }
                        );

                        // make a copy of profile pic Update profile pic URL in the chat message if needed
                        let copiedFileData = updatingValue?.fileURL && await copyFileWithNewName(profilePicInfo?.fileURL, "image/");
                        let updatedProfilePichChangingText = JSON.parse(changingChatData?.text)?.map((textData) => {
                            if (textData?.type == "emoji" && textData?.newProfilePic) {
                                return { ...textData, url: copiedFileData?.fileURL, publicId: copiedFileData?.publicId }
                            };
                            return textData;
                        });

                        // Send chat update
                        handleNewChats([{
                            ...changingChatData,
                            text: updatingDataKey === "profilePic" ? JSON.stringify(updatedProfilePichChangingText) : changingChatData?.text
                        }]);
                    } catch (error) {
                        // Notify failure to changer
                        sendTo(currentUserID, 'setting:failed', '', null);
                    }
                };

                // function to delete broadcast permanently
                async function deleteBroadcastPermanently(broadcastData) {
                    // Delete broadcast document from DB
                    await ChatBroadcastModel.findOneAndDelete({ _id: broadcastData?.broadcastID });

                    // Notify creator that broadcast has been deleted
                    sendTo(
                        broadcastData?.createdBy,
                        'delete:broadcast:data',
                        'broadcastID',
                        broadcastData?.broadcastID
                    );
                };

                // function to handle the new call
                async function handleNewCall(newCallData) {
                    let { caller, callee } = newCallData;

                    // Check if caller or callee has blocked the other
                    let blockingStatus = await checkTheBlockingStatus(caller, callee);
                    // Get the list of currently online users from WebSocket clients
                    const onlineUsers = [...wss.clients].map(client => ({
                        currentUserID: client.currentUserID
                    }));

                    // Remove duplicate users
                    let activeUsers = _.uniqBy(onlineUsers, "currentUserID");

                    // Check if callee is currently online
                    const isUserOnline = activeUsers.some(user => user?.currentUserID == callee);

                    // Set call status depending on callee availability
                    let status = isUserOnline ? "ringing" : "calling";

                    // Save the new call data to the database with status
                    const savedCall = await CallModel.create({
                        customID: newCallData?.customID,
                        caller: newCallData?.caller,
                        callee: newCallData?.callee,
                        callType: newCallData?.callType,
                        callingTime: newCallData?.callingTime,
                        callDuration: newCallData?.callDuration,
                        ringDuration: newCallData?.ringDuration,
                        status: newCallData?.status,
                        seenByCallee: newCallData?.seenByCallee,
                        status,
                        deletedByUsers: blockingStatus ? [callee] : [], //if callee blocked the caller, add callee in deletedByUsers, else by dwfault []; it means this call will not provided to the callee
                    });

                    // If call is saved successfully, notify both caller and callee
                    if (savedCall) {
                        // Notify caller that the callee is active
                        sendTo(
                            caller,
                            'callee:active',
                            '',
                            null
                        );

                        // Send incoming call to callee, If callee not blocked caller , proceed with call setup
                        if (!blockingStatus) {
                            sendTo(
                                callee,
                                'incomming:call',
                                'callData',
                                { ...newCallData, status }
                            );
                        };
                    };
                };

                // function to handle the busy call
                async function handleBusyCall(callData) {
                    let { caller } = callData;

                    // Notify caller that callee is busy on another call
                    sendTo(
                        caller,
                        'busy:on:call',
                        'callData',
                        callData
                    );
                };

                // function to handle the previous call accepted
                async function handleCallAccepted(callData) {
                    let { caller, customID } = callData;

                    // Update the call status to "accepted" in the database
                    const updatedCallData = await CallModel.updateOne(
                        { customID },
                        {
                            $set: {
                                status: "accepted"
                            }
                        }
                    );

                    // Notify caller that the call has been accepted
                    sendTo(
                        caller,
                        'call:accepted',
                        'callData',
                        callData
                    );
                };

                // function to handle the call rejected
                async function handleCallRejected(callData) {
                    let { caller, status, customID, ringDuration } = callData;

                    // Update the call status to rejected and save ring duration
                    const updatedCallData = await CallModel.updateOne(
                        { customID },
                        {
                            $set: { status, ringDuration }
                        }
                    );

                    // Notify caller that the call was rejected
                    sendTo(
                        caller,
                        'call:rejected',
                        'callData',
                        callData
                    );
                };

                // Function to delete calls by a specific recipient, or delete permanently if all participants deleted it
                async function handleDeleteCalls(callsData) {
                    let { currentUserID, callIDsForDelete } = callsData;

                    // Mark calls as deleted by the current user
                    const updatePromises = callIDsForDelete.map(async (callID) => {
                        let filterCondition = {
                            customID: callID,
                            deletedByUsers: { $ne: currentUserID } // Avoid redundant marking
                        };
                        let updateOperation = {
                            $addToSet: { deletedByUsers: currentUserID } // Add currentUserID if not already present
                        };
                        return CallModel.updateMany(filterCondition, updateOperation);
                    });

                    // Wait for all update operations to complete
                    const results = await Promise.all(updatePromises);

                    // Proceed only if all updates are successful (or completed)
                    if (results.every(result => result.modifiedCount > 0)) {

                        // Fetch all call records from the database
                        let callsForDeletePermanently = await CallModel.find({});

                        callsForDeletePermanently?.forEach(async (callData) => {
                            // Gather all participant IDs: caller and callee
                            const allParticipants = [
                                callData?.caller,
                                callData?.callee
                            ].filter(Boolean); // Remove null/undefined

                            // Check if all participants have deleted the call
                            const deletedByAll = allParticipants.every(userID =>
                                callData?.deletedByUsers?.includes(userID)
                            );

                            if (deletedByAll) {
                                // Permanently delete the call from the database
                                await CallModel.deleteOne({ customID: callData.customID });
                            }
                        });
                    }
                };
                // Function to handle complete user account deletion
                async function handleDeleteUserAccount(currentUserID) {
                    try {
                        // Fetch current user data
                        const currentUserData = await getSingleUserData(currentUserID);

                        // Delete any broadcast chat created by this user
                        const broadcastResult = await ChatBroadcastModel.findOneAndDelete({ createdBy: currentUserID });

                        // Find all groups involving this user as a member
                        let groupsData = await GroupModel.find({
                            "pastMembers.memberID": { $ne: currentUserID },
                            members: currentUserID,
                        });

                        // Only update groups if user is part of any
                        if (groupsData.length > 0) {
                            // Loop through each group and remove user
                            const updatePromises = groupsData.map(async (groupData) => {
                                // Create a system message indicating user left the group
                                let removingChatData = {
                                    customID: currentUserID + Date.now(),
                                    senderID: currentUserID,
                                    isGroupType: true,
                                    toGroupID: groupData?._id,
                                    isBroadcastType: false,
                                    toBroadcastID: null,
                                    chatType: "system-member-removing",
                                    sentTime: new Date().toISOString(),
                                    // Add all other group members as receivers
                                    receiversInfo: groupData?.members?.filter(memberID => memberID !== currentUserID)?.map((memberID) => ({
                                        status: 'sending',
                                        deliveredTime: null,
                                        seenTime: null,
                                        receiverID: memberID,
                                    })),
                                    tabInfo: {
                                        tabType: "group",
                                        tabID: groupData?._id,
                                    },
                                    // Message content for group system message
                                    text: JSON.stringify([
                                        {
                                            type: 'text',
                                            value: `left`,
                                            targetGroupID: groupData?._id
                                        }
                                    ]),
                                };

                                // Prepare removing info and call member removal handler
                                let removingInfo = { groupID: groupData?._id, targetMemberIDs: [currentUserID], removingChatData };
                                return await handleRemoveMemberFromGroup(removingInfo);
                            });
                            await Promise.all(updatePromises);
                        }

                        // Remove all connections for the user
                        const connectionsOfCurrentUser = currentUserData?.connections || [];

                        if (connectionsOfCurrentUser.length > 0) {
                            // Identify who initiated each connection to determine who is removing
                            let connectionInfoArray = connectionsOfCurrentUser?.map((connectionData) => {
                                let connectionInfo = {
                                    ...connectionData?._doc,
                                    initiaterUserID: connectionData?._doc?.initiaterUserID?.toString(),
                                    targetUserID: connectionData?._doc?.targetUserID?.toString()
                                };
                                return {
                                    ...connectionInfo,
                                    remover: connectionInfo?.initiaterUserID == currentUserID ? "initiaterUser" : "targetUser",
                                }
                            });
                            console.log("connectionInfoArray", connectionInfoArray);
                            await handleConnectionRemove(connectionInfoArray);
                        };

                        // Find call documents related to the user
                        const callsForDeleteDocs = await CallModel.find(
                            {
                                $or: [{ caller: currentUserID }, { callee: currentUserID }],
                                deletedByUsers: { $ne: currentUserID }
                            },
                            { customID: 1 }
                        );

                        // Find chat documents related to the user
                        const chatsForDeleteDocs = await ChatModel.find(
                            {
                                $or: [
                                    { senderID: currentUserID },
                                    { "receiversInfo.receiverID": currentUserID }
                                ],
                                deletedByUsers: { $ne: currentUserID }
                            },
                            { customID: 1 }
                        );

                        // Find stories sent by the user
                        const storiesForDeleteDocs = await ChatModel.find(
                            { senderID: currentUserID },
                            { customID: 1, receiversInfo: 1, senderID: 1 }
                        );

                        // Extract and delete chats if any exist
                        if (chatsForDeleteDocs.length > 0) {
                            const chatIDsForDelete = chatsForDeleteDocs.map(chat => chat.customID);
                            await handleDeleteChats({ currentUserID, chatIDsForDelete });
                        }

                        // Extract and delete calls if any exist
                        if (callsForDeleteDocs.length > 0) {
                            const callIDsForDelete = callsForDeleteDocs.map(call => call.customID);
                            await handleDeleteCalls({ currentUserID, callIDsForDelete });
                        }

                        // Extract and delete stories if any exist
                        if (storiesForDeleteDocs.length > 0) {
                            const storiesInfoForDelete = storiesForDeleteDocs.map(story => ({
                                customID: story.customID,
                                senderID: story?.senderID,
                                targetReceivers: story?.receiversInfo
                            }));
                            await handleDeleteStoryForAll(storiesInfoForDelete);
                        };

                        // Delete profile picture if it exists in cloud storage
                        if (currentUserData?.profileInfo?.profilePic && currentUserData?.profileInfo?.publicId) {
                            await deleteFile(currentUserData.profileInfo.publicId, "image/");
                        };
                        // remove data of this user from its connections
                        let connectionInfoArray = connectionsOfCurrentUser?.map(async (connectionData) => {
                            let connectionInfo = {
                                ...connectionData?._doc,
                                initiaterUserID: connectionData?._doc?.initiaterUserID?.toString(),
                                targetUserID: connectionData?._doc?.targetUserID?.toString()
                            };
                            let targetUser = connectionInfo?.initiaterUserID == currentUserID ? connectionInfo?.targetUserID : connectionInfo?.initiaterUserID;
                            // Notify the user that account deletion was successful
                            console.log("targetUser", targetUser);
                            sendTo(targetUser, 'remove:user:data', 'userID', currentUserID);
                        });
                        await Promise.all(connectionInfoArray);
                        // Store user email and username before deletion
                        let email = currentUserData?.email;
                        let username = currentUserData?.username;

                        // Permanently delete the user account from the database
                        const deletedUser = await UserModel.findOneAndDelete({ _id: currentUserID });

                        // Compose confirmation email HTML
                        const html = `
                                <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                                <div style="text-align: center;">
                                    <h2 style="color: #ef4444;">Account Deleted Successfully</h2>
                                    <p style="font-size: 16px; color: #333;">Hi <strong>${username}</strong>,</p>
                                </div>
                                <p style="font-size: 15px; color: #444;">
                                    Your account with <strong>My Chato</strong> has been permanently deleted. All your personal data, profile information, and chat history have been removed from our systems.
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="https://yourdomain.com/signup" target="_blank" style="background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-size: 16px;">Create a New Account</a>
                                </div>
                                <p style="font-size: 14px; color: #777;">
                                    We’re sorry to see you go. You’re always welcome back at <strong>My Chato</strong> whenever you’re ready. 😊
                                </p>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                                <p style="font-size: 13px; color: #999; text-align: center;">© ${new Date().getFullYear()} My Chato. All rights reserved.</p>
                                </div>
                             `;

                        // Send deletion confirmation email
                        await sendEmail(email, "Your My Chato Account Has Been Deleted", html);

                        // Notify the user that account deletion was successful
                        sendTo(
                            currentUserID,
                            'deleted:user:account',
                            'deletedUserData',
                            'User account deleted successfully'
                        );
                    } catch (error) {
                        // Catch and log any error that occurs during deletion process
                        console.error('Error deleting user account:', error);

                        // Notify user of failure
                        sendTo(
                            currentUserID,
                            'delete:user:account',
                            'deletedUserData',
                            'Failed to delete user account. Please try again later.'
                        );
                    }
                };

                // Handle incoming WebSocket messages based on their type
                switch (webSocketMessageData?.type) {
                    // Handle new connection request
                    case "connections:requests":
                        await handleNewConnectionRequest(webSocketMessageData?.connectionInfos);
                        break;

                    // Handle removal of connections
                    case "remove:connections":
                        await handleConnectionRemove(webSocketMessageData?.connectionInfos);
                        break;

                    // Handle acceptance of connection requests
                    case "connections:accepted":
                        await handleConnectionAccept(webSocketMessageData?.connectionInfos);
                        break;

                    // Handle user profile information changes
                    case 'user:profileInfo:change':
                        await handleChangeUserPorfileInfo(webSocketMessageData?.newProfileInfo);
                        break;
                    // Handle user profile information changes
                    case 'user:email:update':
                        await handleChangeUserEmail(webSocketMessageData?.currentUserID);
                        break;
                    // Handle privacy change for profile visibility
                    case 'profileInfo:visibility:change':
                        await handleChangePrivacy(webSocketMessageData?.newConditionData, true);
                        break;

                    // Handle privacy change for story/chat visibility
                    case 'storyOrChat:visibility:change':
                        await handleChangePrivacy(webSocketMessageData?.newConditionData, false);
                        break;

                    // Handle allowance change for being added to groups
                    case 'group:adding-me:allowance:change':
                        await handleChangeGroupAddingMeAllowence(webSocketMessageData?.newConditionData);
                        break;

                    // Handle blocking a user
                    case "user:block":
                        await toggleUserBlocking(webSocketMessageData?.blockingInfo);
                        break;

                    // Handle unblocking a user
                    case "user:unblock":
                        await toggleUserBlocking(webSocketMessageData?.unblockingInfo);
                        break;

                    // Handle receiving new chat messages
                    case "new:chats":
                        await handleNewChats(webSocketMessageData?.newChats);
                        break;

                    // Handle updates to chat status (e.g., seen, delivered)
                    case "update:chats:status":
                        await handleChatStatus(webSocketMessageData?.chatsData);
                        break;

                    // Notify other users when someone is typing/chatting
                    case "user:chatting:indicator":
                        let { targetUserIDs, initiatorUserID, chattingStatus, toGroupID } = webSocketMessageData?.actionInfo;
                        targetUserIDs?.forEach(async (targetUserID) => {
                            // Check if targetUser is blocked by the initiatorUser, or oppsite
                            let blockingStatus = await checkTheBlockingStatus(initiatorUserID, targetUserID);
                            // notify to the target users only when the nobody blocked each other
                            if (!blockingStatus) {
                                sendTo(
                                    targetUserID,
                                    'user:chatting:indicator',
                                    'actionInfo',
                                    { initiatorUserID, chattingStatus, toGroupID }
                                );
                            };
                        });
                        break;

                    // Handle deletion of chat messages
                    case "delete:chats":
                        await handleDeleteChats(webSocketMessageData?.chatsData);
                        break;

                    // Handle new story uploads
                    case "new:stories":
                        await handleNewStories(webSocketMessageData?.storiesData);
                        break;

                    // Handle update of story watching status
                    case "update:story:watching":
                        await handleStoryWatching(webSocketMessageData?.storyData);
                        break;

                    // Handle story removal for some users
                    case "remove:stories:some":
                        await handleDeleteStoryForSome(webSocketMessageData?.removingStoryForSome);
                        break;

                    // Handle story removal for all users
                    case "remove:stories:all":
                        await handleDeleteStoryForAll(webSocketMessageData?.removeStoriesFromAll);
                        break;

                    // Handle creation of a new group
                    case "new:group":
                        await handleCreateGroup(webSocketMessageData?.newGroupData);
                        break;

                    // Handle adding members to a group
                    case "add:member:to:group":
                        await handleAddMemberToGroup(webSocketMessageData?.addingInfo);
                        break;

                    // Handle joining a group
                    case "join:to:group":
                        await handleJoinToGroup(webSocketMessageData?.groupJoiningInfo);
                        break;

                    // Handle removing a member from a group
                    case "remove:group:member":
                        await handleRemoveMemberFromGroup(webSocketMessageData?.removingInfo);
                        break;

                    // Handle promotion of group members to admins
                    case "promote:members:to:admins":
                        await handlePromoteMembersToAdmins(webSocketMessageData?.actionInfo);
                        break;

                    // Handle demotion of group admins to regular members
                    case "demote:members:from:admins":
                        await handleDemoteMembersFromAdmins(webSocketMessageData?.actionInfo);
                        break;

                    // Handle changes to group profile information
                    case 'group:profileInfo:change':
                        await handleChangeGroupePorfileInfo(webSocketMessageData?.newProfileInfo);
                        break;

                    // Handle changes to group message permissions
                    case 'group:message:permission:change':
                        await handleChangeGroupMessagePermission(webSocketMessageData?.groupData);
                        break;

                    // Handle permanent deletion of a group
                    case 'group:delete:permanently':
                        await deleteGroupPermanently(webSocketMessageData?.groupID);
                        break;

                    // Handle creation of a new broadcast
                    case "new:broadcast":
                        await handleCreateBroadcast(webSocketMessageData?.newBroadcastData);
                        break;

                    // Handle adding members to a broadcast
                    case "add:member:to:broadcast":
                        await handleAddMemberToBroadcast(webSocketMessageData?.addingInfo);
                        break;

                    // Handle removal of members from a broadcast
                    case "remove:broadcast:member":
                        await handleRemoveMemberFromBroadcast(webSocketMessageData?.removingInfo);
                        break;

                    // Handle changes to broadcast profile information
                    case 'broadcast:profileInfo:change':
                        await handleChangeBroadcastPorfileInfo(webSocketMessageData?.newProfileInfo);
                        break;

                    // Handle permanent deletion of a broadcast
                    case 'broadcast:delete:permanently':
                        await deleteBroadcastPermanently(webSocketMessageData?.broadcastData);
                        break;

                    // Handle initiation of a new call
                    case "make:new:call":
                        await handleNewCall(webSocketMessageData?.newCallData);
                        break;

                    // Handle call busy status
                    case "busy:on:call":
                        await handleBusyCall(webSocketMessageData?.callData);
                        break;

                    // Handle call acceptance
                    case "call:accepted":
                        await handleCallAccepted(webSocketMessageData?.callData);
                        break;

                    // Handle WebRTC renegotiation process
                    case "call:renegotiation":
                        let parsedRenegoData = webSocketMessageData?.callData;
                        sendTo(
                            parsedRenegoData.remotePeer,
                            'call:renegotiation',
                            'callData',
                            parsedRenegoData
                        );
                        break;

                    // Handle completion of WebRTC renegotiation
                    case "call:renegotiation:done":
                        let parsedNegoDoneData = webSocketMessageData?.callData;
                        sendTo(
                            parsedNegoDoneData.remotePeer,
                            'call:renegotiation:done',
                            'callData',
                            parsedNegoDoneData
                        );
                        break;

                    // Handle toggling of audio during a call
                    case "call:toggleAudio":
                        let parsedAudioData = webSocketMessageData?.callData;
                        sendTo(
                            parsedAudioData.remotePeer,
                            'call:toggleAudio',
                            'callData',
                            parsedAudioData
                        );
                        break;

                    // Handle toggling of video during a call
                    case "call:toggleVideo":
                        let parsedVideoData = webSocketMessageData?.callData;
                        sendTo(
                            parsedVideoData.remotePeer,
                            'call:toggleVideo',
                            'callData',
                            parsedVideoData
                        );
                        break;

                    // Handle call rejection
                    case "call:rejected":
                        handleCallRejected(webSocketMessageData?.callData);
                        break;

                    // Handle ending of a call
                    case "call:ended":
                        handleCallEnded(webSocketMessageData?.callData);
                        break;

                    // Handle missed call scenario
                    case "call:missed":
                        handleMissedCall(webSocketMessageData?.callData);
                        break;

                    // Handle deletion of call records
                    case "delete:calls":
                        await handleDeleteCalls(webSocketMessageData?.callsData);
                        break;

                    // Handle user account deletion
                    case "delete:user:account":
                        handleDeleteUserAccount(webSocketMessageData?.currentUserID);
                        break;

                    // Default case for unrecognized message types
                    default:
                        console.log('not found')
                        break;
                }
            })

            // Handle connection close event
            connection.on('close', (code, reason) => {
                // Update the online users list when a connection closes
                indicateOnlineUsers();

                // Log the connection closure with its code and reason
                console.log('Connection closed:', {
                    code: code,
                    reason: reason.toString()
                });
            });

            // The following code is commented out but shows a heartbeat mechanism
            // to keep track of live connections and terminate dead ones:

            // connection.on("open", () => {
            //     // Log when a connection is opened
            //     console.log("Closed")
            // })

            // // Mark connection as alive
            // connection.isAlive = true;

            // // Set interval to send ping periodically
            // connection.timer = setInterval(() => {
            //     connection.ping();

            //     // Set timeout to declare connection dead if no pong is received
            //     connection.deathTimer = setTimeout(() => {
            //         connection.isAlive = false; // Mark as not alive
            //         clearInterval(connection.timer); // Clear ping interval
            //         connection.terminate(); // Terminate dead connection
            //         indicateOnlineUsers('dead'); // Update online users list
            //         console.log("Dead"); // Log connection death
            //     }, 1000)
            // }, 1500)

            // // Reset death timer when pong is received
            // connection.on("pong", () => {
            //     clearTimeout(connection.deathTimer);
            // })


        })
    } catch (error) {
        console.log(error)
    }
}
startServer();