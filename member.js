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
  retryButton?.addEventListener("click", load);
  window.addEventListener("fefe-auth-changed", load);
  void load();
})();
