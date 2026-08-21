const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector("nav");
const explainerButton = document.querySelector(".explainer-player");
const explainerAudio = document.querySelector("#explainer-audio");

const formatAudioTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

if (explainerButton && explainerAudio) {
  const icon = explainerButton.querySelector("[data-player-icon]");
  const title = explainerButton.querySelector("[data-player-title]");
  const status = explainerButton.querySelector("[data-player-status]");

  const updateProgress = () => {
    const progress = explainerAudio.duration
      ? `${(explainerAudio.currentTime / explainerAudio.duration) * 100}%`
      : "0%";
    explainerButton.style.setProperty("--audio-progress", progress);
  };

  const showPausedState = () => {
    explainerButton.classList.remove("is-playing");
    explainerButton.setAttribute("aria-pressed", "false");
    explainerButton.setAttribute("aria-label", "Play the Fe-Fe Connect audio explainer");
    if (icon) icon.textContent = "▶";
    if (title) title.textContent = explainerAudio.currentTime ? "Resume the Fe-Fe Connect explainer" : "Play the Fe-Fe Connect explainer";
    if (status) {
      status.textContent = explainerAudio.currentTime
        ? `Paused at ${formatAudioTime(explainerAudio.currentTime)} of ${formatAudioTime(explainerAudio.duration)}`
        : `${formatAudioTime(explainerAudio.duration || 226)} total`;
    }
    updateProgress();
  };

  explainerButton.addEventListener("click", async () => {
    if (explainerAudio.paused) {
      try {
        await explainerAudio.play();
      } catch {
        if (status) status.textContent = "Audio could not start. Please try again.";
      }
    } else {
      explainerAudio.pause();
    }
  });

  explainerAudio.addEventListener("play", () => {
    explainerButton.classList.add("is-playing");
    explainerButton.setAttribute("aria-pressed", "true");
    explainerButton.setAttribute("aria-label", "Pause the Fe-Fe Connect audio explainer");
    if (icon) icon.textContent = "Ⅱ";
    if (title) title.textContent = "Playing the Fe-Fe Connect explainer";
  });

  explainerAudio.addEventListener("pause", showPausedState);
  explainerAudio.addEventListener("ended", () => {
    explainerAudio.currentTime = 0;
    showPausedState();
  });
  explainerAudio.addEventListener("loadedmetadata", showPausedState);
  explainerAudio.addEventListener("timeupdate", () => {
    if (status && !explainerAudio.paused) {
      status.textContent = `${formatAudioTime(explainerAudio.currentTime)} of ${formatAudioTime(explainerAudio.duration)}`;
    }
    updateProgress();
  });
}

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    navigation.classList.toggle("is-open", !isOpen);
  });
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
