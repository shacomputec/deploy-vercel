import type { LanguageCode } from "./languages";

/**
 * UI string dictionary for the main chrome surfaces (navigation, login,
 * common actions, shacomputec AI). Lookups fall back through the language's
 * `fallback` chain and finally to English, so partial dictionaries are safe.
 *
 * Adding a new surface: pick short keys here and call `t("key")` from
 * `useLanguage()` — no other wiring needed.
 */
export type UiKey =
  // navigation
  | "nav.home"
  | "nav.about"
  | "nav.aboutUs"
  | "nav.history"
  | "nav.staff"
  | "nav.gallery"
  | "nav.programmes"
  | "nav.news"
  | "nav.events"
  | "nav.admissions"
  | "nav.buy"
  | "nav.downloads"
  | "nav.contact"
  | "nav.developer"
  | "nav.blog"
  | "nav.payFees"
  | "nav.resultChecker"
  | "nav.adminPortal"
  | "nav.portalLogin"
  // login
  | "login.schoolPortal"
  | "login.signIn"
  | "login.signInTitle"
  | "login.signInSubtitle"
  | "login.securePortal"
  | "login.studentPortal"
  | "login.studentPortalDesc"
  | "login.parentPortal"
  | "login.parentPortalDesc"
  | "login.staffAdmin"
  | "login.staffAdminDesc"
  | "login.checkResults"
  | "login.payFeesOnline"
  | "login.applyAdmission"
  | "login.noAccount"
  | "login.whoAreYou"
  | "login.staffWhich"
  | "login.email"
  | "login.staffId"
  | "login.password"
  | "login.usernameOrEmail"
  | "login.signingInAs"
  | "login.staffHint"
  | "login.portalHint"
  | "login.naacca"
  | "login.gesGrading"
  | "login.secureOtp"
  | "login.buyTitle"
  | "login.buyDesc"
  | "login.seeOffers"
  // common
  | "common.save"
  | "common.cancel"
  | "common.close"
  | "common.search"
  | "common.loading"
  | "common.send"
  | "common.back"
  // admin chrome
  | "admin.systemTitle"
  // shacomputec AI
  | "kaya.title"
  | "kaya.status"
  | "kaya.intro"
  | "kaya.placeholder"
  | "kaya.error"
  | "kaya.offline";

type Dict = Record<UiKey, string>;
type Dicts = Partial<Record<LanguageCode, Partial<Dict>>>;

/** English is the default and must be complete. */
const en: Dict = {
  "nav.home": "Home",
  "nav.about": "About",
  "nav.aboutUs": "About Us",
  "nav.history": "School History",
  "nav.staff": "Our Staff",
  "nav.gallery": "Gallery",
  "nav.programmes": "Programmes",
  "nav.news": "News",
  "nav.events": "Events",
  "nav.admissions": "Admissions",
  "nav.buy": "Buy This System",
  "nav.downloads": "Downloads",
  "nav.contact": "Contact",
  "nav.developer": "Developer",
  "nav.blog": "Blog",
  "nav.payFees": "Pay Fees",
  "nav.resultChecker": "Result Checker",
  "nav.adminPortal": "Admin Portal",
  "nav.portalLogin": "Portal Login",
  "login.schoolPortal": "School Portal",
  "login.signIn": "Sign In",
  "login.signInTitle": "Sign In to the School System",
  "login.signInSubtitle": "Pick your role to see what you can access, then sign in with your school-provided credentials.",
  "login.securePortal": "Secure Portal",
  "login.studentPortal": "Student Portal",
  "login.studentPortalDesc": "View your results and attendance.",
  "login.parentPortal": "Parent Portal",
  "login.parentPortalDesc": "Track your ward's progress.",
  "login.staffAdmin": "Staff & Admin",
  "login.staffAdminDesc": "Manage the school system.",
  "login.checkResults": "Check Results",
  "login.payFeesOnline": "Pay Fees Online",
  "login.applyAdmission": "Apply for Admission",
  "login.noAccount": "No account? Skip the sign-in",
  "login.whoAreYou": "Who are you signing in as?",
  "login.staffWhich": "Staff — which one are you?",
  "login.email": "Email",
  "login.staffId": "Staff ID",
  "login.password": "Password",
  "login.usernameOrEmail": "Username or email",
  "login.signingInAs": "Signing in as",
  "login.staffHint": "Staff sign in with the Staff ID your administrator assigned — the default password is your Staff ID.",
  "login.portalHint": "Student, parent and teacher portals have separate logins provided by the school.",
  "login.naacca": "NaCCA curriculum",
  "login.gesGrading": "GES-aligned grading",
  "login.secureOtp": "Secure OTP results",
  "login.buyTitle": "🏫 Built for your school — buy the system",
  "login.buyDesc": "One system for your whole school — website, Windows desktop and Android app, all on one live database.",
  "login.seeOffers": "See what it offers",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.search": "Search",
  "common.loading": "Loading…",
  "common.send": "Send",
  "common.back": "Back",
  "admin.systemTitle": "School Management Information System",
  "kaya.title": "shacomputec AI",
  "kaya.status": "Online · Ask me anything",
  "kaya.intro": "Hello! 👋 I'm shacomputec AI — I can help with lesson plans, report comments, admissions, fees, results and more.",
  "kaya.placeholder": "Ask about the school…",
  "kaya.error": "Sorry, I could not respond right now.",
  "kaya.offline": "Offline — built-in assistant",
};

