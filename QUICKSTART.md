# 立即开始：3个步骤

## 步骤1：运行快速演示（10分钟）

```bash
# 1. 安装依赖
pip install anthropic

# 2. 设置API key
export ANTHROPIC_API_KEY="your-key"

# 3. 运行演示
python test_prototype.py demo
```

你会看到：
- 系统实时生成机制
- 人类专家的baseline分析
- 对比结果

**立即判断**：系统是否真的比"人类直觉"更全面？

---

## 步骤2：运行完整测试（30-60分钟）

```bash
python test_prototype.py test
```

这会测试3个经典问题：
1. 蝙蝠飞行
2. 深海鱼发光
3. 蜥蜴肢体丢失

每个问题：
- 生成40-60个机制
- 与人类baseline对比
- 识别新颖机制

**成本估算**：~$15-30（Anthropic API）

---

## 步骤3：验证质量（需要领域专家）

### 方案A：自己验证（如果你是生物学专家）

看看"潜在新颖机制"列表，问自己：
- 这些机制有意义吗？
- 我之前想到过吗？
- 是否有些确实被忽视了？

### 方案B：请教授/博士验证

1. 运行系统得到结果
2. 把"潜在新颖机制"发给5-10个演化生物学博士
3. 问他们：
   - "这些机制中，哪些你觉得有意思但之前没想到？"
   - "哪些是nonsense？"

### 成功标准

如果至少20%的"新颖机制"被专家认为：
- ✅ 有科学价值
- ✅ 确实容易被忽视
- ✅ 不是obvious或trivial

→ 则证明了系统的价值

---

## 预期结果

### 如果成功

你会看到：
```
系统性搜索：45个机制
人类baseline：4个机制
覆盖率：11x

潜在新颖机制：18个
其中被专家认可：~4-6个（20-30%）
```

这意味着：
- ✅ 系统性穷尽确实work
- ✅ 能发现人类忽视的方向
- ✅ 值得继续开发

**下一步**：添加文献整合、定量模型生成

### 如果失败

可能的情况：
1. **系统生成太多nonsense**
   - 原因：约束检查不够严格
   - 解决：改进约束传播算法

2. **"新颖机制"其实都很obvious**
   - 原因：人类baseline设定太低
   - 解决：提高baseline标准

3. **覆盖率不够**
   - 原因：template不够全面
   - 解决：扩充template库

---

## 调试技巧

### 如果API调用太慢

```python
# 在 systematic_research_prototype.py 中

# 减少机制数量（测试时）
for template in templates[:2]:  # 原来是[:3]

# 减少创意生成数量
creative_mechs = self._generate_creative(question, num=3)  # 原来是5
```

### 如果成本太高

```python
# 使用更便宜的模型
model="claude-sonnet-4-20250514"  # 代替 opus
```

### 如果生成质量不好

```python
# 提高temperature（更多样性）
temperature=0.9

# 或降低temperature（更保守）
temperature=0.5
```

---

## FAQ

### Q1: 我没有API key怎么办？

A: 
1. 去 https://console.anthropic.com 注册
2. 新用户有免费额度（足够测试）
3. 或者用OpenAI API（需要改代码）

### Q2: 这个原型有多完整？

A: 
- ✅ 核心算法：系统性生成 + 约束检查
- ✅ 对比baseline
- ❌ 文献整合（下一步）
- ❌ 定量模型（下一步）
- ❌ 因果图等价（下一步）

**这是验证核心想法的最小原型**

### Q3: 运行需要多长时间？

A:
- 快速演示：5-10分钟
- 完整测试：30-60分钟
- 单个问题：~10分钟

### Q4: 需要什么计算资源？

A:
- 只需要普通电脑
- 不需要GPU
- 所有推理都在云端（Anthropic API）

### Q5: 如果我想改进它？

优先级排序：
1. **约束传播引擎**（最大提升）
2. **文献整合**（验证机制是否已知）
3. **定量模型生成**（从描述到代码）
4. **因果图等价检测**（去重）
5. **多轮深化**（对promising机制深入分析）

---

## 目录结构

```
obsidian/
├── systematic_research_prototype.py  # 核心引擎
├── test_prototype.py                 # 测试脚本
├── README_prototype.md               # 文档
├── QUICKSTART.md                     # 本文件
├── research_report.json              # 输出（运行后生成）
├── test_result_*.json                # 测试结果
└── demo_result.json                  # 演示结果
```

---

## 关键代码位置

### 如果要修改机制生成逻辑

```python
# systematic_research_prototype.py: 第40行
self.level_templates = {
    'molecular': [...],
    'developmental': [...],
    # 在这里添加新的层次或机制类型
}
```

### 如果要修改约束检查

```python
# systematic_research_prototype.py: 第280行
def _check_constraint_feasibility(self, mechanism_desc, condition):
    # 这里实现约束检查逻辑
```

### 如果要修改人类baseline

```python
# systematic_research_prototype.py: 第320行
def get_human_baseline(self, question):
    # 这里生成人类专家的典型分析
```

---

## 立即行动检查清单

- [ ] 安装 anthropic 包
- [ ] 获取 API key
- [ ] 运行快速演示
- [ ] 查看输出，判断质量
- [ ] 决定是否值得继续

**预计时间：20分钟**
**预计成本：$0-5**

如果20分钟后你看到系统确实发现了"有意思的被忽视机制"，那就证明了核心价值。

剩下的都是工程问题。

---

## 联系与讨论

如果你：
- ✅ 运行成功
- ✅ 发现了有价值的新机制
- ✅ 想要继续开发

欢迎讨论下一步！

可能的方向：
1. 申请研究经费
2. 招募开发者
3. 发表方法学论文
4. 商业化（如果市场存在）

但**现在**，先花20分钟验证核心想法。
