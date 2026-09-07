# 02 · Brainstorm giải pháp

> Nguyên tắc brainstorm: mỗi ý tưởng phải trỏ về **một cơ chế** trong `01-research.md`.
> Ý tưởng không trỏ về cơ chế nào → loại, dù có hay đến đâu.

## 1. Vì sao app sẵn có không giải quyết được

| App | Mạnh | Vì sao không đủ cho bài toán này |
|---|---|---|
| Todoist / TickTick / Notion | Ghi và tổ chức mọi thứ | **Khuyến khích mở thêm** việc. Không có WIP limit, không có DoD, không có khoá ban đêm. |
| Sunsama | Lập kế hoạch ngày có chừng mực, cảnh báo quá tải | Vẫn là planner: tối ưu cho "xếp lịch", không tối ưu cho "khởi động 10 phút" và không đụng đến giấc ngủ. Trả phí. |
| Forest / Pomodoro apps | Timer tập trung | Giả định bạn **đã bắt đầu**. Vấn đề của bạn nằm trước lúc đó. |
| Focusmate | Áp lực xã hội để bắt đầu | Rất tốt cho khởi động, nhưng phụ thuộc người khác; không quản lý "việc gì" và "khi nào đóng". |
| Habit tracker (Streaks, Habitica) | Chuỗi ngày | Streak vỡ → tự trách → trì hoãn nặng hơn (mục 2.7). Phản tác dụng. |

Khoảng trống: một app **ép ít việc hơn**, **ép cụ thể hơn**, **ép đóng ngày đúng giờ**, và **tha thứ khi trượt**.
Không app nào làm cả 4 vì chúng đi ngược tăng trưởng (người dùng thích ghi nhiều, thích streak).
Bạn xây cho chính bạn nên không có mâu thuẫn này.

## 2. Ý tưởng theo từng mắt xích của vòng lặp

### A. Khoảnh khắc khởi động (chống trì hoãn)
1. **Màn hình Today chỉ có 1 việc.** Không list. Không có chỗ để "chọn việc khác dễ hơn". (WIP=1)
2. **Nút to duy nhất: "Bắt đầu 10 phút".** Không có nút "Hoãn". Muốn không làm → phải qua flow Huỷ (mục C).
3. **Hiện Next Action, không hiện task.** Ví dụ hiện "Mở file s3-quiz.md, làm câu 1–5" thay vì "Làm 20 câu S3". Giảm ma sát mở đầu tới mức thấp nhất.
4. **Timer 10 phút đếm xuống; hết 10 phút hỏi "thêm 15?"** (không hỏi "xong chưa"). Khai thác việc đã vào guồng.
5. **Parking Lot 1 phím.** Đang làm, ý tưởng khác nảy ra → gõ, Enter, quay lại. Không rời màn hình. (attention residue)
6. **Chặn tạo task mới trong giờ làm việc.** Muốn thêm → vào Parking Lot; xử lý lúc Shutdown.

### B. Tạo việc (chống mơ hồ)
7. **Bộ lọc mơ hồ.** Task chứa động từ mơ hồ ("học", "nghiên cứu", "xem", "tìm hiểu", "làm về") hoặc không có số đếm → app từ chối, gợi ý viết lại. Có thể là rule-based trước, AI sau.
8. **Form tạo task bắt buộc 4 trường:** Việc (động từ + đơn vị đếm được) · DoD (checklist ≥ 1 mục kiểm được) · Hậu quả nếu không làm (1 câu, tự viết) · Ước lượng phút.
9. **Ước lượng > 90 phút → bắt tách.** Task ngày phải làm xong trong ngày.
10. **Mỗi tuần tối đa 2 mục tiêu.** Nút "Thêm mục tiêu" biến mất khi đã có 2. Muốn thêm → phải đóng hoặc bỏ một cái.

### C. Chống "sáng dậy thấy không quan trọng"
11. **Consequence card.** Khi ấn Huỷ / Dời, app hiện lại **đúng câu hậu quả bạn tự viết** tối hôm trước + ngày viết. Phải đọc 5 giây mới hiện nút tiếp.
12. **Huỷ có ma sát vừa phải.** Chọn lý do: (a) thông tin mới làm việc này thật sự không cần (b) có việc khẩn hơn hôm nay (c) không muốn làm. Nếu chọn (c) → gợi ý duy nhất: "Làm 10 phút rồi quyết". Không xấu hổ, không trừng phạt, chỉ ghi lại.
13. **Nhật ký dời việc.** Tuần review hiện: việc này đã bị dời N lần với lý do gì. Pattern lộ ra thì tự sửa.
14. **Không cho sửa Next Action buổi sáng.** Sáng chỉ có Bắt đầu hoặc Huỷ. Sửa kế hoạch là việc của buổi tối.

