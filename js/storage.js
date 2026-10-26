/* storage.js — saving and loading the app's data, plus small date helpers.
 *
 * Everything lives under ONE localStorage key, so the app never touches any
 * other data in the browser. Each tab loads the data it needs, changes it,
 * and saves it again. See Store.load() / Store.save().
 */

const Store = (() => {
  const KEY = 'dansDay.v1';

  // A brand-new, empty app. Also used to fill in anything missing from older saves.
  function emptyData() {
    return {
      tasks: [],      // { id, text, date: 'YYYY-MM-DD', done, createdAt }
      shopping: [],   // { id, text, done, createdAt }
      events: [],     // { id, title, date: 'YYYY-MM-DD', time: 'HH:MM' | '', tag }
      lastOpened: Dates.today(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyData();

      const saved = JSON.parse(raw);
      const data = emptyData();

      // Copy across only the fields we recognise and expect to be arrays.
      if (Array.isArray(saved.tasks)) data.tasks = saved.tasks;
      if (Array.isArray(saved.shopping)) data.shopping = saved.shopping;
      if (Array.isArray(saved.events)) data.events = saved.events;
      if (typeof saved.lastOpened === 'string') data.lastOpened = saved.lastOpened;

      return data;
    } catch (err) {
      // Corrupt or blocked storage: start fresh rather than crash.
      console.warn('Could not read saved data, starting fresh.', err);
      return emptyData();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      data.lastOpened = Dates.today();
      return true;
    } catch (err) {
      // Private browsing or a full disk can block writes.
      console.warn('Could not save data.', err);
      if (window.App) App.showToast('Could not save — storage is blocked or full');
      return false;
    }
  }

  // A short, unique-enough id for a new task / item / event.
  function makeId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  return { load, save, makeId };
})();


/* Dates — all dates are handled as plain 'YYYY-MM-DD' strings in the device's
 * LOCAL time zone. (Using toISOString() would shift the date for anyone not on
 * UTC, which is why the parts are formatted by hand.)
 */
const Dates = (() => {
  const pad = (n) => String(n).padStart(2, '0');

  function key(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function today() {
    return key(new Date());
  }

  // 'YYYY-MM-DD' -> Date at local midnight.
  function parse(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(dateKey, days) {
    const date = parse(dateKey);
    date.setDate(date.getDate() + days);
    return key(date);
  }

  // Monday of the week that contains dateKey. JS weeks start on Sunday (0),
  // so Sunday is treated as "6 days after Monday".
  function startOfWeek(dateKey) {
    const date = parse(dateKey);
    const weekday = date.getDay();
    const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
    date.setDate(date.getDate() - daysSinceMonday);
    return key(date);
  }

  const shortDate = (dateKey, options) =>
    parse(dateKey).toLocaleDateString(undefined, options);

  function weekdayShort(dateKey) {
    return shortDate(dateKey, { weekday: 'short' });
  }

  // "Sunday 26 October"
  function formatHeader(dateKey) {
    return shortDate(dateKey, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // "Mon 27" — used on calendar day headings.
  function formatDayShort(dateKey) {
    return shortDate(dateKey, { weekday: 'short', day: 'numeric' });
  }

  // "27 Oct – 2 Nov 2026"
  function formatWeekRange(startKey) {
    const endKey = addDays(startKey, 6);
    const start = parse(startKey);
    const end = parse(endKey);
    const month = (date) => date.toLocaleDateString(undefined, { month: 'short' });
    const sameMonth = start.getMonth() === end.getMonth();

    // Same month: "26 – 31 Oct 2026". Two months: "26 Oct – 1 Nov 2026".
    const left = sameMonth ? start.getDate() : start.getDate() + ' ' + month(start);
    const right = end.getDate() + ' ' + month(end);
    return left + ' – ' + right + ' ' + end.getFullYear();
  }

  // "14:30" -> "2:30 pm". Returns '' when no time was set.
  function formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const suffix = hours < 12 ? 'am' : 'pm';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return hour12 + ':' + pad(minutes) + ' ' + suffix;
  }

  return {
    key, today, parse, addDays, startOfWeek,
    weekdayShort, formatHeader, formatDayShort, formatWeekRange, formatTime,
  };
})();


/* escapeHTML — turns user text into safe HTML before it is put in a template.
 * Without this, a task called "<b>hi" would be treated as HTML by the browser. */
function escapeHTML(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
