(() => {
  const header = document.querySelector('header');
  if (!header) return;

  const bar = document.createElement('section');
  bar.className = 'account-bar';
  bar.setAttribute('aria-label', 'Your FEFE account');
  bar.innerHTML = '<p class="account-status" role="status" aria-live="polite">Checking sign-in…</p><div class="account-actions"><a class="account-home" href="my-fefe.html" hidden>My FEFE</a><button class="account-action" type="button" disabled>Sign in</button></div>';
  header.insertAdjacentElement('afterend', bar);
  const status = bar.querySelector('.account-status');
  const homeLink = bar.querySelector('.account-home');
  const button = bar.querySelector('.account-action');
  let busy = false;

  function render() {
    const account = window.FEFE_AUTH?.getAccount();
    status.replaceChildren();
    if (account) {
      status.append('Signed in as ');
      const identity = document.createElement('strong');
      const email = account.username || '';
      const name = account.name || email || 'FEFE account';
      identity.textContent = name;
      status.append(identity);
      if (email && email !== name) {
        const detail = document.createElement('span');
        detail.className = 'account-email';
        detail.textContent = email;
        status.append(detail);
      }
    } else {
      status.textContent = 'Not signed in';
    }
    homeLink.hidden = !account;
    button.textContent = account ? 'Sign out' : 'Sign in';
    button.disabled = busy || !window.FEFE_AUTH?.isConfigured();
  }

  async function ready() {
    if (!window.FEFE_AUTH) return;
    try {
      await window.FEFE_AUTH.initialize();
      render();
    } catch {
      status.textContent = 'Sign-in could not be checked. Please try again.';
      button.disabled = false;
    }
  }

  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    const signingOut = Boolean(window.FEFE_AUTH?.getAccount());
    status.textContent = signingOut ? 'Signing out…' : 'Opening secure sign-in…';
    try {
      if (signingOut) await window.FEFE_AUTH.signOut();
      else await window.FEFE_AUTH.signIn();
      render();
    } catch {
      render();
      const error = document.createElement('span');
      error.className = 'account-error';
      error.textContent = signingOut ? 'Sign-out did not complete. Please try again.' : 'Sign-in did not complete. Please try again.';
      status.append(error);
    } finally {
      busy = false;
      button.disabled = !window.FEFE_AUTH?.isConfigured();
      button.removeAttribute('aria-busy');
    }
  });

  window.addEventListener('fefe-auth-ready', ready);
  window.addEventListener('fefe-auth-changed', render);
  window.addEventListener('pageshow', ready);
  void ready();
})();
