import { chromium } from 'playwright'
// Chạy: npm run build && npm run preview & node e2e/walkthrough.mjs
// Cần: npm i -D playwright && npx playwright install chromium (hoặc CHROMIUM_PATH=/path/to/chrome)
// Đi hết vòng đời 2 ngày bằng giờ giả lập (?d&t) và chụp màn hình vào e2e/shots/.

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const dark = process.env.DARK === '1'
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'vi-VN', colorScheme: dark ? 'dark' : 'light' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()))
const shot = (n) => page.screenshot({ path: `e2e/shots/${n}${dark ? '-dark' : ''}.png`, fullPage: true })
const go = async (d, t) => { await page.goto(`${BASE}?d=${d}&t=${t}`); await page.waitForTimeout(400) }
const expectText = async (t) => {
  try { await page.getByText(t, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 3000 }) }
  catch { await page.screenshot({ path: 'e2e/shots/FAIL.png', fullPage: true }); console.log(await page.locator('body').innerText()); throw new Error(`Không thấy: ${t}`) }
}

// 1. Onboarding
await go('2026-09-08', '07:30')
await expectText('Ba mốc giờ')
await shot('01-onboarding')
await page.getByRole('button', { name: 'Bắt đầu' }).click()

// 2. Morning without task → form; vague title only gets a soft hint, never blocks
await expectText('0 việc hôm nay')
await page.getByRole('button', { name: /Tạo việc quan trọng nhất/ }).click()
await page.getByPlaceholder('Làm 20 câu S3').fill('Học AWS')
await expectText('Gợi ý')
await shot('02-form-soft-hint')
await page.getByPlaceholder('Làm 20 câu S3').fill('Làm 20 câu S3')
await page.getByPlaceholder('Mở quiz S3, làm câu 1–5').fill('Mở quiz S3, làm câu 1–5')
await page.getByPlaceholder(/20 câu có đáp án/).fill('20 câu có đáp án\nGhi 3 lỗi sai')
await page.getByPlaceholder(/Trượt kỳ thi/).fill('Trượt kỳ thi SAA tháng 10, mất 3 tháng ôn lại')
await page.getByPlaceholder('45').fill('45')
await page.getByRole('button', { name: 'Chốt việc này' }).click()

// 3. Morning screen with next action
await expectText('Bước đầu tiên')
await expectText('Mở quiz S3, làm câu 1–5')
await shot('03-morning')

// 4. Cancel flow → consequence card → dont-want → start anyway
await page.getByRole('button', { name: 'Huỷ…' }).click()
await expectText('Trượt kỳ thi SAA')
await shot('04-consequence-card')
await page.waitForTimeout(5300)
await page.getByRole('button', { name: 'Không muốn làm' }).click()
await expectText('Làm 10 phút rồi quyết')
await shot('05-dont-want')
await page.getByRole('button', { name: 'Làm 10 phút rồi quyết' }).click()

// 5. Today with running timer
await expectText('Quan trọng nhất hôm nay')
await expectText('còn / 10')
await page.getByPlaceholder('Gõ rồi Enter…').fill('Hỏi HR về bảo hiểm')
await page.getByPlaceholder('Gõ rồi Enter…').press('Enter')
await page.waitForTimeout(200)
await expectText('1 ý chờ xử lý')
await shot('06-today-timer')

// 5b. 30 minutes later: planned time over and streak ≥ 25' → break suggested
await go('2026-09-08', '08:00')
await expectText('Nghỉ 5 phút')
await shot('06b-break-suggested')
await page.getByRole('button', { name: 'Nghỉ 5 phút' }).click()
await expectText('Đang nghỉ')
await shot('06c-on-break')
await page.getByRole('button', { name: 'Bỏ nghỉ, làm tiếp' }).click()
await expectText('còn / 10')

// 6. Jump to 21:05 (same logical day) → shutdown banner
await go('2026-09-08', '21:05')
await expectText('Đến giờ đóng ngày')
// tick DoD, complete
const boxes = page.locator('input[type=checkbox]')
await boxes.nth(0).click(); await page.waitForTimeout(200); await boxes.nth(1).click(); await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Đóng việc này' }).click()
await expectText('Đã xong (1)')
await shot('07-today-done')
await page.getByRole('button', { name: 'Đóng ngày', exact: true }).click()

// 7. Shutdown wizard: no task (done) → step 2 form for tomorrow
await expectText('Việc chính cho mai')
await page.getByPlaceholder('Làm 20 câu S3').fill('Làm 15 câu EC2')
await page.getByPlaceholder('Mở quiz S3, làm câu 1–5').fill('Mở quiz EC2, làm câu 1–5')
await shot('08-shutdown-step2')
await page.getByRole('button', { name: 'Chốt việc này' }).click()
await expectText('Quét Parking Lot (1)')
await page.getByRole('button', { name: 'Lên mai (việc nhỏ)' }).click()
await expectText('Sạch')
await page.getByRole('button', { name: 'Tiếp' }).click()
await page.getByPlaceholder(/Sợ không kịp/).fill('Sợ deadline báo cáo thứ 5')
await page.getByPlaceholder(/Sáng mai gửi mail/).fill('Sáng mai gửi mail hỏi anh A số liệu')
await shot('09-shutdown-worry')
await page.getByRole('button', { name: 'Tiếp' }).click()
await page.getByRole('button', { name: 'Đóng ngày', exact: true }).click()

