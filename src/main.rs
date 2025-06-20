// URL to Markdown Converter - Rust/Iced Version
// 
// NOTE: This is an alternative Rust implementation using the Iced GUI framework.
// For the main application with full features, use the Electron version in the root directory.
// 
// This Rust version provides basic URL fetching and simple text extraction,
// while the Electron version includes:
// - Mozilla Readability for content extraction
// - Turndown for proper HTML-to-Markdown conversion  
// - Real-time preview with raw/rendered toggle
// - Responsive UI design
// - Better error handling and retry mechanisms

use iced::widget::{Button, Text, TextInput, Checkbox, Scrollable}; // Explicitly import Button and Text
use iced::{executor, Application, Command, Element, Settings, Theme, widget, Length}; // Added widget module for column! macro
use rfd::FileDialog;
use std::path::PathBuf;
use std::sync::Arc;
use reqwest;
use tokio::time::{sleep, Duration};
use url::Url;

// Define the main application struct
struct App {
    selected_file_path: Option<String>,
    status_message: String,
    urls_to_process: Vec<String>,
    processed_markdowns: Vec<(String, String)>, // Stores (original_url, markdown_content_or_error_string)
    is_processing: bool,
    current_processing_url_index: usize,
    aggregated_markdown: Option<String>,
    is_paused: bool,
    last_markdown_preview: Option<String>,
    save_merged: bool,
    manual_url_input: String,
}

// Define messages for GUI interactions
#[derive(Debug, Clone)]
enum Message {
    OpenFile,
    StartProcessing,
    ProcessUrls(Option<String>),
    UrlsLoaded(Result<Vec<String>, Arc<std::io::Error>>),
    UrlProcessed(Result<(String, String), Arc<reqwest::Error>>), // Tuple: (url, markdown_content_or_error)
    ProcessingComplete,
    SaveMarkdown,
    FileSaved(Result<PathBuf, Arc<std::io::Error>>), // Changed String to PathBuf for path
    TogglePauseResume,
    ManualUrlInputChanged(String),
    ProcessManualUrl,
    ToggleSaveMode,
}

// Inherent methods for App
impl App {
    fn process_next_url(&mut self) -> Command<Message> {
        if self.is_paused {
            self.status_message = String::from("Processing paused. Select 'Resume' to continue processing.");
            return Command::none();
        }
        if self.current_processing_url_index < self.urls_to_process.len() {
            let url_to_convert = self.urls_to_process[self.current_processing_url_index].clone();
            // Update status message immediately for the URL being attempted
            self.status_message = format!(
                "Processing URL {} of {}: {}",
                self.current_processing_url_index + 1,
                self.urls_to_process.len(),
                url_to_convert
            );            let original_url_for_async = url_to_convert.clone();
            
            Command::perform(                
                async move {
                    // Local processing implementation for Rust version
                    // NOTE: This is a simplified version. For full functionality, use the Electron app
                    
                    const MAX_RETRIES: u32 = 3;
                    let client = reqwest::Client::new();
                    let mut last_error: Option<reqwest::Error> = None;

                    for attempt in 0..MAX_RETRIES {
                        match client.get(&original_url_for_async).send().await {
                            Ok(response) => {
                                if response.status().is_success() {
                                    match response.text().await {
                                        Ok(html_content) => {
                                            // Simple HTML to Markdown conversion
                                            // This is a basic implementation - the Electron app has more sophisticated processing
                                            let markdown_content = format!(
                                                "# Content from {}\n\n{}\n\n---\n*Converted locally with basic HTML processing*",
                                                original_url_for_async,
                                                html_content
                                                    .lines()
                                                    .filter(|line| !line.trim().is_empty())
                                                    .take(50) // Limit to first 50 non-empty lines
                                                    .collect::<Vec<_>>()
                                                    .join("\n")
                                            );
                                            return Ok((original_url_for_async.clone(), markdown_content));                                        },
                                        Err(e) => {
                                            last_error = Some(e);
                                            if attempt == MAX_RETRIES - 1 {
                                                return Err(Arc::new(last_error.unwrap()));
                                            }
                                        }
                                    }
                                } else {
                                    let _status = response.status();
                                    let err_for_status = response.error_for_status().unwrap_err();
                                    if attempt == MAX_RETRIES - 1 {
                                        return Err(Arc::new(err_for_status));
                                    }
                                }
                            }
                            Err(e) => {
                                last_error = Some(e);
                                if attempt == MAX_RETRIES - 1 {
                                    return Err(Arc::new(last_error.unwrap()));
                                }
                            }
                        }
                        
                        // Simple delay between retries (1 second)
                        sleep(Duration::from_millis(1000)).await;
                    }                    // Fallback if loop finishes
                    match last_error {
                        Some(e) => Err(Arc::new(e)),
                        None => {
                            // Create a simple reqwest error by making a request to an invalid URL
                            match reqwest::get("http://invalid-url-that-does-not-exist.invalid").await {
                                Err(e) => Err(Arc::new(e)),
                                Ok(_) => unreachable!("Invalid URL should never succeed"),
                            }
                        }
                    }
                },
                Message::UrlProcessed,
            )
        } else {
            Command::perform(async {}, |_| Message::ProcessingComplete)
        }
    }