/** Asante Twi — also serves Fante and Nzema through `fallback`. */
const tw: Partial<Dict> = {
  "nav.home": "Fie",
  "nav.about": "Ɛfa Ho",
  "nav.aboutUs": "Yɛn Ho Asɛm",
  "nav.history": "Sukuu Abakɔsɛm",
  "nav.staff": "Yɛn Akyerɛkyerɛfo",
  "nav.gallery": "Mfonini",
  "nav.programmes": "Sukuu Nhyehyɛe",
  "nav.news": "Nsɛm",
  "nav.events": "Nhyiamu",
  "nav.admissions": "Adesua Foforo",
  "nav.buy": "Tɔ Saa Nhyehyɛe Yi",
  "nav.downloads": "Ntotoeɛ",
  "nav.contact": "Ka Yɛn Ho",
  "nav.payFees": "Tua Sukuu Ka",
  "nav.resultChecker": "Nsusui Hwɛ",
  "nav.adminPortal": "Adwumayɛfo",
  "nav.portalLogin": "Wura Sukuu",
  "login.schoolPortal": "Sukuu Kɔnsoo",
  "login.signIn": "Wura Mu",
  "login.signInTitle": "Wura Sukuu Sisteɛm Mu",
  "login.signInSubtitle": "Paw wo dwumadie na wura mu sɛdeɛ ɛbɛma woahu nea wotumi yɛ.",
  "login.securePortal": "Sukuu Sisteɛm",
  "login.studentPortal": "Sukuuni Kɔnsoo",
  "login.studentPortalDesc": "Hwɛ wo nsusuiɛ ne wo baabi a wokɔ.",
  "login.parentPortal": "Awofo Kɔnsoo",
  "login.parentPortalDesc": "Hwɛ wo ba nkɔsoɔ.",
  "login.staffAdmin": "Adwumayɛfo ne Adwumayɛfo Panyin",
  "login.staffAdminDesc": "Di sukuu no so.",
  "login.checkResults": "Hwɛ Wo Nsusuiɛ",
  "login.payFeesOnline": "Tua Wo Ka Wɔ Soro",
  "login.applyAdmission": "Bisa Adesua Foforo",
  "login.noAccount": "Wo nni account? Hwɛ a wunwura mu",
  "login.whoAreYou": "Hwan na worewura mu sɛ?",
  "login.staffWhich": "Adwumayɛfo — hwan na woyɛ?",
  "login.email": "Email",
  "login.staffId": "Adwumayɛfo ID",
  "login.password": "Password",
  "login.usernameOrEmail": "Din anaa email",
  "login.signingInAs": "Ɛrekɔ wura mu sɛ",
  "login.staffHint": "Adwumayɛfo wura mu de Staff ID a wʼadministrator de maa wo — default password ne wo Staff ID.",
  "login.portalHint": "Sukuufoɔ, awofoɔ ne akyerɛkyerɛfo wura mu de logins a sukuu de maa wɔn.",
  "login.naacca": "NaCCA adesua nhyehyɛe",
  "login.gesGrading": "GES nsusui nhyehyɛe",
  "login.secureOtp": "Nsusuiɛ a ɛyɛ dɛn",
  "login.buyTitle": "🏫 Wɔayɛ ama wo sukuu — tɔ saa sisteɛm yi",
  "login.buyDesc": "Sisteɛm baako ma wo sukuu nyinaa — website, Windows desktop ne Android app, nyinaa wɔ database baako so.",
  "login.seeOffers": "Hwɛ nea ɛwɔ mu",
  "common.save": "Sie",
  "common.cancel": "Gyaee",
  "common.close": "To Mu",
  "common.search": "Hwehwɛ",
  "common.loading": "Ɛrekɔ so…",
  "common.send": "Soma",
  "common.back": "San Wɔ Akyi",
  "admin.systemTitle": "Sukuu Nsɛm Nhyehyɛe Sisteɛm",
  "kaya.title": "shacomputec AI",
  "kaya.status": "Ɛwɔ hɔ · bisa me biribiara",
  "kaya.intro": "Hello! 👋 Mene shacomputec AI — metumi aboa wo adesua nhyehyɛe, report nsusuiɛ, admissions, ka, nsusui hwɛ ne nea ɛkeka ho.",
  "kaya.placeholder": "Bisa fa sukuu ho…",
  "kaya.error": "Yaa, merentumi nnye mmuaeɛ seesei.",
  "kaya.offline": "Offline — boa a ɛwɔ hɔ",
};

