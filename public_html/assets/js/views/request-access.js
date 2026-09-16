/**
 * Request Access / Password Recovery Controller (Frontend View Layer)
 * Aligned with Login Screen: identical floating language toggle & visual design.
 */
import { getCurrentLanguage, setLanguage, t, applyTheme, getCurrentTheme } from '../core/i18n.js';
import { api } from '../core/api.js';

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getCurrentTheme());
  initLoginLangToggle();
  applyTranslations();

  // Listen for language toggle event
  window.addEventListener('languageChanged', () => {
    initLoginLangToggle();
    applyTranslations();
  });

  const form = document.getElementById('requestAccessForm');
  const emailInput = document.getElementById('requestEmailInput');
  const submitBtn = document.getElementById('btnSubmitRequest');
  const alertBox = document.getElementById('requestAlert');
  const alertMsg = document.getElementById('requestAlertMsg');

  function initLoginLangToggle() {
    const langContainer = document.getElementById('requestLangToggle');
    if (!langContainer) return;
    const currentLang = getCurrentLanguage();

    langContainer.innerHTML = `
      <button type="button" class="pill-toggle-btn ${currentLang === 'pt' ? 'active' : ''}" data-lang="pt" title="Português">
        <span>PT</span>
      </button>
      <button type="button" class="pill-toggle-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en" title="English">
        <span>EN</span>
      </button>
    `;

    langContainer.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (lang !== currentLang) {
          setLanguage(lang);
        }
      });
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    if (!email) {
      emailInput.focus();
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alertBox.style.display = 'flex';
      alertBox.className = 'pill-alert-box danger';
      alertMsg.textContent = t('invalidEmailFormat') || 'Por favor, introduza um endereço de email válido.';
      emailInput.focus();
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    alertBox.style.display = 'none';

    try {
      // Call backend endpoint if available
      await api.post('forgot-password', { email });
    } catch (err) {
      console.warn('Forgot password request processed with agnostic response:', err);
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;

      // Always show agnostic fixed security message to prevent user enumeration
      alertBox.style.display = 'flex';
      alertBox.className = 'pill-alert-box';
      alertBox.style.backgroundColor = 'rgba(6, 169, 119, 0.25)';
      alertBox.style.borderColor = 'rgba(6, 169, 119, 0.45)';
      alertBox.style.color = '#A7F3D0';
      alertMsg.textContent = t('requestSentSuccess');
      form.reset();
    }
  });
});

function applyTranslations() {
  const lblInfoTitle = document.getElementById('lblInfoTitle');
  const lblInfoSubtitle = document.getElementById('lblInfoSubtitle');
  const lblRecoveryBadge = document.getElementById('lblRecoveryBadge');
  const lblForgotTitle = document.getElementById('lblForgotTitle');
  const lblForgotSubtitle = document.getElementById('lblForgotSubtitle');
  const requestEmailInput = document.getElementById('requestEmailInput');
  const btnSubmitRequestText = document.getElementById('btnSubmitRequestText');
  const lblBackToLoginText = document.getElementById('lblBackToLoginText');

  if (lblInfoTitle) {
    lblInfoTitle.innerHTML = `
      ${t('loginTitle')} <span class="accent-fl">Combustível</span> & <span class="accent-bt">Logística</span>
    `;
  }
  if (lblInfoSubtitle) lblInfoSubtitle.textContent = t('loginSubtitle');
  if (lblRecoveryBadge) lblRecoveryBadge.textContent = t('supportPrompt') || 'Apoio ao Utilizador';
  if (lblForgotTitle) lblForgotTitle.textContent = t('forgotPasswordTitle');
  if (lblForgotSubtitle) lblForgotSubtitle.textContent = t('forgotPasswordSubtitle');
  if (requestEmailInput) requestEmailInput.placeholder = t('emailPlaceholder') || 'Email institucional';
  if (btnSubmitRequestText) btnSubmitRequestText.textContent = t('sendRequest');
  if (lblBackToLoginText) lblBackToLoginText.textContent = t('backToLogin');
}
