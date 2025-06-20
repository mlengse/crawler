use wasm_bindgen::prelude::*;

// Original 'add' function
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
  a + b
}

// --- HTML to Markdown Conversion ---
use scraper::{Html, Selector};
use regex::Regex;

#[wasm_bindgen]
pub fn process_html_to_markdown(html_content: String, base_url: String) -> Result<String, JsValue> {
    _ = base_url; // Mark as used to avoid warning, placeholder for now

    // println!("Original HTML: {}", html_content); // DEBUG

    let document = Html::parse_document(&html_content);
    let selectors_to_try = vec!["article", "main", ".main", "#main", ".content", "#content"];
    let mut extracted_html = String::new();
    let mut found_main_content = false;

    for selector_str in selectors_to_try {
        if let Ok(selector) = Selector::parse(selector_str) {
            if let Some(element) = document.select(&selector).next() {
                extracted_html = clean_html_of_scripts_and_styles(&element.inner_html());
                found_main_content = true;
                // println!("Extracted HTML using selector '{}': {}", selector_str, extracted_html); // DEBUG
                break;
            }
        }
    }

    if !found_main_content {
        if let Ok(body_selector) = Selector::parse("body") {
            if let Some(body_element) = document.select(&body_selector).next() {
                extracted_html = clean_html_of_scripts_and_styles(&body_element.inner_html());
                // println!("Extracted HTML using body: {}", extracted_html); // DEBUG
            } else {
                extracted_html = clean_html_of_scripts_and_styles(&html_content);
                // println!("Extracted HTML using whole document (no body): {}", extracted_html); // DEBUG
            }
        } else {
            extracted_html = clean_html_of_scripts_and_styles(&html_content);
            // println!("Extracted HTML using whole document (body selector failed): {}", extracted_html); // DEBUG
        }
    }

    if extracted_html.trim().is_empty() && !html_content.trim().is_empty() {
        // If specific selectors + body resulted in empty but original wasn't, fallback to whole content cleaned
        // println!("Warning: Main content extraction resulted in empty string. Falling back to cleaning whole HTML.");
        extracted_html = clean_html_of_scripts_and_styles(&html_content);
        // println!("Extracted HTML after fallback: {}", extracted_html); // DEBUG
    }

    let markdown = html2md::parse_html(&extracted_html);
    // println!("Converted Markdown: {}", markdown); // DEBUG
    Ok(markdown)
}

fn clean_html_of_scripts_and_styles(html_str: &str) -> String {
    let script_regex = Regex::new(r"(?is)<script[^>]*>.*?</script>").unwrap();
    let style_regex = Regex::new(r"(?is)<style[^>]*>.*?</style>").unwrap();
    let temp = script_regex.replace_all(html_str, "");
    style_regex.replace_all(&temp, "").into_owned()
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
