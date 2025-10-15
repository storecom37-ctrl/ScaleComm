// Script to clear browser cache and force fresh data fetch
// Run this in the browser console to clear SWR cache

console.log('🧹 Clearing SWR cache and forcing fresh data fetch...');

// Clear all SWR cache
if (typeof window !== 'undefined' && window.swrCache) {
  window.swrCache.clear();
  console.log('✅ SWR cache cleared');
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
    console.log(`🗑️ Removed cache key: ${key}`);
  });
  
  console.log('✅ localStorage cache cleared');
}

// Force page reload to clear all caches
console.log('🔄 Reloading page to clear all caches...');
window.location.reload();
