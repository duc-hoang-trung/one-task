# Một Việc

Web app cá nhân chống trì hoãn: **một việc chính mỗi ngày, đóng ngày đúng giờ, quay lại khi trượt**.

Tài liệu: [01 · nghiên cứu](docs/01-research.md) · [02 · brainstorm](docs/02-brainstorm.md) · [03 · plan](docs/03-plan.md) · [parking lot của dự án](docs/parking-lot.md)

| Sáng (1 phút) | Trong ngày | Đóng ngày (3 phút) → Night mode |
|---|---|---|
| ![](docs/screenshots/03-morning.png) | ![](docs/screenshots/06-today-timer.png) | ![](docs/screenshots/10-night.png) |

## Vòng đời một ngày

1. **Sáng**: app hiện đúng 1 dòng *Next Action* và hỏi "hôm qua ngủ lúc mấy giờ". Hai nút: **Bắt đầu 10 phút** hoặc **Huỷ…**. Không list, không sửa kế hoạch.
2. **Trong ngày**: một việc chính, timer đếm ngược. Hết 10 phút app hỏi "thêm 15?" chứ không hỏi "xong chưa?". Tick đủ *Definition of Done* → đóng việc. Ý tưởng xen vào → gõ vào **Parking Lot**, Enter, quay lại. Không có nút Hoãn.
3. **Huỷ…**: hiện lại đúng câu *hậu quả* bạn tự viết, bắt đọc 5 giây, rồi chọn lý do. "Không muốn làm" chỉ có một nút: *Làm 10 phút rồi quyết*.
4. **Đóng ngày** (mặc định 21:00): 5 bước. Việc hôm nay xong chưa → *Next Action* cho mai (bắt buộc) → quét Parking Lot về 0 → 1 lo lắng + 1 bước tiếp theo → Đóng.
5. **Night mode**: khoá tới 04:00. Không tạo, không sửa, không xem list. Chỉ còn ô Parking Lot và câu "Đã có kế hoạch. Sáng mai lúc 07:30: …".
6. **Tuần**: tối đa 2 mục tiêu (nút Thêm biến mất khi đủ). Review: ngày có ≥10' việc chính, đóng ngày đúng giờ, ngủ so với mục tiêu, **số lần quay lại sau ngày trống** (không có streak), số lần dời việc.

Tạo việc bắt buộc 5 trường: **Việc** (động từ + đếm được; bộ lọc mơ hồ chặn "Học AWS", nhận "Làm 20 câu S3") · **DoD** (mỗi dòng 1 mục kiểm được) · **Hậu quả nếu không làm** · **Ước lượng** (≤ 90 phút, quá thì bắt tách) · **Next Action**.

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173/
npm test           # 47 test Vitest (logic + Dexie trên fake-indexeddb)
npm run build      # tsc + vite build + service worker
```

Test/demo bằng giờ giả lập (giữ trong tab cho tới khi `?reset-clock`):

```
http://localhost:5173/?d=2026-09-08&t=07:30   # sáng
http://localhost:5173/?d=2026-09-08&t=21:05   # đến giờ đóng ngày
http://localhost:5173/?d=2026-09-09&t=00:30   # vẫn là đêm hôm trước (ngày logic đổi lúc 04:00)
```

Playwright walkthrough (đi hết 2 ngày, chụp màn hình vào `e2e/shots/`):

```bash
npm i -D playwright && npx playwright install chromium
npm run build && npm run preview &   # cổng 4173
node e2e/walkthrough.mjs
```

## Deploy

GitHub Actions build + deploy lên GitHub Pages khi push `main` (`.github/workflows/deploy.yml`). Cần bật một lần: **Settings → Pages → Source: GitHub Actions**. Base path lấy theo tên repo, URL: `https://<user>.github.io/<repo>/`. Deploy nơi khác thì đặt `VITE_BASE`.

Cài lên điện thoại: mở URL → "Thêm vào màn hình chính" (PWA, chạy offline).

## Stack

Vite 8 · React 19 · TypeScript · Tailwind 4 · Dexie 4 (IndexedDB, local-first, không backend, không tài khoản) · vite-plugin-pwa · Vitest · Playwright (e2e thủ công).

```
src/
  lib/        dates, clock (giờ giả lập), phase (morning/day/night), vagueness (bộ lọc mơ hồ),
              metrics (review tuần), db (Dexie schema), actions (mọi thao tác ghi) + *.test.ts
  components/ ui, TaskForm, CancelFlow, FocusTimer, ParkingLot
  screens/    Morning, Today, Shutdown, Night, Week, Settings
  App.tsx     state machine theo ngày logic + nav
```

## Nguyên tắc sản phẩm

1. Một màn hình, một việc, một nút.
2. Kế hoạch ra buổi tối, sáng chỉ thực thi. Sáng không đàm phán.
3. Khoá thay cho nhắc.
4. Ma sát đúng chỗ: dễ khi bắt đầu, khó khi trốn, không thể sau khi đóng ngày.
5. Đo lần quay lại, không đo chuỗi.
6. Nếu một tính năng làm bạn mở app lâu hơn, nó sai.
