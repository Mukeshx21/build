# landai

React + Vite property recommendation frontend with an Express and OCR backend.

## Development Server

A Vite development server is available on `$PORT` (default 8443).

- Preview URL: the application is available through the preview panel
- Hot reload: changes to source files are reflected automatically

## Project Structure

- `src/main.jsx` - React entrypoint
- `src/App.jsx` - Primary property recommendation application
- `src/App.css` - Application styles
- `src/index.css` - Global styles and font wiring
- `server/` - Express API and SQLite services
- `OCR/` - FastAPI OCR service
- `vite.config.ts` - Vite configuration and API middleware

## Code Quality

- Keep JSX tags closed and braces balanced.
- Preserve existing application styles and interaction behavior.
- Keep frontend and backend changes focused on the requested feature.
