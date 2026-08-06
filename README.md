# GymTrack

A minimalist gym log to record workouts, body measurements, and watch your progress compound over time.

## Features

- Google Sign-In authentication via Supabase Auth
- Workout routines with exercise logging and active workout timer
- Exercise picker backed by the [wger](https://wger.de) exercise database (cached locally for 24h)
- Body measurement tracking with progress charts
- Workout templates
- Calendar view of your training history
- Dashboard overview with progress visualization
- Charts powered by Recharts

## Tech Stack

- **React 19** with Create React App
- **Tailwind CSS** for styling
- **Supabase** for authentication and backend
- **wger API** for the exercise database
- **React Router** for routing
- **Recharts** for charts
- **lucide-react** for icons
- **sonner** for toasts
- **date-fns** & **react-date-range** for date handling

## Getting Started

### Prerequisites

- Node.js & npm
- A Supabase project with Google OAuth enabled

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from the example and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   | Variable                      | Description              |
   | ----------------------------- | ------------------------ |
   | `REACT_APP_SUPABASE_URL`      | Your Supabase project URL |
   | `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anon key   |

3. Start the development server:

   ```bash
   npm start
   ```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser. The page reloads when you make changes.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run eject`

Removes the single build dependency from your project. **Note: this is a one-way operation. Once you eject, you can't go back.**

## Project Structure

```
src/
├── App.js                 # Router setup
├── lib/
│   ├── supabase.js        # Supabase client
│   └── wger.js            # wger exercise API wrapper
├── hooks/
│   └── useWgerExercises.js # wger exercises hook with caching
├── ui/
│   ├── components/        # Layout, protected routes, modals, pickers
│   ├── contexts/          # AuthContext
│   └── pages/             # Dashboard, Routines, Measurements, Templates, Calendar, etc.
```
