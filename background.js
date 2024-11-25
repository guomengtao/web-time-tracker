// Store current tab info
let currentTab = null;
let startTime = null;
let lastVisitedUrls = new Map(); // Track URLs and their tab IDs

// Format time in minutes and seconds
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

// Get today's date key
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

// Update time and visit count for current tab
async function updateTime() {
    if (!currentTab || !startTime) return;
    
    const currentTime = Date.now();
    const timeSpent = currentTime - startTime;
    const dateKey = getTodayKey();
    
    // Get existing data
    const data = await chrome.storage.local.get(dateKey) || {};
    const dayData = data[dateKey] || {};
    
    // Format URL consistently
    const formattedUrl = currentTab.url.replace(/\/+$/, '');
    
    // Initialize or normalize URL data
    if (!dayData[formattedUrl] || typeof dayData[formattedUrl] === 'number') {
        dayData[formattedUrl] = {
            time: typeof dayData[formattedUrl] === 'number' ? dayData[formattedUrl] : 0,
            visits: dayData[formattedUrl]?.visits || 1
        };
    }
    
    // Update time for current URL
    dayData[formattedUrl].time += timeSpent;
    
    // Save updated data
    await chrome.storage.local.set({ [dateKey]: dayData });
    
    // Reset start time
    startTime = currentTime;
}

// Check if this is a new visit
function isNewVisit(url, tabId) {
    const formattedUrl = url.replace(/\/+$/, '');
    const key = `${formattedUrl}-${tabId}`;
    
    // If URL was never visited in this tab
    if (!lastVisitedUrls.has(key)) {
        lastVisitedUrls.set(key, true);
        return true;
    }
    
    // If URL was visited in this tab but was navigated away from
    const lastUrl = lastVisitedUrls.get(`current-${tabId}`);
    if (lastUrl && lastUrl !== formattedUrl) {
        lastVisitedUrls.set(key, true);
        lastVisitedUrls.set(`current-${tabId}`, formattedUrl);
        return true;
    }
    
    return false;
}

// Increment visit count for URL
async function incrementVisitCount(url, tabId) {
    // Only increment if it's a new visit
    if (!isNewVisit(url, tabId)) {
        return;
    }

    const dateKey = getTodayKey();
    const data = await chrome.storage.local.get(dateKey) || {};
    const dayData = data[dateKey] || {};
    
    const formattedUrl = url.replace(/\/+$/, '');
    
    // Initialize or update URL data
    if (!dayData[formattedUrl]) {
        dayData[formattedUrl] = {
            time: 0,
            visits: 1
        };
    } else {
        // Ensure the data structure is correct and increment visits
        if (typeof dayData[formattedUrl] === 'number') {
            dayData[formattedUrl] = {
                time: dayData[formattedUrl],
                visits: 1
            };
        }
        dayData[formattedUrl].visits = (dayData[formattedUrl].visits || 0) + 1;
    }
    
    // Save updated data
    await chrome.storage.local.set({ [dateKey]: dayData });
}

// Reset visited URLs at midnight
function resetVisitedUrlsAtMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
        lastVisitedUrls.clear();
        resetVisitedUrlsAtMidnight(); // Set up next day's reset
    }, timeUntilMidnight);
}

// Initialize midnight reset
resetVisitedUrlsAtMidnight();

// Handle tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // Save time for previous tab
    await updateTime();
    
    // Get new tab info
    const tab = await chrome.tabs.get(activeInfo.tabId);
    currentTab = tab;
    startTime = Date.now();
    
    // Don't increment visit count on tab switch
    // Only update the current URL for this tab
    const formattedUrl = tab.url.replace(/\/+$/, '');
    lastVisitedUrls.set(`current-${activeInfo.tabId}`, formattedUrl);
});

// Handle URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        await updateTime();
        await incrementVisitCount(tab.url, tabId);
        currentTab = tab;
        startTime = Date.now();
    }
});

// Update time periodically (every 1 second)
setInterval(updateTime, 1000); 