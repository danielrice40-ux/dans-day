/* today.js — the Today tab: adding tasks, ticking them off, moving one to
 * tomorrow, and carrying unfinished work over to a new day.
 */

const TodayTab = (() => {
  // Elements are looked up once in init() and reused by render().
  let formEl, inputEl, listEl, emptyEl, countEl;
  let doneSectionEl, doneListEl, doneCountEl;

  const byCreatedAt = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);

  function init() {
    formEl = document.getElementById('task-form');
    inputEl = document.getElementById('task-input');
    listEl = document.getElementById('task-list');
    emptyEl = document.getElementById('task-empty');
    countEl = document.getElementById('task-count');
    doneSectionEl = document.getElementById('done-section');
    doneListEl = document.getElementById('done-list');
    doneCountEl = document.getElementById('done-count');

    formEl.addEventListener('submit', addTask);

    // One click listener on each list handles every row (this is called
    // "event delegation": new rows need no extra listeners).
    listEl.addEventListener('click', handleRowClick);
    doneListEl.addEventListener('click', handleRowClick);

    render();
  }

  /* ---- Adding ---- */
  function addTask(event) {
    event.preventDefault(); // stop the browser reloading the page

    const text = inputEl.value.trim();
    if (!text) return;

    const data = Store.load();
    data.tasks.push({
      id: Store.makeId(),
      text: text,
      date: Dates.today(), // which day this task belongs to
      done: false,
      createdAt: Date.now(),
    });
    Store.save(data);

    // Clear the box and keep the keyboard open for the next task.
    inputEl.value = '';
    inputEl.focus();

    render();
  }

  /* ---- Ticking off / unticking ---- */
  function toggleTask(id) {
    const data = Store.load();
    const task = data.tasks.find((item) => item.id === id);
    if (!task) return;

    task.done = !task.done;
    task.doneAt = task.done ? Date.now() : null;
    Store.save(data);
    render();
  }

  /* ---- Move to tomorrow ---- */
  function moveToTomorrow(id) {
    const data = Store.load();
    const task = data.tasks.find((item) => item.id === id);
    if (!task) return;

    task.date = Dates.addDays(Dates.today(), 1);
    Store.save(data);
    render();
    App.showToast('Moved to tomorrow');
  }

  /* ---- Carry over unfinished tasks ----
   * Any task still open whose date is before today is re-dated to today.
   * Returns how many tasks moved, so app.js can mention it.
   */
  function carryOver() {
    const data = Store.load();
    const today = Dates.today();
    let moved = 0;

    data.tasks.forEach((task) => {
      if (!task.done && task.date && task.date < today) {
        task.date = today;
        moved += 1;
      }
    });

    if (moved > 0) Store.save(data);
    return moved;
  }

  /* ---- Drawing the list ---- */
  function render() {
    const data = Store.load();
    const today = Dates.today();

    // Only today's tasks are shown; tomorrow's are waiting in the data.
    const todays = data.tasks.filter((task) => task.date === today);
    const open = todays.filter((task) => !task.done).sort(byCreatedAt);
    const done = todays
      .filter((task) => task.done)
      .sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)); // newest first

    countEl.textContent = open.length;
    emptyEl.hidden = open.length > 0;
    listEl.innerHTML = open.map(taskRowHTML).join('');

    // The Done section only appears once something has been ticked off.
    doneSectionEl.hidden = done.length === 0;
    doneCountEl.textContent = done.length;
    doneListEl.innerHTML = done.map(taskRowHTML).join('');
  }

  function taskRowHTML(task) {
    return `
      <li class="row ${task.done ? 'is-done' : ''}" data-id="${escapeHTML(task.id)}">
        <button class="row-main" type="button" data-action="toggle" aria-pressed="${task.done}">
          <span class="tick" aria-hidden="true"></span>
          <span class="row-text">${escapeHTML(task.text)}</span>
        </button>
        ${task.done ? '' : '<button class="pill-btn" type="button" data-action="tomorrow">→ Tomorrow</button>'}
      </li>`;
  }

  /* ---- One click handler for every row ---- */
  function handleRowClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const row = button.closest('[data-id]');
    if (!row) return;

    if (button.dataset.action === 'toggle') toggleTask(row.dataset.id);
    if (button.dataset.action === 'tomorrow') moveToTomorrow(row.dataset.id);
  }

  return { init, render, carryOver };
})();
