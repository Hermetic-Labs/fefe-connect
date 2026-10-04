(() => {
  const header = document.querySelector('header');
  if (!header) return;
  const apiBase = String(window.FEFE_CONFIG?.applicationApiBase || '').replace(/\/$/, '');

  const bar = document.createElement('section');
  bar.className = 'account-bar';
  bar.setAttribute('aria-label', 'Your FEFE account');
  bar.innerHTML = '<p class="account-status" role="status" aria-live="polite">Checking sign-in…</p><div class="account-actions"><a class="account-home" href="my-fefe.html" hidden>My FEFE</a><button class="account-action" type="button" disabled>Sign in</button></div>';
  header.insertAdjacentElement('afterend', bar);
  const status = bar.querySelector('.account-status');
  const homeLink = bar.querySelector('.account-home');
  const button = bar.querySelector('.account-action');
  let busy = false;
  let profileName = '';
  let profilePhotoUrl = '';
  let loadedAccountKey = '';

  function initials(value) {
    return String(value || 'FE').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'FE';
  }

  function clearProfileIdentity() {
    if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
    profileName = '';
    profilePhotoUrl = '';
    loadedAccountKey = '';
  }

  function render() {
    const account = window.FEFE_AUTH?.getAccount();
    status.replaceChildren();
    if (account) {
      const fallbackName = account.name || account.username || 'FEFE member';
      const name = profileName || fallbackName;
      const avatar = document.createElement('span');
      avatar.className = 'account-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      if (profilePhotoUrl) {
        const image = document.createElement('img');
        image.src = profilePhotoUrl;
        image.alt = '';
        avatar.append(image);
      } else {
        avatar.textContent = initials(name);
      }
      const label = document.createElement('span');
      label.className = 'account-identity';
      label.append('Signed in as ');
      const identity = document.createElement('strong');
      identity.textContent = name;
      label.append(identity);
      status.append(avatar, label);
    } else {
      status.textContent = 'Not signed in';
    }
    homeLink.hidden = !account;
    button.textContent = account ? 'Sign out' : 'Sign in';
    button.disabled = busy || !window.FEFE_AUTH?.isConfigured();
  }

  async function loadProfileIdentity() {
    const account = window.FEFE_AUTH?.getAccount();
    if (!account || !apiBase) return;
    const accountKey = account.homeAccountId || account.localAccountId || account.username || 'signed-in';
    if (loadedAccountKey === accountKey) return;
    loadedAccountKey = accountKey;
    try {
      const token = await window.FEFE_AUTH.getAccessToken({ interactive: false });
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      const response = await fetch(`${apiBase}/v1/me/profile`, { headers, credentials: 'omit' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return;
      profileName = String(body.profile?.display_name || '').trim();
      if (body.profile?.photo?.available) {
        const photoResponse = await fetch(`${apiBase}/v1/me/profile/photo`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'image/jpeg,image/png,image/webp' },
          credentials: 'omit',
        });
        if (photoResponse.ok) profilePhotoUrl = URL.createObjectURL(await photoResponse.blob());
      }
      render();
    } catch {
      // The account strip keeps the identity-provider display name when the private profile is unavailable.
    }
  }

  async function ready() {
    if (!window.FEFE_AUTH) return;
    try {
      await window.FEFE_AUTH.initialize();
      render();
      await loadProfileIdentity();
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
      if (signingOut) {
        await window.FEFE_AUTH.signOut();
        clearProfileIdentity();
      } else {
        await window.FEFE_AUTH.signIn();
      }
      render();
      if (!signingOut) await loadProfileIdentity();
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
  window.addEventListener('fefe-auth-changed', () => {
    if (!window.FEFE_AUTH?.getAccount()) clearProfileIdentity();
    render();
    void loadProfileIdentity();
  });
  window.addEventListener('pageshow', ready);
  void ready();
})();