/** Ewe. */
const ee: Partial<Dict> = {
  "nav.home": "Aƒeme",
  "nav.about": "Ɖe Ŋuɖoɖo",
  "nav.aboutUs": "Míá Ŋuti",
  "nav.history": "Suku Nyati",
  "nav.staff": "Míá Nufialawo",
  "nav.gallery": "Nɔnɔmewo",
  "nav.programmes": "Suku Nudɔdɔwo",
  "nav.news": "Nyadzɔdzɔwo",
  "nav.events": "Nuwɔnawo",
  "nav.admissions": "Suku Yiyi",
  "nav.buy": "Ƒle Sistɛm Nsia",
  "nav.downloads": "Shɛ̃ɛmɔ",
  "nav.contact": "Kpe ɖe Mí Ŋu",
  "nav.payFees": "Ʋo Suku Gawo",
  "nav.resultChecker": "Kpɔ Ƒoƒoɖoɖo",
  "nav.adminPortal": "Dɔwɔlawo",
  "nav.portalLogin": "Ge Ɖe Ememe",
  "login.schoolPortal": "Suku Portal",
  "login.signIn": "Ge Ɖe Ememe",
  "login.signInTitle": "Ge Ɖe Suku Sistɛm Me",
  "login.signInSubtitle": "Tia wò dɔwɔƒe be nàkpɔ nu si ŋu nàte ŋu ado ɖe eŋu, emegbe wò age ɖe eme kple wò ŋkɔnyawo.",
  "login.securePortal": "Sistɛm Si Le Dedie",
  "login.studentPortal": "Nusɔsrɔ̃lawo Ƒe Portal",
  "login.studentPortalDesc": "Kpɔ wò ƒoƒoɖoɖo kple nɔnɔme.",
  "login.parentPortal": "Dzilawo Ƒe Portal",
  "login.parentPortalDesc": "Kpɔ wò vi ƒe dzidzeɖedzi.",
  "login.staffAdmin": "Dɔwɔlawo Kple Dudɔnunɔlawo",
  "login.staffAdminDesc": "Kpɔ suku la dzi.",
  "login.checkResults": "Kpɔ Ƒoƒoɖoɖo",
  "login.payFeesOnline": "Ʋo Ƒe Gawo Le Dzineme",
  "login.applyAdmission": "Bia Suku Yiyi",
  "login.noAccount": "Account meli o? Xe mo na ŋkɔ ŋɔŋlɔ la",
  "login.whoAreYou": "Ame ka nèle ge ɖe eme abe?",
  "login.staffWhich": "Dɔwɔlawo — ame ka nènye?",
  "login.email": "Email",
  "login.staffId": "Dɔwɔlawo ID",
  "login.password": "Password",
  "login.usernameOrEmail": "Ŋkɔ alo email",
  "login.signingInAs": "Ele ge ɖe eme abe",
  "login.staffHint": "Dɔwɔlawo gea ɖe eme kple Staff ID si ɣɔŋlɔla na wo — password lae nye Staff ID la.",
  "login.portalHint": "Nusɔsrɔ̃lawo, dzilawo kple nufialawo xɔa login tso suku la gbɔ.",
  "login.naacca": "NaCCA nusɔsrɔ̃ dɔdɔkui",
  "login.gesGrading": "GES ƒoƒoɖoɖo dɔdɔkui",
  "login.secureOtp": "OTP ƒoƒoɖoɖo si le dedie",
  "login.buyTitle": "🏫 Wɔe na wò suku — ƒle sistɛm la",
  "login.buyDesc": "Sistɛm ɖeka na wò suku blibo — website, Windows desktop kple Android app, kple database ɖeka.",
  "login.seeOffers": "Kpɔ nu siwo le eme",
  "common.save": "Dzra ɖo",
  "common.cancel": "Ɖe Ɖa",
  "common.close": "Tu",
  "common.search": "Dii",
  "common.loading": "Ele Mɔ Dzi…",
  "common.send": "Ɖo ɖa",
  "common.back": "Trɔ Yi Megbe",
  "admin.systemTitle": "Suku Ŋuti Nyatakaka Sistɛm",
  "kaya.title": "shacomputec AI",
  "kaya.status": "Le dzineme · Bia ɖe nye ŋu nane",
  "kaya.intro": "Hello! 👋 Nye shacomputec AI — nate ŋu akpe ɖe ŋuwò le nufiafia dɔdokuiwo, ƒoƒoɖoɖo ŋɔŋlɔwo, suku yiyi, gawo kple bubuwo ŋu.",
  "kaya.placeholder": "Bia nua tso suku ŋu…",
  "kaya.error": "Meɖe gbe o, nyemate ŋu aɖo eŋu fifia o.",
  "kaya.offline": "Mele dzineme o — nufiala si le eme",
};

