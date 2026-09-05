import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
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

type View = 'overview' | 'tasks' | 'history' | 'journal' | 'settings';
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
  xp: number;
  streak: number;
  pages: number;
  sessions: number;
  stage: number;
  note: string;
};

type StudyState = {
  tasks: StudyTask[];
  subjects: string[];
  xp: number;
  streak: number;
  sessions: number;
  todayPages: number;
  todayGoal: number;
  distractions: number;
  minutesLost: number;
  selectedMinutes: number;
  remainingSeconds: number;
  timerRunning: boolean;
  subject: string;
  mode: StudyMode;
  journal: string;
  displayName: string;
  history: PlantSnapshot[];
};

const queryClient = new QueryClient();
const storageKey = 'study-focus-state-v3';

const defaultTasks: StudyTask[] = [];

const defaultHistory: PlantSnapshot[] = [
  { date: 'mon', label: 'Mon', xp: 0, streak: 0, pages: 0, sessions: 0, stage: 1, note: 'A fresh start.' },
  { date: 'tue', label: 'Tue', xp: 0, streak: 0, pages: 0, sessions: 0, stage: 1, note: 'Ready when you are.' },
  { date: 'wed', label: 'Wed', xp: 0, streak: 0, pages: 0, sessions: 0, stage: 1, note: 'The garden is waiting.' },
  { date: 'thu', label: 'Thu', xp: 0, streak: 0, pages: 0, sessions: 0, stage: 1, note: 'No sessions yet.' },
  { date: 'fri', label: 'Fri', xp: 0, streak: 0, pages: 0, sessions: 0, stage: 1, note: 'Your first page can start today.' },
  { date: 'sat', label: 'Sat', xp: 0, streak: 0, pages: 0, sessions: 0, stage: 1, note: 'A quiet beginning.' },
  { date: 'sun', label: 'Sun', xp: 0, streak: 0, pages: 0, sessions: 0, stage: 1, note: 'Today is yours to grow.' },
];

const initialState: StudyState = {
  tasks: defaultTasks,
  subjects: ['Biology', 'Mathematics', 'History', 'Languages'],
  xp: 0,
  streak: 0,
  sessions: 0,
  todayPages: 0,
  todayGoal: 10,
  distractions: 0,
  minutesLost: 0,
  selectedMinutes: 25,
  remainingSeconds: 25 * 60,
  timerRunning: false,
  subject: 'Biology',
  mode: 'Learning',
  journal: '',
  displayName: 'Alex',
  history: defaultHistory,
};

function readState(): StudyState {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return initialState;
    return { ...initialState, ...JSON.parse(saved) } as StudyState;
  } catch {
    return initialState;
  }
}

function getPlantStage(xp: number, streak: number) {
  if (xp >= 650 || streak >= 14) return 5;
  if (xp >= 350 || streak >= 7) return 4;
  if (xp >= 200 || streak >= 3) return 3;
  if (xp >= 80 || streak >= 1) return 2;
  return 1;
}

