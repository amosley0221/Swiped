// sections.jsx — Section icon library + default content per section.
// Icons are stroked SVGs, sized 24×24, currentColor.

const Icon = {
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  ),
  dollar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M16 6.5H10.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H7.5" />
    </svg>
  ),
  cap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9 12 4l10 5-10 5L2 9Z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 9v5" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  ),
  notebook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M12 8h4M12 12h4" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 6.6a5 5 0 0 0-8.8-1.7 5 5 0 0 0-8.8 1.7c-1.4 4.6 3.5 8.6 8.8 12.7 5.3-4.1 10.2-8.1 8.8-12.7Z" />
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20c8 1 16-3 16-15-7 0-15 2-15 10 0 3 1 5-1 5Z" />
      <path d="M4 20 14 10" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 1-2-2V5Z" />
      <path d="M21 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2V5Z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18 M8 3v4 M16 3v4" />
    </svg>
  ),
  dumbbell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9v6 M6 6v12 M9 10v4 M15 10v4 M18 6v12 M21 9v6" />
      <path d="M9 12h6" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9Z" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 7-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16" />
    </svg>
  ),
  music: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17V5l11-2v12" />
      <circle cx="6" cy="17" r="3" />
      <circle cx="17" cy="15" r="3" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l3 3 M15 15l3 3 M6 18l3-3 M15 9l3-3" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
};

const ICON_KEYS = ['briefcase','dollar','cap','target','notebook','heart','leaf','check','book','calendar','dumbbell','home','code','music','spark','user'];

