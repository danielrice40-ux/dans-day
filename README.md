# Dan's Day

A small, fast day planner that lives on your phone's home screen. Three tabs, no accounts,
no sign-up, no internet required: **Today**, **Shopping**, and **Calendar**.

Everything you type is saved in your browser's `localStorage` on that one device. Nothing is
uploaded anywhere, and there is no backend or API to configure.

Built with plain HTML, CSS and JavaScript — no frameworks, no build step, no dependencies —
so you can open the files and read exactly what the app does.

## What it does

### Today
- Type in the box at the top and press Enter to add a task.
- Tap a task to tick it off. It gets struck through and drops into the **Done** section.
- Every open task has a **→ Tomorrow** button.
- Unfinished tasks carry over automatically: open the app the next day and yesterday's
  leftovers are waiting at the top of today's list.

### Shopping
- Quick-add items at the top.
- Tap an item to tick it off.
- **Swipe left** on an item to delete it (there's an Undo button in the toast), or tap the **✕**.
- **Clear ticked** removes everything you've ticked in one go.

### Calendar
- A Monday-to-Sunday week view with **‹** and **›** buttons to move a week at a time.
- Tap a day in the week strip to jump to that day's events.
- Add events with a title, date, time and a colour tag: **Kids**, **Work**, **Home**, **Projects**.
- Tap an event to edit or delete it.

## Install it on your phone

A PWA needs to be served over **HTTPS** (or `localhost`) for the browser to offer installation.
The easiest option for a GitHub repo is GitHub Pages:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select the `main`
   branch and the `/ (root)` folder. Save.
4. Wait a minute, then open `https://<your-username>.github.io/dans-day/` on your phone.

Then add it to your home screen:

- **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** (or **Install app**).
- **iPhone (Safari):** tap the **Share** button → **Add to Home Screen** → **Add**.
  (iOS only offers this in Safari, not in other browsers.)

It then opens full-screen with no address bar, and works offline once it has loaded once.

### Testing locally

The app is static, so any static file server works:

```bash
# from this folder, pick whichever you have
npx serve .
# or
php -S localhost:8000
```

Then open <http://localhost:8000>. Opening `index.html` directly from disk also works, except
that service workers (and therefore offline caching) are disabled on `file://` URLs.

## Files

```
index.html       The whole app: three tab panels plus the event and toast dialogs
css/styles.css   Dark theme, colours, layout and the swipe animation
js/storage.js    Saving and loading, plus small date helpers
js/today.js      Today tab
js/shopping.js   Shopping tab
js/calendar.js   Calendar tab
js/app.js        Boots the app: tabs, midnight rollover, service worker
manifest.json    PWA metadata: name, icons, standalone display
sw.js            Service worker that caches the app for offline use
icons/           Home-screen icons (generated, no external assets)
```

The JavaScript files are loaded in the order above and each one adds a single global object
(`Store`, `Dates`, `TodayTab`, `ShoppingTab`, `CalendarTab`) that the next file uses.

## Your data

- Everything is stored under one `localStorage` key: `dansDay.v1`.
- Clearing your browser's site data (or uninstalling the PWA) erases it — there is no cloud copy.
- To reset the app, open the browser console on the app's page and run
  `localStorage.removeItem('dansDay.v1')`, then reload.

## Notes

- No secrets, API keys or environment variables are needed or committed.
- Dates are handled in your device's local time zone, so "today" matches your actual day.
- After changing any app file, bump `CACHE_VERSION` at the top of `sw.js` (e.g. `v1` → `v2`).
  The service worker serves the cached copy first, so without a new version number phones would
  keep seeing the old files.
