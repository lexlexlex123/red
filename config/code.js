/**
 * ╔══════════════════════════════════════════════════╗
 * ║  config/code.js — Конфигурация блоков кода       ║
 * ╚══════════════════════════════════════════════════╝
 */

window.CFG_CODE = {

  // ── Тема подсветки по умолчанию ───────────────────────────────
  // 'dark' | 'monokai' | 'dracula' | 'light'
  defaultTheme: 'dark',

  // ── Язык по умолчанию ────────────────────────────────────────
  defaultLang: 'js',

  // ── Размер шрифта ─────────────────────────────────────────────
  defaultFontSize: 13,

  // ── Доступные языки ───────────────────────────────────────────
  // Установите enabled: false чтобы скрыть из выпадающего списка
  languages: [
    { id: 'js',   label: 'JavaScript', enabled: true },
    { id: 'ts',   label: 'TypeScript', enabled: true },
    { id: 'py',   label: 'Python',     enabled: true },
    { id: 'html', label: 'HTML',       enabled: true },
    { id: 'css',  label: 'CSS',        enabled: true },
    { id: 'sql',  label: 'SQL',        enabled: true },
    { id: 'bash', label: 'Bash',       enabled: true },
    { id: 'rust', label: 'Rust',       enabled: true },
    { id: 'go',   label: 'Go',         enabled: true },
    { id: 'java', label: 'Java',       enabled: true },
    { id: 'cpp',  label: 'C++',        enabled: true },
    { id: 'cs',   label: 'C#',         enabled: true },
    { id: 'plain',label: 'Plain Text', enabled: true },
  ],

  // ── Доступные темы подсветки ─────────────────────────────────
  themes: [
    { id: 'dark',     label: 'Dark',     enabled: true },
    { id: 'monokai',  label: 'Monokai',  enabled: true },
    { id: 'dracula',  label: 'Dracula',  enabled: true },
    { id: 'light',    label: 'Light',    enabled: true },
  ],

};
