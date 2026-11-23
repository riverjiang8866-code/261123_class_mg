// =========================
// 결혼식 날짜 설정 (여기만 바꾸면 캘린더/카운트다운이 같이 바뀝니다)
// =========================
const WEDDING_DATE = new Date(2027, 3, 17, 13, 0, 0); // 월은 0부터 시작 → 3 = 4월

// =========================
// 1. 캘린더 그리기
// =========================
function renderCalendar() {
  const calendar = document.getElementById("calendar");
  const year = WEDDING_DATE.getFullYear();
  const month = WEDDING_DATE.getMonth();
  const weddingDay = WEDDING_DATE.getDate();

  const firstDow = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const dows = ["일", "월", "화", "수", "목", "금", "토"];

  let html = '<div class="calendar-grid">';

  dows.forEach((d, i) => {
    const cls = i === 0 ? "sun" : i === 6 ? "sat" : "";
    html += `<div class="dow ${cls}">${d}</div>`;
  });

  for (let i = 0; i < firstDow; i++) {
    html += '<div class="day"></div>';
  }

  for (let date = 1; date <= lastDate; date++) {
    const dow = (firstDow + date - 1) % 7;
    const classes = ["day"];
    if (dow === 0) classes.push("sun");
    if (dow === 6) classes.push("sat");
    if (date === weddingDay) classes.push("wedding");
    html += `<div class="${classes.join(" ")}">${date}</div>`;
  }

  html += "</div>";
  calendar.innerHTML = html;
}

// =========================
// 2. D-Day 카운트다운
// =========================
function updateCountdown() {
  const now = new Date();
  const diff = WEDDING_DATE - now;
  const ddayText = document.getElementById("dday-text");

  if (diff <= 0) {
    ["cd-days", "cd-hours", "cd-mins", "cd-secs"].forEach(
      (id) => (document.getElementById(id).textContent = "0")
    );
    ddayText.innerHTML = "민준 ♥ 서연의 결혼식이 <em>진행되었습니다</em>";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  document.getElementById("cd-days").textContent = days;
  document.getElementById("cd-hours").textContent = hours;
  document.getElementById("cd-mins").textContent = mins;
  document.getElementById("cd-secs").textContent = secs;

  // 날짜 기준 D-Day (시간 무시)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weddingDay = new Date(WEDDING_DATE.getFullYear(), WEDDING_DATE.getMonth(), WEDDING_DATE.getDate());
  const dday = Math.round((weddingDay - today) / (1000 * 60 * 60 * 24));
  ddayText.innerHTML = dday === 0
    ? "오늘은 민준 ♥ 서연의 <em>결혼식 날</em>입니다"
    : `민준 ♥ 서연의 결혼식이 <em>${dday}일</em> 남았습니다`;
}

// =========================
// 3. 갤러리 라이트박스
// =========================
function initGallery() {
  const items = document.querySelectorAll(".gallery-item");
  const lightbox = document.getElementById("lightbox");
  const lbImage = document.getElementById("lb-image");
  const total = items.length;
  let current = 0;

  function show(index) {
    current = (index + total) % total;
    lbImage.className = `lb-image p${current}`;
    lbImage.textContent = current + 1;
  }

  function open(index) {
    show(index);
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  items.forEach((item) => {
    item.addEventListener("click", () => open(Number(item.dataset.index)));
  });

  document.getElementById("lb-close").addEventListener("click", close);
  document.getElementById("lb-prev").addEventListener("click", () => show(current - 1));
  document.getElementById("lb-next").addEventListener("click", () => show(current + 1));

  // 배경 클릭 시 닫기
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  // 키보드 조작
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
}

// =========================
// 4. 계좌번호 아코디언
// =========================
function initAccordion() {
  document.querySelectorAll(".accordion").forEach((acc) => {
    const head = acc.querySelector(".accordion-head");
    const body = acc.querySelector(".accordion-body");

    head.addEventListener("click", () => {
      const isOpen = acc.classList.toggle("open");
      body.style.maxHeight = isOpen ? body.scrollHeight + "px" : "0";
    });
  });
}

// =========================
// 5. 복사 & 토스트
// =========================
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard API를 쓸 수 없는 환경(파일로 직접 열기 등) 대비
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
}

function initCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await copyText(btn.dataset.copy);
      showToast("복사되었습니다");
    });
  });
}

// =========================
// 6. 공유하기
// =========================
function initShare() {
  document.getElementById("share-btn").addEventListener("click", async () => {
    const shareData = {
      title: document.title,
      text: "저희 두 사람의 결혼식에 초대합니다.",
      url: location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* 사용자가 공유를 취소한 경우 */
      }
    } else {
      await copyText(location.href);
      showToast("청첩장 링크가 복사되었습니다");
    }
  });
}

// =========================
// 7. 스크롤 등장 애니메이션
// =========================
function initFadeIn() {
  const targets = document.querySelectorAll(".fade-in");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

// =========================
// 실행
// =========================
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  initGallery();
  initAccordion();
  initCopyButtons();
  initShare();
  initFadeIn();
});
