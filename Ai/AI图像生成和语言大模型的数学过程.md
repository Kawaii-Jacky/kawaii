---
tags:
  - AI
  - 数学
  - 深度学习
  - 图像生成
  - 大语言模型
created: 2026-07-27
---

# AI图像生成和语言大模型的数学过程

> 目标：从数学角度，拆解「AI图像生成（以扩散模型为主）」和「语言大模型（Transformer/LLM）」的核心原理。两者本质上都是**在高维空间中学习一个概率分布，并从中采样**，但实现路径和数学工具不同。

---

## 0. 一句话总览

| | 本质问题 | 数学工具 | 采样方式 |
|---|---|---|---|
| **图像生成（Diffusion）** | 学习 $p(x)$：自然图像的联合概率分布 | 随机微分方程 / 分数函数（score function）/ 变分推断 | 从噪声逐步"去噪"，迭代采样 |
| **语言大模型（LLM）** | 学习 $p(x_t \mid x_{<t})$：给定上文的下一词条件分布 | 线性代数（矩阵乘法）+ 注意力机制 + 概率论（softmax） | 自回归，逐词采样 |

两者都可以归纳为：**用神经网络参数化一个概率分布 $p_\theta$，通过最大似然（或其变分下界）训练，再通过采样算法生成新样本。**

---

## 1. 语言大模型（LLM）的数学过程

### 1.1 问题建模：语言建模 = 链式概率分解

一段文本是一串 token（词/子词）$x_1, x_2, \dots, x_T$。语言模型的目标是建模联合概率：

$$
p(x_1, x_2, \dots, x_T) = \prod_{t=1}^{T} p(x_t \mid x_1, \dots, x_{t-1})
$$

这是概率论中最基本的**链式法则（chain rule）**——把一个高维联合分布拆成一串条件分布的乘积。LLM 本质上就是用神经网络去近似右边每一项 $p_\theta(x_t \mid x_{<t})$。

### 1.2 训练目标：最大似然 / 交叉熵

给定训练语料，训练目标是最小化负对数似然（等价于交叉熵损失）：

$$
\mathcal{L}(\theta) = -\sum_{t=1}^{T} \log p_\theta(x_t \mid x_{<t})
$$

用梯度下降（及其变体如 Adam）对 $\theta$ 做优化：

$$
\theta \leftarrow \theta - \eta \nabla_\theta \mathcal{L}(\theta)
$$

### 1.3 核心结构：Transformer 与 Self-Attention

#### (1) 词嵌入（Embedding）
每个 token 先映射为向量：$x_t \to e_t \in \mathbb{R}^d$，本质是一个查表矩阵乘法 $E \in \mathbb{R}^{|V| \times d}$。

#### (2) 位置编码
因为 Attention 本身不感知顺序，需要加入位置信息（正弦位置编码或旋转位置编码 RoPE）：

$$
h_t^{(0)} = e_t + p_t
$$

#### (3) Self-Attention：核心数学机制

对每个 token，计算 Query、Key、Value 三个线性投影：

$$
Q = HW_Q,\quad K = HW_K,\quad V = HW_V
$$

然后计算注意力权重（缩放点积注意力）：

$$
\text{Attention}(Q,K,V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

**直觉**：$QK^\top$ 衡量每个位置对其他位置的"相关度"（向量点积 = 相似度），softmax 把它归一化成概率分布（权重和为1），再对 $V$ 做加权求和——即"用相关的上下文信息去更新当前 token 的表示"。

因果语言模型（GPT类）还需要**掩码（mask）**，让位置 $t$ 只能看到 $\le t$ 的信息（保证自回归的因果性）：

$$
\text{score}_{ij} = \begin{cases} \dfrac{q_i \cdot k_j}{\sqrt{d_k}} & j \le i \\ -\infty & j > i \end{cases}
$$

多头注意力（Multi-Head）就是把上述过程在多个低维子空间并行做多次，再拼接：

$$
\text{MHA}(H) = \text{Concat}(\text{head}_1, \dots, \text{head}_h)W_O
$$

#### (4) 前馈网络 + 残差 + 归一化

$$
h' = \text{LayerNorm}(h + \text{MHA}(h))
$$
$$
h'' = \text{LayerNorm}(h' + \text{FFN}(h'))
$$

