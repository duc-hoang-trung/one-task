import { chromium } from 'playwright'
// Chạy: npm run build && npm run preview & node e2e/walkthrough.mjs
// Cần: npm i -D playwright && npx playwright install chromium (hoặc CHROMIUM_PATH=/path/to/chrome)
// Đi hết vòng đời 2 ngày bằng giờ giả lập (?d&t) và chụp màn hình vào e2e/shots/.

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const shot = (n) => page.screenshot({ path: `e2e/shots/${n}.png`, fullPage: true })
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

// 2. Morning without task → form; vague title rejected
await expectText('Chưa có việc chính hôm nay')
await page.getByPlaceholder('Làm 20 câu S3').fill('Học AWS')
await page.getByPlaceholder(/20 câu có đáp án/).fill('20 câu có đáp án\nGhi 3 lỗi sai')
await page.getByPlaceholder(/Trượt kỳ thi/).fill('Trượt kỳ thi SAA tháng 10, mất 3 tháng ôn lại')
await page.getByPlaceholder('45').fill('120')
await page.getByPlaceholder('Mở quiz S3, làm câu 1–5').fill('Mở quiz S3, làm câu 1–5')
await page.getByRole('button', { name: 'Chốt việc này' }).click()
await expectText('không cho biết khi nào thì xong')
await expectText('quá lớn cho một việc ngày')
await shot('02-form-rejected')
await page.getByPlaceholder('Làm 20 câu S3').fill('Làm 20 câu S3')
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
await page.getByPlaceholder(/20 câu có đáp án/).fill('15 câu có đáp án')
await page.getByPlaceholder(/Trượt kỳ thi/).fill('Không kịp lịch ôn, thi trượt')
await page.getByPlaceholder('45').fill('40')
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
await expectText('Review tuần')
await page.getByPlaceholder(/Hoàn thành 3 module/).first().fill('Học AWS')
await page.getByRole('button', { name: 'Thêm' }).first().click()
await page.waitForTimeout(400)
await expectText('không cho biết khi nào thì xong')
await page.getByPlaceholder(/Hoàn thành 3 module/).first().fill('Hoàn thành 3 module đầu khoá SAA')
await page.getByRole('button', { name: 'Thêm' }).first().click()
await page.waitForTimeout(400)
await page.getByPlaceholder(/Hoàn thành 3 module/).first().fill('Nộp 2 CV')
await page.getByRole('button', { name: 'Thêm' }).first().click()
await page.waitForTimeout(400)
await page.waitForTimeout(200)
await page.waitForTimeout(500); console.log(await page.locator('section').first().innerText()); if (await page.locator('section').first().getByPlaceholder(/Hoàn thành 3 module/).isVisible().catch(() => false)) throw new Error('Vẫn cho thêm mục tiêu thứ 3')
await shot('12-week')

// 12. Settings
await page.getByRole('button', { name: 'Cài đặt' }).click()
await expectText('Giờ đóng ngày')
await shot('13-settings')

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'E2E OK, no console errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
