use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use js_sys::Promise;
use web_sys::{Request, RequestInit, Response};
use scraper::{Html, Selector};
use regex::Regex;

// Original 'add' function
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
  a + b
}

// --- URL to Markdown Conversion (similar to main.rs) ---
use scraper::{Html, Selector};
use regex::Regex;

// Advanced text extraction similar to main.rs
fn extract_text_content(html: &str) -> String {
    let document = Html::parse_document(html);
    
    // Try to find main content areas first
    let main_selectors = vec![
        "article", "main", ".main", "#main", 
        ".content", "#content", ".post", "#post",
        ".entry", "#entry", ".article", "#article"
    ];
    
    for selector_str in main_selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            if let Some(element) = document.select(&selector).next() {
                return element.text().collect::<Vec<_>>().join(" ");
            }
        }
    }
    
    // Fallback to body content
    if let Ok(body_selector) = Selector::parse("body") {
        if let Some(body) = document.select(&body_selector).next() {
            return body.text().collect::<Vec<_>>().join(" ");
        }
    }
    
    // Last resort: extract all text
    document.root_element().text().collect::<Vec<_>>().join(" ")
}

// Enhanced filename generation similar to main.rs
#[wasm_bindgen]
pub fn generate_filename_from_url(url_str: &str) -> String {
    match url::Url::parse(url_str) {
        Ok(parsed_url) => {
            let hostname = parsed_url.host_str().unwrap_or("unknown");
            let path = parsed_url.path();
            
            // Get the last path segment or use hostname
            let path_segment = path.split('/').last().unwrap_or("");
            let name_base = if path_segment.is_empty() || path_segment == "/" {
                hostname.to_string()
            } else {
                format!("{}_{}", hostname, path_segment)
            };

            // Sanitize filename
            let sanitized = name_base
                .chars()
                .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
                .collect::<String>()
                .trim_matches('_')
                .to_string();

            if sanitized.is_empty() {
                "converted_content.md".to_string()
            } else {
                format!("{}.md", sanitized)
            }
        }
        Err(_) => {
            let fallback = url_str
                .chars()
                .take(50)
                .map(|c| if c.is_alphanumeric() { c } else { '_' })
                .collect::<String>();
            format!("{}.md", if fallback.is_empty() { "invalid_url" } else { &fallback })
        }
    }
}

// Enhanced URL fetching with retry logic (similar to main.rs approach)
#[wasm_bindgen]
pub async fn fetch_url_with_retry(url: &str, max_retries: u32) -> Result<String, JsValue> {
    let mut attempts = 0;
    
    while attempts < max_retries {
        match fetch_url_content(url).await {
            Ok(content) => return Ok(content),
            Err(e) => {
                attempts += 1;
                if attempts >= max_retries {
                    return Err(JsValue::from_str(&format!("Failed after {} attempts: {}", attempts, e.as_string().unwrap_or_default())));
                }
                // Simple delay between retries
                let delay = Promise::new(&mut |resolve, _| {
                    web_sys::window()
                        .unwrap()
                        .set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, 1000)
                        .unwrap();
                });
                JsFuture::from(delay).await.unwrap();
            }
        }
    }
    
    Err(JsValue::from_str("Maximum retries exceeded"))
}

// Basic URL content fetching
async fn fetch_url_content(url: &str) -> Result<String, JsValue> {
    let mut opts = RequestInit::new();
    opts.method("GET");
    
    let request = Request::new_with_str_and_init(url, &opts)?;
    
    let window = web_sys::window().unwrap();
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    let resp: Response = resp_value.dyn_into().unwrap();
    
    if !resp.ok() {
        return Err(JsValue::from_str(&format!("HTTP Error: {}", resp.status())));
    }
    
    let text = JsFuture::from(resp.text()?).await?;
    Ok(text.as_string().unwrap_or_default())
}

