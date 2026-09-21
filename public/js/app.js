const DEFAULT_DOC = `# Welcome to MDX

A simple markdown editor with live preview and PDF export.

## Text

**Bold**, _italic_, \`inline code\`, and [links](https://example.com) all work as expected.

> Blockquotes look like this.

- Live preview
- Live edit
- Export to PDF

## Code

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Math (KaTeX)

Inline math: $E = mc^2$

Block math:

$$
\\int_0^\\infty e^{-x^2} \\, dx = \\frac{\\sqrt{\\pi}}{2}
$$

## Diagrams (Mermaid)

\`\`\`mermaid
graph TD
  A[Write Markdown] --> B[Live Preview]
  B --> C{Happy with it?}
  C -->|Yes| D[Export PDF]
  C -->|No| A
\`\`\`

## Diagrams (PlantUML)

\`\`\`plantuml
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml
\`\`\`

## Images

Use the **Insert Image** button above to embed a local image (it's inlined as
base64, nothing is uploaded anywhere — just delete the line if you no longer
need it).
`;

const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const imageInput = document.getElementById("image-upload");
const exportBtn = document.getElementById("export-pdf");
const mdUploadInput = document.getElementById("md-upload");
const downloadBtn = document.getElementById("download-md");

const md = window.markdownit({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight: function (str, lang) {
    if (lang && window.hljs && hljs.getLanguage(lang)) {
      try {
        const value = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        return `<pre class="hljs"><code>${value}</code></pre>`;
      } catch (_) {
        // fall through to the escaped, unhighlighted block below
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

const defaultFenceRenderer =
  md.renderer.rules.fence ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options, env, self);
  };

md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const info = token.info.trim().toLowerCase();

  if (info === "mermaid") {
    return `<div class="mermaid">${md.utils.escapeHtml(token.content)}</div>`;
  }

  if (info === "plantuml" || info === "puml") {
    const src = PlantUML.url(token.content, "svg");
    return `<img class="plantuml-diagram" src="${src}" alt="PlantUML diagram">`;
  }

  return defaultFenceRenderer(tokens, idx, options, env, self);
};

// A lone "---" is repurposed as a plain line break instead of CommonMark's
// thematic break. Longer dash runs ("----") and other thematic-break
// markers ("***", "___") still render as an actual <hr>.
md.renderer.rules.hr = function (tokens, idx) {
  const isLineBreak = tokens[idx].markup.replace(/\s+/g, "") === "---";
  return isLineBreak ? "<br>\n" : "<hr>\n";
};

// A "---" line directly under a text line (no blank line in between) is
// CommonMark's *setext heading* syntax — it turns the line above into an
// <h2> instead of producing a thematic-break token at all, so the hr
// override above never even sees it. To make "---" behave as a line break
// unconditionally, force a blank line above every standalone "---" before
// handing the source to markdown-it, which guarantees it can only be
// parsed as a thematic break. Fenced code blocks are left untouched, so
// "---" inside a ```diff/yaml/etc. example still prints literally.
function isolateLineBreakMarkers(source) {
  const lines = source.split("\n");
  const out = [];
  let inFence = false;
  let fenceChar = "";

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
      }
    }

    if (!inFence && line.trim() === "---") {
      if (out.length > 0 && out[out.length - 1].trim() !== "") {
        out.push("");
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

let renderTimer = null;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderPreview, 250);
}

async function renderPreview() {
  preview.innerHTML = md.render(isolateLineBreakMarkers(editor.value));

  const diagrams = preview.querySelectorAll(".mermaid");
  if (diagrams.length) {
    try {
      await mermaid.run({ nodes: diagrams });
    } catch (err) {
      console.error("Mermaid render error", err);
    }
  }

  if (window.renderMathInElement) {
    renderMathInElement(preview, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  }
}

editor.addEventListener("input", scheduleRender);

function insertAtCursor(textarea, text) {
  textarea.focus();
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.setSelectionRange(start, end);

  // Use execCommand (not textarea.value = ...) so this insert stays on the
  // browser's native undo stack — Ctrl+Z/Cmd+Z can then undo it like any
  // other edit, instead of wiping undo history.
  const inserted = document.execCommand && document.execCommand("insertText", false, text);
  if (!inserted) {
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = before + text + after;
    const cursor = start + text.length;
    textarea.selectionStart = textarea.selectionEnd = cursor;
  }
}

imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    insertAtCursor(editor, `![${file.name}](${reader.result})\n`);
    scheduleRender();
  };
  reader.readAsDataURL(file);
  imageInput.value = "";
});

exportBtn.addEventListener("click", () => {
  window.print();
});

mdUploadInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    editor.value = reader.result;
    renderPreview();
  };
  reader.readAsText(file);
  mdUploadInput.value = "";
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([editor.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "document.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Drag-to-resize the editor/preview split.
const divider = document.getElementById("divider");
let dragging = false;

divider.addEventListener("mousedown", () => {
  dragging = true;
  document.body.style.cursor = "col-resize";
});

window.addEventListener("mousemove", (event) => {
  if (!dragging) return;
  const workspace = document.querySelector(".workspace");
  const rect = workspace.getBoundingClientRect();
  const pct = ((event.clientX - rect.left) / rect.width) * 100;
  const clamped = Math.min(80, Math.max(20, pct));
  document.documentElement.style.setProperty("--editor-width", `${clamped}%`);
});

window.addEventListener("mouseup", () => {
  dragging = false;
  document.body.style.cursor = "";
});

editor.value = DEFAULT_DOC;
renderPreview();
