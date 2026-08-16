/**
 * Built-in sample lesson notes — subject by subject, following the GES/NaCCA
 * lesson-plan format (topic, duration, objectives, resources, introduction,
 * main activity, plenary, homework). Teachers can copy any sample into their
 * own class/subject from the Lesson Notes screen, then edit and submit it for
 * headteacher vetting.
 *
 * Every sample carries `level` (KG / Primary / JHS / SHS) and `subject` so the
 * picker can filter them per class level. Content is a realistic, editable
 * starting point — teachers should adapt it to their scheme of work.
 */
export type LessonSample = {
  key: string;
  level: string; // "KG", "Primary 3", "JHS 1", "SHS 2"
  subject: string;
  topic: string;
  week: number;
  duration: string;
  objectives: string;
  resources: string;
  activityIntro: string;
  activityMain: string;
  activityPlenary: string;
  homework: string;
};

export const LESSON_SAMPLES: LessonSample[] = [
  // ───────────────────────────── ENGLISH LANGUAGE ─────────────────────────────
  {
    key: "eng-kg-1",
    level: "KG",
    subject: "English Language",
    topic: "Letter Sounds and Recognition: S, A, T, I, P, N",
    week: 2,
    duration: "35 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. identify the letters S, A, T, I, P, N by sight; 2. say the sound each letter makes; 3. point to objects in the classroom that begin with these sounds.",
    resources:
      "Letter cards, picture cards (sun, ant, tap, ink, pot, net), sand trays or play dough, a chart with the six letters.",
    activityIntro:
      "Sing the alphabet song together. Show each letter card one at a time and ask: 'What letter is this?' Encourage learners to repeat the sound after the teacher.",
    activityMain:
      "Learners trace each letter in a sand tray as they say the sound. Play a matching game: each learner picks a picture card and matches it to the letter it starts with (S for sun, A for ant, T for tap, I for ink, P for pot, N for net). Learners with the same letter stand together and say the sound loudly.",
    activityPlenary:
      "Call out a letter and ask learners to show it on their cards and say a word that begins with it. Praise correct answers; repeat the ones learners find difficult.",
    homework:
      "Find and cut out three pictures from an old newspaper or magazine that begin with the letter S, and paste them in the exercise book.",
  },
  {
    key: "eng-p4-1",
    level: "Primary 4",
    subject: "English Language",
    topic: "Parts of Speech: Nouns (Common, Proper and Abstract)",
    week: 3,
    duration: "40 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define a noun; 2. identify common, proper and abstract nouns in sentences; 3. classify nouns correctly in a short exercise.",
    resources:
      "Chalkboard/whiteboard, a chart of noun types, flashcards with nouns (Kumasi, teacher, happiness, river, Monday), learners' exercise books.",
    activityIntro:
      "Show flashcards with the words: Kumasi, teacher, happiness, river, Monday. Ask learners what all these words have in common (they are names of things). Introduce the word 'noun'.",
    activityMain:
      "Explain the three types with examples: common nouns (teacher, river), proper nouns (Kumasi, Monday — always start with a capital letter), abstract nouns (happiness, courage — things we cannot see or touch). Learners work in pairs to sort 12 given words into common, proper and abstract nouns in their books.",
    activityPlenary:
      "Ask three learners to read out one noun from each group. Correct common mistakes, especially capital letters for proper nouns.",
    homework:
      "Write four sentences; underline the common nouns once and the proper nouns twice. Mention one abstract noun in your sentences.",
  },
  {
    key: "eng-jhs1-1",
    level: "JHS 1",
    subject: "English Language",
    topic: "Comprehension: Identifying Main Ideas and Supporting Details",
    week: 4,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. read a passage fluently; 2. identify the main idea of a paragraph; 3. list supporting details; 4. answer comprehension questions in complete sentences.",
    resources:
      "Passage handouts ('The Importance of Clean Water'), dictionaries, chalkboard, learners' comprehension books.",
    activityIntro:
      "Ask learners: 'What is the most important thing in a story — the main point or every small detail?' Let them discuss briefly. Explain that every paragraph has one main idea supported by details.",
    activityMain:
      "Read the passage aloud, then have learners read silently. Together, identify the main idea of the first paragraph and write it on the board. Learners work in groups to find the main idea and two supporting details for each remaining paragraph, then answer five comprehension questions in full sentences.",
    activityPlenary:
      "Groups share their main ideas. The teacher summarises: 'The main idea tells us what the paragraph is about; details tell us more.'",
    homework:
      "Read the next passage at home and write the main idea of each paragraph in one sentence.",
  },
  {
    key: "eng-shs1-1",
    level: "SHS 1",
    subject: "English Language",
    topic: "Essay Writing: The Expository Essay (Structure and Development)",
    week: 5,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. state the features of an expository essay; 2. outline an essay (introduction, body, conclusion); 3. write a well-developed paragraph using examples.",
    resources:
      "Sample essay handouts, essay outline chart, learners' writing pads, dictionary.",
    activityIntro:
      "Present a sample essay and ask: 'What makes this writing effective?' Brainstorm features — clear title, organised paragraphs, examples, formal language.",
    activityMain:
      "Teach the three-part structure: introduction (thesis), body (points with examples and explanations), conclusion (summary and final thought). Learners choose one topic (e.g. 'The Causes of Examination Malpractice') and write a five-point outline. Then they develop the introduction and one body paragraph in class.",
    activityPlenary:
      "Two learners read their introductions aloud. The class gives feedback using the checklist on the chart.",
    homework:
      "Complete the essay at home using the outline written in class, aiming for 400–500 words.",
  },

  // ───────────────────────────── MATHEMATICS ─────────────────────────────
  {
    key: "math-kg-1",
    level: "KG",
    subject: "Mathematics",
    topic: "Counting and Number Recognition 1–10",
    week: 2,
    duration: "35 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. count objects from 1 to 10; 2. recognise the numerals 1–10; 3. match a numeral to the correct number of objects.",
    resources:
      "Counting sticks, bottle tops, number cards 1–10, a number chart, play dough.",
    activityIntro:
      "Count together from 1 to 10 clapping hands. Show the number chart and point to each numeral as learners say it.",
    activityMain:
      "Learners count groups of bottle tops (3 tops, 5 tops, 8 tops) and place the correct number card beside each group. In pairs, one learner counts while the other checks using the number chart. Learners then form the numerals 1–5 with play dough.",
    activityPlenary:
      "Play 'Show me the number': the teacher calls a number (e.g. 7) and learners hold up the correct card while counting aloud to seven.",
    homework:
      "Count the chairs, cups and plates at home and draw the correct number of dots for each in the exercise book.",
  },
  {
    key: "math-p3-1",
    level: "Primary 3",
    subject: "Mathematics",
    topic: "Addition of Two-Digit Numbers with Regrouping",
    week: 6,
    duration: "40 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. add two two-digit numbers; 2. regroup (carry) correctly; 3. check answers by estimation or re-adding.",
    resources:
      "Place-value charts, bundle of sticks (tens and ones), number cards, chalkboard.",
    activityIntro:
      "Revise adding without carrying: 23 + 14. Remind learners of tens and ones using bundles of sticks (2 tens + 3 ones = 23).",
    activityMain:
      "Present 27 + 15. Using sticks, learners discover that 7 ones + 5 ones = 12 ones, which is 1 ten and 2 ones — so we carry 1 ten to the tens column. Model the written algorithm on the board step by step. Learners practise five sums (e.g. 38 + 26, 47 + 18, 56 + 37) in their books.",
    activityPlenary:
      "Learners exchange books to check each other's sums. The teacher solves one example on the board and learners mark their own work.",
    homework:
      "Solve: 29 + 34, 48 + 25, 63 + 19, 75 + 18, 86 + 27.",
  },
  {
    key: "math-jhs1-1",
    level: "JHS 1",
    subject: "Mathematics",
    topic: "Fractions: Addition and Subtraction of Fractions with Different Denominators",
    week: 7,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. find the LCM of two denominators; 2. convert fractions to equivalent fractions; 3. add and subtract fractions with different denominators.",
    resources:
      "Fraction strips, LCM chart, chalkboard, learners' exercise books.",
    activityIntro:
      "Ask: 'Can we add 1/2 and 1/3 directly?' Using fraction strips, show that the pieces are of different sizes, so we must first make them the same size (equivalent fractions).",
    activityMain:
      "Teach the steps: find the LCM of the denominators; convert each fraction to an equivalent fraction with that LCM as denominator; add or subtract the numerators; simplify the answer. Work through 1/2 + 1/3 and 3/4 − 1/6 on the board. Learners practise: 1/4 + 2/5, 5/6 − 1/3, 2/3 + 3/8, 7/10 − 2/5.",
    activityPlenary:
      "Quick-fire: the teacher calls out a fraction pair and learners write the answer on their mini boards, showing the LCM step.",
    homework:
      "Solve: 3/5 + 1/2, 5/6 + 3/4, 4/7 − 1/3, 9/10 − 2/5. Simplify all answers.",
  },
  {
    key: "math-shs1-1",
    level: "SHS 1",
    subject: "Mathematics (Core)",
    topic: "Quadratic Equations: Solving by Factorisation",
    week: 8,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. expand and factorise quadratic expressions; 2. solve quadratic equations by factorisation; 3. check solutions by substitution.",
    resources:
      "Chalkboard, factorisation charts, graph paper, calculators, learners' note books.",
    activityIntro:
      "Revise expansion: (x + 3)(x + 2) = x² + 5x + 6. Ask learners how to go backwards from x² + 5x + 6 to the factors.",
    activityMain:
      "Teach factorisation of the form ax² + bx + c. Show x² − 5x + 6 = (x − 2)(x − 3). Explain the zero-product rule: if (x − 2)(x − 3) = 0, then x = 2 or x = 3. Work two examples (x² + 7x + 12 = 0; 2x² − 5x − 3 = 0) on the board, then learners solve five equations and verify one solution by substitution.",
    activityPlenary:
      "Learners present their solutions. Discuss common errors — wrong signs and forgetting to set the equation to zero first.",
    homework:
      "Solve by factorisation: x² − 9 = 0; x² + 6x + 8 = 0; x² − 3x − 10 = 0; 3x² + 8x + 4 = 0.",
  },

  // ───────────────────────────── SCIENCE ─────────────────────────────
  {
    key: "sci-p5-1",
    level: "Primary 5",
    subject: "Science",
    topic: "The Water Cycle",
    week: 4,
    duration: "40 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. name the processes in the water cycle; 2. describe evaporation, condensation and precipitation; 3. draw and label a simple water-cycle diagram.",
    resources:
      "A kettle (teacher demonstration), a cold glass lid, a chart of the water cycle, learners' drawing books, colouring pencils.",
    activityIntro:
      "Demonstrate: boil water in a kettle and hold a cold glass plate over the steam. Ask learners what they observe (steam rises, water drops form on the plate).",
    activityMain:
      "Explain that the sun heats water in seas, rivers and lakes, turning it into water vapour (evaporation); vapour rises and cools to form clouds (condensation); water falls back as rain (precipitation). Learners draw and label the water cycle diagram in their books and colour it.",
    activityPlenary:
      "Learners retell the water cycle in their own words using the diagram: 'Water evaporates, forms clouds, and falls as rain.'",
    homework:
      "Find out and write three ways people can save water at home, and one reason the water cycle is important for farming.",
  },
  {
    key: "sci-jhs2-1",
    level: "JHS 2",
    subject: "Science",
    topic: "The Human Circulatory System: The Heart and Blood Vessels",
    week: 6,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. state the functions of the heart; 2. distinguish arteries, veins and capillaries; 3. trace the path of blood around the body.",
    resources:
      "A heart model or chart, a stethoscope (if available), diagram of blood vessels, learners' note books.",
    activityIntro:
      "Let learners feel their pulse at the wrist. Ask: 'What makes the pulse?' Introduce the heart as a muscular pump that pushes blood around the body.",
    activityMain:
      "Explain the heart's four chambers and its role. Compare the three vessel types: arteries carry blood away from the heart (thick walls, oxygenated blood), veins carry blood back (valves), capillaries connect them for exchange of food and oxygen. Learners trace the route: heart → arteries → capillaries → veins → heart, and copy a labelled diagram.",
    activityPlenary:
      "Ask learners to stand and act out the flow: some are 'heart', others 'arteries', 'capillaries' and 'veins', moving a bean (a red blood cell) around the circuit.",
    homework:
      "Write five ways to keep the heart healthy (exercise, diet, avoiding smoking, rest, regular check-ups).",
  },
  {
    key: "sci-shs1-1",
    level: "SHS 1",
    subject: "Integrated Science",
    topic: "Measurement and Units: Length, Mass and Time (SI Units)",
    week: 1,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. state the SI base units for length, mass and time; 2. use measuring instruments correctly; 3. convert between multiples and sub-multiples (km, m, cm, mm; kg, g, mg).",
    resources:
      "Metre rule, tape measure, measuring cylinder, beam balance or digital scale, stopwatch, conversion chart.",
    activityIntro:
      "Ask learners to estimate the length of the classroom and the mass of a book. Compare estimates with actual measurements. Discuss why we need standard units.",
    activityMain:
      "Present the SI units: metre (m), kilogram (kg), second (s). Demonstrate correct use of the tape measure, balance and stopwatch. Practise conversions on the board (1 km = 1000 m; 1 m = 100 cm; 1 kg = 1000 g). Learners measure five objects, record readings with correct units, and complete a conversion exercise.",
    activityPlenary:
      "Learners report one measurement each with its unit. Correct errors such as reading a scale from the wrong angle (parallax).",
    homework:
      "Convert: 2.5 km to metres; 850 g to kilograms; 45 minutes to seconds; 3 cm to millimetres.",
  },

  // ───────────────────────────── SOCIAL STUDIES ─────────────────────────────
  {
    key: "sst-p4-1",
    level: "Primary 4",
    subject: "Social Studies",
    topic: "Our Community: People and Their Work",
    week: 3,
    duration: "40 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. name different occupations in their community; 2. describe how each occupation helps the community; 3. appreciate the work of all community members.",
    resources:
      "Pictures of workers (farmer, teacher, nurse, trader, police officer, mason), community chart, drawing materials.",
    activityIntro:
      "Show pictures of workers and ask learners to name each job. Ask: 'Which of these people live in our community?'",
    activityMain:
      "Discuss each occupation and its importance — farmers grow food, teachers educate, nurses care for the sick, traders sell goods, police keep peace. Learners share what their parents or guardians do and how it helps others. In groups, learners draw one worker and write one sentence about why their work matters.",
    activityPlenary:
      "Each group presents its drawing. Emphasise: every job is important, and we should respect all workers.",
    homework:
      "Ask an adult at home about their work and write two sentences about how it helps the community.",
  },
  {
    key: "sst-jhs1-1",
    level: "JHS 1",
    subject: "Social Studies",
    topic: "Ghana's Natural Resources and Their Uses",
    week: 5,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. name Ghana's major natural resources; 2. state the regions where key resources are found; 3. explain the importance of natural resources to the economy.",
    resources:
      "Map of Ghana showing resources, pictures of gold, cocoa, timber, oil, salt, chart, learners' note books.",
    activityIntro:
      "Show a map of Ghana and ask learners to name any resource found in their region. List responses on the board.",
    activityMain:
      "Discuss major resources: gold (Ashanti, Western), cocoa (Western, Ashanti, Brong-Ahafo), timber (Western, Ashanti), bauxite (Eastern), manganese (Western), oil and gas (Western Region), salt (Greater Accra — Ada, Weija), and fish (coastal regions). Explain how these resources provide jobs, foreign exchange and government revenue. Learners copy a resource table and mark the locations on a blank map.",
    activityPlenary:
      "Learners answer: 'Why is it important to protect our natural resources?' Discuss sustainable use.",
    homework:
      "Write three ways we can conserve Ghana's forest and water resources.",
  },
  {
    key: "sst-shs2-1",
    level: "SHS 2",
    subject: "Social Studies",
    topic: "National Development: The Role of Good Governance",
    week: 7,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define good governance; 2. identify its principles (accountability, transparency, rule of law, participation); 3. explain how good governance promotes development.",
    resources:
      "Newspaper articles on governance, the 1992 Constitution (summary), chart of governance principles.",
    activityIntro:
      "Pose the question: 'If school funds were mismanaged, how would it affect you?' Connect accountability at school level to national governance.",
    activityMain:
      "Define good governance and discuss its four pillars: accountability, transparency, participation and the rule of law. Use examples — the District Assembly, budget hearings, free and fair elections. Learners work in groups to analyse a short news article and identify which governance principles are shown.",
    activityPlenary:
      "Groups report their findings. Summarise: good governance builds trust, attracts investment and delivers services such as schools and hospitals.",
    homework:
      "Write a half-page essay: 'How accountability in public office contributes to national development.'",
  },

  // ───────────────────────────── RME ─────────────────────────────
  {
    key: "rme-p3-1",
    level: "Primary 3",
    subject: "Religious & Moral Education",
    topic: "Respect for Parents and Elders",
    week: 2,
    duration: "35 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. explain what it means to respect parents and elders; 2. list ways of showing respect at home and school; 3. practise greeting elders properly.",
    resources:
      "Story cards, a chart of respectful greetings, pictures of families, role-play props.",
    activityIntro:
      "Ask learners to demonstrate how they greet their parents in the morning. Discuss which greeting is most respectful.",
    activityMain:
      "Tell a short story about a child who respects elders and is blessed and helped in return. Discuss ways of showing respect: greeting, obeying, listening when elders speak, using 'please' and 'thank you', helping at home. Learners role-play greeting an elder, a teacher and a visitor correctly.",
    activityPlenary:
      "Ask: 'Why do we respect our parents and elders?' Collect answers and summarise: respect shows love and is taught by every religion.",
    homework:
      "Greet your parents respectfully at home and help them with one chore. Write one sentence about what you did.",
  },
  {
    key: "rme-jhs2-1",
    level: "JHS 2",
    subject: "Religious & Moral Education",
    topic: "Integrity and Truthfulness",
    week: 4,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define integrity; 2. give examples of truthful and untruthful behaviour; 3. explain the consequences of dishonesty in school and society.",
    resources:
      "Bible/Quran passages on truthfulness, case-study cards, chart, learners' note books.",
    activityIntro:
      "Ask: 'Have you ever been praised for telling the truth even when it was hard?' Let two learners share. Introduce the word 'integrity'.",
    activityMain:
      "Define integrity as doing what is right even when no one is watching. Discuss examples: returning extra change at the market, refusing to cheat in exams, owning up to a mistake. Analyse a case study: a student who copies homework and later cannot answer in class. Learners discuss the consequences of dishonesty — loss of trust, punishment, harm to oneself.",
    activityPlenary:
      "Learners complete the sentence: 'A person with integrity will…'. Summarise key points on the board.",
    homework:
      "Write three situations at school where you can show integrity, and what you would do in each.",
  },

  // ───────────────────────────── GHANAIAN LANGUAGE (TWI) ─────────────────────────────
  {
    key: "tw-p5-1",
    level: "Primary 5",
    subject: "Ghanaian Language (Twi)",
    topic: "Ahoɔden Nsɛmfua: Twi Names of Common Objects",
    week: 3,
    duration: "40 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. name common classroom and home objects in Twi; 2. use the words in simple sentences; 3. spell five new Twi words correctly.",
    resources:
      "Picture cards (table — ɔpono, chair — agua, book — nhoma, cup — kuruwa, door — ɔpon), a word chart, exercise books.",
    activityIntro:
      "Point to objects in the classroom and ask learners to say their Twi names. Write the correct names on the board.",
    activityMain:
      "Present five new words with pictures: ɔpono (table), agua (chair), nhoma (book), kuruwa (cup), ɔpon (door). Learners repeat and use each in a sentence, e.g. 'Ɔpono no da ha' (The table is here). Play a quick game: the teacher names an object in English and learners call out the Twi name, and vice versa.",
    activityPlenary:
      "Learners spell the five words aloud and write them once each in their books.",
    homework:
      "Write the five new Twi words and draw the object for each. Learn to spell all five for the next lesson.",
  },
  {
    key: "tw-jhs1-1",
    level: "JHS 1",
    subject: "Ghanaian Language (Twi)",
    topic: "Nnipa Ho Adesua: Describing People in Twi",
    week: 5,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. use adjectives to describe people in Twi; 2. describe a person in three complete sentences; 3. understand the agreement between nouns and adjectives.",
    resources:
      "Pictures of people, adjective chart (kɛseɛ — big, ketewa — small, tenten — tall, tiawa — short, fɛ — beautiful), chalkboard.",
    activityIntro:
      "Show a picture of a tall man and ask learners to describe him. Collect words like 'tenten' (tall) and write them on the board.",
    activityMain:
      "Teach descriptive adjectives and how they agree with the noun class, e.g. 'barima tenten' (a tall man) but 'abea tenten' (a tall woman). Learners write three sentences describing a member of their family using the new adjectives, and read them aloud for the class to guess who is described.",
    activityPlenary:
      "Two learners read their descriptions; the class guesses. Correct adjective agreement errors.",
    homework:
      "Describe your best friend in Twi in four sentences, using at least three different adjectives.",
  },

  // ───────────────────────────── ICT ─────────────────────────────
  {
    key: "ict-p6-1",
    level: "Primary 6",
    subject: "ICT",
    topic: "The Computer and Its Parts",
    week: 2,
    duration: "40 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. identify the main parts of a computer; 2. state the function of each part; 3. switch a computer on and off correctly.",
    resources:
      "A desktop computer or laptop, labelled diagram of a computer, projector (if available).",
    activityIntro:
      "Show a computer and ask learners to name any parts they know. List them on the board.",
    activityMain:
      "Introduce the main parts: monitor (shows information), keyboard (typing), mouse (pointing and clicking), CPU/system unit (the brain), speakers (sound). Learners practise identifying each part on the real machine and learn the correct start-up and shut-down procedure. In pairs, learners match part names to functions on a worksheet.",
    activityPlenary:
      "Quiz: 'Which part shows the pictures and words?' Learners answer with the correct part name.",
    homework:
      "Draw a computer and label five parts. Write one sentence about what the CPU does.",
  },
  {
    key: "ict-jhs2-1",
    level: "JHS 2",
    subject: "ICT",
    topic: "Word Processing: Formatting a Document",
    week: 6,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. open a word processor and type a short text; 2. change font, size and colour; 3. save and retrieve a document.",
    resources:
      "Computers with a word processor (MS Word or LibreOffice Writer), a sample typed document.",
    activityIntro:
      "Ask learners to type their names quickly. Ask: 'How can we make our work look better?' Introduce formatting.",
    activityMain:
      "Demonstrate: typing a short paragraph, selecting text, changing font and size, making text bold and coloured, centring a title, and saving with a meaningful file name. Learners create a one-paragraph letter to a friend, format the title, and save it to their folder. The teacher checks saved files.",
    activityPlenary:
      "Two learners show their formatted documents on the projector (if available). Discuss why neat formatting matters.",
    homework:
      "Write and format a short paragraph about your favourite subject at home (or in the next lab session), then print it if a printer is available.",
  },
  {
    key: "ict-shs1-1",
    level: "SHS 1",
    subject: "ICT",
    topic: "Spreadsheets: Formulas, Functions and Charts",
    week: 8,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. enter data into a spreadsheet; 2. use SUM, AVERAGE, MAX and MIN functions; 3. create and interpret a simple chart.",
    resources:
      "Computers with spreadsheet software, a sample class-marks spreadsheet, projector.",
    activityIntro:
      "Show a printed marks sheet and ask: 'How long would it take to add all these marks by hand?' Introduce spreadsheets as a faster tool.",
    activityMain:
      "Learners enter a list of ten marks into a spreadsheet. Demonstrate entering formulas: =SUM(A2:A11), =AVERAGE(A2:A11), =MAX(A2:A11), =MIN(A2:A11). Learners create a column chart of the marks and label the axes. The teacher moves among learners to check each completed spreadsheet.",
    activityPlenary:
      "Ask learners to read out their average and maximum marks. Explain how businesses and schools use spreadsheets for records.",
    homework:
      "Create a spreadsheet with the marks of five subjects and use functions to find the total and average.",
  },

  // ───────────────────────────── CREATIVE ARTS / PE ─────────────────────────────
  {
    key: "arts-p2-1",
    level: "Primary 2",
    subject: "Creative Arts",
    topic: "Colours: Primary and Secondary Colours",
    week: 3,
    duration: "35 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. name the three primary colours; 2. mix primary colours to get secondary colours; 3. create a simple colour picture.",
    resources:
      "Paint or crayons in red, blue and yellow, mixing trays, paper, a colour chart.",
    activityIntro:
      "Show the three primary colours and ask learners to name objects of each colour (red tomato, blue sky, yellow sun).",
    activityMain:
      "Demonstrate mixing: red + yellow = orange, blue + yellow = green, red + blue = purple. Learners mix colours in trays and paint a simple picture (e.g. a fruit bowl) using both primary and secondary colours.",
    activityPlenary:
      "Learners show their pictures. Ask: 'Which two colours make green?' Reinforce the colour chart on the wall.",
    homework:
      "Find three objects at home for each primary colour and list them under the colour names.",
  },
  {
    key: "pe-p4-1",
    level: "Primary 4",
    subject: "Physical Education",
    topic: "Locomotor Movements: Running, Hopping and Skipping",
    week: 2,
    duration: "30 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. demonstrate correct running, hopping and skipping techniques; 2. follow simple games that use these movements; 3. warm up before physical activity.",
    resources:
      "Cones or markers, whistle, open playing field, music (optional).",
    activityIntro:
      "Lead a five-minute warm-up: marching on the spot, arm circles, gentle stretching. Emphasise why we warm up.",
    activityMain:
      "Demonstrate and practise each movement: running with arms swinging and head up; hopping on one foot then the other; skipping with a rhythm. Organise a relay game where learners run, hop and skip between cones. Observe and correct technique.",
    activityPlenary:
      "Cool down with slow walking and breathing. Ask learners to name the three movements practised and one safety rule.",
    homework:
      "Practise skipping for five minutes at home and record how many skips you complete.",
  },

  // ───────────────────────────── MORE Nacca CCP SUBJECTS ─────────────────────────────
  {
    key: "fr-jhs1-1",
    level: "JHS 1",
    subject: "French",
    topic: "Se Présenter: Saluer et Donner son Nom",
    week: 2,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. greet in French (Bonjour, Bonsoir, Salut); 2. ask and answer 'Comment tu t'appelles ?'; 3. introduce themselves in two complete sentences.",
    resources:
      "Flashcards with greetings, a simple dialogue on the board, audio (if available), learners' vocab books.",
    activityIntro:
      "Greet the class with 'Bonjour !' and wave. Ask learners to repeat. Explain that today they will learn to greet and introduce themselves in French.",
    activityMain:
      "Teach the greetings: Bonjour (good morning/afternoon), Bonsoir (good evening), Salut (hi). Model the dialogue: 'Bonjour ! Comment tu t'appelles ?' — 'Je m'appelle Kwame.' Learners practise in pairs, then four volunteers perform their introductions before the class. Learners copy the dialogue into their vocab books.",
    activityPlenary:
      "Quick quiz: the teacher says 'good morning' and learners respond with the French greeting. Two learners introduce themselves in French.",
    homework:
      "Write a short introduction in French: your name and where you live (e.g. 'Je m'appelle … J'habite à …'). Learn the greetings for the next lesson.",
  },
  {
    key: "com-jhs1-1",
    level: "JHS 1",
    subject: "Computing",
    topic: "Computer Networks: LAN, WAN and the Internet",
    week: 5,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define a computer network; 2. distinguish LAN and WAN; 3. explain how the internet works as a global network.",
    resources:
      "A diagram of a school LAN, pictures of servers and routers, a smart device connected to the internet, learners' note books.",
    activityIntro:
      "Ask learners how many of them use the internet on their phones at home. Ask: 'How does your phone talk to a phone in Accra?' Introduce the idea of networks.",
    activityMain:
      "Define a network as two or more computers connected to share information. Explain LAN (local area network — e.g. computers in the school lab) and WAN (wide area network — e.g. connecting schools across regions). Show how the internet is the world's largest WAN, with routers and servers passing data between networks. Learners draw and label a simple LAN diagram and write one example of each network type.",
    activityPlenary:
      "Ask: 'Is the school computer lab a LAN or a WAN? Why?' and 'What device connects your home to the internet?'",
    homework:
      "List three uses of the internet (education, communication, entertainment) and write one sentence about how a network helps a school.",
  },
  {
    key: "ct-jhs1-1",
    level: "JHS 1",
    subject: "Career Technology",
    topic: "Basic Woodwork: Measuring, Marking and Cutting",
    week: 3,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. identify basic woodwork tools; 2. measure and mark timber accurately; 3. cut along a marked line safely.",
    resources:
      "Timber offcuts, measuring tape, try square, marking gauge, pencil, tenon saw, safety goggles.",
    activityIntro:
      "Show a piece of furniture (or a picture) and ask: 'What skills and tools did it take to make this?' Introduce the workshop and its safety rules.",
    activityMain:
      "Identify and name the tools: measuring tape, try square, marking gauge, tenon saw. Demonstrate safe measuring and marking: set the tape, mark with a sharp pencil, square the line with a try square. The teacher demonstrates sawing on a bench hook, then learners (in pairs, supervised) measure, mark and cut a simple 10 cm piece of timber.",
    activityPlenary:
      "Learners show their cut pieces. The class reviews the safety rules — always wear goggles, keep fingers clear of the blade, never run in the workshop.",
    homework:
      "List five safety rules for a workshop and draw two of the tools used today with their names.",
  },
  {
    key: "citz-jhs1-1",
    level: "JHS 1",
    subject: "Citizenship Education",
    topic: "National Symbols of Ghana and Their Meanings",
    week: 2,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. identify Ghana's national symbols; 2. explain the meaning of the colours of the national flag; 3. show respect for national symbols.",
    resources:
      "The Ghana flag, pictures of the coat of arms, the national anthem on a chart, a map of Ghana.",
    activityIntro:
      "Show the Ghana flag and ask learners what it represents. Ask: 'When do we sing the national anthem?'",
    activityMain:
      "Present the national symbols: the flag (red — the blood of our forebears; gold — our mineral wealth; green — our rich vegetation; the black star — African freedom and unity), the coat of arms (eagle, star, lion, cacao tree), and the national anthem. Discuss how citizens show respect — standing for the anthem, not trampling the flag, using the symbols with pride. Learners copy the meaning of the flag colours and colour a flag in their books.",
    activityPlenary:
      "Learners sing the first stanza of the national anthem standing respectfully. Ask one learner to explain what the black star represents.",
    homework:
      "Draw the Ghana flag neatly, label its colours, and write one sentence about what the coat of arms shows.",
  },
  {
    key: "music-p4-1",
    level: "Primary 4",
    subject: "Music",
    topic: "Rhythm: Beats and Clapping Patterns",
    week: 4,
    duration: "35 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. keep a steady beat; 2. clap simple rhythm patterns; 3. play a rhythm pattern on a drum or improvised instrument.",
    resources:
      "A drum or tambourine, rhythm cards with dot patterns, improvised instruments (bottles, claves).",
    activityIntro:
      "Play a steady beat on the drum and ask learners to clap along. Ask: 'What happens when we all clap at the same time?' Introduce the word 'beat'.",
    activityMain:
      "Explain that rhythm is a pattern of long and short sounds over a steady beat. Clap a simple pattern (taa — ti-ti — taa) and have learners copy it. Show rhythm cards and practise three patterns. Learners form a rhythm band: some keep the beat on drums, others play the pattern on shakers, and the class performs together.",
    activityPlenary:
      "The class performs one rhythm pattern for the teacher. Ask learners to clap the pattern they liked most and say why rhythm matters in music.",
    homework:
      "Create your own clapping pattern of four beats and teach it to someone at home.",
  },
  {
    key: "mil-jhs2-1",
    level: "JHS 2",
    subject: "Management in Living",
    topic: "Food and Nutrition: Planning a Balanced Meal",
    week: 6,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. state the six food groups; 2. explain what a balanced meal is; 3. plan a one-day balanced menu using local foods.",
    resources:
      "Pictures of local foods (kenkey, rice, beans, kontomire, fish, fruit), a food-guide chart, sample menus.",
    activityIntro:
      "Ask learners what they ate this morning. Ask: 'Is that meal balanced? What does balanced mean?'",
    activityMain:
      "Present the food groups: grains, vegetables, fruits, proteins, dairy, fats. Explain that a balanced meal includes foods from different groups in the right amounts. Using local examples (banku and okro stew with fish, rice and beans, kontomire stew with rice), learners plan a one-day menu — breakfast, lunch and dinner — choosing at least three food groups per meal. Learners share their menus in pairs.",
    activityPlenary:
      "Ask three learners to present their menus. Emphasise: eat a variety of local foods, limit sugar and salt, and drink plenty of water.",
    homework:
      "Write a balanced breakfast and lunch using only foods available at home, and name the food groups in each.",
  },
  {
    key: "va-jhs1-1",
    level: "JHS 1",
    subject: "Visual Arts",
    topic: "Drawing and Shading: Still-Life Sketching",
    week: 3,
    duration: "45 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. identify the basic shapes in objects; 2. sketch a simple still-life arrangement; 3. apply light and shade to give the drawing depth.",
    resources:
      "A still-life arrangement (a bowl, fruit, a cloth), pencils (2B, 4B, 6B), erasers, drawing paper.",
    activityIntro:
      "Show the still-life arrangement and ask learners to name the shapes they can see (circle for the bowl, oval for the fruit). Explain that every object can be drawn from basic shapes.",
    activityMain:
      "Demonstrate sketching the arrangement using light lines: first the basic shapes, then refining the outline. Teach shading techniques — hatching, cross-hatching and blending — and how the light source decides where shadows fall. Learners sketch the arrangement and shade it, starting with the darkest areas.",
    activityPlenary:
      "Display the finished sketches on the board. Learners comment on which parts look most three-dimensional and why.",
    homework:
      "Arrange three objects at home (e.g. a cup, a bottle, a fruit) and sketch them with shading, paying attention to the light source.",
  },

  // ───────────────────────────── SHS ELECTIVE SUBJECTS ─────────────────────────────
  {
    key: "shs-econ-1",
    level: "SHS 1",
    subject: "Economics",
    topic: "The Basic Economic Problem: Scarcity and Choice",
    week: 2,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define scarcity; 2. explain the basic economic problem; 3. distinguish between needs and wants; 4. explain opportunity cost with examples.",
    resources:
      "Chalkboard, chart of needs vs wants, newspaper adverts, learners' note books.",
    activityIntro:
      "Ask: 'If you had GH₵20, what would you buy, and what would you have to give up?' Discuss the idea that money is limited but choices are many.",
    activityMain:
      "Define scarcity (limited resources against unlimited wants) and the basic economic problem (what to produce, how to produce, for whom to produce). Distinguish needs (food, shelter, clothing) from wants (designer shoes, video games). Explain opportunity cost as the next best alternative forgone. Learners list five personal wants and identify the opportunity cost of each.",
    activityPlenary:
      "Quick questions: 'What is the opportunity cost of attending school instead of working?' Discuss answers.",
    homework:
      "Describe two economic decisions your family makes and identify the opportunity cost of each.",
  },
  {
    key: "shs-gov-1",
    level: "SHS 1",
    subject: "Government",
    topic: "Constitutions: Types and Features",
    week: 3,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define a constitution; 2. distinguish written and unwritten constitutions; 3. state the features of a good constitution.",
    resources:
      "Summary of the 1992 Constitution, chart comparing written/unwritten constitutions, current affairs articles.",
    activityIntro:
      "Ask: 'What rules guide your school?' Relate school rules to a country's constitution — the supreme law of the land.",
    activityMain:
      "Define a constitution and explain its supremacy. Compare written (e.g. Ghana's 1992 Constitution) and unwritten (e.g. the United Kingdom) constitutions. Discuss features of a good constitution: clarity, flexibility, protection of rights, separation of powers. Learners complete a comparison table in their books.",
    activityPlenary:
      "Learners answer: 'Why is it important for a constitution to protect fundamental human rights?'",
    homework:
      "Research and write two chapters of Ghana's 1992 Constitution and one right each chapter protects.",
  },
  {
    key: "shs-bio-1",
    level: "SHS 1",
    subject: "Biology",
    topic: "The Cell: Structure and Functions of Organelles",
    week: 4,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. state the cell as the basic unit of life; 2. draw and label a plant and an animal cell; 3. describe the functions of the nucleus, mitochondria, ribosomes, cell membrane and chloroplasts.",
    resources:
      "Microscope (if available), prepared slides or cell charts, labelled diagrams, learners' drawing books.",
    activityIntro:
      "Show learners a piece of onion skin (or a chart) and ask: 'What is the smallest living unit that makes up this leaf?' Introduce the cell.",
    activityMain:
      "Present the main organelles and their functions: nucleus (controls activities), cell membrane (controls entry and exit), cytoplasm (site of reactions), mitochondria (energy), ribosomes (protein synthesis), chloroplasts (photosynthesis — plants only), cell wall (support — plants only). Learners draw and label both cell types and complete a functions table.",
    activityPlenary:
      "Quick recall: 'Which organelle releases energy?' and 'Which organelle is found only in plant cells?'",
    homework:
      "Draw a plant cell and an animal cell neatly, label six organelles in each, and state one function of each.",
  },
  {
    key: "shs-chem-1",
    level: "SHS 1",
    subject: "Chemistry",
    topic: "The Periodic Table: Periods, Groups and Periodic Trends",
    week: 5,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. explain the arrangement of elements in the periodic table; 2. identify periods and groups; 3. describe trends in atomic size and metallic character.",
    resources:
      "Periodic table chart, element cards, chalkboard, learners' note books.",
    activityIntro:
      "Show the periodic table and ask learners to find familiar elements (oxygen, iron, gold, sodium). Ask what pattern they notice in the arrangement.",
    activityMain:
      "Explain that elements are arranged by increasing atomic number. Define periods (horizontal rows) and groups (vertical columns with similar properties). Discuss trends: atomic size increases down a group and decreases across a period; metallic character increases down a group. Learners identify the group and period of five given elements and predict their properties.",
    activityPlenary:
      "Ask learners to state the group and period of sodium and chlorine, and one property of each group.",
    homework:
      "Using the periodic table, write the group and period of: magnesium, carbon, potassium and iodine.",
  },
  {
    key: "shs-phy-1",
    level: "SHS 1",
    subject: "Physics",
    topic: "Scalar and Vector Quantities",
    week: 2,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. distinguish scalar from vector quantities; 2. give examples of each; 3. represent vectors with arrows.",
    resources:
      "Chalkboard, metre rules, graph paper, compass for direction examples, pictures of motion.",
    activityIntro:
      "Ask: 'If I walk 5 km, does it matter which direction?' Introduce the idea that some quantities need direction.",
    activityMain:
      "Define scalars (magnitude only: distance, speed, mass, time) and vectors (magnitude and direction: displacement, velocity, force, acceleration). Show how vectors are drawn as arrows, with length for magnitude and direction for direction. Learners classify ten quantities as scalar or vector and draw three vector diagrams.",
    activityPlenary:
      "Quick quiz: 'Is temperature scalar or vector? What about force?' Learners justify their answers.",
    homework:
      "List five scalar and five vector quantities, and draw arrows to represent a 30 N force to the east and a 50 N force to the north.",
  },
  {
    key: "shs-acc-1",
    level: "SHS 1",
    subject: "Financial Accounting",
    topic: "The Accounting Equation and Double Entry",
    week: 3,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. state the accounting equation; 2. explain assets, liabilities and capital; 3. record simple transactions using double entry.",
    resources:
      "Chalkboard, sample business transactions, learners' note books, a chart of the accounting equation.",
    activityIntro:
      "Ask: 'If you start a business with GH₵1,000, where does that money appear?' Introduce the idea of the business owning assets funded by capital.",
    activityMain:
      "Present the accounting equation: Assets = Capital + Liabilities. Define each term with examples. Teach double entry: every transaction has a debit and a credit. Work through transactions such as starting a business with cash, buying stock for cash, and taking a loan. Learners record five transactions in a simple T-account format.",
    activityPlenary:
      "Learners solve one transaction on the board. Correct common errors in the debit/credit rules.",
    homework:
      "State the accounting equation and record the following: started business with GH₵5,000 cash; bought goods for GH₵2,000 cash; borrowed GH₵1,000 from a bank.",
  },
  {
    key: "shs-geog-1",
    level: "SHS 1",
    subject: "Geography",
    topic: "The Earth in Space: Rotation and Revolution",
    week: 2,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. describe the rotation and revolution of the Earth; 2. explain day and night; 3. explain the seasons and the causes of the four seasons.",
    resources:
      "A globe and a torch (or lamp), diagrams of the Earth's orbit, chart of the seasons.",
    activityIntro:
      "Darken the room and shine a torch on a globe. Ask learners why only half the globe is lit. Introduce rotation.",
    activityMain:
      "Explain rotation (Earth spins on its axis once every 24 hours, causing day and night) and revolution (Earth orbits the sun in about 365¼ days). Show how the tilt of the Earth's axis causes the seasons as the Earth moves around the sun. Learners copy a labelled diagram of the Earth's orbit and write definitions of rotation and revolution.",
    activityPlenary:
      "Ask: 'Why is it day in Ghana when it is night in Australia?' and 'Which season does the northern hemisphere have in December?'",
    homework:
      "Write the difference between rotation and revolution, and explain why Ghana experiences the rainy and dry seasons.",
  },
  {
    key: "shs-lit-1",
    level: "SHS 1",
    subject: "Literature in English",
    topic: "Introduction to Drama: Elements of a Play",
    week: 4,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define drama; 2. identify the elements of a play (plot, character, dialogue, setting, theme); 3. perform a short scene from a set play.",
    resources:
      "A set text (e.g. a short play), props, learners' scripts, chart of dramatic elements.",
    activityIntro:
      "Ask learners to act out greeting someone at the market. Ask: 'What made it a performance?' Introduce drama as a story told through action and speech.",
    activityMain:
      "Present the elements: plot (sequence of events), character, dialogue, setting, theme. Read a short scene from the set play and identify each element. Learners form groups of four, choose a short scene, assign roles and rehearse a two-minute performance with simple props.",
    activityPlenary:
      "Two groups perform their scenes. The class identifies the plot, characters and theme in each.",
    homework:
      "Read the next scene of the play at home and write a one-paragraph summary of its plot.",
  },
  {
    key: "shs-ecomath-1",
    level: "SHS 1",
    subject: "Elective Mathematics",
    topic: "Set Theory: Operations on Sets",
    week: 3,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. define a set and its notation; 2. perform union, intersection and complement operations; 3. solve problems using Venn diagrams.",
    resources:
      "Chalkboard, Venn diagram chart, learners' note books, set notation cards.",
    activityIntro:
      "Ask learners to group themselves by, say, eye colour or favourite subject. Explain that each group is a 'set'.",
    activityMain:
      "Define sets, elements, subsets and the universal set. Teach the operations: union (A ∪ B), intersection (A ∩ B) and complement (A′). Show how Venn diagrams illustrate these operations with a worked example involving two overlapping sets of students taking Mathematics and Physics. Learners solve two problems using Venn diagrams.",
    activityPlenary:
      "Learners present one Venn diagram on the board and explain the regions. Correct notation errors.",
    homework:
      "In a class of 30, 18 play football and 15 play basketball; 8 play both. Draw a Venn diagram and find how many play neither.",
  },
  {
    key: "shs-busmgmt-1",
    level: "SHS 1",
    subject: "Business Management",
    topic: "Forms of Business Ownership",
    week: 3,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. describe sole proprietorship, partnership and limited liability companies; 2. state the advantages and disadvantages of each; 3. advise on the suitable form for a given business.",
    resources:
      "Chart comparing business forms, case-study cards, newspaper business pages.",
    activityIntro:
      "Ask: 'If you started a small provision shop, who would own it and who would be responsible if it made a loss?'",
    activityMain:
      "Present the three main forms: sole proprietorship (one owner, full control, unlimited liability), partnership (two or more partners, shared capital and profits, unlimited liability), limited liability company (separate legal entity, shareholders, limited liability). Learners complete a comparison table and analyse a case study to recommend the best form for a new business.",
    activityPlenary:
      "Groups justify their recommendations. Summarise the key differences on the board.",
    homework:
      "Write three advantages and three disadvantages of a partnership, and name two limited liability companies in Ghana.",
  },
  {
    key: "shs-history-1",
    level: "SHS 1",
    subject: "History",
    topic: "Pre-Colonial Ghana: The Kingdoms of the North (Dagbon)",
    week: 2,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. locate Dagbon on a map; 2. describe the political organisation of Dagbon; 3. explain the role of the Ya-Na in the kingdom.",
    resources:
      "Map of Ghana, pictures of the Ya-Na's palace, chart of Dagbon political structure.",
    activityIntro:
      "Ask learners from the northern part of Ghana what they know about Dagbon. Introduce the kingdom as one of Ghana's great pre-colonial states.",
    activityMain:
      "Describe the origins and location of Dagbon (in the Northern Region, around Yendi and Tamale). Explain its political organisation under the Ya-Na (paramount chief), the skin system, and the roles of sub-chiefs. Discuss the kingdom's economy — trade, farming, crafts. Learners copy a diagram of the political structure and answer short questions.",
    activityPlenary:
      "Ask: 'How is chieftaincy in Dagbon similar to or different from chieftaincy in your own area?'",
    homework:
      "Write five sentences on the role of the Ya-Na in traditional Dagbon government.",
  },
  {
    key: "shs-agri-1",
    level: "SHS 1",
    subject: "Agriculture (General)",
    topic: "Soil Types and Their Properties",
    week: 4,
    duration: "50 minutes",
    objectives:
      "By the end of the lesson, learners will be able to: 1. identify the major soil types; 2. describe the properties of sandy, clay and loamy soils; 3. explain the importance of soil to crop production.",
    resources:
      "Soil samples (sandy, clay, loamy), jars of water for settling test, magnifying glasses, chart of soil types.",
    activityIntro:
      "Show three soil samples and ask learners to feel and describe them. Ask: 'Which soil would be best for growing maize?'",
    activityMain:
      "Examine each soil: sandy (large particles, drains fast, low nutrients), clay (fine particles, holds water, sticky when wet), loam (balanced mixture — best for most crops). Conduct a settling test: shake each soil in a jar of water and observe the layers. Learners record their observations and copy a soil-properties table.",
    activityPlenary:
      "Learners answer: 'Which soil type would you choose for a vegetable garden and why?'",
    homework:
      "Collect soil from your home or farm, identify its type, and write how you could improve it for planting.",
  },
];

