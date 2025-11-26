# Icon API Reference

Base URL: `http://localhost:8787`

## Endpoints

### 1. Get Icon URL

Retrieves the best available icon for a given domain or URL.

- **URL**: `/api/icon`
- **Method**: `GET`
- **Query Parameters**:
  - `domain` (string, optional): The domain name (e.g., `google.com`).
  - `url` (string, optional): Full URL (e.g., `https://google.com/foo`).
  - _Note_: Either `domain` or `url` must be provided.

- **Success Response (200 OK)**:

  ```json
  {
    "url": "https://icons.duckduckgo.com/ip3/google.com.ico",
    "source": "duckduckgo",
    "metrics": {
      "fetchMs": 120,
      "storeMs": 5
    }
  }
  ```

- **Error Response (400 Bad Request)**:

  ```json
  {
    "code": "BAD_REQUEST",
    "message": "missing domain or url"
  }
  ```

- **Error Response (500 Internal Server Error)**:
  ```json
  {
    "code": "INTERNAL_ERROR",
    "message": "failed to fetch icon"
  }
  ```

### 2. Health Check

Checks if the service process is running.

- **URL**: `/healthz`
- **Method**: `GET`
- **Response**:
  ```json
  { "status": "ok" }
  ```

### 3. Readiness Check

Checks if the service is ready to accept traffic (e.g., connected to storage).

- **URL**: `/readyz`
- **Method**: `GET`
- **Response**:
  ```json
  { "status": "ready" }
  ```
