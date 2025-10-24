// Script to clear browser cache and force fresh data fetch
// Run this in the browser console to clear SWR cache



// Clear all SWR cache
if (typeof window !== 'undefined' && window.swrCache) {
  window.swrCache.clear();
  
}

// Clear localStorage cache
if (typeof window !== 'undefined') {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('swr') || key.includes('performance') || key.includes('cache'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    
  });
  
  
}

// Force page reload to clear all caches

window.location.reload();
