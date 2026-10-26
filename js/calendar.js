/* calendar.js — the Calendar tab: a simple Monday-to-Sunday week view where
 * you can add events with a title, date, time and a colour tag, then tap one
 * to edit or delete it.
 */

const CalendarTab = (() => {
  // Elements are looked up once in init() and reused everywhere else.
  let rangeEl, stripEl, daysEl;
  let modalEl, formEl, titleEl, dateEl, timeEl, tagOptionsEl;
  let modalTitleEl, deleteBtn;

  // Which Monday the current view starts on ('YYYY-MM-DD').
  let weekStart = Dates.startOfWeek(Dates.today());

  // The event being edited (an id), or null when adding a new one.
  let editingId = null;

  // The tag chosen in the dialog. Every event needs one of these.
  let selectedTag = 'home';

  // The four colour tags. The key is what gets saved; the label is only used
  // to check a tag is valid before it is stored.
  const TAG_LABELS = { kids: 'Kids', work: 'Work', home: 'Home', projects: 'Projects' };

  function init() {
    rangeEl = document.getElementById('week-range');
    stripEl = document.getElementById('week-strip');
    daysEl = document.getElementById('week-days');

    modalEl = document.getElementById('event-modal');
    formEl = document.getElementById('event-form');
    titleEl = document.getElementById('event-title');
    dateEl = document.getElementById('event-date');
    timeEl = document.getElementById('event-time');
    tagOptionsEl = document.getElementById('tag-options');
    modalTitleEl = document.getElementById('event-modal-title');
    deleteBtn = document.getElementById('event-delete');

    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-7));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(7));
    document.getElementById('this-week').addEventListener('click', goToThisWeek);

    document.getElementById('add-event').addEventListener('click', () => openDialog(null));

    // Tapping a day in the strip scrolls down to that day's card.
    stripEl.addEventListener('click', handleStripClick);

    // Tapping an event opens it in the dialog.
    daysEl.addEventListener('click', handleEventClick);

    // ---- Dialog buttons ----
    formEl.addEventListener('submit', saveEvent);
    document.getElementById('event-cancel').addEventListener('click', closeDialog);
    deleteBtn.addEventListener('click', deleteEvent);

    // Tap the dark area behind the dialog (or the Escape key) to close it.
    modalEl.querySelector('[data-close-modal]').addEventListener('click', closeDialog);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modalEl.hidden) closeDialog();
    });

    // Tag chips: pick one, unpick the others.
    tagOptionsEl.addEventListener('click', (event) => {
      const chip = event.target.closest('.tag-chip');
      if (chip) setTag(chip.dataset.tag);
    });

    render();
  }

  /* ---- Moving between weeks ---- */
  function changeWeek(days) {
    weekStart = Dates.addDays(weekStart, days);
    render();
  }

  function goToThisWeek() {
    weekStart = Dates.startOfWeek(Dates.today());
    render();
  }

  /* ---- Drawing the week ---- */
  function render() {
    const today = Dates.today();
    const data = Store.load();
    const days = Array.from({ length: 7 }, (_, i) => Dates.addDays(weekStart, i));

    rangeEl.textContent = Dates.formatWeekRange(weekStart);

    // Buttons to move a week at a time, drawn in one go.
    stripEl.innerHTML = days.map((dayKey) => {
      const dayEvents = eventsOn(data.events, dayKey);
      // Up to three little coloured dots show there is something on that day.
      const dots = dayEvents.slice(0, 3)
        .map((item) => `<span class="strip-dot tag-${escapeHTML(item.tag)}"></span>`)
        .join('');

      return `
        <button class="strip-day ${dayKey === today ? 'is-today' : ''}" type="button"
                data-day="${dayKey}" aria-label="${escapeHTML(Dates.formatDayShort(dayKey))}">
          <span class="strip-name">${escapeHTML(Dates.weekdayShort(dayKey))}</span>
          <span class="strip-num">${Dates.parse(dayKey).getDate()}</span>
          <span class="strip-dots">${dots}</span>
        </button>`;
    }).join('');

    // One card per day, with that day's events underneath.
    daysEl.innerHTML = days.map((dayKey) => {
      const dayEvents = eventsOn(data.events, dayKey);
      const rows = dayEvents.length
        ? dayEvents.map(eventChipHTML).join('')
        : '<p class="day-none">Nothing planned</p>';

      return `
        <section class="week-day ${dayKey === today ? 'is-today' : ''}" id="day-${dayKey}">
          <div class="day-head">
            <h3 class="day-name">${escapeHTML(Dates.formatDayShort(dayKey))}</h3>
            ${dayKey === today ? '<span class="day-badge">Today</span>' : ''}
          </div>
          ${rows}
        </section>`;
    }).join('');
  }

  // Every event on one day, earliest first; events without a time go last.
  function eventsOn(events, dayKey) {
    return events
      .filter((item) => item.date === dayKey)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  }

  function eventChipHTML(item) {
    const time = Dates.formatTime(item.time) || 'All day';
    return `
      <button class="event-chip tag-${escapeHTML(item.tag)}" type="button" data-id="${escapeHTML(item.id)}">
        <span class="event-time">${escapeHTML(time)}</span>
        <span class="event-title">${escapeHTML(item.title)}</span>
      </button>`;
  }

  function handleStripClick(event) {
    const day = event.target.closest('[data-day]');
    if (!day) return;
    const card = document.getElementById('day-' + day.dataset.day);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleEventClick(event) {
    const chip = event.target.closest('[data-id]');
    if (chip) openDialog(chip.dataset.id);
  }

  /* ---- Add / edit dialog ---- */
  function openDialog(id) {
    const data = Store.load();
    editingId = id;

    if (id) {
      // Editing: fill the form with the saved details.
      const item = data.events.find((entry) => entry.id === id);
      if (!item) return;
      modalTitleEl.textContent = 'Edit event';
      titleEl.value = item.title;
      dateEl.value = item.date;
      timeEl.value = item.time || '';
      setTag(item.tag);
      deleteBtn.hidden = false;
    } else {
      // Adding: start with today (or the Monday shown, if viewing another week).
      const today = Dates.today();
      const shownDays = Array.from({ length: 7 }, (_, i) => Dates.addDays(weekStart, i));
      modalTitleEl.textContent = 'New event';
      formEl.reset();
      titleEl.value = '';
      dateEl.value = shownDays.includes(today) ? today : weekStart;
      timeEl.value = '';
      setTag('home');
      deleteBtn.hidden = true;
    }

    modalEl.hidden = false;
    document.body.classList.add('modal-open');
    titleEl.focus(); // put the cursor straight in the title box
  }

  function closeDialog() {
    modalEl.hidden = true;
    document.body.classList.remove('modal-open');
    editingId = null;
  }

  function setTag(tag) {
    selectedTag = TAG_LABELS[tag] ? tag : 'home';
    tagOptionsEl.querySelectorAll('.tag-chip').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.tag === selectedTag));
    });
  }

  function saveEvent(event) {
    event.preventDefault(); // stop the browser reloading the page

    const title = titleEl.value.trim();
    if (!title) return; // the browser marks the box as required for us

    const data = Store.load();
    const wasEditing = Boolean(editingId);
    const details = {
      title: title,
      date: dateEl.value,
      time: timeEl.value || '', // times are optional
      tag: selectedTag,
    };

    if (editingId) {
      const item = data.events.find((entry) => entry.id === editingId);
      if (item) Object.assign(item, details);
    } else {
      data.events.push(Object.assign({ id: Store.makeId() }, details));
    }

    Store.save(data);

    // Jump to the day that was saved, so the new event is on screen.
    weekStart = Dates.startOfWeek(details.date);
    closeDialog();
    render();
    App.showToast(wasEditing ? 'Event updated' : 'Event added');
  }

  function deleteEvent() {
    const data = Store.load();
    const index = data.events.findIndex((entry) => entry.id === editingId);
    if (index === -1) return;

    // Keep a copy so Undo can put it back.
    const removed = data.events.splice(index, 1)[0];
    Store.save(data);

    closeDialog();
    render();

    App.showToast('Deleted “' + removed.title + '”', 'Undo', () => {
      const restored = Store.load();
      restored.events.push(removed);
      Store.save(restored);
      render();
    });
  }

  return { init, render };
})();
