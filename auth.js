// auth.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'Remeil-Dragonheart-2026-09-05';

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        SECRET,
        { expiresIn: '1h' }
    );
}

// Express middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, SECRET, (err, payload) => {
        if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = payload;    // { id, username }
        next();
    });
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
};