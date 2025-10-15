# Cleanup Duplicate Records

## Problem
When syncing GMB data multiple times, duplicate store records were being created because the upsert filter was missing the `brandId` field.

## Solution Applied

### 1. Fixed the Sync Logic (Already Applied)
Updated `/app/api/gmb/sync-data/route.ts` to include `brandId` in the upsert filter for stores:

```typescript
filter: { 
  gmbLocationId: location.id,
  brandId: brand._id  // ✅ Now included
}
```

This prevents **future duplicates** from being created.

### 2. Clean Up Existing Duplicates

#### Option A: Using cURL (Recommended)
Run this command in your terminal:

```bash
curl -X POST http://localhost:3000/api/admin/cleanup-duplicates
```

#### Option B: Using Browser Console
Open your browser's developer console on your dashboard and run:

```javascript
fetch('/api/admin/cleanup-duplicates', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log('Cleanup result:', data))
```

#### Option C: Create a UI Button
Add this to your admin dashboard:

```tsx
<Button 
  onClick={async () => {
    const response = await fetch('/api/admin/cleanup-duplicates', { 
      method: 'POST' 
    })
    const data = await response.json()
    alert(`Cleanup complete! Removed ${data.totalRemoved} duplicates`)
  }}
>
  Clean Up Duplicates
</Button>
```

## What the Cleanup Does

1. **Stores**: Finds duplicate stores with same `gmbLocationId + brandId`
   - Keeps the store with a proper name (not "Store accounts/...")
   - If both have proper names, keeps the most recent one
   - Updates all references (reviews, posts, performance, keywords) to point to the kept store
   - Deletes duplicate stores

2. **Reviews**: Removes duplicates with same `gmbReviewId` (keeps most recent)

3. **Posts**: Removes duplicates with same `gmbPostId` (keeps most recent)

4. **Performance**: Removes duplicates with same `storeId + period` (keeps most recent)

5. **Keywords**: Removes duplicates with same `storeId + keyword + period` (keeps most recent)

## Response Example

```json
{
  "success": true,
  "message": "Duplicate cleanup completed successfully",
  "duplicatesRemoved": {
    "stores": 2,
    "reviews": 0,
    "posts": 0,
    "performance": 0,
    "keywords": 0
  },
  "totalRemoved": 2
}
```

## After Cleanup

1. Run the cleanup endpoint once to remove existing duplicates
2. Future syncs will no longer create duplicates (thanks to the fixed upsert logic)
3. Your database will be clean with only unique records

## Verification

After running cleanup, verify in MongoDB Compass:
- Check stores collection for duplicates
- Look for stores with incorrect names like "Store accounts/..."
- All related records should now point to the correct stores
