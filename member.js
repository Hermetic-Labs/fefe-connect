(() => {
  const config = window.FEFE_CONFIG || {};
  const apiBase = String(config.applicationApiBase || "").replace(/\/$/, "");
  const shell = document.querySelector("[data-member-shell]");
  const loading = document.querySelector("[data-member-loading]");
  const gate = document.querySelector("[data-member-gate]");
  const errorPanel = document.querySelector("[data-member-error]");
  const errorMessage = document.querySelector("[data-member-error-message]");
  const content = document.querySelector("[data-member-content]");
  const signInButton = document.querySelector("[data-member-sign-in]");
  const retryButton = document.querySelector("[data-member-retry]");
  const statusHero = document.querySelector("[data-member-status-hero]");
  const statusLabel = document.querySelector("[data-member-status-label]");
  const headline = document.querySelector("[data-member-headline]");
  const summary = document.querySelector("[data-member-summary]");
  const primaryAction = document.querySelector("[data-member-primary-action]");
  const updated = document.querySelector("[data-member-updated]");
  const cards = document.querySelector("[data-member-cards]");
  const profileStudio = document.querySelector("[data-profile-studio]");
  const profileForm = document.querySelector("[data-profile-form]");
  const profileSave = document.querySelector("[data-profile-save]");
  const profileStatus = document.querySelector("[data-profile-status]");
  const profilePhoto = document.querySelector("[data-profile-photo]");
  const profileInitials = document.querySelector("[data-profile-initials]");
  const profilePhotoInput = document.querySelector("[data-profile-photo-input]");
  const profileFileName = document.querySelector("[data-profile-file-name]");
  const profileMediaInput = document.querySelector("[data-profile-media-input]");
  const profileMediaPlacement = document.querySelector("[data-profile-media-placement]");
  const profileMediaUpload = document.querySelector("[data-profile-media-upload]");
  const profileMediaFile = document.querySelector("[data-profile-media-file]");
  const profileMediaList = document.querySelector("[data-profile-media-list]");
  const profileMediaCount = document.querySelector("[data-profile-media-count]");
  const profileMediaStatus = document.querySelector("[data-profile-media-status]");
  const boardStudio = document.querySelector("[data-board-studio]");
  const boardList = document.querySelector("[data-board-list]");
  const boardMine = document.querySelector("[data-board-mine]");
  const boardCount = document.querySelector("[data-board-count]");
  const boardForm = document.querySelector("[data-board-form]");
  const boardSubmit = document.querySelector("[data-board-submit]");
  const boardStatus = document.querySelector("[data-board-status]");
  const boardSummaryCount = document.querySelector("[data-board-summary-count]");
  const reviewerLink = document.querySelector("[data-reviewer-link]");
  let selectedPhoto = null;
  let selectedProfileMedia = null;
  let photoObjectUrl = "";
  const mediaObjectUrls = [];

  const panels = [loading, gate, errorPanel, content];
  const show = (selected) => {
    panels.forEach((panel) => { if (panel) panel.hidden = panel !== selected; });
    shell?.setAttribute("aria-busy", String(selected === loading));
  };

  const readableStatus = (value) => String(value || "").replaceAll("_", " ");
  const formatDate = (value, includeTime = false) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "Not available";
    return new Intl.DateTimeFormat(undefined, includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" }).format(date);
  };

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const validTarget = (target) => {
    if (typeof target !== "string") return false;
    return target.startsWith("/") || target.startsWith("mailto:hello@fefeconnect.com");
  };

  const appendActions = (parent, actions = []) => {
    const safeActions = actions.filter((action) => validTarget(action.target));
    if (!safeActions.length) return;
    const wrap = element("div", "member-card-actions");
    safeActions.forEach((action) => {
      const link = element("a", "member-card-action", action.label);
      link.href = action.target;
      wrap.append(link);
    });
    parent.append(wrap);
  };

  const fact = (term, description) => {
    const wrap = document.createElement("div");
    wrap.append(element("dt", "", term), element("dd", "", description || "Not provided"));
    return wrap;
  };

  const cardFrame = (card) => {
    const article = element("article", "member-card");
    article.id = card.card_id;
    article.dataset.state = card.state;
    const header = element("header", "member-card-header");
    const copy = document.createElement("div");
    copy.append(element("h3", "", card.title), element("p", "", card.summary));
    header.append(copy, element("span", "member-card-state", readableStatus(card.state)));
    article.append(header);
    return article;
  };

  const disclosure = (label, open = false) => {
    const details = document.createElement("details");
    details.open = open;
    details.append(element("summary", "", label));
    const body = element("div", "member-card-content");
    details.append(body);
    return { details, body };
  };

  const renderApplication = (card) => {
    const article = cardFrame(card);
    const { details, body } = disclosure("View application status", true);
    const facts = element("dl", "member-facts");
    facts.append(
      fact("Path", card.data?.professional_type === "legal" ? "Legal professional" : card.data?.professional_type === "mental-health" ? "Mental-health professional" : "Not selected"),
      fact("Status", readableStatus(card.data?.status)),
      fact("Submitted", formatDate(card.data?.submitted_at)),
      fact("Last updated", formatDate(card.data?.updated_at, true)),
    );
    body.append(facts);
    appendActions(body, card.actions);
    article.append(details);
    return article;
  };

  const renderProfile = (card) => {
    const article = cardFrame(card);
    const { details, body } = disclosure("View submitted information");
    const data = card.data || {};
    const facts = element("dl", "member-facts");
    facts.append(
      fact("Headline", data.headline),
      fact("Organization", data.organization),
      fact("Primary jurisdiction", data.jurisdiction),
      fact(data.credential_label || "Credential", data.masked_identifier),
      fact("Profile visibility", data.publication_state === "published" ? "Published" : "Private — not published"),
      fact("Website", data.website),
    );
    body.append(facts);
    if (data.bio) body.append(element("p", "member-profile-copy", data.bio));
    if (Array.isArray(data.specialties) && data.specialties.length) {
      const list = element("ul", "member-specialties");
      data.specialties.forEach((specialty) => list.append(element("li", "", specialty)));
      body.append(list);
    }
    appendActions(body, card.actions);
    article.append(details);
    return article;
  };

  const renderNextSteps = (card) => {
    const article = cardFrame(card);
    const { details, body } = disclosure("See each stage", true);
    const list = element("ol", "member-steps");
    (card.data?.items || []).forEach((item) => {
      const row = element("li", "member-step");
      row.dataset.stepState = item.state;
      row.append(element("strong", "", item.label), element("p", "", item.description));
      list.append(row);
    });
    body.append(list);
    appendActions(body, card.actions);
    article.append(details);
    return article;
  };

  const renderSupport = (card) => {
    const article = cardFrame(card);
    const { details, body } = disclosure("Correction and privacy guidance");
    body.append(element("p", "member-privacy-note", card.data?.privacy_reminder || "Do not send client, patient, case, privileged, or clinical information."));
    appendActions(body, card.actions);
    article.append(details);
    return article;
  };

  const renderRecordSummary = (card) => {
    const article = cardFrame(card);
    const { details, body } = disclosure("View available record summaries");
    const groups = card.kind === "legal_record_summary"
      ? [card.data?.bar_admissions || [], [card.data?.firm_entity, card.data?.firm_affiliation].filter(Boolean)]
      : [card.data?.licenses || [], [card.data?.npi_corroboration, card.data?.practice_entity, card.data?.practice_affiliation].filter(Boolean)];
    const claims = groups.flat();
    if (!claims.length) body.append(element("p", "member-privacy-note", "No independent professional-record result is available yet."));
    claims.forEach((claim) => {
      const facts = element("dl", "member-facts");
      facts.append(
        fact("Claim", claim.label),
        fact("Status", readableStatus(claim.status)),
        fact("Authority", claim.authority),
        fact("Checked", formatDate(claim.checked_at)),
      );
      body.append(facts);
    });
    appendActions(body, card.actions);
    article.append(details);
    return article;
  };

  const renderCard = (card) => {
    switch (card.kind) {
      case "application_status": return renderApplication(card);
      case "submitted_profile": return renderProfile(card);
      case "next_steps": return renderNextSteps(card);
      case "support": return renderSupport(card);
      case "legal_record_summary":
      case "mental_health_record_summary": return renderRecordSummary(card);
      default: return null;
    }
  };

  const render = (response) => {
    const experience = response.experience;
    statusHero.dataset.tone = experience.primary_status?.tone || "neutral";
    statusLabel.textContent = experience.primary_status?.label || "My FEFE";
    headline.textContent = experience.headline;
    summary.textContent = experience.summary;
    const action = experience.primary_action;
    if (action && validTarget(action.target)) {
      primaryAction.hidden = false;
      primaryAction.href = action.target;
      primaryAction.textContent = action.label;
    } else {
      primaryAction.hidden = true;
      primaryAction.removeAttribute("href");
    }
    updated.textContent = `Record checked ${formatDate(response.generated_at, true)}`;
    cards.replaceChildren();
    (experience.cards || []).forEach((card) => {
      const rendered = renderCard(card);
      if (rendered) cards.append(rendered);
    });
    show(content);
  };

  const profileField = (name) => profileForm?.elements.namedItem(name);
  const countField = (name) => {
    const field = profileField(name);
    const counter = document.querySelector(`[data-count-for="${name}"]`);
    if (field && counter) counter.textContent = String(field.value.length);
  };
  const updateInitials = () => {
    const value = String(profileField("display_name")?.value || "FE").trim();
    const initials = value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    profileInitials.textContent = initials || "FE";
  };
  const setPhoto = (url) => {
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    photoObjectUrl = url;
    profilePhoto.src = url;
    profilePhoto.hidden = false;
    profileInitials.hidden = true;
  };
  const showProfileMessage = (message, tone = "neutral") => {
    profileStatus.textContent = message;
    profileStatus.dataset.tone = tone;
  };
  const authHeaders = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra });

  const populateProfile = (profile) => {
    profileField("display_name").value = profile.display_name || "";
    profileField("headline").value = profile.headline || "";
    profileField("about").value = profile.about || "";
    profileField("professional_history").value = profile.professional_history || "";
    profileField("education_training").value = profile.education_training || "";
    profileField("collaboration_interests").value = profile.collaboration_interests || "";
    profileField("professional_note").value = profile.professional_note || "";
    profileField("availability").value = profile.availability || "limited";
    const selectedModes = new Set(profile.collaboration_modes || []);
    profileForm.querySelectorAll('input[name="collaboration_modes"]').forEach((checkbox) => {
      checkbox.checked = selectedModes.has(checkbox.value);
    });
    ["headline", "about", "professional_history", "education_training", "collaboration_interests", "professional_note"].forEach(countField);
    updateInitials();
  };

  const mediaCard = async (item, token) => {
    const article = element("article", "profile-media-card");
    const frame = element("div", "profile-media-frame");
    const response = await fetch(`${apiBase}${item.content_url}`, { headers: authHeaders(token), credentials: "omit" });
    if (response.ok) {
      const url = URL.createObjectURL(await response.blob());
      mediaObjectUrls.push(url);
      if (item.media_kind === "video") {
        const video = document.createElement("video");
        video.src = url; video.controls = true; video.preload = "metadata";
        frame.append(video);
      } else {
        const image = document.createElement("img");
        image.src = url; image.alt = "Private profile media preview";
        frame.append(image);
      }
    } else {
      frame.append(element("span", "", "Preview unavailable"));
    }
    const copy = element("div", "profile-media-card-copy");
    copy.append(element("strong", "", item.placement === "carousel" ? "Top carousel" : "Highlights"), element("span", "", `${item.media_kind} · private draft`));
    const remove = element("button", "profile-media-remove", "Remove");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm("Remove this item from the private profile draft?")) return;
      remove.disabled = true;
      const response = await fetch(`${apiBase}${item.content_url}`, { method: "DELETE", headers: authHeaders(token, { Accept: "application/json" }), credentials: "omit" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { profileMediaStatus.textContent = body.message || "The media item could not be removed."; profileMediaStatus.dataset.tone = "error"; remove.disabled = false; return; }
      profileMediaStatus.textContent = "Removed from the private draft."; profileMediaStatus.dataset.tone = "success";
      await loadProfileMedia(token);
    });
    copy.append(remove);
    article.append(frame, copy);
    return article;
  };

  const loadProfileMedia = async (token) => {
    const response = await fetch(`${apiBase}/v1/me/profile/media`, { headers: authHeaders(token, { Accept: "application/json" }), credentials: "omit" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Profile media could not be loaded.");
    mediaObjectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
    const media = body.media || [];
    profileMediaCount.textContent = `${media.length} of ${body.maximum_items || 5}`;
    profileMediaList.replaceChildren();
    if (!media.length) {
      profileMediaList.append(element("p", "profile-media-empty", "No carousel or highlight media yet."));
    } else {
      profileMediaList.append(...await Promise.all(media.map((item) => mediaCard(item, token))));
    }
    profileMediaUpload.disabled = !selectedProfileMedia || media.length >= (body.maximum_items || 5);
  };

  const loadPrivatePhoto = async (token) => {
    const response = await fetch(`${apiBase}/v1/me/profile/photo`, {
      headers: authHeaders(token, { Accept: "image/jpeg,image/png,image/webp" }),
      credentials: "omit",
    });
    if (!response.ok) return;
    const blob = await response.blob();
    setPhoto(URL.createObjectURL(blob));
  };

  const loadProfile = async (token) => {
    profileStudio.hidden = false;
    profileForm.setAttribute("aria-busy", "true");
    showProfileMessage("Loading your private profile draft…");
    try {
      const response = await fetch(`${apiBase}/v1/me/profile`, {
        headers: authHeaders(token, { Accept: "application/json" }),
        credentials: "omit",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Your profile draft could not be loaded.");
      populateProfile(body.profile);
      showProfileMessage(body.profile.updated_at ? `Private draft ready · updated ${formatDate(body.profile.updated_at, true)}` : "Private draft ready.", "success");
      if (body.profile.photo?.available) void loadPrivatePhoto(token);
      await loadProfileMedia(token);
    } catch (error) {
      showProfileMessage(error?.message || "Your profile draft could not be loaded.", "error");
    } finally {
      profileForm.removeAttribute("aria-busy");
    }
  };

  const boardLabels = {
    professional_consultation: "Professional consultation",
    referral_partner: "Referral partner",
    education_training: "Education or training",
    policy_compliance: "Policy or compliance",
    resource_exchange: "Resource exchange",
    legal: "Legal professionals",
    "mental-health": "Mental-health professionals",
    either: "Either profession",
    virtual: "Virtual",
    in_person: "In person",
  };
  const boardCard = (post) => {
    const article = element("article", "board-card");
    const meta = element("p", "board-card-meta", `${boardLabels[post.request_type] || readableStatus(post.request_type)} · ${boardLabels[post.audience] || readableStatus(post.audience)}`);
    article.append(meta, element("h4", "", post.title), element("p", "board-card-copy", post.summary));
    const details = element("div", "board-card-details");
    details.append(
      element("span", "", post.jurisdiction || "Any jurisdiction"),
      element("span", "", boardLabels[post.location_mode] || readableStatus(post.location_mode)),
      element("span", "", `Respond by ${formatDate(post.response_by)}`),
    );
    if (post.mine) details.append(element("span", "board-own-marker", readableStatus(post.status)));
    article.append(details);
    return article;
  };
  const boardEmpty = (copy) => {
    const empty = element("div", "board-empty");
    empty.append(element("strong", "", "Nothing here yet."), element("p", "", copy));
    return empty;
  };
  const renderBoard = (body) => {
    const open = body.board || [];
    const mine = body.mine || [];
    boardCount.textContent = `${open.length} open`;
    boardList.replaceChildren(...(open.length ? open.map(boardCard) : [boardEmpty("Approved member requests will appear here. FEFE does not publish submissions before review.")]));
    boardMine.replaceChildren(...(mine.length ? mine.map(boardCard) : [boardEmpty("When you submit a request, its review status will appear here.")]));
    boardStudio.hidden = false;
  };
  const loadBoard = async (token) => {
    boardStudio.hidden = false;
    try {
      const response = await fetch(`${apiBase}/v1/me/collaboration-posts`, { headers: authHeaders(token, { Accept: "application/json" }), credentials: "omit" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "The collaboration board could not be loaded.");
      renderBoard(body);
      const reviewerResponse = await fetch(`${apiBase}/v1/reviewer/collaboration-posts`, { headers: authHeaders(token, { Accept: "application/json" }), credentials: "omit" });
      reviewerLink.hidden = !reviewerResponse.ok;
    } catch (error) {
      boardCount.textContent = "Unavailable";
      boardList.replaceChildren(boardEmpty(error?.message || "The collaboration board could not be loaded."));
      boardMine.replaceChildren();
    }
  };

  const configureBoardDates = () => {
    const field = boardForm?.elements.namedItem("response_by");
    if (!field) return;
    const date = new Date();
    const iso = (value) => value.toISOString().slice(0, 10);
    const tomorrow = new Date(date); tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = new Date(date); defaultDate.setDate(defaultDate.getDate() + 30);
    const maximum = new Date(date); maximum.setDate(maximum.getDate() + 90);
    field.min = iso(tomorrow);
    field.max = iso(maximum);
    field.value = iso(defaultDate);
  };

  const load = async () => {
    show(loading);
    if (!apiBase || !window.FEFE_AUTH?.isConfigured?.()) {
      errorMessage.textContent = "Member services are not configured on this site.";
      show(errorPanel);
      return;
    }
    try {
      await window.FEFE_AUTH.initialize();
      if (!window.FEFE_AUTH.getAccount()) {
        show(gate);
        return;
      }
      const token = await window.FEFE_AUTH.getAccessToken({ interactive: false });
      if (!token) {
        show(gate);
        return;
      }
      const response = await fetch(`${apiBase}/v1/me/home`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        credentials: "omit",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Your FEFE record could not be loaded.");
      render(body);
      if (body.experience?.professional_type) {
        await Promise.all([loadProfile(token), loadBoard(token)]);
      } else {
        profileStudio.hidden = true;
        boardStudio.hidden = true;
      }
    } catch (error) {
      errorMessage.textContent = error?.message || "Your FEFE record could not be loaded. Please try again.";
      show(errorPanel);
    }
  };

  signInButton?.addEventListener("click", async () => {
    signInButton.disabled = true;
    try {
      await window.FEFE_AUTH?.signIn?.();
      await load();
    } catch {
      errorMessage.textContent = "Sign-in did not complete. Please try again.";
      show(errorPanel);
    } finally {
      signInButton.disabled = false;
    }
  });

  profilePhotoInput?.addEventListener("change", () => {
    const file = profilePhotoInput.files?.[0];
    selectedPhoto = null;
    if (!file) {
      profileFileName.textContent = "No new photo selected";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 3 * 1024 * 1024) {
      profilePhotoInput.value = "";
      profileFileName.textContent = "Choose a JPEG, PNG, or WebP image up to 3 MB";
      showProfileMessage("That photo type or size is not supported.", "error");
      return;
    }
    selectedPhoto = file;
    profileFileName.textContent = file.name;
    setPhoto(URL.createObjectURL(file));
    showProfileMessage("Photo selected. Save the private draft to upload it.");
  });

  profileMediaInput?.addEventListener("change", () => {
    const file = profileMediaInput.files?.[0];
    selectedProfileMedia = null;
    profileMediaUpload.disabled = true;
    if (!file) { profileMediaFile.textContent = "No media selected"; return; }
    const images = ["image/jpeg", "image/png", "image/webp"];
    const videos = ["video/mp4", "video/webm"];
    const maximum = images.includes(file.type) ? 5 * 1024 * 1024 : videos.includes(file.type) ? 20 * 1024 * 1024 : 0;
    if (!maximum || file.size > maximum) {
      profileMediaInput.value = "";
      profileMediaFile.textContent = "Choose a supported image up to 5 MB or video up to 20 MB";
      profileMediaStatus.textContent = "That media type or size is not supported.";
      profileMediaStatus.dataset.tone = "error";
      return;
    }
    selectedProfileMedia = file;
    profileMediaFile.textContent = file.name;
    profileMediaUpload.disabled = false;
    profileMediaStatus.textContent = "Ready to add as a private draft.";
    profileMediaStatus.dataset.tone = "neutral";
  });

  profileMediaUpload?.addEventListener("click", async () => {
    if (!selectedProfileMedia) return;
    profileMediaUpload.disabled = true;
    profileMediaStatus.textContent = "Uploading private media…";
    profileMediaStatus.dataset.tone = "neutral";
    try {
      const token = await window.FEFE_AUTH?.getAccessToken?.({ interactive: false });
      if (!token) throw new Error("Your sign-in expired. Sign in again to continue.");
      const response = await fetch(`${apiBase}/v1/me/profile/media?placement=${encodeURIComponent(profileMediaPlacement.value)}`, {
        method: "POST",
        headers: authHeaders(token, { Accept: "application/json", "Content-Type": selectedProfileMedia.type }),
        body: selectedProfileMedia,
        credentials: "omit",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "The media item could not be uploaded.");
      selectedProfileMedia = null;
      profileMediaInput.value = "";
      profileMediaFile.textContent = "No media selected";
      profileMediaStatus.textContent = "Private draft added. Nothing was published.";
      profileMediaStatus.dataset.tone = "success";
      await loadProfileMedia(token);
    } catch (error) {
      profileMediaStatus.textContent = error?.message || "The media item could not be uploaded.";
      profileMediaStatus.dataset.tone = "error";
      profileMediaUpload.disabled = false;
    }
  });

  profileForm?.querySelectorAll("textarea, input[name='headline'], input[name='display_name']").forEach((field) => {
    field.addEventListener("input", () => {
      if (field.name !== "display_name") countField(field.name);
      updateInitials();
    });
  });

  profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!profileForm.reportValidity()) return;
    profileSave.disabled = true;
    profileForm.setAttribute("aria-busy", "true");
    showProfileMessage("Saving your private draft…");
    try {
      const token = await window.FEFE_AUTH?.getAccessToken?.({ interactive: false });
      if (!token) throw new Error("Your sign-in expired. Sign in again to save.");
      const payload = {
        display_name: profileField("display_name").value,
        headline: profileField("headline").value,
        about: profileField("about").value,
        professional_history: profileField("professional_history").value,
        education_training: profileField("education_training").value,
        collaboration_interests: profileField("collaboration_interests").value,
        professional_note: profileField("professional_note").value,
        availability: profileField("availability").value,
        collaboration_modes: [...profileForm.querySelectorAll('input[name="collaboration_modes"]:checked')].map((input) => input.value),
      };
      const response = await fetch(`${apiBase}/v1/me/profile`, {
        method: "PUT",
        headers: authHeaders(token, { Accept: "application/json", "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
        credentials: "omit",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Your private draft could not be saved.");
      let photoSaved = false;
      if (selectedPhoto) {
        const photoResponse = await fetch(`${apiBase}/v1/me/profile/photo`, {
          method: "PUT",
          headers: authHeaders(token, { Accept: "application/json", "Content-Type": selectedPhoto.type }),
          body: selectedPhoto,
          credentials: "omit",
        });
        const photoBody = await photoResponse.json().catch(() => ({}));
        if (!photoResponse.ok) throw new Error(`Your text was saved, but the photo was not: ${photoBody.message || "try a different image."}`);
        selectedPhoto = null;
        profilePhotoInput.value = "";
        profileFileName.textContent = "No new photo selected";
        photoSaved = true;
      }
      populateProfile(body.profile);
      showProfileMessage(photoSaved ? "Private profile and photo saved. Nothing was published." : "Private profile saved. Nothing was published.", "success");
    } catch (error) {
      showProfileMessage(error?.message || "Your private draft could not be saved.", "error");
    } finally {
      profileSave.disabled = false;
      profileForm.removeAttribute("aria-busy");
    }
  });

  boardForm?.elements.namedItem("summary")?.addEventListener("input", (event) => {
    boardSummaryCount.textContent = String(event.target.value.length);
  });

  boardForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!boardForm.reportValidity()) return;
    boardSubmit.disabled = true;
    boardStatus.textContent = "Sending your request for review…";
    boardStatus.dataset.tone = "neutral";
    try {
      const token = await window.FEFE_AUTH?.getAccessToken?.({ interactive: false });
      if (!token) throw new Error("Your sign-in expired. Sign in again to continue.");
      const field = (name) => boardForm.elements.namedItem(name);
      const response = await fetch(`${apiBase}/v1/me/collaboration-posts`, {
        method: "POST",
        headers: authHeaders(token, { Accept: "application/json", "Content-Type": "application/json" }),
        credentials: "omit",
        body: JSON.stringify({
          request_type: field("request_type").value,
          audience: field("audience").value,
          title: field("title").value,
          summary: field("summary").value,
          jurisdiction: field("jurisdiction").value,
          location_mode: field("location_mode").value,
          response_by: field("response_by").value,
          no_sensitive_information: field("no_sensitive_information").checked,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "The request could not be submitted.");
      boardForm.reset();
      configureBoardDates();
      boardSummaryCount.textContent = "0";
      boardStatus.textContent = "Request saved privately for review. It is not public.";
      boardStatus.dataset.tone = "success";
      await loadBoard(token);
    } catch (error) {
      boardStatus.textContent = error?.message || "The request could not be submitted.";
      boardStatus.dataset.tone = "error";
    } finally {
      boardSubmit.disabled = false;
    }
  });

  retryButton?.addEventListener("click", load);
  window.addEventListener("fefe-auth-changed", load);
  configureBoardDates();
  void load();
})();
