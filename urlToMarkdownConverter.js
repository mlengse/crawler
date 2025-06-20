const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');
const { JSDOM } = require('jsdom');
const https = require('https');
const http = require('http');

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

// Configure turndown service
turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: function (content) {
        return '~~' + content + '~~';
    }
});

class URLToMarkdownConverter {
    constructor() {
        this.timeoutMs = 15000; // 15 seconds timeout
    }

    async fetchURL(url) {
        return new Promise((resolve, reject) => {
            const urlModule = url.startsWith('https:') ? https : http;
            let timedOut = false;

            const timeout = setTimeout(() => {
                timedOut = true;
                reject(new Error('Request timeout'));
            }, this.timeoutMs);

            const req = urlModule.get(url, (res) => {
                clearTimeout(timeout);

                if (timedOut) return;

                let result = "";
                
                res.on("data", (chunk) => {
                    result += chunk;
                });

                res.on("end", () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(result);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });

            req.on('timeout', () => {
                clearTimeout(timeout);
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.setTimeout(this.timeoutMs);
        });
    }

    stripStyleAndScriptBlocks(html) {
        // Remove style and script blocks
        html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        return html;
    }

    async convertUrlToMarkdown(url, options = {}) {
        try {
            // Default options
            const defaultOptions = {
                title: true,
                links: true,
                clean: true
            };
            
            const opts = { ...defaultOptions, ...options };

            // Fetch HTML content
            const html = await this.fetchURL(url);
            
            // Clean HTML
            const cleanedHtml = this.stripStyleAndScriptBlocks(html);
            
            // Parse HTML with JSDOM
            const dom = new JSDOM(cleanedHtml, { url });
            const document = dom.window.document;

            let title = null;
            const titleElement = document.querySelector('title');
            if (titleElement) {
                title = titleElement.textContent.trim();
            }

            let content = cleanedHtml;

            // Use Mozilla Readability if clean option is enabled
            if (opts.clean) {
                try {
                    const reader = new Readability(document);
                    const article = reader.parse();
                    
                    if (article && article.content) {
                        content = article.content;
                        if (article.title && !title) {
                            title = article.title;
                        }
                    }
                } catch (readabilityError) {
                    console.warn('Readability parsing failed, using full HTML:', readabilityError.message);
                    // Fall back to full document if Readability fails
                    content = document.documentElement.outerHTML;
                }
            }

            // Convert HTML to Markdown
            let markdown = turndownService.turndown(content);

            // Apply filters
            if (!opts.links) {
                // Remove links but keep text
                markdown = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            }

            // Add title if requested
            if (opts.title && title) {
                markdown = `# ${title}\n\n${markdown}`;
            }

            // Clean up extra whitespace
            markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
            markdown = markdown.trim();

            return {
                success: true,
                markdown: markdown,
                title: title,
                url: url
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                markdown: `Error processing ${url}: ${error.message}`,
                url: url
            };
        }
    }
}

module.exports = URLToMarkdownConverter;