// 8. Night mode
await expectText('Đã đóng ngày')
await expectText('Mở quiz EC2, làm câu 1–5')
if (await page.getByText('Hôm nay', { exact: true }).isVisible().catch(() => false)) throw new Error('Nav còn hiện trong night mode')
await shot('10-night')

// 9. 00:30 still night (logical day)
await go('2026-09-09', '00:30')
await expectText('Đã đóng ngày')

// 10. Next morning
await go('2026-09-09', '07:30')
await expectText('Mở quiz EC2, làm câu 1–5')
await shot('11-next-morning')
await page.getByRole('button', { name: 'Bắt đầu 10 phút' }).click()
await expectText('Quan trọng nhất hôm nay')
// quick add hai việc, một work một personal, rồi hiện nhóm
await page.getByPlaceholder(/Thêm việc/).fill('Trả lời mail khách #w !3')
await page.getByPlaceholder(/Thêm việc/).press('Enter')
await page.waitForTimeout(300)
await page.getByPlaceholder(/Thêm việc/).fill('Đi siêu thị #p ~20')
await page.getByPlaceholder(/Thêm việc/).press('Enter')
await page.waitForTimeout(300)
await expectText('Công việc')
await expectText('Trả lời mail khách')
await expectText('Đi siêu thị')
await expectText('0/3 xong')
await shot('11b-today-list')

// 11. Goals: week goal + quarter goal + check-in + review
await page.getByRole('button', { name: 'Mục tiêu' }).click()
await expectText('Nhìn lại tuần')
await page.getByPlaceholder('Đổi việc trước tháng 12').fill('Đổi việc trước tháng 12')
await page.getByPlaceholder('Đổi việc trước tháng 12').press('Enter')
await page.waitForTimeout(400)
await page.getByPlaceholder('Nộp 2 CV').fill('Nộp 2 CV')
await page.getByPlaceholder('Nộp 2 CV').press('Enter')
await page.waitForTimeout(400)
await expectText('Đổi việc trước tháng 12')
await page.getByRole('button', { name: /Check-in|Đến lúc check-in/ }).first().click()
await page.getByRole('button', { name: 'Chậm' }).click()
await page.getByPlaceholder(/Một dòng/).fill('mới nộp 1')
await page.getByRole('button', { name: 'Ghi check-in' }).click()
await expectText('mới nộp 1')
await shot('12-goals')

// 11a. Plan: matrix quick add to backlog, inbox → Q, drag to Today, week board
await page.getByRole('button', { name: 'Kế hoạch' }).click()
await expectText('Ma trận')
await page.getByPlaceholder(/Thêm việc/).fill('Ôn 30 flashcard !2 #p')
await page.getByPlaceholder(/Thêm việc/).press('Enter')
await page.waitForTimeout(400)
await expectText('Ôn 30 flashcard')
await page.getByPlaceholder('Gõ rồi Enter…').isVisible().catch(() => false) // parking not on this screen
await shot('16-plan-matrix')
// drag backlog task into "Hôm nay" zone with real pointer steps (dnd-kit PointerSensor)
{
  const src = page.getByText('Ôn 30 flashcard').first()
  const dst = page.getByText(/Kéo vào đây: Hôm nay/)
  const a = await src.boundingBox(); const b = await dst.boundingBox()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
}
await page.getByRole('button', { name: 'Tuần' }).nth(0).click()   // segment "Tuần" in Plan
await expectText('Tuần 37')
await expectText('Ôn 30 flashcard')
await shot('17-plan-week')
await page.getByRole('button', { name: 'Ma trận' }).click()

// 11b. Calendar: past day detail, future day quick add, month stats
await page.getByRole('button', { name: 'Lịch' }).click()
await expectText('Tháng 9 2026')
await page.getByRole('button', { name: /^8/ }).first().click()          // yesterday (08/09) → detail
await expectText('Làm 20 câu S3')
await shot('14-calendar-past')
await page.getByRole('button', { name: /^12/ }).first().click()         // future day → quick add
await page.getByPlaceholder(/Thêm việc/).fill('Viết 2 trang báo cáo #w')
await page.getByPlaceholder(/Thêm việc/).press('Enter')
await page.waitForTimeout(400)
await expectText('Viết 2 trang báo cáo')
await expectText('Thống kê tháng')
await expectText('Việc xong mỗi ngày')
await shot('15-calendar-planned')

// 12. Settings
await page.getByRole('button', { name: 'Cài đặt' }).click()
await expectText('Giờ đóng ngày')
await expectText('Chưa cấu hình Supabase')
await shot('13-settings')

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'E2E OK, no console errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
