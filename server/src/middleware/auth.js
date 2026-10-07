import jwt from 'jsonwebtoken';
import config from '../config/index.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function verify(req, role) {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return payload.role === role ? payload : null;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const payload = verify(req, 'user');
  if (!payload) return res.status(401).json({ message: 'Session expired, please log in again' });
  req.user = { id: payload.sub, mobile: payload.mobile };
  next();
}

export function requireAdmin(req, res, next) {
  if (!verify(req, 'admin')) return res.status(401).json({ message: 'Please log in to the admin panel' });
  next();
}
