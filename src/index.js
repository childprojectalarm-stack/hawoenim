require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');
const path     = require('path');

const authRouter  = require('./routes/auth');
const superRouter = require('./routes/super');
const kgRouter    = require('./routes/kg');
const familyRouter = require('./routes/family');
const { startScheduler } = require('./services/scheduler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 30,
  message: { success: false, message: 'ìì²­ì´ ëë¬´ ë§ìµëë¤. ì ì í ë¤ì ìëí´ì£¼ì¸ì.' }
});

// ââ API ë¼ì°í¸ ââ
app.use('/api/auth',  loginLimiter, authRouter);
app.use('/api/super', superRouter);
app.use('/api/kg',    kgRouter);
app.use('/api/family', familyRouter);
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toLocaleString('ko-KR') }));

// ââ ì ì  íì¼ ââ
const pub = path.join(__dirname, '../public');

// ìí¼ê´ë¦¬ì íì´ì§
app.use('/super', express.static(path.join(pub, 'super')));
app.get('/super', (req, res) => res.sendFile(path.join(pub, 'super/index.html')));
app.get('/super/*', (req, res) => res.sendFile(path.join(pub, 'super/index.html')));

// ì ì¹ì ê´ë¦¬ì íì´ì§ (ê¸°ë³¸ ë£¨í¸)
app.use('/', express.static(path.join(pub, 'kg')));
app.get('/', (req, res) => res.sendFile(path.join(pub, 'kg/index.html')));
app.get('/dashboard*', (req, res) => res.sendFile(path.join(pub, 'kg/index.html')));

// ì ì­ ìë¬ í¸ë¤ë¬
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'ìë² ì¤ë¥ê° ë°ìíìµëë¤.' });
});

app.listen(PORT, () => {
  console.log(`\nð« íììë¦¼ v2 ìë² ìì`);
  console.log(`   ìí¼ê´ë¦¬ì: http://localhost:${PORT}/super`);
  console.log(`   ì ì¹ìê´ë¦¬: http://localhost:${PORT}/`);
  console.log(`   DB        : ${process.env.DB_PATH || './data/hawoenim.db'}\n`);
  startScheduler();
});

module.exports = app;