/** Ga. */
const ga: Partial<Dict> = {
  "nav.home": "Shia",
  "nav.about": "Wɔhe",
  "nav.aboutUs": "Wɔhe Sane",
  "nav.history": "Skul Abɛ",
  "nav.staff": "Wɔ Sɛfii",
  "nav.gallery": "Mfonirii",
  "nav.programmes": "Skul Nitsumɔii",
  "nav.news": "Sanebii",
  "nav.events": "Nibii",
  "nav.admissions": "Skul Nyɛɛmɔ",
  "nav.buy": "He Nɛɛ",
  "nav.downloads": "Labisibu",
  "nav.contact": "Kpe Wɔ He",
  "nav.payFees": "Jo Skul Fii",
  "nav.resultChecker": "Hewalɛ Kwɛmɔ",
  "nav.adminPortal": "Admintɔ",
  "nav.portalLogin": "Wo Skul Sistɛm",
  "login.schoolPortal": "Skul Portal",
  "login.signIn": "Wo Mli",
  "login.signInTitle": "Wo Skul Sistɛm Lɛ Mli",
  "login.signInSubtitle": "Hala o nitsumɔ ni o na nɔ ni o baanyɛ afee, ni o wo o mli kɛ o wekukpãa lɛ.",
  "login.securePortal": "Sistɛm Ni Ewɛ Shi",
  "login.studentPortal": "Wiemɔ Nɔyeli Portal",
  "login.studentPortalDesc": "Kwɛ o hewalɛi kɛ o yaa.",
  "login.parentPortal": "Fɔlɔi Portal",
  "login.parentPortalDesc": "Kwɛ o bi lɛ nɔ̃mɔ.",
  "login.staffAdmin": "Sɛfii kɛ Tsuŋ",
  "login.staffAdminDesc": "Kwɛ skul lɛ shishi.",
  "login.checkResults": "Kwɛ Hewalɛi",
  "login.payFeesOnline": "Jo Skul Fii Yɛ Internet Nɔ",
  "login.applyAdmission": "Bi Skul Nyɛɛmɔ",
  "login.noAccount": "Account bɛ o dɛ? Joŋ kwɛmɔ fioo",
  "login.whoAreYou": "Namɔ o woɔ mli akɛ?",
  "login.staffWhich": "Sɛfii — namɔ ji bo?",
  "login.email": "Email",
  "login.staffId": "Sɛfii ID",
  "login.password": "Password",
  "login.usernameOrEmail": "Gbɛ́i loo email",
  "login.signingInAs": "Owoɔ mli akɛ",
  "login.staffHint": "Sɛfii wooɔ mli kɛ Staff ID ni administrator wo o — default password lɛ ji o Staff ID lɛ.",
  "login.portalHint": "Wiemɔ nɔyelii, fɔlɔi kɛ sɛfii náa logins kɛjɛɔ skul lɛ dɛŋŋ.",
  "login.naacca": "NaCCA nitsumɔ",
  "login.gesGrading": "GES hewalɛ nɔ̃mɔ",
  "login.secureOtp": "Hewalɛ ni ejoɔ OTP",
  "login.buyTitle": "🏫 A fee yɛ o skul he — he sistɛm lɛ",
  "login.buyDesc": "Sistɛm kome yɛ o skul lɛ fɛɛ — website, Windows desktop kɛ Android app, kɛ database kome.",
  "login.seeOffers": "Kwɛ nɔ ni yɛ mli",
  "common.save": "Sɛɛ",
  "common.cancel": "Shɛ̃",
  "common.close": "Ku",
  "common.search": "Bimɔ",
  "common.loading": "Etee nɔ…",
  "common.send": "Tso",
  "common.back": "Sɛɛ O Ya",
  "admin.systemTitle": "Skul Sane Sistɛm",
  "kaya.title": "shacomputec AI",
  "kaya.status": "Yɛ mli · bi mi nɔ ko",
  "kaya.intro": "Hello! 👋 Mi ji shacomputec AI — mi baanyɛ ye mi bua o yɛ nitsumɔ shishitoo, hewalɛ wolo, skul nyɛɛmɔ, fii kɛ ekomei amli.",
  "kaya.placeholder": "Bi hewo sane ko…",
  "kaya.error": "Mei ba mli, minyɛɛɛ nɔ̃mɔ dɔŋŋ.",
  "kaya.offline": "Offline — tsuŋ ni yɛ mli",
};

