# Local Deployment Guide

This guide provides instructions on how to set up and run this application locally.

## 1. Supabase Setup

Follow these steps to set up your Supabase project:

1.  **Create a new Supabase project:**
    *   Go to [supabase.com](https://supabase.com/) and sign in.
    *   Click on "New project" and choose your organization.
    *   Fill in the project details (name, database password, region) and click "Create new project".

2.  **Get your Project URL and anon key:**
    *   In your Supabase project dashboard, go to "Project Settings" > "API".
    *   You will find your "Project URL" and "Project API keys" (use the `anon` key).

3.  **Create the database tables:**
    *   Go to the "SQL Editor" in your Supabase project dashboard.
    *   Click on "New query".
    *   Copy the entire content of the `backend/schema.sql` file and paste it into the SQL editor.
    *   Click "Run" to create the tables.

4.  **Create the 'documents' storage bucket:**
    *   Go to the "Storage" section in your Supabase project dashboard.
    *   Click on "New bucket".
    *   Enter `documents` as the bucket name and make sure it's a **public** bucket.

5.  **Populate the `emission_factors` table:**
    *   In the "SQL Editor", run the SQL commands from the following files in order:
        *   `backend/insert_statements_part_1.sql`
        *   `backend/insert_statements_part_2.sql`
        *   ...and so on for all the `insert_statements_part_*.sql` files.

## 2. Backend Setup

1.  **Create the environment file:**
    *   Navigate to the `backend` directory.
    *   Create a new file named `.env`.
    *   Add the following content to the `.env` file, replacing the placeholder values with your actual Supabase Project URL and anon key:
        ```
        SUPABASE_URL="your_supabase_url"
        SUPABASE_KEY="your_supabase_anon_key"
        ```

2.  **Install dependencies:**
    *   Open your terminal and navigate to the `backend` directory.
    *   Run the following command to install the required Python packages:
        ```
        pip install -r requirements.txt
        ```

3.  **Run the backend server:**
    *   In the same terminal, run the following command:
        ```
        python main.py
        ```
    *   The backend server should now be running on `http://localhost:5000`.

## 3. Frontend Setup

1.  **Create the environment file:**
    *   Navigate to the `frontend` directory.
    *   Create a new file named `.env`.
    *   Add the following content to the `.env` file, replacing the placeholder values with your actual Supabase Project URL and anon key:
        ```
        REACT_APP_SUPABASE_URL="your_supabase_url"
        REACT_APP_SUPABASE_ANON_KEY="your_supabase_anon_key"
        ```

2.  **Install dependencies:**
    *   Open your terminal and navigate to the `frontend` directory.
    *   Run the following command to install the required Node.js packages:
        ```
        npm install
        ```

3.  **Run the frontend server:**
    *   In the same terminal, run the following command:
        ```
        npm start
        ```
    *   The frontend development server should now be running and will open automatically in your browser at `http://localhost:3000`.
