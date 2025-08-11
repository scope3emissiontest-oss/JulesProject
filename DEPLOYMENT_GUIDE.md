# Carbon Accounting App Deployment Guide

This guide provides step-by-step instructions for deploying the full-stack Carbon Accounting application.

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Supabase Setup](#supabase-setup)
3.  [Backend Deployment (Heroku)](#backend-deployment-heroku)
4.  [Frontend Deployment (Vercel/Netlify)](#frontend-deployment-vercelnetlify)
5.  [AI Service Integration](#ai-service-integration)

---

### Prerequisites

Before you begin, make sure you have the following:

*   **Supabase Account**: To manage the database and authentication. [Sign up here](https://supabase.com/).
*   **Heroku Account**: To host the Python backend. [Sign up here](https://heroku.com/).
*   **Vercel or Netlify Account**: To host the React frontend. [Vercel](https://vercel.com/), [Netlify](https://netlify.com/).
*   **Git**: You must have Git installed to push code to these services.
*   **Heroku CLI**: [Installation Guide](https://devcenter.heroku.com/articles/heroku-cli).
*   **Node.js and npm**: For building the frontend locally if needed.

---

### Supabase Setup

Your Supabase project will serve as the database, authentication service, and file storage for your application.

1.  **Create a New Project**:
    *   Go to your [Supabase Dashboard](https://app.supabase.com/) and click "New project".
    *   Give your project a name and a strong database password.
    *   Choose the region closest to your users.

2.  **Get API Credentials**:
    *   After the project is created, navigate to **Project Settings** > **API**.
    *   You will find your **Project URL** and your **`anon` public key**. Keep these safe; you will need them for both the backend and frontend configuration.

3.  **Set up the Database Schema**:
    *   Go to the **SQL Editor** in the Supabase dashboard.
    *   Click "+ New query".
    *   Open the `backend/schema.sql` file from this repository, copy its entire content, and paste it into the SQL Editor.
    *   Click "Run" to create the necessary tables (`invoices`, `financial_statements`, `emission_factors`, `emission_calculations`).

4.  **Load DEFRA Emission Factors**:
    *   In the **SQL Editor**, create another "+ New query".
    *   Open the `backend/insert_statements.sql` file from this repository.
    *   Copy its content and paste it into the SQL Editor.
    *   Click "Run". This will populate your `emission_factors` table with the required data.

---

### Backend Deployment (Heroku)

1.  **Initialize Heroku**:
    *   Navigate to the root directory of your project in your terminal.
    *   Log in to Heroku:
        ```bash
        heroku login
        ```
    *   Create a new Heroku app. This will also add a `heroku` remote to your Git repository.
        ```bash
        heroku create your-app-name
        ```

2.  **Set Environment Variables**:
    *   Go to your app's "Settings" tab in the Heroku Dashboard and click on "Reveal Config Vars".
    *   Add the following variables:
        *   `SUPABASE_URL`: Your Supabase Project URL.
        *   `SUPABASE_KEY`: Your Supabase `anon` public key.
        *   `GPT_API_KEY`: Your API key for the GPT service you will integrate.

3.  **Deploy the Code**:
    *   This project is set up as a monorepo. To deploy only the `backend` directory, we use the `subtree` push strategy:
        ```bash
        git subtree push --prefix backend heroku main
        ```
    *   This command pushes only the contents of the `backend` folder to Heroku. Heroku will automatically detect the `requirements.txt` and `Procfile` and deploy the Flask application.

---

### Frontend Deployment (Vercel/Netlify)

1.  **Connect Your Repository**:
    *   Create a new project on Vercel or Netlify.
    *   Connect it to the GitHub repository where you have pushed this code.

2.  **Configure Build Settings**:
    *   The platform should detect that you have a React application. You will need to specify the build settings to handle the `frontend` subdirectory.
    *   **Root Directory**: `frontend`
    *   **Build Command**: `npm run build` (or `CI=false npm run build` if you encounter issues with warnings being treated as errors).
    *   **Publish Directory**: `build` (or `frontend/build` depending on the platform's context).

3.  **Set Environment Variables**:
    *   In your Vercel/Netlify project settings, add the following environment variables:
        *   `REACT_APP_SUPABASE_URL`: Your Supabase Project URL.
        *   `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase `anon` public key.
    *   **Important**: The `REACT_APP_` prefix is required for `create-react-app` to expose the variables to your application.

4.  **Deploy**:
    *   Trigger a deployment. Vercel/Netlify will pull the code, run the build command from the `frontend` directory, and deploy the static assets from the `frontend/build` folder.

---

### AI Service Integration

As a final step, you need to replace the placeholder AI logic with your actual GPT-5-Mini integration.

1.  **Edit the Backend Code**:
    *   Open `backend/main.py`.
    *   Locate the `simulate_gpt_call` function.
    *   Replace the content of this function with the actual API call to your GPT service.
    *   Ensure the function returns the extracted data in the same JSON format as the placeholder.

2.  **Redeploy**:
    *   After editing the file, commit the changes and redeploy the backend to Heroku:
        ```bash
        git add .
        git commit -m "feat: Integrate real GPT service"
        git subtree push --prefix backend heroku main
        ```