    fn generate_filename_from_url(&self, url_str: &str) -> String {
        match Url::parse(url_str) {
            Ok(parsed_url) => {
                let path_segment = parsed_url.path_segments().and_then(|iter| iter.last().filter(|s| !s.is_empty()));
                let name_base = match path_segment {
                    Some(segment) => segment.to_string(),
                    None => parsed_url.host_str().unwrap_or("default_host").to_string(),
                };

                let sanitized_name = name_base.chars()
                    .map(|c| match c {
                        'a'..='z' | 'A'..='Z' | '0'..='9' | '.' | '-' | '_' => c,
                        _ => '_', // Replace invalid characters with underscore
                    })
                    .collect::<String>();

                if sanitized_name.is_empty() || sanitized_name.chars().all(|c| c == '_') {
                    "sanitized_empty.md".to_string()
                } else {
                    format!("{}.md", sanitized_name)
                }
            }
            Err(_) => {
                // Attempt to extract something from the string if parsing fails
                let fallback_name = url_str.split('/').last().unwrap_or("parse_error");
                let sanitized_fallback = fallback_name.chars()
                    .map(|c| match c {
                        'a'..='z' | 'A'..='Z' | '0'..='9' | '.' | '-' | '_' => c,
                        _ => '_',
                    })
                    .collect::<String>();
                if sanitized_fallback.is_empty() || sanitized_fallback.chars().all(|c| c == '_') {
                    "parse_error_sanitized.md".to_string()
                } else {
                    format!("{}.md", sanitized_fallback)
                }
            }
        }
    }
}

impl Application for App {
    type Executor = executor::Default;
    type Message = Message;
    type Theme = Theme;
    type Flags = ();

    fn new(_flags: ()) -> (Self, Command<Message>) {
        (
            Self {
                selected_file_path: None,
                status_message: String::from("Welcome! Please select a file or start processing."),
                urls_to_process: Vec::new(),
                processed_markdowns: Vec::new(), // Correctly initialized as empty Vec of tuples
                is_processing: false,
                current_processing_url_index: 0,
                aggregated_markdown: None,
                is_paused: false,
                last_markdown_preview: None,
                save_merged: true,
                manual_url_input: String::new(),
            },
            Command::none(),
        )
    }

    fn title(&self) -> String {
        String::from("URL to Markdown Converter")
    }

