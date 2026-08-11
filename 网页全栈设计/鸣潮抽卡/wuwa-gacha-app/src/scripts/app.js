// 鸣潮纯 DOM 控件与属性代表色 + 右侧透明渐变过度角色名字卡片 App.js

document.addEventListener('DOMContentLoaded', () => {
  // DOM 元素引用
  const bgCanvas = document.getElementById('bg-canvas');
  const currencyAmountEl = document.getElementById('currency-amount');
  const currencyIconEl = document.getElementById('currency-icon-img');
  const addCurrencyBtn = document.getElementById('add-currency-btn');
  const skipToggleBtn = document.getElementById('skip-toggle');
  
  const btnPullOne = document.getElementById('btn-pull-one');
  const btnPullTen = document.getElementById('btn-pull-ten');
  const costIconOne = document.getElementById('cost-icon-one');
  const costIconTen = document.getElementById('cost-icon-ten');
  
  const btnHistory = document.getElementById('btn-history');
  const btnDisclaimer = document.getElementById('btn-disclaimer');
  
  // 动态 Banner 渲染元素
  const bannerSubtitleEl = document.getElementById('banner-subtitle');
  const bannerMainTitleEl = document.getElementById('banner-main-title');
  const spotlightImgEl = document.getElementById('spotlight-img');
  const charBadgesContainer = document.getElementById('char-badges-container');
  const rateupContainer = document.getElementById('rateup-container');
  
  // 弹窗元素
  const animPortal = document.getElementById('gacha-animation-portal');
  const animMeteorBeam = document.getElementById('anim-meteor-beam');
  const animSkipBtn = document.getElementById('anim-skip-btn');
  
  const resultModal = document.getElementById('gacha-result-modal');
  const resultSingleContainer = document.getElementById('result-single-container');
  const resultTenGrid = document.getElementById('result-ten-grid');
  const btnConfirmResult = document.getElementById('btn-confirm-result');
  const btnPullAgainTen = document.getElementById('btn-pull-again-ten');
  
  const historyModal = document.getElementById('history-modal');
  const historyCloseBtn = document.getElementById('history-close-btn');
  const historyTableBody = document.getElementById('history-table-body');
  const pityStat5El = document.getElementById('pity-stat-5');
  const pityStat4El = document.getElementById('pity-stat-4');
  const pityStatGuaranteedEl = document.getElementById('pity-stat-guaranteed');
  
  const disclaimerModal = document.getElementById('disclaimer-modal');
  const disclaimerCloseBtn = document.getElementById('disclaimer-close-btn');

  let isSkipAnimation = false;
  let currentBanner = 'jiyan'; // 默认进入第一页 (马克思 UP 角色活动卡池)

  // 多卡池配置表 (属性代表色 + 纯正徽章图标)
  const BANNER_CONFIGS = {
    'jiyan': {
      subtitle: '角色活动唤取',
      title: '夜将寒色去',
      artwork: '/public/images/marx_banner.jpg',
      currencyIcon: '/public/images/ticket_icon.png',
      badges: [
        { name: '马克思', elemClass: 'elem-fire', icon: '/public/images/elem_icon_fusion.png', isUp: true }
      ],
      showRateUp: true
    },
    'std-char': {
      subtitle: '角色常驻唤取',
      title: '海上共潮生',
      artwork: '/public/images/haishang_characters_transparent.png',
      currencyIcon: '/public/images/currency_tide_gold.png',
      badges: [
        { name: '安可', elemClass: 'elem-fire', icon: '/public/images/elem_icon_fusion.png', isUp: false },
        { name: '鉴心', elemClass: 'elem-wind', icon: '/public/images/elem_icon_aero.png', isUp: false },
        { name: '凌阳', elemClass: 'elem-ice', icon: '/public/images/elem_icon_glacio.png', isUp: false }
      ],
      showRateUp: false
    },
    'weapon': {
      subtitle: '武器活动唤取',
      title: '重霄苍鳞刀',
      artwork: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800',
      currencyIcon: '/public/images/ticket_icon.png',
      badges: [
        { name: '苍鳞千嶂', elemClass: 'elem-wind', icon: '/public/images/elem_icon_aero.png', isUp: true }
      ],
      showRateUp: false
    },
    'std-weapon': {
      subtitle: '常驻武器唤取',
      title: '迅刀配枪集',
      artwork: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      currencyIcon: '/public/images/currency_tide_gold.png',
      badges: [
        { name: '常驻5星武器', elemClass: 'elem-ice', icon: '/public/images/elem_icon_glacio.png', isUp: false }
      ],
      showRateUp: false
    }
  };

  // 切池渲染逻辑
  function switchBanner(bannerKey) {
    currentBanner = bannerKey;
    const cfg = BANNER_CONFIGS[bannerKey] || BANNER_CONFIGS['jiyan'];

    bannerSubtitleEl.textContent = cfg.subtitle;
    bannerMainTitleEl.textContent = cfg.title;
    spotlightImgEl.src = cfg.artwork;

    currencyIconEl.src = cfg.currencyIcon;
    costIconOne.src = cfg.currencyIcon;
    costIconTen.src = cfg.currencyIcon;

    // 渲染 1:1 官方角色名字卡片组件 (左侧代表色块 + 右侧透明渐变过度，无外框硬边)
    charBadgesContainer.innerHTML = cfg.badges.map(b => `
      <div class="wuwa-char-name-card">
        <div class="card-elem-box ${b.elemClass}">
          <img src="${b.icon}" class="card-elem-icon" alt="属性">
        </div>
        <div class="card-info-box">
          <div class="card-name-row">
            <span class="card-char-name">${b.name}</span>
            ${b.isUp ? '<span class="card-up-tag">UP! ↑</span>' : ''}
          </div>
          <div class="card-stars-row">
            <span class="star-diamond">✦</span>
            <span class="star-diamond">✦</span>
            <span class="star-diamond">✦</span>
            <span class="star-diamond">✦</span>
            <span class="star-diamond">✦</span>
          </div>
        </div>
      </div>
    `).join('');

    // 控制 4 星提升展区显示/隐藏
    if (cfg.showRateUp) {
      rateupContainer.style.display = 'flex';
    } else {
      rateupContainer.style.display = 'none';
    }
  }

  // 初始化 UI 状态
  function updateUIState() {
    currencyAmountEl.textContent = window.gachaEngine.tickets;
  }

  updateUIState();
  switchBanner('jiyan');

  // 背景 Canvas 气动微粒
  if (bgCanvas) {
    const ctx = bgCanvas.getContext('2d');
    let width = bgCanvas.width = window.innerWidth;
    let height = bgCanvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = bgCanvas.width = window.innerWidth;
      height = bgCanvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.2 + 0.5,
      vy: (Math.random() - 0.5) * 0.8 - 0.3,
      size: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.3 ? '#22d3ee' : '#34d399'
    }));

    function renderCanvas() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;
        if (p.y > height) p.y = 0;
        if (p.y < 0) p.y = height;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      });
      requestAnimationFrame(renderCanvas);
    }
    renderCanvas();
  }

  // 跳过动画 Switch
  skipToggleBtn.addEventListener('click', () => {
    isSkipAnimation = !isSkipAnimation;
    if (isSkipAnimation) {
      skipToggleBtn.classList.add('active');
    } else {
      skipToggleBtn.classList.remove('active');
    }
    window.soundFX.playClick();
  });

  // 充值 10 抽
  addCurrencyBtn.addEventListener('click', () => {
    const newTotal = window.gachaEngine.addTickets(10);
    updateUIState();
    window.soundFX.playClick();
  });

  // 侧边栏卡池切池绑定
  const bannerTabs = document.querySelectorAll('.banner-tab-item');
  bannerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      bannerTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const bKey = tab.getAttribute('data-banner');
      switchBanner(bKey);
      window.soundFX.playClick();
    });
  });

  // 执行唤取
  function executePull(count) {
    window.soundFX.playClick();

    if (window.gachaEngine.tickets < count) {
      alert('唤取道具数量不足！已自动为您补充 10 抽。');
      window.gachaEngine.addTickets(10);
      updateUIState();
      return;
    }

    const pullResult = count === 1 
      ? window.gachaEngine.pullSingle(currentBanner)
      : window.gachaEngine.pullTen(currentBanner);

    if (pullResult.error) {
      alert('唤取失败：道具不足！');
      return;
    }

    updateUIState();

    if (isSkipAnimation) {
      showResultsModal(count, pullResult);
    } else {
      playGachaAnimation(count, pullResult);
    }
  }

  btnPullOne.addEventListener('click', () => executePull(1));
  btnPullTen.addEventListener('click', () => executePull(10));
  btnPullAgainTen.addEventListener('click', () => executePull(10));

  // 播放抽卡流星动画
  function playGachaAnimation(count, pullResult) {
    const maxRarity = count === 1 ? pullResult.item.rarity : pullResult.maxRarity;
    
    animMeteorBeam.className = 'gacha-meteor-beam';
    if (maxRarity === 5) {
      animMeteorBeam.classList.add('gold');
      window.soundFX.playGoldDrop();
    } else if (maxRarity === 4) {
      animMeteorBeam.classList.add('purple');
      window.soundFX.playPurpleDrop();
    } else {
      window.soundFX.playSummonLaunch();
    }

    animPortal.classList.add('active');

    const timer = setTimeout(() => {
      closeAnimationPortal();
      showResultsModal(count, pullResult);
    }, 1400);

    animSkipBtn.onclick = () => {
      clearTimeout(timer);
      closeAnimationPortal();
      showResultsModal(count, pullResult);
    };
  }

  function closeAnimationPortal() {
    animPortal.classList.remove('active');
  }

  // 结果弹窗
  function showResultsModal(count, pullResult) {
    resultModal.classList.add('active');

    if (count === 1) {
      resultSingleContainer.style.display = 'flex';
      resultTenGrid.style.display = 'none';

      const item = pullResult.item;
      resultSingleContainer.innerHTML = `
        <div class="single-card-frame rarity-${item.rarity}">
          <img src="${item.img}" class="single-card-img" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400'">
          <div class="single-card-info">
            <div class="single-card-name">${item.elementIcon || ''} ${item.name}</div>
            <div class="single-card-stars">${item.stars}</div>
          </div>
        </div>
      `;
    } else {
      resultSingleContainer.style.display = 'none';
      resultTenGrid.style.display = 'grid';

      resultTenGrid.innerHTML = pullResult.items.map((item, idx) => `
        <div class="grid-card-item rarity-${item.rarity}" style="animation-delay: ${idx * 0.05}s">
          <img src="${item.img}" class="grid-card-img" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400'">
          <div class="grid-card-overlay">
            <div class="grid-item-name">${item.name}</div>
            <div class="grid-item-stars">${item.stars}</div>
          </div>
        </div>
      `).join('');
    }
  }

  btnConfirmResult.addEventListener('click', () => {
    resultModal.classList.remove('active');
    window.soundFX.playClick();
  });

  // 唤取记录弹窗
  btnHistory.addEventListener('click', () => {
    window.soundFX.playClick();
    renderHistoryModal();
    historyModal.classList.add('active');
  });

  historyCloseBtn.addEventListener('click', () => {
    historyModal.classList.remove('active');
    window.soundFX.playClick();
  });

  function renderHistoryModal() {
    pityStat5El.textContent = `${window.gachaEngine.pity5Star} / 80`;
    pityStat4El.textContent = `${window.gachaEngine.pity4Star} / 10`;
    pityStatGuaranteedEl.textContent = window.gachaEngine.guaranteedUp5 ? '大保底 (必出UP)' : '小保底 (50%UP)';

    const history = window.gachaEngine.history;
    if (history.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#9ca3af;">暂无唤取记录</td></tr>`;
      return;
    }

    historyTableBody.innerHTML = history.slice(0, 30).map(row => `
      <tr class="item-${row.rarity}star">
        <td>${row.time}</td>
        <td>${row.name}</td>
        <td>${'★'.repeat(row.rarity)}</td>
        <td>${row.type}</td>
      </tr>
    `).join('');
  }

  // 免责声明
  btnDisclaimer.addEventListener('click', () => {
    window.soundFX.playClick();
    disclaimerModal.classList.add('active');
  });

  disclaimerCloseBtn.addEventListener('click', () => {
    disclaimerModal.classList.remove('active');
    window.soundFX.playClick();
  });
});
