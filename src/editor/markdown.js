/** Minimal markdown → HTML (from js/12-markdown.js). */

export function markdownToHtml(md) {
  let h = String(md || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  h = h.replace(/^######\s(.+)$/gm, '<h6>$1</h6>');
  h = h.replace(/^#####\s(.+)$/gm, '<h5>$1</h5>');
  h = h.replace(/^####\s(.+)$/gm, '<h4>$1</h4>');
  h = h.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');
  h = h.replace(/```[\s\S]*?```/g, (m) =>
    '<pre><code>' + m.replace(/^```[a-z]*\n?/, '').replace(/```$/, '') + '</code></pre>'
  );
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  h = h.replace(/__(.+?)__/g, '<strong>$1</strong>');
  h = h.replace(/_(.+?)_/g, '<em>$1</em>');
  h = h.replace(/^[-*]{3,}$/gm, '<hr>');
  h = h.replace(/^&gt;\s(.+)$/gm, '<blockquote>$1</blockquote>');
  h = h.replace(/^[-*+]\s(.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  h = h.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  h = h.replace(/^(?!<[a-zA-Z]).+$/gm, (line) => (line.trim() ? `<p>${line}</p>` : ''));
  return h;
}

export const DEFAULT_MD = '# Title\n\nWrite **markdown** here.\n\n- Item one\n- Item two\n- Item three';
