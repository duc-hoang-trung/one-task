/**
 * Bộ lọc mơ hồ (rule-based).
 * Mục tiêu: chặn 5–10 mẫu mơ hồ phổ biến nhất, không cố bắt hết để không gây bực.
 *
 *  ❌ "Học AWS"            → động từ mơ hồ, không có số đếm
 *  ✅ "Làm 20 câu S3"      → có số đếm
 *  ✅ "Gửi email cho anh A" → động từ có điểm kết thúc rõ
 */

export type VaguenessResult =
  | { ok: true }
  | { ok: false; reason: string; hint: string }

// Động từ mở đầu mơ hồ: làm bao nhiêu thì xong? Không biết.
const VAGUE_STARTS = [
  'học', 'nghiên cứu', 'tìm hiểu', 'xem', 'xem lại', 'ôn', 'ôn lại', 'đọc về', 'làm về',
  'suy nghĩ', 'nghĩ về', 'chuẩn bị', 'cải thiện', 'tập trung', 'cố gắng', 'bắt đầu',
  'tiếp tục', 'lo', 'làm việc', 'làm quen', 'nâng cao', 'luyện', 'thử',
  'learn', 'study', 'research', 'look into', 'look at', 'think about', 'work on',
  'improve', 'prepare', 'continue', 'start', 'explore', 'get better at', 'practice', 'try',
]

// Động từ có điểm kết thúc rõ ràng: làm xong là biết.
const DONE_VERBS = [
  'gửi', 'nộp', 'trả lời', 'gọi', 'đặt', 'book', 'đăng', 'xoá', 'xóa', 'sửa', 'fix', 'merge',
  'push', 'commit', 'deploy', 'publish', 'release', 'hoàn thành', 'viết xong', 'nộp xong',
  'thanh toán', 'chuyển khoản', 'đăng ký', 'huỷ', 'hủy', 'in', 'ký', 'cài', 'setup', 'cấu hình',
  'send', 'submit', 'reply', 'call', 'email', 'pay', 'register', 'sign', 'install', 'ship',
  'delete', 'rename', 'schedule', 'cancel', 'apply', 'upload', 'download', 'print', 'file',
]

// Số đếm = số đứng riêng VÀ có từ đi sau ("20 câu"), để "React 19" hay "S3" không tính.
const HAS_COUNT = /(?:^|\s)\d+(?:[.,]\d+)?\s+[^\d\s]/
const COUNT_WORDS = /\b(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|one|two|three|four|five|six|seven|eight|nine|ten)\b/i

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function checkTitle(raw: string): VaguenessResult {
  const t = normalize(raw)
  if (t.length < 4) {
    return { ok: false, reason: 'Quá ngắn.', hint: 'Viết động từ + số đếm được. Ví dụ: "Làm 20 câu S3".' }
  }
  const vagueStart = VAGUE_STARTS.find((v) => t === v || t.startsWith(v + ' '))
  const hasCount = HAS_COUNT.test(t) || COUNT_WORDS.test(t)
  const hasDoneVerb = DONE_VERBS.some((v) => t === v || t.startsWith(v + ' ') || t.includes(' ' + v + ' '))

  if (vagueStart && !hasCount) {
    return {
      ok: false,
      reason: `"${vagueStart}" không cho biết khi nào thì xong.`,
      hint: 'Đổi thành thứ đếm được: "Làm 20 câu S3", "Đọc 10 trang chương 3", "Viết 300 chữ phần mở bài".',
    }
  }
  if (!hasCount && !hasDoneVerb) {
    return {
      ok: false,
      reason: 'Không thấy số đếm được hay kết quả rõ.',
      hint: 'Thêm số ("3 bug", "10 trang") hoặc động từ có điểm kết thúc ("Gửi…", "Nộp…", "Deploy…").',
    }
  }
  return { ok: true }
}

export const MAX_ESTIMATE_MIN = 90

export function checkEstimate(min: number): VaguenessResult {
  if (!Number.isFinite(min) || min <= 0) {
    return { ok: false, reason: 'Cần ước lượng phút.', hint: 'Đoán thô cũng được: 25, 45, 60.' }
  }
  if (min > MAX_ESTIMATE_MIN) {
    return {
      ok: false,
      reason: `${min} phút là quá lớn cho một việc ngày.`,
      hint: `Tách thành phần đầu ≤ ${MAX_ESTIMATE_MIN} phút. Phần còn lại ghi vào Parking Lot.`,
    }
  }
  return { ok: true }
}
