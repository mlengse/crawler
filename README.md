# URL to Markdown Converter

A powerful web-based tool that converts web pages to Markdown format. Built with React and featuring Rust/WASM backend for enhanced performance.

## 🌟 Features

- **Single URL Processing**: Convert individual web pages to Markdown instantly
- **Batch Processing**: Upload a text file with multiple URLs and process them all at once
- **Retry Mechanism**: Configurable retry attempts (1-10) for failed requests
- **Pause/Resume**: Control batch processing with pause and resume functionality
- **Multiple Save Options**: 
  - Save as individual files per URL
  - Save as a single merged file
- **Real-time Preview**: See the converted Markdown in real-time
- **Progress Tracking**: Monitor the progress of batch processing
- **Error Handling**: Comprehensive error reporting and categorization
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Live Demo

Visit the live application: [URL to Markdown Converter](https://client-12lqqviai-anjang-kusuma-netras-projects.vercel.app)

## 🛠️ Technologies Used

- **Frontend**: React 19.1.0
- **Styling**: CSS3 with modern flexbox layouts
- **Backend**: Rust compiled to WebAssembly (WASM)
- **Build Tool**: Create React App
- **Deployment**: Vercel
- **Testing**: Jest, React Testing Library

## 📦 Installation

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crawler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## 🎯 Usage

### Single URL Processing

1. Enter a URL in the input field
2. Click "Process URL"
3. View the converted Markdown in the preview panel
4. Click "Save Markdown" to download the result

### Batch Processing

1. Create a text file with one URL per line
2. Click "Choose File" and select your URL list
3. Configure max retries if needed (default: 3)
4. Click "Start Processing File"
5. Monitor progress and use pause/resume as needed
6. Choose save options:
   - **Merged**: All URLs in one file
   - **Separate**: Individual file per URL

### Configuration Options

- **Max Retries**: Set retry attempts for failed URLs (1-10)
- **Save Mode**: Choose between merged or separate file downloads

## 🏗️ Project Structure

```
crawler/
├── public/                  # Static assets
│   ├── index.html
│   ├── favicon.ico
│   ├── rust_backend.js      # WASM bindings
│   └── rust_backend_bg.wasm # Compiled Rust code
├── src/
│   ├── App.js              # Main application component
│   ├── App.css             # Application styles
│   ├── UrlInputPanel.js    # URL input component
│   ├── StatusDisplay.js    # Status message component
│   ├── PreviewPanel.js     # Markdown preview component
│   ├── ControlsPanel.js    # Control buttons component
│   └── index.js            # React entry point
├── build/                  # Production build output
├── package.json            # Dependencies and scripts
├── vercel.json            # Vercel deployment config
└── README.md              # This file
```

## 🔧 Configuration

### Vercel Deployment

The project includes a `vercel.json` configuration file for seamless deployment:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Environment Variables

No environment variables are required for basic functionality.

## 🎨 Customization

### Styling

Modify `src/App.css` to customize the appearance. The design follows modern UI principles with:
- Clean, minimalist interface
- Responsive design for all screen sizes
- Consistent color scheme and typography
- Accessible form controls

### Adding Features

The component-based architecture makes it easy to add new features:
- Create new components in the `src/` directory
- Import and use them in `App.js`
- Add corresponding styles in `App.css`

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in CI mode:

```bash
npm test -- --coverage --watchAll=false
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Other Platforms

The built application can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Google Cloud Storage

## 🐛 Known Issues

- WASM loading may fall back to JavaScript implementation in some browsers
- Large batch processing may be limited by browser memory
- Some websites may block cross-origin requests (CORS)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Rust and WebAssembly communities
- Vercel for seamless deployment
- All contributors and users

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](../../issues) section
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs

---

**Built with ❤️ using React and Rust/WASM**
