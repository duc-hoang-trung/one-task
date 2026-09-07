# Một Việc

Web app cá nhân chống trì hoãn: **một việc chính mỗi ngày, đóng ngày đúng giờ, quay lại khi trượt**.

Tài liệu: [nghiên cứu](docs/01-research.md) · [brainstorm](docs/02-brainstorm.md) · [plan](docs/03-plan.md)

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173/code-challenge/
npm test         # vitest
npm run build    # tsc + vite build (+ PWA)
```

## Stack

Vite 8 · React 19 · TypeScript · Tailwind 4 · Dexie (IndexedDB, local-first, không backend) · vite-plugin-pwa · Vitest · GitHub Pages.
