/* =========================================================
   MELLOW BEAN — 페이지 동작
   1. 표지 → 스크롤 페이지 (표지는 '메뉴 보기'로 넘기고, 그다음은 스크롤)
   2. Now playing 레코드판 재생/멈춤
   3. 지금 영업 중인지 표시 (한국 시간 기준)
   4. 주소 복사
   5. 하단 연도
   ========================================================= */

const OPEN_HOUR = 10;   // 10:00
const CLOSE_HOUR = 19;  // 19:00
const CLOSED_DAY = 1;   // 월요일 (일=0, 월=1, ... 토=6)
const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const CHAPTERS = ['menu', 'space', 'visit'];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* 1. 표지 → 스크롤 페이지 ------------------------------ */
// 표지에서는 '메뉴 보기'를 눌러야 넘어가요.
// 넘어간 뒤에는 메뉴부터 보이고, 스크롤하면 장이 하나씩 나타나요.
function setupPages() {
  const body = document.body;
  const header = document.querySelector('.site-header');
  const cover = document.querySelector('.cover');
  const chapters = [...document.querySelectorAll('.chapter')];
  const navLinks = document.querySelectorAll('.gnb a');
  let onCover = true;

  const afterAnimation = (el, ms, done) => {
    if (reduceMotion.matches) { done(); return; }
    let finished = false;
    const finish = () => { if (!finished) { finished = true; done(); } };
    el.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, ms + 100);   // 혹시 animationend가 오지 않을 때 대비
  };

  const jumpTo = (id) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.classList.add('is-visible');
    window.scrollTo({ top: target.offsetTop, behavior: 'instant' });
    onScroll();
  };

  // 표지 → 내용 (id 위치로 바로 이동한 뒤 표지가 위로 넘어가요)
  const leaveCover = (id, animate) => {
    if (!onCover) return;
    onCover = false;
    body.classList.add('has-left-cover');
    header.classList.add('is-solid');
    jumpTo(id);

    if (animate) {
      cover.classList.add('is-leaving');
      afterAnimation(cover, 900, () => {
        if (!onCover) cover.classList.add('is-hidden');
        cover.classList.remove('is-leaving');
      });
      document.getElementById(id)?.querySelector('h2')?.focus({ preventScroll: true });
    } else {
      cover.classList.add('is-hidden');
    }
    history.replaceState(null, '', `#${id}`);
  };

  // 내용 → 표지 (표지가 위에서 내려와 덮어요)
  const returnToCover = () => {
    if (onCover) return;
    onCover = true;
    header.classList.remove('is-solid');
    cover.classList.remove('is-hidden', 'is-leaving');
    cover.classList.add('is-returning');
    afterAnimation(cover, 800, () => {
      cover.classList.remove('is-returning');
      if (!onCover) return;
      body.classList.remove('has-left-cover');
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    history.replaceState(null, '', location.pathname);
  };

  // '메뉴 보기'
  document.querySelector('.cover-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    goDown();
  });

  // 표지에서 스크롤을 내리면 메뉴로, 맨 위에서 스크롤을 올리면 표지로 (잡지 넘기듯)
  let locked = false;   // 넘어가는 동안 스크롤이 겹치지 않게 잠시 잠가요
  const lock = () => {
    locked = true;
    setTimeout(() => { locked = false; }, reduceMotion.matches ? 300 : 1100);
  };
  const goDown = () => {
    if (!onCover || locked) return;
    lock();
    leaveCover('menu', true);
  };
  // 맨 위에 닿은 지 0.4초가 지나야 표지로 돌아가요 (관성 스크롤로 바로 넘어가지 않게)
  let topSince = 0;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 0) topSince = 0;
    else if (!topSince) topSince = Date.now();
  }, { passive: true });

  const goUp = () => {
    if (onCover || locked || window.scrollY > 0) return;
    if (topSince && Date.now() - topSince < 400) return;
    lock();
    returnToCover();
  };

  window.addEventListener('wheel', (event) => {
    if (onCover || locked) event.preventDefault();
    if (event.deltaY > 0) goDown();
    else if (event.deltaY < 0) goUp();
  }, { passive: false });

  let touchY = null;
  window.addEventListener('touchstart', (event) => { touchY = event.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (event) => {
    if (touchY === null) return;
    const dy = touchY - event.touches[0].clientY;   // +: 위로 밀기(아래로 스크롤)
    if (onCover || locked) event.preventDefault();
    if (dy > 40) { goDown(); touchY = null; }
    else if (dy < -60) { goUp(); touchY = null; }
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.target.closest('input, textarea, select')) return;
    if (event.key === ' ' && event.target.closest('button, a')) return;   // 버튼 누르기는 그대로
    if (['ArrowDown', 'PageDown', ' '].includes(event.key) && onCover) {
      event.preventDefault();
      goDown();
    } else if (['ArrowUp', 'PageUp'].includes(event.key)) {
      goUp();
    }
  });

  // 로고, '처음으로' → 표지
  document.querySelectorAll('a[href="#top"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      returnToCover();
    });
  });

  // 스크롤해서 화면에 들어온 장은 떠오르며 나타나고, 상단 메뉴에 표시돼요
  const onScroll = () => {
    if (onCover) return;
    const vh = window.innerHeight;
    let currentId = null;

    chapters.forEach((chapter) => {
      const rect = chapter.getBoundingClientRect();
      if (rect.top < vh * 0.8 && rect.bottom > vh * 0.2) chapter.classList.add('is-visible');
      if (rect.top <= vh * 0.5 && rect.bottom > vh * 0.5) currentId = chapter.id;
    });

    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${currentId}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  let ticking = false;
  const requestCheck = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  };
  window.addEventListener('scroll', requestCheck, { passive: true });
  window.addEventListener('resize', requestCheck);

  // 주소에 #visit 같은 장이 붙어 있으면 표지를 건너뛰고 그 장부터 보여줘요
  const startId = location.hash.slice(1);
  if (CHAPTERS.includes(startId)) leaveCover(startId, false);
}