function daySnapshot(state: StudyState): StudyState {
  const date = new Date();
  const key = date.toISOString().slice(0, 10);
  const label = date.toLocaleDateString('en-US', { weekday: 'short' });
  const nextSnapshot: PlantSnapshot = {
    date: key,
    label,
    xp: state.xp,
    streak: state.streak,
    pages: state.todayPages,
    sessions: state.sessions,
    stage: getPlantStage(state.xp, state.streak),
    note: state.todayPages > 0 ? 'You showed up for yourself today.' : 'Your next page is waiting.',
  };
  const history = state.history.filter((item) => item.date !== key);
  return { ...state, history: [...history, nextSnapshot].slice(-7) };
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
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
  const [view, setView] = useState<View>('overview');
  const [state, setState] = useState<StudyState>(() => readState());
  const [homecoming, setHomecoming] = useState(() => !new URLSearchParams(window.location.search).has('skip-intro'));
  const [notice, setNotice] = useState('');
  const [breakReady, setBreakReady] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPages, setNewTaskPages] = useState('5');
  const [newTaskSubject, setNewTaskSubject] = useState('Biology');
  const [newTaskKind, setNewTaskKind] = useState<StudyTask['kind']>('Homework');
  const [reflection, setReflection] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [celebration, setCelebration] = useState(false);

  const stage = getPlantStage(state.xp, state.streak);
  const incompleteTasks = state.tasks.filter((task) => !task.completed);

  useEffect(() => {
    const timeout = window.setTimeout(() => setHomecoming(false), 2100);
    return () => window.clearTimeout(timeout);
  }, []);
  const activeTask = incompleteTasks[0] ?? state.tasks[0];
  const pagesDone = state.tasks.reduce((sum, task) => sum + task.completedPages, 0);
  const pagesTotal = state.tasks.reduce((sum, task) => sum + task.pages, 0);
  const todayProgress = Math.min(100, Math.round((state.todayPages / state.todayGoal) * 100));
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const commit = (next: StudyState, message?: string) => {
    setState(daySnapshot(next));
    if (message) {
      setNotice(message);
      window.setTimeout(() => setNotice(''), 3500);
    }
  };

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!state.timerRunning) return undefined;
    const interval = window.setInterval(() => {
      setState((previous) => {
        if (!previous.timerRunning) return previous;
        if (previous.remainingSeconds <= 1) {
          setBreakReady(true);
          return daySnapshot({
            ...previous,
            remainingSeconds: 0,
            timerRunning: false,
            sessions: previous.sessions + 1,
            xp: previous.xp + 30,
          });
        }
        return { ...previous, remainingSeconds: previous.remainingSeconds - 1 };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.timerRunning]);

  const startTimer = () => {
    commit(
      { ...state, timerRunning: true, remainingSeconds: state.remainingSeconds || state.selectedMinutes * 60 },
      'Focus session started. Your next page is enough.',
    );
  };

  const resetTimer = () => commit({ ...state, timerRunning: false, remainingSeconds: state.selectedMinutes * 60 });

  const finishSession = () => {
    commit(
      { ...state, timerRunning: false, remainingSeconds: state.selectedMinutes * 60, sessions: state.sessions + 1, xp: state.xp + 25 },
      'Session complete. You earned 25 XP.',
    );
    setBreakReady(true);
  };

  const addPage = (taskId: string) => {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || task.completedPages >= task.pages) return;
    const completedPages = task.completedPages + 1;
    const completed = completedPages >= task.pages;
    const nextTasks = state.tasks.map((item) =>
      item.id === taskId ? { ...item, completedPages, completed } : item,
    );
    commit(
      { ...state, tasks: nextTasks, todayPages: state.todayPages + 1, xp: state.xp + 10 },
      completed ? `${task.title} complete. A 10 minute break is ready.` : '+1 page logged. You earned 10 XP.',
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

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const pages = Math.max(1, Number.parseInt(newTaskPages, 10) || 1);
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
    commit({ ...state, tasks: [task, ...state.tasks] }, 'New task added to your plan.');
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
    const message = reason === 'Stuck'
      ? 'Try writing one guess, then break the concept into a smaller question.'
      : 'A short reset may help. Come back when your mind feels ready.';
    commit({ ...state, distractions: state.distractions + 1, minutesLost: state.minutesLost + 5 }, message);
  };

  const pageTitle = {
    overview: 'Good morning',
    tasks: 'Your study plan',
    history: 'Plant history',
    journal: 'Study journal',
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
            <div className="brand-name">Study Focus</div>
            <div className="brand-caption">grow your rhythm</div>
          </div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <div className="nav-label">Workspace</div>
          <NavButton active={view === 'overview'} onClick={() => setView('overview')} icon={<BarChart3 size={17} />} label="Overview" />
          <NavButton active={view === 'tasks'} onClick={() => setView('tasks')} icon={<ListChecks size={17} />} label="My plan" />
          <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<Flower2 size={17} />} label="Plant history" />
          <NavButton active={view === 'journal'} onClick={() => setView('journal')} icon={<NotebookPen size={17} />} label="Journal" />
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
            <div className="streak-pill"><Flame size={15} /><strong>{state.streak}</strong><span>day streak</span></div>
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
                      <Sparkles size={14} /> +10 XP
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="focus-layout">
                  <div className="timer-wrap">
                    <div className={`timer-ring ${state.timerRunning ? 'is-running' : ''}`} style={{ '--timer-progress': `${100 - (state.remainingSeconds / (state.selectedMinutes * 60)) * 100}%` } as React.CSSProperties}>
                      <div className="timer-inner">
                        <span className="timer-label">{state.timerRunning ? 'in focus' : 'ready when you are'}</span>
                        <strong>{formatTime(state.remainingSeconds)}</strong>
                        <small>{state.subject} · {state.mode}</small>
                      </div>
                    </div>
                    <div className="timer-controls">
                      <IconButton label="Reset timer" onClick={resetTimer}><RotateCcw size={17} /></IconButton>
                      {state.timerRunning ? (
                        <button className="round-play-button" onClick={() => commit({ ...state, timerRunning: false }, 'Session paused.') }><Pause size={19} fill="currentColor" /></button>
                      ) : (
                        <button className="round-play-button" onClick={startTimer}><Play size={19} fill="currentColor" /></button>
                      )}
                      <IconButton label="Finish session" onClick={finishSession}><Check size={17} /></IconButton>
                    </div>
                    <div className="preset-row">
                      {[25, 50, 90].map((minutes) => (
                        <button className={state.selectedMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => !state.timerRunning && commit({ ...state, selectedMinutes: minutes, remainingSeconds: minutes * 60 })}>{minutes} min</button>
                      ))}
                    </div>
                  </div>
                  <div className="focus-side">
                    <div className="focus-quote"><span className="quote-mark">“</span><p>The goal is not to finish everything. It’s to begin with care.</p></div>
                    <div className="current-task-card">
                      <div className="task-card-top"><span>Next page</span><span className="priority-dot" /></div>
                      <strong>{activeTask?.title ?? 'Add a task to begin'}</strong>
                      <div className="task-card-progress"><span style={{ width: `${activeTask ? (activeTask.completedPages / activeTask.pages) * 100 : 0}%` }} /></div>
                      <div className="task-card-bottom"><small>{activeTask ? `${activeTask.completedPages} of ${activeTask.pages} pages` : 'No active task'}</small><button onClick={() => activeTask && addPage(activeTask.id)} disabled={!activeTask || activeTask.completed}><Plus size={15} /> Page done</button></div>
                    </div>
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
                <div className="plant-stats"><span><strong>{state.xp}</strong> XP</span><span><strong>{state.streak}</strong> days</span><span><strong>{state.sessions}</strong> sessions</span></div>
              </motion.div>
            </section>

            <section className="lower-grid">
               <motion.div className="panel pages-panel" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .87, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
                <div className="panel-heading">
                  <div><span className="section-kicker">Today’s pages</span><h3>{state.todayPages} of {state.todayGoal} completed</h3></div>
                  <Target size={21} className="heading-icon" />
                </div>
                <div className="large-progress"><span style={{ width: `${todayProgress}%` }} /></div>
                <div className="progress-foot"><span>{todayProgress}% of today’s goal</span><span>{state.todayGoal - state.todayPages > 0 ? `${state.todayGoal - state.todayPages} to go` : 'Goal complete'}</span></div>
                <div className="page-dots">{Array.from({ length: state.todayGoal }).map((_, index) => <span key={index} className={index < state.todayPages ? 'filled' : ''} />)}</div>
               </motion.div>
               <motion.div className="panel distraction-panel" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .98, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
                <div className="panel-heading"><div><span className="section-kicker">Stay honest</span><h3>Mind wandered?</h3></div><CircleHelp size={20} className="heading-icon" /></div>
                <p className="panel-description">Tap what pulled you away. Noticing is already a way back.</p>
                <div className="distraction-actions">
                  <button onClick={() => recordDistraction('Tired')}><span>Tired / hungry</span><Clock3 size={15} /></button>
                  <button onClick={() => recordDistraction('Bored')}><span>Bored</span><Minus size={15} /></button>
                  <button onClick={() => recordDistraction('Stuck')}><span>Hard concept</span><TriangleAlert size={15} /></button>
                 </div>
                <div className="distraction-summary"><span><strong>{state.distractions}</strong> distractions today</span><span><strong>{state.minutesLost}m</strong> time lost</span></div>
               </motion.div>
            </section>

             <motion.section className="section-block" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.08, duration: .7, ease: [0.22, 1, 0.36, 1] }}>
              <div className="section-title-row"><div><span className="section-kicker">A gentle plan</span><h3>What’s on your desk</h3></div><button className="text-button" onClick={() => setView('tasks')}>Manage tasks <ArrowRight size={15} /></button></div>
              <TaskList tasks={state.tasks.slice(0, 3)} onAddPage={addPage} onToggle={toggleTask} onDelete={deleteTask} />
             </motion.section>
          </>
        )}

        {view === 'tasks' && (
          <section className="page-section">
            <div className="page-intro-row"><div><span className="section-kicker">Tasks & subjects</span><h2>Make the next step visible.</h2><p>Turn homework, projects, and upcoming tests into pages you can gently finish.</p></div><button className="primary-button" onClick={() => setShowTaskForm(!showTaskForm)}><Plus size={17} /> Add task</button></div>
            {showTaskForm && <div className="panel task-form"><div className="form-header"><h3>New study task</h3><IconButton label="Close form" onClick={() => setShowTaskForm(false)}><X size={17} /></IconButton></div><div className="form-grid"><label>Task name<input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="e.g. Read chapter 5" /></label><label>Pages<input type="number" min="1" value={newTaskPages} onChange={(event) => setNewTaskPages(event.target.value)} /></label><label>Subject<select value={newTaskSubject} onChange={(event) => setNewTaskSubject(event.target.value)}>{state.subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Type<select value={newTaskKind} onChange={(event) => setNewTaskKind(event.target.value as StudyTask['kind'])}><option>Homework</option><option>Project</option><option>Test</option></select></label></div><button className="primary-button" onClick={addTask}>Add to my plan <ArrowRight size={16} /></button></div>}
            <TaskList tasks={state.tasks} onAddPage={addPage} onToggle={toggleTask} onDelete={deleteTask} />
          </section>
        )}

        {view === 'history' && (
          <section className="page-section">
            <div className="page-intro-row"><div><span className="section-kicker">Weekly reflection</span><h2>The story of your plant.</h2><p>Look back at what helped your focus grow this week.</p></div><div className="week-summary"><Flame size={16} /><strong>{state.streak} days</strong><span>current streak</span></div></div>
            <div className="history-layout"><div className="panel history-plant-card"><PlantIllustration stage={stage} /><div className="history-plant-copy"><span className="section-kicker">Current chapter</span><h3>{stage >= 4 ? 'You are blooming.' : 'You are putting down roots.'}</h3><p>Your plant is at stage {stage}. Every page, session, and honest restart becomes part of its story.</p><div className="plant-xp-bar"><span style={{ width: `${Math.min(100, (state.xp / 650) * 100)}%` }} /></div><small>{state.xp} / 650 XP until full bloom</small></div></div><div className="panel timeline-panel"><div className="panel-heading"><div><span className="section-kicker">Last 7 days</span><h3>Growth timeline</h3></div><CalendarDays size={20} className="heading-icon" /></div><div className="timeline">{state.history.map((item) => <div className="timeline-row" key={`${item.date}-${item.label}`}><div className={`timeline-icon stage-${item.stage}`}>{item.stage >= 4 ? <Flower2 size={16} /> : item.stage >= 2 ? <Sprout size={17} /> : <span />}</div><div className="timeline-date"><strong>{item.label}</strong><small>{item.pages} pages · {item.sessions} sessions</small></div><div className="timeline-note"><span>Stage {item.stage}</span><small>{item.note}</small></div><span className="timeline-xp">+{Math.max(0, item.xp - 100)} XP</span></div>)}</div></div></div>
            <div className="weekly-insights"><div className="insight-card"><BarChart3 size={18} /><span>Total pages</span><strong>{state.history.reduce((sum, item) => sum + item.pages, 0)}</strong><small>this week</small></div><div className="insight-card"><Clock3 size={18} /><span>Focus sessions</span><strong>{state.history.reduce((sum, item) => sum + item.sessions, 0)}</strong><small>completed</small></div><div className="insight-card"><Sparkles size={18} /><span>XP earned</span><strong>{state.xp}</strong><small>plant energy</small></div></div>
          </section>
        )}

        {view === 'journal' && (
          <section className="page-section journal-page"><div className="page-intro-row"><div><span className="section-kicker">A place to think</span><h2>Small notes, honest progress.</h2><p>Write down what you noticed today—about your studies or yourself.</p></div><NotebookPen size={34} className="journal-mark" /></div><div className="journal-layout"><div className="panel journal-editor"><div className="journal-date"><CalendarDays size={15} /> {currentDate}</div><textarea value={state.journal} onChange={(event) => setState(daySnapshot({ ...state, journal: event.target.value }))} placeholder="What felt easy? What felt heavy? What will you try next?" /><div className="journal-footer"><span>{state.journal.length} characters</span><button className="primary-button compact" onClick={() => { commit(state, 'Journal entry saved.'); }}>Save entry</button></div></div><div className="panel reflection-card"><span className="section-kicker">End of session</span><h3>What will you do next?</h3><p>Leave a small breadcrumb for your future self.</p><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Next time I will start with..." /><button className="secondary-button" onClick={() => { setReflection(''); setNotice('Reflection saved for your next session.'); }}>Save reflection <ArrowRight size={15} /></button></div></div></section>
        )}

        {view === 'settings' && (
          <section className="page-section"><div className="page-intro-row"><div><span className="section-kicker">Your space</span><h2>Make Study Focus yours.</h2><p>These preferences stay on this device.</p></div><Settings2 size={34} className="journal-mark" /></div><div className="panel settings-panel"><label>Your name<input value={state.displayName} onChange={(event) => setState(daySnapshot({ ...state, displayName: event.target.value }))} /></label><label>Daily page goal<input type="number" min="1" value={state.todayGoal} onChange={(event) => setState(daySnapshot({ ...state, todayGoal: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Default subject<select value={state.subject} onChange={(event) => setState({ ...state, subject: event.target.value })}>{state.subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Study mode<select value={state.mode} onChange={(event) => setState({ ...state, mode: event.target.value as StudyMode })}><option>Learning</option><option>Test prep</option><option>Normal study</option></select></label></div><div className="panel subject-manager"><div className="subject-manager-heading"><div><span className="section-kicker">Your library</span><h3>Your subjects</h3><p>Create the subjects that match your life and your study track.</p></div><BookOpen size={22} /></div><div className="subject-chips">{state.subjects.map((subject, index) => <motion.div layout key={subject} className="subject-chip"><span className={`subject-swatch swatch-${index % 5}`} />{subject}<button onClick={() => removeSubject(subject)} aria-label={`Remove ${subject}`}><X size={13} /></button></motion.div>)}</div><div className="subject-add-row"><input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addSubject()} placeholder="e.g. Literature, Physics, Art history" /><button className="primary-button compact" onClick={addSubject}><Plus size={15} /> Add subject</button></div></div></section>
        )}
      </motion.main>

      {breakReady && <div className="break-overlay"><div className="break-modal"><div className="break-icon"><Coffee size={25} /></div><span className="section-kicker">A reward for showing up</span><h2>Your 10-minute break is ready.</h2><p>You finished a meaningful piece of your plan. Step away, breathe, and come back when you’re ready.</p><div className="break-actions"><button className="secondary-button" onClick={() => setBreakReady(false)}>Not now</button><button className="primary-button" onClick={() => { setBreakReady(false); setNotice('Break started. Enjoy your reset.'); }}>Start break <ArrowRight size={15} /></button></div></div></div>}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <motion.button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick} whileHover={{ x: 4 }} whileTap={{ scale: .96 }}>{icon}<span>{label}</span>{active && <span className="nav-active-dot" />}</motion.button>;
}

function TaskList({ tasks, onAddPage, onToggle, onDelete }: { tasks: StudyTask[]; onAddPage: (id: string) => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="task-list">
      {tasks.map((task, index) => (
        <motion.div className={`task-row ${task.completed ? 'is-complete' : ''}`} key={task.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: task.completed ? .62 : 1, x: 0 }} transition={{ delay: index * .08, duration: .45, ease: [0.22, 1, 0.36, 1] }} whileHover={{ x: 4 }}>
          <button className={`task-check ${task.completed ? 'checked' : ''}`} onClick={() => onToggle(task.id)} aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}>{task.completed && <Check size={14} />}</button>
          <div className="task-main"><strong>{task.title}</strong><div><span className="subject-tag">{task.subject}</span><span className="task-type">{task.kind}</span></div></div>
          <div className="task-pages"><div className="tiny-progress"><span style={{ width: `${(task.completedPages / task.pages) * 100}%` }} /></div><span>{task.completedPages}/{task.pages} pages</span></div>
          <button className="page-plus" onClick={() => onAddPage(task.id)} disabled={task.completed}><Plus size={14} /> <span>page</span></button>
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
