// Rendu Markdown des questions et des réponses, sans dépendance : le texte est échappé d'abord, puis
// seules les balises produites ici apparaissent. Les liens n'acceptent que http, https et mailto. Le
// résultat passe en plus par le filtre d'Angular quand il est lié à `[innerHTML]`.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

const SAFE_URL = /^(https?:\/\/|mailto:)\S+$/i;
const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer nofollow ugc"';

function inline(text: string): string {
  // Le code en ligne est mis de côté : rien de ce qu'il contient n'est interprété.
  const codes: string[] = [];
  let html = text.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  html = escapeHtml(html);

  // [texte](adresse) : l'adresse est déjà échappée, donc sans guillemet qui sorte de l'attribut.
  html = html.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) =>
    SAFE_URL.test(url.replace(/&amp;/g, '&')) ? `<a href="${url}" ${LINK_ATTRS}>${label}</a>` : match,
  );
  // Adresse nue : la ponctuation finale n'en fait pas partie.
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s<]+?)([.,;:!?)]*)(?=\s|$)/g, (_match, before: string, url: string, tail: string) =>
    `${before}<a href="${url}" ${LINK_ATTRS}>${url}</a>${tail}`,
  );

  html = html
    .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)(.+?)(?<=\S)__/g, '<strong>$1</strong>')
    .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '<del>$1</del>')
    .replace(/(^|[^*\w])\*(?=\S)([^*]+?)(?<=\S)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_(?=\S)([^_]+?)(?<=\S)_(?!\w)/g, '$1<em>$2</em>');

  // eslint-disable-next-line no-control-regex
  return html.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codes[Number(index)]);
}

const FENCE = /^\s*```([\w+-]*)\s*$/;
const FENCE_END = /^\s*```\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s*>\s?/;
const BULLET = /^\s*[-*+]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

export function renderMarkdown(source: string | null | undefined): string {
  const lines = (source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  const paragraph: string[] = [];
  let i = 0;

  // Les retours à la ligne simples sont gardés (comme dans un commentaire GitHub) : le texte déjà
  // saisi ainsi garde son aspect.
  const flush = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
    paragraph.length = 0;
  };

  const collect = (pattern: RegExp): string[] => {
    const items: string[] = [];
    while (i < lines.length && pattern.test(lines[i])) items.push(lines[i++].replace(pattern, ''));
    return items;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (FENCE.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE_END.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      // Les titres du site occupent h1 et h2 : ceux du texte commencent à h3.
      const level = Math.min(heading[1].length + 2, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (RULE.test(line)) {
      flush();
      out.push('<hr>');
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      flush();
      out.push(`<blockquote>${renderMarkdown(collect(QUOTE).join('\n'))}</blockquote>`);
      continue;
    }

    if (BULLET.test(line)) {
      flush();
      out.push(`<ul>${collect(BULLET).map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    if (NUMBERED.test(line)) {
      flush();
      out.push(`<ol>${collect(NUMBERED).map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    paragraph.push(line);
    i++;
  }

  flush();
  return out.join('');
}
