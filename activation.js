const activationConfig = window.FEFE_CONFIG || {};
const activationParams = new URLSearchParams(window.location.search);
const applicationId = activationParams.get("application") || "";
const checkoutResult = activationParams.get("checkout");
const previewApproved = applicationId === "preview" && activationParams.get("status") === "approved";
const apiBase = (activationConfig.applicationApiBase || "").replace(/\/$/, "");

const approvedState = document.querySelector("[data-approved-state]");
const ineligibleState = document.querySelector("[data-ineligible-state]");
const processingState = document.querySelector("[data-processing-state]");
const authState = document.querySelector("[data-auth-state]");
const signInButton = document.querySelector("[data-sign-in-button]");
const authMessage = document.querySelector("[data-auth-message]");
const previewBanner = document.querySelector("[data-preview-banner]");
const activationForm = document.querySelector("#activation-form");
const planInputs = [...document.querySelectorAll('input[name="plan"]')];
const billingDisclosure = document.querySelector("[data-billing-disclosure]");
const checkoutButton = document.querySelector("[data-checkout-button]");
const checkoutMessage = document.querySelector("[data-checkout-message]");
const billingVersion = document.querySelector('[name="billingDisclosureVersion"]');

document.querySelectorAll("[data-policy-version]").forEach((input) => {
  const configuredVersion = activationConfig.policyVersions?.[input.dataset.policyVersion];
  if (configuredVersion) input.value = configuredVersion;
});

function planDetails(planKey) {
  return activationConfig.billing?.plans?.[planKey] || {
    name: planKey === "organization_monthly" ? "Organization" : "Individual",
    amount: planKey === "organization_monthly" ? 79 : 29,
    currency: "USD",
    interval: "month",
  };
}

function selectedPlanKey() {
  return planInputs.find((input) => input.checked)?.value || "individual_monthly";
}

function updateBillingDisclosure() {
  const plan = planDetails(selectedPlanKey());
  billingDisclosure.textContent = `I authorize a recurring FEFE Connect ${plan.name} membership at $${plan.amount} ${plan.currency} per ${plan.interval} until canceled. Stripe Checkout will show the exact amount, taxes, and first charge date before I purchase.`;
}

function showOnly(state) {
  [approvedState, ineligibleState, processingState, authState].forEach((section) => {
    section.hidden = section !== state;
  });
  state.focus?.();
}

async function authorizationHeaders(interactive = false) {
  const token = await window.FEFE_AUTH?.getAccessToken?.({ interactive });
  if (!token) throw new Error("Sign in to continue.");
  return { Authorization: `Bearer ${token}` };
}

async function loadApplicationStatus() {
  previewBanner.hidden = Boolean(apiBase);
  if (checkoutResult === "success") {
    showOnly(processingState);
    return;
  }

  if (previewApproved && !apiBase) {
    previewBanner.innerHTML = "<strong>Checkout preview</strong> — Stripe Checkout will open here after member services are connected. No charge can occur in this preview.";
    showOnly(approvedState);
    return;
  }

  if (!apiBase || !applicationId) {
    showOnly(ineligibleState);
    return;
  }

  await window.FEFE_AUTH?.initialize?.();
  if (!window.FEFE_AUTH?.isConfigured?.() || !window.FEFE_AUTH?.getAccount?.()) {
    showOnly(authState);
    return;
  }

  try {
    const headers = { Accept: "application/json", ...(await authorizationHeaders()) };
    const response = await fetch(`${apiBase}/v1/applications/${encodeURIComponent(applicationId)}`, {
      method: "GET",
      headers,
      credentials: "omit",
    });
    if (!response.ok) throw new Error("Application status could not be confirmed.");
    const application = await response.json();
    const eligible = ["approved", "activation_pending"].includes(application.status);
    showOnly(eligible ? approvedState : ineligibleState);
  } catch (error) {
    if (/sign in/i.test(error?.message || "")) showOnly(authState);
    else showOnly(ineligibleState);
  }
}

function validStripeCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "checkout.stripe.com" || url.hostname.endsWith(".stripe.com"));
  } catch {
    return false;
  }
}

planInputs.forEach((input) => input.addEventListener("change", updateBillingDisclosure));
const requestedPlan = activationParams.get("plan");
const requestedPlanInput = planInputs.find((input) => input.value === requestedPlan);
if (requestedPlanInput) requestedPlanInput.checked = true;
updateBillingDisclosure();

signInButton.addEventListener("click", async () => {
  signInButton.disabled = true;
  signInButton.setAttribute("aria-busy", "true");
  authMessage.textContent = "Opening secure sign-in…";
  try {
    await window.FEFE_AUTH?.signIn?.();
    authMessage.textContent = "Sign-in confirmed. Checking your application…";
    await loadApplicationStatus();
  } catch (error) {
    authMessage.textContent = error.message || "Sign-in could not be completed. Please try again.";
  } finally {
    signInButton.disabled = false;
    signInButton.removeAttribute("aria-busy");
  }
});

activationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  checkoutMessage.textContent = "";

  if (!activationForm.checkValidity()) {
    activationForm.querySelector(":invalid")?.focus();
    return;
  }

  if (!apiBase || applicationId === "preview") {
    checkoutMessage.textContent = "Checkout is correctly gated and ready. Add the Azure API URL and server-side Stripe credentials to enable the redirect.";
    return;
  }

  checkoutButton.disabled = true;
  checkoutButton.setAttribute("aria-busy", "true");
  checkoutMessage.textContent = "Preparing secure Checkout…";

  try {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
      ...(await authorizationHeaders(true)),
    };
    const response = await fetch(`${apiBase}${activationConfig.billing.checkoutSessionPath}`, {
      method: "POST",
      headers,
      credentials: "omit",
      body: JSON.stringify({
        contract_version: "1.0.0",
        application_id: applicationId,
        plan_key: selectedPlanKey(),
        billing_disclosure_version: billingVersion.value,
        recurring_billing_accepted: true,
      }),
    });
    const result = await response.json();
    if (!response.ok || !validStripeCheckoutUrl(result.checkout_url)) {
      throw new Error(result.message || "Checkout could not be prepared.");
    }
    window.location.assign(result.checkout_url);
  } catch (error) {
    checkoutMessage.textContent = error.message || "Checkout could not be prepared. Please try again.";
    checkoutButton.disabled = false;
    checkoutButton.removeAttribute("aria-busy");
  }
});

loadApplicationStatus();
