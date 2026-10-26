/* shopping.js — the Shopping tab: quick-add items, tap to tick off,
 * swipe left to delete, and a "Clear ticked" button.
 */

const ShoppingTab = (() => {
  let formEl, inputEl, listEl, emptyEl, hintEl, countEl, clearBtn;

  // Swipe settings, in pixels.
  const SWIPE_MAX = 110;      // how far a row can slide
  const SWIPE_DELETE = 64;    // slide past this, let go, and the item is deleted

  let drag = null;            // the swipe in progress, or null
  let lastSwipeAt = 0;        // when the last swipe ended

  function init() {
    formEl = document.getElementById('shop-form');
    inputEl = document.getElementById('shop-input');
    listEl = document.getElementById('shop-list');
    emptyEl = document.getElementById('shop-empty');
    hintEl = document.getElementById('shop-hint');
    countEl = document.getElementById('shop-count');
    clearBtn = document.getElementById('clear-ticked');

    formEl.addEventListener('submit', addItem);
    clearBtn.addEventListener('click', clearTicked);
    listEl.addEventListener('click', handleClick);

    // Swipe gestures use "pointer" events, which cover finger, pen and mouse.
    listEl.addEventListener('pointerdown', startSwipe);
    listEl.addEventListener('pointermove', moveSwipe);
    listEl.addEventListener('pointerup', endSwipe);
    listEl.addEventListener('pointercancel', cancelSwipe);

    render();
  }

  /* ---- Adding ---- */
  function addItem(event) {
    event.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    const data = Store.load();
    data.shopping.push({
      id: Store.makeId(),
      text: text,
      done: false,
      createdAt: Date.now(),
    });
    Store.save(data);

    inputEl.value = '';
    inputEl.focus();
    render();
  }

  /* ---- Ticking off ---- */
  function toggleItem(id) {
    const data = Store.load();
    const item = data.shopping.find((entry) => entry.id === id);
    if (!item) return;

    item.done = !item.done;
    Store.save(data);
    render();
  }

  /* ---- Deleting (with an Undo) ---- */
  function deleteItem(id) {
    const data = Store.load();
    const index = data.shopping.findIndex((entry) => entry.id === id);
    if (index === -1) return;

    // Remember where it was so Undo puts it back in the same place.
    const removed = data.shopping.splice(index, 1)[0];
    Store.save(data);
    render();

    App.showToast('Removed “' + removed.text + '”', 'Undo', () => {
      const restored = Store.load();
      restored.shopping.splice(index, 0, removed);
      Store.save(restored);
      render();
    });
  }

  /* ---- Clear ticked ---- */
  function clearTicked() {
    const data = Store.load();
    const ticked = data.shopping.filter((entry) => entry.done);

    if (ticked.length === 0) {
      App.showToast('Nothing ticked yet');
      return;
    }

    data.shopping = data.shopping.filter((entry) => !entry.done);
    Store.save(data);
    render();

    App.showToast(
      ticked.length === 1 ? 'Cleared 1 ticked item' : 'Cleared ' + ticked.length + ' ticked items',
      'Undo',
      () => {
        // Put the ticked items back at the end of the list.
        const restored = Store.load();
        restored.shopping = restored.shopping.concat(ticked);
        Store.save(restored);
        render();
      }
    );
  }

  /* ---- Drawing the list ---- */
  function render() {
    const data = Store.load();
    const items = data.shopping;
    const remaining = items.filter((item) => !item.done).length;

    countEl.textContent = remaining;
    emptyEl.hidden = items.length > 0;
    hintEl.hidden = items.length === 0;
    clearBtn.disabled = remaining === items.length; // nothing ticked yet
    listEl.innerHTML = items.map(rowHTML).join('');
  }

  function rowHTML(item) {
    return `
      <li class="swipe-row" data-id="${escapeHTML(item.id)}">
        <div class="swipe-back" aria-hidden="true">Delete</div>
        <div class="swipe-front row ${item.done ? 'is-done' : ''}">
          <button class="row-main" type="button" data-action="toggle" aria-pressed="${item.done}">
            <span class="tick" aria-hidden="true"></span>
            <span class="row-text">${escapeHTML(item.text)}</span>
          </button>
          <button class="row-delete" type="button" data-action="delete"
                  aria-label="Delete ${escapeHTML(item.text)}">✕</button>
        </div>
      </li>`;
  }

  /* ---- Taps ---- */
  function handleClick(event) {
    // A swipe also produces a click event; ignore it so we don't tick the item.
    if (Date.now() - lastSwipeAt < 300) return;

    const button = event.target.closest('[data-action]');
    if (!button) return;

    const row = button.closest('[data-id]');
    if (!row) return;

    if (button.dataset.action === 'toggle') toggleItem(row.dataset.id);
    if (button.dataset.action === 'delete') deleteItem(row.dataset.id);
  }

  /* ---- Swipe to delete ----
   * How it works:
   *   pointerdown - remember where the finger started
   *   pointermove - if the finger moves mostly sideways, slide the row left
   *   pointerup   - if the row was dragged far enough, delete the item;
   *                 otherwise spring back into place
   */
  function startSwipe(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return; // left click only

    const front = event.target.closest('.swipe-front');
    if (!front) return;
    if (event.target.closest('.row-delete')) return; // let the ✕ be a normal tap

    drag = {
      front: front,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: 0,
      sideways: false, // have we decided this is a swipe rather than a scroll?
    };
  }

  function moveSwipe(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    // Until the finger has moved a little, don't decide anything.
    if (!drag.sideways) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      if (Math.abs(dy) > Math.abs(dx)) {
        drag = null; // they are scrolling the page, not swiping a row
        return;
      }

      drag.sideways = true;
      drag.front.classList.add('is-dragging');
      // Keep receiving moves even if the finger leaves the row.
      try {
        drag.front.setPointerCapture(drag.pointerId);
      } catch (err) {
        // Some browsers refuse capture; the swipe still works without it.
      }
    }

    // Only allow leftwards movement, up to SWIPE_MAX.
    drag.offset = Math.max(-SWIPE_MAX, Math.min(0, dx));
    drag.front.style.transform = 'translateX(' + drag.offset + 'px)';
  }

  function endSwipe(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const { front, offset, sideways } = drag;
    const row = front.closest('[data-id]');
    drag = null;

    if (!sideways) return; // a plain tap: the click handler deals with it

    lastSwipeAt = Date.now();
    front.classList.remove('is-dragging');

    if (offset <= -SWIPE_DELETE && row) {
      deleteItem(row.dataset.id);
    } else {
      front.style.transform = ''; // not far enough - slide back
    }
  }

  function cancelSwipe() {
    if (!drag) return;
    drag.front.classList.remove('is-dragging');
    drag.front.style.transform = '';
    drag = null;
  }

  return { init, render };
})();
