// Shared resources
let decodeTextarea = null;
let domParser = null;

export const getDecodeTextarea = () => {
  if (!decodeTextarea) {
    if (typeof document !== 'undefined') {
      decodeTextarea = document.createElement('textarea');
    }
  }
  return decodeTextarea;
};

export const getDOMParser = () => {
  if (!domParser) {
    if (typeof DOMParser !== 'undefined') {
      domParser = new DOMParser();
    }
  }
  return domParser;
};

export const decodeHtmlEntities = (text) => {
  const textarea = getDecodeTextarea();
  if (!textarea) return text;
  textarea.innerHTML = text;
  return textarea.value;
};

export const convertHtmlToMarkdownJS = (htmlContent, url) => {
    let markdown = `# Content from: ${url}\n\n`;

    // Remove script and style tags
    let cleaned = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments

    // Convert headers
    cleaned = cleaned
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n\n');

    // Convert paragraphs and line breaks
    cleaned = cleaned
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n');

    // Convert links
    cleaned = cleaned
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Convert emphasis
    cleaned = cleaned
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

    // Convert code blocks
    cleaned = cleaned
      .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n\n');

    // Convert lists
    cleaned = cleaned
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return '\n' + content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        return '\n' + content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      });

    // Convert blockquotes
    cleaned = cleaned
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n\n');

    // Convert images
    cleaned = cleaned
      .replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
      .replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');

    // Remove remaining HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    cleaned = decodeHtmlEntities(cleaned);

    // Clean up whitespace
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ')      // Multiple spaces to single space
      .replace(/^\s+|\s+$/gm, '')   // Trim lines
      .trim();

    markdown += cleaned;
    return markdown;
};
