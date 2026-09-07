# 03 · Plan phát triển web app "Một Việc"

> Plan này tự áp dụng chính các rule của app: mỗi milestone là **1 việc chính**, có **Definition of Done** kiểm được,
> ước lượng nhỏ, và có **Next Action** cho buổi làm việc đầu tiên. Không mở milestone mới khi milestone cũ chưa đóng.

## 0. Phạm vi MVP (4 tuần, dùng cho 1 người: bạn)

MVP phải trả lời được một câu hỏi duy nhất sau 4 tuần:
**"Số ngày có ≥ 10 phút làm việc chính và số đêm đóng ngày đúng giờ có tăng so với tuần 0 không?"**

Vì vậy tuần 0 (trước khi code) bạn ghi tay 7 ngày baseline: ngày nào làm ≥10 phút việc chính, giờ đi ngủ thực.

## 1. Vòng đời một ngày trong app

```
21:00 Shutdown (3 phút)         07:30 Morning (1 phút)          Trong ngày
─────────────────────────       ─────────────────────────       ─────────────────────────
□ Việc chính hôm nay xong?      Hiện đúng 1 dòng Next Action    Màn hình 1 việc + timer
□ Viết Next Action cho mai      [ Bắt đầu 10 phút ]             Parking Lot 1 phím
□ Quét Parking Lot              [ Huỷ… ] (→ consequence card)   Hết 10' → "thêm 15?"
□ 1 lo lắng + 1 bước tiếp       Hỏi: "Hôm qua ngủ lúc?"         Tick DoD → Done
[ Đóng ngày ] → Night mode khoá
```

## 2. Mô hình dữ liệu (local-first, IndexedDB)

```ts
type WeekGoal = { id; weekStart: ISODate; title; status: 'open'|'done'|'dropped'; createdAt }

type Task = {
  id; goalId?: string
  title: string                 // động từ + đơn vị đếm được, đã qua bộ lọc mơ hồ
  dod: { text: string; done: boolean }[]   // ≥ 1 mục
  consequence: string           // 1 câu tự viết, hiện lại khi Huỷ
  estimateMin: number           // ≤ 90
  nextAction: string            // câu lệnh cụ thể cho lần mở tiếp theo
  scheduledFor: ISODate         // ngày là "việc chính"
  status: 'planned'|'active'|'done'|'dropped'
  deferrals: { at; reason: 'new-info'|'urgent'|'dont-want'; note? }[]
}

type Session = { id; taskId; startedAt; endedAt?; minutes }        // mỗi lần bấm Bắt đầu
type ParkingItem = { id; text; createdAt; resolvedAt?; resolution?: 'drop'|'later'|'tomorrow' }
type DayLog = {
  date: ISODate
  shutdownAt?: ISOTime          // giờ ấn "Đóng ngày"
  worry?: { concern: string; nextStep: string }
  bedtimeActual?: ISOTime       // nhập sáng hôm sau
  locked: boolean               // Night mode
}
type Settings = { shutdownTime: '21:00'; bedtimeTarget: '23:00'; morningTime: '07:30'; minFocusMin: 10 }
```

Chỉ số dẫn xuất (tính lúc weekly review, không lưu):
- `daysWithFocus` = số ngày có Session ≥ minFocusMin
- `shutdownOnTime` = số ngày shutdownAt ≤ shutdownTime + 30'
- `bedtimeDelta` = trung bình (bedtimeActual − bedtimeTarget)
- `returns` = số ngày có Session sau ≥ 1 ngày không có Session
- `deferralsByReason`

## 3. Tech stack

| Lớp | Chọn | Lý do |
|---|---|---|
| UI | Vite + React 19 + TypeScript | Bạn đã có sẵn trong repo (problem2), không học thêm. |
| State / storage | Dexie (IndexedDB) + `dexie-react-hooks` | Local-first, offline, không cần backend, không cần login. |
| Style | Tailwind CSS | Nhanh, một màn hình chính nên không cần design system lớn. |
| Routing | Không dùng router. State machine theo giờ: `morning` → `day` → `shutdown` → `night` | App chỉ có 1 màn hình tại một thời điểm; router chỉ thêm chỗ để lạc. |
| PWA | `vite-plugin-pwa` | Cài lên điện thoại, mở như app, cho notification sau. |
| Test | Vitest cho logic thuần (bộ lọc mơ hồ, tính chỉ số, state machine) | UI test để sau. |
| Deploy | GitHub Pages qua GitHub Actions | Miễn phí, có URL để mở trên điện thoại từ ngày 1. |
| Sau MVP | Supabase (sync), Web Push, Claude API (concretizer) | Chỉ khi 4 tuần MVP chứng minh có dùng. |

## 4. Reset repo

Repo hiện tại là bài code challenge cũ (`src/problem1..3`). Theo yêu cầu của bạn, sẽ xoá và làm lại:

1. Giữ lại `docs/` (3 file này).
2. Xoá `src/`, `README.md` cũ; scaffold lại bằng `npm create vite@latest . -- --template react-ts`.
3. README mới: mục tiêu app, 6 nguyên tắc sản phẩm, link tới `docs/`.

Việc này thuộc M0 bên dưới, chưa thực hiện trong bước nghiên cứu này.

## 5. Milestones

Mỗi milestone: 1 việc chính · DoD · ước lượng · Next Action. Không mở M(n+1) khi M(n) chưa đóng.