### D. Đóng ngày và bảo vệ giấc ngủ
15. **Shutdown ritual 3 phút, có giờ cố định** (ví dụ 21:00, cách giờ ngủ ≥ 2 tiếng). App nhắc một lần. Các bước: (1) đánh dấu việc chính xong/chưa (2) viết Next Action cho mai (3) quét Parking Lot: xoá / để tuần sau / lên mai (4) 1 dòng lo lắng + 1 dòng bước tiếp theo (constructive worry) (5) ấn "Đóng ngày".
16. **Night mode khoá.** Sau "Đóng ngày": không tạo task, không sửa kế hoạch, không xem list. Chỉ còn ô Parking Lot (để trút ý nghĩ) và câu: "Đã có kế hoạch cho việc này. Ngày mai lúc HH:MM." Đây là điểm khác biệt lớn nhất so với mọi app.
17. **Giờ ngủ mục tiêu + ghi giờ ngủ thực.** Sáng hỏi 1 câu: "Hôm qua ngủ lúc mấy giờ?" Không phán xét, chỉ vẽ đồ thị bedtime vs plan.
18. **Buổi sáng chỉ hiện 1 câu Next Action.** Không có "tổng quan tuần", không có 15 việc, không có thông báo dồn.

### E. Quay lại sau khi trượt (self-forgiveness)
19. **Không streak.** Chỉ số chính là **"lần quay lại"**: số ngày bạn đã bỏ ≥ 1 ngày rồi làm lại ≥ 10 phút.
20. **Màn hình sau ngày trống:** "Hôm qua trống. Bình thường. Việc chính hôm nay vẫn là X. Bắt đầu 10 phút?" Không đỏ, không cảm thán.
21. **Weekly review 10 phút, chủ nhật:** 2 mục tiêu tuần xong chưa · số ngày có ≥10 phút · số lần dời · giờ ngủ trung bình · chọn 1–2 mục tiêu tuần tới.

### F. Ý tưởng cho giai đoạn sau (không MVP)
22. AI "concretizer": nhập "Học AWS" → hỏi 2 câu → đề xuất "Làm 20 câu S3 trong quiz X".
23. Body-doubling: mở link cho bạn/đồng nghiệp cùng bấm "Bắt đầu" (bản Focusmate tự chế).
24. Push notification PWA cho giờ Shutdown và giờ Bắt đầu.
25. Đồng bộ nhiều thiết bị (Supabase) nếu cần dùng trên điện thoại.
26. Import từ Google Calendar để biết hôm nay còn bao nhiêu giờ trống thực sự.

## 3. Những gì cố ý KHÔNG làm

| Không làm | Lý do |
|---|---|
| List nhiều việc, project, tag, filter | Tăng WIP, tăng chỗ để trốn. |
| Streak, badge, điểm, level | Vỡ chuỗi → tự trách → trì hoãn (mục 2.7). |
| Nút "Hoãn / Snooze" | Là phím tắt cho mood repair. |
| Phạt tiền, deadline cứng | Bằng chứng yếu (replication 2026 không tái lập). |
| Chỉnh sửa kế hoạch bất cứ lúc nào | Kế hoạch phải ra 1 lần buổi tối. |
| Thống kê chi tiết theo giờ, biểu đồ đẹp | Trở thành "việc để làm thay vì làm việc". |

## 4. Nguyên tắc sản phẩm (dùng để ra mọi quyết định thiết kế)

1. **Một màn hình, một việc, một nút.**
2. **Kế hoạch ra buổi tối, thực thi buổi sáng.** Sáng không đàm phán.
3. **Khoá thay cho nhắc.** Nhắc thì bỏ qua được, khoá thì không.
4. **Ma sát đúng chỗ:** dễ khi bắt đầu, khó khi trốn, không thể khi đã đóng ngày.
5. **Đo lần quay lại, không đo chuỗi.**
6. **Nếu một tính năng làm bạn mở app lâu hơn, nó sai.** App tốt là app dùng 3 phút tối, 1 phút sáng.

## 5. Ẩn dụ đặt tên (tuỳ chọn)

- **"Một Việc"**: nói thẳng nguyên tắc WIP=1.
- **"Đóng"**: nhấn vào hành động quan trọng nhất là đóng ngày / đóng task.
- **"Quay Lại"**: nhấn vào self-forgiveness.

Đề xuất: **Một Việc** (tên thư mục / package: `motviec`).
