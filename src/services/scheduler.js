const cron = require('node-cron');
const db   = require('../config/db');

/**
 * 매 분마다 실행 — 방송 예정 시간이 된 예약을 처리
 */
function startScheduler() {
  cron.schedule('* * * * *', () => {
    const now    = new Date();
    const today  = now.toISOString().slice(0, 10);
    const hhmm   = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // 오늘 예약 중 status=pending 이고 (pickup_time - notice_minutes) == 현재시각인 것 조회
    const rows = db.prepare(`
      SELECT
        r.id              AS res_id,
        r.pickup_time,
        s.name            AS student_name,
        c.name            AS classroom_name,
        c.emoji           AS classroom_emoji,
        COALESCE(bs_cls.notice_minutes, bs_kg.notice_minutes, 10) AS notice_minutes,
        COALESCE(bs_cls.default_ment,   bs_kg.default_ment,
                 '{반} {이름} 학부모님, 하원 준비해 주세요')       AS ment_template
      FROM reservations r
      JOIN students  s ON s.id = r.student_id
      JOIN classrooms c ON c.id = s.classroom_id
      LEFT JOIN broadcast_settings bs_cls ON bs_cls.classroom_id  = c.id
      LEFT JOIN broadcast_settings bs_kg  ON bs_kg.kindergarten_id = c.kindergarten_id
                                         AND bs_kg.classroom_id IS NULL
      WHERE r.reserve_date = ? AND r.status = 'pending'
    `).all(today);

    for (const row of rows) {
      // 방송 시각 계산: pickup_time - notice_minutes
      const [ph, pm] = row.pickup_time.split(':').map(Number);
      const pickupTotal  = ph * 60 + pm;
      const broadcastMin = pickupTotal - row.notice_minutes;
      const bh = String(Math.floor(broadcastMin / 60)).padStart(2, '0');
      const bm = String(broadcastMin % 60).padStart(2, '0');
      const broadcastTime = `${bh}:${bm}`;

      if (broadcastTime === hhmm) {
        const ment = row.ment_template
          .replace(/\{이름\}/g, row.student_name)
          .replace(/\{반\}/g,   row.classroom_emoji + ' ' + row.classroom_name);

        console.log(`[방송] ${new Date().toLocaleTimeString()} | ${ment}`);

        // 실제 TTS/방송 시스템 연동 → 여기서 HTTP 호출
        // await callBroadcastSystem({ classroomId: ..., ment });

        // 예약 상태 업데이트
        db.prepare(`
          UPDATE reservations SET status='announced', announced_at=datetime('now','localtime')
          WHERE id=?
        `).run(row.res_id);

        // 로그 기록
        db.prepare(`
          INSERT INTO broadcast_logs (reservation_id, student_name, classroom_name, ment, type)
          VALUES (?, ?, ?, ?, 'auto')
        `).run(row.res_id, row.student_name, row.classroom_name, ment);
      }
    }
  });

  console.log('✅ 방송 스케줄러 시작 (매 분 실행)');
}

module.exports = { startScheduler };
