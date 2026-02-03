# DriveEase Frontend

A React client for DriveEase that can live in any directory as long as `VITE_API_BASE_URL` points to the backend.

## Highlights
- Public vehicle browsing with live availability
- User registration, login, and profile management
- Booking creation and management
- Admin fleet tools, booking status controls, and image uploads
- Media-friendly cards for vehicle and avatar images

## Feature Coverage
- Auth: Register, login, logout, and JWT storage in local storage
- Vehicles: browse, view availability, admin create/update/delete
- Bookings: create, list my bookings, cancel, admin status updates
- Profile: update name/phone/password, upload avatar
- Media: upload vehicle images and user avatars

## Screens / Sections
- Explore: vehicle gallery and booking form
- My Bookings: booking history with cancel actions
- Profile: profile edits + avatar upload
- Admin Vehicles: CRUD + image upload
- Admin Bookings: status controls

## Environment
Create a `.env` file (see `.env.example`):
```
VITE_API_BASE_URL=http://localhost:8000
```

This is the only coupling between the frontend and backend, so you can move this folder anywhere as long as the base URL points to the API.

## API Expectations
The UI expects the following endpoints on the backend:
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Users:
  - `PATCH /api/users/me`
  - `POST /api/users/me/avatar`
- Vehicles:
  - `GET /api/vehicles`
  - `POST /api/vehicles`
  - `PATCH /api/vehicles/{vehicle_id}`
  - `DELETE /api/vehicles/{vehicle_id}`
  - `POST /api/vehicles/{vehicle_id}/image`
- Bookings:
  - `POST /api/bookings`
  - `GET /api/bookings/me`
  - `PATCH /api/bookings/{booking_id}/cancel`
  - `GET /api/bookings` (admin)
  - `PATCH /api/bookings/{booking_id}/status` (admin)

## Media Handling
- Images returned as `/media/...` are automatically prefixed with `VITE_API_BASE_URL`.
- Uploads expect `multipart/form-data` with a `file` field.
- Supported formats: JPG, PNG, WEBP.

## Demo Flow
1. Register a new user, then log in to create a session.
2. Browse the Explore page and review vehicle availability.
3. Submit a booking request for a vehicle and review it in My Bookings.
4. Update your profile details and upload an avatar.
5. (Admin) Add a vehicle, upload its image, and toggle availability.
6. (Admin) Review bookings and update their status.

## Screenshot Placeholders
- `docs/screens/01-login.png` Login / Register screen
- `docs/screens/02-explore.png` Explore vehicles page
- `docs/screens/03-bookings.png` My bookings list
- `docs/screens/04-profile.png` Profile and avatar upload
- `docs/screens/05-admin-vehicles.png` Admin vehicle management
- `docs/screens/06-admin-bookings.png` Admin booking management

## Setup
1. Copy the environment template:
```
cp .env.example .env
```
2. Update the backend URL if needed:
```
VITE_API_BASE_URL=http://localhost:8000
```
3. Install dependencies:
```
npm install
```
4. Start the dev server:
```
npm run dev
```

## Notes
- The frontend uses `VITE_API_BASE_URL` for all API calls so it can be moved to another folder without breaking.
- For images returned from the API as `/media/...`, the client prefixes the base URL automatically.
