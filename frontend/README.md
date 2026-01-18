# protectSUS Frontend

This frontend is a Next.js application that provides a user interface for the protectSUS security auditing tool.

## Setup Instructions

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   Create a `.env.local` file in the `frontend` directory and add the following:

   ```
   AUTH_GITHUB_ID=your_github_oauth_app_id
   AUTH_GITHUB_SECRET=your_github_oauth_app_secret
   AUTH_SECRET=your_auth_secret
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

## Architecture Overview

The frontend is built with Next.js 14 and follows a feature-driven architecture. The main application logic is organized into the following directories:

- `src/features`: Contains the different views of the application, such as the landing page, repository explorer, and dashboard.
- `src/components`: Contains shared UI components that are used across multiple features.
- `lib`: Contains utility functions and API clients, such as the GitHub API client.

## Tech Stack

- **Framework:** Next.js 14
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS
- **UI Components:** Lucide React

## Contribution Rules

- Follow the existing code style and conventions.
- Ensure that all new code is properly typed with TypeScript.
- Write unit tests for new features and bug fixes.
- Run `npm run lint` and `npm run typecheck` before submitting a pull request.
