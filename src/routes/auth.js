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
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });

  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });

  // 유치원 정보 함께 반환
  let kindergarten = null;
  if (user.kindergarten_id) {
    kindergarten = db.prepare('SELECT id, name FROM kindergartens WHERE id=?').get(user.kindergarten_id);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, kindergarten_id: user.kindergarten_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    success: true, token,
    user: {
      username: user.username, name: user.name,
      email: user.email, role: user.role,
      kindergarten_id: user.kindergarten_id,
      kindergarten
    }
  });
});

// PUT /api/auth/change-id
router.put('/change-id', auth, (req, res) => {
  const { newUsername, currentPassword } = req.body;
  if (!newUsername || newUsername.length < 4)
    return res.status(400).json({ success: false, message: '아이디는 4자 이상이어야 합니다.' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ success: false, message: '현재 비밀번호가 올바르지 않습니다.' });
  if (db.prepare('SELECT id FROM users WHERE username=? AND id!=?').get(newUsername, req.user.id))
    return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
  db.prepare('UPDATE users SET username=? WHERE id=?').run(newUsername, req.user.id);
  res.json({ success: true });
});

// PUT /api/auth/change-pw
router.put('/change-pw', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ success: false, message: '새 비밀번호는 6자 이상이어야 합니다.' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ success: false, message: '현재 비밀번호가 올바르지 않습니다.' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ success: true });
});

// PUT /api/auth/email
router.put('/email', auth, (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@'))
    return res.status(400).json({ success: false, message: '올바른 이메일을 입력해주세요.' });
  db.prepare('UPDATE users SET email=? WHERE id=?').run(email, req.user.id);
  res.json({ success: true });
});

// POST /api/auth/find-pw
router.post('/find-pw', async (req, res) => {
  const { username, email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || user.email !== email)
    return res.status(404).json({ success: false, message: '아이디 또는 이메일이 일치하지 않습니다.' });
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const tempPw = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(tempPw, 10), user.id);
  try {
    await sendTempPassword(email, username, tempPw);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: '이메일 발송 오류: ' + e.message });
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
