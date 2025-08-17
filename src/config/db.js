// src/config/db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  // Choose the connection string based on the environment
  const mongoURI = process.env.NODE_ENV === 'test'
    ? process.env.MONGO_URI_TEST
    : process.env.MONGO_URI;

  if (!mongoURI) {
    console.error(`❌ MONGO URI not found for NODE_ENV: ${process.env.NODE_ENV}. Make sure MONGO_URI or MONGO_URI_TEST is set in your .env file.`);
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    if (process.env.NODE_ENV !== 'test') {
        console.log('✅ MongoDB Atlas connected successfully!');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;