### M0 · Repo sạch + deploy rỗng (1 buổi tối, ~90 phút)
- **Việc:** Xoá code cũ, scaffold Vite React TS + Tailwind + Dexie + PWA, CI deploy GitHub Pages.
- **DoD:** □ URL GitHub Pages mở được trên điện thoại · □ hiện chữ "Một Việc" · □ `npm test` chạy (0 test) · □ README mới.
- **Next Action:** `git rm -r src README.md && npm create vite@latest . -- --template react-ts`

### M1 · Màn hình Today: 1 việc + 10 phút + Parking Lot (tuần 1, ~3 buổi × 60')
- **Việc:** Người dùng thấy đúng 1 task, bấm Bắt đầu 10 phút, timer chạy, hết giờ hỏi "thêm 15?", tick DoD để Done. Parking Lot gõ + Enter.
- **Chưa làm:** form tạo task đầy đủ (tạm hard-code hoặc form 1 dòng), shutdown, morning.
- **DoD:** □ Không có cách nào hiện >1 task trên màn hình · □ Không có nút Hoãn · □ Session được lưu vào IndexedDB · □ Reload không mất dữ liệu · □ Bạn dùng thật 5/7 ngày.
- **Next Action:** tạo `src/db.ts` với schema Dexie ở mục 2.

### M2 · Tạo việc đúng + Huỷ có ma sát (tuần 2, ~3 buổi × 60')
- **Việc:** Form 4 trường (Việc / DoD / Hậu quả / Ước lượng) + bộ lọc mơ hồ rule-based + flow Huỷ với consequence card + 3 lý do.
- **DoD:** □ Nhập "Học AWS" bị từ chối kèm gợi ý · □ Nhập "Làm 20 câu S3" được nhận · □ Ước lượng >90 bắt tách · □ Bấm Huỷ phải đọc hậu quả 5s mới hiện lý do · □ Chọn "không muốn làm" chỉ có nút "Làm 10 phút rồi quyết" · □ Unit test bộ lọc mơ hồ ≥ 10 case.
- **Next Action:** viết `src/lib/vagueness.ts` + test trước, UI sau.

### M3 · Shutdown ritual + Night mode + Morning (tuần 3, ~3 buổi × 60')
- **Việc:** State machine theo giờ. 21:00 hiện Shutdown 5 bước; ấn "Đóng ngày" → Night mode chỉ còn Parking Lot; sáng hiện 1 dòng Next Action + hỏi giờ ngủ hôm qua.
- **DoD:** □ Sau Đóng ngày không thể tạo/sửa task bằng bất kỳ cách nào trên UI · □ Next Action bắt buộc nhập mới cho Đóng ngày · □ Parking Lot phải về 0 (mỗi item: xoá / để tuần / lên mai) mới cho Đóng ngày · □ Sáng không thấy list · □ Bạn đóng ngày ≥ 5/7 đêm.
- **Next Action:** viết `src/lib/phase.ts` (tính phase từ giờ + DayLog) + test.

### M4 · Tuần: 2 mục tiêu + Weekly review (tuần 4, ~2 buổi × 60')
- **Việc:** Màn hình tuần chỉ có 2 slot mục tiêu; task phải gắn vào 1 slot; chủ nhật hiện review 5 chỉ số + chọn mục tiêu tuần tới.
- **DoD:** □ Không thể có mục tiêu thứ 3 · □ Review hiện đủ 5 chỉ số ở mục 2 · □ Không có streak ở bất kỳ đâu · □ Màn hình sau ngày trống hiện đúng câu "Hôm qua trống. Bình thường…".
- **Next Action:** viết `src/lib/metrics.ts` + test với dữ liệu giả 2 tuần.

### Cột mốc đánh giá (cuối tuần 4)
So với baseline tuần 0:
- `daysWithFocus` tăng? · `shutdownOnTime` ≥ 4/7? · `bedtimeDelta` giảm? · `returns` > 0 (nghĩa là có trượt và có quay lại)?
- Nếu 2/4 chỉ số cải thiện → tiếp M5+. Nếu không → sửa **quy trình** trước, không thêm tính năng.

### M5+ (chỉ khi MVP chứng minh có dùng)
Push notification giờ Shutdown · AI concretizer · Sync Supabase · Body-doubling link · Import lịch.

## 6. Rủi ro và cách né

| Rủi ro | Né bằng |
|---|---|
| Xây app thành việc để trốn việc thật | App này chính là "việc chính" của tuần 1–4, tối đa 1 buổi/ngày, có DoD. Hết giờ thì dừng. |
| Mở rộng tính năng vô hạn | Mọi ý tưởng mới → `docs/parking-lot.md`, chỉ xét ở cuối M4. |
| Bỏ dùng app sau vài ngày | M1 xong là dùng ngay; app không đòi hỏi setup; sáng 1 phút, tối 3 phút. |
| Lười viết hậu quả / DoD → task mơ hồ lọt lưới | Bộ lọc chặn cứng; nhưng chỉ chặn 5 mẫu mơ hồ phổ biến để không gây bực. |
| Night mode gây bực khi thật sự cần ghi | Parking Lot luôn mở, kể cả night mode. Chỉ không cho "lập kế hoạch". |

## 7. Việc cần bạn quyết (không chặn M0)

1. Giờ Shutdown và giờ ngủ mục tiêu mặc định (plan tạm: 21:00 / 23:00).
2. Ngôn ngữ UI: tiếng Việt hay Anh (plan tạm: Việt, vì viết hậu quả bằng tiếng mẹ đẻ chạm hơn).
3. Có muốn dùng trên điện thoại từ ngày 1 không (nếu có, M0 ưu tiên PWA + Pages; nếu không, bỏ PWA khỏi M0).
