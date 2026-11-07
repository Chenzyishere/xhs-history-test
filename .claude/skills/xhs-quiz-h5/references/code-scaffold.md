# 代码骨架：可直接复用的实现

纯静态，无框架、无构建、无后端。四个文件。

## 目录结构

```
项目/
├── index.html
├── css/style.css
├── js/data.js        内容层：题库 + 人物 + 配置
├── js/app.js         逻辑层：计分、匹配、出图、解锁
├── tools/            发码工具（.gitignore 排除，不上传）
│   └── generate-codes.html
└── .gitignore
```

关键原则：**内容全部在 `data.js`，换题材只改这一个文件，`app.js` 不动。**

---

## 一、data.js 结构

```js
window.QUIZ_DATA = {
  title: "你最像哪个历史人物？",
  brand: "历史人格图鉴",
  socialProof: "已有 12,847 人测过",

  unlock: {
    masterCode: "9900",                  // 自己测试用的永久主密码
    salt: "LSRW-2026-xhs-history",       // 校验盐值，改了旧码全废
    prefix: "LSRW",
    hint: "购买后获取验证码，输入即可开始"
  },

  dimensions: [
    { pos: "入世", neg: "出世" },
    { pos: "刚",   neg: "柔"   },
    { pos: "燃",   neg: "佛"   },
    { pos: "破格", neg: "守序" }
  ],

  share: {
    template: "我测出来是{name}😆 {title}\n\n「{tagline}」\n\n你也来试试？\n\n#性格测试"
  },

  figures: [
    {
      id: "sushi",
      name: "苏轼",
      title: "反内耗大师",
      tagline: "被贬到哪，就在哪吃好喝好",
      seal: "松弛",                    // 印章二字
      color: "#b5562f",                // 结果页专属色
      vector: [0.2, -0.6, -0.2, 0.4],  // 四维坐标，-1 ~ 1
      traits: ["…", "…", "…"],
      advice: "…"
    }
  ],

  questions: [
    {
      id: "q1",
      text: "周一早上醒来，你脑子里的第一个念头是？",
      options: [
        { text: "这周有什么硬仗要打", effect: [1, 0, 0, 0] },
        { text: "这班是非上不可吗",   effect: [-1, 0, 0, 0] }
      ]
    }
  ]
};
```

`effect` 数组四位对应四个维度，每题只让一位非零。

---

## 二、计分与匹配

**答题时只记录答案下标，提交时统一算分**——这样回退改答案不会把分算重。

```js
const answers = new Array(TOTAL).fill(-1);   // -1 = 未选

function pick(index) {
  answers[current] = index;                   // 只记录
  // …更新 UI
}

function finish() {
  const scores = [0, 0, 0, 0];
  answers.forEach((ansIdx, qi) => {
    if (ansIdx === -1) return;
    DATA.questions[qi].options[ansIdx].effect.forEach((v, d) => {
      scores[d] += v;
    });
  });
  const result = match(scores);
}

// 归一化后算欧氏距离，取最近
function match(scores) {
  const u = scores.map(s => s / 4);          // -4~4 → -1~1
  let best = null, bestDist = Infinity;
  DATA.figures.forEach(f => {
    const d = f.vector.reduce((sum, v, i) => sum + (v - u[i]) ** 2, 0);
    if (d < bestDist) { bestDist = d; best = f; }
  });
  return best;
}
```

`/4` 的分母 = 每个维度的题目数。改题量时记得同步改。

---

## 三、校验位验证码

零后端、可离线批量发码、瞎编的码验不过。

