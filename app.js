const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const db = require('./db');  //db connection is located

const session = require('express-session');

app.use(session({
    secret: '1234', //secure key
    resave: true,
    saveUninitialized: true
}));

// Setup middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));




//----------------------------login page-------------------------------//

// Login route (GET)
app.get('/login', (req, res) => {
    res.render('login');
});



// Registration route------------------------------------- (GET)
app.get('/registration', (req, res) => {
    res.render('registration');
});

// Registration route (POST) - Save raw password
app.post('/registration', async (req, res) => {
    const { firstname, lastname, username, email, phone, password } = req.body;
    try {
        await db.query(
            'INSERT INTO Registration (Firstname, Lastname, Username, Email, Phone, Password) VALUES (?, ?, ?, ?, ?, ?)',
            [firstname, lastname, username, email, phone, password] // Store raw password
        );
        // Add to Members table with auto-incremented Member_id
        await db.query('INSERT INTO Members (Username) VALUES (?)', [username]);
        res.redirect('/user-login');
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Registration failed</h1>');
    }
});



//----------------------- User login route------------------------------------- (GET)
app.get('/user-login', (req, res) => {
    res.render('user-login');
});

// User login route (POST)  saving user email
app.post('/user-login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT Password FROM Registration WHERE Email = ?', [email]);
        if (rows.length > 0 && password === rows[0].Password) { // Compare plain password directly
            req.session.userMail = email; // Save userMail in session
            res.redirect('/user-panel');
        } else {
            res.send('<h1>Invalid Password</h1>');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Ensure User is logged in

function ensureLoggedIn(req, res, next) {
    if (req.session.userMail) {
        next(); // Proceed to the next middleware/route handler
    } else {
        res.redirect('/login'); // Redirect to login page if not authenticated
    }
}

// retrive request.session.Member_id
app.use(async (req, res, next) => {
    try {
        // Check if userMail is in session and Member_id is not yet set
        if (req.session.userMail && !req.session.user) {
            const [rows] = await db.query(`
                SELECT m.Member_id 
                FROM Members m 
                JOIN Registration r ON m.Username = r.Username 
                WHERE r.Email = ?
            `, [req.session.userMail]);

            if (rows.length > 0) {
                // Save the Member_id in session
                req.session.user = { Member_id: rows[0].Member_id };
                
            } else {
                console.error("No Member_id found for the given email.");
            }
        }
        next();
    } catch (err) {
        console.error("Error retrieving Member_id:", err);
        res.status(500).send("Server error");
    }
});






//------------------------------user-panel------------------------------------//
// Render User Panel
app.get('/user-panel', (req, res) => {
    res.render('user-panel');
});


// 1.------------User profile route--------
app.get('/profile', ensureLoggedIn, async (req, res) => {
    const userMail = req.session.userMail; // Get user Mail from session
    const [rows] = await db.query(`SELECT Username FROM Registration WHERE email = ?`, [userMail]);
    let userName;
        userName = rows[0].Username; // Extract the Username
        console.log(userName);
    
    try {

        // Query to join Registration and Members table
        const [newRow] = await db.query(
            `SELECT Members.Member_id, Registration.Firstname, Registration.Lastname, 
                   Registration.Email, Registration.Username, Registration.Phone, Members.Address,
                   Members.Birthdate
            FROM Registration 
            JOIN Members ON Registration.Username = Members.Username 
            WHERE Registration.Username = ?`, [userName]
        );

        if (rows.length > 0) {
            res.render('profile.ejs', { profile: newRow[0] }); // Send joined data to profile.ejs
        } else {
            res.send('User not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Problem in quary or Server Error');
    }
});

//-------------edit-user-----------
app.get('/edit-profile/:memberId', ensureLoggedIn, async (req, res) => {
    const { memberId } = req.params;
    try {
        // Join Registration and Members tables to fetch profile data
        const [rows] = await db.query(`
            SELECT Members.Member_id, Members.Address, Members.Birthdate, 
                   Registration.Firstname, Registration.Lastname, Registration.Email, 
                   Registration.Username, Registration.Phone
            FROM Members
            JOIN Registration ON Members.Username = Registration.Username
            WHERE Members.Member_id = ?
        `, [memberId]);

        if (rows.length > 0) {
            res.render('edit-profile', { profile: rows[0] });
        } else {
            res.status(404).send('Profile not found');
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/update-profile/:memberId', ensureLoggedIn, async (req, res) => {
    const { memberId } = req.params;
    const { firstname, lastname, email, username, phone, address, birthdate } = req.body;

    try {
        // Fetch the current username to ensure consistency during updates
        const [member] = await db.query(`SELECT Username FROM Members WHERE Member_id = ?`, [memberId]);

        if (member.length === 0) {
            return res.status(404).send('Member not found');
        }

        const currentUsername = member[0].Username;

        // Update the Registration table
        await db.query(
            `UPDATE Registration SET Firstname = ?, Lastname = ?, Email = ?, Username = ?, Phone = ? WHERE Username = ?`,
            [firstname, lastname, email, username, phone, currentUsername]
        );

        // Update the Members table
        await db.query(
            `UPDATE Members SET Address = ?, Birthdate = ?, Username = ? WHERE Member_id = ?`,
            [address, birthdate, username, memberId]
        );

        // Redirect to the profile page after updating
        res.redirect(`/profile`);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Failed to update profile');
    }
});


//  2----------------search-books--------------------
app.get('/search-books', async (req, res) => {
    const query = req.query.query || '';
    try {
        let books;
        if (query) {
            books = await db.query(
                `SELECT * FROM Books WHERE Book_name LIKE ? OR Author_name LIKE ?`,
                [`%${query}%`, `%${query}%`]
            );
        } else {
            books = await db.query(`SELECT * FROM Books`);
        }
        res.render('search-books', { books: books[0], query });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.render('search-books', { books: [], query, error: 'Failed to fetch books' });
    }
});

// 3.------------transection--------------------

app.get('/user-transactions', async (req, res) => {
    try {
        const memberId = req.session.user.Member_id;

        const [rows] = await db.query(`
            SELECT t.Sequence, t.Admin_id, t.Member_id, b.Book_name, t.ReserveDate, t.ReturnDate
            FROM Transaction t
            JOIN Books b ON t.Book_id = b.Book_id
            WHERE t.Member_id = ?
        `, [memberId]);

        res.render('user-transactions', { transactions: rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving transactions.");
    }
});

//4.---------------payments----------------------------
app.get('/payment', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to login if not authenticated
        }

        const { Member_id } = req.session.user;

        // Query to get the last payment date
        const [lastPayment] = await db.query(
            `SELECT PaymentDate FROM Payments WHERE Member_id = ? ORDER BY PaymentDate DESC LIMIT 1`,
            [Member_id]
        );

        let lastPaidDate = lastPayment.length > 0 ? new Date(lastPayment[0].PaymentDate) : null;
        const today = new Date();
        let daysLeft = null;
        let paymentDue = false;

        if (lastPaidDate) {
            const daysSinceLastPayment = Math.floor((today - lastPaidDate) / (1000 * 60 * 60 * 24));// mili sec to 1 day convert
            daysLeft = 30 - daysSinceLastPayment;

            if (daysLeft <= 0) {
                paymentDue = true; // Payment overdue
                daysLeft = 0;
            }
        } else {
            paymentDue = true; // No payment history means payment is due
        }

        res.render('payment', {
            memberId: Member_id,
            lastPaidDate: lastPaidDate ? lastPaidDate.toISOString().split('T')[0] : 'No payment yet',
            daysLeft,
            paymentDue,
        });
    } catch (error) {
        console.error('Error rendering payment page:', error);
        res.status(500).send('Internal Server Error');
    }
});
/// update after payment-----------
app.post('/payment', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to login if not authenticated
        }

        const { Member_id } = req.session.user;
        const today = new Date();

        // Insert payment record into the database
        await db.query(
            `INSERT INTO Payments (Member_id, Amount, PaymentDate) VALUES (?, ?, ?)`,
            [Member_id, 100, today]
        );

        res.redirect('/payment'); // Redirect back to payment page
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Internal Server Error');
    }
});

