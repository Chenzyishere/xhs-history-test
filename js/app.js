/* =========================================================
 * 你最像哪个历史人物？ —— 交互 · 计分 · 分享卡
 * ========================================================= */

(function () {
  "use strict";

  const DATA = window.QUIZ_DATA;
  const TOTAL = DATA.questions.length;

  // 当前状态
  const answers = new Array(TOTAL).fill(-1); // 每题选中的选项下标，-1 表示未选
  let current = 0;
  let result = null;

  // DOM
  const $ = (id) => document.getElementById(id);
  const startScreen = $("start-screen");
  const quizScreen = $("quiz-screen");
  const resultScreen = $("result-screen");

  const progressBar = $("progress-bar");
  const qCurrent = $("q-current");
  const qTotal = $("q-total");
  const questionText = $("question-text");
  const optionsEl = $("options");
  const prevBtn = $("prev-btn");
  const nextBtn = $("next-btn");

  const canvas = $("share-canvas");

  // ---------- 屏幕切换 ----------
  function show(id) {
    [startScreen, quizScreen, resultScreen].forEach((el) => el.classList.remove("is-active"));
    $(id).classList.add("is-active");
  }

  // ---------- 开始 ----------
  $("start-btn").addEventListener("click", () => {
    answers.fill(-1);
    current = 0;
    result = null;
    show("quiz-screen");
    renderQuestion();
  });

  // ---------- 渲染题目 ----------
  function renderQuestion() {
    const q = DATA.questions[current];
    questionText.textContent = q.text;
    qTotal.textContent = TOTAL;
    qCurrent.textContent = current + 1;
    progressBar.style.width = ((current / TOTAL) * 100) + "%";

    optionsEl.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => pick(i));
      if (answers[current] === i) btn.classList.add("is-picked");
      optionsEl.appendChild(btn);
    });

    updateNav();
  }

  // 选中一个选项：只记录答案，不自动跳转
  function pick(index) {
    answers[current] = index;
    const btns = optionsEl.querySelectorAll(".option");
    btns.forEach((b, i) => b.classList.toggle("is-picked", i === index));
    updateNav();
  }

  // 更新导航按钮状态与文案
  function updateNav() {
    prevBtn.disabled = current === 0;
    const hasAnswer = answers[current] !== -1;
    nextBtn.disabled = !hasAnswer;
    nextBtn.textContent = current === TOTAL - 1 ? "查看结果" : "下一题";
  }

  // ---------- 上一题 / 下一题 ----------
  prevBtn.addEventListener("click", () => {
    if (current > 0) { current--; renderQuestion(); }
  });

  nextBtn.addEventListener("click", () => {
    if (answers[current] === -1) return;
    if (current < TOTAL - 1) {
      current++;
      renderQuestion();
    } else {
      finish();
    }
  });

  // ---------- 结果匹配 ----------
  function match(scores) {
    // 归一化到 -1 ~ 1
    const u = scores.map((s) => s / 3);
    let best = null;
    let bestDist = Infinity;
    DATA.figures.forEach((f) => {
      const d = f.vector.reduce((sum, v, i) => sum + (v - u[i]) ** 2, 0);
      if (d < bestDist) { bestDist = d; best = f; }
    });
    return best;
  }

  function finish() {
    // 从答案重新累计四维得分
    const scores = [0, 0, 0, 0];
    answers.forEach((ansIdx, qi) => {
      if (ansIdx === -1) return;
      DATA.questions[qi].options[ansIdx].effect.forEach((v, d) => { scores[d] += v; });
    });
    progressBar.style.width = "100%";
    result = match(scores);
    renderResult();
    show("result-screen");
  }

  // ---------- 渲染结果 ----------
  function renderResult() {
    const f = result;
    $("result-name").textContent = f.name;
    $("result-seal").textContent = f.seal;
    $("result-title").textContent = f.title;
    $("result-tagline").textContent = "「" + f.tagline + "」";
    $("result-advice").textContent = f.advice;

    const traitsEl = $("result-traits");
    traitsEl.innerHTML = "";
    f.traits.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      traitsEl.appendChild(li);
    });

    // 结果页人物名用人物专属色
    $("result-name").style.color = f.color;
  }

  // ---------- 分享卡绘制 ----------
  function drawShareCard(f) {
    const W = 1080, H = 1440;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#f8f1e5");
    bg.addColorStop(0.5, "#f6efe2");
    bg.addColorStop(1, "#efe3cd");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 顶部金线装饰
    ctx.fillStyle = "#c9a35c";
    ctx.fillRect(0, 0, W, 10);

    // 顶部小字
    ctx.fillStyle = "#8a7f72";
    ctx.font = '34px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("你 灵 魂 深 处 的 历 史 人 格", W / 2, 130);

    // 人物名（居中大字）
    ctx.fillStyle = f.color;
    ctx.font = 'bold 140px "Songti SC", "SimSun", serif';
    ctx.fillText(f.name, W / 2, 290);

    // 印章（名字下方居中，避免与人名重叠）
    const sealSize = 92;
    const sealY = 400;
    ctx.save();
    ctx.translate(W / 2, sealY);
    ctx.rotate(-0.06);
    ctx.fillStyle = "#c0392b";
    roundRect(ctx, -sealSize / 2, -sealSize / 2, sealSize, sealSize, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = 'bold 32px "Songti SC", "SimSun", serif';
    ctx.fillText(f.seal, 0, 12);
    ctx.restore();

    // 定调标签
    ctx.fillStyle = f.color;
    ctx.font = 'bold 42px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText("—— " + f.title + " ——", W / 2, 520);

    // 金句
    ctx.fillStyle = "#2b2620";
    ctx.font = 'bold 56px "Songti SC", "SimSun", serif';
    const lines = wrapText(ctx, "「" + f.tagline + "」", 820);
    let y = 630;
    lines.forEach((line) => {
      ctx.fillText(line, W / 2, y);
      y += 80;
    });

    // 分隔线
    ctx.strokeStyle = "rgba(192, 57, 43, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 90, y - 10);
    ctx.lineTo(W / 2 + 90, y - 10);
    ctx.stroke();

    // 相似点（动态 y，避免换行重叠）
    y += 70;
    ctx.textAlign = "left";
    f.traits.forEach((t) => {
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(90, y - 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2620";
      ctx.font = '42px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      const tl = wrapText(ctx, t, 800);
      tl.forEach((line) => {
        ctx.fillText(line, 130, y);
        y += 58;
      });
      y += 34;
    });

    // 底部建议（固定贴底）
    const boxY = 1180;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(201, 163, 92, 0.18)";
    roundRect(ctx, 90, boxY, 900, 150, 16);
    ctx.fill();
    ctx.fillStyle = "#c9a35c";
    ctx.fillRect(90, boxY, 10, 150);
    ctx.fillStyle = "#4a4238";
    ctx.font = 'bold 40px "Songti SC", "SimSun", serif';
    const advLines = wrapText(ctx, f.advice, 760);
    const ay = boxY + (advLines.length > 1 ? 70 : 92);
    advLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, ay + i * 52);
    });

    // 底部品牌
    ctx.fillStyle = "#8a7f72";
    ctx.font = '28px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText("测一测，你是哪位历史人物", W / 2, 1402);
  }

  // 圆角矩形路径
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 文字换行
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

  // ---------- 保存分享卡 ----------
  $("save-btn").addEventListener("click", () => {
    if (!result) return;
    drawShareCard(result);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "我是" + result.name + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // ---------- 再测一次 ----------
  $("retake-btn").addEventListener("click", () => {
    show("start-screen");
  });
})();
