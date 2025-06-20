use wasm_bindgen::prelude::*;

// Import the `console.log` function from the web-sys crate
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Define a macro to make console.log easier to use
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Basic add function
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
    console_log!("Adding {} + {}", a, b);
    a + b
}

// Simple HTML to Markdown conversion (JavaScript fallback approach)
#[wasm_bindgen]
pub fn process_html_to_markdown(html_content: String, base_url: String) -> Result<String, JsValue> {
    console_log!("Processing HTML from: {}", base_url);
    
    if html_content.trim().is_empty() {
        return Ok(String::new());
    }

    // Very basic HTML to Markdown conversion
    let mut markdown = format!("# Content from: {}\n\n", base_url);
    
    // Remove script and style tags (basic regex patterns)
    let cleaned = html_content
        .replace("<script", "SCRIPT_START")
        .replace("</script>", "SCRIPT_END")
        .replace("<style", "STYLE_START")
        .replace("</style>", "STYLE_END");
    
    // Very basic HTML tag removal (not perfect but works for basic cases)
    let text_content = remove_html_tags(&cleaned);
    
    // Clean up whitespace
    let cleaned_text = text_content
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty() && !line.starts_with("SCRIPT_") && !line.starts_with("STYLE_"))
        .collect::<Vec<&str>>()
        .join("\n\n");
    
    markdown.push_str(&cleaned_text);
    
    console_log!("Conversion complete. Length: {} chars", markdown.len());
    Ok(markdown)
}

// Basic filename generation
#[wasm_bindgen]
pub fn generate_filename_from_url(url_str: &str) -> String {
    console_log!("Generating filename for: {}", url_str);
    
    // Basic URL to filename conversion
    let safe_name = url_str
        .replace("https://", "")
        .replace("http://", "")
        .replace("/", "_")
        .replace("?", "_")
        .replace("&", "_")
        .replace("=", "_")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-' || *c == '.')
        .collect::<String>();
    
    let filename = if safe_name.len() > 50 {
        safe_name[..50].to_string()
    } else {
        safe_name
    };
    
    format!("{}.md", if filename.is_empty() { "converted" } else { &filename })
}

// Helper function to remove HTML tags (basic implementation)
fn remove_html_tags(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    
    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                result.push(' '); // Replace tag with space
            }
            _ if !in_tag => result.push(ch),
            _ => {} // Skip characters inside tags
        }
    }
    
    result
}

// Tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_basic_html_conversion() {
        let html = "<html><body><h1>Title</h1><p>Hello world!</p></body></html>";
        let result = process_html_to_markdown(html.to_string(), "http://example.com".to_string()).unwrap();
        assert!(result.contains("Title"));
        assert!(result.contains("Hello world"));
        assert!(result.contains("Content from: http://example.com"));
    }

    #[test]
    fn test_filename_generation() {
        let filename = generate_filename_from_url("https://example.com/page");
        assert_eq!(filename, "example.com_page.md");
    }
}
