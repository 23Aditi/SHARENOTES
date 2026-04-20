# 📚 SHARENOTES

A web application for sharing and downloading academic notes — making it easy for students to upload, browse, and access study material in one place.

---

## 🚀 Features

- Upload and share notes with others
- Download notes shared by the community
- User authentication (login / register)
- Organized file management

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Frontend:** HTML, CSS, JavaScript
- **Authentication:** JWT / Session-based middleware

---

## 📁 Project Structure

```
SHARENOTES/
├── config/          # Database and environment configuration
├── controllers/     # Route handler logic
├── middleware/      # Auth and validation middleware
├── models/          # Mongoose schemas
├── public/          # Static frontend files (HTML, CSS, JS)
├── routes/          # Express route definitions
├── utils/           # Helper/utility functions
├── app.js           # App setup and middleware registration
├── server.js        # Server entry point
└── onetime.js       # One-time setup script (e.g., seeding)
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+)
- [MongoDB](https://www.mongodb.com/) (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/23Aditi/SHARENOTES.git
   cd SHARENOTES
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

4. **Run the app**
   ```bash
   node server.js
   ```

   The app will be running at `http://localhost:3000`

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 👥 Contributors

- [23Aditi](https://github.com/23Aditi)
- [HarshalB9](https://github.com/HarshalB9)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