    fn update(&mut self, message: Message) -> Command<Message> {
        match message {
            Message::OpenFile => {
                let file = FileDialog::new()
                    .add_filter("Text files", &["txt"])
                    .set_title("Pick a URL file")
                    .pick_file();

                if let Some(path_buf) = file {
                    self.selected_file_path = Some(path_buf.display().to_string());
                    self.status_message = format!("File selected: {}", path_buf.display());
                    self.aggregated_markdown = None;
                    self.last_markdown_preview = None; // Clear preview
                } else {
                    self.status_message = String::from("File selection cancelled.");
                    self.last_markdown_preview = None; // Clear preview
                }
                Command::none()
            }
            Message::StartProcessing => {
                if self.selected_file_path.is_some() && !self.is_processing {
                    self.is_processing = true;
                    self.current_processing_url_index = 0;
                    self.urls_to_process.clear();
                    self.processed_markdowns.clear();
                    self.aggregated_markdown = None;
                    self.last_markdown_preview = None; // Clear preview
                    self.status_message = String::from("Processing URLs..."); // General status

                    let path_for_async = self.selected_file_path.clone();
                    Command::perform(async { path_for_async } , Message::ProcessUrls)

                } else if self.is_processing {
                    self.status_message = String::from("Processing is already ongoing.");
                    Command::none()
                } else {
                    self.status_message = String::from("Please select a file first to start processing.");
                    Command::none()
                }
            }
            Message::ProcessUrls(file_path_option) => {
                if let Some(file_path_str) = file_path_option {
                    // Status already set in StartProcessing or will be updated by UrlsLoaded
                    let path_buf = PathBuf::from(file_path_str);
                    Command::perform(
                        async move {
                            tokio::fs::read_to_string(path_buf)
                                .await
                                .map_err(Arc::new)
                                .map(|contents| {
                                    contents
                                        .lines()
                                        .map(String::from)
                                        .filter(|line| !line.trim().is_empty())
                                        .collect::<Vec<String>>()
                                })
                        },
                        Message::UrlsLoaded,
                    )
                } else {
                    self.status_message = String::from("Error: No file path provided for processing.");
                    self.is_processing = false;
                    Command::none()
                }
            }
            Message::UrlsLoaded(result) => {
                match result {
                    Ok(urls) => {
                        self.urls_to_process = urls;
                        if !self.urls_to_process.is_empty() {
                            self.status_message = format!("Loaded {} URLs. Starting conversion...", self.urls_to_process.len());
                            self.process_next_url()
                        } else {
                            self.status_message = String::from("No URLs found in the selected file. Processing stopped.");
                            self.is_processing = false;
                            Command::none()
                        }
                    }
                    Err(e) => {
                        let file_path_str = self.selected_file_path.as_deref().unwrap_or("Unknown file");
                        self.status_message = format!("Error reading file {}: {}", file_path_str, e);
                        self.is_processing = false;
                        Command::none()
                    }
                }
            }
            Message::UrlProcessed(result) => {
                // The URL that was attempted is at self.current_processing_url_index
                let processed_url = self.urls_to_process.get(self.current_processing_url_index)
                    .cloned()
                    .unwrap_or_else(|| "Unknown URL (index error)".to_string());

                match result {
                    Ok((original_url, markdown_text)) => { // original_url from Ok variant is reliable
                        // We should ideally use original_url if it's guaranteed to be the one we expect.
                        // If there's any doubt, using processed_url (derived from current_processing_url_index) is safer.
                        // For now, let's assume original_url is correct as passed by process_next_url.
                        self.last_markdown_preview = Some(markdown_text.clone());
                        self.processed_markdowns.push((original_url, markdown_text));
                    }
                    Err(e) => {
                        // When an error occurs, the 'original_url' is not in Err variant.
                        // So we use 'processed_url' which we derived from current_processing_url_index.
                        let error_message = format!("Error fetching markdown for URL: {}\nDetails: {}\n", processed_url, e);
                        self.last_markdown_preview = Some(error_message.clone()); // Show error in preview
                        self.processed_markdowns.push((processed_url, error_message));
                    }
                }
                self.current_processing_url_index += 1;
                self.process_next_url()
            }
            Message::ProcessingComplete => {
                self.status_message = format!(
                    "Processing complete. {} results (markdowns/errors) recorded.",
                    self.processed_markdowns.len()
                );
                self.is_processing = false;

                self.aggregated_markdown = Some(
                    self.processed_markdowns
                        .iter()
                        .map(|(_url, content)| content.clone())
                        .collect::<Vec<String>>()
                        .join("\n\n---\n\n")
                );

                self.urls_to_process.clear();
                // self.processed_markdowns.clear(); // Keep for saving, clear after save or new process
                self.current_processing_url_index = 0;

                Command::none()
            }
            Message::TogglePauseResume => {
                self.is_paused = !self.is_paused;
                if self.is_paused {
                    self.status_message = String::from("Processing paused.");
                } else {
                    self.status_message = String::from("Resuming processing...");
                    if self.is_processing {
                        // If processing was active, call process_next_url to resume
                        return self.process_next_url();
                    }
                }
                Command::none()
            }
            Message::ManualUrlInputChanged(url) => {
                self.manual_url_input = url;
                Command::none()
            }
            Message::ProcessManualUrl => {
                if !self.manual_url_input.trim().is_empty() && !self.is_processing {
                    self.is_processing = true;
                    self.is_paused = false; // Ensure processing is not paused
                    self.processed_markdowns.clear();
                    self.aggregated_markdown = None;
                    self.last_markdown_preview = None;
                    self.urls_to_process = vec![self.manual_url_input.trim().to_string()];
                    self.current_processing_url_index = 0;
                    self.status_message = format!("Processing manual URL: {}", self.manual_url_input.trim());
                    self.process_next_url() // Return the command from process_next_url
                } else {
                    if self.is_processing {
                        self.status_message = String::from("Cannot process manual URL: Processing of a file is already ongoing.");
                    } else {
                        self.status_message = String::from("Manual URL is empty. Please enter a URL to process.");
                    }
                    Command::none()
                }
            }
            Message::ToggleSaveMode => {
                self.save_merged = !self.save_merged;
                if self.save_merged {
                    self.status_message = String::from("Save mode: Merged into a single file.");
                } else {
                    self.status_message = String::from("Save mode: Separate files in a directory.");
                }
                Command::none()
            }
            Message::SaveMarkdown => {
                if self.save_merged {
                    // Logic for saving merged file
                    if let Some(markdown_content) = &self.aggregated_markdown {
                        if !markdown_content.is_empty() {
                            let default_filename = self.selected_file_path
                                .as_ref()
                                .map(|p| PathBuf::from(p).file_stem().unwrap_or_default().to_string_lossy().into_owned() + "_markdown.md")
                                .unwrap_or_else(|| String::from("output.md"));

                            let file_handle = FileDialog::new()
                                .set_file_name(&default_filename)
                                .add_filter("Markdown files", &["md", "markdown"])
                                .save_file();

                            if let Some(path_buf) = file_handle {
                                self.status_message = format!("Saving merged markdown to {}...", path_buf.display());
                                let content_to_save = markdown_content.clone();
                                Command::perform(
                                    async move {
                                        tokio::fs::write(&path_buf, content_to_save)
                                            .await
                                            .map(|_| path_buf) // Return PathBuf on success
                                            .map_err(Arc::new)
                                    },
                                    Message::FileSaved,
                                )
                            } else {
                                self.status_message = String::from("Save operation (merged) cancelled by user.");
                                Command::none()
                            }
                        } else {
                            self.status_message = String::from("No markdown content generated to save (merged).");
                            Command::none()
                        }
                    } else {
                        self.status_message = String::from("No aggregated markdown available for merged save. Process URLs first.");
                        Command::none()
                    }
                } else {
                    // Logic for saving separate files
                    if self.processed_markdowns.is_empty() {
                        self.status_message = String::from("No processed markdowns to save separately.");
                        return Command::none();
                    }
                    self.status_message = String::from("Select a directory to save individual markdown files."); // Message before dialog

                    let picked_folder = FileDialog::new().pick_folder();

                    if let Some(dir_path) = picked_folder {
                        // Filter out errors first to count accurately
                        let files_to_save_tuples: Vec<(&String, &String)> = self.processed_markdowns.iter()
                            .filter(|(_, content)| !content.starts_with("Error fetching markdown for URL:"))
                            .map(|(url, content)| (url, content))
                            .collect();

                        if files_to_save_tuples.is_empty() {
                            self.status_message = String::from("No actual content (after filtering errors/empty) to save separately.");
                            return Command::none();
                        }

                        let files_to_save_count = files_to_save_tuples.len();
                        self.status_message = format!("Attempting to save {} markdown files to directory {}...", files_to_save_count, dir_path.display());

                        // Now map to (PathBuf, String) for saving
                        let files_to_save_final: Vec<(PathBuf, String)> = files_to_save_tuples.iter()
                            .map(|(url, content)| {
                                let filename = self.generate_filename_from_url(url);
                                (dir_path.join(filename), (*content).clone())
                            })
                            .collect();

                        // The erroneous block that redefines files_to_save using processed_markdowns_clone is removed.
                        // files_to_save_final is the correct variable to be used by Command::perform.

                        Command::perform(
                            async move {
                                let mut first_error: Option<Arc<std::io::Error>> = None;
                                let mut saved_count = 0;
                                for (file_path, content) in files_to_save_final { // Use files_to_save_final
                                    if let Err(e) = tokio::fs::write(&file_path, &content).await {
                                        if first_error.is_none() {
                                            first_error = Some(Arc::new(e));
                                        }
                                    } else {
                                        saved_count += 1;
                                    }
                                }
                                if saved_count > 0 { Ok(dir_path) } // Return dir path on any success
                                else if let Some(err) = first_error { Err(err) }
                                else { Err(Arc::new(std::io::Error::new(std::io::ErrorKind::Other, "No files to save after filtering."))) }
                            },
                            Message::FileSaved
                        )
                    } else {
                        self.status_message = String::from("Directory selection for separate save cancelled.");
                        Command::none()
                    }
                }
            }
            Message::FileSaved(result) => {
                match result {
                    Ok(path_buf) => { // path_buf is either a file (merged) or a directory (separate)
                        if self.save_merged {
                            self.status_message = format!("Merged markdown successfully saved to {}", path_buf.display());
                        } else {
                            // For separate, path_buf is the directory.
                            // We don't have the count here, so a generic message.
                            self.status_message = format!("Separate markdown files saved to directory {}. Please verify contents.", path_buf.display());
                        }
                    }
                    Err(e) => {
                        if self.save_merged {
                            self.status_message = format!("Failed to save merged markdown: {}", e);
                        } else {
                            self.status_message = format!("Error during separate save operation: {}", e);
                        }
                    }
                }
                Command::none()
            }
        }
    }

