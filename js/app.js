/* app.js — starts the app and handles the things every tab shares:
 * switching tabs, the date in the header, and the little toast message.
 */

const App = (() => {
  let toastTimer = null;      // hides the toast after a few seconds
  let toastActionFn = null;   // what to run if "Undo" is tapped
  let currentDay = Dates.today(); // used to notice when the date changes

  /* Show a short message at the bottom of the screen.
   * Optional: pass a button label and a function to run when it is tapped.
   * e.g. App.showToast('Item deleted', 'Undo', () => restoreItem())
   */
  function showToast(message, actionLabel, action) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastAction = document.getElementById('toast-action');

    toastMsg.textContent = message;
    toastActionFn = action || null;

    if (actionLabel && action) {
      toastAction.textContent = actionLabel;
      toastAction.hidden = false;
    } else {
      toastAction.hidden = true;
    }

    toast.hidden = false;

    // Restart the hide timer each time a new message arrives.
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3200);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toastActionFn = null;
    document.getElementById('toast').hidden = true;
  }

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((tab) => {
      const isActive = tab.dataset.tab === name;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    document.querySelectorAll('.panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === name);
    });

    // Always start a freshly opened tab at the top of the page.
    window.scrollTo(0, 0);
  }

  function renderHeaderDate() {
    document.getElementById('header-date').textContent = Dates.formatHeader(Dates.today());
  }

  /* ---- Rolling over to a new day ----
   * Unfinished tasks are carried forward in today.js. This checks whether the
   * date has changed while the app is open, and when it comes back to the
   * foreground (phones pause timers in the background).
   */
  function checkForNewDay() {
    const today = Dates.today();
    if (today === currentDay) return; // still the same day

    currentDay = today;
    renderHeaderDate();

    const carried = TodayTab.carryOver();
    TodayTab.render();
    CalendarTab.render(); // moves the "today" highlight if the week changed

    if (carried > 0) {
      showToast(carried === 1
        ? '1 unfinished task carried over'
        : carried + ' unfinished tasks carried over');
    }
  }

  function boot() {
    // Bottom tab buttons
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Toast "Undo" button
    document.getElementById('toast-action').addEventListener('click', () => {
      const action = toastActionFn;
      hideToast();
      if (action) action();
    });

    // Start the tabs
    TodayTab.init();
    ShoppingTab.init();
    CalendarTab.init();

    // Anything left over from an earlier day joins today's list on opening.
    const carried = TodayTab.carryOver();
    TodayTab.render();

    switchTab('today');
    renderHeaderDate();

    if (carried > 0) {
      showToast(carried === 1
        ? '1 task carried over from before'
        : carried + ' tasks carried over from before');
    }

    setInterval(checkForNewDay, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkForNewDay();
    });
  }

  // This script is at the end of <body>, so the page above is already loaded.
  boot();

  return { showToast, hideToast, switchTab, renderHeaderDate, checkForNewDay };
})();
