(() => {
  const apiBase = String(window.FEFE_CONFIG?.applicationApiBase || '').replace(/\/$/, '');
  const loading = document.querySelector('[data-review-loading]');
  const denied = document.querySelector('[data-review-denied]');
  const content = document.querySelector('[data-review-content]');
  const list = document.querySelector('[data-review-list]');
  const count = document.querySelector('[data-review-count]');
  const status = document.querySelector('[data-review-status]');
  let token = '';
  const show = (node) => [loading, denied, content].forEach((item) => { item.hidden = item !== node; });
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const format = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  const card = (post) => {
    const article = el('article', 'review-card');
    article.append(el('p', 'board-card-meta', `${post.professional_type.replace('-', ' ')} · ${post.request_type.replaceAll('_', ' ')}`), el('h3', '', post.title), el('p', 'board-card-copy', post.summary));
    const facts = el('div', 'board-card-details');
    facts.append(el('span', '', post.audience.replace('-', ' ')), el('span', '', post.jurisdiction || 'Any jurisdiction'), el('span', '', post.location_mode.replace('_', ' ')), el('span', '', `Respond by ${format(post.response_by)}`)); article.append(facts);
    const note = document.createElement('textarea'); note.rows = 3; note.maxLength = 500; note.placeholder = 'Required when declining; optional approval note'; note.setAttribute('aria-label', `Reviewer note for ${post.title}`);
    const actions = el('div', 'review-actions'); const approve = el('button', 'member-primary', 'Approve'); const decline = el('button', 'member-secondary', 'Decline'); approve.type = decline.type = 'button';
    const decide = async (decision) => { if (decision === 'decline' && note.value.trim().length < 10) { status.textContent = 'Add a short reason before declining.'; status.dataset.tone = 'error'; return; } approve.disabled = decline.disabled = true; status.textContent = `Recording ${decision} decision…`; try { const response = await fetch(`${apiBase}/v1/reviewer/collaboration-posts/${post.post_id}/decision`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ decision, note: note.value }), credentials: 'omit' }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'The decision could not be recorded.'); status.textContent = 'Decision recorded with reviewer audit metadata.'; status.dataset.tone = 'success'; await loadQueue(); } catch (error) { status.textContent = error?.message || 'The decision could not be recorded.'; status.dataset.tone = 'error'; approve.disabled = decline.disabled = false; } };
    approve.addEventListener('click', () => decide('approve')); decline.addEventListener('click', () => decide('decline')); actions.append(approve, decline); article.append(note, actions); return article;
  };
  async function loadQueue() { const response = await fetch(`${apiBase}/v1/reviewer/collaboration-posts`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, credentials: 'omit' }); if (response.status === 403) { show(denied); return; } const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'The reviewer queue could not be loaded.'); const queue = body.queue || []; count.textContent = `${queue.length} pending`; list.replaceChildren(...(queue.length ? queue.map(card) : [el('div', 'board-empty', 'No collaboration requests are waiting for review.') ])); show(content); }
  async function start() { show(loading); try { await window.FEFE_AUTH.initialize(); if (!window.FEFE_AUTH.getAccount()) { show(denied); return; } token = await window.FEFE_AUTH.getAccessToken({ interactive: false }); if (!token) { show(denied); return; } await loadQueue(); } catch (error) { status.textContent = error?.message || 'The reviewer queue could not be loaded.'; show(content); } }
  window.addEventListener('fefe-auth-changed', start); void start();
})();