```js
const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 去掉易混淆的 I O

function checkDigit(body, salt) {
  let h = 2166136261;                 // FNV-1a
  const s = body + "|" + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ALPHABET[h % ALPHABET.length];
}

// 生成：prefix + 6位随机 + 1位校验
function makeCode(prefix, salt) {
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return prefix + body + checkDigit(body, salt);
}

// 校验
function isValidCode(input, cfg) {
  const raw = String(input).replace(/[\s\-_]/g, "").toUpperCase();
  if (raw === cfg.masterCode.replace(/[\s\-_]/g, "").toUpperCase()) return true;

  let body = raw;
  const prefix = cfg.prefix.toUpperCase();
  if (raw.startsWith(prefix)) body = raw.slice(prefix.length);
  if (body.length !== 7) return false;

  return checkDigit(body.slice(0, 6), cfg.salt) === body.slice(6);
}
```

输入框要做的体验优化：

```js
input.addEventListener("input", () => {
  const pos = input.selectionStart;
  input.value = input.value.toUpperCase();   // 自动大写
  input.setSelectionRange(pos, pos);
});
```

提交前 `trim()` + 去空格，对齐"验证码不能有空格"这类用户痛点。

---

## 四、Canvas 分享卡（1080×1440）

竖版 3:4，小红书原生尺寸。

```js
const W = 1080, H = 1440;
const ctx = canvas.getContext("2d");

// 1. 背景渐变
const bg = ctx.createLinearGradient(0, 0, 0, H);
bg.addColorStop(0, "#f8f1e5");
bg.addColorStop(1, "#efe3cd");
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// 2. 人物名（大字，人物专属色）
ctx.textAlign = "center";
ctx.fillStyle = f.color;
ctx.font = 'bold 140px "Songti SC", "SimSun", serif';
ctx.fillText(f.name, W / 2, 290);

// 3. 印章（居中放在名字下方，避免 3 字姓名重叠）
ctx.save();
ctx.translate(W / 2, 400);
ctx.rotate(-0.06);
ctx.fillStyle = "#c0392b";
roundRect(ctx, -46, -46, 92, 92, 14);
ctx.fill();
ctx.fillStyle = "#fff";
ctx.font = 'bold 32px "Songti SC", "SimSun", serif';
ctx.fillText(f.seal, 0, 12);
ctx.restore();

// 4. 金句 → 分隔线 → 相似点（用累加 y，不要写死坐标）
// 5. 底部建议框 y=1180 固定
// 6. 底部引流：「小红书搜索『品牌名』」
```

**排版要点：**

- 用**累加的 y 变量**推进，不要写死坐标。文案长度会变，写死必翻车
- 每段用 `wrapText()` 按像素宽度换行，不要按字数
- 底部建议框固定在 `y=1180`，高 150，最多两行
- 最底部留给引流，`y≈1372 / 1410` 两行

```js
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
```

---

## 五、iOS 保存图片（最容易漏）

`a[download]` 在 iOS Safari **完全无效**。而小红书用户绝大多数是 iPhone——不处理这条，传播链路直接断。

```js
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

saveBtn.addEventListener("click", () => {
  drawShareCard(result);
  const url = canvas.toDataURL("image/png");

  if (isIOS()) {
    saveImg.src = url;                    // 弹浮层，提示长按保存
    saveOverlay.classList.add("is-open");
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = "结果.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});
```

浮层里的 `<img>` 必须允许长按菜单：

```css
.save-img {
  -webkit-touch-callout: default;
  -webkit-user-select: auto;
  user-select: auto;
}
```

---

## 六、布局：滚动与安全区

最容易踩的坑：`#app { overflow: hidden }` + 绝对定位，结果页比屏幕长时底部按钮被裁掉。

```css
#app {
  max-width: 430px;
  height: 100vh;
  height: 100dvh;        /* 移动端工具栏不会吃底部 */
  position: relative;
  overflow: hidden;
}

.screen {                /* 每个页面自己滚动 */
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  opacity: 0;
  pointer-events: none;
}
.screen.is-active { opacity: 1; pointer-events: auto; }

/* 内层容器撑满，才能居中 */
.start-inner, .lock-inner, .result-inner, .quiz-inner {
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* iPhone 底部安全区 */
@supports (padding: env(safe-area-inset-bottom)) {
  .result-inner { padding-bottom: calc(40px + env(safe-area-inset-bottom)); }
}
```

