// Format time in minutes and seconds
function formatTime(ms) {
    // Handle invalid input
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
        return (urlObj.hostname + urlObj.pathname).replace(/\/+$/, '');
    } catch (e) {
        return url.replace(/\/+$/, '');
    }
}

// Convert old data format to new format
function normalizeData(data) {
    if (typeof data === 'number') {
        // Old format: just time
        return {
            time: data,
            visits: 1
        };
    }
    // New format or invalid data
    return {
        time: data?.time || 0,
        visits: data?.visits || 0
    };
}

// Update only time values without recreating elements
async function updateTimeValues(dateKey) {
    const data = await chrome.storage.local.get(dateKey);
    const dayData = data[dateKey] || {};
    const timeElements = document.querySelectorAll('.url-time');
    
    timeElements.forEach(element => {
        const url = element.dataset.url;
        const urlData = normalizeData(dayData[url]);
        
        const timeElement = element.querySelector('.time');
        timeElement.textContent = formatTime(urlData.time);
        
        const visitsElement = element.querySelector('.visits');
        visitsElement.textContent = `${urlData.visits} visits`;
    });
}

// Initial display of time data
async function displayTimeData(dateKey) {
    const timeList = document.getElementById('timeList');
    timeList.innerHTML = '';
    
    // Get data for selected date
    const data = await chrome.storage.local.get(dateKey);
    const rawDayData = data[dateKey] || {};
    
    // Normalize all data entries
    const dayData = Object.fromEntries(
        Object.entries(rawDayData).map(([url, data]) => [url, normalizeData(data)])
    );
    
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
        div.dataset.url = url;
        
        const urlDiv = document.createElement('div');
        urlDiv.className = 'url';
        urlDiv.textContent = formatUrl(url);
        
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
        
        div.appendChild(urlDiv);
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