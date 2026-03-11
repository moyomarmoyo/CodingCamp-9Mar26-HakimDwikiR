/* ═══════════════════════════════════════════════
   LIFE DASHBOARD — app.js
   Vanilla JS · No frameworks · LocalStorage
   
   Sections:
   1.  Helpers
   2.  Clock & Greeting
   3.  Theme Toggle
   4.  Custom Name
   5.  Focus Timer
   6.  To-Do List
   7.  Quick Links
   8.  Init
═══════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════
   1. HELPERS
══════════════════════════════════════════════ */

/**
 * Shorthand querySelector
 * @param {string} sel - CSS selector
 * @param {Element} [ctx=document] - root context
 * @returns {Element|null}
 */
const $ = (sel, ctx = document) => ctx.querySelector(sel);

/**
 * Load a value from LocalStorage (auto-parses JSON)
 * @param {string} key
 * @param {*} fallback - default when key missing
 */
function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Save a value to LocalStorage (auto-stringifies)
 * @param {string} key
 * @param {*} value
 */
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage write failed:', e);
  }
}

/** Pad a number to 2 digits */
const pad2 = n => String(n).padStart(2, '0');


/* ══════════════════════════════════════════════
   2. CLOCK & GREETING
══════════════════════════════════════════════ */

const clockEl    = $('#clock');
const dateEl     = $('#dateDisplay');
const greetingEl = $('#greeting');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

/** Returns a greeting string based on the current hour */
function getGreetingText(hour) {
  if (hour < 5)  return 'Working late?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/** Updates clock, date, and greeting every second */
function tickClock() {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes();
  const s    = now.getSeconds();

  clockEl.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  dateEl.textContent  = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const name = lsGet('userName', '');
  const base = getGreetingText(h);
  greetingEl.textContent = name ? `${base}, ${name}` : base;
}

setInterval(tickClock, 1000);
tickClock(); // run immediately so there's no 1-second blank


/* ══════════════════════════════════════════════
   3. THEME TOGGLE   (Optional Challenge: Light/Dark Mode)
══════════════════════════════════════════════ */

const themeToggleBtn = $('#themeToggle');

/** Applies a theme and persists it */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  lsSet('theme', theme);
}

// Load saved theme on startup
applyTheme(lsGet('theme', 'dark'));

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});


/* ══════════════════════════════════════════════
   4. CUSTOM NAME   (Optional Challenge: Custom Greeting Name)
══════════════════════════════════════════════ */

const nameBtn    = $('#nameBtn');
const nameModal  = $('#nameModal');
const nameInput  = $('#nameInput');
const nameSave   = $('#nameSave');
const nameCancel = $('#nameCancel');

function openNameModal() {
  nameInput.value = lsGet('userName', '');
  nameModal.classList.remove('hidden');
  nameInput.focus();
}

function closeNameModal() {
  nameModal.classList.add('hidden');
}

nameBtn.addEventListener('click', openNameModal);

nameSave.addEventListener('click', () => {
  const val = nameInput.value.trim();
  lsSet('userName', val);
  closeNameModal();
  tickClock(); // refresh greeting immediately
});

nameCancel.addEventListener('click', closeNameModal);

// Close modal on overlay click
nameModal.addEventListener('click', e => {
  if (e.target === nameModal) closeNameModal();
});

// Save on Enter key
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') nameSave.click();
  if (e.key === 'Escape') closeNameModal();
});


/* ══════════════════════════════════════════════
   5. FOCUS TIMER   (Optional Challenge: Change Pomodoro Time)
══════════════════════════════════════════════ */

const timerDisplay  = $('#timerDisplay');
const timerStatus   = $('#timerStatus');
const timerStartBtn = $('#timerStart');
const timerPauseBtn = $('#timerPause');
const timerResetBtn = $('#timerReset');
const pomoDurationEl = $('#pomoDuration');
const ringProgress  = $('#ringProgress');
const timerRingEl   = $('.timer-ring');

const RING_CIRCUMFERENCE = 326.73; // 2π × 52

let timerInterval  = null;
let timerRunning   = false;
let totalSeconds   = 0; // total seconds for current session
let remainingSeconds = 0;

/** Format seconds as MM:SS */
function formatTime(secs) {
  return `${pad2(Math.floor(secs / 60))}:${pad2(secs % 60)}`;
}

/** Update the SVG ring stroke based on progress */
function updateRing(remaining, total) {
  const progress = total > 0 ? remaining / total : 1;
  const offset   = RING_CIRCUMFERENCE * (1 - progress);
  ringProgress.style.strokeDashoffset = offset;
}

/** Render the current timer state to the UI */
function renderTimer() {
  timerDisplay.textContent = formatTime(remainingSeconds);
  updateRing(remainingSeconds, totalSeconds);
}

