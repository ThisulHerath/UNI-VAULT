# UniVault API Endpoint Table

This table summarizes the main REST API endpoints used in UniVault. It focuses on the six core CRUD areas for your final report: **Auth, Notes, Subjects, Reviews, Requests, and Collections**.

---

## 1. Authentication APIs

| Method | Endpoint | Access | Purpose | Request Body / Notes | Response |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a new user account | `multipart/form-data` or JSON with `name`, `email`, `password`, optional `university`, `batch`, `avatar` | Returns user data and JWT token |
| POST | `/api/auth/login` | Public | Log in an existing user | JSON with `email`, `password` | Returns user data and JWT token |
| GET | `/api/auth/me` | Protected | Get current logged-in user profile | Requires Bearer token | Returns current user details |
| PUT | `/api/auth/me` | Protected | Update profile information | `multipart/form-data` with optional `avatar` and profile fields | Returns updated user profile |
| PUT | `/api/auth/password` | Protected | Change account password | JSON with `currentPassword`, `newPassword` | Returns new token and updated user |
| DELETE | `/api/auth/me` | Protected | Delete the current account | Requires Bearer token | Returns success message |

---

## 2. Notes APIs

| Method | Endpoint | Access | Purpose | Request Body / Notes | Response |
|---|---|---|---|---|---|
| GET | `/api/notes` | Public | Get all notes | Optional query filters and search parameters | Returns list of notes |
| GET | `/api/notes/my` | Protected | Get notes uploaded by the logged-in user | Requires Bearer token | Returns the user’s notes |
| GET | `/api/notes/:id` | Public | Get a single note by ID | `:id` must be a valid note ID | Returns note details |
| GET | `/api/notes/:id/file` | Public | Download or view the note file | Returns file URL or file stream | Returns file resource |
| POST | `/api/notes` | Protected | Create/upload a new note | `multipart/form-data` with file and note fields such as title, subject, description | Returns created note |
| PUT | `/api/notes/:id` | Protected | Update a note | `multipart/form-data` with updated fields and optional file | Returns updated note |
| DELETE | `/api/notes/:id` | Protected | Delete a note | Requires note ownership or admin access | Returns success message |
| GET | `/api/notes/:noteId/reviews` | Public | Get reviews for a specific note | `:noteId` must be valid | Returns reviews list |
| POST | `/api/notes/:noteId/reviews` | Protected | Add a review to a note | JSON with `rating` and optional `comment` | Returns created review |

---

## 3. Subjects APIs

| Method | Endpoint | Access | Purpose | Request Body / Notes | Response |
|---|---|---|---|---|---|
| GET | `/api/subjects` | Public | Get all subjects | Optional filters | Returns list of subjects |
| GET | `/api/subjects/my` | Protected | Get subjects created by the current user | Requires Bearer token | Returns user’s subjects |
| GET | `/api/subjects/:id` | Public | Get a subject by ID | `:id` must be valid | Returns subject details |
| POST | `/api/subjects` | Protected | Create a new subject | JSON with subject details such as `name`, `code`, `department`, `semester` | Returns created subject |
| PUT | `/api/subjects/:id` | Protected | Update a subject | JSON with updated subject fields | Returns updated subject |
| DELETE | `/api/subjects/:id` | Protected | Delete a subject | Requires proper permission | Returns success message |

---

## 4. Reviews APIs

| Method | Endpoint | Access | Purpose | Request Body / Notes | Response |
|---|---|---|---|---|---|
| GET | `/api/reviews/:id` | Public | Get a review by ID | `:id` must be valid | Returns review details |
| PUT | `/api/reviews/:id` | Protected | Edit a review | JSON with `rating` and/or `comment` | Returns updated review |
| DELETE | `/api/reviews/:id` | Protected | Delete a review | Requires ownership or moderation permission | Returns success message |
| POST | `/api/reviews/:id/vote` | Protected | Vote a review as helpful or not helpful | JSON with `value: helpful` or `notHelpful` | Returns updated vote counts |
| POST | `/api/reviews/:id/report` | Protected | Report a review | JSON with `reason: spam | offensive | misleading` | Returns report status |

