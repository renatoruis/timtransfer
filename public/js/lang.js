(function() {
  var STORAGE_KEY = 'timtransfer_lang';
  var I18N = {
    br: {
      hero_title1: 'Transferir arquivos.',
      hero_title2: 'Grátis,',
      hero_title3: ' fácil e seguro.',
      hero_subtitle: 'Sem cadastro. Sem propaganda. Até 100MB por sessão. Um link, uma senha. Simples assim.',
      cta_transfer: 'Transferir arquivos',
      free_title: '100% gratuito',
      free_desc: 'Nenhum custo. Sem propaganda. Até 100MB por sessão.',
      simple_title: 'Simples',
      simple_desc: 'Arraste, crie uma senha, compartilhe o link. Pronto.',
      secure_title: 'Seguro',
      secure_desc: 'Proteção por senha. Arquivos deletados após o download.',
      footer_tagline: 'TimTransfer — gratuito, simples, seguro.',
      hero_alt: 'TimTransfer — fácil, grátis e seguro',
      coffee: 'Me pague um café',
      star_github: 'Dar uma estrela',
      pix_title: 'Me pague um café',
      pix_subtitle: 'Escaneie o QR code ou copie a chave PIX',
      pix_key: 'Chave PIX',
      pix_qr_alt: 'QR Code PIX',
      copy_key: 'Copiar chave',
      copy_done: 'Copiado!',
      close: 'Fechar',
      feedback_title: 'Enviar sugestão',
      feedback_intro: 'Envie uma sugestão, melhoria, crítica ou peça suporte. Resposta apenas se informar e-mail.',
      feedback_type: 'Tipo',
      feedback_type_sugestao: 'Sugestão',
      feedback_type_melhoria: 'Melhoria',
      feedback_type_critica: 'Crítica',
      feedback_type_suporte: 'Suporte',
      feedback_email: 'E-mail (opcional)',
      feedback_email_ph: 'seu@email.com',
      feedback_message: 'Mensagem',
      feedback_message_ph: 'Descreva sua sugestão, melhoria, crítica ou pedido de suporte...',
      feedback_success: 'Enviado! Obrigado pelo feedback.',
      err_feedback_empty: 'Digite sua mensagem.',
      err_recaptcha: 'Erro no reCAPTCHA. Tente novamente.',
      err_send: 'Erro ao enviar. Tente novamente.',
      feedback_cancel: 'Cancelar',
      feedback_submit: 'Enviar',
      upload_title: 'Enviar arquivos',
      create_pin: 'Crie uma senha para os arquivos.',
      drop_add: 'Arraste ou clique para adicionar arquivos',
      drop_more: 'Adicionar mais arquivos',
      pending_title: 'Arquivos selecionados',
      upload_btn: 'Enviar arquivos',
      uploading: 'Enviando arquivos...',
      upload_progress: 'Enviando... {0} de {1} ({2}%)',
      copy: 'Copiar',
      err_invalid_pin: 'Senha inválida. Use 4 números.',
      err_blocked_file: 'Tipo de arquivo não permitido',
      err_limit_session: 'Limite: 100MB por sessão.',
      err_limit_total: 'Limite: 100MB no total. Adicione menos arquivos.',
      err_upload: 'Erro ao enviar.',
      err_download: 'Erro ao baixar.',
      err_retry: 'Erro. Tente novamente.',
      download_title: 'Digite a senha',
      expires_in_d: 'Expira em {0} dia',
      expires_in_days: 'Expira em {0} dias',
      expires_in_h: 'Expira em {0}h {1}m',
      expires_in_min: 'Expira em {0} min',
      expires_in_mins: 'Expira em {0} min',
      expires_soon: 'Expira em menos de 1 min',
      link_expired: 'Link expirado',
      access_btn: 'Acessar',
      download_btn: 'Baixar',
      download_success: 'Download concluído. Os arquivos foram removidos do servidor.',
      not_found: 'Arquivos não encontrados',
      not_found_upload: 'Enviar arquivos',
      loading: 'Carregando...',
      file_s: 'arquivo(s)',
      send_files: 'Enviar arquivos'
    },
    en: {
      hero_title1: 'Transfer files.',
      hero_title2: 'Free,',
      hero_title3: ' easy and secure.',
      hero_subtitle: 'No sign-up. No ads. Up to 100MB per session. One link, one password. Simple.',
      cta_transfer: 'Transfer files',
      free_title: '100% free',
      free_desc: 'No cost. No ads. Up to 100MB per session.',
      simple_title: 'Simple',
      simple_desc: 'Drag, create a password, share the link. Done.',
      secure_title: 'Secure',
      secure_desc: 'Password protected. Files deleted after download.',
      footer_tagline: 'TimTransfer — free, simple, secure.',
      hero_alt: 'TimTransfer — easy, free and secure',
      coffee: 'Buy me a coffee',
      star_github: 'Give a star',
      pix_title: 'Buy me a coffee',
      pix_subtitle: 'Scan the QR code or copy the PIX key',
      pix_key: 'PIX key',
      pix_qr_alt: 'PIX QR Code',
      copy_key: 'Copy key',
      copy_done: 'Copied!',
      close: 'Close',
      feedback_title: 'Send feedback',
      feedback_intro: 'Send a suggestion, improvement, criticism, or request support. We only reply if you provide an email.',
      feedback_type: 'Type',
      feedback_type_sugestao: 'Suggestion',
      feedback_type_melhoria: 'Improvement',
      feedback_type_critica: 'Criticism',
      feedback_type_suporte: 'Support',
      feedback_email: 'Email (optional)',
      feedback_email_ph: 'your@email.com',
      feedback_message: 'Message',
      feedback_message_ph: 'Describe your suggestion, improvement, criticism, or support request...',
      feedback_success: 'Sent! Thanks for your feedback.',
      err_feedback_empty: 'Enter your message.',
      err_recaptcha: 'reCAPTCHA error. Try again.',
      err_send: 'Error sending. Try again.',
      feedback_cancel: 'Cancel',
      feedback_submit: 'Submit',
      upload_title: 'Upload files',
      create_pin: 'Create a password for the files.',
      drop_add: 'Drag or click to add files',
      drop_more: 'Add more files',
      pending_title: 'Selected files',
      upload_btn: 'Upload files',
      uploading: 'Uploading files...',
      upload_progress: 'Uploading... {0} of {1} ({2}%)',
      copy: 'Copy',
      err_invalid_pin: 'Invalid password. Use 4 digits.',
      err_blocked_file: 'File type not allowed',
      err_limit_session: 'Limit: 100MB per session.',
      err_limit_total: 'Limit: 100MB total. Add fewer files.',
      err_upload: 'Upload error.',
      err_download: 'Download error.',
      err_retry: 'Error. Try again.',
      download_title: 'Enter password',
      expires_in_d: 'Expires in {0} day',
      expires_in_days: 'Expires in {0} days',
      expires_in_h: 'Expires in {0}h {1}m',
      expires_in_min: 'Expires in {0} min',
      expires_in_mins: 'Expires in {0} min',
      expires_soon: 'Expires in less than 1 min',
      link_expired: 'Link expired',
      access_btn: 'Access',
      download_btn: 'Download',
      download_success: 'Download complete. Files have been removed from the server.',
      not_found: 'Files not found',
      not_found_upload: 'Upload files',
      loading: 'Loading...',
      file_s: 'file(s)',
      send_files: 'Upload files'
    }
  };

  function getLang() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      return (s === 'en' || s === 'br') ? s : 'br';
    } catch (e) { return 'br'; }
  }
  function setLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }
  function t(key) {
    var lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || I18N.br[key] || key;
  }
  window.__t = t;
  window.__getLang = getLang;

  function apply() {
    var lang = getLang();
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var txt = (I18N[lang] && I18N[lang][key]) || I18N.br[key] || el.textContent;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.getAttribute('data-i18n-placeholder')) {
          el.placeholder = (I18N[lang] && I18N[lang][el.getAttribute('data-i18n-placeholder')]) || I18N.br[el.getAttribute('data-i18n-placeholder')] || '';
        }
      } else if (el.getAttribute('data-i18n-placeholder')) {
        el.placeholder = (I18N[lang] && I18N[lang][el.getAttribute('data-i18n-placeholder')]) || I18N.br[el.getAttribute('data-i18n-placeholder')] || '';
      } else {
        el.textContent = txt;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = (I18N[lang] && I18N[lang][key]) || I18N.br[key] || '';
  });
    document.querySelectorAll('[data-i18n-attr]').forEach(function(el) {
      var parts = el.getAttribute('data-i18n-attr').split(':');
      var attr = parts[0];
      var key = parts[1];
      var txt = (I18N[lang] && I18N[lang][key]) || I18N.br[key] || '';
      el.setAttribute(attr, txt);
    });
    document.querySelectorAll('[data-i18n-option]').forEach(function(opt) {
      var key = opt.getAttribute('data-i18n-option');
      opt.textContent = (I18N[lang] && I18N[lang][key]) || I18N.br[key] || opt.textContent;
    });
    var toggle = document.getElementById('langToggle');
    if (toggle) {
      toggle.querySelector('[data-lang-br]').classList.toggle('font-semibold', lang === 'br');
      toggle.querySelector('[data-lang-br]').classList.toggle('text-[#0071e3]', lang === 'br');
      toggle.querySelector('[data-lang-en]').classList.toggle('font-semibold', lang === 'en');
      toggle.querySelector('[data-lang-en]').classList.toggle('text-[#0071e3]', lang === 'en');
    }
  }

  function toggleLang() {
    var next = getLang() === 'br' ? 'en' : 'br';
    setLang(next);
    apply();
    var copyPix = document.getElementById('copyPixBtn');
    if (copyPix && copyPix.textContent === 'Copiado!' || copyPix && copyPix.textContent === 'Copied!') {
      copyPix.textContent = t('copy_done');
    }
  }

  function init() {
    apply();
    var toggle = document.getElementById('langToggle');
    if (toggle) {
      toggle.addEventListener('click', function(e) {
        var tgt = e.target.closest('[data-lang-br], [data-lang-en]');
        if (tgt) {
          if (tgt.hasAttribute('data-lang-br') && getLang() !== 'br') { setLang('br'); apply(); }
          if (tgt.hasAttribute('data-lang-en') && getLang() !== 'en') { setLang('en'); apply(); }
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.__applyLang = apply;
})();
