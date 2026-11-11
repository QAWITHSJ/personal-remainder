# Personal Reminder

A Vue.js reminder dashboard for important document and renewal dates.

## Features

- Add reminders such as insurance renewal, marriage events, licence expiry, or medical alerts.
- Save the due date and optional email notification address.
- Works locally with browser storage and is ready for Vercel + Neon Postgres.
- Includes a Vercel API route that can send email via Resend when environment variables are configured.

## Local development

1. Install dependencies:
   npm install
2. Start the app:
   npm run dev
3. Open the local URL shown in the terminal.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables from `.env.example`.
4. Use a Neon Postgres connection string for `POSTGRES_URL`.
5. If you want email reminders, set `RESEND_API_KEY` and `RESEND_FROM`.
6. Vercel cron is already configured in `vercel.json` to run the reminder check every day at 9:00 AM.

## Neon + Vercel setup

- Create a new Neon project and copy the connection string.
- Add it as `POSTGRES_URL` in your Vercel project settings.
- The app will automatically create a reminders table on first access.

## Example reminder entries

- Driving licence renewal: 30 June 2027
- Insurance expiry: 24 March 2027
- Wedding date reminder: 9 December 2026
