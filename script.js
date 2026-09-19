(() => {
  'use strict';

  // ---------- chapter metadata (for navigator) ----------
  const CHAPTERS = [
    { num: 1,  name: 'Color',     img: 'images/Unknown-1.jpeg' },
    { num: 2,  name: 'Superpower',img: 'images/Unknown-2.jpeg' },
    { num: 3,  name: 'Art',       img: 'images/Unknown-3.jpeg' },
    { num: 4,  name: 'Book',      img: 'images/Unknown-4.jpeg' },
    { num: 5,  name: 'Verse',     img: 'images/Unknown-5.jpeg' },
    { num: 6,  name: 'Place',     img: 'images/Unknown-6.jpeg' },
    { num: 7,  name: 'Prayer',    img: 'images/Unknown-7.jpeg' },
    { num: 8,  name: 'Character', img: 'images/Unknown-8.jpeg' },
    { num: 9,  name: 'Song',      img: 'images/Unknown-9.jpeg' },
    { num: 10, name: 'Person',    img: 'images/Unknown-10.jpeg' },
  ];
  const TOTAL = CHAPTERS.length;

  // ---------- state ----------
  let current = 1;                 // 1-indexed chapter number
  let isTransitioning = false;
  let lineTimers = [];              // active setTimeout ids for the current chapter's line reveal
  let linesFullyRevealed = false;   // whether all lines of current chapter are visible
  let endSequenceStarted = false;

  // ---------- dom refs ----------
  const introEl = document.getElementById('intro');
  const enterBtn = document.getElementById('enterBtn');
  const experienceEl = document.getElementById('experience');
  const stageEl = document.getElementById('stage');
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const chapNumEl = document.getElementById('chapNum');
  const progressFillEl = document.getElementById('progressFill');
  const chapterIndicatorBtn = document.getElementById('chapterIndicator');
  const skipBtn = document.getElementById('skipBtn');
  const continueBtn = document.getElementById('continueBtn');
  const navigatorEl = document.getElementById('navigator');
  const navigatorGrid = document.getElementById('navigatorGrid');
  const closeNavBtn = document.getElementById('closeNav');
  const endLineEl = document.getElementById('endLine');
  const replayBtn = document.getElementById('replayBtn');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- build navigator ----------
  function buildNavigator(){
    navigatorGrid.innerHTML = '';
    CHAPTERS.forEach(ch => {
      const item = document.createElement('button');
      item.className = 'nav-item';
      item.setAttribute('data-nav-target', ch.num);
      item.innerHTML = `
        <span class="nav-thumb"><img src="${ch.img}" alt="" loading="lazy"></span>
        <span class="nav-num">${String(ch.num).padStart(2,'0')}</span>
        <span class="nav-name">${ch.name}</span>
      `;
      item.addEventListener('click', () => {
        closeNavigator();
        goToChapter(ch.num, true);
      });
      navigatorGrid.appendChild(item);
    });
  }
  buildNavigator();

  function markCurrentInNavigator(){
    Array.from(navigatorGrid.children).forEach(item => {
      item.classList.toggle('is-current', Number(item.getAttribute('data-nav-target')) === current);
    });
  }

  // ---------- intro ----------
  function enterExperience(){
    introEl.classList.add('hidden');
    experienceEl.classList.add('active');
    experienceEl.setAttribute('aria-hidden', 'false');
    setTimeout(() => activateChapter(1, 'forward'), 550);
  }
  enterBtn.addEventListener('click', enterExperience);
  enterBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterExperience(); }
  });

  // ---------- line reveal sequencing ----------
  function clearLineTimers(){
    lineTimers.forEach(t => clearTimeout(t));
    lineTimers = [];
  }

  function getChapterEl(num){
    return chapters.find(c => Number(c.dataset.chapter) === num);
  }

  function revealLinesSequentially(chapterEl){
    clearLineTimers();
    linesFullyRevealed = false;
    const lines = Array.from(chapterEl.querySelectorAll('.line'));
    lines.forEach(l => l.classList.remove('is-visible'));

    if (prefersReducedMotion){
      lines.forEach(l => l.classList.add('is-visible'));
      linesFullyRevealed = true;
      return;
    }

    const baseDelay = 650; // wait for title-in to mostly finish
    const gap = 900;       // gap between successive lines

    lines.forEach((line, i) => {
      const t = setTimeout(() => {
        line.classList.add('is-visible');
        if (i === lines.length - 1) linesFullyRevealed = true;
      }, baseDelay + i * gap);
      lineTimers.push(t);
    });
  }

  function revealAllLinesInstantly(chapterEl){
    clearLineTimers();
    const lines = Array.from(chapterEl.querySelectorAll('.line'));
    lines.forEach(l => l.classList.add('is-visible'));
    linesFullyRevealed = true;
  }

  // ---------- chapter activation ----------
  function updateChrome(){
    chapNumEl.textContent = String(current).padStart(2, '0');
    const pct = (current / TOTAL) * 100;
    progressFillEl.style.width = pct + '%';
    markCurrentInNavigator();
  }

  function activateChapter(num, direction){
    const target = getChapterEl(num);
    if (!target) return;

    chapters.forEach(c => {
      if (c !== target){
        c.classList.remove('is-active');
        c.classList.add('is-leaving');
      }
    });

    // force reflow so re-triggering CSS animation works when revisiting a chapter
    target.classList.remove('is-active');
    void target.offsetWidth;
    target.classList.add('is-active');
    target.classList.remove('is-leaving');

    current = num;
    updateChrome();
    revealLinesSequentially(target);

    // clean up leaving chapters after their transition would be done
    setTimeout(() => {
      chapters.forEach(c => { if (c !== target) c.classList.remove('is-leaving'); });
    }, 1600);

    if (num === TOTAL){
      startEndSequence();
    } else {
      endSequenceStarted = false;
      endLineEl.classList.remove('is-visible');
      replayBtn.classList.remove('is-visible');
    }
  }

  function goToChapter(num, fromNavigator){
    if (num < 1 || num > TOTAL) return;
    if (isTransitioning) return;
    isTransitioning = true;
    activateChapter(num, num > current ? 'forward' : 'backward');
    setTimeout(() => { isTransitioning = false; }, 550);
  }

  function nextChapter(){
    if (isTransitioning) return;

    // Skip-safety: if lines are still revealing, complete them first instead of advancing
    if (!linesFullyRevealed && !prefersReducedMotion){
      const activeEl = getChapterEl(current);
      revealAllLinesInstantly(activeEl);
      // brief pause so the newly-revealed text is actually readable before moving on
      isTransitioning = true;
      setTimeout(() => {
        isTransitioning = false;
        if (current < TOTAL) goToChapter(current + 1);
      }, 900);
      return;
    }

    if (current < TOTAL){
      goToChapter(current + 1);
    }
  }

  function prevChapter(){
    if (isTransitioning) return;
    if (current > 1) goToChapter(current - 1);
  }

  // ---------- end sequence (chapter 10) ----------
  function startEndSequence(){
    if (endSequenceStarted) return;
    endSequenceStarted = true;
    const t1 = setTimeout(() => endLineEl.classList.add('is-visible'), prefersReducedMotion ? 1200 : 5200);
    const t2 = setTimeout(() => replayBtn.classList.add('is-visible'), prefersReducedMotion ? 1600 : 5800);
    lineTimers.push(t1, t2);
  }

  function replayExperience(){
    endSequenceStarted = false;
    endLineEl.classList.remove('is-visible');
    replayBtn.classList.remove('is-visible');
    goToChapter(1);
  }
  replayBtn.addEventListener('click', replayExperience);

  // ---------- controls ----------
  continueBtn.addEventListener('click', nextChapter);
  skipBtn.addEventListener('click', nextChapter);

  chapterIndicatorBtn.addEventListener('click', openNavigator);

  function openNavigator(){
    navigatorEl.classList.add('open');
    navigatorEl.setAttribute('aria-hidden', 'false');
    markCurrentInNavigator();
  }
  function closeNavigator(){
    navigatorEl.classList.remove('open');
    navigatorEl.setAttribute('aria-hidden', 'true');
  }
  closeNavBtn.addEventListener('click', closeNavigator);

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (!experienceEl.classList.contains('active')) return;

    if (navigatorEl.classList.contains('open')){
      if (e.key === 'Escape'){ e.preventDefault(); closeNavigator(); }
      return;
    }

    switch (e.key){
      case 'ArrowRight':
        e.preventDefault(); nextChapter(); break;
      case 'ArrowLeft':
        e.preventDefault(); prevChapter(); break;
      case ' ':
        e.preventDefault(); nextChapter(); break;
      case 'Escape':
        e.preventDefault(); openNavigator(); break;
    }
  });

  // ---------- swipe ----------
  let touchStartX = 0, touchStartY = 0;
  experienceEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  experienceEl.addEventListener('touchend', (e) => {
    if (navigatorEl.classList.contains('open')) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) nextChapter();
    else prevChapter();
  }, { passive: true });

  // click on left/right thirds of screen also navigates (desktop-friendly, avoids chrome elements)
  stageEl.addEventListener('click', (e) => {
    if (isTransitioning) return;
    if (e.target.closest('.chapter-content') || e.target.closest('button')) return;
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.28) prevChapter();
    else if (x > w * 0.72) nextChapter();
  });

})();
