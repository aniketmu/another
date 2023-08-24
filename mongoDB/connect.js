import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_USER = "blogChefUser";
const MONGO_PASSWORD = process.env.MONGO_KEY;
const MONGO_CLUSTER = "cluster0.pq0gbfi.mongodb.net";
const MONGO_DATABASE = "your-database-name";

const MONGODB_URI = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_CLUSTER}/${MONGO_DATABASE}?retryWrites=true&w=majority`;

mongoose
  .connect(MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true, // Add this line to avoid deprecation warning
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
  });

const db = mongoose.connection;

export default db;
