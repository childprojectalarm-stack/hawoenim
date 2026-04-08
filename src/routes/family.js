const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { auth } = require('../middleware/auth');

function familyAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  if (req.user.role !== 'family') return res.status(403).json({ success: false, message: '학부모 계정이 아닙니다.' });
  next();
}

router.post('/login', (req, res) => {
  const { phone, student_name } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: '전화번호를 입력해주세요.' });
  let family;
  if (student_name) {
    family = db.prepare(`SELECT f.*, s.name as student_name, s.id as student_id, s.classroom_id, c.name as classroom_name, k.id as kindergarten_id, k.name as kindergarten_name FROM families f JOIN students s ON s.id=f.student_id JOIN classrooms c ON c.id=s.classroom_id JOIN kindergartens k ON k.id=c.kindergarten_id WHERE f.phone=? AND s.name=?`).get(phone, student_name);
  } else {
    family = db.prepare(`SELECT f.*, s.name as student_name, s.id as student_id, s.classroom_id, c.name as classroom_name, k.id as kindergarten_id, k.name as kindergarten_name FROM families f JOIN students s ON s.id=f.student_id JOIN classrooms c ON c.id=s.classroom_id JOIN kindergartens k ON k.id=c.kindergarten_id WHERE f.phone=?`).get(phone);
  }
  if (!family) return res.status(401).json({ success: false, message: '등록되지 않은 전화번호입니다. 유치원에 문의해 주세요.' });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: family.id, role: 'family', student_id: family.student_id, kindergarten_id: family.kindergarten_id }, process.env.JWT_SECRET||'hawoenim-secret', { expiresIn: '7d' });
  res.json({ success: true, token, family: { name: family.name, relation: family.relation, phone: family.phone, student_name: family.student_name, student_id: family.student_id, classroom_name: family.classroom_name, kindergarten_id: family.kindergarten_id, kindergarten_name: family.kindergarten_name }});
});

router.get('/me', auth, familyAuth, (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  const family = db.prepare(`SELECT f.*, s.name as student_name, s.emoji as student_emoji, s.classroom_id, c.name as classroom_name, c.emoji as classroom_emoji, k.name as kindergarten_name FROM families f JOIN students s ON s.id=f.student_id JOIN classrooms c ON c.id=s.classroom_id JOIN kindergartens k ON k.id=c.kindergarten_id WHERE f.id=?`).get(req.user.id);
  const todayReservation = db.prepare('SELECT * FROM reservations WHERE student_id=? AND reserve_date=?').get(family.student_id, today);
  res.json({ success: true, family, todayReservation });
});

router.get('/reservations', auth, familyAuth, (req, res) => {
  const { limit=10 } = req.query;
  const family = db.prepare('SELECT student_id FROM families WHERE id=?').get(req.user.id);
  const rows = db.prepare('SELECT * FROM reservations WHERE student_id=? ORDER BY reserve_date DESC, created_at DESC LIMIT ?').all(family.student_id, Number(limit));
  res.json({ success: true, data: rows });
});

router.post('/reservations', auth, familyAuth, (req, res) => {
  const { pickup_time, reserve_date, memo } = req.body;
  if (!pickup_time) return res.status(400).json({ success: false, message: '하원 시간을 선택해주세요.' });
  const family = db.prepare(`SELECT f.student_id, s.classroom_id, c.kindergarten_id FROM families f JOIN students s ON s.id=f.student_id JOIN classrooms c ON c.id=s.classroom_id WHERE f.id=?`).get(req.user.id);
  const date = reserve_date || new Date().toISOString().slice(0,10);
  const existing = db.prepare('SELECT id FROM reservations WHERE student_id=? AND reserve_date=?').get(family.student_id, date);
  if (existing) return res.status(400).json({ success: false, message: '이미 예약이 있습니다. 기존 예약을 취소 후 다시 예약해주세요.' });
  const result = db.prepare("INSERT INTO reservations (student_id,classroom_id,kindergarten_id,reserve_date,pickup_time,status,memo) VALUES (?,?,?,?,?,'pending',?)").run(family.student_id, family.classroom_id, family.kindergarten_id, date, pickup_time, memo||null);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/reservations/:id/cancel', auth, familyAuth, (req, res) => {
  const family = db.prepare('SELECT student_id FROM families WHERE id=?').get(req.user.id);
  const reservation = db.prepare('SELECT * FROM reservations WHERE id=? AND student_id=?').get(req.params.id, family.student_id);
  if (!reservation) return res.status(404).json({ success: false, message: '예약을 찾을 수 없습니다.' });
  if (reservation.status==='announced') return res.status(400).json({ success: false, message: '이미 방송된 예약은 취소할 수 없습니다.' });
  db.prepare("UPDATE reservations SET status='cancelled' WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
