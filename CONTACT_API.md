# Contact Query API

Contact queries are handled by the Auth Service.

## Public Submit Query

`POST /api/contact`

Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Order Inquiry",
  "message": "I need help with my order."
}
```

Success:

```json
{
  "success": true,
  "message": "Your message has been submitted successfully."
}
```

Validation error:

```json
{
  "success": false,
  "message": "Validation failed"
}
```

## Admin Query List

`GET /api/admin/contact?page=1&limit=10&search=order&status=pending`

Supported filters:

- `search`: searches name, email, and subject
- `name`
- `email`
- `subject`
- `status`: `pending`, `read`, or `resolved`

Success:

```json
{
  "success": true,
  "queries": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

## Admin Query Details

`GET /api/admin/contact/:id`

## Admin Update Status

`PATCH /api/admin/contact/:id/status`

Body:

```json
{
  "status": "read"
}
```

Allowed admin status updates are `read` and `resolved`.

## Admin Delete Query

`DELETE /api/admin/contact/:id`

## Example Frontend Calls

```js
import axios from "axios";

const authServiceOrigin = new URL(import.meta.env.VITE_AUTH_API_URL).origin;

export const submitContactQuery = (data) =>
  axios.post(`${authServiceOrigin}/api/contact`, data);

export const getContactQueries = (params) =>
  axios.get(`${authServiceOrigin}/api/admin/contact`, {
    params,
    withCredentials: true,
  });

export const getContactQuery = (id) =>
  axios.get(`${authServiceOrigin}/api/admin/contact/${id}`, {
    withCredentials: true,
  });

export const updateContactQueryStatus = (id, status) =>
  axios.patch(
    `${authServiceOrigin}/api/admin/contact/${id}/status`,
    { status },
    { withCredentials: true },
  );

export const deleteContactQuery = (id) =>
  axios.delete(`${authServiceOrigin}/api/admin/contact/${id}`, {
    withCredentials: true,
  });
```
