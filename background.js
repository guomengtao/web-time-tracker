// Store current tab info
let currentTab = null;
let startTime = null;
let lastVisitedUrls = new Map(); // Track URLs and their tab IDs
let activeTabId = null; // Currently active tab
let previousTabId = null; // Previously active tab

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

// Update time for current tab
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

// Check if enough time has passed to count as a new visit
function isNewVisitTime(tabId) {
    const lastVisit = tabVisitTimes.get(tabId);
    const now = Date.now();
    
    // If no previous visit or more than 1 second has passed since last visit
    if (!lastVisit || (now - lastVisit) > 1000) {
        tabVisitTimes.set(tabId, now);
        return true;
    }
    return false;
}

// Check if this is a new visit
function shouldCountVisit(url, tabId) {
    const formattedUrl = url.replace(/\/+$/, '');
    
    // If we're switching back to a previously visited tab
    if (previousTabId !== null && 
        tabId !== previousTabId && 
        tabId === activeTabId) {
        return true;
    }

    const key = `${formattedUrl}-${tabId}`;
    const lastUrl = lastVisitedUrls.get(key);
    
    // Count as visit if URL was never visited in this tab
    const shouldCount = !lastUrl || lastUrl.url !== formattedUrl;
    
    // Update tracking
    lastVisitedUrls.set(key, {
        url: formattedUrl,
        timestamp: Date.now()
    });
    
    return shouldCount;
}

// Update tab history
function updateTabHistory(tabId) {
    // Don't add if it's the same tab as the last one
    if (tabHistory.length === 0 || tabHistory[tabHistory.length - 1] !== tabId) {
        tabHistory.push(tabId);
        // Keep only last 5 tab switches
        if (tabHistory.length > 5) {
            tabHistory.shift();
        }
    }
}

// Increment visit count for URL
async function incrementVisitCount(url, tabId) {
    if (!shouldCountVisit(url, tabId)) {
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
        if (typeof dayData[formattedUrl] === 'number') {
            dayData[formattedUrl] = {
                time: dayData[formattedUrl],
                visits: 1
            };
        }
        dayData[formattedUrl].visits++;
    }
    
    await chrome.storage.local.set({ [dateKey]: dayData });
}

// Reset tracking at midnight
function resetVisitedUrlsAtMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
        lastVisitedUrls.clear();
        activeTabId = null;
        previousTabId = null;
        resetVisitedUrlsAtMidnight();
    }, timeUntilMidnight);
}

// Initialize midnight reset
resetVisitedUrlsAtMidnight();

// Handle tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (currentTab) {
        await updateTime();
    }
    
    // Update tab tracking
    previousTabId = activeTabId;
    activeTabId = activeInfo.tabId;
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
        currentTab = tab;
        startTime = Date.now();
        await incrementVisitCount(tab.url, tab.id);
    }
});

// Handle URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active && tab.url) {
        if (currentTab) {
            await updateTime();
        }
        
        // Update tab tracking
        previousTabId = activeTabId;
        activeTabId = tabId;
        
        currentTab = tab;
        startTime = Date.now();
        await incrementVisitCount(tab.url, tabId);
    }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        if (currentTab) {
            await updateTime();
        }
    } else {
        const [tab] = await chrome.tabs.query({ active: true, windowId });
        if (tab && tab.url) {
            // Update tab tracking
            previousTabId = activeTabId;
            activeTabId = tab.id;
            
            currentTab = tab;
            startTime = Date.now();
            await incrementVisitCount(tab.url, tab.id);
        }
    }
});

// Update time periodically (every 1 second)
setInterval(updateTime, 1000); 