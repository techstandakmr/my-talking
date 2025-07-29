import mongoose from 'mongoose';
const mongodbConnect = async () => {
    // Connect to MongoDB using URL from environment variables
    mongoose.connect(process.env.MONGODB_URL)
        .then(() => { console.log("MongoDB Connected") }) // Log success message on connection
        .catch((error) => { console.log(error) }) // Log any error during connection
};

export default mongodbConnect;