use iced::widget::{Button, Text}; // Explicitly import Button and Text
use iced::{executor, Application, Command, Element, Settings, Theme, widget}; // Added widget module for column! macro
use rfd::FileDialog;
use std::path::PathBuf;
use std::sync::Arc;

// Define the main application struct
struct App {
    selected_file_path: Option<String>,
    status_message: String,
    urls_to_process: Vec<String>,
    processed_markdowns: Vec<String>,
    is_processing: bool,
    current_processing_url_index: usize,
    aggregated_markdown: Option<String>,
}

// Define messages for GUI interactions
#[derive(Debug, Clone)]
enum Message {
    OpenFile,
    StartProcessing,
    ProcessUrls(Option<String>),
    UrlsLoaded(Result<Vec<String>, Arc<std::io::Error>>),
    UrlProcessed(Result<String, Arc<reqwest::Error>>),
    ProcessingComplete,
    SaveMarkdown,
    FileSaved(Result<PathBuf, Arc<std::io::Error>>), // Changed String to PathBuf for path
}

// Inherent methods for App
impl App {
    fn process_next_url(&mut self) -> Command<Message> {
        if self.current_processing_url_index < self.urls_to_process.len() {
            let url_to_convert = self.urls_to_process[self.current_processing_url_index].clone();
            // Update status message immediately for the URL being attempted
            self.status_message = format!(
                "Processing URL {} of {}: {}",
                self.current_processing_url_index + 1,
                self.urls_to_process.len(),
                url_to_convert
            );

            let encoded_url = urlencoding::encode(&url_to_convert);
            let request_url = format!(
                "https://urltomarkdown.herokuapp.com/?url={}&title=true&links=true&clean=true",
                encoded_url
            );

            Command::perform(
                async move {
                    match reqwest::get(&request_url).await {
                        Ok(response) => response.text().await.map_err(Arc::new),
                        Err(e) => Err(Arc::new(e)),
                    }
                },
                Message::UrlProcessed,
            )
        } else {
            Command::perform(async {}, |_| Message::ProcessingComplete)
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
                processed_markdowns: Vec::new(),
                is_processing: false,
                current_processing_url_index: 0,
                aggregated_markdown: None,
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
                } else {
                    self.status_message = String::from("File selection cancelled.");
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
                // current_processing_url_index is the one that was just attempted
                let failed_url_index = self.current_processing_url_index;

                match result {
                    Ok(markdown_text) => {
                        self.processed_markdowns.push(markdown_text);
                        // Status message is already set by process_next_url or will be for the next one
                    }
                    Err(e) => {
                        let error_url = self.urls_to_process.get(failed_url_index)
                            .map_or_else(|| "unknown URL (index out of bounds)", |url| url.as_str());
                        let error_details = format!("Error fetching markdown for URL: {}\nDetails: {}\n", error_url, e);
                        self.processed_markdowns.push(error_details);
                        // Status message will be updated by the next call to process_next_url or ProcessingComplete
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

                self.aggregated_markdown = Some(self.processed_markdowns.join("\n\n---\n\n"));

                self.urls_to_process.clear();
                // self.processed_markdowns.clear(); // Keep for saving, clear after save or new process
                self.current_processing_url_index = 0;

                Command::none()
            }
            Message::SaveMarkdown => {
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
                            self.status_message = format!("Saving markdown to {}...", path_buf.display());
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
                            self.status_message = String::from("Save operation cancelled by user.");
                            Command::none()
                        }
                    } else {
                        self.status_message = String::from("No markdown content generated to save.");
                        Command::none()
                    }
                } else {
                    self.status_message = String::from("No aggregated markdown available. Process URLs first.");
                    Command::none()
                }
            }
            Message::FileSaved(result) => {
                match result {
                    Ok(path_buf) => {
                        self.status_message = format!("Markdown successfully saved to {}", path_buf.display());
                    }
                    Err(e) => {
                        // PathBuf might not be available on error if save_file itself failed before path known
                        self.status_message = format!("Failed to save markdown: {}", e);
                    }
                }
                Command::none()
            }
        }
    }

    fn view(&self) -> Element<Message> {
        let file_path_display = if let Some(path) = &self.selected_file_path {
            path.as_str()
        } else {
            "No file selected."
        };

        let process_button_text = if self.is_processing {
            "Processing..."
        } else {
            "Start Processing"
        };

        let mut open_button = Button::new(Text::new("Open URL File"));
        if !self.is_processing {
            open_button = open_button.on_press(Message::OpenFile);
        }

        let mut process_button = Button::new(Text::new(process_button_text));
        if !self.is_processing && self.selected_file_path.is_some() {
            process_button = process_button.on_press(Message::StartProcessing);
        }

        let mut save_button = Button::new(Text::new("Save Markdown"));
        if !self.is_processing && self.aggregated_markdown.is_some() {
            save_button = save_button.on_press(Message::SaveMarkdown);
        }

        widget::column![ // Using iced::widget::column directly
            open_button,
            Text::new(file_path_display),
            process_button,
            save_button,
            Text::new(&self.status_message)
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
