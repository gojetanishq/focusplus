# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## FocusPlus Features

### Smart Revision Engine
Automatically detects weak topics based on your study patterns and generates a personalized revision plan.

**How it works:**
1. Navigate to the **Planner** page
2. Find the **Smart Revision** panel in the right sidebar
3. Click **Generate Revision Plan**
4. View your weak topics ranked by weakness score
5. Click **Add to Timetable** to schedule revision sessions

**Weakness scoring factors:**
- Missed sessions (40% weight)
- AI difficulty ratings (30% weight)
- Incomplete tasks (20% weight)
- Student difficulty reviews (10% weight)

### Missed Session Auto-Replanner
When you miss a study session, the system automatically reschedules it to the next available day.

**How it works:**
1. When a session is marked as missed, the system calls `/timetable/replan`
2. The algorithm finds the next day with available capacity
3. A modal shows the before/after comparison with an explanation
4. The new session is automatically added to your schedule

**Replan logic:**
- Respects maximum 4 sessions per day
- Prefers days with lighter workload
- Provides human-readable explanations for each move

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