/** Hausa. */
const ha: Partial<Dict> = {
  "nav.home": "Gida",
  "nav.about": "Game da Mu",
  "nav.aboutUs": "Game da Mu",
  "nav.history": "Tarihin Makaranta",
  "nav.staff": "Ma'aikatan Mu",
  "nav.gallery": "Hotuna",
  "nav.programmes": "Shirye-shirye",
  "nav.news": "Labarai",
  "nav.events": "Ayyuka",
  "nav.admissions": "Shiga Makaranta",
  "nav.buy": "Saya Wannan Tsarin",
  "nav.downloads": "Sauke",
  "nav.contact": "Tuntuɓi Mu",
  "nav.payFees": "Biya Kuɗin Makaranta",
  "nav.resultChecker": "Duba Sakamako",
  "nav.adminPortal": "Ƙofar Gudanarwa",
  "nav.portalLogin": "Shiga Tsarin",
  "login.schoolPortal": "Ƙofar Makaranta",
  "login.signIn": "Shiga",
  "login.signInTitle": "Shiga Tsarin Makaranta",
  "login.signInSubtitle": "Zaɓi rawar ka don ganin abin da za ka iya yi, sannan ka shiga da bayanan da makaranta ta ba ka.",
  "login.securePortal": "Tsarin Tsaro",
  "login.studentPortal": "Ƙofar ɗalibai",
  "login.studentPortalDesc": "Duba sakamakoka da halartan ka.",
  "login.parentPortal": "Ƙofar Iyaye",
  "login.parentPortalDesc": "Bibiyi ci gaban ɗanka/ɗiyarka.",
  "login.staffAdmin": "Ma'aikata da Gudanarwa",
  "login.staffAdminDesc": "Sarrafa tsarin makaranta.",
  "login.checkResults": "Duba Sakamako",
  "login.payFeesOnline": "Biya Kuɗi a Kan Yanar Gizo",
  "login.applyAdmission": "Nema Shiga Makaranta",
  "login.noAccount": "Ba ka da asusu? Tsallake shiga",
  "login.whoAreYou": "Wane ne kake shiga a matsayin?",
  "login.staffWhich": "Ma'aikata — wane ne kai?",
  "login.email": "Imel",
  "login.staffId": "Lambar Ma'aikaci",
  "login.password": "Kalmar sirri",
  "login.usernameOrEmail": "Suna ko imel",
  "login.signingInAs": "Ana shiga a matsayin",
  "login.staffHint": "Ma'aikata suna shiga da lambar ma'aikaci da admin ya ba ka — kalmar sirri ta farko ita ce lambarka.",
  "login.portalHint": "Dalibai, iyaye da malamai suna da nasu shiga daga makaranta.",
  "login.naacca": "Manhajar NaCCA",
  "login.gesGrading": "Makin GES",
  "login.secureOtp": "Sakamako masu aminci (OTP)",
  "login.buyTitle": "🏫 An gina shi don makarantarka — saya tsarin",
  "login.buyDesc": "Tsari ɗaya don dukan makarantarka — yanar gizo, Windows desktop da Android app, duk a kan bayanai ɗaya.",
  "login.seeOffers": "Duba abin da yake bayarwa",
  "common.save": "Ajiye",
  "common.cancel": "Soke",
  "common.close": "Rufe",
  "common.search": "Nema",
  "common.loading": "Ana lodawa…",
  "common.send": "Aika",
  "common.back": "Koma Baya",
  "admin.systemTitle": "Tsarin Gudanar da Bayanan Makaranta",
  "kaya.title": "shacomputec AI",
  "kaya.status": "Kan layi · Tambaye ni komai",
  "kaya.intro": "Sannu! 👋 Ni shacomputec AI ne — zan iya taimaka da shirin darasi, sharhin sakamako, shiga makaranta, kuɗi, sakamako da ƙari.",
  "kaya.placeholder": "Tambayi game da makaranta…",
  "kaya.error": "Yi hakuri, ba zan iya amsa ba yanzu.",
  "kaya.offline": "Offline — mataimaki na ciki",
};

