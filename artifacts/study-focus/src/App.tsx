import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coffee,
  Flame,
  Flower2,
  House,
  Leaf,
  ListChecks,
  Minus,
  MoreHorizontal,
  NotebookPen,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Sprout,
  Target,
  TimerReset,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';

type View = 'overview' | 'tasks' | 'calendar' | 'garden' | 'history' | 'journal' | 'settings';
type StudyMode = 'Learning' | 'Test prep' | 'Normal study';

type StudyTask = {
  id: string;
  title: string;
  subject: string;
  pages: number;
  completedPages: number;
  kind: 'Homework' | 'Project' | 'Test';
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
};

type PlantSnapshot = {
  date: string;
  label: string;
  dayNumber?: number;
  weekNumber?: number;
  xp: number;
  streak: number;
  pages: number;
  sessions: number;
  focusMinutes?: number;
  focusHours?: number;
  stage: number;
  note: string;
};

type GardenFlower = {
  id: string;
  weekNumber: number;
  plantedOn: string;
};

type StudyState = {
  tasks: StudyTask[];
  subjects: string[];
  xp: number;
  streak: number;
  sessions: number;
  todayPages: number;
  todaySessions: number;
  todayFocusMinutes: number;
  todayXp: number;
  distractions: number;
  minutesLost: number;
  selectedMinutes: number;
  remainingSeconds: number;
  timerRunning: boolean;
  breakRunning: boolean;
  breakRemainingSeconds: number;
  breakSecondsToday: number;
  subject: string;
  mode: StudyMode;
  journal: string;
  calendarNotes: Record<string, string>;
  diaryEntries: Record<string, string>;
  displayName: string;
  history: PlantSnapshot[];
  dailyRecords: Record<string, PlantSnapshot>;
  studyDay: number;
  weekNumber: number;
  lastStudyDate: string | null;
  gardenFlowers: GardenFlower[];
  distractionRunning: boolean;
  distractionReason: string;
  distractionStartedAt: number | null;
  lostSeconds: number;
  compensationSeconds: number;
  timerStartedAt: number | null;
  timerEndsAt: number | null;
  breakStartedAt: number | null;
  breakEndsAt: number | null;
};

const queryClient = new QueryClient();
const storageKey = 'my-own-world-state-v2';

const defaultTasks: StudyTask[] = [];

const dailyQuotes = [
  { text: 'Small steps still move you forward.', author: 'Study Focus' },
  { text: 'You do not need to feel ready to begin.', author: 'Study Focus' },
  { text: 'A page today is a gift to tomorrow.', author: 'Study Focus' },
  { text: 'Make it simple. Make it yours. Keep going.', author: 'Study Focus' },
  { text: 'Your attention is a place worth tending.', author: 'Study Focus' },
  { text: 'Progress grows quietly before it becomes visible.', author: 'Study Focus' },
  { text: 'Begin with care, then let rhythm do the rest.', author: 'Study Focus' },
];

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function monthGrid(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function shiftDateKey(key: string, offset: number) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

const initialState: StudyState = {
  tasks: defaultTasks,
  subjects: ['Biology', 'Mathematics', 'History', 'Languages'],
  xp: 0,
  streak: 0,
  sessions: 0,
  todayPages: 0,
  todaySessions: 0,
  todayFocusMinutes: 0,
  todayXp: 0,
  distractions: 0,
  minutesLost: 0,
  selectedMinutes: 25,
  remainingSeconds: 25 * 60,
  timerRunning: false,
  breakRunning: false,
  breakRemainingSeconds: 10 * 60,
  breakSecondsToday: 0,
  subject: 'Biology',
  mode: 'Learning',
  journal: '',
  calendarNotes: {},
  diaryEntries: {},
  displayName: 'Alex',
  history: [],
  dailyRecords: {},
  studyDay: 0,
  weekNumber: 1,
  lastStudyDate: null,
  gardenFlowers: [],
  distractionRunning: false,
  distractionReason: '',
  distractionStartedAt: null,
  lostSeconds: 0,
  compensationSeconds: 0,
  timerStartedAt: null,
  timerEndsAt: null,
  breakStartedAt: null,
  breakEndsAt: null,
};

function readState(): StudyState {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return initialState;
    const parsed = JSON.parse(saved) as Partial<StudyState>;
    const rawRecords = parsed.dailyRecords && Object.keys(parsed.dailyRecords).length > 0
      ? parsed.dailyRecords
      : Object.fromEntries((parsed.history ?? []).map((record) => [record.date, record]));
    const dailyRecords = parsed.todayXp === undefined ? migrateLegacyDailyRecords(rawRecords) : rawRecords;
    const currentRecord = parsed.lastStudyDate ? dailyRecords[parsed.lastStudyDate] : undefined;
    return {
      ...initialState,
      ...parsed,
      history: rebuildHistory(dailyRecords),
      dailyRecords,
      studyDay: parsed.studyDay ?? 0,
      weekNumber: parsed.weekNumber ?? 1,
      lastStudyDate: parsed.lastStudyDate ?? null,
      gardenFlowers: parsed.gardenFlowers ?? [],
      todaySessions: parsed.todaySessions ?? 0,
      todayFocusMinutes: parsed.todayFocusMinutes ?? 0,
      todayXp: parsed.todayXp ?? currentRecord?.xp ?? 0,
      timerStartedAt: parsed.timerStartedAt ?? null,
      timerEndsAt: parsed.timerEndsAt ?? null,
      breakStartedAt: parsed.breakStartedAt ?? null,
      breakEndsAt: parsed.breakEndsAt ?? null,
      diaryEntries: parsed.diaryEntries ?? (parsed.journal ? { [localDateKey(new Date())]: parsed.journal } : {}),
    } as StudyState;
  } catch {
    return initialState;
  }
}

function migrateLegacyDailyRecords(records: Record<string, PlantSnapshot>): Record<string, PlantSnapshot> {
  let previousXp = 0;
  let previousSessions = 0;
  return Object.fromEntries(
    Object.values(records)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((record) => {
        const dailyRecord = {
          ...record,
          xp: Math.max(0, record.xp - previousXp),
          sessions: Math.max(0, record.sessions - previousSessions),
          focusHours: Number(((record.focusMinutes ?? 0) / 60).toFixed(2)),
        };
        previousXp = record.xp;
        previousSessions = record.sessions;
        return [record.date, dailyRecord];
      }),
  );
}

function createGardenPreviewState(state: StudyState): StudyState {
  const today = localDateKey(new Date());
  const gardenFlowers = Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    return {
      id: `garden-demo-${weekNumber}`,
      weekNumber,
      plantedOn: shiftDateKey(today, (weekNumber - 12) * 7),
    };
  });
  const history = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(today, index - 6);
    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dayNumber: index + 1,
      weekNumber: 12,
      xp: 20 + index * 5,
      streak: index + 1,
      pages: 18 + index * 3,
      sessions: 72 + index * 2,
      focusMinutes: 150 + index * 5,
      stage: 5,
      note: 'A steady day in your growing rhythm.',
    };
  });

  return {
    ...state,
    xp: 2460,
    streak: 7,
    sessions: 86,
    todayPages: 36,
    todaySessions: 7,
    todayFocusMinutes: 180,
    todayXp: 55,
    studyDay: 7,
    weekNumber: 13,
    lastStudyDate: today,
    gardenFlowers,
    history,
    dailyRecords: Object.fromEntries(history.map((item) => [item.date, item])),
    timerRunning: false,
    breakRunning: false,
    timerStartedAt: null,
    timerEndsAt: null,
    breakStartedAt: null,
    breakEndsAt: null,
  };
}

function getPlantStage(xp: number, streak: number) {
  if (xp >= 650 || streak >= 14) return 5;
  if (xp >= 350 || streak >= 7) return 4;
  if (xp >= 200 || streak >= 3) return 3;
  if (xp >= 80 || streak >= 1) return 2;
  return 1;
}

function rebuildHistory(dailyRecords: Record<string, PlantSnapshot>) {
  return Object.values(dailyRecords).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
}