其中 FFN 通常是两层 MLP 加非线性激活（如 GeLU/SwiGLU）：

$$
\text{FFN}(x) = W_2\,\sigma(W_1 x + b_1) + b_2
$$

堆叠 $L$ 层这样的模块（Transformer Block），就构成整个网络。

#### (5) 输出层：Softmax 得到下一词分布

最后一层的向量经过线性变换映射回词表大小，再用 softmax 得到概率分布：

$$
p_\theta(x_t \mid x_{<t}) = \text{softmax}(W_{\text{out}} \, h_t^{(L)})
$$

softmax 的公式：

$$
\text{softmax}(z)_i = \frac{e^{z_i}}{\sum_j e^{z_j}}
$$

它把任意实数向量压成一个合法的概率分布（非负、和为1）。

### 1.4 生成（推理）阶段：自回归采样

训练完成后，生成新文本是**逐词采样**的过程：

1. 给定上文 $x_{<t}$，模型输出 $p_\theta(\cdot \mid x_{<t})$
2. 从这个分布中采样出 $x_t$（可以用贪心 argmax、温度采样、Top-k/Top-p 采样）
3. 把 $x_t$ 拼回上文，重复第 1 步，直到生成结束符

**温度采样**的数学：

$$
p_\tau(x_t = i) = \frac{\exp(z_i/\tau)}{\sum_j \exp(z_j/\tau)}
$$

$\tau \to 0$ 时趋于贪心（只选概率最大的词）；$\tau$ 越大分布越平滑，随机性越强。

### 1.5 RLHF/对齐阶段的数学（简述）

在预训练之后，常用强化学习（如 PPO）或直接偏好优化（DPO）来对齐人类偏好，本质是在原始分布 $p_\theta$ 基础上加一个 KL 正则项，最大化奖励期望：

$$
\max_\theta \; \mathbb{E}_{x \sim p_\theta}[r(x)] - \beta \, D_{KL}(p_\theta \,\|\, p_{\text{ref}})
$$

---

## 2. AI 图像生成的数学过程（以扩散模型 Diffusion Model 为主）

图像生成经历了几代技术（GAN → VAE → Diffusion → 现在的 Flow Matching），目前主流（Stable Diffusion, DALL·E, Midjourney 等）都基于**扩散模型**，这里重点讲它。

### 2.1 核心思想：先"加噪"再学"去噪"

扩散模型分两个过程：

- **前向过程（加噪，固定、不需要学习）**：把真实图片 $x_0$ 逐步加高斯噪声，变成纯噪声 $x_T$
- **逆向过程（去噪，需要神经网络学习）**：从纯噪声 $x_T$ 出发，逐步去噪还原出图片 $x_0$

### 2.2 前向过程：马尔可夫链加噪

定义一个马尔可夫链，每一步加入少量高斯噪声：

$$
q(x_t \mid x_{t-1}) = \mathcal{N}\big(x_t;\ \sqrt{1-\beta_t}\, x_{t-1},\ \beta_t I\big)
$$

其中 $\beta_t$ 是一个逐渐增大的噪声调度参数。利用高斯的性质，可以推导出直接从 $x_0$ 跳到任意时刻 $t$ 的**闭式解**：

$$
x_t = \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1-\bar\alpha_t}\,\epsilon,\qquad \epsilon \sim \mathcal{N}(0, I)
$$

其中 $\bar\alpha_t = \prod_{s=1}^t (1-\beta_s)$。当 $t \to T$ 时，$x_T$ 几乎是纯高斯噪声。

### 2.3 逆向过程：学习去噪

理论上逆向过程也是高斯的：

