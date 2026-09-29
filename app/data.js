/* Sample data for the Elimuhub demo app: "Mwangaza Academy", the same demo school as the web app. */
(function () {
  "use strict";

  var SCHOOL = {
    name: "Mwangaza Academy",
    short: "MA",
    motto: "Light, Knowledge & Excellence",
    address: "Ngong Road, Kilimani, Nairobi",
    postal: "P.O. Box 12345-00100, Nairobi",
    phone: "0700 123 456",
    email: "info@demo.ac.ke",
    paybill: "174379",
    term: "Term 3 2026",
    termStart: "2026-08-24",
    termEnd: "2026-10-30",
    learners: 304,
    staff: 24,
    billed: 10851400,
    collected: 7115800,
    website: "https://pizzatechies.github.io/elimuhb/",
  };

  var ROLES = {
    principal: { key: "principal", label: "Principal", name: "Dr. Grace Wanjiku", first: "Grace", initials: "GW", about: "The whole school: dashboard, learners, fees, exams and notices." },
    bursar: { key: "bursar", label: "Bursar", name: "Mrs. Faith Njeri", first: "Faith", initials: "FN", about: "Fees, M-Pesa matching, receipts, balances and SMS reminders." },
    teacher: { key: "teacher", label: "Teacher", name: "Mr. James Kiprono", first: "James", initials: "JK", about: "Class register, marks entry with CBC levels, and the timetable." },
    parent: { key: "parent", label: "Parent", name: "Mrs. Wanjiru Kamau", first: "Wanjiru", initials: "WK", about: "Two children: fee balances, M-Pesa payments, results and attendance." },
    student: { key: "student", label: "Student", name: "Brian Mwangi Kamau", first: "Brian", initials: "BK", about: "Grade 7 East: timetable, assignments and results." },
  };

  var JUNIOR = ["English", "Kiswahili", "Mathematics", "Religious Education (CRE/IRE/HRE)", "Agriculture & Nutrition", "Social Studies", "Integrated Science", "Pre-Technical Studies", "Creative Arts & Sports"];
  var UPPER = ["English", "Kiswahili", "Mathematics", "Religious Education (CRE/IRE/HRE)", "Science & Technology", "Agriculture & Nutrition", "Social Studies", "Creative Arts"];

  var CLASSES = {
    G7E: { key: "G7E", name: "Grade 7 East", level: "junior", scale: "cbc8", teacher: "Mr. James Kiprono", subjects: JUNIOR },
    G4: { key: "G4", name: "Grade 4", level: "upper", scale: "cbc4", teacher: "Mrs. Mary Achieng", subjects: UPPER },
  };

  var G7E = [
    ["MA0120", "Brian Mwangi Kamau", "M"], ["MA0121", "Brenda Grace Maina", "F"], ["MA0122", "Esther Precious Mohamed", "F"],
    ["MA0123", "Natasha Fatuma Muthoni", "F"], ["MA0124", "Valary Amina Muthoni", "F"], ["MA0125", "Tumaini Kipchoge Ali", "M"],
    ["MA0126", "Jabari Ian Chege", "M"], ["MA0127", "Felix Hassan", "M"], ["MA0128", "Stephen Amani Ndirangu", "M"],
    ["MA0129", "Cynthia Amina Nyambura", "F"], ["MA0130", "Tracy Chebet Gitau", "F"], ["MA0131", "Omondi Kipchoge Macharia", "M"],
    ["MA0132", "Imani Ochieng", "F"], ["MA0133", "Cynthia Barasa", "F"], ["MA0134", "Natasha Ivy Mutua", "F"],
    ["MA0135", "Chebet Nafula Musyoka", "F"], ["MA0136", "Victor Ochieng", "M"], ["MA0137", "Elvis Ochieng", "M"],
    ["MA0138", "Juma Emmanuel Musyoka", "M"], ["MA0139", "Collins Mohamed", "M"],
  ].map(function (r) { return { adm: r[0], name: r[1], gender: r[2], cls: "G7E" }; });

  var WANJIRU = { adm: "MA0069", name: "Wanjiru Njeri Kamau", gender: "F", cls: "G4" };
  var CHILDREN = ["MA0120", "MA0069"];
  var GUARDIAN = { name: "Mrs. Wanjiru Kamau", phone: "0722 000 001", relation: "Mother" };

  /** Fee statements for the parent's two children (invoices and payments this year). */
  var STATEMENTS = {
    MA0120: [
      { type: "invoice", date: "2026-01-05", ref: "INV-000241", label: "Term 1 fees", amount: 30700 },
      { type: "payment", date: "2026-02-01", ref: "RCT-000445", label: "M-Pesa SKE7OQWSHF", amount: 3900, method: "M-Pesa" },
      { type: "payment", date: "2026-02-06", ref: "RCT-000446", label: "M-Pesa SHB4DE4MKA", amount: 3800, method: "M-Pesa" },
      { type: "payment", date: "2026-04-24", ref: "RCT-001086", label: "M-Pesa SKB4SW0IPV", amount: 6300, method: "M-Pesa" },
      { type: "invoice", date: "2026-04-27", ref: "INV-000619", label: "Term 2 fees", amount: 27700 },
      { type: "payment", date: "2026-06-15", ref: "RCT-001085", label: "M-Pesa SJB1ZQTDK9", amount: 6400, method: "M-Pesa" },
      { type: "invoice", date: "2026-08-24", ref: "INV-000923", label: "Term 3 fees", amount: 27700 },
    ],
    MA0069: [
      { type: "invoice", date: "2026-01-05", ref: "INV-000170", label: "Term 1 fees", amount: 24500 },
      { type: "payment", date: "2026-01-28", ref: "RCT-000402", label: "M-Pesa SKA2RP7LQE", amount: 8000, method: "M-Pesa" },
      { type: "invoice", date: "2026-04-27", ref: "INV-000548", label: "Term 2 fees", amount: 22100 },
      { type: "payment", date: "2026-05-19", ref: "RCT-001140", label: "M-Pesa SJE5KD2WNT", amount: 8400, method: "M-Pesa" },
      { type: "invoice", date: "2026-08-24", ref: "INV-000851", label: "Term 3 fees", amount: 22100 },
    ],
  };

  /** Real published marks for the two children (the rest are generated consistently). */
  var MARKS = {
    "opener:MA0120": [60, 56, 43, 72, 49, 58, 49, 60, 60],
    "opener:MA0069": [60, 67, 52, 71, 69, 68, 57, 67],
    "endterm2:MA0120": [64, 51, 40, 70, 53, 61, 45, 57, 66],
    "endterm2:MA0069": [61, 64, 49, 74, 66, 63, 55, 70],
  };

  var EXAMS = [
    { key: "midterm3", name: "Term 3 Mid-Term Exam 2026", short: "T3 Mid-Term", status: "open" },
    { key: "opener", name: "Term 3 Opener Exam 2026", short: "T3 Opener", status: "published" },
    { key: "endterm2", name: "End of Term 2 Examination 2026", short: "End of T2", status: "published" },
  ];

  var PERIODS = [
    ["Lesson 1", "08:00", "08:40"], ["Lesson 2", "08:40", "09:20"], ["Short Break", "09:20", "09:30", true],
    ["Lesson 3", "09:30", "10:10"], ["Lesson 4", "10:10", "10:50"], ["Tea Break", "10:50", "11:20", true],
    ["Lesson 5", "11:20", "12:00"], ["Lesson 6", "12:00", "12:40"], ["Lunch", "12:40", "14:00", true],
    ["Lesson 7", "14:00", "14:40"], ["Lesson 8", "14:40", "15:20"], ["Games / Clubs", "15:20", "16:30", true],
  ].map(function (p) { return { name: p[0], start: p[1], end: p[2], isBreak: !!p[3] }; });

  var TEACHERS = {
    English: "Esther Mwangi", Kiswahili: "Samuel Mutua", Mathematics: "James Kiprono",
    "Religious Education (CRE/IRE/HRE)": "Samuel Mutua", "Agriculture & Nutrition": "Joy Muthoni",
    "Social Studies": "Rose Odhiambo", "Integrated Science": "Janet Onyango", "Pre-Technical Studies": "Joy Muthoni",
    "Creative Arts & Sports": "Felix Waweru", "Science & Technology": "Mary Achieng", "Creative Arts": "Mary Achieng",
  };

  // Grade 7 East timetable, Monday–Friday, lessons 1–8 (from the demo school).
  var S = { E: "English", K: "Kiswahili", M: "Mathematics", R: "Religious Education (CRE/IRE/HRE)", A: "Agriculture & Nutrition", SS: "Social Studies", IS: "Integrated Science", PT: "Pre-Technical Studies", CA: "Creative Arts & Sports" };
  var TIMETABLE = {
    G7E: [
      ["E", "E", "CA", "CA", "A", "SS", "SS", "A"],
      ["E", "K", "K", "E", "R", "SS", "IS", "IS"],
      ["SS", "K", "M", "M", "K", "E", "IS", "PT"],
      ["PT", "IS", "M", "R", "R", "M", "K", "PT"],
      ["CA", "CA", "PT", "R", "A", "A", "R", "M"],
    ].map(function (day) { return day.map(function (k) { return S[k]; }); }),
    G4: [
      ["English", "Mathematics", "Kiswahili", "Science & Technology", "Social Studies", "Creative Arts", "Creative Arts", "Religious Education (CRE/IRE/HRE)"],
      ["Mathematics", "English", "Agriculture & Nutrition", "Agriculture & Nutrition", "Kiswahili", "Science & Technology", "Social Studies", "English"],
      ["Kiswahili", "Mathematics", "English", "Religious Education (CRE/IRE/HRE)", "Science & Technology", "Social Studies", "Creative Arts", "Mathematics"],
      ["English", "Science & Technology", "Mathematics", "Kiswahili", "Agriculture & Nutrition", "Religious Education (CRE/IRE/HRE)", "English", "Creative Arts"],
      ["Mathematics", "Kiswahili", "Social Studies", "English", "Science & Technology", "Agriculture & Nutrition", "Creative Arts", "Creative Arts"],
    ],
  };

  var NOTICES = [
    { id: "n1", title: "Half-term break", audience: "all", daysAgo: 0, body: "Half term runs from 8 to 12 October 2026. Boarders will be released at 12:00 noon on Friday and should report back by 5:00pm on Tuesday." },
    { id: "n2", title: "Annual Parents' Day and prize giving", audience: "parents", daysAgo: 1, body: "We invite all parents to our annual Academic Day and prize giving ceremony on Saturday 17 October in the school hall. The Chief Guest will be the Nairobi County Director of Education." },
    { id: "n3", title: "Staff meeting on Friday", audience: "staff", daysAgo: 1, body: "There will be a full staff meeting on Friday at 3:30pm in the staffroom to review Term 3 syllabus coverage and CBC assessment records." },
    { id: "n4", title: "Grade 9 KJSEA preparation", audience: "parents", daysAgo: 2, body: "Grade 9 learners will sit KNEC school-based assessments over the next three weeks. Parents are encouraged to ensure learners have all required materials and rest well." },
    { id: "n5", title: "Form 4 KCSE registration confirmation", audience: "students", daysAgo: 3, body: "All Form 4 candidates should confirm their KCSE registration details (names, index numbers, subjects and photographs) with the exams office by Friday." },
  ];

  var EVENTS = [
    { date: "2026-10-01", title: "Grade 8 educational trip – Nairobi National Museum", place: "Nairobi National Museum", kind: "Trip" },
    { date: "2026-10-03", title: "Inter-house athletics", place: "School field", kind: "Sports" },
    { date: "2026-10-05", title: "End of Term 3 examinations", place: "", kind: "Exams" },
    { date: "2026-10-08", title: "Half-term break", place: "", kind: "Holiday" },
    { date: "2026-10-14", title: "Board of Management meeting", place: "Boardroom", kind: "Meeting" },
    { date: "2026-10-17", title: "Academic Day & prize giving", place: "School hall", kind: "Academic" },
    { date: "2026-10-20", title: "Mashujaa Day", place: "", kind: "Holiday" },
    { date: "2026-10-23", title: "KCSE rehearsal", place: "Exam rooms", kind: "Exams" },
  ];

  /** Recent fee payments across the school; minutesAgo keeps the feed current. */
  var PAYMENTS = [
    { receipt: "RCT-001727", amount: 24300, method: "M-Pesa", code: "SKC2UEX2AA", learner: "Precious Wanjiku", cls: "Form 3 South", minutesAgo: 18 },
    { receipt: "RCT-001715", amount: 7000, method: "M-Pesa", code: "SGB6IXPGT0", learner: "Juma Kiptoo", cls: "Form 3 North", minutesAgo: 47 },
    { receipt: "RCT-001628", amount: 15900, method: "Cheque", code: "CHQ557103", learner: "Wairimu Atieno", cls: "Form 4", minutesAgo: 95 },
    { receipt: "RCT-001627", amount: 7900, method: "M-Pesa", code: "SHE3YF85ZI", learner: "Wairimu Atieno", cls: "Form 4", minutesAgo: 96 },
    { receipt: "RCT-001619", amount: 27300, method: "M-Pesa", code: "SKB6Y3USAM", learner: "Akinyi Kilonzo", cls: "Form 4", minutesAgo: 140 },
    { receipt: "RCT-001508", amount: 10000, method: "Bank", code: "KCB991116", learner: "Kevin Langat", cls: "Grade 1", minutesAgo: 190 },
    { receipt: "RCT-001474", amount: 29000, method: "Bank", code: "KCB526153", learner: "Samuel Gitau", cls: "Grade 12", minutesAgo: 260 },
    { receipt: "RCT-001429", amount: 15000, method: "M-Pesa", code: "SKC7UUBYXR", learner: "Zawadi Ali", cls: "Grade 11", minutesAgo: 1500 },
    { receipt: "RCT-001356", amount: 7900, method: "M-Pesa", code: "SHB3ABJDT6", learner: "Ivy Muthoni", cls: "Grade 3", minutesAgo: 1560 },
    { receipt: "RCT-001330", amount: 13300, method: "M-Pesa", code: "SGA6J0OLQ3", learner: "Mark Hassan", cls: "Grade 2", minutesAgo: 1620 },
  ];

  /** M-Pesa payments whose account number didn't match a learner; the bursar matches them. */
  var UNMATCHED = [
    { id: "u1", code: "SKF3P9QZ1L", payer: "ALI HASSAN", phone: "0712 345 078", account: "0712345078", amount: 4000, minutesAgo: 35 },
    { id: "u2", code: "SKG7T2LM8D", payer: "GRACE MUTHONI", phone: "0729 118 402", account: "FEES", amount: 12000, minutesAgo: 210 },
    { id: "u3", code: "SKH1W6RB3N", payer: "JAMES OTIENO", phone: "0733 640 915", account: "MA 0129", amount: 7500, minutesAgo: 380, suggest: "MA0129" },
  ];

  var MONTHLY = [["Jan", 4595700], ["Feb", 4468600], ["Mar", 930900], ["Apr", 1482400], ["May", 4658800], ["Jun", 3928600], ["Jul", 0], ["Aug", 2259600], ["Sep", 4856200]];
  var METHODS = [["M-Pesa", 3820000], ["Bank", 2010000], ["Cheque", 597000], ["Cash", 585000], ["Bursary", 103800]];

  var STAFF = [
    ["Dr. Grace Wanjiku", "Principal"], ["Mr. Peter Otieno", "Deputy Principal"], ["Mrs. Faith Njeri", "Bursar"],
    ["Mr. James Kiprono", "HOD Mathematics · Class teacher G7 East"], ["Ms. Esther Mwangi", "English"], ["Mr. Samuel Mutua", "Kiswahili & Religious Education"],
    ["Ms. Rose Odhiambo", "Social Studies"], ["Ms. Janet Onyango", "Integrated Science"], ["Ms. Joy Muthoni", "Agriculture & Pre-Technical Studies"],
    ["Mr. Felix Waweru", "Creative Arts & Sports"], ["Mrs. Mary Achieng", "Class teacher Grade 4"],
  ];

  var ASSIGNMENTS = [
    { id: "a1", subject: "Mathematics", title: "Fractions: Exercise 4.2 (questions 1–10)", dueIn: 1, teacher: "James Kiprono", details: "Work out all ten questions in your exercise book. Show your working for each step." },
    { id: "a2", subject: "English", title: "Composition: A day I will never forget", dueIn: 3, teacher: "Esther Mwangi", details: "Write a composition of 250–300 words. Remember a title, paragraphs and a good ending." },
    { id: "a3", subject: "Integrated Science", title: "Draw and label the parts of a flower", dueIn: 5, teacher: "Janet Onyango", details: "Use a hibiscus or any flower from home. Label at least eight parts." },
    { id: "a4", subject: "Social Studies", title: "Map work: the 47 counties of Kenya", dueIn: 8, teacher: "Rose Odhiambo", details: "On the outline map provided, shade and name the counties in your former province." },
    { id: "a5", subject: "Pre-Technical Studies", title: "Safety signs in the workshop", dueIn: -2, teacher: "Joy Muthoni", details: "Draw six safety signs and explain what each one means.", done: true },
  ];

  var NOTIFICATIONS = [
    { id: "s1", roles: ["parent", "student"], title: "Term 3 Opener results are out", body: "Report cards for Brian and Wanjiru are ready in the app.", minutesAgo: 60 * 26 },
    { id: "s2", roles: ["parent"], title: "Payment received", body: "KES 6,400 for Brian Mwangi Kamau. Receipt RCT-001085. Thank you.", minutesAgo: 60 * 24 * 9 },
    { id: "s3", roles: ["principal", "bursar"], title: "3 M-Pesa payments need matching", body: "Their account numbers didn't match a learner. Match them in Payments.", minutesAgo: 35 },
    { id: "s4", roles: ["bursar", "principal"], title: "M-Pesa payment received", body: "KES 24,300 for Precious Wanjiku (Form 3 South). Receipt RCT-001727.", minutesAgo: 18 },
    { id: "s5", roles: ["teacher", "principal"], title: "Staff meeting on Friday", body: "3:30pm in the staffroom: Term 3 syllabus coverage and CBC records.", minutesAgo: 60 * 20 },
    { id: "s6", roles: ["teacher"], title: "Mid-Term marks entry is open", body: "Enter Term 3 Mid-Term Mathematics marks for Grade 7 East.", minutesAgo: 60 * 5 },
    { id: "s7", roles: ["student"], title: "New assignment: Mathematics", body: "Fractions: Exercise 4.2 is due tomorrow.", minutesAgo: 60 * 3 },
    { id: "s8", roles: ["parent", "student", "teacher", "principal", "bursar"], title: "Half-term break", body: "Half term runs from 8 to 12 October 2026.", minutesAgo: 60 * 2 },
  ];

  var CBC8 = [[90, "EE1"], [75, "EE2"], [58, "ME1"], [41, "ME2"], [31, "AE1"], [21, "AE2"], [11, "BE1"], [0, "BE2"]];
  var CBC4 = [[80, "EE"], [50, "ME"], [30, "AE"], [0, "BE"]];
  var REMARKS = {
    EE: "Exceeds expectations. Excellent mastery of competencies.", EE1: "Exceptional mastery. Keep it up!", EE2: "Very good mastery of competencies.",
    ME: "Meets expectations. Good progress.", ME1: "Meets expectations well. Good work.", ME2: "Meets expectations. Keep improving.",
    AE: "Approaching expectations. More practice needed.", AE1: "Approaching expectations. Put in more effort.", AE2: "Approaching expectations. Needs support.",
    BE: "Below expectations. Requires close support.", BE1: "Below expectations. Needs remedial support.", BE2: "Below expectations. Urgent remedial support needed.",
  };

  window.DEMO = {
    SCHOOL: SCHOOL, ROLES: ROLES, CLASSES: CLASSES, G7E: G7E, WANJIRU: WANJIRU, CHILDREN: CHILDREN, GUARDIAN: GUARDIAN,
    STATEMENTS: STATEMENTS, MARKS: MARKS, EXAMS: EXAMS, PERIODS: PERIODS, TEACHERS: TEACHERS, TIMETABLE: TIMETABLE,
    NOTICES: NOTICES, EVENTS: EVENTS, PAYMENTS: PAYMENTS, UNMATCHED: UNMATCHED, MONTHLY: MONTHLY, METHODS: METHODS,
    STAFF: STAFF, ASSIGNMENTS: ASSIGNMENTS, NOTIFICATIONS: NOTIFICATIONS, CBC8: CBC8, CBC4: CBC4, REMARKS: REMARKS,
  };
})();
