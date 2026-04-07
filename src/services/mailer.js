const nodemailer = require('nodemailer');
require('dotenv').config();

// 트랜스포터 생성
const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * 임시 비밀번호 이메일 발송
 */
async function sendTempPassword(toEmail, adminId, tempPw) {
  const html = `
    <div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e9f3;">
      <div style="background:linear-gradient(135deg,#2D3A8C,#4A5AB8);padding:32px 28px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🏫</div>
        <h1 style="color:#fff;font-size:20px;margin:0;">하원알림 임시 비밀번호</h1>
      </div>
      <div style="padding:28px;">
        <p style="color:#374151;font-size:14px;line-height:1.8;">
          안녕하세요, <strong>${adminId}</strong> 관리자님.<br>
          요청하신 임시 비밀번호가 발급되었습니다.
        </p>
        <div style="background:#f8f7ff;border:2px dashed #4F8EF7;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
          <p style="color:#6B7280;font-size:12px;margin:0 0 8px;">임시 비밀번호</p>
          <p style="font-family:monospace;font-size:26px;font-weight:700;color:#4F8EF7;letter-spacing:3px;margin:0;">${tempPw}</p>
        </div>
        <div style="background:#FEF3C7;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <p style="color:#92400E;font-size:13px;margin:0;">
            ⚠️ 보안을 위해 로그인 후 즉시 비밀번호를 변경해 주세요.<br>
            임시 비밀번호는 24시간 후 만료됩니다.
          </p>
        </div>
        <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
          본 메일은 하원알림 시스템에서 자동 발송되었습니다.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM || '"하원알림" <noreply@hawoenim.com>',
    to:      toEmail,
    subject: '[하원알림] 임시 비밀번호가 발급되었습니다',
    html,
  });
}

/**
 * 하원 예약 알림 (부모에게)
 */
async function sendReservationNotice({ toEmail, parentName, childName, classroomName, pickupTime, noticeMinutes }) {
  const html = `
    <div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e9f3;">
      <div style="background:linear-gradient(135deg,#FF6B35,#4A5AB8);padding:28px;text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">📅</div>
        <h1 style="color:#fff;font-size:18px;margin:0;">하원 예약 확인</h1>
      </div>
      <div style="padding:24px;">
        <p style="color:#374151;font-size:14px;">${parentName}님, 하원 예약이 완료되었습니다.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6B7280;">원아</td><td style="font-weight:600;color:#111;">${childName}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;">교실</td><td style="font-weight:600;color:#111;">${classroomName}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;">하원 시간</td><td style="font-weight:600;color:#FF6B35;font-size:16px;">${pickupTime}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;">방송 예정</td><td style="color:#111;">${pickupTime} ${noticeMinutes}분 전</td></tr>
        </table>
      </div>
    </div>
  `;
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      toEmail,
    subject: `[하원알림] ${childName} 하원 예약 완료`,
    html,
  });
}

module.exports = { sendTempPassword, sendReservationNotice };
