// Kaya AI assistant — provider-agnostic. AI_MODE=offline (default) ships a
// built-in, offline assistant that answers in the user's chosen Ghanaian
// language. Set AI_MODE=openai + OPENAI_API_KEY for a real LLM.
//
// Security rules enforced here:
//  - the assistant only ever sees public school data passed in `context`
//  - confidential records are never included in prompts
//  - it cannot generate licensing/activation codes

import type { LanguageCode } from "@/lib/i18n/languages";
import { LANGUAGES } from "@/lib/i18n/languages";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AiContext = {
  schoolName: string;
  motto?: string | null;
  vision?: string | null;
  mission?: string | null;
  levels?: string[];
};

export type AiIntent =
  | "greeting"
  | "lesson"
  | "comment"
  | "scheme"
  | "timetable"
  | "admission"
  | "fee"
  | "result"
  | "fallback";

/** Pick the best string for a language, walking its fallback chain to English. */
function pick(lang: LanguageCode, table: Partial<Record<LanguageCode, string>>): string {
  let current: LanguageCode | undefined = lang;
  while (current) {
    const found = table[current];
    if (found) return found;
    current = LANGUAGES.find((l) => l.code === current)?.fallback;
  }
  return table.en ?? "";
}

// ── intent detection: understands English AND common Ghanaian-language words ──
const INTENT_KEYWORDS: Record<AiIntent, string[]> = {
  greeting: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "akwaaba", "sɛn", "te sɛn", "efɔ", "ale", "awo", "yoo", "sannu", "ina kwana", "wɛlɔŋ"],
  lesson: ["lesson", "lesson plan", "lesson note", "scheme of learning", "adɛyɛ", "adesua", "nufiafia", "nufiala", "darasi", "karim", "kɔhigu", "bɔhimbu", "shiri", "darasi"],
  comment: ["comment", "report comment", "report card comment", "nsusui", "nsusuiɛ", "ɖoɖo", "ewɔwɔ", "hewale wolo", "sharhi", "bunahi sabbu", "labisigu"],
  scheme: ["scheme", "termly", "syllabus", "nacca", "curriculum", "nhyehyɛe", "dɔdokui", "manhaja", "bɔhimbu"],
  timetable: ["timetable", "time table", "schedule", "period", "kronogram", "agenda", "jadwal"],
  admission: ["admission", "apply", "enrol", "enroll", "admission form", "adesua foforo", "suku yiyi", "skul nyɛɛmɔ", "shiga makaranta", "kpɛbu", "bohi shikuru"],
  fee: ["fee", "fees", "pay", "payment", "momo", "paystack", "tua", "ka", "gawo", "fii", "kuɗi", "biya", "liɣiri", "yo"],
  result: ["result", "results", "check result", "report card", "otp", "nsusui hwɛ", "ɖoɖo kpɔ", "hewale kwɛ", "sakamako", "bunahi", "lihi"],
  fallback: [],
};

function detectIntent(q: string): AiIntent {
  for (const intent of Object.keys(INTENT_KEYWORDS) as AiIntent[]) {
    if (intent === "fallback") continue;
    if (INTENT_KEYWORDS[intent].some((k) => q.includes(k))) return intent;
  }
  return "fallback";
}

// ── localized replies ─────────────────────────────────────────────────────────
type ReplyTable = Partial<Record<LanguageCode, string>>;