$$
p_\theta(x_{t-1} \mid x_t) = \mathcal{N}\big(x_{t-1};\ \mu_\theta(x_t, t),\ \Sigma_\theta(x_t,t)\big)
$$

但真实的均值依赖未知的 $x_0$，所以需要用神经网络去**预测噪声** $\epsilon_\theta(x_t, t)$，从而反推均值：

$$
\mu_\theta(x_t, t) = \frac{1}{\sqrt{1-\beta_t}}\left(x_t - \frac{\beta_t}{\sqrt{1-\bar\alpha_t}}\, \epsilon_\theta(x_t, t)\right)
$$

### 2.4 训练目标：简化的去噪损失（DDPM 的关键公式）

原始目标是最大化似然的**变分下界（ELBO）**，经过一系列推导化简后，训练目标惊人地简单——就是让网络预测出加进去的噪声：

$$
\mathcal{L}_{\text{simple}}(\theta) = \mathbb{E}_{t,\, x_0,\, \epsilon}\Big[\big\|\, \epsilon - \epsilon_\theta(x_t, t)\,\big\|^2\Big]
$$

也就是：
1. 随机取一张真实图 $x_0$
2. 随机采样一个时间步 $t$ 和噪声 $\epsilon$，生成 $x_t = \sqrt{\bar\alpha_t}x_0 + \sqrt{1-\bar\alpha_t}\epsilon$
3. 让网络看 $x_t$，预测它认为被加进去的噪声 $\epsilon_\theta(x_t,t)$
4. 用 MSE 损失反向传播优化

这是一个**回归问题**，比想象中简单得多。

### 2.5 更深的数学视角：分数函数（Score Function）与 SDE

扩散模型也可以理解为学习**分数函数（score function）**——对数概率密度的梯度：

$$
s_\theta(x_t, t) \approx \nabla_{x_t} \log q(x_t)
$$

预测噪声与预测分数是等价的（相差一个已知系数）：

$$
\nabla_{x_t}\log q(x_t) = -\frac{\epsilon_\theta(x_t,t)}{\sqrt{1-\bar\alpha_t}}
$$

整个前向加噪/逆向去噪过程，可以写成一个**随机微分方程（SDE）**：

- 前向 SDE：$dx = f(x,t)\,dt + g(t)\,dW_t$（$W_t$ 是布朗运动/维纳过程）
- 逆向 SDE（Anderson, 1982）：
$$
dx = \left[f(x,t) - g(t)^2 \nabla_x \log q_t(x)\right]dt + g(t)\, d\bar{W}_t
$$

只要网络学好了分数函数 $\nabla_x \log q_t(x)$，就能沿着这个逆向 SDE"逆流而上"，从纯噪声一步步走回真实图片分布。这就是为什么去噪能生成图像——本质是**沿着概率密度上升的方向做随机游走**。

### 2.6 采样（生成图像）过程

生成时从纯噪声 $x_T \sim \mathcal{N}(0,I)$ 开始，反复应用：

$$
x_{t-1} = \frac{1}{\sqrt{1-\beta_t}}\left(x_t - \frac{\beta_t}{\sqrt{1-\bar\alpha_t}}\epsilon_\theta(x_t,t)\right) + \sigma_t z,\quad z\sim\mathcal{N}(0,I)
$$

迭代 $T$（原始 DDPM 约1000步，现在用 DDIM/DPM-Solver 等加速采样器可缩到 20~50 步甚至更少），最终得到清晰图像 $x_0$。

### 2.7 文本条件控制：Classifier-Free Guidance

为了让图片"听懂"文字描述 $c$（prompt），需要把噪声预测变成条件预测 $\epsilon_\theta(x_t, t, c)$，训练时随机丢弃条件（变成无条件预测 $\epsilon_\theta(x_t,t,\varnothing)$），推理时用两者的线性外推来增强"服从提示词"的程度：

$$
\hat\epsilon = \epsilon_\theta(x_t,t,\varnothing) + w\cdot\big(\epsilon_\theta(x_t,t,c) - \epsilon_\theta(x_t,t,\varnothing)\big)
$$