/** Start (or resume) the timer */
function startTimer() {
  if (timerRunning) return;

  // If not yet initialised, read the duration input
  if (remainingSeconds === 0) {
    const mins = parseInt(pomoDurationEl.value, 10);
    if (!mins || mins < 1) return;
    totalSeconds     = mins * 60;
    remainingSeconds = totalSeconds;
  }

  timerRunning = true;
  timerRingEl.classList.add('running');

  timerStartBtn.disabled = true;
  timerPauseBtn.disabled = false;
  pomoDurationEl.disabled = true;
  timerStatus.textContent = 'Focusing…';

  timerInterval = setInterval(() => {
    remainingSeconds--;
    renderTimer();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning  = false;
      timerRingEl.classList.remove('running');
      timerStatus.textContent   = '🎉 Session complete!';
      timerStartBtn.disabled    = false;
      timerPauseBtn.disabled    = true;
      pomoDurationEl.disabled   = false;
      // Reset for next session
      remainingSeconds = 0;
      totalSeconds     = 0;
      updateRing(0, 1); // full ring
      renderTimer();
    }
  }, 1000);
}

/** Pause the timer */
function pauseTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  timerRingEl.classList.remove('running');
  timerStartBtn.disabled = false;
  timerPauseBtn.disabled = true;
  timerStatus.textContent = 'Paused';
}

/** Reset the timer to the chosen duration */
function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  timerRingEl.classList.remove('running');

  remainingSeconds = 0;
  totalSeconds     = 0;

  timerStartBtn.disabled  = false;
  timerPauseBtn.disabled  = true;
  pomoDurationEl.disabled = false;
  timerStatus.textContent = 'Ready to focus';

  // Show the set duration
  const mins = parseInt(pomoDurationEl.value, 10) || 25;
  timerDisplay.textContent = `${pad2(mins)}:00`;
  updateRing(1, 1); // full ring
}

timerStartBtn.addEventListener('click', startTimer);
timerPauseBtn.addEventListener('click', pauseTimer);
timerResetBtn.addEventListener('click', resetTimer);

// When duration input changes while idle, update the display
pomoDurationEl.addEventListener('input', () => {
  if (!timerRunning && remainingSeconds === 0) {
    const mins = parseInt(pomoDurationEl.value, 10) || 25;
    timerDisplay.textContent = `${pad2(mins)}:00`;
    updateRing(1, 1);
  }
});

// Clamp input value on blur
pomoDurationEl.addEventListener('blur', () => {
  let v = parseInt(pomoDurationEl.value, 10);
  if (!v || v < 1)  v = 1;
  if (v > 99)       v = 99;
  pomoDurationEl.value = v;
  if (!timerRunning && remainingSeconds === 0) {
    timerDisplay.textContent = `${pad2(v)}:00`;
  }
});


/* ══════════════════════════════════════════════
   6. TO-DO LIST
   Optional challenges: Prevent duplicates · Sort tasks
══════════════════════════════════════════════ */

const taskInput    = $('#taskInput');
const addTaskBtn   = $('#addTaskBtn');
const taskListEl   = $('#taskList');
const dupWarning   = $('#dupWarning');
const sortSelect   = $('#sortSelect');
const taskCountEl  = $('#taskCount');
const clearDoneBtn = $('#clearDone');

// Task schema: { id: string, text: string, done: boolean, addedAt: number }

/** Load tasks from LocalStorage */
function loadTasks() {
  return lsGet('tasks', []);
}

/** Persist tasks to LocalStorage */
function saveTasks(tasks) {
  lsSet('tasks', tasks);
}

/** Returns sorted copy of tasks based on current sort selection */
function getSortedTasks(tasks) {
  const sorted = [...tasks];
  switch (sortSelect.value) {
    case 'az':   sorted.sort((a, b) => a.text.localeCompare(b.text)); break;
    case 'za':   sorted.sort((a, b) => b.text.localeCompare(a.text)); break;
    case 'done': sorted.sort((a, b) => Number(a.done) - Number(b.done)); break;
    default:     sorted.sort((a, b) => a.addedAt - b.addedAt); // 'added'
  }
  return sorted;
}