/** Dagbani — also serves Dagaare through `fallback`. */
const dag: Partial<Dict> = {
  "nav.home": "Yili",
  "nav.about": "Ti Zaŋkali",
  "nav.aboutUs": "Ti Zaŋkali",
  "nav.history": "Shikuru Taarihi",
  "nav.staff": "Ti Karimbanima",
  "nav.gallery": "Anfooninima",
  "nav.programmes": "Bɔhimbu Yaɣa",
  "nav.news": "Lahabaya",
  "nav.events": "Niya Nima",
  "nav.admissions": "Shikuru Kpɛbu",
  "nav.buy": "Da Sɔŋsim Ŋɔ",
  "nav.downloads": "Ɖeɖe",
  "nav.contact": "Tabi Ti",
  "nav.payFees": "Yo Shikuru Liɣiri",
  "nav.resultChecker": "Lihi Bunahi",
  "nav.adminPortal": "Kpambaliba",
  "nav.portalLogin": "Kpɛ Shikuru",
  "login.schoolPortal": "Shikuru Portal",
  "login.signIn": "Kpɛ Yaɣili",
  "login.signInTitle": "Kpɛ Shikuru Sɔŋsim Ni",
  "login.signInSubtitle": "Piim a tuma ni a nya bɛ ni a ni too niŋ shɛli, ka kpɛ ni a shikuru ni ti a daliri shɛŋa.",
  "login.securePortal": "Sɔŋsim Din Mali Dari",
  "login.studentPortal": "Bihi Portal",
  "login.studentPortalDesc": "Lihi a bunahi mini a ʒini sheei.",
  "login.parentPortal": "Ban Dɔɣi Ba Portal",
  "login.parentPortalDesc": "Bɔhindi a bia kpuɣibu.",
  "login.staffAdmin": "Karimbanima mini Kpambaliba",
  "login.staffAdminDesc": "Gbaai shikuru maa suuna.",
  "login.checkResults": "Lihi Bunahi",
  "login.payFeesOnline": "Yo Liɣiri Internet Zuɣu",
  "login.applyAdmission": "Bohi Shikuru Kpɛbu",
  "login.noAccount": "A ka laɣa kɔmpin? Yihi kpɛbu maa",
  "login.whoAreYou": "Ŋuni ka a kpɛri ni?",
  "login.staffWhich": "Karimbanima — ŋuni nyɛ a?",
  "login.email": "Email",
  "login.staffId": "Tumtumda ID",
  "login.password": "Password",
  "login.usernameOrEmail": "Yuli bee email",
  "login.signingInAs": "A kpɛri ni",
  "login.staffHint": "Tumtumdiba kpɛri ni Staff ID ka a administrator ti a — default password nyɛla a Staff ID maa.",
  "login.portalHint": "Bihi, ban dɔɣi ba mini karimbanima mali bɛ maŋ bɛhigu shɛŋa din yi shikuru maa ni na.",
  "login.naacca": "NaCCA bɔhimbu",
  "login.gesGrading": "GES bunahi",
  "login.secureOtp": "Bunahi din mali dari",
  "login.buyTitle": "🏫 Bɛ mali li n-ti a shikuru — da sɔŋsim ŋɔ",
  "login.buyDesc": "Sɔŋsim yini n-ti a shikuru zaŋ chaŋ — website, Windows desktop mini Android app, zaa din be database yini ni.",
  "login.seeOffers": "Lihi bɛ ni ti shɛli",
  "common.save": "Lihisi",
  "common.cancel": "Chɛli",
  "common.close": "Pɔɣi",
  "common.search": "Vihi",
  "common.loading": "Di Yimdi Na…",
  "common.send": "Tim",
  "common.back": "Labi Yi",
  "admin.systemTitle": "Shikuru Lahabaya Sɔŋsim",
  "kaya.title": "shacomputec AI",
  "kaya.status": "Be sunsuuni · Bɔhimi ma shɛli",
  "kaya.intro": "Hello! 👋 N nyɛla shacomputec AI — n ni tooi sɔŋ a bɔhimbu yaɣa, bunahi sabbu, shikuru kpɛbu, liɣiri, bunahi mini din pahi.",
  "kaya.placeholder": "Bohi shikuru yɛltɔɣa…",
  "kaya.error": "Naɣila, n ku tooi labisi a pumpɔŋɔ.",
  "kaya.offline": "Offline — sɔŋsim din be ni",
};

export const DICTS: Dicts = { en, tw, ee, ga, ha, dag };
