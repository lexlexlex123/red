/* Мобильный immersive: скрытие системной панели навигации (PWA fullscreen + Fullscreen API). */
(function () {
  'use strict';

  var MOBILE_LAYOUT_MAX = 1279;
  var MOBILE_MQ = '(max-width: ' + MOBILE_LAYOUT_MAX + 'px)';
  var DESKTOP_MQ = '(min-width: ' + (MOBILE_LAYOUT_MAX + 1) + 'px)';

  function isMobileLayout() {
    return window.matchMedia(MOBILE_MQ).matches;
  }

  function isMobileChrome() {
    return isMobileLayout();
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function isPwaDisplayMode() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true
    );
  }

  function wantsImmersive() {
    if (isPwaDisplayMode() && window.matchMedia('(pointer: coarse)').matches) return true;
    return isMobileLayout();
  }

  function syncMobileClass() {
    var on = wantsImmersive();
    document.documentElement.classList.toggle('mobile-layout', on);
    document.documentElement.classList.toggle('mobile-pwa', on && isPwaDisplayMode());
    document.documentElement.classList.toggle('mobile-android', on && isAndroid());
  }

  function _activeRibbonTabName() {
    var tab = document.querySelector('#ribbon-tabs .rtab.active');
    if (!tab) return null;
    var oc = tab.getAttribute('onclick') || '';
    var m = oc.match(/switchTab\s*\(\s*['"]([^'"]+)['"]/);
    return m ? m[1] : null;
  }

  function refreshLayoutUI() {
    syncMobileClass();
    if (!isMobileChrome()) {
      closeMobileProps();
      closeMobileAlign();
      closeMobileRubber();
    } else {
      positionMobileAlignPanel();
    }
    var tabName = _activeRibbonTabName();
    var activeTab = document.querySelector('#ribbon-tabs .rtab.active');
    if (tabName && activeTab && typeof switchTab === 'function') {
      switchTab(tabName, activeTab);
    }
    requestAnimationFrame(function () {
      if (typeof _refreshCanvasViewport === 'function') _refreshCanvasViewport();
      else if (typeof resize === 'function') resize();
      if (typeof drawGrid === 'function') drawGrid();
      if (typeof drawThumbs === 'function') drawThumbs(true);
      if (typeof syncColorBar === 'function') syncColorBar();
    });
  }

  var _layoutRefreshTimer = null;
  function scheduleLayoutRefresh(delay) {
    clearTimeout(_layoutRefreshTimer);
    _layoutRefreshTimer = setTimeout(refreshLayoutUI, delay != null ? delay : 80);
  }

  var _immersiveRequested = false;

  function requestImmersive() {
    if (!wantsImmersive() || isFullscreen()) return Promise.resolve(false);
    if (_immersiveRequested) return Promise.resolve(false);
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!fn) return Promise.resolve(false);
    try {
      return Promise.resolve(fn.call(el))
        .then(function () { _immersiveRequested = true; return true; })
        .catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function onFsChange() {
    document.documentElement.classList.toggle('mobile-fullscreen', isFullscreen());
    scheduleLayoutRefresh(50);
  }

  function wireImmersive() {
    if (!wantsImmersive()) return;

    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || !wantsImmersive() || isFullscreen() || _immersiveRequested) return;
      requestImmersive();
    }, { capture: true, passive: true, once: true });
  }

  syncMobileClass();
  window.addEventListener('resize', function () { scheduleLayoutRefresh(80); });
  window.addEventListener('orientationchange', function () { scheduleLayoutRefresh(320); });
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireImmersive);
  } else {
    wireImmersive();
  }

  function scrollActiveRibbonTab() {
    if (!isMobileChrome()) return;
    var tab = document.querySelector('#ribbon-tabs .rtab.active');
    if (tab && tab.scrollIntoView) tab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
  window.addEventListener('load', function () {
    setTimeout(function () {
      refreshLayoutUI();
      scrollActiveRibbonTab();
    }, 400);
  });

  window.MOBILE_LAYOUT_MAX = MOBILE_LAYOUT_MAX;
  window.MOBILE_LAYOUT_MQ = MOBILE_MQ;
  window.DESKTOP_LAYOUT_MQ = DESKTOP_MQ;
  window.isMobileLayout = isMobileLayout;
  window.isMobileChrome = isMobileChrome;
  window.refreshLayoutUI = refreshLayoutUI;
  window.requestMobileImmersive = requestImmersive;

  function positionMobileAlignPanel() {
    var btn = document.getElementById('btn-mobile-align');
    var panel = document.getElementById('ctoolbar');
    if (!btn || !panel || !document.body.classList.contains('mobile-align-open')) return;
    var r = btn.getBoundingClientRect();
    var gap = 14;
    var pad = 8;
    var left = Math.max(pad, Math.min(r.left, window.innerWidth - pad - panel.offsetWidth));
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(r.bottom + gap) + 'px';
  }

  function toggleMobileAlign(force) {
    if (!isMobileChrome()) return;
    var open = force != null ? !!force : !document.body.classList.contains('mobile-align-open');
    if (open) {
      closeMobileProps();
      closeMobileRubber();
    }
    document.body.classList.toggle('mobile-align-open', open);
    var btn = document.getElementById('btn-mobile-align');
    if (btn) {
      btn.classList.toggle('active', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (open) {
      requestAnimationFrame(function () {
        positionMobileAlignPanel();
        requestAnimationFrame(positionMobileAlignPanel);
      });
      scheduleLayoutRefresh(50);
    } else {
      scheduleLayoutRefresh(50);
    }
  }

  function closeMobileAlign() {
    if (document.body.classList.contains('mobile-align-open')) toggleMobileAlign(false);
  }

  window.toggleMobileAlign = toggleMobileAlign;

  function toggleMobileProps(force) {
    if (!isMobileChrome()) return;
    var open = force != null ? !!force : !document.body.classList.contains('mobile-props-open');
    if (open) {
      closeMobileAlign();
      closeMobileRubber();
    }
    document.body.classList.toggle('mobile-props-open', open);
    var btn = document.getElementById('btn-mobile-props');
    if (btn) {
      btn.classList.toggle('active', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (open) scheduleLayoutRefresh(50);
  }

  function closeMobileProps() {
    if (document.body.classList.contains('mobile-props-open')) toggleMobileProps(false);
  }

  window.toggleMobileProps = toggleMobileProps;

  function toggleMobileRubber(force) {
    if (!isMobileChrome()) return;
    var open = force != null ? !!force : !window._mobileRubberMode;
    if (open) {
      closeMobileAlign();
      closeMobileProps();
    } else if (typeof window._clearTextTapState === 'function') {
      window._clearTextTapState();
    }
    window._mobileRubberMode = open;
    var btn = document.getElementById('btn-mobile-rubber');
    if (btn) {
      btn.classList.toggle('active', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    document.body.classList.toggle('mobile-rubber-mode', open);
  }

  function closeMobileRubber() {
    if (window._mobileRubberMode) toggleMobileRubber(false);
  }

  window.toggleMobileRubber = toggleMobileRubber;

  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('mobile-props-open')) {
      if (!e.target.closest('#props') && !e.target.closest('#btn-mobile-props')) closeMobileProps();
    }
    if (document.body.classList.contains('mobile-align-open')) {
      if (!e.target.closest('#ctoolbar') && !e.target.closest('#btn-mobile-align') && !e.target.closest('#mobile-chrome')) closeMobileAlign();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMobileProps();
      closeMobileAlign();
    }
  });
})();
