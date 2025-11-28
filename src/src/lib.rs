use wasm_bindgen::prelude::*;

// WASM bindings for HTML to Markdown conversion and link extraction
// Import the `console.log` function from the `console` module
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = console, js_name = error)]
    fn error(s: &str);
}

// Define a macro for easier console logging
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[allow(unused_macros)]
macro_rules! console_error {
    ($($t:tt)*) => (error(&format_args!($($t)*).to_string()))
}

#[allow(unused_macros)]
macro_rules! console_warn {
    ($($t:tt)*) => (log(&format!("WARN: {}", format_args!($($t)*))))
}

// Simple add function for testing
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
    console_log!("Adding {} + {}", a, b);
    a + b
}

// Basic HTML to Markdown conversion without external dependencies
#[wasm_bindgen]
pub fn process_html_to_markdown(html_content: String, base_url: String) -> Result<String, JsValue> {
    console_log!("Processing HTML to markdown for URL: {}", base_url);
    
    if html_content.trim().is_empty() {
        return Ok(String::new());
    }

    // Basic HTML cleaning and conversion
    let markdown = html_content
        // Remove script and style tags
        .replace("<script", "<!-- REMOVED SCRIPT")
        .replace("</script>", "END SCRIPT -->")
        .replace("<style", "<!-- REMOVED STYLE")
        .replace("</style>", "END STYLE -->")
        // Convert headers
        .replace("<h1>", "# ")
        .replace("</h1>", "\n\n")
        .replace("<h2>", "## ")
        .replace("</h2>", "\n\n")
        .replace("<h3>", "### ")
        .replace("</h3>", "\n\n")
        .replace("<h4>", "#### ")
        .replace("</h4>", "\n\n")
        .replace("<h5>", "##### ")
        .replace("</h5>", "\n\n")
        .replace("<h6>", "###### ")
        .replace("</h6>", "\n\n")
        // Convert paragraphs and breaks
        .replace("<p>", "")
        .replace("</p>", "\n\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        // Convert emphasis
        .replace("<strong>", "**")
        .replace("</strong>", "**")
        .replace("<b>", "**")
        .replace("</b>", "**")
        .replace("<em>", "*")
        .replace("</em>", "*")
        .replace("<i>", "*")
        .replace("</i>", "*")
        // Convert lists
        .replace("<ul>", "")
        .replace("</ul>", "\n")
        .replace("<ol>", "")
        .replace("</ol>", "\n")
        .replace("<li>", "- ")
        .replace("</li>", "\n")
        // Remove common HTML elements
        .replace("<div>", "")
        .replace("</div>", "\n")
        .replace("<span>", "")
        .replace("</span>", "")
        // Clean up navigation and footer
        .replace("<nav>", "")
        .replace("</nav>", "")
        .replace("<footer>", "")
        .replace("</footer>", "")
        .replace("<aside>", "")
        .replace("</aside>", "");
    
    // Simple regex-like cleaning for remaining tags
    let mut cleaned = String::new();
    let mut in_tag = false;
    let mut in_comment = false;
    let chars: Vec<char> = markdown.chars().collect();
    let mut i = 0;
    
    while i < chars.len() {
        if i + 3 < chars.len() && chars[i..i+4] == ['<', '!', '-', '-'] {
            in_comment = true;
            i += 4;
            continue;
        }
        
        if in_comment {
            if i + 2 < chars.len() && chars[i..i+3] == ['-', '-', '>'] {
                in_comment = false;
                i += 3;
            } else {
                i += 1;
            }
            continue;
        }
        
        if chars[i] == '<' {
            in_tag = true;
            i += 1;
            continue;
        }
        
        if chars[i] == '>' && in_tag {
            in_tag = false;
            i += 1;
            continue;
        }
        
        if !in_tag {
            cleaned.push(chars[i]);
        }
        
        i += 1;
    }
    
    // Clean up excessive whitespace
    let mut final_markdown = String::new();
    let mut prev_char = '\0';
    let mut newline_count = 0;
    
    for ch in cleaned.chars() {
        if ch == '\n' {
            newline_count += 1;
            if newline_count <= 2 {
                final_markdown.push(ch);
            }
        } else {
            newline_count = 0;
            if ch != ' ' || prev_char != ' ' {
                final_markdown.push(ch);
            }
        }
        prev_char = ch;
    }
    
    // Add URL header if base_url is provided and not empty
    if !base_url.trim().is_empty() {
        final_markdown = format!("# Content from: {}\n\n{}", base_url, final_markdown.trim());
    }
    
    Ok(final_markdown.trim().to_string())
}

// Simple filename generation from URL
#[wasm_bindgen]
pub fn generate_filename_from_url(url_str: &str) -> String {
    let sanitized = url_str
        .replace("http://", "")
        .replace("https://", "")
        .replace("/", "_")
        .replace(":", "_")
        .replace("?", "_")
        .replace("&", "_")
        .replace("#", "_")
        .replace(" ", "_")
        .chars()
        .take(50)
        .collect::<String>();
    
    if sanitized.is_empty() {
        "converted_content.md".to_string()
    } else {
        format!("{}.md", sanitized)
    }
}

// Extract links from HTML content (WASM-based crawler helper)
#[wasm_bindgen]
pub fn extract_links_from_html(html_content: String, base_url: String) -> Result<String, JsValue> {
    console_log!("Extracting links from HTML for base URL: {}", base_url);
    
    if html_content.trim().is_empty() {
        return Ok("[]".to_string());
    }
    
    let mut links = Vec::new();
    let html_lower = html_content.to_lowercase();
    
    // Simple href extraction using string parsing
    let mut pos = 0;
    while let Some(href_pos) = html_lower[pos..].find("href=") {
        let start = pos + href_pos + 5; // After "href="
        
        if start >= html_content.len() {
            break;
        }
        
        // Determine quote type
        let quote_char = html_content.chars().nth(start);
        let (quote, offset) = match quote_char {
            Some('"') => ('"', 1),
            Some('\'') => ('\'', 1),
            _ => (' ', 0), // No quotes
        };
        
        let link_start = start + offset;
        if link_start >= html_content.len() {
            pos = start + 1;
            continue;
        }
        
        // Find end of href value
        let remaining = &html_content[link_start..];
        let end_pos = if offset > 0 {
            remaining.find(quote).unwrap_or(remaining.len())
        } else {
            remaining.find(' ').unwrap_or(remaining.find('>').unwrap_or(remaining.len()))
        };
        
        if end_pos > 0 {
            let link = &remaining[..end_pos];
            
            // Filter out non-navigational links
            if link.starts_with('#') || 
               link.starts_with("mailto:") || 
               link.starts_with("tel:") || 
               link.starts_with("javascript:") ||
               link.starts_with("data:") ||
               link.is_empty() {
                pos = link_start + end_pos + 1;
                continue;
            }
            
            // Build absolute URL
            let absolute_url = if link.starts_with("http://") || link.starts_with("https://") {
                link.to_string()
            } else if link.starts_with("//") {
                format!("https:{}", link)
            } else if link.starts_with('/') {
                // Parse base URL to get origin
                if let Some(origin_end) = base_url.find("://") {
                    let after_protocol = origin_end + 3;
                    if let Some(path_start) = base_url[after_protocol..].find('/') {
                        let origin = &base_url[..after_protocol + path_start];
                        format!("{}{}", origin, link)
                    } else {
                        format!("{}{}", base_url, link)
                    }
                } else {
                    link.to_string()
                }
            } else {
                // Relative URL
                let base_without_file = if let Some(last_slash) = base_url.rfind('/') {
                    &base_url[..last_slash + 1]
                } else {
                    &base_url
                };
                format!("{}{}", base_without_file, link)
            };
            
            // Filter out non-HTML files by extension
            let skip_extensions = [
                ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
                ".css", ".js", ".json", ".xml",
                ".zip", ".tar", ".gz", ".rar", ".7z",
                ".exe", ".dmg", ".iso", ".app",
                ".mp4", ".mp3", ".avi", ".mov", ".wav",
                ".ttf", ".woff", ".woff2", ".eot"
            ];
            
            let url_lower = absolute_url.to_lowercase();
            let should_skip = skip_extensions.iter().any(|ext| {
                // Check if URL path ends with the extension (before query/hash)
                if let Some(path_end) = url_lower.find('?').or_else(|| url_lower.find('#')) {
                    url_lower[..path_end].ends_with(ext)
                } else {
                    url_lower.ends_with(ext)
                }
            });
            
            if !should_skip {
                // Normalize URL: remove hash
                let normalized = if let Some(hash_pos) = absolute_url.find('#') {
                    absolute_url[..hash_pos].to_string()
                } else {
                    absolute_url
                };
                
                // Remove trailing slash for consistency (except root)
                let final_url = if normalized.ends_with('/') && normalized.matches('/').count() > 3 {
                    normalized[..normalized.len()-1].to_string()
                } else {
                    normalized
                };
                
                links.push(final_url);
            }
        }
        
        pos = link_start + end_pos + 1;
    }
    
    // Remove duplicates and convert to JSON array
    let mut unique_links: Vec<String> = links.into_iter()
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    unique_links.sort();
    
    // Convert to JSON array string
    let json_links = unique_links.iter()
        .map(|link| format!("\"{}\"", link.replace("\"", "\\\"")))
        .collect::<Vec<_>>()
        .join(",");
    
    Ok(format!("[{}]", json_links))
}
