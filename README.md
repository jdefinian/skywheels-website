# Skywheels website — Netlify starter

A responsive React website starter for Skywheels, with:
- Short branded loading screen and responsive navigation
- Home page, customer gallery, customer submission form and team directory
- One manager login (no employee registration)
- Manager moderation dashboard for approve/reject/delete
- Supabase database and private photo storage integration
- Netlify build configuration

## 1. Requirements
- Node.js 20+
- A Netlify account
- A Supabase project

## 2. Run locally
```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## 3. Configure Supabase
1. Create a Supabase project.
2. In Authentication settings, disable public sign-ups.
3. In Authentication > Users, create the single manager account. Give the credentials only to managers.
4. Open SQL Editor and run all of `supabase/schema.sql`.
5. Copy the project URL and anon/public key into `.env`.
6. Never put the Supabase service-role key in this website or in any `VITE_` variable.

**Important security note:** The SQL policies in this starter treat any authenticated user as a manager. This is acceptable only while public sign-up is disabled and only the single manager user is created. Keep the manager password private and enable multi-factor authentication where available. For stronger production security, add a manager role check using Supabase custom claims or a dedicated manager allowlist before launch.

## 4. Configure Netlify
1. Push this project to a private GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Select the repository. Netlify should detect `npm run build` and `dist` from `netlify.toml`.
4. In Site configuration → Environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy the site.

## 5. Personalise before launch
Edit `src/main.jsx`:
- Replace the sample employee names, roles, phone numbers and photo URLs in `staff`.
- Replace the introductory copy with Skywheels' real business history.
- Add actual services, contact details, address and opening hours.
- Confirm that you have permission to publish all staff photos and phone numbers.

The logo URL supplied in the brief is already wired into the loading screen, header and footer. The gold accent is a temporary starting point; adjust CSS variables/colour values in `src/styles.css` to match the precise logo colours.

## 6. Important production follow-up
This is a functional starter, not a fully audited production deployment. Before accepting real customer uploads:
- Add rate-limiting and CAPTCHA/anti-spam controls for public submissions.
- Test that the storage policy only permits public reads for images attached to approved vehicles.
- Add CAPTCHA/anti-spam, privacy notice, retention policy and explicit image consent.
- Test moderation and deletion end-to-end on a staging project.
- Consider using a manager allowlist / custom role instead of relying only on disabling public sign-ups.