---

## 5. Requests APIs

| Method | Endpoint | Access | Purpose | Request Body / Notes | Response |
|---|---|---|---|---|---|
| GET | `/api/requests` | Public / Optional Auth | Get all note requests | Can return public results and authenticated-user context | Returns list of requests |
| GET | `/api/requests/:id` | Public / Optional Auth | Get a request by ID | `:id` must be valid | Returns request details |
| GET | `/api/requests/:id/file` | Public / Optional Auth | Get attached request file | Returns file URL or file stream | Returns file resource |
| POST | `/api/requests` | Protected | Create a new note request | JSON with request title, description, subject, etc. | Returns created request |
| PUT | `/api/requests/:id` | Protected | Update a request | JSON with updated request fields | Returns updated request |
| POST | `/api/requests/:id/close` | Protected | Close a request | No body required | Returns closed request |
| POST | `/api/requests/:id/reopen` | Protected | Reopen a closed request | No body required | Returns reopened request |
| POST | `/api/requests/:id/fulfill` | Protected | Fulfill a request using a note or file | `multipart/form-data` or note reference | Returns fulfillment result |
| PUT | `/api/requests/:id/fulfillment/visibility` | Protected | Change fulfillment visibility | JSON with `isPublic: true/false` | Returns updated visibility |
| DELETE | `/api/requests/:id` | Protected | Delete a request | Requires ownership or permission | Returns success message |

---

## 6. Collections APIs

| Method | Endpoint | Access | Purpose | Request Body / Notes | Response |
|---|---|---|---|---|---|
| GET | `/api/collections` | Protected | Get the current user’s collections | Requires Bearer token | Returns list of collections |
| GET | `/api/collections/:id` | Protected | Get one collection by ID | `:id` must be valid | Returns collection details |
| POST | `/api/collections` | Protected | Create a new collection | JSON with `name`, optional `description`, etc. | Returns created collection |
| PUT | `/api/collections/:id` | Protected | Update a collection | JSON with updated collection fields | Returns updated collection |
| PUT | `/api/collections/:id/notes` | Protected | Add or remove a note from the collection | JSON with `noteId`, `action: add | remove` | Returns updated collection |
| PUT | `/api/collections/:id/fulfillments` | Protected | Add or remove a request fulfillment | JSON with `requestId`, `action: add | remove` | Returns updated collection |
| DELETE | `/api/collections/:id` | Protected | Delete a collection | Requires ownership | Returns success message |

---

## Main CRUD Summary

| Module | Create | Read | Update | Delete |
|---|---|---|---|---|
| Auth | Register | Get profile | Update profile/password | Delete account |
| Notes | Create note | Get notes / note by ID | Update note | Delete note |
| Subjects | Create subject | Get subjects / subject by ID | Update subject | Delete subject |
| Reviews | Create review | Get reviews / review by ID | Edit review | Delete review |
| Requests | Create request | Get requests / request by ID | Update request / fulfillment visibility | Delete request |
| Collections | Create collection | Get collections / collection by ID | Update collection / notes / fulfillments | Delete collection |

---

## Report Notes

- All protected endpoints require a **Bearer JWT token** in the `Authorization` header.
- Several create/update endpoints use **`multipart/form-data`** when files are uploaded.
- Public endpoints can be viewed without login, but protected endpoints require authentication.
- This table matches the current backend route structure in the UniVault project.

---

## How to Export to PDF

1. Open this file in VS Code: [API_Endpoint_Table.md](API_Endpoint_Table.md)
2. Press `Ctrl+Shift+V` to open Markdown Preview.
3. Use `Ctrl+P` in the preview and choose **Save as PDF**.
4. Save the file as `API_Endpoint_Table.pdf` for your report.

If you want a JPG instead, take a screenshot of the Markdown Preview after hiding the sidebar and zooming in slightly.
