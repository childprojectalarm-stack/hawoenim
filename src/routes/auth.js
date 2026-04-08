const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { sendTempPassword } = require('../services/mailer');
const { auth } = require('../middleware/auth');
const router  = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'ìì´ëì ë¹ë°ë²í¸ë¥¼ ìë ¥í´ì£¼ì¸ì.' });

  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ success: false, message: 'ìì´ë ëë ë¹ë°ë²í¸ê° ì¬ë°ë¥´ì§ ììµëë¤.' });

  // ì ì¹ì ì ë³´ í¨ê» ë°í
  let kindergarten = null;
  if (user.kindergarten_id) {
    kindergarten = db.prepare('SELECT id, name FROM kindergartens WHERE id=?').get(user.kindergarten_id);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, kindergarten_id: user.kindergarten_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  const userObj = {
    username: user.username, name: user.name,
    email: user.email, role: user.role,
    kindergarten_id: user.kindergarten_id,
    kindergartenName: kindergarten ? kindergarten.name : null,
    kindergarten
  };
  res.json({
    success: true, token,
    user: userObj,
    admin: userObj
  });
});

// PUT /api/auth/change-id
router.put('/change-id', auth, (req, res) => {
  const { newUsername, currentPassword } = req.body;
  if (!newUsername || newUsername.length < 4)
    return res.status(400).json({ success: false, message: 'ìì´ëë 4ì ì´ìì´ì´ì¼ í©ëë¤.' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ success: false, message: 'íì¬ ë¹ë°ë²í¸ê° ì¬ë°ë¥´ì§ ììµëë¤.' });
  if (db.prepare('SELECT id FROM users WHERE username=? AND id!=?').get(newUsername, req.user.id))
    return res.status(409).json({ success: false, message: 'ì´ë¯¸ ì¬ì© ì¤ì¸ ìì´ëìëë¤.' });
  db.prepare('UPDATE users SET username=? WHERE id=?').run(newUsername, req.user.id);
  res.json({ success: true });
});

// PUT /api/auth/change-pw
router.put('/change-pw', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ success: false, message: 'ì ë¹ë°ë²í¸ë 6ì ì´ìì´ì´ì¼ í©ëë¤.' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ success: false, message: 'íì¬ ë¹ë°ë²í¸ê° ì¬ë°ë¥´ì§ ììµëë¤.' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ success: true });
});

// PUT /api/auth/email
router.put('/email', auth, (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@'))
    return res.status(400).json({ success: false, message: 'ì¬ë°ë¥¸ ì´ë©ì¼ì ìë ¥í´ì£¼ì¸ì.' });
  db.prepare('UPDATE users SET email=? WHERE id=?').run(email, req.user.id);
  res.json({ success: true });
});

// POST /api/auth/find-pw
router.post('/find-pw', async (req, res) => {
  const { username, email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || user.email !== email)
    return res.status(404).json({ success: false, message: 'ìì´ë ëë ì´ë©ì¼ì´ ì¼ì¹íì§ ììµëë¤.' });
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const tempPw = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(tempPw, 10), user.id);
  try {
    await sendTempPassword(email, username, tempPw);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'ì´ë©ì¼ ë°ì¡ ì¤ë¥: ' + e.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,username,name,email,role,kindergarten_id FROM users WHERE id=?').get(req.user.id);
  let kindergarten = null;
  if (user.kindergarten_id)
    kindergarten = db.prepare('SELECT id,name FROM kindergartens WHERE id=?').get(user.kindergarten_id);
  res.json({ success: true, user: { ...user, kindergarten } });
});

module.exports = router;