/** Render the task list to the DOM */
function renderTasks() {
  const tasks  = loadTasks();
  const sorted = getSortedTasks(tasks);
  const done   = tasks.filter(t => t.done).length;
  const total  = tasks.length;

  taskCountEl.textContent = total > 0 ? `${done}/${total} done` : 'No tasks yet';

  taskListEl.innerHTML = '';

  sorted.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;
    li.setAttribute('data-id', task.id);

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''}
             aria-label="Mark '${escHtml(task.text)}' as done" />
      <span class="task-text">${escHtml(task.text)}</span>
      <div class="task-actions">
        <button class="task-edit-btn" title="Edit task" aria-label="Edit task '${escHtml(task.text)}'">✏️</button>
        <button class="btn btn-danger" title="Delete task" aria-label="Delete task '${escHtml(task.text)}'">✕</button>
      </div>`;

    // Checkbox: toggle done
    li.querySelector('.task-checkbox').addEventListener('change', () => toggleTask(task.id));

    // Edit button
    li.querySelector('.task-edit-btn').addEventListener('click', () => openEditModal(task.id));

    // Delete button
    li.querySelector('.btn-danger').addEventListener('click', () => deleteTask(task.id));

    taskListEl.appendChild(li);
  });
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Generate a simple unique ID */
function genId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Add a new task */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const tasks = loadTasks();

  // Optional Challenge: Prevent duplicate tasks (case-insensitive)
  const isDuplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (isDuplicate) {
    dupWarning.classList.remove('hidden');
    taskInput.select();
    setTimeout(() => dupWarning.classList.add('hidden'), 2500);
    return;
  }

  dupWarning.classList.add('hidden');

  tasks.push({ id: genId(), text, done: false, addedAt: Date.now() });
  saveTasks(tasks);
  taskInput.value = '';
  renderTasks();
}

/** Toggle done state for a task */
function toggleTask(id) {
  const tasks = loadTasks();
  const task  = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks(tasks);
    renderTasks();
  }
}

/** Delete a task */
function deleteTask(id) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
  renderTasks();
}

/** Remove all done tasks */
function clearDoneTasks() {
  saveTasks(loadTasks().filter(t => !t.done));
  renderTasks();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
sortSelect.addEventListener('change', renderTasks);
clearDoneBtn.addEventListener('click', clearDoneTasks);

/* Edit task modal */
const editModal   = $('#editModal');
const editInput   = $('#editInput');
const editSave    = $('#editSave');
const editCancel  = $('#editCancel');
let   editingId   = null;

function openEditModal(id) {
  const task = loadTasks().find(t => t.id === id);
  if (!task) return;
  editingId = id;
  editInput.value = task.text;
  editModal.classList.remove('hidden');
  editInput.focus();
  editInput.select();
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editingId = null;
}

editSave.addEventListener('click', () => {
  const newText = editInput.value.trim();
  if (!newText || !editingId) return;

  const tasks = loadTasks();

  // Check duplicate (exclude current task itself)
  const dup = tasks.some(t => t.id !== editingId && t.text.toLowerCase() === newText.toLowerCase());
  if (dup) {
    editInput.style.borderColor = 'var(--danger)';
    setTimeout(() => editInput.style.borderColor = '', 1500);
    return;
  }

  const task = tasks.find(t => t.id === editingId);
  if (task) {
    task.text = newText;
    saveTasks(tasks);
    renderTasks();
  }
  closeEditModal();
});

editCancel.addEventListener('click', closeEditModal);
editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });
editInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  editSave.click();
  if (e.key === 'Escape') closeEditModal();
});


/* ══════════════════════════════════════════════
   7. QUICK LINKS
══════════════════════════════════════════════ */

const linkNameEl  = $('#linkName');
const linkUrlEl   = $('#linkUrl');
const addLinkBtn  = $('#addLinkBtn');
const linkGrid    = $('#linkGrid');

// Link schema: { id: string, label: string, url: string }

function loadLinks() {
  return lsGet('quickLinks', []);
}

function saveLinks(links) {
  lsSet('quickLinks', links);
}

/** Normalise URL — prepend https:// if no protocol given */
function normaliseUrl(raw) {
  raw = raw.trim();
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  return raw;
}

function renderLinks() {
  const links = loadLinks();
  linkGrid.innerHTML = '';

  if (links.length === 0) {
    linkGrid.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted)">No links yet — add one above.</p>';
    return;
  }

  links.forEach(link => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';
    chip.style.cursor = 'default';

    chip.innerHTML = `
      <a href="${escHtml(link.url)}" target="_blank" rel="noopener noreferrer"
         class="link-chip-label" title="${escHtml(link.url)}">${escHtml(link.label)}</a>
      <button class="link-remove" title="Remove link" aria-label="Remove ${escHtml(link.label)}">✕</button>`;

    chip.querySelector('.link-remove').addEventListener('click', () => {
      saveLinks(loadLinks().filter(l => l.id !== link.id));
      renderLinks();
    });

    linkGrid.appendChild(chip);
  });
}

function addLink() {
  const label = linkNameEl.value.trim();
  const rawUrl = linkUrlEl.value.trim();

  if (!label || !rawUrl) return;

  const url = normaliseUrl(rawUrl);

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    linkUrlEl.style.borderColor = 'var(--danger)';
    setTimeout(() => linkUrlEl.style.borderColor = '', 1500);
    return;
  }

  const links = loadLinks();
  links.push({ id: genId(), label, url });
  saveLinks(links);

  linkNameEl.value = '';
  linkUrlEl.value  = '';
  renderLinks();
}

addLinkBtn.addEventListener('click', addLink);
linkUrlEl.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });
linkNameEl.addEventListener('keydown', e => { if (e.key === 'Enter') linkUrlEl.focus(); });


/* ══════════════════════════════════════════════
   8. INIT
══════════════════════════════════════════════ */
renderTasks();
renderLinks();