// Brief copy + full data per section template. Keys map to TWEAK_DEFAULTS.sections[].iconKey.
const SECTION_LIB = {
  work: {
    icon: 'briefcase',
    headline: 'Deep work',
    brief: '2 focus blocks left today',
    stats: [
      { label: 'Focus today', value: '3h 12m' },
      { label: 'Blocks', value: '4 / 6' },
      { label: 'Avg/day', value: '4h 02m' },
    ],
    tasks: [
      { id: 1, title: 'Draft Q3 narrative', done: false },
      { id: 2, title: 'Review pull #482', done: false },
      { id: 3, title: 'Sync notes → Linear', done: true },
      { id: 4, title: 'Inbox zero', done: true },
    ],
    log: [
      { t: '14:02', text: 'Closed focus block — 50m' },
      { t: '11:18', text: 'Pushed branch ds/wheel-snap' },
      { t: '09:45', text: 'Standup — blockers: none' },
    ],
    note: 'Narrative draft needs a new opener. Steal from the Q1 deck.',
  },
  budget: {
    icon: 'dollar',
    headline: 'This month',
    brief: '$842 left of $2,400',
    stats: [
      { label: 'Spent', value: '$1,558' },
      { label: 'Left', value: '$842' },
      { label: 'Daily safe', value: '$38' },
    ],
    tasks: [
      { id: 1, title: 'Move $300 → savings', done: false },
      { id: 2, title: 'Cancel duplicate cloud sub', done: false },
      { id: 3, title: 'Review Amex statement', done: true },
    ],
    log: [
      { t: 'Today', text: 'Groceries — $84.20' },
      { t: 'Yesterday', text: 'Coffee — $4.75 ×3' },
      { t: 'Mon', text: 'Rent — $1,150' },
    ],
    note: 'Eating out is creeping up. Cap at $200 for May.',
  },
  school: {
    icon: 'cap',
    headline: 'This week',
    brief: '3 assignments due',
    stats: [
      { label: 'GPA', value: '3.74' },
      { label: 'Due ≤7d', value: '3' },
      { label: 'Study', value: '6h 40m' },
    ],
    tasks: [
      { id: 1, title: 'CS 142 — Project 4 spec', done: false },
      { id: 2, title: 'Read Camus, ch. 3–4', done: false },
      { id: 3, title: 'Linear algebra pset', done: false },
      { id: 4, title: 'Email Prof. Yoon', done: true },
    ],
    log: [
      { t: 'Tue', text: 'Submitted Stats midterm review' },
      { t: 'Mon', text: 'Office hours w/ Yoon — 45m' },
    ],
    note: 'Camus essay angle: absurd as a discipline, not a feeling.',
    // Semesters are stored newest-first; that order also defines the "before"
    // relationship used for progressive cumulative GPA. `isFuture` semesters
    // are skipped in every GPA calculation.
    semesters: [
      {
        id: 'sp26',
        name: 'Spring 2026',
        isFuture: false,
        classes: [
          { id: 1, name: 'CS 142 — Algorithms', credits: 4, grade: 'A-' },
          { id: 2, name: 'PHIL 220 — Existentialism', credits: 3, grade: 'A' },
          { id: 3, name: 'MATH 250 — Linear Algebra', credits: 4, grade: 'B+' },
          { id: 4, name: 'STAT 318 — Probability', credits: 3, grade: '—' },
        ],
      },
      {
        id: 'fa25',
        name: 'Fall 2025',
        isFuture: false,
        classes: [
          { id: 1, name: 'CS 121 — Intro to CS', credits: 4, grade: 'A' },
          { id: 2, name: 'ENG 101 — Composition', credits: 3, grade: 'A-' },
          { id: 3, name: 'MATH 140 — Calc I', credits: 4, grade: 'B+' },
          { id: 4, name: 'HIST 110 — Modern World', credits: 3, grade: 'A' },
        ],
      },
    ],
  },
  goals: {
    icon: 'target',
    headline: 'Year goals',
    brief: '4 active · 1 stalled',
    stats: [
      { label: 'On track', value: '3' },
      { label: 'Streak', value: '12d' },
      { label: 'Progress', value: '42%' },
    ],
    tasks: [
      { id: 1, title: 'Ship Swiped v1', done: false },
      { id: 2, title: 'Run 750km', done: false },
      { id: 3, title: 'Read 24 books', done: false },
      { id: 4, title: 'Learn Swift basics', done: true },
    ],
    log: [
      { t: 'Wk 19', text: 'Ran 34km — pace 5:12' },
      { t: 'Wk 18', text: 'Finished book #9' },
    ],
    note: 'Stalled: Spanish. Try 10 min/day instead of 30 min/3×wk.',
  },
  notes: {
    icon: 'notebook',
    headline: 'Notebook',
    brief: '23 notes · edited 2h ago',
    stats: [
      { label: 'Notes', value: '23' },
      { label: 'Pinned', value: '4' },
      { label: 'Words', value: '8,402' },
    ],
    tasks: [
      { id: 1, title: 'Idea: wheel haptics on snap', done: false },
      { id: 2, title: 'Book recs from Maya', done: false },
      { id: 3, title: 'Liquid filter cheat-sheet', done: true },
    ],
    log: [
      { t: '2h', text: 'Edited "PWA install flow"' },
      { t: 'Yesterday', text: 'New note "Color audit"' },
    ],
    note: 'The wheel should reward repetition. Tactile, never punishing.',
  },
  health: {
    icon: 'heart',
    headline: 'Today',
    brief: '7,402 steps · 5h 48m sleep',
    stats: [
      { label: 'Steps', value: '7,402' },
      { label: 'Water', value: '6 / 8' },
      { label: 'Sleep', value: '5h 48' },
    ],
    tasks: [
      { id: 1, title: '20-min walk after lunch', done: false },
      { id: 2, title: 'Stretch — hips', done: false },
      { id: 3, title: 'Multivitamin', done: true },
    ],
    log: [
      { t: '13:10', text: 'Walk — 1.2km' },
      { t: '08:00', text: 'Slept 5h 48m · debt 2h' },
    ],
    note: 'Bed by 23:30 three nights this week. Non-negotiable.',
  },
  habits: {
    icon: 'leaf',
    headline: 'Streaks',
    brief: '5 of 7 today',
    stats: [
      { label: 'Today', value: '5 / 7' },
      { label: 'Longest', value: '42d' },
      { label: 'Rate', value: '88%' },
    ],
    tasks: [
      { id: 1, title: 'Read 20 min', done: true },
      { id: 2, title: 'No phone before 9am', done: true },
      { id: 3, title: 'Cold shower', done: false },
      { id: 4, title: 'Journal', done: false },
    ],
    log: [
      { t: 'Today', text: 'Habit stack — 5/7' },
      { t: 'Yesterday', text: 'Perfect day — 7/7' },
    ],
    note: 'Cold shower keeps slipping. Stack it onto "after coffee".',
  },
  tasks: {
    icon: 'check',
    headline: 'Inbox',
    brief: '6 open · 9 done today',
    stats: [
      { label: 'Open', value: '6' },
      { label: 'Today', value: '9' },
      { label: 'Overdue', value: '1' },
    ],
    tasks: [
      { id: 1, title: 'Reply to Sam re: invoice', done: false },
      { id: 2, title: 'Book dentist', done: false },
      { id: 3, title: 'Pick up dry cleaning', done: false },
      { id: 4, title: 'Renew domain', done: true },
    ],
    log: [
      { t: '15:20', text: '✓ Renewed swiped.app' },
      { t: '11:00', text: '+ Added 3 tasks from Mail' },
    ],
    note: 'Dentist is overdue. Stop pushing it.',
  },
  reading: {
    icon: 'book',
    headline: 'Currently',
    brief: '"The Tartar Steppe" · 64%',
    stats: [
      { label: 'Pages', value: '218' },
      { label: 'This wk', value: '92p' },
      { label: 'Books \'26', value: '9' },
    ],
    tasks: [
      { id: 1, title: 'Finish ch. 12–14', done: false },
      { id: 2, title: 'Return library hold', done: false },
      { id: 3, title: 'Add to Storygraph', done: true },
    ],
    log: [
      { t: 'Tonight', text: '32 pages — Tartar Steppe' },
      { t: 'Sun', text: 'Started "The Tartar Steppe"' },
    ],
    note: 'Buzzati: the dread of routine. Pairs with my Camus essay.',
  },
};

