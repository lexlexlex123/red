/**
 * ╔══════════════════════════════════════════════════╗
 * ║  config/applets.js — Конфигурация аплетов        ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Управляет видимостью встроенных аплетов
 * и позволяет добавлять кастомные iframe-аплеты.
 */

window.CFG_APPLETS = {

  // ── Скрыть встроенные аплеты ─────────────────────────────────
  // Перечислите id аплетов для скрытия:
  hidden: [
    // 'notes', 'qr', 'chart', 'calc', 'timer', 'poll'
  ],

  // ── Кастомные аплеты (iframe с произвольным HTML) ─────────────
  // custom: [
  //   {
  //     id: 'my-widget',
  //     icon: '🌐',
  //     name: 'My Widget',
  //     desc: 'Custom embedded widget',
  //     defaultW: 400,
  //     defaultH: 300,
  //     html: `<html><body style="background:#1a1a2e;color:#fff;display:flex;
  //            align-items:center;justify-content:center;height:100vh;
  //            font-family:sans-serif;font-size:24px">
  //            Hello from custom applet!
  //            </body></html>`,
  //   },
  // ],
  custom: [],

};
