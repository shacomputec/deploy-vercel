# 📱💻 Install Guide — GES School MIS (real devices)

Step-by-step for installing on a Windows computer and an Android phone, signing
in, and getting to the full system. Everything below is verified to work with
the v1.4.3 release.

**Where the files live**
| File | What it is |
|---|---|
| `GES-School-MIS-Setup.exe` | Windows installer (double-click to install, no other software needed) |
| `GES-School-MIS-1.4.3.apk` | Android app (install on any Android phone) |
| `release/GES-School-MIS-v1.4.3-full.zip` | Complete package (everything above + source + docs) |

---

## 1) Windows desktop

1. **Copy** `GES-School-MIS-Setup.exe` to the computer (from the release zip,
   `public/desktop/`, or `desktop/artifacts/`).
2. **Double-click** it. Choose an install folder (default is fine) → **Install**.
   - It installs the app, the web server and the school database — no .NET,
     no Node, no internet required.

   > 📱 **Field validation:** phone numbers must be a **10-digit Ghana number**
   > (e.g. `0241234567`; `+233…` is also accepted) and Ghana Card numbers must
   > start with **GHA-** followed by digits (e.g. `GHA-1234567890`) — enforced
   > everywhere: students, parents, teachers, staff, admissions, contact forms
   > and the result-checker OTP.

3. **"Installed successfully"** appears, then **Launch** (or open the shortcut).
   - The first run creates the local database and the accounts automatically
     (takes a few seconds the first time).
4. **Sign in** on the login screen:

   | Account | Username | Password | Role |
   |---|---|---|---|
   | Developer | `shacomputec` | `shacomputecgh@kobina5251` | everything |
   | Super Admin | `superadmin` | `Superadmin@2026` | all settings |
   | Admin | `admin` | `Admin@2026` | school modules |
   | Staff | `staff` | `Staff@2026` | school modules |
   | Teacher | `teacher` | `Teacher@2026` | classroom tools |

   The **same accounts work online and offline** — sign in to the website and
   to the local system with the same username/password.
   The fresh install contains **no demo data** (no students/teachers/fees);
   the **System** menu (Users, Roles & Permissions, School & Settings, Backup,
   Audit) is available to the Admin, Super Admin and Developer roles from the
   first login.

   (Username OR email both work.)
5. To see the **complete system** (all modules), click
   **“Open the full system in your browser”** on the login screen or in
   Settings → the full web app opens at `http://localhost:3000` — it works
   **offline**, no internet needed.
6. Optional: **Settings → Cloud ↔ offline sync** → “Sync online data to this
   PC” to make the offline system show exactly the same data as the website.

> ⚠️ Change these passwords after first login: sign in, then Admin → Users →
> edit the account (or Settings on the desktop app).

---

## 2) Android phone

1. **Download** `GES-School-MIS-1.4.3.apk` to the phone (from
   `public/mobile/`, the release zip, or a link from the developer).
2. Tap the file. If asked, allow **“Install unknown apps”** for the app you're
   downloading from (Chrome / Files / WhatsApp).
3. Tap **Install**, then **Open**.
4. **Sign in** with the same accounts above. The app already points at the
   live website — no setup needed. The server address is **fixed** to the
   school's cloud system: there is no server field to change, and the link
   cannot be copied or edited.
5. After signing in you get the **full system on your phone** — exactly like
   the desktop app: dashboard, students, teachers, report cards, fees,
   settings, users, roles, everything. It runs in a phone-sized view of the
   same web system the desktop uses.
6. Parents/teachers can use the app or the website's **Result Checker**
   (admission number + code sent to the registered phone).

---

## 3) First things to do after install (as developer or super admin)

1. **Admin → School & Settings** — set the school name, logo, colours,
   motto and contacts.
2. **Admin → Users** — create staff accounts and pick roles.
3. **Admin → Roles & Permissions** — decide what each role can do.
4. **Admin → Online Payments** — add the school's own MTN MoMo / Paystack keys
   to accept fee payments online.
5. **Admin → Settings → Notifications** — add the school's email/WhatsApp/SMS
   accounts for messaging.
6. **Developer Console (/dev)** — Licensing: activate the school's license so
   the system never locks for the school.

---

## 4) Troubleshooting (quick fixes)

| Problem | Fix |
|---|---|
| “Invalid response from server” on desktop login | This only happens on old builds. Install the **v1.4.3** Setup.exe (login fix included). |
| Desktop app can't reach the server | Wait ~10 seconds after launch (server starts in the background), then retry. Check `http://localhost:3000/login` opens in a browser. |
| No account works after install | Make sure the installer is **v1.4.3** (old installers create old passwords). Uninstall, reinstall from the current file. The 5 first-run accounts (developer, superadmin, admin, staff, teacher) are created automatically. |
| Phone says “can't reach server” | Make sure the phone has internet; the app connects to the live site (the address is fixed and cannot be changed). |
| Login works but no data | Run **Settings → Cloud ↔ offline sync** (desktop) to pull the online data into the offline system. |
| Forgot a password | As developer/super admin: Admin → Users → edit the account → reset. |

---

*GES School MIS v1.4.3 · Built by shacomputec · +233 530 941 750 ·
shacomputecgh@gmail.com*
