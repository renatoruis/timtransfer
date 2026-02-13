(function() {
  var siteKey = null;
  var recaptchaLoaded = false;

  function loadRecaptchaScript(key, callback) {
    if (window.grecaptcha && window.grecaptcha.execute) {
      callback();
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=' + key;
    script.async = true;
    script.onload = callback;
    document.head.appendChild(script);
  }

  function getRecaptchaToken(action) {
    return new Promise(function(resolve, reject) {
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        reject(new Error('reCAPTCHA não carregado'));
        return;
      }
      window.grecaptcha.execute(siteKey, { action: action })
        .then(resolve)
        .catch(reject);
    });
  }

  function initFeedback() {
    var feedbackBtn = document.getElementById('feedbackBtn');
    var feedbackModal = document.getElementById('feedbackModal');
    var feedbackClose = document.getElementById('feedbackClose');
    var feedbackForm = document.getElementById('feedbackForm');
    if (!feedbackBtn || !feedbackModal) return;

    function openModal() {
      feedbackModal.classList.remove('hidden');
      if (!siteKey) {
        fetch('/api/config')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            siteKey = data.recaptchaSiteKey || '';
            if (siteKey) {
              loadRecaptchaScript(siteKey, function() { recaptchaLoaded = true; });
            }
          })
          .catch(function() {});
      } else if (siteKey && !recaptchaLoaded) {
        loadRecaptchaScript(siteKey, function() { recaptchaLoaded = true; });
      }
    }

    function closeModal() {
      feedbackModal.classList.add('hidden');
      if (feedbackForm) {
        feedbackForm.reset();
        var msg = document.getElementById('feedbackMessage');
        if (msg) msg.textContent = '';
        var err = document.getElementById('feedbackError');
        if (err) { err.textContent = ''; err.classList.add('hidden'); }
      }
    }

    feedbackBtn.addEventListener('click', openModal);
    if (feedbackClose) feedbackClose.addEventListener('click', closeModal);
    var feedbackCloseBtn = document.getElementById('feedbackCloseBtn');
    if (feedbackCloseBtn) feedbackCloseBtn.addEventListener('click', closeModal);
    feedbackModal.addEventListener('click', function(e) {
      if (e.target === feedbackModal) closeModal();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && feedbackModal && !feedbackModal.classList.contains('hidden')) closeModal();
    });

    if (feedbackForm) {
      feedbackForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var typeEl = document.getElementById('feedbackType');
        var messageEl = document.getElementById('feedbackMessage');
        var emailEl = document.getElementById('feedbackEmail');
        var submitBtn = document.getElementById('feedbackSubmit');
        var errEl = document.getElementById('feedbackError');

        var type = typeEl ? typeEl.value : 'sugestao';
        var message = (messageEl && messageEl.value || '').trim();
        var email = (emailEl && emailEl.value || '').trim();

        if (!message) {
          if (errEl) { errEl.textContent = 'Digite sua mensagem.'; errEl.classList.remove('hidden'); }
          return;
        }

        if (submitBtn) submitBtn.disabled = true;

        function done(success, errMsg) {
          if (submitBtn) submitBtn.disabled = false;
          if (errEl) {
            errEl.textContent = errMsg || '';
            errEl.classList.toggle('hidden', !errMsg);
          }
        }

        if (!siteKey) {
          fetch('/api/config')
            .then(function(r) { return r.json(); })
            .then(function(data) {
              siteKey = data.recaptchaSiteKey || '';
              if (!siteKey) {
                doSubmit(null);
                return;
              }
              loadRecaptchaScript(siteKey, function() {
                recaptchaLoaded = true;
                getRecaptchaToken('feedback').then(doSubmit).catch(function() {
                  done(false, 'Erro no reCAPTCHA. Tente novamente.');
                });
              });
            })
            .catch(function() { doSubmit(null); });
        } else {
          getRecaptchaToken('feedback')
            .then(doSubmit)
            .catch(function() {
              done(false, 'Erro no reCAPTCHA. Tente novamente.');
            });
        }

        function doSubmit(recaptchaToken) {
          fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: type,
              message: message,
              email: email,
              recaptchaToken: recaptchaToken
            })
          })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (data.error) {
                done(false, data.error);
                return;
              }
              feedbackForm.reset();
              if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
              var msg = document.getElementById('feedbackSuccessMsg');
              if (msg) msg.classList.remove('hidden');
              setTimeout(function() {
                if (msg) msg.classList.add('hidden');
                closeModal();
              }, 2000);
              done(true);
            })
            .catch(function() {
              done(false, 'Erro ao enviar. Tente novamente.');
            });
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedback);
  } else {
    initFeedback();
  }
})();