    fn view(&self) -> Element<Message> {
        // File operations
        let mut open_button = Button::new(Text::new("Open URL File"));
        if !self.is_processing {
            open_button = open_button.on_press(Message::OpenFile);
        }

        let file_path_display = Text::new(
            self.selected_file_path.as_deref().unwrap_or("No file selected.")
        );

        let mut start_processing_button = Button::new(Text::new(if self.is_processing { "Processing..." } else { "Start Processing File" }));
        if !self.is_processing && self.selected_file_path.is_some() {
            start_processing_button = start_processing_button.on_press(Message::StartProcessing);
        }

        // Manual URL input
        let manual_url_text_input = TextInput::new(
                "Enter URL manually (then press Enter or click button)",
                &self.manual_url_input
            )
            .on_input(Message::ManualUrlInputChanged)
            .on_submit(Message::ProcessManualUrl) // Allows pressing Enter to submit; actual processing is gated in update()
            .padding(10);
        // Note: TextInput doesn't have a simple .disabled() method.
        // Interaction restriction is primarily handled by disabling the associated button
        // and by the self.is_processing check in the Message::ProcessManualUrl handler.

        let mut process_manual_url_button = Button::new(Text::new("Process Manual URL"));
        if !self.is_processing && !self.manual_url_input.trim().is_empty() {
            process_manual_url_button = process_manual_url_button.on_press(Message::ProcessManualUrl);
        }

        // Processing controls
        let mut pause_resume_button = Button::new(Text::new(if self.is_paused { "Resume" } else { "Pause" }));
        if self.is_processing { // Only enable if a batch process is active
            pause_resume_button = pause_resume_button.on_press(Message::TogglePauseResume);
        }        // Save options
        let save_mode_checkbox = Checkbox::new("Save merged into single file", self.save_merged, |_is_checked| Message::ToggleSaveMode);
        // Note: Checkbox doesn't have a simple .disabled(bool) method.
        // If interaction needs to be prevented during self.is_processing,
        // one might conditionally avoid attaching .on_toggle or handle it in the update logic for ToggleSaveMode.
        // For now, it remains interactive, but changing mode during processing has no immediate effect on an ongoing save.

        let mut save_button = Button::new(Text::new("Save Markdown"));
        // Enable if not processing AND ( (merged mode AND aggregated is Some) OR (separate mode AND processed_markdowns is not empty) )
        let can_save_merged = self.save_merged && self.aggregated_markdown.is_some() && !self.aggregated_markdown.as_deref().unwrap_or("").is_empty();
        let can_save_separate = !self.save_merged && !self.processed_markdowns.is_empty();

        if !self.is_processing && (can_save_merged || can_save_separate) {
            save_button = save_button.on_press(Message::SaveMarkdown);
        }

        // Markdown Preview Area
        let markdown_preview = Scrollable::new(
            Text::new(self.last_markdown_preview.as_deref().unwrap_or("No preview available."))
        )
        .height(Length::Fixed(200.0))
        .width(Length::Fill); // Take available width

        // Status message
        let status_text = Text::new(&self.status_message);

        // Layout
        widget::column![
            open_button,
            file_path_display,
            start_processing_button,
            widget::Space::with_height(Length::Fixed(10.0)),
            manual_url_text_input,
            process_manual_url_button,
            widget::Space::with_height(Length::Fixed(10.0)),
            pause_resume_button,
            widget::Space::with_height(Length::Fixed(10.0)),
            save_mode_checkbox,
            save_button,
            widget::Space::with_height(Length::Fixed(10.0)),
            Text::new("Markdown Preview:"),
            markdown_preview,
            widget::Space::with_height(Length::Fixed(10.0)),
            status_text
        ]
        .padding(20)
        .spacing(10)
        .into()
    }
}

pub fn main() -> iced::Result {
    App::run(Settings {
        ..Settings::default()
    })
}
