# Janopad

A rich text editor built with [Tiptap](https://tiptap.dev/), React 18, TypeScript, and Vite.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 5** — fast dev server and bundler
- **Tiptap 2** — extensible rich text editor
- **Sentry** — error monitoring

## Tiptap Extensions

- Text formatting: Bold, Italic, Underline, Highlight, Color, Text Align
- Tables: Table, TableRow, TableCell, TableHeader
- Mentions with autocomplete (`@suggestion`)
- Placeholder text

## Getting Started

```bash
npm install
npm run dev        # Dev server at http://localhost:5173
```

## Scripts

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `npm run dev`      | Start dev server                |
| `npm run build`    | Production build                |
| `npm run preview`  | Preview production build        |
| `npm run typecheck`| Run TypeScript type checking    |

## Deployment

Deployed via [Vercel](https://vercel.com) — config in `vercel.json`.