//5.----------authors---------------
app.get('/authors', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to login if user is not logged in
        }

        // Query to fetch distinct authors from the `Books` table
        const [authors] = await db.query(`SELECT DISTINCT Author_name FROM Books`);

        res.render('authors', { authors });
    } catch (error) {
        console.error('Error fetching authors:', error);
        res.status(500).send('Internal Server Error');
    }
});






//------------------------ Render Admin Panel---------------------
app.get('/admin-panel', (req, res) => {
    res.render('admin-panel');
});

// Get admin login
app.get('/admin-login', (req, res) => {
    res.render('admin-login');
});

// Admin login route (POST)
app.post('/admin-login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT Password FROM Admin WHERE Admin_mail = ?', [email]);
        if (rows.length > 0 && password === rows[0].Password) { // Compare plain password directly
            req.session.adminId = email; // Saving admin session
            res.redirect('/admin-panel');
        } else {
            res.send('<h1>Invalid Password</h1>');
        }
    } catch (error){
        console.error(error);
        res.status(500).send('Server Error');
    }
});
//1.------------userlist-----------
// Route to see the list of users
app.get('/admin-user-list', async (req, res) => {
    try {
        // Query to fetch users from the database
        const [users] = await db.query(`
            SELECT Member_id, Firstname, Lastname, Email,
             Phone FROM Members 
             INNER JOIN Registration ON Members.Username = Registration.Username
             `);
        res.render('admin-user-list', { users });
        console.log(`Users fetched: ${users.length}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

//2.--------------Adding books----------------
// Render the Add Books page
app.get('/admin-add-books', (req, res) => {
    res.render('admin-add-books');
});

// Handle the Add Books form submission
app.post('/admin-add-books', async (req, res) => {
    const { bookName, authorName, quantity } = req.body;

    try {
        // Check if the book already exists
        const [existingBook] = await db.query(
            'SELECT Book_id, Quantity FROM Books WHERE Book_name = ? AND Author_name = ?',
            [bookName, authorName]
        );

        if (existingBook.length > 0) {
            // Book exists: Update quantity
            const bookId = existingBook[0].Book_id;
            const newQuantity = existingBook[0].Quantity + parseInt(quantity);

            await db.query('UPDATE Books SET Quantity = ? WHERE Book_id = ?', [newQuantity, bookId]);
            res.send(`<script>alert('Book quantity updated successfully!'); window.location.href = '/admin-add-books';</script>`);
        } else {
            // Book does not exist: Insert new book
            await db.query(
                'INSERT INTO Books (Book_name, Author_name, Quantity) VALUES (?, ?, ?)',
                [bookName, authorName, quantity]
            );
            res.send(`<script>alert('New book added successfully!'); window.location.href = '/admin-add-books';</script>`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Server Error</h1>');
    }
});




// 3.-------------Adding Admin----------------
app.get('/admin-add-admins', (req, res) => {
    res.render('admin-add-admins');
});

app.post('/admin-add-admins', async (req, res) => {
    const { adminName, adminEmail, adminPhone, adminPassword, adminConfirmPassword } = req.body;

    // Check if the passwords match
    if (adminPassword !== adminConfirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    try {
        // Check if the email already exists
        const [existingAdmin] = await db.query('SELECT * FROM Admin WHERE Admin_mail = ?', [adminEmail]);
        if (existingAdmin.length > 0) {
            return res.status(400).send('Admin with this email already exists');
        }

        // Prepare SQL query to insert new admin
        const query = 'INSERT INTO Admin (Admin_name, Admin_mail, Phone, Password) VALUES (?, ?, ?, ?)';
        const values = [adminName, adminEmail, adminPhone, adminPassword];
        
        // Execute the query to add the admin
        await db.query(query, values);
        res.send(`<script>alert('Admin added successfully!');</script>`);
        console.log("Admin added");
        // Redirect to admin panel after successful addition
        res.redirect('/admin-panel');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

//--------------5.admin profile--------------------------
// Render the Admin Profile page
app.get('/admin-profile', async (req, res) => {
    if (!req.session.adminId) {
        return res.redirect('/admin-login'); // Redirect to login if admin is not logged in
    }

    try {
        // Fetch the admin details from the database
        const [adminDetails] = await db.query(
            'SELECT Admin_id, Admin_name, Admin_mail, Phone FROM Admin WHERE Admin_mail = ?',
            [req.session.adminId]
        );

        if (adminDetails.length === 0) {
            return res.status(404).send('<h1>Admin not found</h1>');
        }

        // Render the profile page with the admin details
        res.render('admin-profile', { admin: adminDetails[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Server Error</h1>');
    }
});
//-----edit profile req------------
// Render the Edit Profile page
app.get('/admin-edit-profile', async (req, res) => {
    if (!req.session.adminId) {
        return res.redirect('/admin-login'); // Redirect if admin is not logged in
    }

    try {
        // Fetch the admin details for pre-filling the edit form
        const [adminDetails] = await db.query(
            'SELECT Admin_id, Admin_name, Admin_mail, Phone FROM Admin WHERE Admin_mail = ?',
            [req.session.adminId]
        );

        if (adminDetails.length === 0) {
            return res.status(404).send('<h1>Admin not found</h1>');
        }

        res.render('admin-edit-profile', { admin: adminDetails[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Server Error</h1>');
    }
});
// Handle profile update
app.post('/admin-edit-profile', async (req, res) => {
    const { adminName, adminPhone } = req.body;

    try {
        // Update admin details in the database
        await db.query(
            'UPDATE Admin SET Admin_name = ?, Phone = ? WHERE Admin_mail = ?',
            [adminName, adminPhone, req.session.adminId]
        );

        res.redirect('/admin-profile'); // Redirect back to the profile page
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Server Error</h1>');
    }
});

//6.--------------payments-------------
app.get('/admin-payments', async (req, res) => {
    try {
        // Query to fetch payment data
        const query = `
            SELECT 
                Members.Member_id,
                CONCAT(Registration.Firstname, ' ', Registration.Lastname) AS Member_name,
                MAX(Payments.PaymentDate) AS LastPayment,
                CASE 
                    WHEN MAX(Payments.PaymentDate) IS NULL THEN 'Due'
                    WHEN TIMESTAMPDIFF(MONTH, MAX(Payments.PaymentDate), CURDATE()) > 0 THEN 'Due'
                    ELSE 'Completed'
                END AS Status,
                CASE 
                    WHEN MAX(Payments.PaymentDate) IS NULL THEN TIMESTAMPDIFF(MONTH, CURDATE(), CURDATE()) 
                    ELSE TIMESTAMPDIFF(MONTH, MAX(Payments.PaymentDate), CURDATE())
                END AS DueMonths
            FROM Members
            LEFT JOIN Registration ON Members.Username = Registration.Username
            LEFT JOIN Payments ON Members.Member_id = Payments.Member_id
            GROUP BY Members.Member_id;
        `;

        const [payments] = await db.query(query);

        res.render('admin-payments', { payments });
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Server Error</h1>');
    }
});
//------------------transections-----------------------
app.get('/admin-transactions', async (req, res) => {
    try {
        // Fetch all available books
        const [books] = await db.query('SELECT Book_id, Book_name, Author_name FROM Books WHERE Quantity > 0');
        res.render('admin-transactions', { books });
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Server Error</h1>');
    }
});

app.post('/admin-transactions', async (req, res) => {
    const { memberId, reserveDate, returnDate, bookId } = req.body;
    const adminMail = req.session.adminId; // Assume the admin's email is stored in the session

    try {
        // Validate session and retrieve Admin_id
        const [result] = await db.query('SELECT Admin_id FROM Admin WHERE Admin_mail = ?', [adminMail]);
        if (result.length === 0) {
            return res.status(400).send('Invalid admin session');
        }
        const adminId = result[0].Admin_id;

        // Check if the member exists
        const [memberCheck] = await db.query('SELECT Member_id FROM Members WHERE Member_id = ?', [memberId]);
        if (memberCheck.length === 0) {
            return res.status(400).send('<h1>Invalid Member ID</h1><a href="/admin-transactions">Go Back</a>');
        }

        // Check if the book exists and is available
        const [bookCheck] = await db.query('SELECT Quantity FROM Books WHERE Book_id = ?', [bookId]);
        if (bookCheck.length === 0) {
            return res.status(400).send('<h1>Book does not exist</h1><a href="/admin-transactions">Go Back</a>');
        }
        if (bookCheck[0].Quantity <= 0) {
            return res.status(400).send('<h1>Book not available</h1><a href="/admin-transactions">Go Back</a>');
        }

        // Insert the transaction
        await db.query(
            'INSERT INTO Transaction (ReserveDate, ReturnDate, Book_id, Admin_id, Member_id) VALUES (?, ?, ?, ?, ?)',
            [reserveDate, returnDate, bookId, adminId, memberId]
        );

        // Decrease the book quantity
        await db.query('UPDATE Books SET Quantity = Quantity - 1 WHERE Book_id = ?', [bookId]);

        res.send('<h1>Transaction Recorded Successfully</h1><a href="/admin-transactions">Go Back</a>');
    } catch (error) {
        console.error('Error processing transaction:', error);
        res.status(500).send('<h1>Server Error</h1><a href="/admin-transactions">Go Back</a>');
    }
});





// logout route
app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Something went wrong!');
        }

        // Redirect to the login page after logout
        res.redirect('/login');
    });
});



// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
