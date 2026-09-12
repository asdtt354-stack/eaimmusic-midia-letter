/* ═══════════════════════════════════════════════════════════
   EAIM 슬라이드쇼 — 깨끗한 녹화 애드온 (slideshow-rec.js)
   뮤지컬메이커 슬라이드쇼 · 미디어레터 슬라이드쇼 공용

   해결하는 문제
   · 녹화 영상에 하단 컨트롤바·패널·힌트·커서까지 찍히던 것
   · 화면 전체가 아니라 "이 탭"만 잡히도록 선택창을 제한
   · 두 번째 녹화에서 오디오 노드 중복 생성 오류 (미디어레터)

   녹화 중 조작
   · ← → 장면 이동 (그대로)
   · R 또는 Esc  : 녹화 종료
   · 커튼콜 크레딧이 끝나거나, 편곡 음악이 끝나면 자동 종료

   설치: 슬라이드쇼 HTML의 </body> 바로 앞에
         <script src="slideshow-rec.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── 녹화 중 숨길 것들 ───────────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
  body.rec-clean #controls, body.rec-clean #key-hint, body.rec-clean #api-status,
  body.rec-clean #signal-indicator, body.rec-clean #rec-indicator, body.rec-clean #music-upload-bar,
  body.rec-clean #char-panel, body.rec-clean #char-anim-panel, body.rec-clean #bubble-panel,
  body.rec-clean #fx-panel, body.rec-clean #dialogue-bar, body.rec-clean #hover-tooltip,
  body.rec-clean #back-btn, body.rec-clean #toast-msg, body.rec-clean #ppt-progress,
  body.rec-clean .lyrics-toggle-btn, body.rec-clean .char-del-btn, body.rec-clean .bubble-del,
  body.rec-clean [id^="src-badge-"] { display: none !important; }
  body.rec-clean .char-wrap.selected { outline: none !important; }
  body.rec-clean, body.rec-clean * { cursor: none !important; }
  #rec-prep { position: fixed; inset: 0; z-index: 9990; background: #000; display: none;
    align-items: center; justify-content: center; flex-direction: column; gap: 14px; color: #fff; }
  #rec-prep.show { display: flex; }
  #rec-prep .n { font-size: 96px; font-weight: 900; line-height: 1; color: #ff5252; }
  #rec-prep .t { font-size: 14px; color: rgba(255,255,255,.55); letter-spacing: 1px; text-align: center; line-height: 1.8; }
  #timing-panel { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 210; width: 320px;
    background: rgba(0,0,0,.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.15); border-radius: 16px; padding: 14px; display: none; color: #fff; font-size: 12px; }
  #timing-panel.show { display: block; }
  #timing-panel h4 { font-size: 12px; color: rgba(255,255,255,.55); margin-bottom: 10px; }
  #timing-panel label { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); margin-bottom: 6px; cursor: pointer; line-height: 1.5; }
  #timing-panel label:has(input:checked) { border-color: #5DADE2; background: rgba(93,173,226,.12); }
  #timing-panel input[type=radio] { margin-top: 3px; accent-color: #5DADE2; }
  #timing-panel input[type=number] { width: 54px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); color: #fff; border-radius: 6px; padding: 2px 6px; font-family: inherit; }
  #timing-panel .info { color: rgba(255,255,255,.45); font-size: 11px; margin: 4px 0 10px; line-height: 1.6; }
  #timing-panel .row { display: flex; gap: 6px; }
  #timing-panel button { flex: 1; padding: 7px; border-radius: 8px; border: 1px solid rgba(93,173,226,.4); background: rgba(93,173,226,.18); color: #5DADE2; cursor: pointer; font-family: inherit; font-size: 12px; }
  #timing-panel button.quiet { border-color: rgba(255,255,255,.15); background: rgba(255,255,255,.06); color: rgba(255,255,255,.6); }
  #timing-panel .tm-music { border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:8px 10px; margin-bottom:10px; }
  #timing-panel .tm-mhead { font-size:11px; color:rgba(255,255,255,.55); margin-bottom:6px; }
  #timing-panel .tm-track { padding:5px 0; border-top:1px solid rgba(255,255,255,.07); }
  #timing-panel .tm-track:first-of-type { border-top:none; }
  #timing-panel .tm-tname { font-size:11px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #timing-panel .tm-trow { display:flex; align-items:center; gap:5px; margin-top:3px; font-size:11px; color:rgba(255,255,255,.5); flex-wrap:wrap; }
  #timing-panel .tm-trow input.tm-dur { width:52px; text-align:center; }
  #timing-panel .tm-trow input.tm-scn { width:44px; text-align:center; }
  #timing-panel .tm-trow input { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); color:#fff; border-radius:6px; padding:2px 4px; font-family:inherit; font-size:11px; }
  #timing-panel .tm-auto { font-size:10px; color:rgba(255,255,255,.35); }
  #timing-panel .tm-range { font-size:10px; color:#5DADE2; }
  body.rec-clean #timing-panel { display: none !important; }
  `;
  document.head.appendChild(css);

  const prep = document.createElement('div');
  prep.id = 'rec-prep';
  prep.innerHTML = '<div class="n">3</div><div class="t"></div>';
  document.body.appendChild(prep);

  const $ = (id) => document.getElementById(id);
  const toast = (m) => (typeof showToast === 'function' ? showToast(m) : console.log(m));


  // ══════════════════════════════════════════════════════════
  // ⏱ 자동 진행 — 음악 재생목록에 장면을 맞추기
  //   음악을 여러 곡 올릴 수 있고, 곡마다 담당할 장면 수를 정합니다.
  //   (예: 그림 4장 + 음악 2곡 → 1곡당 2장면)
  //   곡 길이는 자동으로 읽되, 못 읽거나 다르게 쓰고 싶으면 직접 입력합니다.
  // ══════════════════════════════════════════════════════════
  const TIMING_KEY = 'eaim_slide_timing';
  const PLAN_KEY   = 'eaim_slide_music_plan';          // 곡 이름별 길이·장면 수 기억
  let timing = { mode: 'music', fixedSec: 7 };
  try { timing = { ...timing, ...JSON.parse(localStorage.getItem(TIMING_KEY) || '{}') }; } catch {}
  function saveTiming() { localStorage.setItem(TIMING_KEY, JSON.stringify(timing)); }

  let savedPlan = {};
  try { savedPlan = JSON.parse(localStorage.getItem(PLAN_KEY) || '{}'); } catch {}
  function savePlan() {
    const out = {};
    TRACKS.forEach(t => { out[t.name] = { sec: t.sec, scenes: t.scenes }; });
    try { localStorage.setItem(PLAN_KEY, JSON.stringify(out)); } catch {}
  }

  const sceneCount = () => (typeof TOTAL !== 'undefined' ? TOTAL : ((typeof SCENES !== 'undefined' && SCENES.length) || 0));
  const arrangement = () => ((typeof arrangementAudioEl !== 'undefined') ? arrangementAudioEl : null);
  const goto = (i) => { if (typeof showSlide === 'function') showSlide(i); };

  // "2:35" 또는 "155" → 초
  function parseTime(s) {
    s = String(s || '').trim(); if (!s) return 0;
    if (s.includes(':')) { const [m, x] = s.split(':'); return (Number(m) || 0) * 60 + (Number(x) || 0); }
    return Number(s) || 0;
  }
  const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

  // ── 곡 길이 읽기 (blob·스트리밍은 Infinity 로 오는 일이 잦아 한 번 우회함) ──
  function readDuration(audio, cb) {
    let done = false;
    const ok = (d) => { if (!done) { done = true; cb(d); } };
    const now = () => { const d = audio.duration; if (isFinite(d) && d > 0) { ok(d); return true; } return false; };
    if (now()) return;
    const onMeta = () => {
      if (now()) return;
      const onDur = () => { const d = audio.duration; if (isFinite(d) && d > 0) { audio.removeEventListener('durationchange', onDur); try { audio.currentTime = 0; } catch {} ok(d); } };
      audio.addEventListener('durationchange', onDur);
      try { audio.currentTime = 1e6; } catch {}
    };
    audio.addEventListener('loadedmetadata', onMeta, { once: true });
    setTimeout(() => ok(0), 5000);
  }

  // ══ 음악 재생목록 ══
  // TRACKS: [{ name, el, sec, manual, scenes }]
  const TRACKS = [];
  window.pmTracks = TRACKS;

  function balanceScenes() {                     // 장면을 곡 수만큼 고르게 나눔
    const N = sceneCount(), T = TRACKS.length; if (!T) return;
    const base = Math.floor(N / T), extra = N % T;
    TRACKS.forEach((t, i) => { t.scenes = base + (i < extra ? 1 : 0); });
  }
  function totalAssigned() { return TRACKS.reduce((s, t) => s + (t.scenes || 0), 0); }

  function addTrack(file) {
    const el = document.createElement('audio');
    el.src = URL.createObjectURL(file);
    el.preload = 'metadata';
    const volEl = $('music-volume');
    el.volume = volEl ? parseFloat(volEl.value || 0.6) : 0.6;
    document.body.appendChild(el);
    const remembered = savedPlan[file.name] || {};
    const t = { name: file.name, el, sec: remembered.sec || 0, manual: !!remembered.sec, scenes: remembered.scenes || 0 };
    TRACKS.push(t);
    if (!t.manual) readDuration(el, (D) => { if (D && !t.manual) { t.sec = D; savePlan(); if (tp.classList.contains('show')) renderTimingPanel(); } });
    if (!TRACKS.some(x => x.scenes > 0)) balanceScenes();
    else if (!t.scenes) { balanceScenes(); }
    // 기존 코드(볼륨·재생 버튼·녹화)가 바라보는 대상은 첫 곡으로 유지
    if (typeof window.arrangementAudioEl !== 'undefined' || true) window.arrangementAudioEl = TRACKS[0].el;
    savePlan();
    return t;
  }
  function clearTracks() {
    TRACKS.forEach(t => { try { t.el.pause(); t.el.remove(); } catch {} });
    TRACKS.length = 0; window.arrangementAudioEl = null;
  }
  function stopAllTracks() { TRACKS.forEach(t => { try { t.el.pause(); t.el.currentTime = 0; } catch {} }); }

  // 음악 업로드 가로채기 — 여러 곡을 받는다
  (function hookUpload() {
    const inp = $('arrangement-file');
    if (inp) inp.setAttribute('multiple', 'multiple');
    window.loadArrangementFile = function (e) {
      const files = [...(e.target.files || [])]; if (!files.length) return;
      files.forEach(addTrack);
      const dot = $('music-upload-dot'); if (dot) dot.classList.add('active');
      const pb = $('music-play-btn'); if (pb) pb.style.display = 'inline-block';
      const vl = $('music-volume'); if (vl) vl.style.display = 'inline-block';
      if (typeof updateMusicPlayBtn === 'function') updateMusicPlayBtn();
      toast(`🎵 음악 ${TRACKS.length}곡 준비됐어요 — ⏱ 에서 곡마다 장면 수를 정하세요`);
      if (tp.classList.contains('show')) renderTimingPanel();
    };
    // 볼륨은 모든 곡에 적용
    window.setMusicVolume = function (v) { TRACKS.forEach(t => t.el.volume = parseFloat(v)); };
    window.toggleArrangementPlay = function () {
      const t = TRACKS[0]; if (!t) return;
      if (t.el.paused) t.el.play().catch(() => {}); else stopAllTracks();
      if (typeof updateMusicPlayBtn === 'function') updateMusicPlayBtn();
    };
  })();

  let syncRunning = false, syncHandler = null, fixedTimer = null, syncAudio = null, trackTimer = null;

  function stopSync() {
    syncRunning = false;
    if (syncAudio && syncHandler) syncAudio.removeEventListener('timeupdate', syncHandler);
    syncHandler = null; syncAudio = null;
    clearInterval(fixedTimer); fixedTimer = null;
    clearTimeout(trackTimer); trackTimer = null;
  }

  // ── 재생목록대로 진행: 곡1 → 담당 장면들 → 곡2 → … → 마지막 곡 끝 → 엔딩 ──
  function startPlaylist() {
    const N = sceneCount(); if (!N || !TRACKS.length) return false;
    if (totalAssigned() !== N) balanceScenes();

    const plan = []; let at = 0;
    TRACKS.forEach(t => { if (t.scenes > 0) { plan.push({ t, from: at + 1, n: t.scenes }); at += t.scenes; } });
    if (!plan.length) return false;

    syncRunning = true;
    stopAllTracks();

    const playAt = (pi) => {
      if (!syncRunning) return;
      const p = plan[pi];
      if (!p) { stopSync(); goto(sceneCount() + 1); return; }          // 마지막 곡 끝 → 엔딩
      const el = p.t.el;
      const D = p.t.sec > 0 ? p.t.sec : 0;
      const per = D > 0 ? D / p.n : Math.max(2, timing.fixedSec);
      let stepped = false;
      const advance = () => { if (stepped) return; stepped = true; el.pause(); playAt(pi + 1); };

      goto(p.from);
      syncAudio = el;
      syncHandler = () => {
        if (!syncRunning) return;
        const target = p.from + Math.min(p.n - 1, Math.floor(el.currentTime / per));
        if (typeof current !== 'undefined' && current !== target && !(typeof isTransitioning !== 'undefined' && isTransitioning)) goto(target);
      };
      el.addEventListener('timeupdate', syncHandler);
      el.addEventListener('ended', advance, { once: true });
      el.loop = false; el.currentTime = 0; el.play().catch(() => {});
      // 길이를 직접 입력했거나 ended 가 안 올 때를 대비한 안전망
      clearTimeout(trackTimer);
      trackTimer = setTimeout(advance, (D > 0 ? D : per * p.n) * 1000 + 250);
    };

    playAt(0);
    const totalSec = TRACKS.reduce((s, t) => s + (t.scenes > 0 ? t.sec : 0), 0);
    toast(`⏱ ${plan.length}곡 · 전체 ${fmtTime(totalSec)} 로 ${N}장면을 진행해요`);
    return true;
  }

  // 장면별 노래가 끝나면 다음 장면
  function startSceneSync() {
    const N = sceneCount(); if (!N) return false;
    syncRunning = true;
    window._pmSceneAudioEnded = () => { if (!syncRunning) return; const c = (typeof current !== 'undefined') ? current : 0; if (c <= N) goto(c + 1); else stopSync(); };
    return true;
  }

  // N초 고정
  function startFixedSync(sec) {
    const N = sceneCount(); if (!N) return false;
    syncRunning = true;
    fixedTimer = setInterval(() => { const c = (typeof current !== 'undefined') ? current : 0; if (c <= N) goto(c + 1); else stopSync(); }, Math.max(2, sec) * 1000);
    return true;
  }

  // 현재 설정으로 자동 진행 시작 (1장면부터)
  function startAutoRun() {
    stopSync();
    if (timing.mode === 'music') {
      if (TRACKS.length) return startPlaylist();
      toast('⚠️ 음악이 없어 고정 시간으로 진행해요 — 🎵 에서 음악을 올려주세요');
      goto(1); return startFixedSync(timing.fixedSec);
    }
    goto(1);
    if (timing.mode === 'scene') return startSceneSync();
    return startFixedSync(timing.fixedSec);
  }
  function stopAutoRun() { stopSync(); stopAllTracks(); if (typeof updateMusicPlayBtn === 'function') updateMusicPlayBtn(); }
  const autoRunning = () => syncRunning;
  window.pmStartAutoRun = startAutoRun;
  window.pmStopAutoRun = stopAutoRun;
  window.pmToggleAutoRun = function () { if (syncRunning) { stopAutoRun(); toast('■ 자동 진행 멈춤'); } else startAutoRun(); return syncRunning; };
  window.pmAutoRunning = autoRunning;

  // ── 설정 패널 ──
  const tp = document.createElement('div');
  tp.id = 'timing-panel';
  document.body.appendChild(tp);
  function renderTimingPanel() {
    const N = sceneCount();
    const assigned = totalAssigned();
    const rows = TRACKS.map((t, i) => {
      let from = 1; for (let k = 0; k < i; k++) from += TRACKS[k].scenes || 0;
      const to = from + (t.scenes || 0) - 1;
      const range = t.scenes > 0 ? (t.scenes === 1 ? `${from}장면` : `${from}~${to}장면`) : '담당 없음';
      return `<div class="tm-track">
        <div class="tm-tname" title="${t.name}">${i + 1}. ${t.name}</div>
        <div class="tm-trow">
          길이 <input type="text" class="tm-dur" data-i="${i}" value="${t.sec ? fmtTime(t.sec) : ''}" placeholder="2:30">
          <span class="tm-auto">${t.manual ? '직접 입력' : (t.sec ? '자동' : '읽는 중…')}</span>
          장면 <input type="number" class="tm-scn" data-i="${i}" min="0" max="${N}" value="${t.scenes || 0}">
          <span class="tm-range">${range}</span>
        </div>
      </div>`;
    }).join('');

    tp.innerHTML = `
      <h4>⏱ 장면 자동 진행</h4>
      <div class="tm-music">
        <div class="tm-mhead">🎵 음악 ${TRACKS.length}곡 · 그림 ${N}장면
          ${TRACKS.length && assigned !== N ? `<b style="color:#ffb74d"> — 담당 합계 ${assigned} (${N} 이어야 해요)</b>` : ''}</div>
        ${TRACKS.length ? rows : '<div class="info" style="margin:0">위쪽 🎵 칸에서 음악 파일을 고르세요. 여러 곡을 한 번에 골라도 돼요.</div>'}
        <div class="row" style="margin-top:6px">
          <button class="quiet" id="tm-balance">장면 고르게 나누기</button>
          <button class="quiet" id="tm-clearmusic">음악 비우기</button>
        </div>
      </div>
      <label><input type="radio" name="tm" value="music" ${timing.mode === 'music' ? 'checked' : ''}>
        <span><b>음악에 맞추기</b><br><span class="info" style="margin:0">곡마다 담당 장면에 시간을 나눠 담아요</span></span></label>
      <label><input type="radio" name="tm" value="fixed" ${timing.mode === 'fixed' ? 'checked' : ''}>
        <span><b>고정 시간</b> &nbsp;<input type="number" id="tm-sec" min="2" max="120" value="${timing.fixedSec}"> 초마다</span></label>
      <div class="info">녹화를 시작하면 이 설정대로 1장면부터 자동으로 넘어가요. 녹화 중에도 ← → 로 직접 넘길 수 있어요.</div>
      <div class="row"><button id="tm-preview">▶ 미리보기</button><button class="quiet" id="tm-stop">■ 멈춤</button><button class="quiet" id="tm-close">닫기</button></div>`;

    tp.querySelectorAll('input[name=tm]').forEach(r => r.onchange = () => { timing.mode = r.value; saveTiming(); });
    tp.querySelector('#tm-sec').oninput = (e) => { timing.fixedSec = Number(e.target.value) || 7; saveTiming(); };
    tp.querySelectorAll('.tm-dur').forEach(inp => {
      inp.onchange = (e) => {
        const t = TRACKS[Number(e.target.dataset.i)]; if (!t) return;
        const v = parseTime(e.target.value);
        if (v > 0) { t.sec = v; t.manual = true; } else { t.manual = false; }
        savePlan(); renderTimingPanel();
      };
    });
    tp.querySelectorAll('.tm-scn').forEach(inp => {
      inp.onchange = (e) => {
        const t = TRACKS[Number(e.target.dataset.i)]; if (!t) return;
        t.scenes = Math.max(0, Math.min(sceneCount(), Number(e.target.value) || 0));
        savePlan(); renderTimingPanel();
      };
    });
    tp.querySelector('#tm-balance').onclick = () => { balanceScenes(); savePlan(); renderTimingPanel(); };
    tp.querySelector('#tm-clearmusic').onclick = () => { stopSync(); clearTracks(); renderTimingPanel(); toast('음악을 비웠어요'); };
    tp.querySelector('#tm-preview').onclick = () => { startAutoRun(); };
    tp.querySelector('#tm-stop').onclick = () => { stopAutoRun(); toast('■ 자동 진행 멈춤'); };
    tp.querySelector('#tm-close').onclick = () => tp.classList.remove('show');
  }
  function toggleTimingPanel() { if (tp.classList.contains('show')) tp.classList.remove('show'); else { renderTimingPanel(); tp.classList.add('show'); } }
  window.toggleTimingPanel = toggleTimingPanel;

  // 컨트롤바에 ⏱ 버튼 추가
  (function addBtn() {
    const c = $('controls'); if (!c) return;
    const b = document.createElement('button');
    b.className = 'ctrl-btn'; b.id = 'btn-timing'; b.textContent = '⏱';
    b.setAttribute('data-tip', '음악 길이에 맞춰 장면이 자동으로 넘어가게 해요');
    b.onclick = toggleTimingPanel;
    const rec = $('btn-rec'); if (rec && rec.parentElement === c) c.insertBefore(b, rec); else c.appendChild(b);
  })();

  let recorder = null, chunks = [], timer = null, seconds = 0, displayStream = null, mixCtx = null;

  function isRecording() { return recorder && recorder.state === 'recording'; }

  // ── 탭만 캡처 (브라우저가 지원하는 옵션은 적용, 나머지는 무시됨) ──
  async function captureThisTab() {
    const opts = {
      video: { displaySurface: 'browser', cursor: 'never', frameRate: 30 },
      audio: true,                       // 탭 소리(배경음·생성한 노래)까지 함께
      preferCurrentTab: true,            // Chrome: 현재 탭을 기본 선택
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude',    // 전체 화면 선택지 숨김
      systemAudio: 'exclude',
    };
    return navigator.mediaDevices.getDisplayMedia(opts);
  }

  // ── 오디오 트랙 결정: 탭 오디오가 있으면 그대로, 없으면 편곡 음악을 직접 섞기 ──
  function buildStream(ds) {
    const v = ds.getVideoTracks();
    let a = ds.getAudioTracks();
    const els = TRACKS.length ? TRACKS.map(t => t.el)
              : (((typeof arrangementAudioEl !== 'undefined') && arrangementAudioEl) ? [arrangementAudioEl] : []);
    if (!a.length && els.length) {        // 탭 소리를 못 잡았을 때만 직접 섞는다
      mixCtx = mixCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (mixCtx.state === 'suspended') mixCtx.resume();
      const dest = mixCtx.createMediaStreamDestination();
      els.forEach(el => {
        if (!el._pmSource) {            // 같은 <audio>에 소스는 한 번만 만들 수 있음
          el._pmSource = mixCtx.createMediaElementSource(el);
          el._pmSource.connect(mixCtx.destination);
        }
        el._pmSource.connect(dest);
      });
      a = dest.stream.getAudioTracks();
    }
    return new MediaStream([...v, ...a]);
  }

  function pickMime() {
    const list = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }

  async function countdown() {
    const n = prep.querySelector('.n'), t = prep.querySelector('.t');
    t.innerHTML = '녹화가 시작되면 화면의 버튼은 모두 숨겨져요<br>← → 로 장면을 넘기고, <b>R</b> 또는 <b>Esc</b> 로 끝내요';
    prep.classList.add('show');
    for (let i = 3; i >= 1; i--) { n.textContent = i; await new Promise(r => setTimeout(r, 900)); }
    prep.classList.remove('show');
  }

  async function startClean() {
    if (isRecording()) return;
    try { displayStream = await captureThisTab(); }
    catch (e) { toast('⚠️ 화면 공유가 취소됐어요. 공유 창에서 "이 탭"을 선택해주세요'); return; }

    if (typeof deselectAllChars === 'function') deselectAllChars();
    if (typeof stopAutoIfPlaying === 'function') stopAutoIfPlaying();

    await countdown();
    document.body.classList.add('rec-clean');

    // 설정한 타이밍대로 1장면부터 자동 진행 (편곡본이 있으면 곡 길이에 맞춰 균등 분배)
    tp.classList.remove('show');
    stopAllTracks(); if (typeof updateMusicPlayBtn === 'function') updateMusicPlayBtn();

    const stream = buildStream(displayStream);
    chunks = []; seconds = 0;
    const mime = pickMime();
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: (mime.split(';')[0]) || 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const title = (typeof DATA !== 'undefined' && DATA && DATA.title) ? DATA.title.trim() : 'EAIM';
      a.download = `${title}_슬라이드쇼_${new Date().toISOString().slice(0, 10)}.webm`;
      a.click();
      displayStream.getTracks().forEach(t => t.stop());
      toast('🎬 영상 저장 완료');
    };
    displayStream.getVideoTracks()[0].addEventListener('ended', () => { if (isRecording()) stopClean(); }); // 브라우저 "공유 중지" 눌렀을 때
    recorder.start(1000);
    startAutoRun();

    timer = setInterval(() => { seconds++; document.title = `● ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} 녹화 중`; }, 1000);
    const btn = $('btn-rec'); if (btn) { btn.textContent = '⏹'; btn.classList.add('is-recording'); btn.style.color = '#ff5252'; }
  }

  function stopClean(msg) {
    if (!isRecording()) return;
    stopSync(); stopAllTracks();
    recorder.stop();
    clearInterval(timer); document.title = document.title.replace(/^● .*녹화 중$/, 'EAIM 슬라이드쇼');
    document.body.classList.remove('rec-clean');
    const el = (typeof arrangementAudioEl !== 'undefined') ? arrangementAudioEl : null;
    if (el) { el.loop = true; if (typeof updateMusicPlayBtn === 'function') updateMusicPlayBtn(); }
    const btn = $('btn-rec'); if (btn) { btn.textContent = '⏺'; btn.classList.remove('is-recording'); btn.style.color = ''; }
    toast(msg || '⏹ 녹화 종료 — 저장 중…');
  }

  // ── 키보드: R / Esc 로 종료 (Esc의 "나가기"는 녹화 중엔 막음) ──
  document.addEventListener('keydown', (e) => {
    if (!isRecording()) return;
    if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') { e.stopImmediatePropagation(); e.preventDefault(); stopClean(); }
  }, true);

  // ── 커튼콜 크레딧이 다 올라가면 자동 종료 ──
  if (typeof window.startCreditsScroll === 'function') {
    const orig = window.startCreditsScroll;
    window.startCreditsScroll = function () {
      const r = orig.apply(this, arguments);
      const dur = (typeof window._pmCreditsDur === 'number' && window._pmCreditsDur > 0)
        ? window._pmCreditsDur
        : Math.max(12, ((typeof DATA !== 'undefined' && DATA && DATA.credits) || []).length * 2.2 + 10);
      setTimeout(() => { if (isRecording()) stopClean('🎭 막이 내려 녹화를 마쳤어요'); }, dur * 1000 + 1500);
      return r;
    };
  }

  // ── 기존 녹화 함수를 교체 ──
  if (typeof window.beginScreenRecording === 'function') {
    // 미디어레터판: 체크리스트 → confirmStartRecording → beginScreenRecording
    window.beginScreenRecording = startClean;
    window.stopScreenRecording = () => stopClean();
    window.toggleRecording = function () { if (isRecording()) stopClean(); else if (typeof openRecChecklist === 'function') openRecChecklist(); else startClean(); };
  } else {
    // 뮤지컬메이커판: toggleRecording 하나
    window.toggleRecording = function () { if (isRecording()) stopClean(); else startClean(); };
  }

  // ── 보너스: 장면에 audioUrl(생성한 노래)이 있으면 그 장면에서 자동 재생 ──
  let sceneAudio = null;
  if (typeof window.doShowSlide === 'function') {
    const orig = window.doShowSlide;
    window.doShowSlide = function (idx) {
      const r = orig.apply(this, arguments);
      try {
        if (sceneAudio) { sceneAudio.pause(); sceneAudio = null; }
        const scenes = (typeof SCENES !== 'undefined') ? SCENES : [];
        const total = scenes.length;
        let url = null;
        if (idx >= 1 && idx <= total) url = scenes[idx - 1]?.audioUrl || null;
        else if (idx === total + 1 && typeof DATA !== 'undefined' && DATA) url = DATA.curtainAudioUrl || null;
        const hasArrangement = (typeof arrangementAudioEl !== 'undefined') && arrangementAudioEl && !arrangementAudioEl.paused;
        if (url && !hasArrangement) {
          sceneAudio = new Audio(url); sceneAudio.crossOrigin = 'anonymous'; sceneAudio.volume = 0.8;
          sceneAudio.addEventListener('ended', () => { if (window._pmSceneAudioEnded) window._pmSceneAudioEnded(); }, { once: true });
          sceneAudio.play().catch(() => {});
        } else if (!url && window._pmSceneAudioEnded && typeof timing !== 'undefined' && timing.mode === 'scene') {
          // 노래 없는 장면은 고정 시간만큼 보여주고 넘어감
          setTimeout(() => { if (typeof current !== 'undefined' && current === idx) window._pmSceneAudioEnded(); }, (timing.fixedSec || 7) * 1000);
        }
      } catch (e) { console.warn(e); }
      return r;
    };
  }
})();