$w$ 是引导强度（guidance scale），越大越"听话"但可能失真。

文本本身通常先用一个语言模型/CLIP 文本编码器映射为向量 $c = \text{TextEncoder}(\text{prompt})$，再通过交叉注意力（Cross-Attention）注入到 U-Net/Transformer 的中间层：

$$
\text{CrossAttn}(H_{\text{img}}, c) = \text{softmax}\!\left(\frac{Q_{\text{img}} K_c^\top}{\sqrt{d}}\right)V_c
$$

这跟 LLM 里的 self-attention 是**同一套数学**，只是 Query 来自图像特征、Key/Value 来自文本特征——这是两个领域数学统一的一个直接体现。

### 2.8 潜空间扩散（Latent Diffusion，如 Stable Diffusion）

直接在像素空间做扩散计算量太大。Stable Diffusion 先用一个 VAE（变分自编码器）把图像压缩到低维潜空间：

$$
z = \mathcal{E}(x), \qquad x \approx \mathcal{D}(z)
$$

VAE 的训练目标是 ELBO：

$$
\mathcal{L}_{\text{VAE}} = \underbrace{\mathbb{E}_{q(z|x)}[\log p(x|z)]}_{\text{重构项}} - \underbrace{D_{KL}\big(q(z|x)\,\|\,p(z)\big)}_{\text{正则项，逼近标准高斯}}
$$

然后扩散过程完全在这个更小的潜空间 $z$ 上进行，最后再用解码器 $\mathcal{D}$ 还原成像素图像。这样把计算量降低了几十倍。

---

## 3. 两者的数学共性与差异

| 维度 | LLM | 图像扩散模型 |
|---|---|---|
| 建模的分布 | $p(x_t\mid x_{<t})$，离散、条件、自回归 | $p(x_0)$，连续、联合、非自回归 |
| 概率工具 | 链式法则 + softmax 分类分布 | 马尔可夫链 + 高斯分布 + SDE |
| 训练损失 | 交叉熵（分类） | MSE（回归，预测噪声/分数） |
| 生成步骤 | 逐 token 串行采样（长度=序列长度） | 逐步去噪迭代采样（步数=采样步数，与内容长度无关） |
| 核心算子 | Self-Attention（$QK^\top V$） | 卷积/U-Net 或 Diffusion Transformer + Cross-Attention |
| 共同点 | 都是"神经网络参数化概率分布 + 最大似然/变分训练 + 采样生成"这一范式的具体实例 | 同左 |

**统一视角**：无论是文字还是图像，生成式 AI 的通用数学范式都是——

$$
\theta^* = \arg\max_\theta \; \mathbb{E}_{x\sim p_{\text{data}}}\big[\log p_\theta(x)\big] \quad(\text{或其变分/去噪替代目标})
$$

$$
x_{\text{new}} \sim p_{\theta^*}(x)
$$

训练是在**逼近真实数据分布**，生成是在**从学到的分布中采样**。LLM 用自回归+softmax 把这件事离散化、逐词化；图像扩散模型用马尔可夫链+高斯噪声把这件事连续化、逐步去噪化。近两年出现的**多模态统一模型**（如把图像也 token 化后用同一个 Transformer 自回归生成，或者用 Flow Matching 统一扩散与流模型），正是在数学上把这两条路径进一步融合的尝试。

---

## 4. 延伸阅读方向（可自行补充笔记）

- [ ] Transformer 原论文《Attention Is All You Need》公式细读
- [ ] DDPM《Denoising Diffusion Probabilistic Models》推导 ELBO 全过程
- [ ] Score-based Generative Model（Song Yang）与 SDE 视角
- [ ] VAE 变分推断基础（ELBO、重参数化技巧）
- [ ] RLHF / PPO / DPO 对齐算法的数学
- [ ] Flow Matching / Rectified Flow：扩散模型的最新替代方案
