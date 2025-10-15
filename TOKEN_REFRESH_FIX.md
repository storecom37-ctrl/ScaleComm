# Token Refresh Fix

## Problem Summary

The application was experiencing token refresh issues where OAuth tokens would expire and fail to refresh properly, causing authentication errors and requiring users to reconnect to Google My Business repeatedly.

## Root Causes Identified

1. **No Token Persistence After Refresh**
   - When `GmbApiServerService` refreshed tokens internally, they were only updated in memory
   - The HTTP-only cookies containing the tokens were never updated
   - Next request would still use the expired token from the cookie

2. **Field Name Inconsistency**
   - Code checked for `expiry_date` but cookies stored `expires_at`
   - Different parts of the codebase used different field names
   - This caused expiry checks to fail silently

3. **No Centralized Token Management**
   - Each API endpoint handled token refresh differently
   - No consistent way to check if tokens needed refresh
   - Refreshed tokens weren't propagated back to the client

4. **Local Refresh Without Persistence**
   - `gmb-api-server.ts` had token refresh logic but it only worked for single requests
   - Refreshed credentials weren't saved, so the next API call would fail again

## Solution Implemented

### 1. Centralized Token Refresh Utility (`lib/utils/token-refresh.ts`)

Created a new utility file that provides:

- **`isTokenExpired(tokens)`**: Checks if a token is expired or about to expire (5-minute buffer)
- **`refreshAndPersistTokens(currentTokens)`**: Refreshes tokens AND updates the HTTP-only cookie
- **`getAndRefreshTokensIfNeeded()`**: Gets tokens from cookies and automatically refreshes if needed

### 2. Updated Auth Helpers (`lib/utils/auth-helpers.ts`)

Modified `getGmbTokensFromRequest()` to:
- Use the centralized token refresh utility
- Automatically refresh expired tokens before returning them
- Ensure all API routes get valid tokens

### 3. Normalized Token Fields

Updated all token-related code to support both field names:
- `expires_at` (used by Next.js/cookie storage)
- `expiry_date` (used by Google APIs)

### 4. Simplified GMB API Server (`lib/server/gmb-api-server.ts`)

Removed local token refresh logic since it wasn't persisting changes:
- Removed in-memory refresh attempts
- Now expects valid tokens from the auth helper
- Returns clear error messages when tokens expire

### 5. Updated API Routes

- **`/api/auth/gmb/tokens`**: Normalizes expiry fields when storing/retrieving tokens
- **`/api/auth/gmb/refresh`**: Uses centralized refresh utility
- All GMB API routes: Automatically get refreshed tokens via `getGmbTokensFromRequest()`

## How It Works Now

### Token Flow

```
1. User makes API request
   ↓
2. API route calls getGmbTokensFromRequest()
   ↓
3. Token utility checks if token is expired
   ↓
4. If expired → Refresh token using Google OAuth
   ↓
5. Update HTTP-only cookie with new token
   ↓
6. Return fresh token to API route
   ↓
7. API route uses fresh token for GMB API calls
```

### Automatic Refresh

Tokens are now automatically refreshed when:
- They have expired
- They will expire within 5 minutes
- Any API route requests them via `getGmbTokensFromRequest()`

### Persistence

Refreshed tokens are now:
- ✅ Saved to HTTP-only cookies
- ✅ Available for subsequent requests
- ✅ Automatically used by all API routes

## Benefits

1. **Seamless Experience**: Users don't need to reconnect as often
2. **Automatic Token Management**: No manual refresh needed
3. **Centralized Logic**: All token handling in one place
4. **Consistent Behavior**: All API routes behave the same way
5. **Better Error Messages**: Clear feedback when reconnection is needed

## Testing

To verify the fix is working:

1. **Check Logs**: Look for these messages in the console:
   - `🔄 Refreshing access token...`
   - `✅ Access token refreshed and persisted`

2. **Monitor Cookies**: Use browser dev tools to verify `gmb-tokens` cookie is updated

3. **Long Sessions**: Leave the app open for > 1 hour and verify GMB operations still work

4. **Token Expiry**: Wait for token to expire and verify automatic refresh on next API call

## Migration Notes

### For Developers

- **No code changes needed** in most places
- `getGmbTokensFromRequest()` now automatically handles refresh
- Remove any manual token refresh logic in your code

### Breaking Changes

None. This is a backward-compatible fix.

### New Dependencies

- `lib/utils/token-refresh.ts` - New centralized utility

## Error Handling

The system now handles these scenarios:

1. **Token Expired**: Automatically refreshes and retries
2. **Refresh Token Invalid**: Returns clear error, user must reconnect
3. **No Tokens**: Returns null, user must connect to GMB
4. **Network Issues**: Retries with exponential backoff

## Troubleshooting

### Issue: Still getting "token expired" errors

**Solution**: 
- Clear your browser cookies
- Disconnect and reconnect to GMB
- Check that refresh tokens are being stored (look in cookie)

### Issue: Tokens refresh but API still fails

**Solution**:
- Verify the Google OAuth credentials are correct
- Check that GMB API is enabled in Google Cloud Console
- Ensure refresh token hasn't been revoked

### Issue: Frequent reconnections required

**Solution**:
- Check if refresh tokens are being saved (should have `refresh_token` field)
- Verify cookie expiry is set to 30 days
- Ensure OAuth flow uses `access_type: 'offline'` and `prompt: 'consent'`

## Files Modified

- ✅ `lib/utils/token-refresh.ts` (NEW)
- ✅ `lib/utils/auth-helpers.ts`
- ✅ `lib/server/gmb-api-server.ts`
- ✅ `lib/server/google-oauth-server.ts`
- ✅ `app/api/auth/gmb/tokens/route.ts`
- ✅ `app/api/auth/gmb/refresh/route.ts`

## Next Steps

1. Monitor production logs for token refresh patterns
2. Consider adding token refresh analytics/metrics
3. Add unit tests for token refresh utility
4. Consider implementing token pre-refresh (refresh before expiry)

## Related Documentation

- [Google OAuth 2.0 for Server to Server Applications](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Google My Business API Authentication](https://developers.google.com/my-business/content/basic-setup)




