let quizData = [];
let currentQuestions = [];

// App State Configuration
let state = {
  mode: 'practice',          // 'practice' or 'test'
  isShuffled: false,         
  limit: null,               
  currentQuestionIdx: 0,     
  answers: [],               // Mảng lưu string (1 đáp án) hoặc mảng string (nhiều đáp án)
  practiceRevealed: [],      // Kiểm soát khi nào đã Check ở Practice mode
  flagged: [],               
  isTestSubmitted: false     
};

// DOM Elements
const questionCard = document.getElementById('question-card');
const resultsCard = document.getElementById('results-card');
const questionIndexBadge = document.getElementById('question-index-badge');
const modeIndicatorLabel = document.getElementById('mode-indicator-label');
const questionText = document.getElementById('question-text');
const optionsList = document.getElementById('options-list');
const explanationPanel = document.getElementById('explanation-panel');
const correctAnswerText = document.getElementById('correct-answer-text');
const explanationReason = document.getElementById('explanation-reason');
const btnPrevQuestion = document.getElementById('btn-prev-question');
const btnNextQuestion = document.getElementById('btn-next-question');
const btnSubmitExam = document.getElementById('btn-submit-exam');
const btnCheckAnswer = document.getElementById('btn-check-answer');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentText = document.getElementById('progress-percent-text');
const navDotsGrid = document.getElementById('nav-dots-grid');
const loadingIndicator = document.getElementById('loading-indicator');

// Confetti Engine
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let confetti = [];
let animationFrameId = null;

// ==========================================================================
// Initialization & Lifecycle
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  // Theme check
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    document.getElementById('icon-sun').style.display = 'none';
    document.getElementById('icon-moon').style.display = 'block';
  }

  // Fetch JSON Data
  fetch('CSDL.json')
    .then(response => {
      if (!response.ok) throw new Error('Không thể tải file CSDL.json');
      return response.json();
    })
    .then(data => {
      loadingIndicator.style.display = 'none';
      initializeQuiz(data);
    })
    .catch(error => {
      loadingIndicator.innerText = "Lỗi tải dữ liệu. Vui lòng chạy ứng dụng trên Local Server (VD: Live Server trên VSCode) để fetch() file JSON.";
      console.error(error);
    });

  window.addEventListener('resize', resizeCanvas);

  // Keyboard Arrow Navigation
  document.addEventListener('keydown', (e) => {
    if (questionCard.style.display === 'none') return;
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (!btnPrevQuestion.disabled) prevQuestion();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (btnNextQuestion.style.display !== 'none' && !btnNextQuestion.disabled) nextQuestion();
    }
  });
});

// Format parsed JSON data
function initializeQuiz(rawQuestions) {
  quizData = rawQuestions.map((item, idx) => {
    return {
      id: idx + 1,
      question: item.Ques,
      options: item.Ans,
      correctAnswer: item.correct, // Can be String or Array
      explanation: item.explanation || 'Không có giải thích chi tiết.'
    };
  });

  const limitInput = document.getElementById('input-limit');
  if (limitInput) {
    limitInput.max = quizData.length;
    limitInput.placeholder = `Tất cả (${quizData.length})`;
  }

  applyQuestionsFilter();
}

function applyQuestionsFilter() {
  let processed = [];
  if (state.mode === 'test') {
    if (state.limit !== null && state.limit > 0) {
      processed = shuffleArray(quizData).slice(0, state.limit);
    } else {
      processed = state.isShuffled ? shuffleArray(quizData) : [...quizData];
    }
  } else { 
    processed = state.isShuffled ? shuffleArray(quizData) : [...quizData];
  }

  currentQuestions = [...processed];
  resetState();
  buildNavigationGrid();
  render();
}

function updateLimit() {
  const limitInput = document.getElementById('input-limit');
  const val = parseInt(limitInput.value);

  if (!isNaN(val) && val > 0 && val <= quizData.length) {
    state.limit = val;
  } else {
    state.limit = null;
    limitInput.value = '';
  }
  applyQuestionsFilter();
}

function toggleTheme() {
  const body = document.body;
  const isLightTheme = body.classList.toggle('light-theme');
  document.getElementById('icon-sun').style.display = isLightTheme ? 'none' : 'block';
  document.getElementById('icon-moon').style.display = isLightTheme ? 'block' : 'none';
  localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
}

