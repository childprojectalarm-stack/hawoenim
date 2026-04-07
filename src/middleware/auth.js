const jwt = require('jsonwebtoken');

// 기본 인증
function auth(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ success: false, message: '토큰이 만료되었거나 유효하지 않습니다.' });
  }
}

// 슈퍼관리자 전용
function superOnly(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'super')
      return res.status(403).json({ success: false, message: '슈퍼관리자 권한이 필요합니다.' });
    next();
  });
}

// 유치원 관리자 이상 (super도 통과)
function kgAdmin(req, res, next) {
  auth(req, res, () => {
    if (!['super', 'kg_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    next();
  });
}

// 유치원 데이터 접근 시 kindergarten_id 소유권 검사
// super는 모든 유치원, kg_admin은 자신의 유치원만
function ownKg(req, res, next) {
  kgAdmin(req, res, () => {
    const kgId = parseInt(req.params.kgId || req.body.kindergarten_id || req.query.kgId);
    if (req.user.role === 'super') return next();
    if (req.user.kindergarten_id !== kgId)
      return res.status(403).json({ success: false, message: '해당 유치원에 대한 권한이 없습니다.' });
    next();
  });
}

module.exports = { auth, superOnly, kgAdmin, ownKg };
