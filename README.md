# 1rhino2 Portfolio Site

A modern, organized portfolio website showcasing coding skills and projects.

## 📁 Project Structure

```
1rhino2.github.io/
├── index.html          # Main portfolio page
├── css/
│   └── styles.css      # All styling (improved design, better colors)
├── js/
│   ├── init.js         # Initial page load scripts
│   ├── languages.js    # Language skills rendering
│   └── projects.js     # GitHub projects API integration
├── pages/
│   └── lag.html        # Easter egg page
└── LICENSE
```

## ✨ Improvements Made

### Organization
- **Separated concerns**: CSS, JavaScript, and HTML are now in dedicated files
- **Folder structure**: Organized assets into `css/`, `js/`, and `pages/` directories
- **Modular JavaScript**: Split scripts into logical modules for better maintainability

### Design Enhancements
- **Modern color scheme**: Updated to a cleaner, more professional dark theme
- **Improved typography**: Using Inter font for better readability
- **Better visual hierarchy**: Enhanced spacing, borders, and shadows
- **Smoother interactions**: Refined hover effects and transitions
- **Responsive design**: Mobile-friendly layout that adapts to all screen sizes

### Code Quality
- **Clean HTML**: Removed all inline styles and scripts
- **Maintainable CSS**: Well-organized CSS variables and selectors
- **Reusable components**: Modular JavaScript functions
- **Better performance**: External files can be cached by browsers

## 🚀 Features

- **Auto-updating projects**: Fetches latest GitHub repositories via API
- **Dynamic skills display**: Comprehensive language skills with pros/cons
- **Responsive navigation**: Clean navigation bar with smooth scroll
- **Contact integration**: Direct Discord and GitHub links
- **Easter egg**: Hidden surprise page (Femboys link)

## 🎨 Color Palette

- Background: `#0d1117` (Main), `#161b22` (Sections), `#1c2128` (Cards)
- Primary: `#58a6ff` (Links, headers)
- Success: `#3fb950` (Positive elements)
- Warning: `#d29922` (Attention items)
- Danger: `#f85149` (Critical warnings)
- Text: `#e6edf3` (Main), `#8b949e` (Muted)

## 📝 Usage

Simply open `index.html` in a web browser. All assets load from relative paths.

For GitHub Pages deployment:
1. Push to your repository
2. Enable GitHub Pages in repository settings
3. Select main branch as source
4. Site will be live at `https://yourusername.github.io`

## 🔧 Customization

- **Colors**: Edit CSS variables in `css/styles.css`
- **Content**: Update `index.html` directly
- **Skills**: Modify the `langs` array in `js/languages.js`
- **Projects**: Automatically fetched from GitHub API (change username in `js/projects.js`)

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

Built with ☕ and too many midnight coding sessions.
