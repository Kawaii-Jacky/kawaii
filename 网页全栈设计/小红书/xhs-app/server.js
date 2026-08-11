const express = require('express');//后端框架
const path = require('path');//路径模块
const fs = require('fs');//文件系统模块

const app = express();//服务器对象
const PORT = process.env.PORT || 3000;//服务器端口

app.use(express.json());//支持json数据
app.use(express.static(path.join(__dirname, 'public')));//托管静态文件

// 内存数据存储
let initialPosts = [
  {
    id: 1,
    title: "fable5真是太夸张了……",
    category: "推荐",
    author: "小红书661170FE",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=fable5",
    image: "/images/card_fable5.png",
    likes: 199,
    isLiked: false,
    content: "沉浸式体验了一整天神仙像素游戏制作器，这个画面细腻度、光影和木纹细节简直离谱！有同款玩家在玩吗？求交流框架逻辑！",
    tags: ["游戏解说", "Fable5", "像素风", "独立游戏"],
    time: "2小时前",
    location: "厦门市 · 软件园",
    comments: [
      { user: "极客小马", text: "光影渲染太赞了，准备入手！", time: "1小时前", likes: 12 },
      { user: "IndieDev", text: "这个UI编辑器看着很丝滑。", time: "30分钟前", likes: 5 }
    ]
  },
  {
    id: 2,
    title: "也是vibe coding了一个电子垃圾",
    category: "推荐",
    author: "杰希不卡",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jexi",
    image: "/images/card_vibecoding.png",
    likes: 10,
    isLiked: false,
    content: "2009年公司写下了“恭喜你毕业了”！用大模型搞了整整一天，终于把这个弹窗纪念版项目开发出来了，感觉又废又可爱好有成就感。谁懂这种Vibe Coding的快乐啊！",
    tags: ["VibeCoding", "程序员日常", "前端开发", "大模型"],
    time: "4小时前",
    location: "杭州市 · 西湖区",
    comments: [
      { user: "前端小菜", text: "我也天天用AI做电子垃圾哈哈哈！", time: "2小时前", likes: 3 }
    ]
  },
  {
    id: 3,
    title: "被ai干翻了",
    category: "推荐",
    author: "Echo",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=echo_designer",
    image: "/images/card_laptop_ai.png",
    likes: 635,
    isLiked: false,
    content: "今天试了一下最新的AI设计工具，直接一键把设计稿和多种整套UI方案全部生成好了！作为一个做了5年的UI设计师，瞬间感到深深的危机感……大家现在都在用什么AI协作工具？",
    tags: ["UI设计", "AI视觉", "设计师日常", "岗位危机"],
    time: "6小时前",
    location: "深圳市 · 南山区",
    comments: [
      { user: "DesignKing", text: "AI只是工具，审美和架构思想还是在人类手里。", time: "5小时前", likes: 84 },
      { user: "Momo", text: "同危机感，现在一个人顶以前三个人的活……", time: "4小时前", likes: 42 }
    ]
  },
  {
    id: 4,
    title: "记录我们四个的第一次旅行",
    category: "推荐",
    author: "1m9",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=traveler_1m9",
    image: "/images/card_travel_girl.png",
    likes: 132,
    isLiked: false,
    content: "终于来到了梦寐以求古镇山谷！窗外是层峦叠嶂的云海青翠，连呼吸都变慢了。姐妹们随手一拍都是大片，这里太适合放空和拍照啦～古风抹胸上衣搭配绝了！",
    tags: ["旅行随手拍", "古风穿搭", "厦门周边游", "宝藏小镇"],
    time: "8小时前",
    location: "福建 · 闽南古村",
    comments: [
      { user: "林妹妹", text: "小姐姐衣服太美啦，求个链接！", time: "7小时前", likes: 19 },
      { user: "摄影师阿强", text: "这采光和景深拿捏得很到位啊。", time: "3小时前", likes: 8 }
    ]
  },
  {
    id: 5,
    title: "Moor AI - 为高敏感人而生的App!",
    category: "RED",
    author: "Moor AI 团队",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=moor_otter",
    image: "/images/card_moor_otter.png",
    likes: 890,
    isLiked: false,
    content: "高敏感人群（HSP）专属的心情避风港。水獭小助手陪伴你记录情绪、隔绝精神内耗。告别焦虑焦虑，随时给你温暖鼓励！今天起正式开启公测啦！",
    tags: ["MoorAI", "高敏感人群", "治愈系App", "情绪记录"],
    time: "10小时前",
    location: "上海市 · 静安区",
    comments: [
      { user: "小水獭迷", text: "界面好治愈！太需要这样的产品了！", time: "9小时前", likes: 55 }
    ]
  },
  {
    id: 6,
    title: "他靠番茄钟app，月入1.8w刀",
    category: "推荐",
    author: "独立开发者专栏",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=indie_maker",
    image: "/images/card_pomodoro.png",
    likes: 1540,
    isLiked: false,
    content: "一个看似极简的番茄钟独立App，究竟是怎么做成海外热榜第一的？详细拆解产品MVP上线、订阅制转化以及海外TikTok买量全过程，独立开发必读干货！",
    tags: ["独立开发", "海外出海", "副业赚钱", "产品经理"],
    time: "12小时前",
    location: "北京市 · 海淀区",
    comments: [
      { user: "代码狂人", text: "收藏了！细节拆解得很到位，思路清晰。", time: "11小时前", likes: 102 }
    ]
  }
];

// API: Get all posts
app.get('/api/posts', (req, res) => {
  const { category, search } = req.query;
  let filtered = initialPosts;
  if (category && category !== '推荐' && category !== '发现') {
    filtered = filtered.filter(p => p.category === category || p.tags.includes(category));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
  }
  res.json(filtered);
});

// API: Like post
app.post('/api/posts/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  const post = initialPosts.find(p => p.id === id);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
    res.json({ success: true, likes: post.likes, isLiked: post.isLiked });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

// API: Add comment:添加评论
app.post('/api/posts/:id/comment', (req, res) => {
  const id = parseInt(req.params.id);
  const { text, user } = req.body;
  const post = initialPosts.find(p => p.id === id);
  if (post) {
    const newComment = {
      user: user || "匿名小红薯",
      text: text,
      time: "刚刚",
      likes: 0
    };
    post.comments.unshift(newComment);
    res.json({ success: true, comment: newComment });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

// API: Create new post:创建新帖子
app.post('/api/posts', (req, res) => {
  const { title, content, category, tags, image } = req.body;
  const newPost = {
    id: Date.now(),
    title: title || "发布的新笔记",
    category: category || "推荐",
    author: "我 (小红薯迷)",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=me_user",
    image: image || "/images/card_laptop_ai.png",
    likes: 1,
    isLiked: true,
    content: content || "刚刚在小红书分享了我的最新动态！",
    tags: tags ? tags.split(/[,，\s]+/) : ["日常随记"],
    time: "刚刚",
    location: "厦门市 · 思明区",
    comments: []
  };
  initialPosts.unshift(newPost);
  res.json({ success: true, post: newPost });
});

// Fallback to index.html for single page layout:回退到index.html文件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {//启动服务器
  console.log(`===================================================`);
  console.log(`  小红书 Dark Mode Web App 运行成功!`);
  console.log(`  本地服务器访问地址: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
