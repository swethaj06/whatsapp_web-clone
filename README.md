# WhatsApp Clone - MERN Stack Project

A full-stack WhatsApp clone application built with MongoDB, Express, React, and Node.js.

## Project Structure

```
whatsapp_web-clone/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middlewares/    # Express middlewares
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   └── server.js       # Express server setup
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas account)

## Installation

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB URI and other configurations

5. Start the backend server:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Start the React development server:
   ```bash
   npm start
   ```

   The app will run on `http://localhost:3000`

## Available Endpoints

### Health Check
- `GET /api/health` - Server health status

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

### Messages
- `POST /api/messages/send` - Send a message
- `GET /api/messages` - Get messages between two users
- `DELETE /api/messages/:id` - Delete a message

## Technologies Used

### Backend
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.io-client** - Real-time communication

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/whatsapp_clone
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Development Scripts

### Backend
- `npm run dev` - Start with nodemon (auto-reload)
- `npm start` - Start the server
- `npm test` - Run tests

### Frontend
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

## Features to Implement

- [ ] User authentication (registration, login)
- [ ] Real-time messaging with Socket.io
- [ ] User search functionality
- [ ] Message history
- [ ] Online/offline status
- [ ] Message read receipts
- [ ] File/image sharing
- [ ] Group chat functionality
- [ ] User typing indicator
- [ ] Message notifications

## Contributing

Feel free to fork this project and submit pull requests for any improvements.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please create an issue in the repository.