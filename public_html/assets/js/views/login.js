import { signIn, getSession, ROLE_PRESETS } from '../core/auth.js';
import { getCurrentLanguage, setLanguage, t } from '../core/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const alertBox = document.getElementById('loginAlert');
  const alertMessage = document.getElementById('alertMessage');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const welcomeLabel = document.querySelector('.welcome-label');
  const forgotLink = document.querySelector('.pill-forgot-link');
  const checkboxContainer = document.querySelector('.pill-checkbox-container');
  const supportLink = document.querySelector('.support-text a');

  // Initialize Language Toggle on Login
  initLoginLangToggle();
  applyLoginTranslations();

  function initLoginLangToggle() {
    const langContainer = document.getElementById('loginLangToggle');
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

  function applyLoginTranslations() {
    const currentLang = getCurrentLanguage();
    const lblInfoTitle = document.getElementById('lblInfoTitle');
    const lblInfoSubtitle = document.getElementById('lblInfoSubtitle');
    const lblWelcomeBack = document.getElementById('lblWelcomeBack');
    const lblSignInTitle = document.getElementById('lblSignInTitle');
    const lblSignInSubtitle = document.getElementById('lblSignInSubtitle');
    const lblAccessAs = document.getElementById('lblAccessAs');
    const lblRememberMe = document.getElementById('lblRememberMe');
    const lblForgotPass = document.getElementById('lblForgotPass');
    const btnSubmitText = document.getElementById('btnSubmitText');
    const lblSupportPrompt = document.getElementById('lblSupportPrompt');
    const lblContactSupport = document.getElementById('lblContactSupport');

    if (lblInfoTitle) {
      lblInfoTitle.innerHTML = currentLang === 'en'
        ? `Integrated Management of <span class="accent-fl">Fuel</span> & <span class="accent-bt">Logistics</span>`
        : `Gestão Integrada de <span class="accent-fl">Combustível</span> & <span class="accent-bt">Logística</span>`;
    }
    if (lblInfoSubtitle) lblInfoSubtitle.textContent = t('loginSubtitle');
    if (lblWelcomeBack) lblWelcomeBack.textContent = t('welcomeBack');
    if (lblSignInTitle) lblSignInTitle.textContent = t('signInTitle');
    if (lblSignInSubtitle) lblSignInSubtitle.textContent = t('signInSubtitle');
    if (lblAccessAs) lblAccessAs.textContent = t('accessAs');
    if (lblRememberMe) lblRememberMe.textContent = t('rememberMe');
    if (lblForgotPass) lblForgotPass.textContent = t('forgotPassword');
    if (btnSubmitText) btnSubmitText.textContent = t('signInBtn');
    if (lblSupportPrompt) lblSupportPrompt.textContent = t('supportPrompt');
    if (lblContactSupport) lblContactSupport.textContent = ` ${t('contactSupport')}`;

    if (emailInput) emailInput.placeholder = t('emailPlaceholder');
    if (passwordInput) passwordInput.placeholder = t('passwordPlaceholder');
  }

  // Check if session already exists
  try {
    const active = await getSession();
    if (active && active.session) {
      redirectToDashboard();
      return;
    }
  } catch (err) {
    console.warn('Session check failed:', err);
  }

  // Preset selector buttons (Quick Fill / Theme context switch)
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const preset = btn.dataset.preset;

      if (ROLE_PRESETS[preset]) {
        emailInput.value = ROLE_PRESETS[preset];
      }

      // Update dynamic company theme styles
      if (preset === 'bakers') {
        submitBtn.classList.add('theme-bakers');
        emailInput.classList.add('is-bakers');
        passwordInput.classList.add('is-bakers');
        emailInput.closest('.input-pill-wrapper').classList.add('is-bakers-group');
        passwordInput.closest('.input-pill-wrapper').classList.add('is-bakers-group');
        if (welcomeLabel) welcomeLabel.classList.add('bakers-active');
        if (forgotLink) forgotLink.classList.add('bakers-active');
        if (checkboxContainer) checkboxContainer.classList.add('bakers-active');
        if (supportLink) supportLink.classList.add('bakers-active');
      } else {
        submitBtn.classList.remove('theme-bakers');
        emailInput.classList.remove('is-bakers');
        passwordInput.classList.remove('is-bakers');
        emailInput.closest('.input-pill-wrapper').classList.remove('is-bakers-group');
        passwordInput.closest('.input-pill-wrapper').classList.remove('is-bakers-group');
        if (welcomeLabel) welcomeLabel.classList.remove('bakers-active');
        if (forgotLink) forgotLink.classList.remove('bakers-active');
        if (checkboxContainer) checkboxContainer.classList.remove('bakers-active');
        if (supportLink) supportLink.classList.remove('bakers-active');
      }

      passwordInput.focus();
      hideAlert();
    });
  });

  // Password visibility toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      
      togglePasswordBtn.innerHTML = isPassword
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ocultar palavra-passe' : 'Visualizar palavra-passe');
    });
  }

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      showAlert('Por favor, introduza o seu email institucional.');
      emailInput.focus();
      return;
    }

    if (!password) {
      showAlert('Por favor, introduza a sua palavra-passe.');
      passwordInput.focus();
      return;
    }

    setLoading(true);

    try {
      const { user, role } = await signIn(email, password);
      setLoading(false);
      btnText.textContent = 'Autenticado com sucesso!';
      
      setTimeout(() => {
        redirectToDashboard();
      }, 300);
    } catch (error) {
      setLoading(false);
      showAlert(formatErrorMessage(error.message));
    }
  });

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.classList.add('is-loading');
      btnText.textContent = 'A validar credenciais...';
    } else {
      submitBtn.classList.remove('is-loading');
      btnText.textContent = 'Iniciar Sessão';
    }
  }

  function showAlert(msg) {
    alertMessage.textContent = msg;
    alertBox.classList.add('danger');
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }

  function formatErrorMessage(msg) {
    if (!msg) return 'Ocorreu um erro ao tentar autenticar.';
    if (msg.includes('Invalid login credentials')) {
      return 'Email ou palavra-passe incorretos. Por favor, verifique e tente novamente.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'O seu endereço de email ainda não foi confirmado.';
    }
    return msg;
  }

  function redirectToDashboard() {
    window.location.href = 'dashboard.html';
  }
});