function buildNavigationGrid() {
  navDotsGrid.innerHTML = '';
  currentQuestions.forEach((q, idx) => {
    const dot = document.createElement('div');
    dot.className = 'nav-dot';
    dot.id = `nav-dot-${idx}`;
    dot.innerText = idx + 1;
    dot.addEventListener('click', () => jumpToQuestion(idx));
    navDotsGrid.appendChild(dot);
  });
}

function jumpToQuestion(index) {
  if (index === state.currentQuestionIdx) return;
  questionCard.classList.add('card-transition-out');
  setTimeout(() => {
    state.currentQuestionIdx = index;
    render();
    questionCard.classList.remove('card-transition-out');
    questionCard.classList.add('card-transition-in');
    setTimeout(() => {
      questionCard.classList.remove('card-transition-in');
    }, 50);
  }, 150);
}

// ==========================================================================
// Main Render Logic
// ==========================================================================
function render() {
  if(currentQuestions.length === 0) return;
  
  resultsCard.style.display = 'none';
  questionCard.style.display = 'flex';

  const currentQ = currentQuestions[state.currentQuestionIdx];
  const userSelected = state.answers[state.currentQuestionIdx];
  const isPracticeLocked = state.practiceRevealed[state.currentQuestionIdx];
  const isExamLocked = state.isTestSubmitted;
  const isLocked = (state.mode === 'practice' && isPracticeLocked) || (state.mode === 'test' && isExamLocked);
  
  const isMultiChoice = Array.isArray(currentQ.correctAnswer);

  // Headers
  questionIndexBadge.innerText = `Câu ${state.currentQuestionIdx + 1} / ${currentQuestions.length}`;
  modeIndicatorLabel.innerText = state.mode === 'practice' ? 'Chế độ tự luyện tập' : 'Chế độ thi thử';
  document.getElementById('multi-choice-badge').style.display = isMultiChoice ? 'block' : 'none';

  renderFlagButton();
  questionText.innerText = currentQ.question;
  renderChoices(currentQ, userSelected, isLocked, isMultiChoice);
  renderExplanation(currentQ, isLocked);
  renderNavigationButtons(isLocked);
  updateSidebarProgress();
}

function renderChoices(currentQ, userSelected, isLocked, isMultiChoice) {
  optionsList.innerHTML = '';
  const optionKeys = Object.keys(currentQ.options);
  
  optionKeys.forEach(key => {
    const optionItem = document.createElement('div');
    optionItem.className = 'option-item';
    if (isLocked) optionItem.classList.add('locked');

    // Xác định logic đúng/sai tuỳ theo Array hay String
    let isCorrectKey = false;
    let isUserChoice = false;

    if (isMultiChoice) {
      isCorrectKey = currentQ.correctAnswer.includes(key);
      isUserChoice = Array.isArray(userSelected) && userSelected.includes(key);
    } else {
      isCorrectKey = (key === currentQ.correctAnswer);
      isUserChoice = (key === userSelected);
    }

    if (isLocked) {
      if (isCorrectKey) optionItem.classList.add('correct-reveal');
      else if (isUserChoice) optionItem.classList.add('incorrect-reveal');
    } else {
      if (isUserChoice) optionItem.classList.add('selected');
    }

    const prefix = document.createElement('div');
    prefix.className = 'option-prefix';
    prefix.innerText = key;
    optionItem.appendChild(prefix);

    const content = document.createElement('div');
    content.className = 'option-content';
    const textDiv = document.createElement('div');
    textDiv.className = 'option-text';
    textDiv.innerText = currentQ.options[key];
    content.appendChild(textDiv);
    
    optionItem.appendChild(content);

    if (!isLocked) {
      optionItem.addEventListener('click', () => selectOption(key, isMultiChoice));
    }

    optionsList.appendChild(optionItem);
  });
}

function renderExplanation(currentQ, isLocked) {
  if (isLocked) {
    explanationPanel.style.display = 'block';
    
    // Hiển thị đáp án đúng dạng gộp nếu là array
    let correctStr = Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer.join(', ') : currentQ.correctAnswer;
    correctAnswerText.innerHTML = `Đáp án đúng: <strong>${correctStr}</strong>`;
    
    explanationReason.innerHTML = `
      <div style="font-size: 0.95rem; line-height: 1.6;">
        ${currentQ.explanation}
      </div>
    `;
  } else {
    explanationPanel.style.display = 'none';
  }
}

