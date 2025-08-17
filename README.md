# NFC-Based Student Presence Tracking System - Backend

This repository contains the backend server for a robust NFC-based student attendance tracking system. Built with Node.js and Express, it provides a comprehensive REST API for managing all aspects of an academic institution's presence monitoring, from creating class schedules to real-time attendance confirmation via NFC scans.

The system is designed with clear user roles (Admin, Professor) and leverages modern technologies like WebSockets for a dynamic, real-time user experience on the frontend.

## ✨ Key Features

* **Role-Based Access Control**: Secure endpoints differentiate between Admin and Professor permissions. Admins have full CRUD control over all data, while Professors can manage attendance for their assigned sessions.
* **Real-Time Updates with Socket.io**: New NFC scans and presence confirmations are pushed to connected clients in real-time, allowing for live dashboard updates without needing to refresh the page.
* **Comprehensive Data Management**: Full CRUD (Create, Read, Update, Delete) functionality for core academic entities:
    * Filières (Academic Disciplines/Majors)
    * Modules (Courses)
    * Salles (Classrooms)
    * Professeurs (Professors)
    * Etudiants (Students), including photo uploads
    * Séances (Class Sessions) with automatic clash detection for professors and rooms.
* **NFC-Based Presence Tracking**: A dedicated endpoint (`/api/presences/scan`) to handle student attendance marking via their unique NFC ID.
* **Two-Step Presence Approval**: Scans mark a student's presence as "Pending," which the session's professor must then approve or reject, providing a layer of verification.
* **In-Depth Statistics & Reporting**: Powerful aggregation endpoints to generate statistics on attendance rates by professor, by module, or for an individual student.
* **Secure & Scalable**: Implements JWT for authentication, password hashing with `bcryptjs`, and security best practices with `helmet` and `cors`.
* **API Documentation**: Comes with a pre-configured Swagger UI setup for easy API testing and exploration.

## 🛠️ Technologies Used

* **Backend**: Node.js, Express.js
* **Database**: MongoDB with Mongoose ODM
* **Real-Time Communication**: Socket.io
* **Authentication**: JSON Web Tokens (JWT)
* **Testing**: Jest & Supertest
* **Image Handling**: Multer for uploads, Cloudinary for cloud storage
* **API Documentation**: Swagger UI Express
* **Security**: Helmet, CORS, express-rate-limit
* **Utilities**: `dotenv` for environment variables, `morgan` for logging, `express-validator` for input validation.

## 🚀 Getting Started

Follow these instructions to get a local copy of the project up and running for development and testing purposes.

### Prerequisites

* Node.js (v16.x or higher recommended)
* npm (or yarn)
* MongoDB Atlas account (or a local MongoDB instance)
* Cloudinary account for image hosting

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd nfc-presence-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project. This file will store your secret keys and configuration variables. Copy the structure below and fill it in with your own credentials.

    ```env
    # Development Database Connection String
    MONGO_URI=your_mongodb_development_connection_string

    # Test Database Connection String
    MONGO_URI_TEST=your_mongodb_test_connection_string

    # JWT Secret for signing tokens
    JWT_SECRET=your_long_random_jwt_secret_key

    # Server port
    PORT=5000
    NODE_ENV=development

    # Cloudinary Credentials for image uploads
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ```

4.  **Run the development server:**
    The server will start, typically on `http://localhost:5000`.
    ```bash
    npm run dev
    ```

5.  **Run tests:**
    To run the automated tests for the API endpoints:
    ```bash
    npm run test
    ```

## 📚 API Endpoints

The API is fully documented and can be explored via Swagger UI. Once the server is running, navigate to `http://localhost:5000/api-docs` in your browser.

A summary of available resource routes:

* `POST /api/auth/login` - Authenticate a user and receive a JWT.
* `/api/admins` - (Admin Only) CRUD operations for admins.
* `/api/professeurs` - (Admin Only) CRUD operations for professors.
* `/api/etudiants` - (Admin Only) CRUD operations for students.
* `/api/filieres` - CRUD operations for academic disciplines.
* `/api/modules` - CRUD operations for course modules.
* `/api/salles` - CRUD operations for classrooms.
* `/api/seances` - CRUD operations for class sessions.
* `/api/presences` - Routes for handling attendance scans and approvals.
* `/api/uploads` - Routes for file uploads (e.g., student photos).
* `/api/stats` - Routes for generating attendance statistics.
