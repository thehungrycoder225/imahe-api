# Imahe API

## Description

Imahe API is a RESTful API built with Node.js, Express, and MongoDB. It provides endpoints for user authentication, photo management, and user management.

## Features

- User Registration and Authentication
- Photo Upload and Management
- User Profile Management

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/imahe-api.git
cd imahe-api
npm install
```

Create a .env file in the root directory of the project, and add the following:

Replace <your_mongodb_atlas_uri> with your actual MongoDB Atlas URI.

Usage
Start the server:

The server runs on port 3000.

API Endpoints

- User Registration POST /v1/api/users
- User Login: POST /v1/api/auth/login
- Photo Upload: POST /v1/api/photos
- Get All Photos: GET /v1/api/photos
  Contributing
- Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

License

- MIT

Contact

- thehungrycoder225
