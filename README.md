# VTU SmartPrep

A production-style VTU student exam preparation platform built with Next.js, TypeScript, Tailwind CSS, Supabase, and OpenAI.

## Phase 1 MVP

- Project setup
- Authentication scaffold
- Admin dashboard
- Subject creation flow
- Module creation flow
- File upload support
- Document listing
- Student dashboard
- Subject details page
- Notes / PYQ / Solved answers tabs

## Setup

1. Copy `.env.example` to `.env.local`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

For admin resource uploads, create a public Supabase Storage bucket named `subject-resources`
or set `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` to your preferred bucket name.
If your base schema is already applied, run `sql/supabase-storage-setup.sql` instead of rerunning the full schema.
That incremental file now recreates `public.is_admin()` too, so it is safe even if your first schema run stopped early.

## Bulk PYQ PDF Import

To keep PYQ files inside your Supabase storage instead of linking to external folders, place downloaded PDFs in this local folder structure:

```text
pyq-files/
  cse/
    semester-4/
      BCS401-2023.pdf
      BCS401-2022.pdf
  ise/
    semester-5/
      BCS502-2024.pdf
```

File naming rule:

```text
<SUBJECT-CODE>-<YEAR>.pdf
```

Then run:

```bash
node scripts/import-local-pyq-pdfs.mjs
```

You can also pass a different folder:

```bash
node scripts/import-local-pyq-pdfs.mjs /path/to/your/pyq-files
```

The script matches PDFs to Supabase by department folder, semester folder, and subject code. It uploads each PDF to the `subject-resources` bucket and creates a year-wise `pyq` document for students.

If existing PYQ records point to public Google Drive folders, you can try the automatic folder importer:

```bash
node scripts/import-public-drive-folder-pyqs.mjs
```

This script attempts to discover public PDF files inside the Drive folders, upload them to Supabase Storage, and create individual year-wise PYQ records. Google may block discovery or download for some folders, so the local PDF importer above is still the most reliable option.

## Auth notes

- Students and admins use the same `/login` page.
- Admin access is controlled by the `role` column in `public.profiles`.
- After signing up your first real user, promote it with:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

## Supabase schema plan

See `sql/supabase-schema.sql` for the full table design and relationships.

## Deploy on Vercel

This app is ready to deploy on Vercel as a standard Next.js project.

1. Push this repo to GitHub.
2. In Vercel, click `Add New Project`.
3. Import the GitHub repo.
4. Keep the default framework as `Next.js`.
5. Add these environment variables in the Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=subject-resources
```

You can also use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, because the app supports both.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` as a browser/public variable.
This project currently runs with the public Supabase client and row-level security.

6. Click `Deploy`.

After deployment:

1. Open the live site.
2. Sign up with your admin email.
3. Promote that user in Supabase:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

4. Log out and log back in.
5. Open `/admin/resources` and test uploads.

### Existing Supabase project checklist

Before production use, make sure these SQL files have already been applied in Supabase:

- `sql/supabase-schema.sql` for a fresh project
- `sql/supabase-storage-setup.sql` for storage bucket and upload policies on an existing project
- `sql/supabase-admin-activity-setup.sql` if you want shared admin activity history across devices
