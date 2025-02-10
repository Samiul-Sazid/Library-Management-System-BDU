create database lms;
use lms;
CREATE TABLE Registration (
    Firstname VARCHAR(50),
    Lastname VARCHAR(50),
    Username VARCHAR(50) PRIMARY KEY,
    Email VARCHAR(100) UNIQUE,
    Phone VARCHAR(15),
    Password VARCHAR(100)
);

CREATE TABLE Members (
    Member_id INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50),
    Address TEXT,
    Birthdate DATE,
    FOREIGN KEY (Username) REFERENCES Registration(Username)
);


CREATE TABLE Admin (
    Admin_id INT PRIMARY KEY AUTO_INCREMENT,
    Admin_mail VARCHAR(100),
    Admin_name VARCHAR(50),
    Phone VARCHAR(15),
    Password VARCHAR(100)
);

CREATE TABLE Books (
    Book_id INT PRIMARY KEY AUTO_INCREMENT,
    Book_name VARCHAR(200),
    Author_name VARCHAR(100),
    Quantity INT
);

CREATE TABLE Transaction (
    Sequence INT PRIMARY KEY AUTO_INCREMENT,
    ReserveDate DATE,
    ReturnDate DATE,
    Book_id INT,
    Admin_id INT,
    Member_id INT,
    FOREIGN KEY (Book_id) REFERENCES Books(Book_id),
    FOREIGN KEY (Admin_id) REFERENCES Admin(Admin_id),
    FOREIGN KEY (Member_id) REFERENCES Members(Member_id)
);



CREATE TABLE Payments (
    Payment_id INT PRIMARY KEY AUTO_INCREMENT,
    Member_id INT,
    Amount DECIMAL(10, 2),
    PaymentDate DATE,
    FOREIGN KEY (Member_id) REFERENCES Members(Member_id)
);


-- inserting data------------------------------------------------------------

INSERT INTO Registration (Firstname, Lastname, Username, Email, Phone, Password) VALUES
('Samiul', 'Sazid', 'Sammo', 'samiulsazid1234@gmail.com', '01717867383', 'password');

-- Inserting into Members table (Auto-generated Member_id, referencing Username from Registration)
INSERT INTO Members (Member_id, Username, Address, Birthdate) VALUES
('2101049','Sammo','Naogaon', '2002-03-18' );

-- Inserting into Admin table (Admin_id as INT)
INSERT INTO Admin (Admin_id, Admin_name, Admin_mail, Phone, Password) VALUES
(2102001,'Meshkat', 'admin01@example.com', '01812345678', 'password');

-- Inserting more books into the Books table
INSERT INTO Books (Book_name, Author_name, Quantity) VALUES
('Shonar Bangla', 'Rabindranath Tagore', 20),
('Chokher Bali', 'Rabindranath Tagore', 12),
('Pather Dabi', 'Subhas Chandra Bose', 5),
('Ruposhi Bangla', 'Kazi Nazrul Islam', 10),
('Demonetisation', 'Satyajit Ray', 30),
('Kabi', 'Jibanananda Das', 8),
('Shibpurer Jiban', 'Nabaneeta Dev Sen', 15),
('Bangla Lok-Sahitya', 'Satyendranath Dutta', 7),
('Chhoto Nae', 'Bibhutibhushan Bandopadhyay', 25),
('Madhabi', 'Sharat Chandra Chattopadhyay', 18);

-- Inserting into Transaction table (Foreign Keys: Admin_id and Member_id)
INSERT INTO Transaction (ReserveDate, ReturnDate, Book_id, Admin_id, Member_id) VALUES
('2024-12-01', '2024-12-10', 1, 2102001, 2101049);

-- Inserting into Payments table (Foreign Key: Member_id)
INSERT INTO Payments (Member_id, Amount, PaymentDate) VALUES
(2101049, 100, '2024-12-01');