---

## 七、四维雷达

```js
function drawRadar(scores, color) {
  const cx = 300, cy = 300, R = 200;
  // -3~3 → 0.5 ~ 1 / 0 ~ 0.5，0 分落在 0.5（虚线中性环）
  const vals = scores.map(s => 0.5 + Math.max(-1, Math.min(1, s / 4)) * 0.5);
  const angles = [0, 1, 2, 3].map(i => -Math.PI / 2 + i * Math.PI / 2);

  const pt = (a, ratio) => [cx + Math.cos(a) * R * ratio, cy + Math.sin(a) * R * ratio];

  // 画 4 圈网格 → 虚线中性环 → 4 条轴线 → 数据多边形 → 顶点 → 轴端标签
  // 标签按方位调整 textAlign，避免左右出界
  angles.forEach((a, i) => {
    const p = pt(a, 1.16);
    const cos = Math.cos(a);
    ctx.textAlign = Math.abs(cos) < 0.1 ? "center" : (cos > 0 ? "left" : "right");
    ctx.fillText(DATA.dimensions[i].pos, p[0], p[1]);
  });
}
```

轴端只标**正向极**，反向极放在图下方的文字标签里（"偏入世 / 偏柔 / 偏燃 / 偏守序"），避免四个方向文字贴边被裁。

---

## 八、进度存续

```js
const PROGRESS_KEY = "lswr_progress";

function saveProgress() {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({ answers, current }));
  } catch (e) {}
}

function restoreProgress() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PROGRESS_KEY) || "null");
    if (!p || !Array.isArray(p.answers) || p.answers.length !== TOTAL) return false;
    if (typeof p.current !== "number" || p.current < 0 || p.current >= TOTAL) return false;
    for (let i = 0; i < TOTAL; i++) {
      const v = p.answers[i];
      answers[i] = Number.isInteger(v) && v >= 0 && v < DATA.questions[i].options.length ? v : -1;
    }
    current = p.current;
    return true;
  } catch (e) { return false; }
}
```

**必须校验下标合法性**，否则脏数据会导致白屏。

---

## 九、复制文案（微信内置浏览器要留后路）

```js
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}

  // 降级：微信内置浏览器不认 clipboard API
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}
```

---

## 十、上线前自检：人物可达性与分布

**必做。** 12 题 × 4 选项组合数很大，但四个维度互相独立，可以按维度分组后做笛卡尔积，几十毫秒跑完。

把下面的脚本存成 `tools/verify-reach.js`（`tools/` 已 `.gitignore`），上线前跑一次：

```bash
node tools/verify-reach.js
```

脚本做两件事：

1. **可达性**：每个人物至少要赢得一个可达点，否则它的文案写得再好也是白写
2. **分布均衡度**：看各人物被命中的占比

```js
global.window = {};
require("../js/data.js");
const DATA = global.window.QUIZ_DATA;

const N_DIM = 4;
const byDim = Array.from({ length: N_DIM }, () => []);
DATA.questions.forEach((q) => {
  const d = q.options[0].effect.findIndex((v) => v !== 0);
  byDim[d].push(q);            // 按维度分组（每题只影响一个维度）
});

// 每个维度的可达得分集合
const dimSums = byDim.map((qs, di) => {
  let acc = new Set([0]);
  qs.forEach((q) => {
    const vals = new Set(q.options.map((o) => o.effect[di] ?? 0));
    const next = new Set();
    acc.forEach((s) => vals.forEach((v) => next.add(s + v)));
    acc = next;
  });
  return [...acc];
});

const scale = Math.max(...dimSums.flat().map(Math.abs)) || 1;
const hits = new Map();
const cur = new Array(N_DIM).fill(0);

(function rec(i) {
  if (i === N_DIM) {
    const u = cur.map((s) => s / scale);
    let best = null, bd = Infinity;
    DATA.figures.forEach((f) => {
      const d = f.vector.reduce((sum, v, k) => sum + (v - u[k]) ** 2, 0);
      if (d < bd) { bd = d; best = f; }
    });
    hits.set(best.id, (hits.get(best.id) || 0) + 1);
    return;
  }
  dimSums[i].forEach((v) => { cur[i] = v; rec(i + 1); });
})(0);

const missing = DATA.figures.filter((f) => !hits.get(f.id)).map((f) => f.name);
console.log(missing.length ? "❌ 测不到：" + missing.join("、") : "✅ 全部可达");
```