function dateDifference(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T12:00:00`);
  const end = new Date(`${endKey}T12:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

function createDailySnapshot(
  state: StudyState,
  dateKey: string,
  dayNumber: number,
  weekNumber: number,
  values: Partial<Pick<PlantSnapshot, 'xp' | 'pages' | 'sessions' | 'focusMinutes' | 'note'>> = {},
): PlantSnapshot {
  const date = new Date(`${dateKey}T12:00:00`);
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const focusMinutes = values.focusMinutes ?? state.todayFocusMinutes;
  const sessions = values.sessions ?? state.todaySessions;
  return {
    date: dateKey,
    label,
    dayNumber,
    weekNumber,
    xp: values.xp ?? state.todayXp,
    streak: state.streak,
    pages: values.pages ?? state.todayPages,
    sessions,
    focusMinutes,
    focusHours: Number((focusMinutes / 60).toFixed(2)),
    stage: getPlantStage(state.xp, state.streak),
    note: values.note ?? (sessions > 0
      ? 'You showed up for yourself today.'
      : dateKey === localDateKey(new Date()) ? 'Your next session is waiting.' : 'No study session recorded.'),
  };
}

function weekHasAllStudyDays(dailyRecords: Record<string, PlantSnapshot>, weekNumber: number) {
  return Array.from({ length: 7 }, (_, index) => index + 1).every((dayNumber) =>
    Object.values(dailyRecords).some((record) =>
      record.weekNumber === weekNumber && record.dayNumber === dayNumber && record.sessions > 0,
    ),
  );
}

function addCompletedWeekRose(flowers: GardenFlower[], dailyRecords: Record<string, PlantSnapshot>, weekNumber: number) {
  if (!weekHasAllStudyDays(dailyRecords, weekNumber) || flowers.some((flower) => flower.weekNumber === weekNumber)) {
    return flowers;
  }
  const finalDay = Object.values(dailyRecords).find((record) => record.weekNumber === weekNumber && record.dayNumber === 7);
  return [...flowers, {
    id: `${weekNumber}-${finalDay?.date ?? localDateKey(new Date())}`,
    weekNumber,
    plantedOn: finalDay?.date ?? localDateKey(new Date()),
  }];
}

function beginStudyDay(state: StudyState, dateKey: string): StudyState {
  if (!state.lastStudyDate) {
    return {
      ...state,
      studyDay: 1,
      streak: 1,
      lastStudyDate: dateKey,
      todayPages: 0,
      todaySessions: 0,
      todayFocusMinutes: 0,
      todayXp: 0,
    };
  }
  const daysElapsed = dateDifference(state.lastStudyDate, dateKey);
  if (daysElapsed <= 0) return state;

  const finalized = daySnapshot(state, state.lastStudyDate);
  let dailyRecords = finalized.dailyRecords;
  let currentDay = state.studyDay;
  let currentWeek = state.weekNumber;
  let gardenFlowers = state.gardenFlowers;

  for (let offset = 1; offset <= daysElapsed; offset += 1) {
    if (currentDay >= 7) {
      gardenFlowers = addCompletedWeekRose(gardenFlowers, dailyRecords, currentWeek);
      currentWeek += 1;
      currentDay = 1;
    } else {
      currentDay = currentDay === 0 ? 1 : currentDay + 1;
    }
    const missingDate = shiftDateKey(state.lastStudyDate, offset);
    dailyRecords = {
      ...dailyRecords,
      [missingDate]: createDailySnapshot(
        { ...state, todayXp: 0, todayPages: 0, todaySessions: 0, todayFocusMinutes: 0, streak: currentDay },
        missingDate,
        currentDay,
        currentWeek,
        { xp: 0, pages: 0, sessions: 0, focusMinutes: 0 },
      ),
    };
  }

  return {
    ...finalized,
    studyDay: currentDay,
    weekNumber: currentWeek,
    streak: currentDay,
    lastStudyDate: dateKey,
    todayPages: 0,
    todaySessions: 0,
    todayFocusMinutes: 0,
    todayXp: 0,
    gardenFlowers,
    history: rebuildHistory(dailyRecords),
    dailyRecords,
  };
}

function daySnapshot(state: StudyState, dateKey = state.lastStudyDate ?? localDateKey(new Date())): StudyState {
  if (!state.lastStudyDate) return state;
  const nextSnapshot = createDailySnapshot(state, dateKey, state.studyDay, state.weekNumber);
  const dailyRecords = { ...state.dailyRecords, [dateKey]: nextSnapshot };
  return { ...state, history: rebuildHistory(dailyRecords), dailyRecords };
}

function completeFocusSession(state: StudyState, completedAt = Date.now()): StudyState {
  const dateKey = state.timerStartedAt ? localDateKey(new Date(state.timerStartedAt)) : localDateKey(new Date(completedAt));
  const activeState = beginStudyDay(state, dateKey);
  const completedState = daySnapshot({
    ...activeState,
    timerRunning: false,
    remainingSeconds: 0,
    timerStartedAt: null,
    timerEndsAt: null,
    breakRunning: false,
    breakRemainingSeconds: 10 * 60,
    compensationSeconds: 0,
    sessions: activeState.sessions + 1,
    todaySessions: activeState.todaySessions + 1,
    todayFocusMinutes: activeState.todayFocusMinutes + activeState.selectedMinutes,
    todayXp: activeState.todayXp + 10,
    xp: activeState.xp + 10,
  }, dateKey);
  return {
    ...completedState,
    gardenFlowers: addCompletedWeekRose(completedState.gardenFlowers, completedState.dailyRecords, completedState.weekNumber),
  };
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatDurationLabel(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function formatStudyMinutes(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatStudyHours(totalMinutes: number) {
  const hours = totalMinutes / 60;
  if (hours === 0) return '0h';
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function IconButton({
  label,
  children,
  onClick,
  className = '',
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function PlantIllustration({ stage, small = false }: { stage: number; small?: boolean }) {
  const size = small ? 116 : 220;
  const leaves = Math.max(0, stage - 2);
  const bloom = stage >= 4;
  return (
    <motion.div
      className={`plant-art ${small ? 'plant-art-small' : ''}`}
      aria-label={`Plant growth stage ${stage}`}
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="plant-glow"
        animate={{ scale: [0.92, 1.12, 0.92], opacity: [0.35, 0.62, 0.35] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.svg
        viewBox="0 0 220 220"
        width={size}
        height={size}
        role="img"
        animate={{ y: [0, -4, 0], rotate: [0, 0.7, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="plant-stem-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b1c995" />
            <stop offset=".45" stopColor="#64835e" />
            <stop offset="1" stopColor="#334d3a" />
          </linearGradient>
          <linearGradient id="plant-leaf-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b5cc98" />
            <stop offset=".55" stopColor="#709466" />
            <stop offset="1" stopColor="#38533d" />
          </linearGradient>
          <linearGradient id="plant-leaf-deep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8eae7b" />
            <stop offset="1" stopColor="#3e6048" />
          </linearGradient>
          <radialGradient id="plant-soil-gradient">
            <stop offset="0" stopColor="#b58a5b" />
            <stop offset=".72" stopColor="#76533c" />
            <stop offset="1" stopColor="#4c392d" />
          </radialGradient>
          <radialGradient id="plant-flower-center">
            <stop offset="0" stopColor="#ffe6a1" />
            <stop offset=".55" stopColor="#d89d4b" />
            <stop offset="1" stopColor="#9a623d" />
          </radialGradient>
        </defs>
        <ellipse cx="110" cy="195" rx="76" ry="13" fill="rgba(5, 12, 7, .32)" />
        <path d="M47 181 C57 166 76 158 110 157 C144 158 163 166 173 181 C164 193 57 193 47 181Z" fill="#3a3029" opacity=".72" />
        <path d="M54 178 C68 165 89 160 110 160 C131 160 152 165 166 178 C158 190 62 190 54 178Z" fill="url(#plant-soil-gradient)" />
        <path d="M63 177 C75 169 92 166 110 166 C128 166 145 169 157 177" fill="none" stroke="#c09967" strokeWidth="1.5" opacity=".5" />
        <circle cx="80" cy="177" r="2.5" fill="#5a4231" opacity=".8" />
        <circle cx="139" cy="174" r="2" fill="#5a4231" opacity=".8" />
        <circle cx="119" cy="181" r="1.6" fill="#d0a674" opacity=".7" />
        <motion.g
          animate={{ rotate: [-1.2, 1.2, -1.2] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '110px 170px' }}
        >
          <path d="M110 169 C108 143 111 114 111 78" fill="none" stroke="#273b2d" strokeWidth="9" strokeLinecap="round" opacity=".55" />
          <path d="M109 170 C108 143 111 114 111 78" fill="none" stroke="url(#plant-stem-gradient)" strokeWidth="6" strokeLinecap="round" />
          <path d="M110 135 C98 124 91 113 86 101" fill="none" stroke="#6f9668" strokeWidth="3" strokeLinecap="round" />
          <path d="M111 116 C123 105 130 93 136 80" fill="none" stroke="#789d6d" strokeWidth="3" strokeLinecap="round" />
          {stage === 1 && <motion.ellipse cx="110" cy="164" rx="11" ry="8" fill="#d8a45d" animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />}
          {stage >= 2 && (
            <>
              <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .2, duration: .7, type: 'spring' }} style={{ transformOrigin: '91px 119px' }}>
                <path d="M108 137 C88 136 73 126 72 111 C88 106 105 116 111 132 C103 127 92 121 79 116" fill="url(#plant-leaf-gradient)" stroke="#b3c996" strokeOpacity=".2" strokeWidth="1" />
                <path d="M105 132 C94 124 85 119 77 114" fill="none" stroke="#c4d6a3" strokeWidth="1.2" opacity=".62" />
              </motion.g>
              <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .32, duration: .7, type: 'spring' }} style={{ transformOrigin: '130px 101px' }}>
                <path d="M112 120 C126 104 140 98 151 101 C146 116 133 125 113 125 C124 118 134 110 144 104" fill="url(#plant-leaf-deep)" stroke="#bdd19e" strokeOpacity=".18" strokeWidth="1" />
                <path d="M117 120 C128 114 137 108 145 103" fill="none" stroke="#c7d9aa" strokeWidth="1.2" opacity=".58" />
              </motion.g>
            </>
          )}
          {leaves >= 1 && (
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .46, duration: .7, type: 'spring' }} style={{ transformOrigin: '92px 87px' }}>
              <path d="M110 103 C91 98 76 87 77 71 C96 70 108 82 112 98 C101 89 91 81 81 75" fill="url(#plant-leaf-gradient)" />
              <path d="M108 98 C98 88 89 80 80 74" fill="none" stroke="#d0dda9" strokeWidth="1.2" opacity=".6" />
            </motion.g>
          )}
          {leaves >= 2 && (
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .58, duration: .7, type: 'spring' }} style={{ transformOrigin: '132px 72px' }}>
              <path d="M112 91 C126 75 141 67 153 71 C150 87 137 98 114 99 C127 91 138 81 148 73" fill="url(#plant-leaf-deep)" />
              <path d="M116 94 C128 84 138 78 149 72" fill="none" stroke="#d1e0ae" strokeWidth="1.2" opacity=".58" />
            </motion.g>
          )}
          {bloom && (
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.12, 1], opacity: 1 }} transition={{ delay: .72, duration: .9, type: 'spring', stiffness: 150, damping: 13 }} style={{ transformOrigin: '111px 61px' }}>
              <ellipse cx="111" cy="44" rx="10" ry="24" fill="#bd826f" transform="rotate(0 111 61)" />
              <ellipse cx="111" cy="77" rx="10" ry="24" fill="#d29575" transform="rotate(180 111 61)" />
              <ellipse cx="94" cy="61" rx="10" ry="23" fill="#c27d6e" transform="rotate(-90 94 61)" />
              <ellipse cx="128" cy="61" rx="10" ry="23" fill="#d7a078" transform="rotate(90 128 61)" />
              <ellipse cx="99" cy="49" rx="9" ry="20" fill="#d99b76" transform="rotate(-45 99 49)" />
              <ellipse cx="123" cy="49" rx="9" ry="20" fill="#b87368" transform="rotate(45 123 49)" />
              <ellipse cx="99" cy="73" rx="9" ry="20" fill="#b96f63" transform="rotate(45 99 73)" />
              <ellipse cx="123" cy="73" rx="9" ry="20" fill="#dca178" transform="rotate(-45 123 73)" />
              <circle cx="111" cy="61" r="14" fill="url(#plant-flower-center)" />
              <circle cx="106" cy="57" r="2" fill="#ffe9ad" /><circle cx="116" cy="57" r="2" fill="#ffe9ad" />
              <circle cx="106" cy="66" r="2" fill="#ffe9ad" /><circle cx="116" cy="66" r="2" fill="#ffe9ad" />
              <circle cx="111" cy="61" r="3" fill="#8e5d39" />
            </motion.g>
          )}
        </motion.g>
        {bloom && (
          <motion.g animate={{ rotate: [0, 5, 0], opacity: [.45, 1, .45] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '111px 61px' }}>
            <path d="M82 51 L85 54 M141 47 L144 44 M137 86 L141 88 M78 86 L75 89" stroke="#e1bb6b" strokeWidth="2" strokeLinecap="round" />
            <circle cx="88" cy="39" r="2" fill="#e1bb6b" /><circle cx="138" cy="31" r="1.7" fill="#a9c58c" />
          </motion.g>
        )}
      </motion.svg>
      <div className="plant-stage-label">
        {stage === 1 ? 'Buried seed' : stage === 2 ? 'Little sprout' : stage === 3 ? 'Growing plant' : stage === 4 ? 'Budding flower' : 'Full bloom'}
      </div>
    </motion.div>
  );
}

function Home() {
  const gardenDemo = new URLSearchParams(window.location.search).has('garden-demo');
  const [view, setView] = useState<View>(() => gardenDemo ? 'garden' : 'overview');
  const [state, setState] = useState<StudyState>(() => {
    const savedState = readState();
    return gardenDemo ? createGardenPreviewState(savedState) : savedState;
  });
  const [homecoming, setHomecoming] = useState(() => !new URLSearchParams(window.location.search).has('skip-intro'));
  const [notice, setNotice] = useState('');
  const [breakReady, setBreakReady] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPages, setNewTaskPages] = useState('5');
  const [newTaskSubject, setNewTaskSubject] = useState('Biology');
  const [newTaskKind, setNewTaskKind] = useState<StudyTask['kind']>('Homework');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [reflection, setReflection] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [celebration, setCelebration] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => localDateKey(new Date()));
  const [calendarNoteDraft, setCalendarNoteDraft] = useState('');
  const [diaryDate, setDiaryDate] = useState(() => localDateKey(new Date()));
  const [diaryDraft, setDiaryDraft] = useState('');
  const breakCompletionNotified = useRef(false);

  const stage = getPlantStage(state.xp, state.streak);
  const incompleteTasks = state.tasks.filter((task) => !task.completed);
  const dailyQuote = dailyQuotes[new Date().getDay() % dailyQuotes.length];
  const calendarCells = useMemo(() => monthGrid(calendarMonth), [calendarMonth]);
  const todayKey = localDateKey(new Date());
  const activeDistractionSeconds = state.distractionRunning && state.distractionStartedAt
    ? Math.max(0, Math.floor((clockNow - state.distractionStartedAt) / 1000))
    : 0;

  useEffect(() => {
    const timeout = window.setTimeout(() => setHomecoming(false), 2100);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    setCalendarNoteDraft(state.calendarNotes?.[selectedCalendarDate] ?? '');
  }, [selectedCalendarDate]);

  useEffect(() => {
    setDiaryDraft(state.diaryEntries?.[diaryDate] ?? '');
  }, [diaryDate]);

  useEffect(() => {
    if (!state.distractionRunning) return undefined;
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state.distractionRunning]);
  const activeTask = incompleteTasks[0] ?? state.tasks[0];
  const pagesDone = state.tasks.reduce((sum, task) => sum + task.completedPages, 0);
  const pagesTotal = state.tasks.reduce((sum, task) => sum + task.pages, 0);
  const dailyMinimumMinutes = 180;
  const todaySessionGoal = Math.max(1, Math.ceil(dailyMinimumMinutes / state.selectedMinutes));
  const todayProgress = Math.min(100, Math.round((state.todayFocusMinutes / dailyMinimumMinutes) * 100));
  const remainingFocusMinutes = Math.max(0, dailyMinimumMinutes - state.todayFocusMinutes);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const selectedDateLabel = new Date(`${selectedCalendarDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const commit = (next: StudyState, message?: string) => {
    setState(daySnapshot(next));
    if (message) {
      setNotice(message);
      window.setTimeout(() => setNotice(''), 3500);
    }
  };

  useEffect(() => {
    if (!gardenDemo) window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [gardenDemo, state]);

  useEffect(() => {
    if (gardenDemo) return undefined;
    const reconcileCalendarDate = () => {
      setState((previous) => {
        if (!previous.lastStudyDate || previous.timerRunning || previous.breakRunning || previous.distractionRunning) {
          return previous;
        }
        return beginStudyDay(previous, localDateKey(new Date()));
      });
    };
    reconcileCalendarDate();
    const interval = window.setInterval(reconcileCalendarDate, 30_000);
    return () => window.clearInterval(interval);
  }, [gardenDemo]);

  useEffect(() => {
    if (gardenDemo) return undefined;
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) setState(readState());
    };
    window.addEventListener('storage', syncFromAnotherTab);
    return () => window.removeEventListener('storage', syncFromAnotherTab);
  }, [gardenDemo]);

  useEffect(() => {
    if (state.breakRunning || state.breakRemainingSeconds === 0) setBreakReady(true);
  }, [state.breakRunning, state.breakRemainingSeconds]);

  useEffect(() => {
    if (!state.timerRunning && !state.breakRunning) return undefined;
    const reconcileTimers = () => {
      const now = Date.now();
      setClockNow(now);
      setState((previous) => {
        if (previous.timerRunning) {
          const timerEndsAt = previous.timerEndsAt ?? now + previous.remainingSeconds * 1000;
          const remainingSeconds = Math.max(0, Math.ceil((timerEndsAt - now) / 1000));
          if (remainingSeconds <= 0) {
            setBreakReady(true);
            breakCompletionNotified.current = false;
            return completeFocusSession(previous, now);
          }
          if (previous.remainingSeconds === remainingSeconds && previous.timerEndsAt === timerEndsAt) return previous;
          return { ...previous, remainingSeconds, timerEndsAt };
        }
        if (previous.breakRunning) {
          const breakEndsAt = previous.breakEndsAt ?? now + previous.breakRemainingSeconds * 1000;
          const breakRemainingSeconds = Math.max(0, Math.ceil((breakEndsAt - now) / 1000));
          if (breakRemainingSeconds <= 0) {
            const breakElapsed = previous.breakStartedAt ? Math.min(10 * 60, Math.max(0, Math.floor((now - previous.breakStartedAt) / 1000))) : 0;
            return {
              ...previous,
              breakRemainingSeconds: 0,
              breakRunning: false,
              breakStartedAt: null,
              breakEndsAt: null,
              breakSecondsToday: previous.breakSecondsToday + breakElapsed,
            };
          }
          if (previous.breakRemainingSeconds === breakRemainingSeconds && previous.breakEndsAt === breakEndsAt) return previous;
          return { ...previous, breakRemainingSeconds, breakEndsAt };
        }
        return previous;
      });
    };
    reconcileTimers();
    const interval = window.setInterval(reconcileTimers, 1000);
    return () => window.clearInterval(interval);
  }, [state.timerRunning, state.breakRunning]);

  useEffect(() => {
    if (!state.breakRunning && breakReady && state.breakRemainingSeconds === 0 && !breakCompletionNotified.current) {
      breakCompletionNotified.current = true;
      setNotice('Your break is complete. Your focus garden is ready.');
      try {
        const context = new window.AudioContext();
        [660, 880, 1046].forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + index * 0.14 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.14 + 0.28);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(context.currentTime + index * 0.14);
          oscillator.stop(context.currentTime + index * 0.14 + 0.3);
        });
        window.setTimeout(() => void context.close(), 900);
      } catch {
        // The visual notice remains available when audio is blocked by the browser.
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Break complete', { body: 'Your 10-minute reset is finished. Ready to study?' });
      }
    }
  }, [breakReady, state.breakRemainingSeconds, state.breakRunning]);

  const startTimer = () => {
    if (state.breakRunning || state.distractionRunning) return;
    const now = Date.now();
    const activeState = beginStudyDay(state, localDateKey(new Date(now)));
    const compensation = activeState.compensationSeconds;
    const baseSeconds = activeState.remainingSeconds === activeState.selectedMinutes * 60
      ? activeState.selectedMinutes * 60 + compensation
      : activeState.remainingSeconds;
    commit(
      { ...activeState, timerRunning: true, remainingSeconds: baseSeconds, timerStartedAt: now, timerEndsAt: now + baseSeconds * 1000 },
      compensation > 0
        ? `Focus session started with ${formatDurationLabel(compensation)} to make up.`
        : 'Focus session started. Your next session is enough.',
    );
  };

  const resetTimer = () => commit({ ...state, timerRunning: false, remainingSeconds: state.selectedMinutes * 60 + state.compensationSeconds, timerStartedAt: null, timerEndsAt: null });

  const finishSession = () => {
    if (state.distractionRunning) {
      setNotice('Return to study before ending this session.');
      return;
    }
    commit(
      { ...completeFocusSession({ ...state, timerRunning: false, remainingSeconds: state.selectedMinutes * 60, compensationSeconds: 0, timerStartedAt: state.timerStartedAt ?? Date.now(), timerEndsAt: null, breakRunning: false, breakRemainingSeconds: 10 * 60 }) },
      'Session complete. You earned 10 XP.',
    );
    setBreakReady(true);
    breakCompletionNotified.current = false;
  };

  const startBreak = () => {
    breakCompletionNotified.current = false;
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    const now = Date.now();
    const remainingSeconds = state.breakRemainingSeconds || 10 * 60;
    commit(
      { ...state, timerRunning: false, timerStartedAt: null, timerEndsAt: null, breakRunning: true, breakRemainingSeconds: remainingSeconds, breakStartedAt: now, breakEndsAt: now + remainingSeconds * 1000 },
      'Your 10-minute break has started. We will let you know when it ends.',
    );
  };

  const closeBreak = () => {
    setBreakReady(false);
    if (!state.breakRunning) {
      commit({ ...state, breakRemainingSeconds: 10 * 60, breakStartedAt: null, breakEndsAt: null }, 'Back to your study garden.');
    }
  };

  const addPage = (taskId: string) => {
    const activeState = beginStudyDay(state, localDateKey(new Date()));
    const task = activeState.tasks.find((item) => item.id === taskId);
    if (!task || task.completedPages >= task.pages) return;
    const completedPages = task.completedPages + 1;
    const completed = completedPages >= task.pages;
    const nextTasks = activeState.tasks.map((item) =>
      item.id === taskId ? { ...item, completedPages, completed } : item,
    );
    commit(
      { ...activeState, tasks: nextTasks, todayPages: activeState.todayPages + 1, todayXp: activeState.todayXp + 5, xp: activeState.xp + 5 },
      completed ? `${task.title} complete. A 10 minute break is ready.` : '+1 page logged. You earned 5 XP.',
    );
    setCelebration(true);
    window.setTimeout(() => setCelebration(false), 1500);
    if (completed) setBreakReady(true);
  };

  const toggleTask = (taskId: string) => {
    const nextTasks = state.tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    );
    commit({ ...state, tasks: nextTasks }, 'Task list updated.');
  };

  const deleteTask = (taskId: string) => {
    commit({ ...state, tasks: state.tasks.filter((task) => task.id !== taskId) }, 'Task removed.');
  };

  const selectCalendarDate = (date: Date) => {
    const key = localDateKey(date);
    setSelectedCalendarDate(key);
    setCalendarNoteDraft(state.calendarNotes?.[key] ?? '');
  };

  const moveCalendarMonth = (offset: number) => {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    setCalendarMonth(nextMonth);
    const nextSelected = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    selectCalendarDate(nextSelected);
  };

  const saveCalendarNote = () => {
    const calendarNotes = { ...(state.calendarNotes ?? {}) };
    if (calendarNoteDraft.trim()) {
      calendarNotes[selectedCalendarDate] = calendarNoteDraft.trim();
    } else {
      delete calendarNotes[selectedCalendarDate];
    }
    commit({ ...state, calendarNotes }, 'Day note saved to your monthly plan.');
  };

  const saveDiaryEntry = () => {
    const diaryEntries = { ...(state.diaryEntries ?? {}) };
    if (diaryDraft.trim()) {
      diaryEntries[diaryDate] = diaryDraft.trim();
    } else {
      delete diaryEntries[diaryDate];
    }
    commit({ ...state, journal: diaryDraft, diaryEntries }, 'Diary entry saved.');
  };

  const diaryEntryDates = Object.keys(state.diaryEntries ?? {}).sort((a, b) => b.localeCompare(a));

  const editTask = (task: StudyTask) => {
    setEditingTaskId(task.id);
    setNewTaskTitle(task.title);
    setNewTaskPages(String(task.pages));
    setNewTaskSubject(task.subject);
    setNewTaskKind(task.kind);
    setShowTaskForm(true);
    setView('tasks');
  };

  const saveTask = () => {
    if (!newTaskTitle.trim()) return;
    const pages = Math.max(1, Number.parseInt(newTaskPages, 10) || 1);
    if (editingTaskId) {
      const nextTasks = state.tasks.map((task) => {
        if (task.id !== editingTaskId) return task;
        const completedPages = Math.min(task.completedPages, pages);
        return { ...task, title: newTaskTitle.trim(), pages, subject: newTaskSubject, kind: newTaskKind, completedPages, completed: completedPages >= pages };
      });
      commit({ ...state, tasks: nextTasks }, 'Task changes saved.');
      setEditingTaskId(null);
      setNewTaskTitle('');
      setShowTaskForm(false);
      return;
    }
    const task: StudyTask = {
      id: `${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: newTaskSubject,
      pages,
      completedPages: 0,
      kind: newTaskKind,
      priority: 'Medium',
      completed: false,
    };
    commit({ ...state, tasks: [...state.tasks, task] }, 'New task added to your plan.');
    setNewTaskTitle('');
    setNewTaskPages('5');
    setShowTaskForm(false);
  };

  const addSubject = () => {
    const subject = newSubject.trim();
    if (!subject) return;
    if (state.subjects.some((item) => item.toLowerCase() === subject.toLowerCase())) {
      setNotice('That subject is already in your list.');
      return;
    }
    commit({ ...state, subjects: [...state.subjects, subject], subject }, `${subject} added to your subjects.`);
    setNewSubject('');
  };

  const removeSubject = (subject: string) => {
    if (state.subjects.length <= 1) {
      setNotice('Keep at least one subject in your study space.');
      return;
    }
    const subjects = state.subjects.filter((item) => item !== subject);
    commit({ ...state, subjects, subject: state.subject === subject ? subjects[0] : state.subject }, `${subject} removed.`);
    if (newTaskSubject === subject) setNewTaskSubject(subjects[0]);
  };

  const recordDistraction = (reason: string) => {
    if (state.distractionRunning) return;
    const message = reason === 'Stuck'
      ? 'The distraction clock is running. Break the concept into a smaller question.'
      : 'The distraction clock is running. Return when your mind feels ready.';
    commit({
      ...state,
      timerRunning: false,
      timerStartedAt: null,
      timerEndsAt: null,
      distractions: state.distractions + 1,
      distractionReason: reason,
      distractionRunning: true,
      distractionStartedAt: Date.now(),
    }, message);
    setClockNow(Date.now());
  };

  const returnToStudy = () => {
    if (!state.distractionRunning || !state.distractionStartedAt) return;
    const elapsed = Math.max(1, activeDistractionSeconds);
    const totalLost = state.lostSeconds + elapsed;
    commit({
      ...state,
      distractionRunning: false,
      distractionReason: '',
      distractionStartedAt: null,
      lostSeconds: totalLost,
      minutesLost: Math.ceil(totalLost / 60),
      compensationSeconds: state.compensationSeconds + elapsed,
    }, `Welcome back. ${formatDurationLabel(elapsed)} added to your make-up time.`);
  };

  const pageTitle = {
    overview: 'Good morning',
    tasks: 'Your tasks',
    calendar: 'Your calendar',
    garden: 'My garden',
    history: 'Plant history',
    journal: 'Daily diary',
    settings: 'Preferences',
  }[view];

  return (
    <div className="study-app">
      <AnimatePresence>
        {homecoming && (
          <motion.div className="homecoming-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .55 }}>
            <div className="homecoming-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <motion.div className="homecoming-orbit orbit-one" animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="homecoming-orbit orbit-two" animate={{ rotate: -360 }} transition={{ duration: 19, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="homecoming-content" initial={{ opacity: 0, y: 18, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: .18, duration: .8, ease: [0.22, 1, 0.36, 1] }} exit={{ opacity: 0, y: -12, scale: 1.04 }} >
              <motion.div className="homecoming-mark" initial={{ scale: 0, rotate: -18 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .32, type: 'spring', stiffness: 180, damping: 14 }}><House size={21} /></motion.div>
              <span className="homecoming-eyebrow">your study garden</span>
              <h2>You’re home<span>.</span></h2>
              <p>Let’s grow something good today, {state.displayName}.</p>
              <motion.div className="homecoming-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .65, duration: .7 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.aside className="sidebar" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
        <div className="brand-lockup">
          <div className="brand-mark"><Leaf size={18} /></div>
          <div>
             <div className="brand-name">My Own World</div>
            <div className="brand-caption">grow your rhythm</div>
          </div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <div className="nav-label">Workspace</div>
          <NavButton active={view === 'overview'} onClick={() => setView('overview')} icon={<BarChart3 size={17} />} label="Overview" />
          <NavButton active={view === 'tasks'} onClick={() => setView('tasks')} icon={<ListChecks size={17} />} label="My plan" />
           <NavButton active={view === 'calendar'} onClick={() => setView('calendar')} icon={<CalendarDays size={17} />} label="Calendar" />
           <NavButton active={view === 'garden'} onClick={() => setView('garden')} icon={<Sprout size={17} />} label="My garden" />
          <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<Flower2 size={17} />} label="Plant history" />
          <NavButton active={view === 'journal'} onClick={() => setView('journal')} icon={<NotebookPen size={17} />} label="Daily diary" />
          <div className="nav-label nav-label-spaced">Personal</div>
          <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings2 size={17} />} label="Preferences" />
        </nav>
        <div className="sidebar-plant-card">
          <PlantIllustration stage={stage} small />
          <div className="sidebar-plant-meta">
            <span>Your plant</span>
            <strong>Stage {stage} of 5</strong>
            <div className="mini-progress"><span style={{ width: `${Math.min(100, (state.xp / 650) * 100)}%` }} /></div>
            <small>{state.xp} / 650 XP</small>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="avatar">A</div>
          <div><strong>{state.displayName}</strong><span>Student space</span></div>
          <MoreHorizontal size={18} className="muted-icon" />
        </div>
      </motion.aside>

      <motion.main className="main-content" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .28, duration: .75, ease: [0.22, 1, 0.36, 1] }}>
        <header className="topbar">
          <div>
            <div className="eyebrow">{currentDate}</div>
            <h1>{pageTitle}, <em>{state.displayName}.</em></h1>
          </div>
          <div className="topbar-actions">
           <div className="streak-pill"><Flame size={15} /><strong>{state.studyDay}</strong><span>day of 7</span></div>
            <button className="primary-button compact" onClick={() => { setView('overview'); setTimeout(() => document.getElementById('focus-card')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>
              <Play size={15} fill="currentColor" /> Start focus
            </button>
          </div>
        </header>

        {notice && <div className="notice"><Sparkles size={16} />{notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}

        {view === 'overview' && (
          <>
            <motion.section className="welcome-row" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .45, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
              <div>
                <p className="soft-intro">A quiet place to do the next right thing.</p>
                <h2>Let’s tend to your focus.</h2>
              </div>
              <div className="date-chip"><CalendarDays size={16} /><span>This week</span><ChevronRight size={15} /></div>
            </motion.section>

            <section className="dashboard-grid">
              <motion.div className="panel focus-panel" id="focus-card" initial={{ opacity: 0, y: 28, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: .58, duration: .75, ease: [0.22, 1, 0.36, 1] }}>
                <div className="panel-heading">
                  <div><span className="section-kicker">Focus garden</span><h3>One session at a time.</h3></div>
                  <span className="mode-badge"><span className="status-dot" />{state.mode}</span>
                </div>
                <AnimatePresence>
                  {celebration && (
                    <motion.div className="xp-burst" initial={{ opacity: 0, y: 18, scale: .7 }} animate={{ opacity: 1, y: -18, scale: 1 }} exit={{ opacity: 0, y: -56, scale: 1.15 }} transition={{ duration: .8 }}>
                      <Sparkles size={14} /> +5 XP
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="focus-layout">
                  <div className="timer-wrap">
                    <div className={`timer-ring ${state.timerRunning ? 'is-running' : ''}`} style={{ '--timer-progress': `${100 - (state.remainingSeconds / (state.selectedMinutes * 60 + (state.compensationSeconds || 0))) * 100}%` } as React.CSSProperties}>
                      <div className="timer-inner">
                        <span className="timer-label">{state.timerRunning ? 'in focus' : 'ready when you are'}</span>
                        <strong>{formatTime(state.remainingSeconds)}</strong>
                        <small>{state.subject} · {state.mode}</small>
                      </div>
                    </div>
                    <div className="timer-controls">
                      <IconButton label="Reset timer" onClick={resetTimer}><RotateCcw size={17} /></IconButton>
                      {state.timerRunning ? (
                        <button className="round-play-button" onClick={() => commit({ ...state, timerRunning: false, timerStartedAt: null, timerEndsAt: null }, 'Session paused.') }><Pause size={19} fill="currentColor" /></button>
                      ) : (
                        <button className="round-play-button" onClick={startTimer} disabled={state.breakRunning || state.distractionRunning}><Play size={19} fill="currentColor" /></button>
                      )}
                      <IconButton label="Finish session" onClick={finishSession}><Check size={17} /></IconButton>
                    </div>
                    <div className="preset-row">
                      {[25, 50, 90].map((minutes) => (
                        <button className={state.selectedMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => !state.timerRunning && !state.breakRunning && commit({ ...state, selectedMinutes: minutes, remainingSeconds: minutes * 60 + state.compensationSeconds })}>{minutes} min</button>
                      ))}
                    </div>
                  </div>
                  <div className="focus-side">
                    <div className="focus-quote"><span className="quote-mark">“</span><div><p>{dailyQuote.text}</p><small>— {dailyQuote.author}</small></div></div>
                    <div className="current-task-card">
                      <div className="task-card-top"><span>Next page</span><span className="priority-dot" /></div>
                      <strong>{activeTask?.title ?? 'Add a task to begin'}</strong>
                      <div className="task-card-progress"><span style={{ width: `${activeTask ? (activeTask.completedPages / activeTask.pages) * 100 : 0}%` }} /></div>
                      <div className="task-card-bottom"><small>{activeTask ? `${activeTask.completedPages} of ${activeTask.pages} pages` : 'No active task'}</small><button onClick={() => activeTask && addPage(activeTask.id)} disabled={!activeTask || activeTask.completed || state.distractionRunning}><Plus size={15} /> Page done</button></div>
                    </div>
                    {state.compensationSeconds > 0 && <div className="make-up-pill"><Clock3 size={13} /> {formatDurationLabel(state.compensationSeconds)} to make up in your next focus</div>}
                    <button className="text-button" onClick={() => setView('tasks')}>See your full plan <ArrowRight size={15} /></button>
                  </div>
                </div>
              </motion.div>

              <motion.div className="panel plant-panel" initial={{ opacity: 0, y: 34, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: .72, duration: .85, ease: [0.22, 1, 0.36, 1] }}>
                <div className="panel-heading">
                  <div><span className="section-kicker">Your living progress</span><h3>Keep growing.</h3></div>
                  <button className="circle-link" onClick={() => setView('history')} aria-label="View plant history"><ArrowRight size={16} /></button>
                </div>
                <PlantIllustration stage={stage} />
                <div className="plant-stats"><span><strong>{state.xp}</strong> XP</span><span><strong>{state.studyDay}</strong> day</span><span><strong>{state.sessions}</strong> sessions</span></div>
              </motion.div>
            </section>

            <section className="lower-grid">
                <motion.div className="panel focus-goal-panel" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .87, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
                <div className="panel-heading">
                   <div><span className="section-kicker">Today’s focus</span><h3>{state.todaySessions} of {todaySessionGoal} sessions</h3></div>
                  <Target size={21} className="heading-icon" />
                </div>
                <div className="large-progress"><span style={{ width: `${todayProgress}%` }} /></div>
                  <div className="progress-foot"><span>{todayProgress}% of 3 hours minimum</span><span>{remainingFocusMinutes > 0 ? `${formatStudyHours(remainingFocusMinutes)} to go` : 'Goal complete'}</span></div>
                 <div className="session-dots">{Array.from({ length: todaySessionGoal }).map((_, index) => <span key={index} className={index < state.todaySessions ? 'filled' : ''} />)}</div>
                  <div className="goal-caption"><Clock3 size={13} /> {formatStudyHours(state.todayFocusMinutes)} focused today · minimum 3 hours</div>
               </motion.div>
               <motion.div className="panel distraction-panel" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .98, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
                <div className="panel-heading"><div><span className="section-kicker">Stay honest</span><h3>Mind wandered?</h3></div><CircleHelp size={20} className="heading-icon" /></div>
                 <p className="panel-description">{state.distractionRunning ? `Timer running since you felt ${state.distractionReason.toLowerCase()}.` : 'Tap what pulled you away. We will count the time until you are ready to return.'}</p>
                 {state.distractionRunning ? (
                   <div className="distraction-live">
                     <div><span className="live-label">Time away</span><strong>{formatTime(activeDistractionSeconds)}</strong></div>
                     <button className="primary-button compact" onClick={returnToStudy}><Check size={14} /> I’m ready to return</button>
                   </div>
                 ) : (
                   <div className="distraction-actions">
                     <button onClick={() => recordDistraction('Tired')}><span>Hungry / tired</span><Clock3 size={15} /></button>
                     <button onClick={() => recordDistraction('Bored')}><span>Bored</span><Minus size={15} /></button>
                     <button onClick={() => recordDistraction('Stuck')}><span>Hard concept</span><TriangleAlert size={15} /></button>
                   </div>
                 )}
                 <div className="distraction-summary"><span><strong>{state.distractions}</strong> moments today</span><span><strong>{formatDurationLabel(state.lostSeconds)}</strong> time away</span>{state.compensationSeconds > 0 && <span><strong>{formatDurationLabel(state.compensationSeconds)}</strong> to make up</span>}</div>
               </motion.div>
            </section>

             <motion.section className="section-block" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.08, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
              <div className="section-title-row"><div><span className="section-kicker">A gentle plan</span><h3>What’s on your desk</h3></div><button className="text-button" onClick={() => setView('tasks')}>Manage tasks <ArrowRight size={15} /></button></div>
              <TaskList tasks={state.tasks.slice(0, 3)} onAddPage={addPage} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
             </motion.section>
          </>
        )}

          {view === 'calendar' && (
            <section className="page-section">
              <div className="page-intro-row"><div><span className="section-kicker">Your calendar</span><h2>Give every important day its own space.</h2><p>Keep exams, holidays, deadlines, and personal reminders here—separate from your study tasks.</p></div><CalendarDays size={34} className="journal-mark" /></div>
              <div className="calendar-layout">
                <div className="panel calendar-panel">
                  <div className="calendar-header">
                    <div><span className="section-kicker">Monthly view</span><h3>{monthLabel(calendarMonth)}</h3></div>
                    <div className="calendar-controls"><IconButton label="Previous month" onClick={() => moveCalendarMonth(-1)}><ChevronLeft size={17} /></IconButton><button className="today-button" onClick={() => { const now = new Date(); setCalendarMonth(now); selectCalendarDate(now); }}>Today</button><IconButton label="Next month" onClick={() => moveCalendarMonth(1)}><ChevronRight size={17} /></IconButton></div>
                  </div>
                  <div className="calendar-weekdays">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div>
                  <div className="calendar-grid">
                    {calendarCells.map((date, index) => {
                      if (!date) return <div className="calendar-cell calendar-cell-empty" key={`empty-${index}`} />;
                      const key = localDateKey(date);
                      const note = state.calendarNotes?.[key];
                      const isToday = key === todayKey;
                      const isSelected = key === selectedCalendarDate;
                      return <button className={`calendar-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${note ? 'has-note' : ''}`} key={key} onClick={() => selectCalendarDate(date)}><span className="calendar-day-number">{date.getDate()}</span>{note ? <span className="calendar-note-preview">{note}</span> : <span className="calendar-note-placeholder">add note</span>}</button>;
                    })}
                  </div>
                  <div className="calendar-legend"><span><i className="legend-dot today-dot" /> Today</span><span><i className="legend-dot note-dot" /> Has a note</span></div>
                </div>
                <div className="panel calendar-note-panel">
                  <div className="calendar-note-heading"><div className="calendar-note-icon"><CalendarDays size={18} /></div><div><span className="section-kicker">Day note</span><h3>{selectedDateLabel}</h3></div></div>
                  <p>Write anything that helps you remember the shape of this day.</p>
                  <textarea value={calendarNoteDraft} onChange={(event) => setCalendarNoteDraft(event.target.value)} placeholder="Exam at 10:00, holiday, review chapter 4..." />
                  <div className="calendar-note-footer"><span>{calendarNoteDraft.length} characters</span><button className="primary-button compact" onClick={saveCalendarNote}>Save note <Check size={14} /></button></div>
                  {state.calendarNotes?.[selectedCalendarDate] && <button className="calendar-clear-button" onClick={() => { setCalendarNoteDraft(''); const calendarNotes = { ...(state.calendarNotes ?? {}) }; delete calendarNotes[selectedCalendarDate]; commit({ ...state, calendarNotes }, 'Day note removed.'); }}>Clear this note</button>}
                </div>
              </div>
            </section>
          )}

          {view === 'tasks' && (
           <section className="page-section">
              <div className="page-intro-row"><div><span className="section-kicker">My plan</span><h2>Keep your study tasks in one place.</h2><p>Manage what you need to study here. Your dates and reminders live separately in Calendar.</p></div><button className="primary-button" onClick={() => { setEditingTaskId(null); setNewTaskTitle(''); setShowTaskForm(!showTaskForm); }}><Plus size={17} /> Add task</button></div>
             {showTaskForm && <div className="panel task-form"><div className="form-header"><h3>{editingTaskId ? 'Edit study task' : 'New study task'}</h3><IconButton label="Close form" onClick={() => { setShowTaskForm(false); setEditingTaskId(null); }}><X size={17} /></IconButton></div><div className="form-grid"><label>Task name<input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="e.g. Read chapter 5" /></label><label>Pages<input type="number" min="1" value={newTaskPages} onChange={(event) => setNewTaskPages(event.target.value)} /></label><label>Subject<select value={newTaskSubject} onChange={(event) => setNewTaskSubject(event.target.value)}>{state.subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Type<select value={newTaskKind} onChange={(event) => setNewTaskKind(event.target.value as StudyTask['kind'])}><option>Homework</option><option>Project</option><option>Test</option></select></label></div><button className="primary-button" onClick={saveTask}>{editingTaskId ? 'Save changes' : 'Add to my plan'} <ArrowRight size={16} /></button></div>}
             <TaskList tasks={state.tasks} onAddPage={addPage} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
          </section>
        )}

        {view === 'history' && (
          <section className="page-section">
             <div className="page-intro-row"><div><span className="section-kicker">Weekly reflection</span><h2>The story of your plant.</h2><p>Look back at what helped your focus grow this week.</p></div><div className="week-summary"><Flame size={16} /><strong>{state.studyDay} days</strong><span>week {state.weekNumber}</span></div></div>
            <div className="history-layout"><div className="panel history-plant-card"><PlantIllustration stage={stage} /><div className="history-plant-copy"><span className="section-kicker">Current chapter</span><h3>{stage >= 4 ? 'You are blooming.' : 'You are putting down roots.'}</h3><p>Your plant is at stage {stage}. Every focused day, session, and honest restart becomes part of its story.</p><div className="plant-xp-bar"><span style={{ width: `${Math.min(100, (state.xp / 650) * 100)}%` }} /></div><small>{state.xp} / 650 XP until full bloom</small></div></div><div className="panel timeline-panel"><div className="panel-heading"><div><span className="section-kicker">Your study days</span><h3>Day-by-day growth</h3></div><CalendarDays size={20} className="heading-icon" /></div><div className="timeline">{state.history.length === 0 ? <div className="empty-state"><Sprout size={24} /><strong>Your first study day is waiting.</strong><span>Start a focus session and it will appear here.</span></div> : state.history.map((item) => <div className="timeline-row" key={`${item.date}-${item.label}`}><div className={`timeline-icon stage-${item.stage}`}>{item.stage >= 4 ? <Flower2 size={16} /> : item.stage >= 2 ? <Sprout size={17} /> : <span />}</div><div className="timeline-date"><strong>Day {item.dayNumber ?? 0}</strong><small>{item.label} · Week {item.weekNumber ?? 1}</small></div><div className="timeline-note"><span>{formatStudyHours(item.focusMinutes ?? 0)} · {item.sessions} sessions</span><small>{item.note}</small></div><span className="timeline-xp">+{item.xp} XP</span></div>)}</div></div></div>
            <div className="weekly-insights"><div className="insight-card"><BarChart3 size={18} /><span>Total pages</span><strong>{state.history.reduce((sum, item) => sum + item.pages, 0)}</strong><small>this week</small></div><div className="insight-card"><Clock3 size={18} /><span>Focus sessions</span><strong>{state.history.reduce((sum, item) => sum + item.sessions, 0)}</strong><small>completed</small></div><div className="insight-card"><Sparkles size={18} /><span>XP earned</span><strong>{state.history.reduce((sum, item) => sum + item.xp, 0)}</strong><small>this week</small></div></div>
          </section>
        )}

        {view === 'garden' && (
          <section className="page-section">
            <div className="page-intro-row"><div><span className="section-kicker">My garden</span><h2>One little world, growing with you.</h2><p>Your plant stays in one place, and every completed week adds a rose beside it.</p></div><Sprout size={34} className="journal-mark" /></div>
            <div className="garden-layout">
              <div className={`panel garden-scene ${state.gardenFlowers.length > 4 ? 'garden-crowded' : ''}`}>
                <div className="garden-scene-header"><div><span className="section-kicker">Your shared patch</span><h3>Week {state.weekNumber} · Day {state.studyDay} of 7</h3></div><span className="garden-week-pill"><Flower2 size={14} /> {state.gardenFlowers.length} roses</span></div>
                <div className="garden-yard">
                  <div className="garden-ground" />
                  <div className="garden-center"><PlantIllustration stage={stage} /></div>
                  {state.gardenFlowers.map((flower, index) => <motion.div className={`garden-flower flower-${index % 12}`} key={flower.id} initial={{ opacity: 0, scale: 0, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * .08, type: 'spring', stiffness: 170, damping: 13 }} title={`Rose from week ${flower.weekNumber}`}><span className="rose-stem" /><Flower2 size={27} /><small>Week {flower.weekNumber}</small></motion.div>)}
                  {state.gardenFlowers.length === 0 && <div className="garden-empty"><Sprout size={20} /><span>Your first week will grow the first rose.</span></div>}
                </div>
                <p className="garden-caption">Every seventh study day adds one more rose beside the same plant, making a small bouquet over time.</p>
              </div>
              <div className="panel garden-progress">
                <span className="section-kicker">Your rhythm</span>
                <h3>Keep showing up.</h3>
                <div className="garden-stats"><div><strong>{state.studyDay}</strong><span>day of 7</span></div><div><strong>{state.weekNumber}</strong><span>week</span></div><div><strong>{state.xp}</strong><span>XP</span></div></div>
                <div className="garden-week-track">{Array.from({ length: 7 }).map((_, index) => <span key={index} className={index < state.studyDay ? 'is-grown' : ''}>{index + 1}</span>)}</div>
                <p>{state.studyDay === 0 ? 'Your first study day is waiting.' : state.studyDay === 7 ? 'Seven days complete. Your rose is blooming.' : `${7 - state.studyDay} study days until this week’s rose.`}</p>
                <button className="primary-button compact" onClick={() => setView('overview')}><Play size={14} fill="currentColor" /> Go to focus</button>
              </div>
            </div>
          </section>
        )}

        {view === 'journal' && (
          <section className="page-section journal-page">
            <div className="page-intro-row"><div><span className="section-kicker">A private place to think</span><h2>Your daily diary.</h2><p>Keep the thoughts, feelings, small wins, and lessons that belong to you—not to your task list.</p></div><NotebookPen size={34} className="journal-mark" /></div>
            <div className="diary-layout">
              <div className="panel diary-editor">
                <div className="diary-editor-top"><div className="journal-date"><CalendarDays size={15} /> {new Date(`${diaryDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div><div className="diary-date-controls"><IconButton label="Previous diary day" onClick={() => setDiaryDate(shiftDateKey(diaryDate, -1))}><ChevronLeft size={16} /></IconButton><button className="today-button" onClick={() => setDiaryDate(todayKey)}>Today</button><IconButton label="Next diary day" onClick={() => setDiaryDate(shiftDateKey(diaryDate, 1))}><ChevronRight size={16} /></IconButton></div></div>
                <textarea value={diaryDraft} onChange={(event) => setDiaryDraft(event.target.value)} placeholder="What felt easy? What felt heavy? What do you want to remember about today?" />
                <div className="journal-footer"><span>{diaryDraft.length} characters</span><button className="primary-button compact" onClick={saveDiaryEntry}>Save diary entry <Check size={14} /></button></div>
              </div>
              <div className="panel diary-history">
                <div className="panel-heading"><div><span className="section-kicker">Your pages</span><h3>Previous entries</h3></div><NotebookPen size={19} className="heading-icon" /></div>
                <button className={`diary-entry-item ${diaryDate === todayKey ? 'is-active' : ''}`} onClick={() => setDiaryDate(todayKey)}><span className="diary-entry-date">Today</span><small>{state.diaryEntries?.[todayKey] ? state.diaryEntries[todayKey] : 'Start a page for today'}</small></button>
                {diaryEntryDates.filter((date) => date !== todayKey).map((date) => <button className={`diary-entry-item ${diaryDate === date ? 'is-active' : ''}`} key={date} onClick={() => setDiaryDate(date)}><span className="diary-entry-date">{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><small>{state.diaryEntries[date]}</small></button>)}
                {diaryEntryDates.length === 0 && <div className="diary-empty"><Sprout size={20} /><span>Your first diary page is waiting.</span></div>}
              </div>
            </div>
            <div className="panel reflection-card diary-reflection"><span className="section-kicker">A small prompt</span><h3>What will you carry forward?</h3><p>Leave a breadcrumb for your future self, separate from your calendar plans.</p><div className="reflection-row"><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Next time I will start with..." /><button className="secondary-button" onClick={() => { setReflection(''); setNotice('Reflection saved for your next session.'); }}>Save reflection <ArrowRight size={15} /></button></div></div>
          </section>
        )}

        {view === 'settings' && (
          <section className="page-section"><div className="page-intro-row"><div><span className="section-kicker">Your space</span><h2>Make Study Focus yours.</h2><p>These preferences stay on this device.</p></div><Settings2 size={34} className="journal-mark" /></div><div className="panel settings-panel"><label>Your name<input value={state.displayName} onChange={(event) => setState(daySnapshot({ ...state, displayName: event.target.value }))} /></label><div className="goal-setting-note"><span>Daily focus target</span><strong>3 hours minimum</strong><small>At least {todaySessionGoal} sessions at {state.selectedMinutes} minutes each.</small></div><label>Default subject<select value={state.subject} onChange={(event) => setState({ ...state, subject: event.target.value })}>{state.subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Study mode<select value={state.mode} onChange={(event) => setState({ ...state, mode: event.target.value as StudyMode })}><option>Learning</option><option>Test prep</option><option>Normal study</option></select></label></div><div className="panel subject-manager"><div className="subject-manager-heading"><div><span className="section-kicker">Your library</span><h3>Your subjects</h3><p>Create the subjects that match your life and your study track.</p></div><BookOpen size={22} /></div><div className="subject-chips">{state.subjects.map((subject, index) => <motion.div layout key={subject} className="subject-chip"><span className={`subject-swatch swatch-${index % 5}`} />{subject}<button onClick={() => removeSubject(subject)} aria-label={`Remove ${subject}`}><X size={13} /></button></motion.div>)}</div><div className="subject-add-row"><input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addSubject()} placeholder="e.g. Literature, Physics, Art history" /><button className="primary-button compact" onClick={addSubject}><Plus size={15} /> Add subject</button></div></div></section>
        )}
      </motion.main>

      {breakReady && <div className="break-overlay"><div className="break-modal"><div className="break-icon"><Coffee size={25} /></div><span className="section-kicker">{state.breakRunning ? 'Your reset is in progress' : state.breakRemainingSeconds === 0 ? 'A gentle reset complete' : 'A reward for showing up'}</span><h2>{state.breakRunning ? formatTime(state.breakRemainingSeconds) : state.breakRemainingSeconds === 0 ? 'Ready to return?' : 'Your 10-minute break is ready.'}</h2><p>{state.breakRunning ? `Your break time is being counted: ${formatDurationLabel(state.breakSecondsToday)} logged today.` : state.breakRemainingSeconds === 0 ? `You took ${formatDurationLabel(state.breakSecondsToday)} to reset. Your focus garden is ready.` : 'Start the break timer and we will count every second, then notify you when it ends.'}</p><div className="break-actions">{state.breakRunning ? <button className="secondary-button" onClick={() => setBreakReady(false)}>Keep running</button> : state.breakRemainingSeconds === 0 ? <button className="primary-button" onClick={closeBreak}>Return to study <ArrowRight size={15} /></button> : <><button className="secondary-button" onClick={() => setBreakReady(false)}>Not now</button><button className="primary-button" onClick={startBreak}>Start break <ArrowRight size={15} /></button></>}</div></div></div>}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <motion.button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick} whileHover={{ x: 4 }} whileTap={{ scale: .96 }}>{icon}<span>{label}</span>{active && <span className="nav-active-dot" />}</motion.button>;
}

function TaskList({ tasks, onAddPage, onToggle, onDelete, onEdit }: { tasks: StudyTask[]; onAddPage: (id: string) => void; onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit?: (task: StudyTask) => void }) {
  return (
    <div className="task-list">
      {tasks.map((task, index) => (
        <motion.div className={`task-row ${task.completed ? 'is-complete' : ''}`} key={task.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: task.completed ? .62 : 1, x: 0 }} transition={{ delay: index * .08, duration: .45, ease: [0.22, 1, 0.36, 1] }} whileHover={{ x: 4 }}>
          <button className={`task-check ${task.completed ? 'checked' : ''}`} onClick={() => onToggle(task.id)} aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}>{task.completed && <Check size={14} />}</button>
          <div className="task-main"><strong>{task.title}</strong><div><span className="subject-tag">{task.subject}</span><span className="task-type">{task.kind}</span></div></div>
          <div className="task-pages"><div className="tiny-progress"><span style={{ width: `${(task.completedPages / task.pages) * 100}%` }} /></div><span>{task.completedPages}/{task.pages} pages</span></div>
          <button className="page-plus" onClick={() => onAddPage(task.id)} disabled={task.completed}><Plus size={14} /> <span>page</span></button>
           {onEdit && <IconButton label={`Edit ${task.title}`} className="edit-button" onClick={() => onEdit(task)}><Pencil size={15} /></IconButton>}
          <IconButton label="Delete task" className="delete-button" onClick={() => onDelete(task.id)}><Trash2 size={15} /></IconButton>
        </motion.div>
      ))}
      {tasks.length === 0 && <div className="empty-state"><Sprout size={24} /><strong>Your plan is clear.</strong><span>Add a task when you’re ready for the next chapter.</span></div>}
    </div>
  );
}

function Router() {
  return <Switch><Route path="/" component={Home} /><Route component={Home} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
