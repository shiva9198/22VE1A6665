# Campus Eats - Sreyas Canteen App

<p align="center">
  <img src="frontend/src/assets/college-logo.png" alt="Sreyas Logo" width="120"/>
</p>

<p align="center">
  <b>A secure, scalable, and real-time canteen management system for colleges.</b><br>
  <i>This project is open-source. Give us a ⭐ if you find it useful!</i>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/shiva9198/college-canteen-management-system?style=social" alt="GitHub stars"/>
  <img src="https://img.shields.io/github/forks/shiva9198/college-canteen-management-system?style=social" alt="GitHub forks"/>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License"/>
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Backend-Node.js-339933" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Serverless-Convex-8A2BE2" alt="Convex"/>
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248" alt="MongoDB"/>
</p>

---

## 🌟 About The Project

Campus Eats is a full-stack application designed to modernize college canteens. It provides a seamless food ordering experience for students and a powerful management dashboard for administrators. The system is currently migrating its core business logic from a traditional REST API to a real-time, serverless backend with **Convex** for enhanced performance and scalability.

### Key Features
- **Dual User Roles:** A tailored experience for both **Students** and **Admins**.
- **Real-Time Order Tracking:** Students can place orders and track their status live.
- **Dynamic Menu Management:** Admins can easily update menu items, prices, and categories.
- **Efficient QR Code System:** A QR code is generated for each order for quick and secure collection.
- **Bulk Menu Upload:** Admins can upload the entire daily menu from a single Excel sheet.

## 📸 Screenshots

| Login Page | Register Page | Menu Page |
| :---: | :---: | :---: |
| ![Login Page](frontend/src/assets/LoginPage.png) | ![Register Page](frontend/src/assets/RegisterPage.png) | ![Menu Page](frontend/src/assets/MenuPage.png) |

## 🛠️ Tech Stack

This project is built with modern technologies to ensure a robust and scalable application.

- **Frontend:** React, React Router, Axios
- **Backend:**
  - **Serverless:** Convex (for real-time business logic and database)
  - **REST API (Legacy):** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JWT, bcrypt.js
- **File Handling:** Multer (for REST), Convex File Storage
- **QR Codes:** `qrcode` library

---

## 🚀 Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites
- **Node.js:** v18.0 or higher
- **MongoDB:** A local instance or a connection URI from MongoDB Atlas

### Installation & Setup

1.  **Clone the Repository**
    ```sh
    git clone [https://github.com/shiva9198/college-canteen-management-system.git](https://github.com/shiva9198/college-canteen-management-system.git)
    cd college-canteen-management-system
    ```

2.  **Install Backend Dependencies**
    ```sh
    cd backend
    npm install
    ```

3.  **Install Frontend Dependencies**
    ```sh
    cd ../frontend
    npm install
    ```

4.  **Configure Environment Variables**
    - In the `backend` folder, create a `.env` file by copying from `.env.example`.
    - Add your MongoDB connection string and a JWT secret:
      ```env
      MONGO_URI=your_mongodb_connection_string
      JWT_SECRET=your_super_secret_string
      ```

5.  **Seed the Database with an Admin User**
    - The default admin credentials are: `admin@canteen.com` / `Admin@123`
    ```sh
    cd backend
    npm run data:import
    ```

6.  **Run the Servers**
    - **Backend Server (Terminal 1):**
      ```sh
      cd backend
      npm run dev
      ```
    - **Frontend Server (Terminal 2):**
      ```sh
      cd frontend
      npm start
      ```

7.  **Open The App**
    - Visit `http://localhost:3000` in your browser.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

Please see `CONTRIBUTING.md` for more details on our code of conduct and the process for submitting pull requests.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Developed for Sreyas Institute of Engineering and Technology
</p>
