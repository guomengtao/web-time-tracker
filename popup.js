// Format time in minutes and seconds
function formatTime(ms) {
    if (!ms || isNaN(ms)) {
        return '0s';
    }
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes === 0) {
        return `${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}

// Format URL for display and storage
function formatUrl(url) {
    try {
        const urlObj = new URL(url);
        // Normalize URL by removing trailing slashes and common variations
        let normalizedUrl = (urlObj.hostname + urlObj.pathname).replace(/\/+$/, '');
        // Remove www. prefix if present
        normalizedUrl = normalizedUrl.replace(/^www\./, '');
        return normalizedUrl;
    } catch (e) {
        return url.replace(/\/+$/, '');
    }
}

// Merge duplicate URLs data
function mergeDuplicateUrls(dayData) {
    const mergedData = {};
    
    for (const [url, data] of Object.entries(dayData)) {
        const normalizedUrl = formatUrl(url);
        if (!mergedData[normalizedUrl]) {
            mergedData[normalizedUrl] = {
                time: 0,
                visits: 0,
                title: data.title || ''
            };
        } else {
            // Keep the most recent title if available
            if (data.title) {
                mergedData[normalizedUrl].title = data.title;
            }
        }
        mergedData[normalizedUrl].time += data.time || 0;
        mergedData[normalizedUrl].visits += data.visits || 0;
    }
    
    return mergedData;
}

// Add this function to get current tab's URL
async function getCurrentTabUrl() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
        return formatUrl(tabs[0].url);
    }
    return null;
}

// Update only time values without recreating elements
async function updateTimeValues(dateKey) {
    const data = await chrome.storage.local.get(dateKey);
    const rawDayData = data[dateKey] || {};
    const dayData = mergeDuplicateUrls(rawDayData);
    const timeElements = document.querySelectorAll('.url-time');
    
    // Get current tab URL
    const currentUrl = await getCurrentTabUrl();
    
    timeElements.forEach(element => {
        const url = element.dataset.url;
        const urlData = dayData[url] || { time: 0, visits: 0 };
        
        // Update current-url class
        if (url === currentUrl) {
            element.classList.add('current-url');
        } else {
            element.classList.remove('current-url');
        }
        
        const timeElement = element.querySelector('.time');
        timeElement.textContent = formatTime(urlData.time);
        
        const visitsElement = element.querySelector('.visits');
        visitsElement.textContent = `${urlData.visits} visits`;
    });
}

// Add this function to format URL for display
function formatDisplayUrl(url) {
    try {
        const urlObj = new URL(url);
        let host = urlObj.hostname.replace(/^www\./, '');
        let path = urlObj.pathname;
        
        // If path is too long, truncate it
        if (path.length > 20) {
            path = path.substring(0, 20) + '...';
        }
        
        return host + path;
    } catch (e) {
        return url;
    }
}

// Initial display of time data
async function displayTimeData(dateKey) {
    const timeList = document.getElementById('timeList');
    timeList.innerHTML = '';
    
    // Get current tab URL
    const currentUrl = await getCurrentTabUrl();
    
    // Get data for selected date
    const data = await chrome.storage.local.get(dateKey);
    const rawDayData = data[dateKey] || {};
    
    // Merge and normalize data
    const dayData = mergeDuplicateUrls(rawDayData);
    
    // Sort URLs by time spent (descending)
    const sortedUrls = Object.entries(dayData)
        .sort(([, a], [, b]) => b.time - a.time);
    
    if (sortedUrls.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'no-data';
        noData.textContent = 'No data for this date';
        timeList.appendChild(noData);
        return;
    }
    
    // Display each URL and its data
    for (const [url, urlData] of sortedUrls) {
        const div = document.createElement('div');
        div.className = 'url-time';
        if (url === currentUrl) {
            div.classList.add('current-url');
        }
        div.dataset.url = url;
        
        const urlContainer = document.createElement('div');
        urlContainer.className = 'url-container';
        
        // Add title if it exists and is different from URL
        if (urlData.title && urlData.title !== url) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'page-title';
            titleDiv.textContent = urlData.title;
            titleDiv.title = urlData.title; // Show full title on hover
            urlContainer.appendChild(titleDiv);
        }
        
        const urlDiv = document.createElement('div');
        urlDiv.className = 'url';
        urlDiv.textContent = formatDisplayUrl(url);
        urlDiv.title = url; // Show full URL on hover
        
        urlContainer.appendChild(urlDiv);
        
        const statsDiv = document.createElement('div');
        statsDiv.className = 'stats';
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time';
        timeDiv.textContent = formatTime(urlData.time);
        
        const visitsDiv = document.createElement('div');
        visitsDiv.className = 'visits';
        visitsDiv.textContent = `${urlData.visits} visits`;
        
        statsDiv.appendChild(timeDiv);
        statsDiv.appendChild(visitsDiv);
        
        div.appendChild(urlContainer);
        div.appendChild(statsDiv);
        timeList.appendChild(div);
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    // Set date input to today
    const dateSelect = document.getElementById('dateSelect');
    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;
    dateSelect.max = today; // Prevent selecting future dates
    
    // Show today's data
    displayTimeData(today);
    
    // Handle date changes
    dateSelect.addEventListener('change', (e) => {
        displayTimeData(e.target.value);
    });
});

// Update only time values every second
setInterval(() => {
    const dateSelect = document.getElementById('dateSelect');
    const selectedDate = dateSelect.value;
    const today = new Date().toISOString().split('T')[0];
    
    // Only update times if viewing today's data
    if (selectedDate === today) {
        updateTimeValues(selectedDate);
    }
}, 1000); 