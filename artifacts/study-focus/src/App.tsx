import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
const storageKey = 'study-focus-state-v2';

const defaultTasks: StudyTask[] = [
  {
    id: 'biology',
    title: 'Cell biology · chapter 4',
    subject: 'Biology',
    pages: 10,
    completedPages: 6,
    kind: 'Homework',
    priority: 'High',
    completed: false,
  },
  {
    id: 'calculus',
    title: 'Practice integration exercises',
    subject: 'Mathematics',
    pages: 6,
    completedPages: 0,
    kind: 'Project',
    priority: 'Medium',
    completed: false,
  },
  {
    id: 'history',
    title: 'Review French Revolution notes',
    subject: 'History',
    pages: 4,
    completedPages: 4,
    kind: 'Test',
    priority: 'Low',
    completed: true,
  },
];

const defaultHistory: PlantSnapshot[] = [
  { date: 'mon', label: 'Mon', xp: 140, streak: 1, pages: 3, sessions: 1, stage: 2, note: 'A tiny sprout appeared.' },
  { date: 'tue', label: 'Tue', xp: 190, streak: 2, pages: 5, sessions: 2, stage: 2, note: 'The stem grew taller.' },
  { date: 'wed', label: 'Wed', xp: 230, streak: 3, pages: 4, sessions: 1, stage: 3, note: 'First leaves unfolded.' },
  { date: 'thu', label: 'Thu', xp: 260, streak: 4, pages: 6, sessions: 2, stage: 3, note: 'A steady study day.' },
  { date: 'fri', label: 'Fri', xp: 290, streak: 5, pages: 4, sessions: 1, stage: 3, note: 'The plant feels strong.' },
  { date: 'sat', label: 'Sat', xp: 320, streak: 6, pages: 7, sessions: 2, stage: 4, note: 'A flower bud is forming.' },
  { date: 'sun', label: 'Sun', xp: 320, streak: 6, pages: 0, sessions: 0, stage: 4, note: 'Today is still growing.' },
];

const initialState: StudyState = {
  tasks: defaultTasks,
  xp: 320,
  streak: 6,
  sessions: 12,
  todayPages: 6,
  todayGoal: 10,
  distractions: 2,
  minutesLost: 9,
  selectedMinutes: 25,
  remainingSeconds: 25 * 60,
  timerRunning: false,
  subject: 'Biology',
  mode: 'Learning',
  journal: 'The first few pages felt heavy, but I found my rhythm after starting.',
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
  return (
    <div className={`plant-art ${small ? 'plant-art-small' : ''}`} aria-label={`Plant growth stage ${stage}`}>
      <div className="plant-glow" />
      <svg viewBox="0 0 220 220" width={size} height={size} role="img">
        <ellipse cx="110" cy="190" rx="72" ry="16" fill="rgba(31, 46, 32, .18)" />
        <path d="M51 182 C68 166 82 158 110 158 C138 158 153 166 169 182 Z" fill="#70523c" />
        <path d="M60 178 C81 170 140 170 160 178 C151 193 69 193 60 178Z" fill="#8f6b4b" />
        <path d="M110 170 C110 143 110 119 110 78" stroke={stage === 1 ? '#aa8759' : '#537657'} strokeWidth="7" strokeLinecap="round" />
        {stage === 1 && <circle cx="110" cy="167" r="12" fill="#d09a58" />}
        {stage >= 2 && (
          <>
            <path d="M108 137 C86 133 76 122 78 110 C94 109 106 118 110 132Z" fill="#6f966f" />
            <path d="M112 119 C130 112 143 101 142 89 C126 90 114 99 111 113Z" fill="#86a883" />
          </>
        )}
        {leaves >= 1 && <path d="M109 101 C89 96 77 84 80 72 C98 74 108 84 111 96Z" fill="#6a936d" />}
        {leaves >= 2 && <path d="M112 88 C132 82 146 70 144 58 C127 60 115 70 111 81Z" fill="#9ab78b" />}
        {stage >= 4 && (
          <>
            <circle cx="110" cy="68" r="16" fill="#d99e64" />
            <circle cx="110" cy="68" r="8" fill="#f2d39a" />
            <circle cx="96" cy="65" r="10" fill="#bd7e62" opacity=".9" />
            <circle cx="124" cy="65" r="10" fill="#bd7e62" opacity=".9" />
            <circle cx="110" cy="53" r="10" fill="#c8876e" opacity=".9" />
          </>
        )}
        {stage >= 5 && <path d="M110 39 L114 27 L120 39 L132 41 L121 47 L124 59 L110 52 L96 59 L99 47 L88 41 L100 39 L106 27Z" fill="#e6b65c" />}
      </svg>
      <div className="plant-stage-label">
        {stage === 1 ? 'Buried seed' : stage === 2 ? 'Little sprout' : stage === 3 ? 'Growing plant' : stage === 4 ? 'Budding flower' : 'Full bloom'}
      </div>
    </div>
  );
}