### 分布要均衡到什么程度

理想情况各人物占比接近 `100% / 16 ≈ 6%`。实际情况允许有差异，但要注意两条红线：

- **单个人物不要超过 15%**，否则用户会觉得"怎么测都是他"
- **最低的人物不要低于 2%**，否则等于花钱写了一份没人看得到的文案

### 不均衡的原因与调法

- 若某维可达值只有 `{-1, -1/3, 1/3, 1}` 这种 4 档，说明该维 3 道题都是 ±1，中间态缺失
- **加 0 分选项**：把某题的某个选项 `effect` 设成全 0，能补出 0 分档，让中间人物有落脚点
- **挪 vector**：把冷门人物的 `vector` 往可达点附近靠，不要留在两个格子正中间
- 调完重跑脚本，直到占比落在合理区间

> **重要**：改 `effect` 数组**不会改动任何文案文字**，用户完全感知不到。所以提高分辨率优先用这一招，比挪 vector 伤害小得多。典型做法：每维 3 道题各留一个"中性选项"（`effect` 全 0），四维即可从 448 个可达点提升到 2401 个。

---

## 十一、自动平衡优化器

手工调 16 个向量不现实。用 `tools/balance.js` 自动迭代：

```bash
node tools/balance.js [maxDrift] [restarts]
# 例：node tools/balance.js 0.3 8
```

三个阶段：

1. **容量约束聚类**：先按「每人物配额相等」做贪心分配，再把向量挪向所分配点的质心，拿到一个接近均衡的初值
2. **爬山搜索**：在**真实匹配函数**（最近邻）上随机扰动向量，只有不平衡度下降才接受
3. **定向转移**：找出过密人物和偏少人物，把「归前者所有、后者次近」的点收集起来，把后者的向量朝这些点推过去

每一步都受 `maxDrift` 约束——向量不能离原始坐标超过该距离，保证语义不跑偏。

### 参数怎么选

| 参数 | 建议 | 说明 |
|---|---|---|
| `maxDrift` | 0.25–0.35 | 越小语义越准，但平衡越难做。超过 0.45 开始出现语义错乱（改革派变守旧派这种） |
| `restarts` | 6–10 | 爬山容易陷局部最优，多起点取最优。**不同起点结果差异很大，必须多跑** |

### 验收标准

- 极差 ≤ 2.5x（最高占比 / 最低占比）
- 单个人物 ≤ 10%
- 所有人物 ≥ 4%

### 调完之后必须复查语义

优化器只看数字，不看内容。逐条核对每个向量是否还和人物文案一致：

```
❌ 王安石（改革派）被推到「守序」→ 语义反了
❌ 曹操（杀伐果决）被推到「佛」→ 语义反了
✅ 入世/出世 小幅偏移 → 可接受
```

发现语义反了，就调小 `maxDrift` 重跑，或者单独把这个人物钉死（不参与优化）。

### 输出与应用

脚本只写 `tools/balanced-vectors.json`，**不直接改 `data.js`**。人工确认语义没问题后，再手动替换向量。

**别用四舍五入到两位的坐标直接上线**——精度损失会让分布再偏移几个百分点。要么保留三位小数，要么直接用 JSON 里的原始值。
