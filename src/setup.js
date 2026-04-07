require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./config/db');

console.log('🚀 하원알림 v2 초기 설정 시작...');

const superPw = process.env.SUPER_PW || 'super1234';
const superHashed = bcrypt.hashSync(superPw, 10);

// 슈퍼관리자가 있으면 비밀번호 강제 업데이트, 없으면 생성
const existing = db.prepare("SELECT id FROM users WHERE role='super'").get();
if (!existing) {
  db.prepare("INSERT INTO users (username,password,name,role) VALUES ('superadmin',?,'슈퍼관리자','super')").run(superHashed);
  console.log('✅ 슈퍼관리자 생성: superadmin / ' + superPw);
} else {
  db.prepare("UPDATE users SET password=? WHERE role='super'").run(superHashed);
  console.log('✅ 슈퍼관리자 비밀번호 갱신: superadmin / ' + superPw);
}

console.log('\n✨ 완료!');
