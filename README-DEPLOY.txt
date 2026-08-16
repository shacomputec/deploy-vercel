═══════════════════════════════════════════════════════════════════════
  GES SCHOOL MIS — READY-TO-DEPLOY FOLDER FOR VERCEL (8 MB)
═══════════════════════════════════════════════════════════════════════

WHAT THIS IS
  This folder (deploy-vercel/) contains ONLY the files Vercel needs to
  build and run the school website + management system online:
  src/  prisma/ (schema + seed)  public/ (images, no installer binaries)
  package.json  package-lock.json  vercel.json  next.config.mjs
  tailwind.config.ts  postcss.config.mjs  tsconfig.json  .vercelignore

  prisma/schema.prisma here is ALREADY switched to PostgreSQL (the cloud
  database). The main project folder keeps SQLite for your local/desktop
  use — never upload that one as-is.

  EXCLUDED on purpose (they would blow Vercel's free 100 MB limit and are
  not needed by the online site): node_modules, .env (your secrets),
  .next, the 350 MB Setup.exe (public/desktop), the 119 MB APKs
  (public/mobile), all *.db databases, and release zips.
  → The desktop app + Android APK downloads stay served from your school's
    local server; the online site links to them.

WHAT YOU MUST DO FIRST (the cloud database)
  1. Create a free database at https://neon.tech  (Sign up → Create project)
     → Connection Details → copy the connection string:
       postgresql://user:password@ep-xxxx...neon.tech/neondb?sslmode=require
  2. From THIS folder, in a terminal (Windows: Git Bash or CMD), run:

     set DATABASE_URL=postgresql://user:password@ep-xxxx...neon.tech/neondb?sslmode=require
     npm install
     npx prisma db push
     set SEED_ADMIN_EMAIL=your@email.com
     set SEED_ADMIN_PASSWORD=Your-Strong-Password
     npx prisma db seed

     (Mac/Linux: replace "set X=Y" with "export X=Y")
     This creates all tables, the full curriculum (Crèche→SHS, subjects,
     NaCCA programmes, academic years 2024/2025→2032/2033) and your
     Developer account. Run it ONCE.

HOW TO PUT THIS FOLDER ONLINE — choose ONE route:

  ROUTE A — GitHub (recommended, free, auto-updates on every push)
    1. Create a repo at https://github.com/new  (e.g. "ges-school-mis")
    2. From THIS folder:
         git init && git add -A && git commit -m "Deploy"
         git branch -M main
         git remote add origin https://github.com/YOU/ges-school-mis.git
         git push -u origin main
    3. https://vercel.com → Add New → Project → Import that repo
       (the .gitignore already keeps secrets/binaries out of the repo)
    4. Add the environment variables below → Deploy.

  ROUTE B — Vercel CLI (no GitHub needed)
    1. In THIS folder:
         npx vercel login
         npx vercel --prod
    2. Answer the prompts (it detects Next.js automatically). The
       .vercelignore file keeps the upload small (~8 MB).
    3. Add the environment variables via:  npx vercel env add NAME production

MANDATORY ENVIRONMENT VARIABLES (Settings → Environment Variables)
  DATABASE_URL          your Neon connection string (same as step 2)
  JWT_SECRET            run:  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  LICENSE_SECRET        run the same command again (a DIFFERENT value)
  SEED_ADMIN_EMAIL      your developer login email
  SEED_ADMIN_PASSWORD   your developer login password
  SMS_MODE              console
  AI_MODE               off

  Optional: RESEND_API_KEY (email receipts/OTPs), SEED_PAYSTACK_* and
  SEED_MOMO_* (your collection keys), TWILIO_* (WhatsApp), HUBTEL_* (SMS).

AFTER DEPLOY
  - Open your live link → sign in with username "shacomputec" (or your
    SEED_ADMIN_EMAIL) + SEED_ADMIN_PASSWORD.
  - Developer → Licensing → Activate your license (removes the trial).
  - Admin → School & Settings → set the school name, logo, colours.
  - Admin → Online Payments → the school configures ITS OWN keys.

TROUBLESHOOTING
  Build fails with:  Error: Command "npx prisma generate && npm run build"
  exited with …  (or the log shows "Environment variable not found:
  DATABASE_URL") → the Vercel project has NO DATABASE_URL set (or it was
  added AFTER the last deploy). Fix: Settings → Environment Variables →
  add DATABASE_URL (the Neon postgresql://… string) → Redeploy. The build
  NEEDS the live database reachable while it renders the site pages.

  Build fails with "table … does not exist" / P2021 → the database was
  never created. Run the ONE-TIME setup from step 2 above (prisma db push
  + seed) and redeploy.

  Error "the URL must start with the protocol postgresql://" → the
  DATABASE_URL value is a SQLite file path — it must be the Neon
  postgresql://… connection string.

  Where to find the real error: Vercel → your project → the failed
  Deployment → "Inspect" → scroll UP above the red "exited with" line.

MORE DETAIL: the full guide lives in web-hosting/VERCEL.md in the main
project folder.
═══════════════════════════════════════════════════════════════════════
