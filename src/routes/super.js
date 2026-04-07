const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const { superOnly } = require('../middleware/auth');
const router  = express.Router();

router.use(superOnly);

// ── 유치원 CRUD ───────────────────────────────────────────────

// GET /api/super/kindergartens
router.get('/kindergartens', (req, res) => {
  const rows = db.prepare(`
    SELECT k.*,
      (SELECT COUNT(*) FROM classrooms WHERE kindergarten_id=k.id) AS classroom_count,
      (SELECT COUNT(*) FROM students s JOIN classrooms c ON c.id=s.classroom_id WHERE c.kindergarten_id=k.id) AS student_count,
      u.username AS admin_username, u.name AS admin_name, u.email AS admin_email
    FROM kindergartens k
    LEFT JOIN users u ON u.kindergarten_id=k.id AND u.role='kg_admin'
    ORDER BY k.id DESC
  `).all();
  res.json({ success: true, data: rows });
});

// POST /api/super/kindergartens
router.post('/kindergartens', (req, res) => {
  const { name, director, phone, address } = req.body;
  if (!name) return res.status(400).json({ success: false, message: '유치원 이름을 입력해주세요.' });
  const r = db.prepare('INSERT INTO kindergartens (name,director,phone,address) VALUES (?,?,?,?)').run(name, director, phone, address);
  res.json({ success: true, id: r.lastInsertRowid });
});

// PUT /api/super/kindergartens/:id
router.put('/kindergartens/:id', (req, res) => {
  const { name, director, phone, address, status } = req.body;
  db.prepare('UPDATE kindergartens SET name=?,director=?,phone=?,address=?,status=? WHERE id=?')
    .run(name, director, phone, address, status || 'active', req.params.id);
  res.json({ success: true });
});

// DELETE /api/super/kindergartens/:id
router.delete('/kindergartens/:id', (req, res) => {
  db.prepare('DELETE FROM kindergartens WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── 유치원 관리자 계정 CRUD ───────────────────────────────────

// GET /api/super/admins
router.get('/admins', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.name, u.email, u.role, u.kindergarten_id, u.created_at,
           k.name AS kindergarten_name
    FROM users u
    LEFT JOIN kindergartens k ON k.id=u.kindergarten_id
    ORDER BY u.id DESC
  `).all();
  res.json({ success: true, data: rows });
});

// POST /api/super/admins  — 유치원 관리자 생성
router.post('/admins', (req, res) => {
  const { username, password, name, email, kindergarten_id } = req.body;
  if (!username || !password || !kindergarten_id)
    return res.status(400).json({ success: false, message: '아이디, 비밀번호, 유치원을 모두 입력해주세요.' });
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username))
    return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });

  const hashed = bcrypt.hashSync(password, 10);
  const r = db.prepare(`
    INSERT INTO users (username,password,name,email,role,kindergarten_id)
    VALUES (?,?,?,?,'kg_admin',?)
  `).run(username, hashed, name || '관리자', email || null, kindergarten_id);
  res.json({ success: true, id: r.lastInsertRowid });
});

// PUT /api/super/admins/:id  — 비밀번호/이름/이메일 수정
router.put('/admins/:id', (req, res) => {
  const { name, email, password, kindergarten_id } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

  const newPw = password ? bcrypt.hashSync(password, 10) : user.password;
  db.prepare('UPDATE users SET name=?,email=?,password=?,kindergarten_id=? WHERE id=?')
    .run(name || user.name, email || user.email, newPw, kindergarten_id || user.kindergarten_id, req.params.id);
  res.json({ success: true });
});

// DELETE /api/super/admins/:id
router.delete('/admins/:id', (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id=?').get(req.params.id);
  if (user?.role === 'super')
    return res.status(403).json({ success: false, message: '슈퍼관리자는 삭제할 수 없습니다.' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/super/stats  — 전체 통계
router.get('/stats', (req, res) => {
  const stats = {
    kindergartens: db.prepare('SELECT COUNT(*) AS c FROM kindergartens WHERE status="active"').get().c,
    admins:        db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='kg_admin'").get().c,
    students:      db.prepare('SELECT COUNT(*) AS c FROM students').get().c,
    reservations:  db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE reserve_date=date('now','localtime')").get().c,
  };
  res.json({ success: true, data: stats });
});

module.exports = router;