function Home() {
  const [view, setView] = useState<View>('overview');
  const [state, setState] = useState<StudyState>(() => readState());
  const [notice, setNotice] = useState('');
  const [breakReady, setBreakReady] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPages, setNewTaskPages] = useState('5');
  const [newTaskSubject, setNewTaskSubject] = useState('Biology');
  const [newTaskKind, setNewTaskKind] = useState<StudyTask['kind']>('Homework');
  const [reflection, setReflection] = useState('');

  const stage = getPlantStage(state.xp, state.streak);
  const incompleteTasks = state.tasks.filter((task) => !task.completed);
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
      <aside className="sidebar">
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
      </aside>

      <main className="main-content">
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
            <section className="welcome-row">
              <div>
                <p className="soft-intro">A quiet place to do the next right thing.</p>
                <h2>Let’s tend to your focus.</h2>
              </div>
              <div className="date-chip"><CalendarDays size={16} /><span>This week</span><ChevronRight size={15} /></div>
            </section>

            <section className="dashboard-grid">
              <div className="panel focus-panel" id="focus-card">
                <div className="panel-heading">
                  <div><span className="section-kicker">Focus garden</span><h3>One session at a time.</h3></div>
                  <span className="mode-badge"><span className="status-dot" />{state.mode}</span>
                </div>
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
              </div>

              <div className="panel plant-panel">
                <div className="panel-heading">
                  <div><span className="section-kicker">Your living progress</span><h3>Keep growing.</h3></div>
                  <button className="circle-link" onClick={() => setView('history')} aria-label="View plant history"><ArrowRight size={16} /></button>
                </div>
                <PlantIllustration stage={stage} />
                <div className="plant-stats"><span><strong>{state.xp}</strong> XP</span><span><strong>{state.streak}</strong> days</span><span><strong>{state.sessions}</strong> sessions</span></div>
              </div>
            </section>

            <section className="lower-grid">
              <div className="panel pages-panel">
                <div className="panel-heading">
                  <div><span className="section-kicker">Today’s pages</span><h3>{state.todayPages} of {state.todayGoal} completed</h3></div>
                  <Target size={21} className="heading-icon" />
                </div>
                <div className="large-progress"><span style={{ width: `${todayProgress}%` }} /></div>
                <div className="progress-foot"><span>{todayProgress}% of today’s goal</span><span>{state.todayGoal - state.todayPages > 0 ? `${state.todayGoal - state.todayPages} to go` : 'Goal complete'}</span></div>
                <div className="page-dots">{Array.from({ length: state.todayGoal }).map((_, index) => <span key={index} className={index < state.todayPages ? 'filled' : ''} />)}</div>
              </div>
              <div className="panel distraction-panel">
                <div className="panel-heading"><div><span className="section-kicker">Stay honest</span><h3>Mind wandered?</h3></div><CircleHelp size={20} className="heading-icon" /></div>
                <p className="panel-description">Tap what pulled you away. Noticing is already a way back.</p>
                <div className="distraction-actions">
                  <button onClick={() => recordDistraction('Tired')}><span>Tired / hungry</span><Clock3 size={15} /></button>
                  <button onClick={() => recordDistraction('Bored')}><span>Bored</span><Minus size={15} /></button>
                  <button onClick={() => recordDistraction('Stuck')}><span>Hard concept</span><TriangleAlert size={15} /></button>
                </div>
                <div className="distraction-summary"><span><strong>{state.distractions}</strong> distractions today</span><span><strong>{state.minutesLost}m</strong> time lost</span></div>
              </div>
            </section>

            <section className="section-block">
              <div className="section-title-row"><div><span className="section-kicker">A gentle plan</span><h3>What’s on your desk</h3></div><button className="text-button" onClick={() => setView('tasks')}>Manage tasks <ArrowRight size={15} /></button></div>
              <TaskList tasks={state.tasks.slice(0, 3)} onAddPage={addPage} onToggle={toggleTask} onDelete={deleteTask} />
            </section>
          </>
        )}

        {view === 'tasks' && (
          <section className="page-section">
            <div className="page-intro-row"><div><span className="section-kicker">Tasks & subjects</span><h2>Make the next step visible.</h2><p>Turn homework, projects, and upcoming tests into pages you can gently finish.</p></div><button className="primary-button" onClick={() => setShowTaskForm(!showTaskForm)}><Plus size={17} /> Add task</button></div>
            {showTaskForm && <div className="panel task-form"><div className="form-header"><h3>New study task</h3><IconButton label="Close form" onClick={() => setShowTaskForm(false)}><X size={17} /></IconButton></div><div className="form-grid"><label>Task name<input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="e.g. Read chapter 5" /></label><label>Pages<input type="number" min="1" value={newTaskPages} onChange={(event) => setNewTaskPages(event.target.value)} /></label><label>Subject<select value={newTaskSubject} onChange={(event) => setNewTaskSubject(event.target.value)}><option>Biology</option><option>Mathematics</option><option>History</option><option>Languages</option></select></label><label>Type<select value={newTaskKind} onChange={(event) => setNewTaskKind(event.target.value as StudyTask['kind'])}><option>Homework</option><option>Project</option><option>Test</option></select></label></div><button className="primary-button" onClick={addTask}>Add to my plan <ArrowRight size={16} /></button></div>}
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
          <section className="page-section"><div className="page-intro-row"><div><span className="section-kicker">Your space</span><h2>Make Study Focus yours.</h2><p>These preferences stay on this device.</p></div><Settings2 size={34} className="journal-mark" /></div><div className="panel settings-panel"><label>Your name<input value={state.displayName} onChange={(event) => setState(daySnapshot({ ...state, displayName: event.target.value }))} /></label><label>Daily page goal<input type="number" min="1" value={state.todayGoal} onChange={(event) => setState(daySnapshot({ ...state, todayGoal: Math.max(1, Number(event.target.value) || 1) }))} /></label><label>Default subject<select value={state.subject} onChange={(event) => setState({ ...state, subject: event.target.value })}><option>Biology</option><option>Mathematics</option><option>History</option><option>Languages</option></select></label><label>Study mode<select value={state.mode} onChange={(event) => setState({ ...state, mode: event.target.value as StudyMode })}><option>Learning</option><option>Test prep</option><option>Normal study</option></select></label></div></section>
        )}
      </main>

      {breakReady && <div className="break-overlay"><div className="break-modal"><div className="break-icon"><Coffee size={25} /></div><span className="section-kicker">A reward for showing up</span><h2>Your 10-minute break is ready.</h2><p>You finished a meaningful piece of your plan. Step away, breathe, and come back when you’re ready.</p><div className="break-actions"><button className="secondary-button" onClick={() => setBreakReady(false)}>Not now</button><button className="primary-button" onClick={() => { setBreakReady(false); setNotice('Break started. Enjoy your reset.'); }}>Start break <ArrowRight size={15} /></button></div></div></div>}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-active-dot" />}</button>;
}

function TaskList({ tasks, onAddPage, onToggle, onDelete }: { tasks: StudyTask[]; onAddPage: (id: string) => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div className={`task-row ${task.completed ? 'is-complete' : ''}`} key={task.id}>
          <button className={`task-check ${task.completed ? 'checked' : ''}`} onClick={() => onToggle(task.id)} aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}>{task.completed && <Check size={14} />}</button>
          <div className="task-main"><strong>{task.title}</strong><div><span className="subject-tag">{task.subject}</span><span className="task-type">{task.kind}</span></div></div>
          <div className="task-pages"><div className="tiny-progress"><span style={{ width: `${(task.completedPages / task.pages) * 100}%` }} /></div><span>{task.completedPages}/{task.pages} pages</span></div>
          <button className="page-plus" onClick={() => onAddPage(task.id)} disabled={task.completed}><Plus size={14} /> <span>page</span></button>
          <IconButton label="Delete task" className="delete-button" onClick={() => onDelete(task.id)}><Trash2 size={15} /></IconButton>
        </div>
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
