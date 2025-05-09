import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import Auth from './database/model/authModel.js';
import User from './database/model/userModel.js';
import jwt from 'jsonwebtoken'
import bodyParser from 'body-parser';

// Constants
const default_redirect = '/';

// Router
const auth_router = express.Router();
auth_router.use(cookieParser());
auth_router.use(express.urlencoded({ extended: true }));
auth_router.use(bodyParser.json());
auth_router.use(redirect);

// Login routes
auth_router.route('/login')
    .get((req, res) => {
        res.render('login.ejs', { redirect: req.redirect_param });
    })
    .post(async (req, res) => {
        const { username, password } = req.body;
        try {
            const token = await login(username, password);
            res.cookie('token', token).redirect(req.redirect);
        } catch (error) {
            const data = { username: username, password: password, redirect: req.redirect_param, error: error.message };
            res.render('login.ejs', data);
        }
    });

// Signup routes
auth_router.route('/signup')
    .get((req, res) => {
        res.render('signup.ejs', { redirect: req.redirect_param });
    })
    .post(async (req, res) => {
        const { username, email, password, confirm_password } = req.body;
        try {
            const token = await signup(username, email, password, confirm_password);
            res.cookie('token', token).redirect(req.redirect);
        } catch (error) {
            const data = { username: username, email: email, password: password, confirm_password: confirm_password, redirect: req.redirect_param, error: error.message }
            res.render('signup.ejs', data);
        }
    });

// Logout route
auth_router.get('/logout', async (req, res) => {
    res.clearCookie('token').redirect('/login');
});

// Middleware to check if user is authenticated
export const auth = async (req, res, next) => {
    const token = req.cookies.token;
    const secret = process.env.PASSWORD_HASH_SECRET;
    try {
        if (!token) {
            throw Error('No Token Provided')
        }
        const id = jwt.verify(token, secret).id;
        req.user = await User.findByPk(id);;
        next();
    } catch (err) {
        return res.redirect('/login?redirect=' + req.url);
    }
};

// Login function
async function login(username, password) {
    const id = await User.findOne({ where: { username: username } }).id;
    if (!id) {
        throw new Error('No Account found with this username');
    }
    const expectedPassword = await Auth.findByPk(id);
    if (!expectedPassword) {
        throw new Error('There was a problem during login. Pls contact you admin.');
    }
    const hashedPassword = hash(password);
    if (!hashedPassword || expectedPassword.password !== hashedPassword) {
        throw new Error('wrong password entered');
    }
    return await generateToken(username);
}

// signup function
async function signup(username, email, password, confirm_password) {
    if (password !== confirm_password) {
        throw new Error('Passwords do not match');
    }
    const existingUser = await Auth.findByPk(username);
    if (existingUser) {
        throw new Error('User already exists');
    }
    const hashedPassword = hash(password);
    const id = crypto.randomUUID();
    await Auth.create({ id, password: hashedPassword });
    await User.create({ id, username, email });
    return await generateToken(id);
}

// Create Hash
function hash(data) {
    const secret = process.env.PASSWORD_HASH_SECRET;
    if (!secret) {
        return new Error('Password hash secret not found');
    }
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// Helper function to generate a token
async function generateToken(id) {
    const secret = process.env.PASSWORD_HASH_SECRET;
    const options = { expiresIn: '1h' };
    const payload = {
        id: id,
    }
    const token = jwt.sign(payload, secret, options);
    return token;
}

// Middleware to redirect
function redirect(req, res, next) {
    req.redirect = req.query.redirect ?? default_redirect;
    req.redirect_param = `?redirect=${req.redirect}`;
    next();
};

export default auth_router;