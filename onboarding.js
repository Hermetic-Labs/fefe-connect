const config = window.FEFE_CONFIG || {};
const form = document.querySelector("#membership-form");
const steps = [...document.querySelectorAll(".form-step")];
const stepNumber = document.querySelector("[data-step-number]");
const stepTitle = document.querySelector("[data-step-title]");
const progress = [...document.querySelectorAll(".progress span")];
const roleInputs = [...document.querySelectorAll('input[name="role"]')];
const successPanel = document.querySelector(".success-panel");
const organizationLabel = document.querySelector("[data-organization-label]");
const licenseLabel = document.querySelector("[data-license-label]");

let currentStep = 1;

const titles = {
  1: "Choose your membership",
  2: "Confirm your standing",
  3: "Shape your profile",
};

function selectedRole() {
  return roleInputs.find((input) => input.checked)?.value || "legal";
}

function updateRoleCopy() {
  const isLegal = selectedRole() === "legal";
  organizationLabel.textContent = isLegal ? "Firm or organization" : "Practice or organization";
  licenseLabel.textContent = isLegal ? "Bar admission or registration number" : "Professional license number";
}

function showStep(nextStep, shouldScroll = true) {
  currentStep = nextStep;
  steps.forEach((step) => {
    const active = Number(step.dataset.step) === currentStep;
    step.hidden = !active;
    step.classList.toggle("is-active", active);
  });
  stepNumber.textContent = String(currentStep);
  stepTitle.textContent = titles[currentStep];
  progress.forEach((bar, index) => bar.classList.toggle("is-complete", index < currentStep));
  if (shouldScroll) {
    document.querySelector(".application-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function fieldsAreValid(step) {
  const fields = [...step.querySelectorAll("input[required], select[required], textarea[required]")];
  let valid = true;
  fields.forEach((field) => {
    const fieldValid = field.checkValidity();
    field.setAttribute("aria-invalid", String(!fieldValid));
    if (!fieldValid && valid) field.focus();
    valid = valid && fieldValid;
  });
  return valid;
}

const requestedRole = new URLSearchParams(window.location.search).get("role");
const initialRole = requestedRole === "mental-health" ? "mental-health" : "legal";
const initialInput = roleInputs.find((input) => input.value === initialRole);
if (initialInput) initialInput.checked = true;
updateRoleCopy();
showStep(1, false);

roleInputs.forEach((input) => input.addEventListener("change", updateRoleCopy));

document.querySelector("[data-checkout]").addEventListener("click", () => {
  const role = selectedRole();
  const checkoutUrl = role === "legal" ? config.stripeCheckout?.legal : config.stripeCheckout?.mentalHealth;
  if (checkoutUrl) {
    window.location.assign(checkoutUrl);
    return;
  }
  showStep(2);
});

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => {
    const activeStep = steps.find((step) => Number(step.dataset.step) === currentStep);
    if (fieldsAreValid(activeStep)) showStep(Math.min(3, currentStep + 1));
  });
});

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showStep(Math.max(1, currentStep - 1)));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const activeStep = steps.find((step) => Number(step.dataset.step) === currentStep);
  if (!fieldsAreValid(activeStep)) return;
  form.hidden = true;
  document.querySelector(".application-head").hidden = true;
  successPanel.hidden = false;
  successPanel.focus();
});
