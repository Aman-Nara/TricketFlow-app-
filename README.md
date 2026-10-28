# Here are your Instructions
TicketFlow 🎟️
TicketFlow is a full-stack event and ticketing application organized
into a mobile frontend and a separate backend. The frontend is built
with React Native, Expo, and TypeScript, and uses Expo Router for
file-based navigation.
Project status: The frontend has been started locally in Expo. The
backend framework, database, API configuration, and production
deployment details still need to be confirmed from the backend/
source before documenting them as implemented.

App Areas
The frontend contains routes/screens for: - Discover --- event
discovery and featured event cards. - Create --- a create screen. -
Notifications --- a notifications screen. - Profile --- a user
profile screen. - Tickets --- a ticket-related screen. -
Authentication --- an (auth) route group. - Event and ticket
routes --- separate event and ticket route folders. - Admin
area --- an admin.tsx route.

The exact functionality of each flow depends on the current
implementation and backend integration.
Tech Stack
Frontend
- React Native
- Expo
- TypeScript
- Expo Router
- Metro bundler
- npm
Backend
A separate backend/ directory exists. Check its source files and
dependency manifest to identify the framework, database, API routes, and
required environment variables.
Repository Structure
TicketFlow-app-/
├── backend/                 # Backend application/API
├── frontend/
│   ├── app/
│   │   ├── (auth)/          # Authentication routes
│   │   ├── (tabs)/          # Main tab screens
│   │   │   ├── index.tsx    # Discover/home screen
│   │   │   ├── create.tsx
│   │   │   ├── notifications.tsx
│   │   │   ├── profile.tsx
│   │   │   └── tickets.tsx
│   │   ├── event/           # Event routes
│   │   ├── ticket/          # Ticket routes
│   │   ├── admin.tsx        # Admin route
│   │   └── _layout.tsx      # Root navigation layout
│   ├── assets/
│   ├── constants/
│   ├── package.json
│   ├── app.json
│   └── tsconfig.json
├── README.md
└── test_result.md
Getting Started
Prerequisites
- Node.js (LTS recommended)
- npm
- VS Code (recommended)
- Expo Go for testing on a physical phone, or a configured iOS/Android
  simulator
1. Clone the repository
git clone https://github.com/Aman-Nara/TicketFlow-app-.git
cd TicketFlow-app-
2. Install frontend dependencies
cd frontend
npm install
3. Start Expo
npx expo start
Expo will display a QR code and development options.
- Physical phone: Open Expo Go and scan the QR code, following
  Expo's instructions for your platform.
- Web: Press w if web support is configured for this project.
- Simulator: Use the appropriate Expo option if the simulator is
  installed and configured.
Keep the terminal open while using the app.
Running the Backend
The backend startup command depends on its actual framework and files.
1. Open the backend/ directory.
2. Identify its entry point and dependency file (for example,
   requirements.txt, pyproject.toml, or package.json).
3. Review any .env.example or configuration instructions.
4. Install dependencies and start the backend using the commands
   appropriate to that framework.
5. Configure the frontend API base URL to point to the running backend.
   A physical phone generally cannot reach the computer's localhost;
   use the computer's LAN IP where required.
Do not commit secrets, passwords, tokens, or private API keys to Git.
Troubleshooting
App opens with a JavaScript error
Read the error screen's file path and line number, fix the underlying
code or data, save the file, and reload Expo. For optional event fields,
handle missing values safely instead of assuming every event object
contains them.
Frontend cannot reach the backend
- Confirm the backend process is running.
- Verify the API base URL and port.
- Check CORS settings if running the frontend on web.
- For a physical phone, use the computer's local network IP instead of
  localhost.
- Confirm the phone and computer are on the same network when using
  LAN mode.
Testing
A test_result.md file is included in the repository. Review it
alongside test scripts and configuration in the frontend and backend
directories to determine the available automated tests and how to run
them.
Documentation Roadmap
- Document the backend framework, database, and API endpoints.
- Add environment-variable names and a safe .env.example.
- Document login/signup, event creation, and ticket workflows after
  verifying them.
- Add screenshots or a demo video.
- Add test commands and current test status.
- Document deployment only after it has been verified.
Author
Aman Nara