/** All subjects that appear in the sample library, grouped by level band. */
export const SAMPLE_SUBJECTS = [...new Set(LESSON_SAMPLES.map((s) => s.subject))].sort();

export function samplesForLevel(levelFilter: string): LessonSample[] {
  const q = levelFilter.trim().toLowerCase();
  if (!q) return LESSON_SAMPLES;
  return LESSON_SAMPLES.filter(
    (s) => s.level.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q)
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Developer-uploaded samples — stored as LessonNote rows with isSample=true,
// so they flow into the same sample library (list, from-sample, PDF, ZIP)
// alongside the built-in notes. Only used server-side.
// ────────────────────────────────────────────────────────────────────────────

export type DbSampleRow = {
  id: string;
  sampleLevel: string | null;
  sampleSubject: string | null;
  topic: string;
  week: number | null;
  duration: string | null;
  objectives: string | null;
  resources: string | null;
  activityIntro: string | null;
  activityMain: string | null;
  activityPlenary: string | null;
  homework: string | null;
  createdAt: Date;
};

export function dbSampleToSample(row: DbSampleRow): LessonSample {
  return {
    key: row.id,
    level: row.sampleLevel ?? "General",
    subject: row.sampleSubject ?? "General",
    topic: row.topic,
    week: row.week ?? 1,
    duration: row.duration ?? "40 minutes",
    objectives: row.objectives ?? "",
    resources: row.resources ?? "",
    activityIntro: row.activityIntro ?? "",
    activityMain: row.activityMain ?? "",
    activityPlenary: row.activityPlenary ?? "",
    homework: row.homework ?? "",
  };
}

/** All developer-uploaded samples, newest first. Server-side only. */
export async function dbSamples(): Promise<LessonSample[]> {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.lessonNote.findMany({
    where: { isSample: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(dbSampleToSample);
}

/** Find a sample by key — built-in first, then developer-uploaded. Server-side only. */
export async function findSample(key: string): Promise<LessonSample | null> {
  const staticHit = LESSON_SAMPLES.find((s) => s.key === key);
  if (staticHit) return staticHit;
  const { prisma } = await import("@/lib/prisma");
  const row = await prisma.lessonNote.findFirst({ where: { id: key, isSample: true } });
  return row ? dbSampleToSample(row) : null;
}
