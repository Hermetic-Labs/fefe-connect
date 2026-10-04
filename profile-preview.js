(() => {
  const config = window.FEFE_CONFIG || {};
  const apiBase = String(config.applicationApiBase || "").replace(/\/$/, "");
  const shell = document.querySelector("[data-preview-shell]");
  const loading = document.querySelector("[data-preview-loading]");
  const gate = document.querySelector("[data-preview-gate]");
  const errorPanel = document.querySelector("[data-preview-error]");
  const errorMessage = document.querySelector("[data-preview-error-message]");
  const content = document.querySelector("[data-preview-content]");
  const objectUrls = [];
  const show = (selected) => {
    [loading, gate, errorPanel, content].forEach((panel) => { if (panel) panel.hidden = panel !== selected; });
    shell?.setAttribute("aria-busy", String(selected === loading));
  };
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const fact = (term, value) => { const node = document.createElement("div"); node.append(el("dt", "", term), el("dd", "", value || "Not provided")); return node; };
  const readable = (value) => String(value || "").replaceAll("_", " ");
  const authHeaders = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra });
  const profileCard = (home) => (home.experience?.cards || []).find((card) => card.kind === "submitted_profile")?.data || {};

  const setAvatar = async (token, name, photoAvailable) => {
    document.querySelector("[data-preview-initials]").textContent = String(name || "FE").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "FE";
    if (!photoAvailable) return;
    const response = await fetch(`${apiBase}/v1/me/profile/photo`, { headers: authHeaders(token), credentials: "omit" });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob()); objectUrls.push(url);
    const image = document.createElement("img"); image.src = url; image.alt = "";
    document.querySelector("[data-preview-avatar]").replaceChildren(image);
  };

  const mediaNode = async (item, token) => {
    const response = await fetch(`${apiBase}${item.content_url}`, { headers: authHeaders(token), credentials: "omit" });
    const figure = el("figure", "preview-media");
    if (!response.ok) { figure.append(el("span", "", "Preview unavailable")); return figure; }
    const url = URL.createObjectURL(await response.blob()); objectUrls.push(url);
    if (item.media_kind === "video") { const video = document.createElement("video"); video.src = url; video.controls = true; video.preload = "metadata"; figure.append(video); }
    else { const image = document.createElement("img"); image.src = url; image.alt = "Profile highlight"; figure.append(image); }
    return figure;
  };

  const render = async (home, profile, mediaBody, token) => {
    const submitted = profileCard(home);
    const name = profile.display_name || "Professional member";
    document.querySelector("[data-preview-name]").textContent = name;
    document.querySelector("[data-preview-headline]").textContent = profile.headline || submitted.headline || "FEFE Connect professional";
    document.querySelector("[data-preview-profession]").textContent = profile.professional_type === "legal" ? "Legal professional" : "Mental-health professional";
    document.querySelector("[data-preview-availability]").textContent = readable(profile.availability || "limited availability");
    document.querySelector("[data-preview-about]").textContent = profile.about || "No introduction added yet.";
    document.querySelector("[data-preview-history]").textContent = profile.professional_history || "No professional history added yet.";
    document.querySelector("[data-preview-training]").textContent = profile.education_training || "No education or training details added yet.";
    document.querySelector("[data-preview-collaboration]").textContent = profile.collaboration_interests || "No collaboration interests added yet.";
    const credentials = document.querySelector("[data-preview-credentials]");
    credentials.replaceChildren(
      fact("Organization", submitted.organization), fact("Primary jurisdiction", submitted.jurisdiction),
      fact(submitted.credential_label || "Credential", submitted.masked_identifier), fact("Standing shown", "Submitted — review pending"),
    );
    const focus = document.querySelector("[data-preview-focus]");
    const specialties = submitted.specialties || [];
    focus.replaceChildren(...(specialties.length ? specialties.map((value) => el("li", "", value)) : [el("li", "", "No focus areas added yet") ]));
    const modes = document.querySelector("[data-preview-modes]");
    modes.replaceChildren(...(profile.collaboration_modes || []).map((value) => el("li", "", readable(value))));
    const note = document.querySelector("[data-preview-note]"); note.textContent = profile.professional_note || ""; note.hidden = !profile.professional_note;
    await setAvatar(token, name, profile.photo?.available);
    const carousel = (mediaBody.media || []).filter((item) => item.placement === "carousel");
    const highlights = (mediaBody.media || []).filter((item) => item.placement === "highlights");
    if (carousel.length) { document.querySelector("[data-preview-carousel-section]").hidden = false; document.querySelector("[data-preview-carousel]").replaceChildren(...await Promise.all(carousel.map((item) => mediaNode(item, token)))); }
    if (highlights.length) { document.querySelector("[data-preview-highlights-section]").hidden = false; document.querySelector("[data-preview-highlights]").replaceChildren(...await Promise.all(highlights.map((item) => mediaNode(item, token)))); }
    show(content);
  };

  const load = async () => {
    show(loading);
    try {
      await window.FEFE_AUTH.initialize();
      if (!window.FEFE_AUTH.getAccount()) { show(gate); return; }
      const token = await window.FEFE_AUTH.getAccessToken({ interactive: false });
      if (!token) { show(gate); return; }
      const [homeResponse, profileResponse, mediaResponse] = await Promise.all([
        fetch(`${apiBase}/v1/me/home`, { headers: authHeaders(token, { Accept: "application/json" }), credentials: "omit" }),
        fetch(`${apiBase}/v1/me/profile`, { headers: authHeaders(token, { Accept: "application/json" }), credentials: "omit" }),
        fetch(`${apiBase}/v1/me/profile/media`, { headers: authHeaders(token, { Accept: "application/json" }), credentials: "omit" }),
      ]);
      const [home, profileBody, media] = await Promise.all([homeResponse.json(), profileResponse.json(), mediaResponse.json()]);
      if (!homeResponse.ok || !profileResponse.ok || !mediaResponse.ok) throw new Error(profileBody.message || media.message || home.message || "Your preview could not be loaded.");
      await render(home, profileBody.profile, media, token);
    } catch (error) { errorMessage.textContent = error?.message || "Your preview could not be loaded."; show(errorPanel); }
  };
  document.querySelector("[data-preview-sign-in]")?.addEventListener("click", async () => { await window.FEFE_AUTH?.signIn?.(); await load(); });
  window.addEventListener("fefe-auth-changed", load);
  window.addEventListener("beforeunload", () => objectUrls.forEach((url) => URL.revokeObjectURL(url)));
  void load();
})();
