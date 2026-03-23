# Error Handling Middleware

## Overview

SoroMint implements a centralized error handling middleware to standardize all API error responses. This prevents internal server details from leaking to clients and provides a consistent error response format across all endpoints.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Route Handler  │────▶│  asyncHandler    │────▶│  errorHandler   │
│  (throws error) │     │  (catches async) │     │  (formats &     │
└─────────────────┘     └──────────────────┘     │   responds)     │
                                                 └─────────────────┘
```

## Components

### 1. `errorHandler` Middleware

The main error handling middleware that:
- Catches all errors passed to `next(error)`
- Logs full error details to console (development only)
- Returns standardized JSON responses
- Omits sensitive details in production

**Location:** `server/middleware/error-handler.js`

### 2. `AppError` Class

Custom error class for application-specific errors with HTTP status codes.

```javascript
const { AppError } = require('./middleware/error-handler');

// Usage
throw new AppError('Resource not found', 404, 'NOT_FOUND');
```

### 3. `asyncHandler` Wrapper

Wrapper for async route handlers to automatically catch errors.

```javascript
const { asyncHandler } = require('./middleware/error-handler');

// Before (verbose)
app.get('/tokens', async (req, res, next) => {
  try {
    const tokens = await Token.find();
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

// After (clean)
app.get('/tokens', asyncHandler(async (req, res) => {
  const tokens = await Token.find();
  res.json(tokens);
}));
```

### 4. `notFoundHandler`

Catches requests to undefined routes and returns a 404 error.

## Standard Error Response Format

All errors return a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Development Mode

In development (`NODE_ENV !== 'production'`), responses include the stack trace:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "status": 400,
  "stack": "Error: Validation failed\n    at ..."
}
```

## Error Codes Reference

| Code | Status | Description |
|------|--------|-------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_ID` | 400 | Invalid resource ID format |
| `DUPLICATE_KEY` | 409 | Resource already exists |
| `NOT_FOUND` | 404 | Resource not found |
| `ROUTE_NOT_FOUND` | 404 | API endpoint not found |
| `INVALID_TOKEN` | 401 | Invalid authentication token |
| `TOKEN_EXPIRED` | 401 | Authentication token expired |
| `SYNTAX_ERROR` | 400 | Invalid request payload (JSON parse error) |

## Usage Examples

### Creating Custom Errors

```javascript
const { AppError, asyncHandler } = require('./middleware/error-handler');

app.post('/api/tokens', asyncHandler(async (req, res) => {
  const { name, symbol, ownerPublicKey } = req.body;
  
  if (!name || !symbol || !ownerPublicKey) {
    throw new AppError(
      'Missing required fields: name, symbol, and ownerPublicKey',
      400,
      'VALIDATION_ERROR'
    );
  }
  
  const token = new Token({ name, symbol, ownerPublicKey });
  await token.save();
  res.json(token);
}));
```

### Handling Database Errors

Mongoose errors are automatically handled:

```javascript
// ValidationError -> 400 VALIDATION_ERROR
// CastError -> 400 INVALID_ID
// DuplicateKeyError -> 409 DUPLICATE_KEY
```

### 404 for Undefined Routes

The `notFoundHandler` automatically catches undefined routes:

```javascript
// Request to /api/undefined-route returns:
// { "error": "Route /api/undefined-route not found", "code": "ROUTE_NOT_FOUND", "status": 404 }
```

## Middleware Order

The error handling middleware must be registered **last** in the Express app:

```javascript
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

// ... routes ...

// 404 handler (before errorHandler)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode (`production` or `development`) | `development` |

## Security Considerations

### Production Mode

In production, error responses **never** include:
- Stack traces
- Internal error messages
- Database details
- File paths

### Development Mode

In development, full stack traces are included to aid debugging.

## Testing

### Manual Testing

1. **Test validation error:**
```bash
curl -X POST http://localhost:5000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response (400):
```json
{
  "error": "Missing required fields: name, symbol, and ownerPublicKey are required",
  "code": "VALIDATION_ERROR",
  "status": 400
}
```

2. **Test 404:**
```bash
curl http://localhost:5000/api/nonexistent
```

Expected response (404):
```json
{
  "error": "Route /api/nonexistent not found",
  "code": "ROUTE_NOT_FOUND",
  "status": 404
}
```

3. **Test internal error:**
```bash
# Trigger an unhandled error in any route
```

Expected response (500):
```json
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "status": 500
}
```

### Automated Testing

Run the test suite:

```bash
cd server
npm test
```

## Best Practices

1. **Always use `asyncHandler`** for async route handlers
2. **Throw `AppError`** for known application errors
3. **Let the middleware handle** Mongoose errors automatically
4. **Never expose** internal errors directly to clients
5. **Log all errors** for monitoring and debugging
6. **Use descriptive error codes** for client-side handling

## Migration Guide

### Before (Old Pattern)

```javascript
app.get('/tokens', async (req, res) => {
  try {
    const tokens = await Token.find();
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### After (New Pattern)

```javascript
const { asyncHandler } = require('./middleware/error-handler');

app.get('/tokens', asyncHandler(async (req, res) => {
  const tokens = await Token.find();
  res.json(tokens);
}));
```

## Future Enhancements

- [ ] Error tracking integration (Sentry, LogRocket)
- [ ] Rate limiting error responses
- [ ] Custom error pages for browser clients
- [ ] Error analytics and metrics
- [ ] Graceful shutdown on unhandled errors

## Related Files

- `server/middleware/error-handler.js` - Main middleware implementation
- `server/index.js` - Express app configuration
- `server/tests/middleware/error-handler.test.js` - Test suite
