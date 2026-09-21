# MDX — Markdown to PDF

A simple, self-hosted markdown editor: live edit on the left, live rendered
preview on the right, export to PDF via the browser's print dialog.

Pure static site — no backend, no build step.

## Features

- Live preview, split-pane editor (drag the divider to resize)
- LaTeX math via [KaTeX](https://katex.org/) (`$...$` and `$$...$$`)
- Diagrams via [Mermaid](https://mermaid.js.org/) (```mermaid fenced blocks)
- Diagrams via [PlantUML](https://plantuml.com/) (```plantuml fenced blocks),
  rendered by the public `plantuml.com` server
- Image upload: embedded inline as base64, nothing stored server-side —
  just delete the markdown line if you no longer want it
- Export to PDF via the browser's native print dialog (print stylesheet
  shows only the rendered document)

## Run with Docker

```sh
docker build -t mdx-frontend ./frontend
docker run --rm -p 8081:80 mdx-frontend
```

Then open http://localhost:8081.

## Run locally without Docker

Serve `frontend/public/` with any static file server, e.g.

```sh
cd frontend/public
python3 -m http.server 8081
```
