(function() {
  var pathParts = window.location.pathname.split('/');
  var bundleId = pathParts[pathParts.length - 1];
  var passwordStep = document.getElementById('passwordStep');
  var content = document.getElementById('content');
  var loading = document.getElementById('loading');
  var notFound = document.getElementById('notFound');
  var pinInputs = [
    document.getElementById('pin0'),
    document.getElementById('pin1'),
    document.getElementById('pin2'),
    document.getElementById('pin3')
  ];
  var passwordHint = document.getElementById('passwordHint');
  var expiresHint = document.getElementById('expiresHint');
  var expiresAtEl = document.getElementById('expiresAt');
  var passwordError = document.getElementById('passwordError');
  var unlockBtn = document.getElementById('unlockBtn');
  var fileList = document.getElementById('fileList');
  var totalSize = document.getElementById('totalSize');
  var downloadBtn = document.getElementById('downloadBtn');
  var downloadSuccess = document.getElementById('downloadSuccess');

  var verifiedPassword = '';

  var getDownloadBtnHtml = function() {
    var label = typeof __t === 'function' ? __t('download_btn') : 'Baixar';
    return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> ' + label;
  };
  var SPINNER_HTML = '<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatTimeRemaining(expiresAt) {
    var t = typeof __t === 'function' ? __t : function(k) { return k; };
    var ms = expiresAt - Date.now();
    if (ms <= 0) return t('link_expired');
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    var d = Math.floor(h / 24);
    if (d >= 1) return (d === 1 ? t('expires_in_d') : t('expires_in_days')).replace('{0}', d);
    if (h >= 1) return t('expires_in_h').replace('{0}', h).replace('{1}', m % 60);
    if (m >= 1) return t('expires_in_min').replace('{0}', m);
    return t('expires_soon');
  }

  var expiresAtTimer;
  function startExpiryCountdown(expiresAt) {
    function update() {
      var text = formatTimeRemaining(expiresAt);
      if (expiresHint) expiresHint.textContent = text;
      if (expiresAtEl) expiresAtEl.textContent = text;
      if (expiresAt - Date.now() <= 0) clearInterval(expiresAtTimer);
    }
    update();
    clearInterval(expiresAtTimer);
    expiresAtTimer = setInterval(update, 60000);
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showFiles(files) {
    fileList.innerHTML = '';
    var sum = 0;
    files.forEach(function(f) {
      var li = document.createElement('li');
      li.className = 'flex justify-between py-1';
      li.innerHTML = '<span class="truncate mr-3 text-[#1d1d1f]" title="' + escapeHtml(f.originalName) + '">' + escapeHtml(f.originalName) + '</span><span class="text-[#86868b] shrink-0 text-[13px] font-medium">' + formatBytes(f.size) + '</span>';
      fileList.appendChild(li);
      sum += f.size;
    });
    totalSize.textContent = formatBytes(sum);
  }

  function setupDownloadNoPassword() {
    downloadBtn.innerHTML = getDownloadBtnHtml();
    downloadBtn.onclick = function() {
      doDownload();
    };
  }

  function setupDownloadWithPassword() {
    downloadBtn.onclick = doDownloadWithPassword;
  }

  function showDownloadSuccess() {
    downloadBtn.classList.add('hidden');
    if (downloadSuccess) downloadSuccess.classList.remove('hidden');
  }

  function doDownload() {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = SPINNER_HTML;
    fetch('/download/' + bundleId)
      .then(function(r) {
        if (!r.ok) throw new Error(typeof __t === 'function' ? __t('err_download') : 'Erro ao baixar');
        var disp = r.headers.get('Content-Disposition');
        var m = disp && disp.match(/filename="?([^";\s]+)"?/);
        var filename = m ? m[1] : 'timtransfer-file-download.zip';
        return r.blob().then(function(blob) { return { blob: blob, filename: filename }; });
      })
      .then(function(o) {
        var url = URL.createObjectURL(o.blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = o.filename;
        a.click();
        URL.revokeObjectURL(url);
        showDownloadSuccess();
      })
      .catch(function(err) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = getDownloadBtnHtml();
        alert(err.message || (typeof __t === 'function' ? __t('err_download') : 'Erro ao baixar.'));
      });
  }

  function doDownloadWithPassword() {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = SPINNER_HTML;

    fetch('/download/' + bundleId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: verifiedPassword })
    })
      .then(function(r) {
        if (!r.ok) {
          return r.json().then(function(j) {
            throw new Error(j.error || 'Erro');
          });
        }
        var disp = r.headers.get('Content-Disposition');
        var m = disp && disp.match(/filename="?([^";\s]+)"?/);
        var filename = m ? m[1] : 'timtransfer-file-download.zip';
        return r.blob().then(function(blob) { return { blob: blob, filename: filename }; });
      })
      .then(function(o) {
        var url = URL.createObjectURL(o.blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = o.filename;
        a.click();
        URL.revokeObjectURL(url);
        showDownloadSuccess();
      })
      .catch(function(err) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = getDownloadBtnHtml();
        alert(err.message || (typeof __t === 'function' ? __t('err_download') : 'Erro ao baixar.'));
      });
  }

  fetch('/api/share/' + bundleId)
    .then(function(r) {
      if (!r.ok) throw new Error('not found');
      return r.json();
    })
    .then(function(data) {
      loading.classList.add('hidden');
      if (data.requiresPassword) {
        var fileLabel = typeof __t === 'function' ? __t('file_s') : 'arquivo(s)';
        passwordHint.textContent = data.fileCount + ' ' + fileLabel + ' · ' + formatBytes(data.totalSize || 0);
        if (data.expiresAt) startExpiryCountdown(data.expiresAt);
        passwordStep.classList.remove('hidden');
        setTimeout(function() { pinInputs[0].focus(); }, 50);
      } else {
        verifiedPassword = null;
        showFiles(data.files || []);
        if (data.expiresAt) startExpiryCountdown(data.expiresAt);
        content.classList.remove('hidden');
        setupDownloadNoPassword();
      }
    })
    .catch(function() {
      loading.classList.add('hidden');
      notFound.classList.remove('hidden');
    });

  pinInputs.forEach(function(inp, i) {
    inp.addEventListener('input', function(e) {
      var v = e.target.value.replace(/\D/g, '').slice(0, 1);
      e.target.value = v;
      if (v && i < 3) pinInputs[i + 1].focus();
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !e.target.value && i > 0) pinInputs[i - 1].focus();
    });
    inp.addEventListener('paste', function(e) {
      e.preventDefault();
      var pasted = (e.clipboardData && e.clipboardData.getData('text') ? e.clipboardData.getData('text') : '').replace(/\D/g, '').slice(0, 4);
      pasted.split('').forEach(function(ch, j) {
        if (pinInputs[j]) pinInputs[j].value = ch;
      });
      if (pasted.length > 0) pinInputs[Math.min(pasted.length - 1, 3)].focus();
    });
    inp.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') unlockBtn.click();
    });
  });

  unlockBtn.addEventListener('click', function() {
    var password = pinInputs.map(function(i) { return i.value; }).join('');
    if (!/^\d{4}$/.test(password)) {
      passwordError.textContent = typeof __t === 'function' ? __t('err_invalid_pin') : 'Senha inválida';
      passwordError.classList.remove('hidden');
      return;
    }
    passwordError.classList.add('hidden');
    unlockBtn.disabled = true;
    unlockBtn.textContent = '...';

    fetch('/api/verify/' + bundleId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        unlockBtn.disabled = false;
        unlockBtn.textContent = typeof __t === 'function' ? __t('access_btn') : 'Acessar';
        if (data.error) {
          passwordError.textContent = data.error;
          passwordError.classList.remove('hidden');
          return;
        }
        verifiedPassword = password;
        showFiles(data.files || []);
        if (data.expiresAt) startExpiryCountdown(data.expiresAt);
        passwordStep.classList.add('hidden');
        content.classList.remove('hidden');
        setupDownloadWithPassword();
      })
      .catch(function() {
        unlockBtn.disabled = false;
        unlockBtn.textContent = typeof __t === 'function' ? __t('access_btn') : 'Acessar';
        passwordError.textContent = typeof __t === 'function' ? __t('err_retry') : 'Erro. Tente novamente.';
        passwordError.classList.remove('hidden');
      });
  });
})();
