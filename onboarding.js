const config = window.FEFE_CONFIG || {};
const form = document.querySelector("#membership-form");
const steps = [...document.querySelectorAll(".form-step")];
const stepNumber = document.querySelector("[data-step-number]");
const stepTitle = document.querySelector("[data-step-title]");
const progress = [...document.querySelectorAll(".progress span")];
const roleInputs = [...document.querySelectorAll('input[name="role"]')];
const planInputs = [...document.querySelectorAll('input[name="plan"]')];
const successPanel = document.querySelector(".success-panel");
const organizationLabel = document.querySelector("[data-organization-label]");
const licenseLabel = document.querySelector("[data-license-label]");
const activationPreview = document.querySelector("[data-activation-preview]");
const serviceBanner = document.querySelector("[data-service-banner]");
const successCopy = document.querySelector("[data-success-copy]");
const apiBase = (config.applicationApiBase || "").replace(/\/$/, "");

let currentStep = 1;

function secureServicesConfigured() {
  return Boolean(apiBase && window.FEFE_AUTH?.isConfigured?.());
}

async function waitForAuth() {
  if (window.FEFE_AUTH) {
    await window.FEFE_AUTH.initialize?.();
    return;
  }
  await new Promise((resolve) => window.addEventListener("fefe-auth-ready", resolve, { once: true }));
}

function submissionPayload(formData) {
  const specialties = String(formData.get("specialties") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    contract_version: "1.0.0",
    professional_type: selectedRole(),
    plan_key: String(formData.get("plan") || "individual_monthly"),
    first_name: String(formData.get("firstName") || ""),
    last_name: String(formData.get("lastName") || ""),
    email: String(formData.get("email") || ""),
    organization: String(formData.get("organization") || ""),
    jurisdiction: String(formData.get("state") || ""),
    credential_number: String(formData.get("license") || ""),
    website: String(formData.get("website") || ""),
    headline: String(formData.get("headline") || ""),
    bio: String(formData.get("bio") || ""),
    specialties,
    endorsement: String(formData.get("endorsement") || ""),
    policy_versions: {
      terms: String(formData.get("termsVersion") || ""),
      privacy: String(formData.get("privacyVersion") || ""),
      intended_use: String(formData.get("intendedUseVersion") || ""),
      verification: String(formData.get("verificationVersion") || ""),
    },
    attestations: {
      accuracy: formData.get("attestAccuracy") === "on",
      terms: formData.get("acceptTerms") === "on",
      privacy: formData.get("acknowledgePrivacy") === "on",
      intended_use: formData.get("acceptIntendedUse") === "on",
      verification: formData.get("acknowledgeVerification") === "on",
    },
  };
}

async function submitSecureApplication() {
  await waitForAuth();
  const token = await window.FEFE_AUTH?.getAccessToken?.({ interactive: true });
  if (!token) throw new Error("Secure sign-in did not return an access token.");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const bootstrapResponse = await fetch(`${apiBase}/v1/account/bootstrap`, { method: "POST", headers });
  if (!bootstrapResponse.ok) {
    const problem = await bootstrapResponse.json().catch(() => ({}));
    throw new Error(problem.message || "Your member account could not be prepared.");
  }
  const applicationId = crypto.randomUUID();
  const response = await fetch(`${apiBase}/v1/applications/${applicationId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(submissionPayload(new FormData(form))),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "The application could not be submitted.");
  return result;
}

document.querySelectorAll("[data-policy-version]").forEach((input) => {
  const configuredVersion = config.policyVersions?.[input.dataset.policyVersion];
  if (configuredVersion) input.value = configuredVersion;
});

const titles = {
  1: "Choose your path",
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
const requestedPlan = new URLSearchParams(window.location.search).get("plan");
const initialPlan = planInputs.find((input) => input.value === requestedPlan);
if (initialPlan) initialPlan.checked = true;
updateRoleCopy();
showStep(1, false);

waitForAuth().then(() => {
  if (secureServicesConfigured() && serviceBanner) {
    serviceBanner.innerHTML = "<strong>Secure application</strong> — sign-in is required when you submit. Your application is stored privately for review, and no payment is collected during review.";
  }
}).catch(() => {});

roleInputs.forEach((input) => input.addEventListener("change", updateRoleCopy));

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => {
    const activeStep = steps.find((step) => Number(step.dataset.step) === currentStep);
    if (fieldsAreValid(activeStep)) showStep(Math.min(3, currentStep + 1));
  });
});

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showStep(Math.max(1, currentStep - 1)));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const activeStep = steps.find((step) => Number(step.dataset.step) === currentStep);
  if (!fieldsAreValid(activeStep)) return;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  const originalText = submitButton.innerHTML;
  submitButton.textContent = secureServicesConfigured() ? "Signing in and submitting…" : "Preparing preview…";
  try {
    if (secureServicesConfigured()) {
      const result = await submitSecureApplication();
      activationPreview.href = `activation.html?status=submitted&application=${encodeURIComponent(result.id)}`;
      activationPreview.innerHTML = "Track application status <span>→</span>";
      if (successCopy) successCopy.textContent = "Your application is stored privately for human review. No payment has been collected. If approved, FEFE will make membership activation available through Stripe Checkout.";
    } else {
      const selectedPlan = form.elements.plan?.value || "individual_monthly";
      const activationParams = new URLSearchParams({ status: "approved", application: "preview", role: selectedRole(), plan: selectedPlan });
      activationPreview.href = `activation.html?${activationParams.toString()}`;
    }
    form.hidden = true;
    document.querySelector(".application-head").hidden = true;
    successPanel.hidden = false;
    successPanel.focus();
  } catch (error) {
    if (serviceBanner) {
      serviceBanner.textContent = `Submission not completed — ${String(error?.message || "Please try again.")}`;
      serviceBanner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
});