/* 2. Now playing 레코드판 ------------------------------ */
function setupNowPlaying() {
  const button = document.querySelector('.now-playing');
  if (!button) return;
  const text = button.querySelector('.now-playing-text');

  button.addEventListener('click', () => {
    const playing = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!playing));
    button.setAttribute('aria-label', playing ? '레코드판 돌리기' : '레코드판 멈추기');
    text.textContent = playing ? 'Paused · take a break' : 'Now playing · jazz pop';
  });
}

/* 3. 영업 상태 ---------------------------------------- */
// 방문자가 어느 나라에 있든 한국 시간으로 계산해요.
function getSeoulNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type).value;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    day: weekdays.indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

function getOpenStatus() {
  const { day, minutes } = getSeoulNow();
  const open = OPEN_HOUR * 60;
  const close = CLOSE_HOUR * 60;
  const pad = (h) => `${String(h).padStart(2, '0')}:00`;

  if (day === CLOSED_DAY) {
    return { state: 'closed', text: '오늘은 쉬는 날이에요 · 매주 월요일 휴무' };
  }
  if (minutes < open) {
    return { state: 'closed', text: `오늘 ${pad(OPEN_HOUR)}에 문을 열어요` };
  }
  if (minutes < close) {
    return { state: 'open', text: `지금 영업 중이에요 · ${pad(CLOSE_HOUR)}까지` };
  }

  const tomorrow = (day + 1) % 7;
  if (tomorrow === CLOSED_DAY) {
    const next = DAY_NAMES[(day + 2) % 7];
    return { state: 'closed', text: `오늘 영업은 끝났어요 · ${next} ${pad(OPEN_HOUR)}에 만나요` };
  }
  return { state: 'closed', text: `오늘 영업은 끝났어요 · 내일 ${pad(OPEN_HOUR)}에 만나요` };
}

function updateOpenStatus() {
  const box = document.querySelector('.open-status');
  if (!box) return;
  const { state, text } = getOpenStatus();
  box.dataset.state = state;
  box.querySelector('.status-text').textContent = text;
}

/* 4. 주소 복사 ---------------------------------------- */
function setupCopyAddress() {
  const button = document.getElementById('copy-address');
  const address = document.getElementById('address');
  if (!button || !address) return;

  const original = button.textContent;
  let timer;

  const showDone = (message) => {
    button.textContent = message;
    clearTimeout(timer);
    timer = setTimeout(() => { button.textContent = original; }, 2000);
  };

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address.textContent.trim());
      showDone('복사했어요');
    } catch {
      // 복사가 막힌 환경에서는 주소를 선택해 두어 직접 복사할 수 있게 해요.
      const range = document.createRange();
      range.selectNodeContents(address);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      showDone('주소를 선택했어요');
    }
  });
}

/* 실행 ----------------------------------------------- */
setupPages();
setupNowPlaying();
updateOpenStatus();
setInterval(updateOpenStatus, 60 * 1000);
setupCopyAddress();
document.getElementById('year').textContent = new Date().getFullYear();