function renderNavigationButtons(isLocked) {
  btnPrevQuestion.disabled = (state.currentQuestionIdx === 0);

  // Hiển thị nút check đáp án ở chế độ luyện tập
  if (state.mode === 'practice' && !isLocked) {
    btnCheckAnswer.style.display = 'flex';
  } else {
    btnCheckAnswer.style.display = 'none';
  }

  // Nút Nộp Bài Thi / Tiếp Theo
  if (state.mode === 'test' && !state.isTestSubmitted) {
    btnNextQuestion.style.display = (state.currentQuestionIdx === currentQuestions.length - 1) ? 'none' : 'flex';
    btnSubmitExam.style.display = (state.currentQuestionIdx === currentQuestions.length - 1) ? 'flex' : 'none';
  } else {
    btnNextQuestion.style.display = 'flex';
    btnNextQuestion.disabled = (state.currentQuestionIdx === currentQuestions.length - 1);
    btnSubmitExam.style.display = 'none';
  }
}

// Cập nhật giao diện thanh trạng thái trái
function updateSidebarProgress() {
  let completedCount = 0;
  
  currentQuestions.forEach((q, idx) => {
    const dot = document.getElementById(`nav-dot-${idx}`);
    if (!dot) return;

    dot.className = 'nav-dot';
    if (state.flagged[idx]) dot.classList.add('flagged');
    if (idx === state.currentQuestionIdx) dot.classList.add('active');

    const userSel = state.answers[idx];
    const hasAnswered = userSel !== null && (!Array.isArray(userSel) || userSel.length > 0);
    
    if (hasAnswered) completedCount++;

    if (state.mode === 'practice') {
      if (state.practiceRevealed[idx]) {
        const isCorrect = checkIsCorrect(userSel, q.correctAnswer);
        dot.classList.add(isCorrect ? 'correct' : 'incorrect');
      } else if (hasAnswered) {
        dot.classList.add('answered');
      }
    } else { 
      if (state.isTestSubmitted) {
        const isCorrect = checkIsCorrect(userSel, q.correctAnswer);
        dot.classList.add(isCorrect ? 'correct' : 'incorrect');
      } else if (hasAnswered) {
        dot.classList.add('answered');
      }
    }
  });

  const progressPercent = Math.round((completedCount / currentQuestions.length) * 100) || 0;
  progressBarFill.style.width = `${progressPercent}%`;
  progressPercentText.innerText = `${progressPercent}%`;

  const sidebarStats = document.getElementById('sidebar-score-stats');
  if (state.mode === 'practice' || state.isTestSubmitted) {
    let correct = 0, incorrect = 0, unanswered = 0;

    currentQuestions.forEach((q, idx) => {
      const userSel = state.answers[idx];
      const hasAns = userSel !== null && (!Array.isArray(userSel) || userSel.length > 0);
      
      if (!hasAns) {
        unanswered++;
      } else {
        if (state.mode === 'test' || state.practiceRevealed[idx]) {
          if (checkIsCorrect(userSel, q.correctAnswer)) correct++;
          else incorrect++;
        } else {
          unanswered++;
        }
      }
    });

    sidebarStats.style.display = 'flex';
    document.getElementById('sidebar-stats-correct').parentElement.style.display = 'inline';
    document.getElementById('sidebar-stats-incorrect').parentElement.style.display = 'inline';
    document.getElementById('sidebar-stats-correct').innerText = correct;
    document.getElementById('sidebar-stats-incorrect').innerText = incorrect;
    document.getElementById('sidebar-stats-unanswered-label').innerHTML = `Chưa làm: <span id="sidebar-stats-unanswered">${unanswered}</span>`;
  } else {
    sidebarStats.style.display = 'flex';
    document.getElementById('sidebar-stats-correct').parentElement.style.display = 'none';
    document.getElementById('sidebar-stats-incorrect').parentElement.style.display = 'none';
    document.getElementById('sidebar-stats-unanswered-label').innerHTML = `Đã chọn: ${completedCount} | Còn lại: <span id="sidebar-stats-unanswered">${currentQuestions.length - completedCount}</span>`;
  }

  document.querySelectorAll('.practice-legend-only').forEach(legend => {
    legend.style.display = (state.mode === 'practice' || state.isTestSubmitted) ? 'flex' : 'none';
  });
}

