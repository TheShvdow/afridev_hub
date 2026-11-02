import { renderMarkdown } from './markdown';
import { MarkdownPipe } from './markdown.pipe';

describe('renderMarkdown', () => {
  it('renvoie une chaîne vide sans texte', () => {
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown('   ')).toBe('');
  });

  it('met en forme le gras, l\'italique, le barré et le code en ligne', () => {
    expect(renderMarkdown('**gras** *italique* ~~barré~~ `code`')).toBe(
      '<p><strong>gras</strong> <em>italique</em> <del>barré</del> <code>code</code></p>',
    );
  });

  it('garde les retours à la ligne simples et sépare les paragraphes', () => {
    expect(renderMarkdown('a\nb\n\nc')).toBe('<p>a<br>b</p><p>c</p>');
  });

  it('construit listes, citations, titres décalés et séparateurs', () => {
    expect(renderMarkdown('- un\n- deux')).toBe('<ul><li>un</li><li>deux</li></ul>');
    expect(renderMarkdown('1. un\n2. deux')).toBe('<ol><li>un</li><li>deux</li></ol>');
    expect(renderMarkdown('> cité')).toBe('<blockquote><p>cité</p></blockquote>');
    expect(renderMarkdown('# Titre')).toBe('<h3>Titre</h3>');
    expect(renderMarkdown('---')).toBe('<hr>');
  });

  it('rend un bloc de code sans interpréter son contenu', () => {
    expect(renderMarkdown('```ts\nconst a = "<b>**x**</b>";\n```')).toBe(
      '<pre><code>const a = &quot;&lt;b&gt;**x**&lt;/b&gt;&quot;;</code></pre>',
    );
  });

  it('échappe le HTML saisi', () => {
    const html = renderMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('accepte les liens http, https et mailto, avec des attributs sûrs', () => {
    expect(renderMarkdown('[site](https://exemple.com/a?b=1&c=2)')).toContain(
      '<a href="https://exemple.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer nofollow ugc">site</a>',
    );
    expect(renderMarkdown('[moi](mailto:a@b.co)')).toContain('href="mailto:a@b.co"');
  });

  it('refuse les liens javascript: et data:', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('<a');
    expect(renderMarkdown('[x](data:text/html;base64,AAAA)')).not.toContain('<a');
  });

  it('ne laisse pas un guillemet sortir de l\'attribut href', () => {
    const html = renderMarkdown('[x](https://a.co/"onmouseover="alert(1))');
    expect(html).not.toContain('onmouseover="');
  });

  it('transforme une adresse nue en lien sans sa ponctuation finale', () => {
    expect(renderMarkdown('voir https://exemple.com/doc.')).toContain('href="https://exemple.com/doc"');
  });

  it('n\'interprète pas le Markdown dans le code en ligne', () => {
    expect(renderMarkdown('`**x**`')).toBe('<p><code>**x**</code></p>');
  });
});

describe('MarkdownPipe', () => {
  it('délègue au moteur', () => {
    expect(new MarkdownPipe().transform('**a**')).toBe('<p><strong>a</strong></p>');
  });
});
