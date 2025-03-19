Library Management System - BDU
Welcome to the Library Management System (LMS) for BDU! This system provides an intuitive platform for both users and administrators to manage library activities seamlessly.

Screenshots
User Panel
![image](https://github.com/user-attachments/assets/811d99e1-781b-46c0-813d-367b48cb4ce5)

Admin Panel
![image](https://github.com/user-attachments/assets/3612b74d-e5eb-4540-829f-665edd0a6268)

Features
User Panel:
Borrow and return books easily
Search and explore available books
View borrowing history
Admin Panel:
Add, remove, and update books
Manage user accounts
Track book borrowing details and user activity
Prerequisites
To run this project locally, you'll need the following:

MySQL Workbench to manage the database
Node.js installed globally
Installation & Setup
Follow the steps below to get your system up and running:

1. Install MySQL Workbench
Install MySQL Workbench on your machine and run the SQL file LMS New Database to set up the database.

2. Install Node.js
Make sure Node.js is installed globally. You can download it from here.

3. Install Dependencies
Open your terminal and install the required packages by running the following commands:


npm i express
npm install express-session
npm i ejs
npm i mysql2
npm i @types/body-parser
npm install -g nodemon
4. Start the Server
To run the application locally, execute:


nodemon app.js
5. Access the Application
Once the server is running, you can access the system by navigating to:

http://localhost:8080/login

Folder Structure
app.js - Main application entry point.
views/ - Contains the EJS templates for the user and admin panels.
public/ - Includes CSS, JS, and images for styling and front-end functionalities.
models/ - Database models for interacting with MySQL.