// Standard US 4.0 scale. '—' is the placeholder for in-progress classes; it
// stays in the list and counts toward total credits but is skipped in GPA
// math until a real grade is set.
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};
const GRADE_OPTIONS = ['—', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

function calcGPA(classes) {
  let pts = 0, cr = 0;
  for (const c of classes) {
    const g = GRADE_POINTS[c.grade];
    const credits = Number(c.credits) || 0;
    if (g === undefined || credits <= 0) continue;
    pts += g * credits;
    cr += credits;
  }
  return cr > 0 ? { gpa: pts / cr, credits: cr } : { gpa: null, credits: 0 };
}

// Cumulative across every non-future semester — used by the brief panel
// stat so the headline GPA reflects only real (current/past) grades.
function calcOverallGPA(semesters) {
  return calcGPA(
    (semesters || [])
      .filter((s) => !s.isFuture)
      .flatMap((s) => s.classes)
  );
}

// Progressive cumulative for the dropdown: from the given index (selected
// semester) include itself plus every later index in the array (older
// semesters, since the array is newest-first). Future semesters in that
// slice are still skipped.
function calcProgressiveGPA(semesters, fromIndex) {
  if (!semesters || fromIndex < 0 || fromIndex >= semesters.length) {
    return { gpa: null, credits: 0 };
  }
  return calcGPA(
    semesters.slice(fromIndex)
      .filter((s) => !s.isFuture)
      .flatMap((s) => s.classes)
  );
}

// Week math (Monday-anchored, mirrors how academic weeks are typically read).
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function weekKey(date) {
  const d = startOfWeek(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseWeekKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Default week for a semester name. Spring → January, Summer → June, Fall/
// Autumn → August. Returns the first Monday on or after the 1st of that
// month. Returns null if the name doesn't match a known term.
function semesterDefaultWeek(name) {
  if (!name) return null;
  const yMatch = name.match(/\b(20\d{2})\b/) || name.match(/'?(\d{2})\b/);
  const year = yMatch
    ? (yMatch[1].length === 2 ? 2000 + parseInt(yMatch[1], 10) : parseInt(yMatch[1], 10))
    : new Date().getFullYear();
  const lower = name.toLowerCase();
  let month;
  if (lower.includes('spring')) month = 0;
  else if (lower.includes('summer')) month = 5;
  else if (lower.includes('fall') || lower.includes('autumn')) month = 7;
  else return null;
  const d = new Date(year, month, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

Object.assign(window, {
  Icon, SECTION_LIB, ICON_KEYS,
  GRADE_POINTS, GRADE_OPTIONS, calcGPA, calcOverallGPA, calcProgressiveGPA,
  startOfWeek, weekKey, parseWeekKey, semesterDefaultWeek,
});