const REPLIES: Record<AiIntent, ReplyTable> = {
  greeting: {
    en: "Hello! 👋 I'm Kaya AI. I can help with lesson planning, report-card comments, schemes of learning, timetable tips, admissions, fees and results. What would you like to know?",
    tw: "Hello! 👋 Mene Kaya AI. Metumi aboa wo adesua nhyehyɛe, report nsusuiɛ, schemes of learning, timetable, admissions, ka ne nsusui hwɛ. Dɛn na wopɛ sɛ wohu?",
    ee: "Hello! 👋 Nye Kaya AI. Mate ŋu akpe ɖe ŋuwò le nufiafia, ƒoƒoɖoɖo ŋɔŋlɔ, nusɔsrɔ̃ dɔdokuiwo, timetable, suku yiyi, gawo kple ƒoƒoɖoɖo ŋu. Nu ka ŋu nèle vevie?",
    ga: "Hello! 👋 Mi ji Kaya AI. Mi baanyɛ ye mi bua o yɛ nitsumɔ shishitoo, hewalɛ wolo, schemes, timetable, skul nyɛɛmɔ, fii kɛ hewalɛ kwɛmɔ. Mɛni o tao ni a kwɛ?",
    ha: "Sannu! 👋 Ni Kaya AI ne. Zan iya taimaka da shirin darasi, sharhin sakamako, manhaja, timetable, shiga makaranta, kuɗi da sakamako. Me kake so ka sani?",
    dag: "Hello! 👋 N nyɛla Kaya AI. N ni tooi sɔŋ a bɔhimbu yaɣa, bunahi sabbu, bɔhimbu, timetable, shikuru kpɛbu, liɣiri mini bunahi. Bo ka a bɔra ni a baŋ?",
  },
  lesson: {
    en: "Here is a suggested lesson-plan structure (NaCCA SBC format):\n1. Strand / Sub-strand — from the syllabus for your level.\n2. Content Standard & Indicator — what learners must know.\n3. Lesson Objectives (2–3) — start with “By the end of the lesson, learners will be able to…”\n4. Core Competencies — Critical Thinking, Creativity, Communication.\n5. TLMs — charts, counters, real objects.\n6. Activities — starter (5 min), main (30 min), plenary (10 min).\n7. Assessment & Differentiation.\nTell me the subject and level and I can draft a full lesson note.",
    tw: "Eyɛ adɛyɛ nhyehyɛe (NaCCA SBC) a ɛte saa:\n1. Strand/Sub-strand — firi syllabus no mu ma wo level.\n2. Content Standard & Indicator — nea adesuafo nyinaa ɛsɛ sɛ wɔte.\n3. Adesua botae (2–3).\n4. Core Competencies — adwene, abɔdeɛ yɛ, nkitahodiɛ.\n5. TLMs — mfonini, nneɛma a ɛyɛ den.\n6. Adesua akwan — ase (5 min), mfinimfin (30 min), awieeɛ (10 min).\n7. Assessment ne Differentiation.\nKa subject ne level no kyerɛ me na metumi ayɛ adɛyɛ adwuma no nyinaa.",
    ee: "Esia nye nufiafia dɔdokui (NaCCA SBC):\n1. Strand/Sub-strand — tso syllabus me na wò klase.\n2. Content Standard & Indicator — nu si nusɔsrɔ̃lawo dze.\n3. Nufiafia ɖoɖowo (2–3).\n4. Core Competencies — ŋutasesẽm, nu yeye, nyatakaka.\n5. TLMs — nɔnɔmewo, aɖaŋuwo.\n6. Dɔwɔwɔwo — dzesi (5 min), gãtɔ (30 min), nuwuwu (10 min).\n7. Assessment & Differentiation.\nGblɔe na nye be nufiafia dɔkui ka nèdi, emegbe makpe ɖe ŋuwò.",
    ga: "Nɛkɛ ji nitsumɔ shishitoo (NaCCA SBC):\n1. Strand/Sub-strand — kɛjɛ syllabus lɛ mli kɛshi o level lɛ.\n2. Content Standard & Indicator — nɔ ni wiemɔ nɔyelii lɛ eshi.\n3. Nitsumɔ heists (2–3).\n4. Core Competencies — jwɛŋmɔ, nibii yɛmɔ, wiemɔ kɛɛmɔ.\n5. TLMs — mfonirii, nibii ni yɔɔ shishi.\n6. Nitsumɔii — shishijɛ (5 min), nɔ ni kãa (30 min), naagbee (10 min).\n7. Assessment kɛ Differentiation.\nMaa o ni o kɛɛ mi subject lɛ kɛ level lɛ, ni maafee nitsumɔ lɛ fɛɛ.",
    ha: "Ga shirin darasi (NaCCA SBC):\n1. Strand/Sub-strand — daga manhaja don matakin ka.\n2. Content Standard & Indicator — abin da ɗalibai ke bukata.\n3. Manufofin darasi (2–3).\n4. Ƙwarewa — tunani, ƙirƙira, sadarwa.\n5. Kayan koyarwa.\n6. Ayyuka — farawa (5 min), babba (30 min), ƙarshe (10 min).\n7. Kima da bambanta.\nFaɗa mini darasi da mataki, zan rubuta cikakken shirin.",
    dag: "Ŋɔ ŋɔ nyɛla bɔhimbu yaɣili (NaCCA SBC):\n1. Strand/Sub-strand — di yi syllabus ni naɣati a tingbani.\n2. Content Standard & Indicator — din ni tooi niŋ bia kam ni o baŋ.\n3. Bɔhimbu dallana (2–3).\n4. Core Competencies — tɛha, namibu, laɣimsim.\n5. TLMs — anfooni nima, binshɛɣu din be ni.\n6. Tuma — piligu (5 min), sunsuuni (30 min), bahigu (10 min).\n7. Assessment ni Differentiation.\nYɛlima subject mini level maa, ka n ni tooi sabi bɔhimbu maa zaa.",
  },
  comment: {
    en: "Ready-to-use report-card comment templates:\n• Excellent (EE): outstanding learner with consistent excellence — keep it up!\n• Very Good (ME): strong understanding, participates actively — aim higher.\n• Average (AE): satisfactory — steady effort will improve results.\n• Needs Support (NS): extra practice and home support encouraged.\nPaste the learner's scores and I can tailor a specific comment.",
    tw: "Report nsusuiɛ nkyerɛase a wotumi de di dwuma:\n• Excellent (EE): ɔbaa a ɔyɛ adeɛ yie — toa so!\n• Very Good (ME): ote adeɛ ase yie, ɔka ho — bɔ mmɔden.\n• Average (AE): ɛyɛ — biribiara bɛyɛ papa sɛ wokɔ so.\n• Needs Support (NS): ohia mmɔdenbɔ ne mmoa firi fie.\nFa abakɔsɛm no kyerɛ me na metumi ayɛ nkyerɛase a ɛfata.",
    ee: "Ƒoƒoɖoɖo ŋɔŋlɔ siwo ŋu ate ŋu aɖu emu:\n• Excellent (EE): nusɔsrɔ̃la si wɔa wɔ wu — yi edzi yi!\n• Very Good (ME): mɔ̃mɔ̃ ɖo enu, le dɔwɔwɔwo me — dze edzi.\n• Average (AE): enyo — agbagbadzedze ana nu asɔ na wò.\n• Needs Support (NS): enɔ be woa wɔ wu eye wò dzilawo nakpe ɖe ŋuwò.\nNa ƒoƒoɖoɖoawo va nye gbɔ, makpe ɖe ŋuwò.",
    ga: "Hewale wolo ŋmaamɔ ni o baanyɛ kɛ tsu nitsumɔ:\n• Excellent (EE): wiemɔ nɔyeli ni fee nibii jogbaŋŋ — tswa nɔ!\n• Very Good (ME): ele nɔ̃mɔ shishi jogbaŋŋ — kɛɛ nɔ̃mɔ lɛ.\n• Average (AE): ejo — kɛ jwɛŋmɔ ni o ya nɔ, o hewalɛ baawa.\n• Needs Support (NS): ehiɛ nitsumɔ wuyoo kɛ shia mli sɛɛmɔ.\nWo o hewalɛii lɛ amli, ni maafee ŋmaamɔ ni heɔ sane lɛ.",
    ha: "Sharhin sakamako da za a iya amfani:\n• Excellent (EE): ɗalibi na kwarai — ci gaba!\n• Very Good (ME): fahimta mai kyau, yana shiga aiki.\n• Average (AE): ya isa — ƙoƙari zai inganta.\n• Needs Support (NS): yana bukatar ƙarin aiki da taimako.\nKawo makin ɗalibin, zan rubuta sharhi na musamman.",
    dag: "Bunahi sabbu ni a ni tooi zaŋ tum:\n• Excellent (EE): bia ŋun tumdi viɛnyɛla — kpaŋma!\n• Very Good (ME): o baŋdi din be ni — niŋ kpaŋma.\n• Average (AE): di pali — kpaŋma ni di yɛligi.\n• Needs Support (NS): o hia kpaŋma ni sɔŋsim yili ni.\nZaŋ a bia bunahi maa na ma, ka n sabi labisigu din gbaai o.",
  },
  scheme: {
    en: "A scheme-of-learning outline:\n1. Term / Level / Strand header with curriculum reference.\n2. Weeks 1–13 grid: Week | Strand | Sub-strand | Content Standard | Indicator | Lesson Title | Assessment.\n3. Cover all NaCCA strands for the term, roughly equal weeks per strand.\n4. Include at least one SBA task per strand.\nTell me the subject, class level and term and I can generate a full scheme.",
    tw: "Scheme of learning nhyehyɛe:\n1. Term/Level/Strand ne curriculum.\n2. Wiik 1–13: Week | Strand | Sub-strand | Content Standard | Indicator | Lesson | Assessment.\n3. NaCCA strands nyinaa ma term no.\n4. SBA dwumadie baako ma strand biara.\nKa subject, level ne term no kyerɛ me.",
    ee: "Nusɔsrɔ̃ dɔdokui ɖoɖo:\n1. Term/Level/Strand kple curriculum.\n2. Kɔsiɖa 1–13: Week | Strand | Sub-strand | Content Standard | Indicator | Lesson | Assessment.\n3. NaCCA strands katã na term la.\n4. SBA dɔwɔwɔ ɖeka na strand ɖesiaɖe.\nGblɔ subject, level kple term la na nye.",
    ga: "Scheme of learning shishitoo:\n1. Term/Level/Strand kɛ curriculum lɛ.\n2. Woki 1–13: Week | Strand | Sub-strand | Content Standard | Indicator | Lesson | Assessment.\n3. NaCCA strands lɛ fɛɛ kɛ term lɛ.\n4. SBA nitsumɔ kome kɛ strand fɛɛ.\nKɛɛ mi subject lɛ, level lɛ kɛ term lɛ.",
    ha: "Tsarin manhaja:\n1. Term/Mataki/Strand da manhaja.\n2. Mako 1–13: Mako | Strand | Sub-strand | Ma'auni | Manufa | Darasi | Kima.\n3. Dukan strands na NaCCA.\n4. Aƙalla aiki ɗaya na SBA.\nFaɗa mini darasi, mataki da term.",
    dag: "Bɔhimbu yaɣili shɛli:\n1. Term/Level/Strand ni curriculum.\n2. Wochen 1–13: Week | Strand | Sub-strand | Content Standard | Indicator | Lesson | Assessment.\n3. NaCCA strands zaa n-ti term maa.\n4. SBA tuma yini n-ti strand kam.\nYɛli subject, level ni term maa.",
  },
  timetable: {
    en: "Timetable tips:\n• Hard subjects (Maths, English, Science) in periods 1–3.\n• Creative Arts, PE and practicals in the afternoon.\n• No double periods of the same subject in one day.\n• Balance each teacher's load — max 5 periods/day.\nTell me your classes, subjects and teachers and I can suggest a draft grid.",
    tw: "Timetable afotuo:\n• Adesua a emu yɛ den (Maths, English, Science) wɔ period 1–3.\n• Creative Arts, PE ne practical adwuma wɔ awia.\n• Mma period abien mma subject baako da baako.\n• Ma akyerɛkyerɛfo biara adwuma nyɛɛ pɛ.\nKa wo classes ne akyerɛkyerɛfo kyerɛ me.",
    ee: "Timetable aɖaŋu:\n• Nudɔdɔ sesẽwo (Maths, English, Science) le period 1–3.\n• Creative Arts, PE kple dɔwɔwɔwo le ɣetrɔ.\n• Megadzea period eve na nudɔdɔ ɖeka o.\n• Kpɔ dɔwɔwɔ siwo nufialawo nɔ la dzi.\nGblɔ wò class kple nufialawo na nye.",
    ga: "Timetable jwɛŋmɔii:\n• Nitsumɔ ni ewuɔ (Maths, English, Science) yɛ period 1–3.\n• Creative Arts, PE kɛ practical nitsumɔii yɛ ŋwɛi.\n• Kɛ̃ period enyɔ kɛ nitsumɔ kome daa daa.\n• Ma nitsumɔ lɛ akɛ adesaa ni fɛɛ yɔɔ shi.\nKɛɛ o class lɛ, subject lɛ kɛ sɛfii lɛ amli.",
    ha: "Shawarwarin jadwal:\n• Darussa masu wuya (Lissafi, Turanci, Kimiyya) a lokaci 1–3.\n• Fasaha, PE da aiki a rana.\n• Babu darasi biyu na ɗaya a rana ɗaya.\n• Daidaita nauyin malamai — mafi ƙari 5 a rana.\nFaɗa mini azuzuwa da malamai, zan ba ka tsari.",
    dag: "Timetable sɔŋsim:\n• Bɔhimbu shɛŋa din niŋ tom (Maths, English, Science) n-ti period 1–3.\n• Creative Arts, PE ni tuma shɛŋa wuntaŋa.\n• Di niŋ period ayi n-ti bɔhimbu yini dahin yini.\n• Maali karimba kam tuma — period 5 dahin yini.\nYɛli a classes, subjects ni karimbanima maa.",
  },
  admission: {
    en: "The online admission window is open for the new academic year — Crèche through SHS 1.\nHow to apply:\n1. Open the Admissions page and complete the online application (about 5 minutes).\n2. You'll receive a reference number immediately.\n3. Our admissions office will call you within 48 hours to schedule a screening.\nWould you like the office contact details?",
    tw: "Online admission no mu abreɛ: Crèche kosi SHS 1.\nƐkwan:\n1. Kɔ Admissions peji no so na wie application no (sɛnea ɛbɛyɛ simma 5).\n2. Wobɛnya reference number ntɛm ara.\n3. Sukuu no bɛfrɛ wo nnansa mu sɛ wɔmfa wo screening.\nWopɛ office contact no?",
    ee: "Suku yiyi ɖoɖo le eme na ƒe yeye la — Crèche va ɖo SHS 1.\nAle si nàwɔe:\n1. Yi Admissions axa la dzi eye nàwu nuŋɔŋlɔ la nu (eƒe ɖiɖi ƒe 5).\n2. Àxɔ ŋkɔnɔŋlɔ ɖeka enumake.\n3. Suku la aƒo ka ɖe ŋuwò le gaƒoƒo 48 me.\nƉe nèle be yeakpɔ kpeɖeŋutɔwo ƒe kpeɖoɖowo?",
    ga: "Skul nyɛɛmɔ lɛ yɛ mli nɛkɛ afi fɛɛ — Crèche kɛshi SHS 1.\nGbɛ ni o baanyɛ fo:\n1. Ya Admissions peji lɛ nɔ ni o wo nɔ̃mɔ lɛ fɛɛ (aaafee aahu 5 miniti).\n2. O baaná reference number lɛ kɛshɛɛ.\n3. Skul lɛ baafo o tɛlɛ yɛ 48 wolo ni o baaya screening.\nOtao skul lɛ dɛŋŋɛɛmɔ?",
    ha: "An buɗe kofa shiga makaranta don sabuwar shekara — Crèche zuwa SHS 1.\nYadda ake nema:\n1. Je shafin Admissions ka cika fom (kimanin minti 5).\n2. Za ka sami lambar ajiye nan take.\n3. Ofishin za su kira ka a cikin awa 48.\nKana bukatar lambar ofishin?",
    dag: "Shikuru kpɛbu maa be ni n-ti yuun' palli ŋɔ — Crèche hali SHS 1.\nDi ni tooi niŋ shɛm:\n1. Kpɛ Admissions yaɣili maa ni a niŋ foom maa (miniti 5).\n2. A nyɛla reference number maa ni yimma.\n3. Shikuru maa boo a mini yɛli 48 maa ni.\nA bɔra ni a baŋ office laɣa?",
  },
  fee: {
    en: "School fees vary by level. You can download the fee schedule from our Downloads page or contact the accounts office. Payments are accepted via MTN MoMo, AirtelTigo Money, Telecel Cash, Paystack or bank transfer, and receipts are issued electronically. Would you like me to explain the payment steps?",
    tw: "Sukuu ka gyina level so. Wobɛtumi afa fee schedule no wɔ Downloads peji no so. Wɔgye sika wɔ MTN MoMo, AirtelTigo, Telecel, Paystack anaa bank. Wɔde receipt nso ma wo. Wopɛ sɛ mekyerɛ wo sɛnea wotua?",
    ee: "Suku gawo nɔŋɔnɔ tso level la. Àte ŋu axɔ gawo ɖoɖo la le Downloads axa la dzi. Woxɔa ga le MTN MoMo, AirtelTigo, Telecel, Paystack alo bank dzi, eye wonaa receipt enumake. Ðe nèle be makpe ɖe ŋuwò le ga ɖoɖo nu?",
    ga: "Skul fii lɛ heɔ shi kɛhã level lɛ. O baanyɛ aŋmala fee schedule lɛ kɛjɛ Downloads peji lɛ nɔ. Wɔŋmɛɛɔ nɔ̃mɔ kɛ MTN MoMo, AirtelTigo, Telecel, Paystack loo bank, ni wɔhaa receipt kɛshɛɛ. Otao ni makwɛ o gbɛ kɛhã fii joo?",
    ha: "Kuɗin makaranta ya bambanta da mataki. Zazzage tsarin kuɗi daga shafin Downloads ko tuntuɓi ofishin asusu. Muna karbar MTN MoMo, AirtelTigo, Telecel, Paystack ko banka, da karba na lantarki. Ina so in bayyana matakan biya?",
    dag: "Shikuru liɣiri woligiri ni level. A ni tooi zaŋ fee schedule maa yi Downloads yaɣili maa ni. Ti deeri liɣiri MTN MoMo, AirtelTigo, Telecel, Paystack bee bank ni, ka tiri receipt maa yimma. A bɔra ni n wuhi a liɣiri yobu shɛm?",
  },
  result: {
    en: "To check results securely:\n1. Go to the Result Checker page.\n2. Enter the student's Admission/Index number and registered phone number.\n3. A 6-digit OTP is sent by SMS (valid 5 minutes).\n4. Enter the OTP to view and download the report card as PDF.\nEach check is logged for security.",
    tw: "Sɛnea wohwɛ nsusuiɛ:\n1. Kɔ Result Checker peji no so.\n2. Fa adesuani no admission number ne ne phone number kɔ.\n3. Wɔde OTP (6) bɛsoma wo SMS so (di mu simma 5).\n4. Fa OTP no wura mu na hwɛ report card no.\nWɔkora sɛnea wohwɛɛ biara.",
    ee: "Ale si nàkpɔ ƒoƒoɖoɖo le dedie:\n1. Yi Result Checker axa la dzi.\n2. Ŋlɔ nusɔsrɔ̃la ƒe ŋkɔnu kple eƒe telefonu.\n3. Woɖona OTP (6) ɖe SMS me (eƒe 5 min).\n4. Ɖo OTP la ɖe eme nàkpɔ ƒoƒoɖoɖo la.\nWokpɔa kpɔkpɔ ɖesiaɖe dzi le dedie.",
    ga: "Gbɛ ni o baanyɛ kwɛ hewalɛ lɛ:\n1. Ya Result Checker peji lɛ nɔ.\n2. Ŋma wiemɔ nɔyeli lɛ admission number kɛ e tɛlɛ numɔ lɛ.\n3. Wɔtsɔɔ OTP (6) SMS nɔ (yɛ 5 miniti mli).\n4. Wo OTP lɛ ni o kwɛ report card lɛ.\nAŋmɛɛɔ nɔ̃mɔ fɛɛ shi yɛ mli.",
    ha: "Yadda ake duba sakamako:\n1. Je shafin Result Checker.\n2. Shigar da lambar ɗalibi da lambar waya.\n3. Ana aika OTP (6) ta SMS (minti 5).\n4. Shigar da OTP don ganin rahoton.\nAna riƙe tarihin kowane duba.",
    dag: "Bunahi lihibu shɛm:\n1. Kpɛ Result Checker yaɣili maa.\n2. Zaŋ bia maa admission number mini o phone number.\n3. Bɛ timdi OTP (6) SMS ni (miniti 5).\n4. Zaŋ OTP maa kpɛ ni a lihi report card maa.\nBɛ gbɛri lihibu kam daa.",
  },
  fallback: {
    en: "I can help with lesson planning, schemes of learning, report-card comments, timetable advice, admissions, fees and results. Could you rephrase your question?",
    tw: "Metumi aboa wo adesua nhyehyɛe, scheme of learning, report nsusuiɛ, timetable, admissions, ka ne nsusui hwɛ. Yɛ wʼasɛmmisa no bio?",
    ee: "Nate ŋu akpe ɖe ŋuwò le nufiafia, nusɔsrɔ̃ dɔdokuiwo, ƒoƒoɖoɖo ŋɔŋlɔwo, timetable, suku yiyi, gawo kple ƒoƒoɖoɖo ŋu. Ðe nàte ŋu agblɔ wò biaɖuɖu la bubu?",
    ga: "Mi baanyɛ ye mi bua o yɛ nitsumɔ shishitoo, schemes, hewalɛ wolo, timetable, skul nyɛɛmɔ, fii kɛ hewalɛ kwɛmɔ. O baanyɛ o bi sane lɛ bɔŋŋ fioo?",
    ha: "Zan iya taimaka da shirin darasi, manhaja, sharhin sakamako, jadwal, shiga makaranta, kuɗi da sakamako. Za ka iya sake tambayar?",
    dag: "N ni tooi sɔŋ a bɔhimbu, bɔhimbu yaɣa, bunahi sabbu, timetable, shikuru kpɛbu, liɣiri mini bunahi. A ni tooi labisi a bɔhigu maa bɔŋŋ?",
  },
};

function demoReply(user: string, ctx: AiContext, lang: LanguageCode): string {
  const q = user.toLowerCase();
  const intent = detectIntent(q);
  const school = ctx.schoolName;
  let reply = pick(lang, REPLIES[intent]);
  // interpolate the school name where the template asks for it
  reply = reply.replaceAll("{school}", school);
  return reply;
}

export async function chat(
  messages: ChatMessage[],
  ctx: AiContext,
  lang: LanguageCode = "en",
): Promise<string> {
  const mode = (process.env.AI_MODE || "offline").toLowerCase();
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  if (mode === "openai" && process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are Kaya AI, the helpful assistant for ${ctx.schoolName}, a GES school. Answer in the user's language (language code: ${lang}). Be friendly, concise and practical for school staff, parents and students in Ghana. Never reveal licensing or activation secrets.`,
            },
            ...messages.slice(-10),
          ],
        }),
      });
      const data = await res.json();
      const reply: string | undefined = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch {
      /* fall through to the offline assistant */
    }
  }

  // offline mode: deterministic, works with no API key, in the user's language
  return demoReply(lastUser, ctx, lang);
}
