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
  try { await page.getByText(t, { exact: false }).first().waitFor({ state: 'visible', timeout: 3000 }) }
  catch { await page.screenshot({ path: 'e2e/shots/FAIL.png', fullPage: true }); console.log(await page.locator('body').innerText()); throw new Error(`Không thấy: ${t}`) }
}

// 1. Onboarding
await go('2026-09-08', '07:30')
await expectText('Ba mốc giờ')
await shot('01-onboarding')
await page.getByRole('button', { name: 'Bắt đầu' }).click()

// 2. Morning without task → form; vague title only gets a soft hint, never blocks
await expectText('Chưa có việc chính hôm nay')
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
await expectText('Việc chính')
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
await expectText('Xong việc chính')
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
await expectText('Việc nhỏ hôm nay')
await expectText('Hỏi HR về bảo hiểm')

// 11. Week screen
await page.getByRole('button', { name: 'Tuần' }).click()
await expectText('Nhìn lại tuần')
await page.getByPlaceholder(/Hoàn thành 3 module/).first().fill('Hoàn thành 3 module đầu khoá SAA')
await page.getByRole('button', { name: 'Thêm' }).first().click()
await page.waitForTimeout(400)
await page.getByPlaceholder(/Hoàn thành 3 module/).first().fill('Nộp 2 CV')
await page.getByRole('button', { name: 'Thêm' }).first().click()
await page.waitForTimeout(400)
await expectText('Nộp 2 CV')
await shot('12-week')

// 11b. Calendar: past day detail, future day plan, too-far blocked
await page.getByRole('button', { name: 'Lịch' }).click()
await expectText('Tháng 9 2026')
await page.getByRole('button', { name: '8', exact: true }).click()      // yesterday (08/09) → detail
await expectText('Việc chính')
await expectText('Làm 20 câu S3')
await shot('14-calendar-past')
await page.getByRole('button', { name: '12', exact: true }).click()     // +3 days → plan form
await expectText('Đặt việc chính cho ngày này')
await page.getByPlaceholder('Làm 20 câu S3').fill('Viết 2 trang báo cáo')
await page.getByRole('button', { name: 'Chốt việc này' }).click()
await expectText('Đã đặt')
await expectText('Viết 2 trang báo cáo')
await shot('15-calendar-planned')
await page.getByRole('button', { name: '30', exact: true }).click()     // +21 days → too far
await expectText('Quá xa để chốt')

// 12. Settings
await page.getByRole('button', { name: 'Cài đặt' }).click()
await expectText('Giờ đóng ngày')
await expectText('Chưa cấu hình Supabase')
await shot('13-settings')

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'E2E OK, no console errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
