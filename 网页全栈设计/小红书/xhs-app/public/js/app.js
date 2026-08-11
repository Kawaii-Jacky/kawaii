// =========================================================
// Xiaohongshu (小红书) Web App Frontend Application Script
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let posts = [];
  let currentCategory = '推荐';
  let activePostId = null;
  let isMobileFrame = true;

  // DOM Elements
  const colLeft = document.getElementById('colLeft');
  const colRight = document.getElementById('colRight');
  const categoryTrack = document.getElementById('categoryTrack');
  const postModal = document.getElementById('postModal');
  const createModal = document.getElementById('createModal');
  const searchModal = document.getElementById('searchModal');
  const appViewport = document.getElementById('appViewport');

  // Detail Modal Elements
  const detailImage = document.getElementById('detailImage');
  const detailAvatar = document.getElementById('detailAvatar');
  const detailAuthor = document.getElementById('detailAuthor');
  const detailLocation = document.getElementById('detailLocation');
  const detailTitle = document.getElementById('detailTitle');
  const detailContent = document.getElementById('detailContent');
  const detailTags = document.getElementById('detailTags');
  const detailTime = document.getElementById('detailTime');
  const commentsList = document.getElementById('commentsList');
  const commentCount = document.getElementById('commentCount');
  const inputComment = document.getElementById('inputComment');
  const btnSendComment = document.getElementById('btnSendComment');
  const btnModalLike = document.getElementById('btnModalLike');
  const iconModalLike = document.getElementById('iconModalLike');
  const txtModalLikes = document.getElementById('txtModalLikes');

  // 1. Fetch Posts from API
  async function loadPosts(category = '', search = '') {
    try {
      let url = '/api/posts';
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      posts = await res.json();
      renderWaterfall(posts);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  }

  // 2. Render 2-Column Waterfall Masonry
  function renderWaterfall(data) {
    colLeft.innerHTML = '';
    colRight.innerHTML = '';

    data.forEach((post, index) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.dataset.id = post.id;

      card.innerHTML = `
        <div class="card-img-wrapper">
          <img src="${post.image}" class="card-img" alt="${post.title}" loading="lazy">
        </div>
        <div class="card-info">
          <div class="card-title">${post.title}</div>
          <div class="card-author-row">
            <div class="author-left">
              <img src="${post.avatar}" class="author-avatar" alt="${post.author}">
              <span class="author-name-text">${post.author}</span>
            </div>
            <button class="like-btn ${post.isLiked ? 'liked' : ''}" data-id="${post.id}">
              <i class="${post.isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
              <span class="like-count">${post.likes}</span>
            </button>
          </div>
        </div>
      `;

      // Distribute evenly between left and right columns
      if (index % 2 === 0) {
        colLeft.appendChild(card);
      } else {
        colRight.appendChild(card);
      }

      // Event listener for opening detail modal
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.like-btn')) {
          openPostDetail(post.id);
        }
      });

      // Event listener for like button
      const likeBtn = card.querySelector('.like-btn');
      likeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await toggleLike(post.id);
      });
    });
  }

  // 3. Toggle Like Functionality
  async function toggleLike(id) {
    try {
      const res = await fetch(`/api/posts/${id}/like`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const post = posts.find(p => p.id === id);
        if (post) {
          post.isLiked = data.isLiked;
          post.likes = data.likes;

          // Update DOM element card
          const cardLikeBtn = document.querySelector(`.note-card[data-id="${id}"] .like-btn`);
          if (cardLikeBtn) {
            cardLikeBtn.className = `like-btn ${post.isLiked ? 'liked' : ''}`;
            cardLikeBtn.innerHTML = `
              <i class="${post.isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
              <span class="like-count">${post.likes}</span>
            `;
          }

          // If detail modal is currently open for this post
          if (activePostId === id) {
            updateModalLikeState(post);
          }
        }
      }
    } catch (err) {
      console.error('Like request failed:', err);
    }
  }

  // 4. Open Post Detail Drawer Modal
  function openPostDetail(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    activePostId = id;

    detailImage.src = post.image;
    detailAvatar.src = post.avatar;
    detailAuthor.textContent = post.author;
    detailLocation.textContent = post.location || '厦门市';
    detailTitle.textContent = post.title;
    detailContent.textContent = post.content;
    detailTime.textContent = `${post.time} · 发布于 ${post.location || '厦门'}`;

    // Render tags
    detailTags.innerHTML = post.tags
      .map(tag => `<span class="tag-pill">#${tag}</span>`)
      .join(' ');

    // Render comments
    renderComments(post.comments || []);
    updateModalLikeState(post);

    postModal.classList.add('active');
  }
  //更新
  function updateModalLikeState(post) {
    txtModalLikes.textContent = post.likes;
    if (post.isLiked) {
      btnModalLike.classList.add('liked');
      iconModalLike.className = 'fa-solid fa-heart';
    } else {
      btnModalLike.classList.remove('liked');
      iconModalLike.className = 'fa-regular fa-heart';
    }
  }
  //渲染评论
  function renderComments(comments) {
    commentCount.textContent = comments.length;
    commentsList.innerHTML = comments
      .map(c => `
        <div class="comment-item">
          <span class="comment-user">${c.user}</span>
          <span class="comment-text">${c.text}</span>
        </div>
      `)
      .join('');
  }

  // 发送评论
  btnSendComment.addEventListener('click', async () => {
    const text = inputComment.value.trim();
    if (!text || !activePostId) return;

    try {
      const res = await fetch(`/api/posts/${activePostId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, user: "小红薯老玩家" })
      });
      const data = await res.json();
      if (data.success) {
        const post = posts.find(p => p.id === activePostId);
        if (post) {
          post.comments.unshift(data.comment);
          renderComments(post.comments);
          inputComment.value = '';
        }
      }
    } catch (err) {
      console.error('Comment failed:', err);
    }
  });

  // 模态框点赞事件
  btnModalLike.addEventListener('click', async () => {
    if (activePostId) {
      await toggleLike(activePostId);
    }
  });

  // 模态框关闭按钮
  document.getElementById('btnClosePostModal').addEventListener('click', () => {
    postModal.classList.remove('active');
    activePostId = null;
  });
  //创建模态框关闭按钮
  document.getElementById('btnCloseCreateModal').addEventListener('click', () => {
    createModal.classList.remove('active');
  });
  //搜索模态框关闭按钮  
  document.getElementById('btnCloseSearchModal').addEventListener('click', () => {
    searchModal.classList.remove('active');
  });

  //分类标签处理程序
  categoryTrack.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-pill');
    if (!btn) return;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    loadPosts(currentCategory);
  });

  //主导航标签处理程序
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      if (tabName === 'local') {
        loadPosts('', '厦门');
      } else {
        loadPosts(currentCategory);
      }
    });
  });

  //创建笔记
  document.getElementById('btnOpenCreate').addEventListener('click', () => {
    createModal.classList.add('active');
  });
  document.getElementById('btnBottomCreate').addEventListener('click', () => {
    createModal.classList.add('active');
  });

  document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('createTitle').value;
    const content = document.getElementById('createContent').value;
    const image = document.getElementById('createImage').value;
    const category = document.getElementById('createCategory').value;

    try {
      const res = await fetch('/api/posts', {//向后端发送post请求；res:响应对象
        method: 'POST',//方法：post
        headers: { 'Content-Type': 'application/json' },//content-type:请求头，application/json:json数据
        body: JSON.stringify({ title, content, image, category })//stringify:将对象转换为字符串
      });
      const data = await res.json();//res.json:将响应体解析为json对象；await：等待异步操作完成
      if (data.success) {//如果成功
        createModal.classList.remove('active');//关闭模态框
        document.getElementById('createForm').reset();//重置表单
        await loadPosts(currentCategory);//重新加载帖子
      }
    } catch (err) {
      console.error('Publish failed:', err);
    }
  });

  //搜索处理程序
  document.getElementById('btnHeaderSearch').addEventListener('click', () => {
    searchModal.classList.add('active');
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    const q = e.target.value.trim();
    loadPosts('', q);
  });

  document.querySelectorAll('.hot-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const keyword = tag.textContent.replace(/[0-9]/g, '').trim();
      searchModal.classList.remove('active');
      loadPosts('', keyword);
    });
  });

  //桌面/移动端切换
  document.getElementById('btnToggleDevice').addEventListener('click', () => {
    isMobileFrame = !isMobileFrame;
    if (isMobileFrame) {
      appViewport.className = 'app-viewport mobile-frame';
    } else {
      appViewport.className = 'app-viewport fullscreen';
    }
  });

  // Initial Load
  loadPosts('推荐');
});
