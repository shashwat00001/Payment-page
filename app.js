const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 3000;

// Dummy Database
const users = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 15 * 60 * 1000 } // Session expires in 15 minutes
}));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'shashwatshukla00001@gmail.com',
        pass: 'sszo pram pzlf odgz'
    }
});

// REGISTER
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({ name, email, password: hashedPassword });

    transporter.sendMail({
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Registration Successful',
        html: `<h2>Welcome ${name}!</h2><p>Your registration was successful.</p>`
    }, (err, info) => {
        if (err) {
            console.log(err);
            res.send('Error sending email');
        } else {
            console.log('Email sent: ' + info.response);
            res.sendFile(__dirname + '/public/email-sent.html');
        }
    });
});

// LOGIN
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (user && await bcrypt.compare(password, user.password)) {
        const otp = Math.floor(100000 + Math.random() * 900000);
        req.session.otp = otp;
        req.session.otpCreatedAt = Date.now();
        req.session.user = user;
        req.session.wrongOtpAttempts = 0;

        transporter.sendMail({
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Your Login OTP',
            html: `<h2>Your OTP is: ${otp}</h2><p>This OTP will expire in 2 minutes.</p>`
        }, (err, info) => {
            if (err) {
                console.log(err);
                res.send('Error sending OTP');
            } else {
                console.log('OTP sent: ' + info.response);
                res.sendFile(__dirname + '/public/enter-otp.html');
            }
        });

    } else {
        res.send('Invalid Email or Password');
    }
});

// VERIFY OTP
app.post('/verify-otp', (req, res) => {
    const { otp } = req.body;

    // Check OTP expiry
    if (!req.session.otp || Date.now() - req.session.otpCreatedAt > 2 * 60 * 1000) {
        return res.send('OTP expired. Please login again.');
    }

    if (parseInt(otp) === req.session.otp) {
        req.session.loggedIn = true;
        res.redirect('/payment');
    } else {
        req.session.wrongOtpAttempts = (req.session.wrongOtpAttempts || 0) + 1;

        if (req.session.wrongOtpAttempts >= 3) {
            req.session.destroy();
            return res.send('Too many wrong attempts. Login again.');
        }

        res.send(`Invalid OTP. Attempts left: ${3 - req.session.wrongOtpAttempts}`);
    }
});

// PAYMENT
app.get('/payment', (req, res) => {
    if (req.session.loggedIn) {
        res.sendFile(__dirname + '/public/payment.html');
    } else {
        res.redirect('/login');
    }
});

app.post('/submit-payment', (req, res) => {
    const { utr } = req.body;
    console.log('Payment UTR:', utr);
    res.sendFile(__dirname + '/public/payment-pending.html');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
