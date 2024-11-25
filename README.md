# Web Time Tracker Chrome Extension

A Chrome extension that tracks and displays the time spent on each webpage in real-time. The extension saves daily statistics locally and allows users to view historical data.

[中文说明](README_cn.md) | [日本語](README_JA.md)

## Features

- Real-time tracking of webpage visit duration
- Visit count tracking for each webpage
- Page title display and tracking
- Accurate visit counting for tab switches and revisits
- Daily statistics storage
- Historical data viewing
- Time display in minutes and seconds
- Automatic updates every second
- Local storage using Chrome's storage API
- Midnight auto-reset for daily statistics
- Smart URL truncation for long URLs
- Hover to view full URLs and titles

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon to view today's statistics
2. Use the date selector to view historical data
3. Times and visit counts are automatically updated in real-time
4. Data is saved locally in your browser
5. Visit counts increment when:
   - Opening a new page
   - Refreshing a page
   - Returning to a previously visited tab
   - Reopening a closed tab
6. Hover over URLs to see full addresses
7. Page titles are displayed above URLs
8. Currently active tab is highlighted

## Privacy

All data is stored locally in your Chrome browser. No data is sent to external servers.

## Version History

### v1.0.2
- Added page title tracking and display
- Improved URL display with smart truncation
- Added hover functionality for full URLs
- Enhanced active tab highlighting
- Improved layout and styling

### v1.0.1
- Added visit count tracking for each webpage
- Improved visit counting for tab switches
- Added real-time visit count updates
- Fixed tab switching detection
- Improved UI with cleaner design

### v1.0.0
- Initial release
- Basic time tracking functionality
  