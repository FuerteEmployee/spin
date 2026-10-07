import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, mobile: payload.mobile };
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
}