// Logic kiểm tra đúng sai bao quát cho Array và String
function checkIsCorrect(userAns, correctAns) {
  if (!userAns || (Array.isArray(userAns) && userAns.length === 0)) return false;
  
  if (Array.isArray(correctAns)) {
    if (!Array.isArray(userAns)) return false;
    if (userAns.length !== correctAns.length) return false;
    // Kiểm tra tất cả p.tử mảng người dùng chọn có trùng khớp toàn bộ mảng đúng không
    return correctAns.every(val => userAns.includes(val));
  }
  
  return userAns === correctAns;
}

// ==========================================================================
// Controller Actions
// ==========================================================================
function selectOption(key, isMultiChoice) {
  if (isMultiChoice) {
    let currentAns = state.answers[state.currentQuestionIdx];
    if (!Array.isArray(currentAns)) currentAns = [];
    
    if (currentAns.includes(key)) {
      currentAns = currentAns.filter(k => k !== key);
    } else {
      currentAns.push(key);
    }
    state.answers[state.currentQuestionIdx] = currentAns.length > 0 ? currentAns : null;
  } else {
    state.answers[state.currentQuestionIdx] = key;
  }
  render();
}

function checkAnswer() {
  const currentAns = state.answers[state.currentQuestionIdx];
  if (currentAns !== null && (!Array.isArray(currentAns) || currentAns.length > 0)) {
    state.practiceRevealed[state.currentQuestionIdx] = true;
    render();
  } else {
    alert("Vui lòng chọn đáp án trước khi kiểm tra!");
  }
}

function toggleFlag() {
  state.flagged[state.currentQuestionIdx] = !state.flagged[state.currentQuestionIdx];
  render();
}

function renderFlagButton() {
  const btnFlag = document.getElementById('btn-flag-question');
  const flagLabel = document.getElementById('flag-btn-label');
  if (state.flagged[state.currentQuestionIdx]) {
    btnFlag.classList.add('active');
    flagLabel.innerText = 'Đã đánh dấu';
    btnFlag.querySelector('svg').setAttribute('fill', '#eab308');
  } else {
    btnFlag.classList.remove('active');
    flagLabel.innerText = 'Đánh dấu';
    btnFlag.querySelector('svg').setAttribute('fill', 'none');
  }
}

function nextQuestion() {
  if (state.currentQuestionIdx < currentQuestions.length - 1) jumpToQuestion(state.currentQuestionIdx + 1);
}

function prevQuestion() {
  if (state.currentQuestionIdx > 0) jumpToQuestion(state.currentQuestionIdx - 1);
}

