/**
 * Request Access / Password Recovery Controller (Frontend View Layer)
 */
import { initHeaderControls, t, applyTheme, getCurrentTheme } from '../core/i18n.js';
import { api } from '../core/api.js';

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getCurrentTheme());
  initHeaderControls('headerControls');
  applyTranslations();

  const form = document.getElementById('requestAccessForm');
  const emailInput = document.getElementById('requestEmailInput');
  const submitBtn = document.getElementById('btnSubmitRequest');
  const alertBox = document.getElementById('requestAlert');
  const alertMsg = document.getElementById('requestAlertMsg');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    if (!email) {
      emailInput.focus();
      return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      // Call backend API /api/forgot-password
      await api.post('forgot-password', { email });
    } catch (err) {
      console.warn('Forgot password request processed with agnostic response:', err);
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;

      // Always show agnostic fixed security message to prevent user enumeration
      alertBox.style.display = 'flex';
      alertBox.className = 'login-alert-box success';
      alertMsg.textContent = t('requestSentSuccess');
      form.reset();
    }
  });
});

function applyTranslations() {
  const lblLoginTitle = document.getElementById('lblLoginTitle');
  const lblLoginSubtitle = document.getElementById('lblLoginSubtitle');
  const lblForgotTitle = document.getElementById('lblForgotTitle');
  const lblForgotSubtitle = document.getElementById('lblForgotSubtitle');
  const btnSubmitRequestText = document.getElementById('btnSubmitRequestText');
  const lblBackToLogin = document.getElementById('lblBackToLogin');

  if (lblLoginTitle) lblLoginTitle.textContent = t('loginTitle');
  if (lblLoginSubtitle) lblLoginSubtitle.textContent = t('loginSubtitle');
  if (lblForgotTitle) lblForgotTitle.textContent = t('forgotPasswordTitle');
  if (lblForgotSubtitle) lblForgotSubtitle.textContent = t('forgotPasswordSubtitle');
  if (btnSubmitRequestText) btnSubmitRequestText.textContent = t('sendRequest');
  if (lblBackToLogin) {
    lblBackToLogin.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      ${t('backToLogin')}
    `;
  }
}
