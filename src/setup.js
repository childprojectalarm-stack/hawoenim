require('dotenv').config();
const fs     = require('fs');
const bcrypt = require('bcryptjs');
const db     = require('./config/db');

const dbPath  = process.env.DB_PATH || '/tmp/hawoenim.db';
const superPw = process.env.SUPER_PW || 'super1234';
const hash    = (pw) => bcrypt.hashSync(pw, 10);

console.log('\uD83D\uDE80 \uD558\uC6D0\uC54C\uB9BC v2 \uCD08\uAE30 \uC124\uC815 \uC2DC\uC791...');
console.log('DB \uACBD\uB85C:', dbPath);

// DB \uD30C\uC77C \uC874\uC7AC \uC5EC\uBD80 \uD655\uC778
const dbExists = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0;

if (dbExists) {
  // \uAE30\uC874 DB \uC720\uC9C0: \uC288\uD37C\uAD00\uB9AC\uC790 \uBE44\uBC88\uB9CC \uAC31\uC2E0
  const existing = db.prepare("SELECT id FROM users WHERE role='super'").get();
  if (existing) {
    db.prepare("UPDATE users SET password=? WHERE role='super'").run(hash(superPw));
    console.log('\u2705 \uAE30\uC874 DB \uAC10\uC9C0 - \uC288\uD37C\uAD00\uB9AC\uC790 \uBE44\uBC88 \uAC31\uC2E0\uB9CC \uC218\uD589');
  } else {
    db.prepare("INSERT INTO users (username,password,name,role) VALUES ('superadmin',?,'\uC288\uD37C\uAD00\uB9AC\uC790','super')").run(hash(superPw));
    console.log('\u2705 \uC288\uD37C\uAD00\uB9AC\uC790 \uC0DD\uC131: superadmin / ' + superPw);
  }
  console.log('\u2705 \uAE30\uC874 \uB370\uC774\uD130 \uBCF4\uC874 \uC644\uB8CC');
} else {
  // \uC2E0\uADDC DB: \uC288\uD37C\uAD00\uB9AC\uC790\uB9CC \uC0DD\uC131 (\uC720\uCE58\uC6D0/\uAD00\uB9AC\uC790\uB294 \uC288\uD37C\uAD00\uB9AC\uC790 \uD398\uC774\uC9C0\uC5D0\uC11C \uB4F1\uB85D)
  db.prepare("INSERT INTO users (username,password,name,role) VALUES ('superadmin',?,'\uC288\uD37C\uAD00\uB9AC\uC790','super')").run(hash(superPw));
  console.log('\u2705 \uC2E0\uADDC DB - \uC288\uD37C\uAD00\uB9AC\uC790 \uC0DD\uC131: superadmin / ' + superPw);
}

console.log('\n\u2728 \uC644\uB8CC!');