// --- HTML to Markdown Conversion ---
// Enhanced HTML to Markdown conversion with better content extraction
#[wasm_bindgen]
pub fn process_html_to_markdown(html_content: String, base_url: String) -> Result<String, JsValue> {
    if html_content.trim().is_empty() {
        return Ok(String::new());
    }

    let document = Html::parse_document(&html_content);
    
    // Enhanced selectors based on main.rs approach
    let selectors_to_try = vec![
        "article", "main", ".main", "#main", 
        ".content", "#content", ".post", "#post",
        ".entry", "#entry", ".article", "#article",
        ".container .content", "#primary", ".primary-content"
    ];
    
    let mut extracted_html = String::new();
    let mut found_main_content = false;

    // Try each selector to find main content
    for selector_str in selectors_to_try {
        if let Ok(selector) = Selector::parse(selector_str) {
            if let Some(element) = document.select(&selector).next() {
                extracted_html = clean_html_of_scripts_and_styles(&element.inner_html());
                found_main_content = true;
                break;
            }
        }
    }    // Fallback strategies if main content not found
    if !found_main_content {
        // Try body first
        if let Ok(body_selector) = Selector::parse("body") {
            if let Some(body_element) = document.select(&body_selector).next() {
                extracted_html = clean_html_of_scripts_and_styles(&body_element.inner_html());
            } else {
                extracted_html = clean_html_of_scripts_and_styles(&html_content);
            }
        } else {
            extracted_html = clean_html_of_scripts_and_styles(&html_content);
        }
    }

    // Final fallback if extraction resulted in empty content
    if extracted_html.trim().is_empty() && !html_content.trim().is_empty() {
        extracted_html = clean_html_of_scripts_and_styles(&html_content);
    }

    // Enhanced markdown conversion with proper structuring
    let mut markdown = html2md::parse_html(&extracted_html);
    
    // Add URL header if base_url is provided and not empty
    if !base_url.trim().is_empty() {
        markdown = format!("# Content from: {}\n\n{}", base_url, markdown);
    }
    
    // Clean up excessive whitespace
    let cleaned_markdown = Regex::new(r"\n{3,}").unwrap()
        .replace_all(&markdown, "\n\n")
        .to_string();
    
    Ok(cleaned_markdown)
}

// Enhanced HTML cleaning function
fn clean_html_of_scripts_and_styles(html_str: &str) -> String {
    let script_regex = Regex::new(r"(?is)<script[^>]*>.*?</script>").unwrap();
    let style_regex = Regex::new(r"(?is)<style[^>]*>.*?</style>").unwrap();
    let comment_regex = Regex::new(r"(?is)<!--.*?-->").unwrap();
    let nav_regex = Regex::new(r"(?is)<nav[^>]*>.*?</nav>").unwrap();
    let footer_regex = Regex::new(r"(?is)<footer[^>]*>.*?</footer>").unwrap();
    let aside_regex = Regex::new(r"(?is)<aside[^>]*>.*?</aside>").unwrap();
    
    let temp = script_regex.replace_all(html_str, "");
    let temp = style_regex.replace_all(&temp, "");
    let temp = comment_regex.replace_all(&temp, "");
    let temp = nav_regex.replace_all(&temp, "");
    let temp = footer_regex.replace_all(&temp, "");
    aside_regex.replace_all(&temp, "").into_owned()
}

// --- Tests ---
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_add_zero() {
        assert_eq!(add(0, 0), 0);
    }

    #[test]
    fn test_add_large_numbers() {
        assert_eq!(add(1000, 2000), 3000);
    }

    #[test]
    fn test_html_to_markdown_basic() {
        let html = "<html><body><h1>Title</h1><p>Hello <b>world</b>!</p><script>alert('bad')</script><style>.bad{color:red;}</style></body></html>";
        let base = "http://example.com";
        match process_html_to_markdown(html.to_string(), base.to_string()) {
            Ok(markdown) => {
                // Adjusted to check for Setext style heading
                assert!(markdown.contains("Title\n======"), "Markdown should contain Setext H1 'Title\\n======'. Got: {}", markdown);
                assert!(markdown.contains("Hello **world**!"), "Markdown should contain 'Hello **world**!'. Got: {}", markdown);
                assert!(!markdown.contains("<script"), "Script tag should be removed. Got: {}", markdown);
                assert!(!markdown.contains("<style"), "Style tag should be removed. Got: {}", markdown);
                assert!(!markdown.contains("alert('bad')"), "Script content should be removed. Got: {}", markdown);
                assert!(!markdown.contains(".bad{color:red;}"), "Style content should be removed. Got: {}", markdown);
            }
            Err(e) => panic!("Test failed: {:?}", e),
        }
    }

    #[test]
    fn test_html_to_markdown_no_main_selector() {
        let html = "<html><body><p>Just some text.</p></body></html>";
        let base = "http://example.com";
        match process_html_to_markdown(html.to_string(), base.to_string()) {
            Ok(markdown) => {
                assert_eq!(markdown.trim(), "Just some text.", "Markdown: '{}'", markdown);
            }
            Err(e) => panic!("Test failed: {:?}", e),
        }
    }

    #[test]
    fn test_html_to_markdown_empty_input() {
        let html = "";
        let base = "http://example.com";
        match process_html_to_markdown(html.to_string(), base.to_string()) {
            Ok(markdown) => {
                assert!(markdown.trim().is_empty(), "Markdown should be empty: '{}'", markdown);
            }
            Err(e) => panic!("Test failed: {:?}", e),
        }
    }
}
