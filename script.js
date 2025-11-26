document.addEventListener('DOMContentLoaded', () => {
    // 變數宣告
    const quizContainerDe = document.getElementById('quiz-container-de');
    const quizContainerZai = document.getElementById('quiz-container-zai');
    const scoreDisplay = document.getElementById('score-display');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    let allQuestions = {}; // 儲存所有載入的題目
    let userAnswers = {};  // 儲存用戶的作答狀態: { id: true/false }
    let currentQuestions = {
        'group_de': [],
        'group_zai': []
    }; // 儲存每個分類當前顯示的題目

    // --- 題目載入與渲染函數 ---

    /**
     * @function renderRubyText
     * 將 JSON 中的 [ {word, bopomo} ] 陣列轉換為帶有注音的 HTML (ruby標籤)。
     */
    function renderRubyText(rubyData) {
        if (!rubyData) return '';
        // 使用 <ruby> 標籤實現注音顯示
        return rubyData.map(item => `<ruby>${item.word}<rt>${item.bopomo}</rt></ruby>`).join('');
    }

    /**
     * @function createQuizItem
     * 根據單一題目資料物件，建立 HTML 元素。
     */
    function createQuizItem(question, questionNumber) {
        const item = document.createElement('div');
        item.className = 'quiz-item';
        item.dataset.answered = 'false';

        // 建立題目標題區（包含題號、句子、反饋）
        const header = document.createElement('div');
        header.className = 'quiz-item-header';

        // 建立題號元素
        const numberElement = document.createElement('div');
        numberElement.className = 'question-number';
        numberElement.textContent = questionNumber;

        const sentence = document.createElement('div');
        sentence.className = 'sentence sentence-ruby';

        // 生成帶有注音的句子
        const beforeHtml = renderRubyText(question.sentence_before_ruby);
        const afterHtml = renderRubyText(question.sentence_after_ruby);

        sentence.innerHTML = `${beforeHtml} <span class="gap"></span> ${afterHtml}`;

        const gapElement = sentence.querySelector('.gap');
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'feedback';

        // 建立選項按鈕
        question.gap_options.forEach((option, index) => {
            const button = document.createElement('button');

            // 按鈕內容：只顯示漢字，不顯示注音
            button.textContent = option;
            button.dataset.answerText = option; // 儲存漢字答案供檢查

            button.addEventListener('click', () => handleAnswer(button, item, question, feedbackElement));
            gapElement.appendChild(button);
        });

        // 建立解釋容器（用於答錯時顯示）
        const explanationContainer = document.createElement('div');
        explanationContainer.className = 'explanation-container';

        header.appendChild(numberElement);
        header.appendChild(sentence);
        header.appendChild(feedbackElement);

        item.appendChild(header);
        item.appendChild(explanationContainer);

        return item;
    }

    /**
     * @function shuffleArray
     * 隨機打亂陣列（Fisher-Yates 演算法）
     */
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * @function renderGroup
     * 渲染單一組別的題目到指定的容器。
     * 從題庫中隨機抽取10題顯示。
     */
    function renderGroup(groupKey, container) {
        const questions = allQuestions[groupKey]?.questions;

        if (questions && questions.length > 0) {
            // 隨機打亂題目順序，然後取前10題
            const shuffledQuestions = shuffleArray(questions);
            const selectedQuestions = shuffledQuestions.slice(0, 10);

            // 記錄當前分類顯示的題目
            currentQuestions[groupKey] = selectedQuestions;

            selectedQuestions.forEach((q, index) => {
                const itemElement = createQuizItem(q, index + 1); // 題號從1開始
                container.appendChild(itemElement);
            });
        }
    }

    /**
     * @function loadQuestions
     * 載入 JSON 題目檔案並動態生成測驗內容。
     */
    async function loadQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                // 檢查是否為本地檔案讀取錯誤 (file://)
                if (response.status === 0 && window.location.protocol === 'file:') {
                     throw new Error(`NetworkError when attempting to fetch resource. (請確認檔案是否在伺服器環境下運行，如 Live Server 或 GitHub Pages)`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allQuestions = data;

            renderQuestions();

        } catch (error) {
            console.error("載入題目時發生錯誤:", error);
            quizContainerDe.innerHTML = `<p style="color: red;">載入題目失敗：${error.message}。</p>`;
            quizContainerZai.innerHTML = `<p style="color: red;">載入題目失敗：${error.message}。</p>`;
        }
    }

    /**
     * @function renderQuestions
     * 重新渲染題目（用於初始載入和重新出題）
     */
    function renderQuestions() {
        // 清空容器
        quizContainerDe.innerHTML = '';
        quizContainerZai.innerHTML = '';

        // 清空作答記錄和當前題目列表
        userAnswers = {};
        currentQuestions = {
            'group_de': [],
            'group_zai': []
        };

        // 渲染「的/得」題目
        renderGroup('group_de', quizContainerDe);

        // 渲染「在/再」題目
        renderGroup('group_zai', quizContainerZai);

        updateScoreDisplay();
    }


    // --- 答案處理與分數更新函數 ---

    /**
     * @function handleAnswer
     * 處理使用者點擊答案的邏輯。
     */
    function handleAnswer(clickedButton, itemElement, question, feedbackElement) {
        if (itemElement.dataset.answered === 'true') {
            return;
        }

        const userAnswer = clickedButton.dataset.answerText;
        const correctAnswer = question.answer;

        itemElement.dataset.answered = 'true';

        itemElement.querySelectorAll('button').forEach(btn => {
            btn.classList.add('disabled');
        });

        const header = itemElement.querySelector('.quiz-item-header');
        const gapElement = header.querySelector('.gap');

        // 檢查答案
        if (userAnswer === correctAnswer) {
            userAnswers[question.id] = true;
            feedbackElement.textContent = '✅ 答對了！';
            feedbackElement.classList.add('correct');
            replaceGapWithAnswer(gapElement, correctAnswer, 'correct-highlight');
        } else {
            userAnswers[question.id] = false;
            feedbackElement.textContent = '❌ 答錯了！';
            feedbackElement.classList.add('incorrect');

            // 在解釋容器中顯示解答
            const explanationContainer = itemElement.querySelector('.explanation-container');
            const explanation = document.createElement('div');
            explanation.className = 'explanation';
            explanation.innerHTML = `<strong>正確答案：${correctAnswer}</strong><br>💡 ${question.explanation}`;
            explanationContainer.appendChild(explanation);

            // 延遲一點再展開，讓動畫更流暢
            setTimeout(() => {
                explanationContainer.classList.add('show');
            }, 100);

            replaceGapWithAnswer(gapElement, correctAnswer, 'incorrect-highlight');
        }

        updateScoreDisplay();
    }

    /**
     * @function replaceGapWithAnswer
     * 將句子中的按鈕間隙替換為最終答案。
     */
    function replaceGapWithAnswer(gapElement, finalAnswer, className) {
        if (gapElement) {
            gapElement.innerHTML = `<span class="${className}">${finalAnswer}</span>`;
            gapElement.style.fontWeight = 'bold';
        }
    }

    /**
     * @function updateScoreDisplay
     * 更新分數顯示在頁面上，根據當前顯示的 Tab 計算分數。
     */
    function updateScoreDisplay() {
        // 找出當前顯示的 Tab
        const activeTab = document.querySelector('.tab-content.active');
        let currentGroupKey = 'group_de'; // 預設

        if (activeTab && activeTab.id === 'tab-zai') {
            currentGroupKey = 'group_zai';
        }

        // 獲取當前分類的題目
        const currentGroupQuestions = currentQuestions[currentGroupKey] || [];
        const totalQuestions = currentGroupQuestions.length;

        // 只計算當前分類題目的答對數
        let correctAnswers = 0;
        currentGroupQuestions.forEach(q => {
            if (userAnswers[q.id] === true) {
                correctAnswers++;
            }
        });

        const percentage = (totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(0) : 0);

        scoreDisplay.textContent = `答對: ${correctAnswers} 題 / 總計: ${totalQuestions} 題 (${percentage}%)`;
    }

    // --- Tab 切換邏輯 ---

    function switchTab(tabId) {
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');

        // 切換 Tab 時更新分數顯示
        updateScoreDisplay();
    }

    // 監聽 Tab 按鈕點擊
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            switchTab(targetTab);
        });
    });

    // 監聽重新出題按鈕
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (allQuestions && Object.keys(allQuestions).length > 0) {
                renderQuestions();
            }
        });

        // 添加懸停效果
        refreshBtn.addEventListener('mouseenter', () => {
            refreshBtn.style.transform = 'translateY(-2px)';
            refreshBtn.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
        });
        refreshBtn.addEventListener('mouseleave', () => {
            refreshBtn.style.transform = 'translateY(0)';
            refreshBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        });
    }

    // 啟動應用：確保這行程式碼位於 DOMContentLoaded 內部
    loadQuestions();
});