# Store Management Flow with GMB Integration

This document describes the complete flow for creating stores in GMB, fetching latest stores from GMB, updating the database, and fetching stores from the database.

## Overview

The store management system provides a comprehensive solution for managing stores with Google My Business (GMB) integration. It supports:

1. **Store Creation in GMB** - Create new stores directly in Google My Business
2. **Fetching Latest Stores from GMB** - Retrieve current store data from GMB API
3. **Database Updates** - Sync GMB data to local database
4. **Database Queries** - Fetch stores from local database with optional GMB data

## Architecture

### Core Components

1. **GmbApiServerService** (`lib/server/gmb-api-server.ts`)
   - Handles all GMB API interactions
   - Supports CRUD operations for locations
   - Manages authentication and API calls

2. **StoreManagementService** (`lib/services/store-management-service.ts`)
   - High-level service for store operations
   - Orchestrates GMB and database operations
   - Provides unified interface for store management

3. **API Endpoints**
   - `/api/gmb/stores` - GMB store operations
   - `/api/gmb/stores/[id]` - Individual GMB store operations
   - `/api/gmb/sync-stores` - Sync stores from GMB to database
   - `/api/stores/gmb` - Fetch stores with GMB integration
   - `/api/test-store-flow` - Test the complete flow

## API Endpoints

### 1. GMB Store Operations

#### GET `/api/gmb/stores`
Fetch all GMB stores for the authenticated account.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "accounts/123/locations/456",
      "name": "Store Name",
      "address": "123 Main St, City, State 12345",
      "phone": "+1234567890",
      "website": "https://example.com",
      "status": "Live",
      "category": "Business",
      "gmbConnected": true,
      "accountId": "accounts/123",
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Found 5 GMB stores across 1 accounts"
}
```

#### POST `/api/gmb/stores`
Create a new store in GMB and database.

**Request Body:**
```json
{
  "accountName": "accounts/123",
  "name": "New Store",
  "address": {
    "line1": "123 Main Street",
    "line2": "Suite 100",
    "locality": "City",
    "city": "City",
    "state": "State",
    "postalCode": "12345",
    "countryCode": "US"
  },
  "phone": "+1234567890",
  "website": "https://example.com",
  "primaryCategory": "Business",
  "brandEmail": "brand@example.com",
  "brandName": "Brand Name"
}
```

### 2. Individual Store Operations

#### GET `/api/gmb/stores/[id]`
Get a specific store with latest GMB data.

#### PUT `/api/gmb/stores/[id]`
Update a store in both GMB and database.

#### DELETE `/api/gmb/stores/[id]`
Delete a store from both GMB and database.

### 3. Store Synchronization

#### POST `/api/gmb/sync-stores`
Sync all stores from GMB to database.

**Response:**
```json
{
  "success": true,
  "message": "GMB stores synced successfully",
  "stats": {
    "accounts": 1,
    "storesCreated": 3,
    "storesUpdated": 2,
    "totalStores": 5,
    "errors": 0
  }
}
```

### 4. Database Queries

#### GET `/api/stores/gmb`
Fetch stores with GMB integration from database.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search term
- `status` - Filter by status
- `brandId` - Filter by brand
- `includeGmbData` - Include latest GMB data (boolean)

## Usage Examples

### 1. Create a Store with GMB Integration

```typescript
import { StoreManagementService } from '@/lib/services/store-management-service'

const storeData = {
  name: 'My New Store',
  storeCode: 'STORE-001',
  email: 'store@example.com',
  phone: '+1234567890',
  address: {
    line1: '123 Main Street',
    locality: 'City',
    city: 'City',
    state: 'State',
    postalCode: '12345',
    countryCode: 'US'
  },
  primaryCategory: 'Retail',
  brandEmail: 'brand@example.com',
  brandName: 'My Brand',
  createInGmb: true,
  gmbAccountName: 'accounts/123'
}

const result = await StoreManagementService.createStore(storeData, gmbTokens)
```

### 2. Sync Stores from GMB

```typescript
const syncResult = await StoreManagementService.syncStoresFromGmb(gmbTokens)
console.log(`Synced ${syncResult.data.storesCreated} new stores`)
```

### 3. Fetch Stores with GMB Data

```typescript
const storesResult = await StoreManagementService.getGmbStores(
  1, 10, '', '', '', true, gmbTokens
)
```

## Data Flow

### 1. Store Creation Flow

```
User Request → StoreManagementService.createStore()
    ↓
Validate Data → Check Brand → Create in Database
    ↓
If GMB Integration → GmbApiServerService.createLocation()
    ↓
Update Store with GMB Location ID → Return Result
```

### 2. Store Sync Flow

```
User Request → StoreManagementService.syncStoresFromGmb()
    ↓
Get GMB Accounts → Fetch Locations from Each Account
    ↓
For Each Location → Check if Store Exists in Database
    ↓
If Exists → Update Store Data
If Not Exists → Create New Store
    ↓
Return Sync Statistics
```

### 3. Store Fetch Flow

```
User Request → StoreManagementService.getGmbStores()
    ↓
Query Database for GMB Stores → Apply Filters
    ↓
If includeGmbData → Fetch Latest GMB Data
    ↓
Merge GMB Data with Database Data → Return Results
```

## Error Handling

The system includes comprehensive error handling:

1. **GMB API Errors** - Handled gracefully with fallbacks
2. **Database Errors** - Proper error messages and rollback
3. **Validation Errors** - Clear validation messages
4. **Authentication Errors** - Proper 401 responses

## Testing

Use the test endpoint to verify the complete flow:

```bash
POST /api/test-store-flow
```

This will test:
1. Fetching stores from GMB
2. Syncing stores to database
3. Creating a new store with GMB integration
4. Fetching stores from database

## Configuration

### Environment Variables

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `MONGODB_URI` - MongoDB connection string

### GMB API Permissions

The following GMB API permissions are required:
- `https://www.googleapis.com/auth/business.manage`
- `https://www.googleapis.com/auth/business.readonly`

## Best Practices

1. **Always check GMB authentication** before making API calls
2. **Handle errors gracefully** - GMB API can be unreliable
3. **Use pagination** for large datasets
4. **Cache GMB data** when possible to reduce API calls
5. **Validate data** before creating or updating stores
6. **Log operations** for debugging and monitoring

## Troubleshooting

### Common Issues

1. **GMB Authentication Failed**
   - Check OAuth tokens
   - Verify API permissions
   - Refresh tokens if expired

2. **Store Creation Failed**
   - Check required fields
   - Verify GMB account access
   - Check for duplicate store codes

3. **Sync Issues**
   - Check GMB API rate limits
   - Verify account permissions
   - Check database connectivity

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check console logs for detailed information.

## Future Enhancements

1. **Bulk Operations** - Support for bulk store creation/updates
2. **Real-time Sync** - WebSocket-based real-time updates
3. **Advanced Filtering** - More sophisticated search and filter options
4. **Analytics Integration** - Store performance metrics
5. **Automated Sync** - Scheduled synchronization with GMB
