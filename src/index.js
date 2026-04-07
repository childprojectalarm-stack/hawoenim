require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');
const path     = require('path');

const authRouter  = require('./routes/auth');
const superRouter = require('./routes/super');
const kgRouter    = require('./routes/kg');
const { startScheduler } = require('./services/scheduler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 30,
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }
});

// ── API 라우트 ──
app.use('/api/auth',  loginLimiter, authRouter);
app.use('/api/super', superRouter);
app.use('/api/kg',    kgRouter);
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toLocaleString('ko-KR') }));

// ── 정적 파일 ──
const pub = path.join(__dirname, '../public');

// 슈퍼관리자 페이지
app.use('/super', express.static(path.join(pub, 'super')));
app.get('/super', (req, res) => res.sendFile(path.join(pub, 'super/index.html')));
app.get('/super/*', (req, res) => res.sendFile(path.join(pub, 'super/index.html')));

// 유치원 관리자 페이지 (기본 루트)
app.use('/', express.static(path.join(pub, 'kg')));
app.get('/', (req, res) => res.sendFile(path.join(pub, 'kg/index.html')));
app.get('/dashboard*', (req, res) => res.sendFile(path.join(pub, 'kg/index.html')));

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`\n🏫 하원알림 v2 서버 시작`);
  console.log(`   슈퍼관리자: http://localhost:${PORT}/super`);
  console.log(`   유치원관리: http://localhost:${PORT}/`);
  console.log(`   DB        : ${process.env.DB_PATH || './data/hawoenim.db'}\n`);
  startScheduler();
});

module.exports = app;
