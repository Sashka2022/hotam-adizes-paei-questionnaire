// שאלון אדיג'ס — לוגיקת האפליקציה
(function () {
  "use strict";

  const TOTAL_QUESTIONS = QUESTIONS.length; // 20
  const VALUES = [8, 4, 2, 1];

  const state = {
    name: "",
    currentIndex: 0,
    // answers[qIndex] = { P: value|null, A: value|null, E: value|null, I: value|null }
    answers: QUESTIONS.map(() => ({ P: null, A: null, E: null, I: null })),
    displayOrder: QUESTIONS.map((q) => seededShuffle(STYLE_ORDER, q.id)),
  };

  // ===== עזר: ערבוב דטרמיניסטי (אותו סדר בכל פעם עבור אותה שאלה) =====
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    const rand = mulberry32(seed * 97 + 13);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===== טקסט צף (Toast) =====
  const elToast = document.getElementById("toast");
  let toastTimer = null;
  function showToast(message) {
    clearTimeout(toastTimer);
    elToast.textContent = message;
    elToast.classList.remove("hidden");
    toastTimer = setTimeout(() => elToast.classList.add("hidden"), 2200);
  }

  // ===== ניווט בין מסכים =====
  const screens = {
    welcome: document.getElementById("screen-welcome"),
    quiz: document.getElementById("screen-quiz"),
    results: document.getElementById("screen-results"),
  };
  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.add("hidden"));
    screens[name].classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ===== מסך פתיחה =====
  document.getElementById("btn-start").addEventListener("click", () => {
    state.name = document.getElementById("participant-name").value.trim();
    state.currentIndex = 0;
    showScreen("quiz");
    renderQuestion();
  });

  // ===== מסך שאלון =====
  const elStatement = document.getElementById("question-statement");
  const elOptionsGrid = document.getElementById("options-grid");
  const elProgressLabel = document.getElementById("progress-label");
  const elProgressPercent = document.getElementById("progress-percent");
  const elProgressFill = document.getElementById("progress-bar-fill");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  function renderQuestion() {
    const idx = state.currentIndex;
    const question = QUESTIONS[idx];
    const order = state.displayOrder[idx];
    const answer = state.answers[idx];

    elStatement.textContent = question.statement;
    elOptionsGrid.innerHTML = "";

    order.forEach((letter) => {
      const row = document.createElement("div");
      row.className = "option-row";

      const text = document.createElement("span");
      text.className = "option-text";
      text.textContent = question.options[letter];
      row.appendChild(text);

      const btnWrap = document.createElement("div");
      btnWrap.className = "value-buttons";

      VALUES.forEach((value) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "value-btn";
        btn.textContent = value;

        const isSelectedHere = answer[letter] === value;
        const isTakenElsewhere = !isSelectedHere && Object.entries(answer).some(([l, v]) => l !== letter && v === value);

        if (isSelectedHere) btn.classList.add("selected");
        else if (isTakenElsewhere) btn.classList.add("taken-elsewhere");

        btn.addEventListener("click", () => onValueClick(letter, value));
        btnWrap.appendChild(btn);
      });

      row.appendChild(btnWrap);
      elOptionsGrid.appendChild(row);
    });

    // סרגל התקדמות
    elProgressLabel.textContent = `שאלה ${idx + 1} מתוך ${TOTAL_QUESTIONS}`;
    const percent = Math.round(((idx + 1) / TOTAL_QUESTIONS) * 100);
    elProgressPercent.textContent = `${percent}%`;
    elProgressFill.style.width = `${percent}%`;

    // ניווט
    btnPrev.disabled = idx === 0;
    btnNext.textContent = idx === TOTAL_QUESTIONS - 1 ? "סיום והצגת המיפוי" : "הבא";
    updateNextButtonState();

    // אנימציית מעבר
    const wrap = document.getElementById("question-wrap");
    wrap.style.animation = "none";
    void wrap.offsetWidth;
    wrap.style.animation = "";
  }

  function onValueClick(letter, value) {
    const answer = state.answers[state.currentIndex];
    const question = QUESTIONS[state.currentIndex];

    if (answer[letter] === value) {
      // לחיצה חוזרת על אותו ערך — ביטול השיבוץ
      answer[letter] = null;
    } else {
      // אם הערך משובץ כבר לאפיון אחר — נקה אותו משם והעבר לכאן, ויידע את המשתמש
      const previousLetter = STYLE_ORDER.find((l) => l !== letter && answer[l] === value);
      if (previousLetter) {
        answer[previousLetter] = null;
        const previousText = question.options[previousLetter];
        showToast(`הערך ${value} כבר שובץ לאפיון "${previousText}" — הוא הועבר לכאן. כל ערך ניתן לשימוש פעם אחת בלבד.`);
      }
      answer[letter] = value;
    }
    renderQuestion();
  }

  function isQuestionComplete(answer) {
    const values = STYLE_ORDER.map((l) => answer[l]);
    return values.every((v) => v !== null) && new Set(values).size === 4;
  }

  function updateNextButtonState() {
    btnNext.disabled = !isQuestionComplete(state.answers[state.currentIndex]);
  }

  btnPrev.addEventListener("click", () => {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderQuestion();
    }
  });

  btnNext.addEventListener("click", () => {
    if (!isQuestionComplete(state.answers[state.currentIndex])) return;
    if (state.currentIndex < TOTAL_QUESTIONS - 1) {
      state.currentIndex++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  });

  // ===== חישוב תוצאות =====
  function computeScores() {
    const totals = { P: 0, A: 0, E: 0, I: 0 };
    state.answers.forEach((answer) => {
      STYLE_ORDER.forEach((letter) => {
        totals[letter] += answer[letter] || 0;
      });
    });
    return totals;
  }

  function getProminence(letter, score) {
    const ranges = NORMS[letter].ranges;
    for (const label of ["עיקרי מאוד", "עיקרי", "משני", "פחות מועדף"]) {
      const [min, max] = ranges[label];
      if (score >= min && score <= max) return label;
    }
    return "פחות מועדף";
  }

  function badgeClass(prominence) {
    switch (prominence) {
      case "עיקרי מאוד": return "badge-very-dominant";
      case "עיקרי": return "badge-dominant";
      case "משני": return "badge-secondary";
      default: return "badge-least";
    }
  }

  let chartInstance = null;

  function finishQuiz() {
    const totals = computeScores();
    const prominence = {};
    STYLE_ORDER.forEach((l) => (prominence[l] = getProminence(l, totals[l])));

    renderResults(totals, prominence);
    showScreen("results");
  }

  function renderResults(totals, prominence) {
    // כותרת אישית
    document.getElementById("result-name").textContent = state.name ? `שם: ${state.name}` : "";
    const today = new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("result-date").textContent = `תאריך מילוי: ${today}`;

    // קוד PAEI
    const codeEl = document.getElementById("paei-code");
    codeEl.innerHTML = "";
    STYLE_ORDER.forEach((letter) => {
      const isMajor = prominence[letter] === "עיקרי מאוד" || prominence[letter] === "עיקרי";
      const span = document.createElement("span");
      span.className = isMajor ? "major" : "minor";
      span.textContent = isMajor ? letter : letter.toLowerCase();
      codeEl.appendChild(span);
    });

    // תגיות + ניקוד
    const badgesWrap = document.getElementById("badges-wrap");
    badgesWrap.innerHTML = "";
    STYLE_ORDER.forEach((letter) => {
      const row = document.createElement("div");
      row.className = "badge-row";
      row.innerHTML = `
        <span>
          <span class="style-name">${RESULT_KEY[letter].title}</span>
          <span class="style-score">(${totals[letter]} נק')</span>
        </span>
        <span class="badge ${badgeClass(prominence[letter])}">${prominence[letter]}</span>
      `;
      badgesWrap.appendChild(row);
    });

    // גרף רדאר
    renderChart(totals);

    // כרטיסיות עומק לסגנונות עיקריים / עיקריים מאוד
    const highlightWrap = document.getElementById("highlight-styles");
    highlightWrap.innerHTML = "";
    const prominentLetters = STYLE_ORDER.filter(
      (l) => prominence[l] === "עיקרי מאוד" || prominence[l] === "עיקרי"
    ).sort((a, b) => totals[b] - totals[a]);

    prominentLetters.forEach((letter) => {
      const info = RESULT_KEY[letter];
      const card = document.createElement("div");
      card.className = "card style-detail-card";
      const itemsHtml = FIELD_LABELS.map(
        (f) => `
        <div class="style-detail-item">
          <div class="item-label">${f.label}</div>
          <div class="item-value">${info[f.key]}</div>
        </div>`
      ).join("");
      card.innerHTML = `
        <h3>${info.title} <span class="badge ${badgeClass(prominence[letter])}">${prominence[letter]}</span></h3>
        <div class="style-detail-grid">${itemsHtml}</div>
      `;
      highlightWrap.appendChild(card);
    });

    // טבלת השוואה מלאה
    renderComparisonTable();
  }

  function renderChart(totals) {
    const ctx = document.getElementById("paei-chart").getContext("2d");
    const labels = STYLE_ORDER.map((l) => RESULT_KEY[l].title);
    const data = STYLE_ORDER.map((l) => totals[l]);

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            label: "ניקוד",
            data,
            backgroundColor: "rgba(0, 72, 255, 0.18)",
            borderColor: "#0048FF",
            borderWidth: 2,
            pointBackgroundColor: "#0048FF",
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        scales: {
          r: {
            min: 20,
            max: 160,
            ticks: { display: false },
            grid: { color: "#DCE3F5" },
            angleLines: { color: "#DCE3F5" },
            pointLabels: { font: { family: "Heebo", size: 12, weight: "700" }, color: "#0B1440" },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  function renderComparisonTable() {
    const table = document.getElementById("comparison-table");
    let html = "<thead><tr><th>מאפיין</th>";
    STYLE_ORDER.forEach((l) => (html += `<th>${l}</th>`));
    html += "</tr></thead><tbody>";
    FIELD_LABELS.forEach((f) => {
      html += `<tr><td>${f.label}</td>`;
      STYLE_ORDER.forEach((l) => {
        html += `<td>${RESULT_KEY[l][f.key]}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody>";
    table.innerHTML = html;
  }

  // ===== כפתורי פעולה במסך התוצאות =====
  document.getElementById("btn-print").addEventListener("click", () => window.print());

  document.getElementById("btn-pdf").addEventListener("click", () => {
    const element = document.getElementById("print-area");
    const fileName = state.name ? `מיפוי-PAEI-${state.name}.pdf` : "מיפוי-PAEI.pdf";
    html2pdf()
      .set({
        margin: 10,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(element)
      .save();
  });

  document.getElementById("btn-restart").addEventListener("click", () => {
    state.name = "";
    state.currentIndex = 0;
    state.answers = QUESTIONS.map(() => ({ P: null, A: null, E: null, I: null }));
    document.getElementById("participant-name").value = "";
    showScreen("welcome");
  });
})();
