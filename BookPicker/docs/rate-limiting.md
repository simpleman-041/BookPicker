# Rate limiting

The API uses the ASP.NET Core rate-limiting middleware with a fixed one-minute window and no queue. Limits are isolated by client IP address:

| Endpoint type | Limit |
| --- | ---: |
| `GET /api/books` and `GET /api/books/{id}` | 120 requests/minute |
| Book create, update, and delete endpoints | 30 requests/minute |
| `POST /api/books/{id}/cover` | 10 requests/minute |

When a limit is exceeded, the API returns `429 Too Many Requests`, a JSON error body, and `Retry-After` when the limiter can calculate a retry time. Requests are not queued, so a delayed request cannot unexpectedly perform a stale book update.

## Reverse proxies and Render

By default, the limiter keys on `HttpContext.Connection.RemoteIpAddress`, which is suitable for local execution and local Docker. A reverse proxy replaces that address, so enable forwarded headers only after configuring the proxy addresses that are allowed to supply `X-Forwarded-For`:

```json
"ForwardedHeaders": {
  "Enabled": true,
  "KnownProxies": ["<trusted-proxy-ip>"]
}
```

Do not clear the trusted-proxy list or enable this setting for arbitrary direct traffic: an untrusted client can forge `X-Forwarded-For` and evade the IP limit. Before deploying to Render, confirm the proxy address/range from Render's current networking documentation and configure it explicitly. The application fails fast if forwarded headers are enabled without a trusted proxy.

## Quick checks

Run the app with demo data and issue repeated requests from one client IP. The 121st read request, 31st ordinary write request, and 11th cover upload request within a minute should return 429. Requests from a different IP use a separate limiter partition.