function setMode(newMode) {
  if (state.mode === newMode) return;
  const hasAnswers = state.answers.some(a => a !== null);
  if (hasAnswers) {
    if (!confirm('Đổi chế độ sẽ xoá toàn bộ đáp án bạn đã chọn. Bạn có chắc không?')) return;
  }

  state.mode = newMode;
  const limitGroup = document.getElementById('limit-control-group');
  if (limitGroup) limitGroup.style.display = (newMode === 'test') ? 'flex' : 'none';

  applyQuestionsFilter();
  document.getElementById('btn-mode-practice').classList.toggle('active', newMode === 'practice');
  document.getElementById('btn-mode-test').classList.toggle('active', newMode === 'test');
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function setShuffle(shouldShuffle) {
  if (state.isShuffled === shouldShuffle) return;
  const hasAnswers = state.answers.some(a => a !== null);
  if (hasAnswers) {
    if (!confirm('Đổi thứ tự sẽ xoá toàn bộ đáp án. Bạn có chắc không?')) return;
  }

  state.isShuffled = shouldShuffle;
  document.getElementById('btn-shuffle-off').classList.toggle('active', !shouldShuffle);
  document.getElementById('btn-shuffle-on').classList.toggle('active', shouldShuffle);
  applyQuestionsFilter();
}

function resetState() {
  state.answers = Array(currentQuestions.length).fill(null);
  state.practiceRevealed = Array(currentQuestions.length).fill(false);
  state.flagged = Array(currentQuestions.length).fill(false);
  state.isTestSubmitted = false;
  state.currentQuestionIdx = 0;
  stopConfetti();
}

function confirmReset() {
  if (confirm('Làm mới sẽ xoá toàn bộ kết quả. Bạn đồng ý chứ?')) resetQuiz();
}

function resetQuiz() {
  applyQuestionsFilter();
}

// ==========================================================================
// Exam Submission
// ==========================================================================
function submitExam() {
  const unansweredIndices = [];
  state.answers.forEach((ans, i) => {
    if (ans === null || (Array.isArray(ans) && ans.length === 0)) unansweredIndices.push(i + 1);
  });

  if (unansweredIndices.length > 0) {
    if (!confirm(`Bạn chưa làm các câu: ${unansweredIndices.join(', ')}.\nVẫn muốn nộp bài?`)) return;
  } else {
    if (!confirm('Bạn có chắc chắn muốn nộp bài thi?')) return;
  }

  let scoreCorrect = 0, scoreIncorrect = 0, scoreUnanswered = 0;

  currentQuestions.forEach((q, idx) => {
    const userSel = state.answers[idx];
    if (userSel === null || (Array.isArray(userSel) && userSel.length === 0)) {
      scoreUnanswered++;
    } else if (checkIsCorrect(userSel, q.correctAnswer)) {
      scoreCorrect++;
    } else {
      scoreIncorrect++;
    }
  });

  state.isTestSubmitted = true;
  showResultsScreen(scoreCorrect, scoreIncorrect, scoreUnanswered);
}

function showResultsScreen(correct, incorrect, unanswered) {
  questionCard.style.display = 'none';
  resultsCard.style.display = 'flex';

  document.getElementById('results-stats-correct').innerText = correct;
  document.getElementById('results-stats-incorrect').innerText = incorrect;
  document.getElementById('results-stats-unanswered').innerText = unanswered;

  const totalQ = currentQuestions.length;
  const scorePercent = Math.round((correct / totalQ) * 100);

  document.getElementById('results-score-percent').innerText = `${scorePercent}%`;
  document.getElementById('results-score-fraction').innerText = `${correct} / ${totalQ}`;

  const headline = document.getElementById('results-headline');
  const feedback = document.getElementById('results-feedback-message');
  
  if (scorePercent === 100) {
    headline.innerText = 'Xuất Sắc! Điểm Tuyệt Đối 🎉';
    feedback.innerText = `Đúng ${correct}/${totalQ} câu hỏi. Bạn đã hoàn toàn sẵn sàng cho kỳ thi.`;
    startConfetti();
  } else if (scorePercent >= 80) {
    headline.innerText = 'Kết Quả Rất Tốt! 👍';
    feedback.innerText = `Nắm bắt lý thuyết rất tốt.`;
  } else if (scorePercent >= 50) {
    headline.innerText = 'Kết Quả Đạt Yêu Cầu';
    feedback.innerText = `Đúng ${correct}/${totalQ} câu. Nên xem lại những câu sai.`;
  } else {
    headline.innerText = 'Cần Cố Gắng Thêm 📚';
    feedback.innerText = `Hãy xem lại chi tiết bài làm để cải thiện kiến thức.`;
  }

  updateSidebarProgress();
  setTimeout(() => {
    const fillCircle = document.getElementById('results-gauge-fill');
    const offset = 565.48 - (scorePercent / 100) * 565.48;
    fillCircle.style.strokeDashoffset = offset;
  }, 100);
}

function reviewExamAnswers() {
  state.currentQuestionIdx = 0;
  render();
}

// ==========================================================================
// Confetti Animation
// ==========================================================================
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function startConfetti() {
  resizeCanvas();
  confetti = [];
  const colors = ['#6366f1', '#a855f7', '#10b981', '#f43f5e', '#3b82f6', '#eab308'];
  for (let i = 0; i < 120; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let remainingConfetti = 0;
  confetti.forEach((p, idx) => {
    p.tiltAngle += p.tiltAngleIncremental;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
    p.x += Math.sin(p.tiltAngle);
    p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;
    if (p.y <= canvas.height) remainingConfetti++;
    ctx.beginPath();
    ctx.lineWidth = p.r;
    ctx.strokeStyle = p.color;
    ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
    ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
    ctx.stroke();
  });
  if (remainingConfetti > 0) animationFrameId = requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}