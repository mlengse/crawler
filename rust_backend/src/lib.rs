use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
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
    let mut markdown = html_content
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
