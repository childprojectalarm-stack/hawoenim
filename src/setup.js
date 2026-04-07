require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./config/db');

console.log('🚀 하원알림 v2 초기 설정 시작...');

const superPw = process.env.SUPER_PW || 'super1234';
const superHashed = bcrypt.hashSync(superPw, 10);

const existing = db.prepare("SELECT id FROM users WHERE role='super'").get();
if (!existing) {
  db.prepare("INSERT INTO users (username,password,name,role) VALUES ('superadmin',?,'슈퍼관리자','super')").run(superHashed);
  console.log(`✅ 슈퍼관리자 생성: superadmin / ${superPw}`);
} else {
  console.log('ℹ️  슈퍼관리자 이미 존재');
}

// 샘플 데이터 (--sample 플래그)
if (process.argv.includes('--sample')) {
  const kg1 = db.prepare('INSERT INTO kindergartens (name,director,phone,address) VALUES (?,?,?,?)').run('햇살 유치원','김영희 원장','051-123-4567','부산시 해운대구 햇살로 123');
  const kg2 = db.prepare('INSERT INTO kindergartens (name,director,phone,address) VALUES (?,?,?,?)').run('별빛 유치원','이미래 원장','051-987-6543','부산시 수영구 별빛로 456');
  console.log(`🏫 샘플 유치원 2개 생성`);

  const pw1234 = bcrypt.hashSync('1234', 10);
  db.prepare("INSERT INTO users (username,password,name,email,role,kindergarten_id) VALUES (?,?,?,?,'kg_admin',?)").run('햇살admin',pw1234,'박지현','haetsal@test.com',kg1.lastInsertRowid);
  db.prepare("INSERT INTO users (username,password,name,email,role,kindergarten_id) VALUES (?,?,?,?,'kg_admin',?)").run('별빛admin',pw1234,'이수진','byulbit@test.com',kg2.lastInsertRowid);
  console.log(`👤 샘플 관리자 2명 생성 (비밀번호: 1234)`);

  const c1 = db.prepare('INSERT INTO classrooms (kindergarten_id,name,emoji,teacher) VALUES (?,?,?,?)').run(kg1.lastInsertRowid,'해바라기반','🌻','박지현');
  db.prepare('INSERT INTO classrooms (kindergarten_id,name,emoji,teacher) VALUES (?,?,?,?)').run(kg1.lastInsertRowid,'무지개반','🌈','이미래');
  db.prepare('INSERT INTO classrooms (kindergarten_id,name,emoji,teacher) VALUES (?,?,?,?)').run(kg2.lastInsertRowid,'별빛반','⭐','최수진');
  console.log(`🏠 샘플 반 3개 생성`);
  db.prepare('INSERT INTO students (classroom_id,name,age,emoji) VALUES (?,?,?,?)').run(c1.lastInsertRowid,'김민준','만 5세','👦');
  db.prepare('INSERT INTO students (classroom_id,name,age,emoji) VALUES (?,?,?,?)').run(c1.lastInsertRowid,'박하준','만 4세','🧒');
  console.log(`🧒 샘플 원생 2명 생성`);
}

console.log('\n✨ 완료!');
console.log('   슈퍼관리자: http://localhost:3000/super');
console.log('   유치원관리: http://localhost:3000/');
