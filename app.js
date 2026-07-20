class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playPlace() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;

      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  playError() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      [130, 138].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  playShine() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }
}

class SudokuGame {
  constructor() {
    // Game state variables
    this.boardSize = 9;
    this.boxSize = 3;
    
    this.solution = [];
    this.initialGrid = [];
    this.currentGrid = [];
    this.notesGrid = []; // 9x9 array of Sets
    
    this.selectedCell = null; // { row, col }
    this.isPencilMode = false;
    this.difficulty = 'medium';
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.history = [];
    
    // Timer & Game Status
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isPaused = false;
    this.gameStarted = false;
    
    // Completion tracking sets
    this.completedRows = new Set();
    this.completedCols = new Set();
    this.completedBoxes = new Set();
    
    // Sound Manager
    this.soundFX = new SoundFX();
    
    // DOM Elements
    this.initDOMElements();
    
    // Init event listeners
    this.bindEvents();
    
    // Load existing game or start new game
    if (!this.loadGameState()) {
      this.startNewGame();
    }
  }

  initDOMElements() {
    this.boardEl = document.getElementById('sudoku-board');
    this.difficultySelect = document.getElementById('difficulty-select');
    this.mistakesEl = document.getElementById('mistakes-count');
    this.timerTextEl = document.getElementById('timer-text');
    this.pauseBtn = document.getElementById('pause-btn');
    this.pauseIcon = document.getElementById('pause-icon');
    this.playIcon = document.getElementById('play-icon');
    this.startOverlay = document.getElementById('start-overlay');
    this.startGameBtn = document.getElementById('start-game-btn');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resumeBtn = document.getElementById('resume-btn');
    this.newGameBtn = document.getElementById('new-game-btn');
    this.themeToggleBtn = document.getElementById('theme-toggle');
    this.soundToggleBtn = document.getElementById('sound-toggle');
    this.soundOnIcon = this.soundToggleBtn ? this.soundToggleBtn.querySelector('.sound-on-icon') : null;
    this.soundOffIcon = this.soundToggleBtn ? this.soundToggleBtn.querySelector('.sound-off-icon') : null;
    
    this.undoBtn = document.getElementById('undo-btn');
    this.eraseBtn = document.getElementById('erase-btn');
    this.notesBtn = document.getElementById('notes-btn');
    this.notesIndicator = document.getElementById('notes-indicator');
    this.hintBtn = document.getElementById('hint-btn');
    
    this.numpadEl = document.getElementById('numpad');
    this.winModal = document.getElementById('win-modal');
    this.winDifficulty = document.getElementById('win-difficulty');
    this.winTime = document.getElementById('win-time');
    this.winMistakes = document.getElementById('win-mistakes');
    this.modalNewGameBtn = document.getElementById('modal-new-game');

    this.gameOverModal = document.getElementById('game-over-modal');
    this.gameOverDifficulty = document.getElementById('game-over-difficulty');
    this.gameOverTime = document.getElementById('game-over-time');
    this.gameOverNewGameBtn = document.getElementById('game-over-new-game');
  }

  bindEvents() {
    // Sound & Theme toggle
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    }
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Difficulty change
    this.difficultySelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.startNewGame();
    });

    // New Game buttons
    this.newGameBtn.addEventListener('click', () => this.startNewGame());
    this.modalNewGameBtn.addEventListener('click', () => {
      this.winModal.classList.add('hidden');
      this.startNewGame();
    });
    if (this.gameOverNewGameBtn) {
      this.gameOverNewGameBtn.addEventListener('click', () => {
        if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
        this.startNewGame();
      });
    }

    // Start / Pause / Resume
    if (this.startOverlay) {
      this.startOverlay.addEventListener('click', () => this.startGame());
    }
    if (this.startGameBtn) {
      this.startGameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startGame();
      });
    }
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.resumeBtn.addEventListener('click', () => this.togglePause(false));

    // Toolbar buttons
    this.undoBtn.addEventListener('click', () => this.undo());
    this.eraseBtn.addEventListener('click', () => this.eraseSelected());
    this.notesBtn.addEventListener('click', () => this.togglePencilMode());
    this.hintBtn.addEventListener('click', () => this.giveHint());

    // Numpad clicks
    this.numpadEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.num-btn');
      if (btn && !btn.classList.contains('completed')) {
        const val = parseInt(btn.dataset.value, 10);
        this.inputDigit(val);
      }
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Prevent losing focus on board
    this.boardEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        this.selectCell(row, col);
      }
    });
  }

  /* ==========================================================================
     SUDOKU PUZZLE GENERATOR & SOLVER
     ========================================================================== */

  generateSudoku(difficulty) {
    // 1. Create empty 9x9 matrix
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    
    // 2. Fill diagonal 3x3 matrices for fast generation
    for (let i = 0; i < 9; i += 3) {
      this.fill3x3Box(grid, i, i);
    }
    
    // 3. Fill remaining grid using backtracking
    this.solveGrid(grid);
    this.solution = grid.map(row => [...row]);

    // 4. Remove elements according to difficulty
    const cluesCount = {
      easy: 45,
      medium: 35,
      hard: 28,
      expert: 22
    }[difficulty] || 35;

    const puzzle = grid.map(row => [...row]);
    let cellsToRemove = 81 - cluesCount;
    
    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    this.shuffleArray(positions);

    for (const [r, c] of positions) {
      if (cellsToRemove <= 0) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      // Check for unique solution
      const copy = puzzle.map(row => [...row]);
      if (this.countSolutions(copy) !== 1) {
        puzzle[r][c] = backup; // Restore if not unique
      } else {
        cellsToRemove--;
      }
    }

    return { puzzle, solution: this.solution };
  }

  fill3x3Box(grid, row, col) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    this.shuffleArray(nums);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[row + r][col + c] = nums[idx++];
      }
    }
  }

  solveGrid(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          this.shuffleArray(nums);
          for (const num of nums) {
            if (this.isValidPlacement(grid, r, c, num)) {
              grid[r][c] = num;
              if (this.solveGrid(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  getValidCandidates(grid, row, col) {
    const candidates = [];
    for (let num = 1; num <= 9; num++) {
      if (this.isValidPlacement(grid, row, col, num)) {
        candidates.push(num);
      }
    }
    return candidates;
  }

  findBestEmptyCell(grid) {
    let bestCell = null;
    let minCandidates = 10;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const cand = this.getValidCandidates(grid, r, c);
          if (cand.length < minCandidates) {
            minCandidates = cand.length;
            bestCell = { row: r, col: c, candidates: cand };
            if (minCandidates === 0) return bestCell;
          }
        }
      }
    }
    return bestCell;
  }

  countSolutions(grid, count = { val: 0 }) {
    const bestCell = this.findBestEmptyCell(grid);
    if (!bestCell) {
      count.val++;
      return count.val;
    }

    if (bestCell.candidates.length === 0) return count.val;

    const { row, col, candidates } = bestCell;
    for (const num of candidates) {
      grid[row][col] = num;
      this.countSolutions(grid, count);
      grid[row][col] = 0;
      if (count.val >= 2) return count.val;
    }
    return count.val;
  }

  isValidPlacement(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num && i !== col) return false;
      if (grid[i][col] === num && i !== row) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const currR = boxRow + r;
        const currC = boxCol + c;
        if (grid[currR][currC] === num && (currR !== row || currC !== col)) return false;
      }
    }
    return true;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /* ==========================================================================
     GAME INITIALIZATION & RENDERING
     ========================================================================== */

  startNewGame() {
    const generated = this.generateSudoku(this.difficulty);
    this.initialGrid = generated.puzzle.map(row => [...row]);
    this.currentGrid = generated.puzzle.map(row => [...row]);
    this.solution = generated.solution;

    this.notesGrid = Array.from({ length: 9 }, () => 
      Array.from({ length: 9 }, () => new Set())
    );

    this.mistakes = 0;
    this.history = [];
    this.selectedCell = null;
    this.isPencilMode = false;
    this.notesIndicator.textContent = 'OFF';
    this.notesBtn.classList.remove('active');

    this.completedRows = new Set();
    this.completedCols = new Set();
    this.completedBoxes = new Set();

    this.resetTimer();
    this.gameStarted = false;
    if (this.startOverlay) {
      this.startOverlay.classList.remove('hidden');
      this.startOverlay.style.display = 'flex';
    }
    
    this.renderBoard();
    this.updateStatsDisplay();
    this.updateNumpadCounts();
    this.saveGameState();
  }

  renderBoard() {
    this.boardEl.innerHTML = '';
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        
        const val = this.currentGrid[r][c];
        const isGiven = this.initialGrid[r][c] !== 0;

        if (isGiven) {
          cell.classList.add('given');
          cell.textContent = val;
        } else if (val !== 0) {
          cell.classList.add('user-input');
          cell.textContent = val;
          if (val !== this.solution[r][c]) {
            cell.classList.add('error');
          }
        } else {
          // Render pencil notes if any
          const notes = this.notesGrid[r][c];
          if (notes && notes.size > 0) {
            cell.appendChild(this.createNotesGrid(notes));
          }
        }

        this.boardEl.appendChild(cell);
      }
    }
  }

  createNotesGrid(notesSet) {
    const grid = document.createElement('div');
    grid.className = 'notes-grid';
    for (let i = 1; i <= 9; i++) {
      const item = document.createElement('div');
      item.className = 'note-num';
      if (notesSet.has(i)) {
        item.textContent = i;
      }
      grid.appendChild(item);
    }
    return grid;
  }

  updateHighlights() {
    const cells = this.boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.classList.remove('selected', 'highlight-group', 'highlight-same');
    });

    if (!this.selectedCell) return;

    const { row, col } = this.selectedCell;
    const selectedVal = this.currentGrid[row][col];

    cells.forEach(cell => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      if (isNaN(r) || isNaN(c)) return;

      const isSameCell = r === row && c === col;
      const isSameRow = r === row;
      const isSameCol = c === col;
      const isSameBox = Math.floor(r / 3) === Math.floor(row / 3) && 
                        Math.floor(c / 3) === Math.floor(col / 3);

      if (isSameCell) {
        cell.classList.add('selected');
      } else if (isSameRow || isSameCol || isSameBox) {
        cell.classList.add('highlight-group');
      }

      if (selectedVal !== 0 && this.currentGrid[r][c] === selectedVal) {
        cell.classList.add('highlight-same');
      }
    });
  }

  startGame() {
    if (this.startOverlay) {
      this.startOverlay.classList.add('hidden');
      this.startOverlay.style.display = 'none';
    }
    this.gameStarted = true;
    this.startTimer();
  }

  ensureGameStarted() {
    if (!this.gameStarted) {
      this.startGame();
    }
  }

  selectCell(row, col) {
    if (this.isPaused) return;
    this.ensureGameStarted();
    this.selectedCell = { row, col };
    this.updateHighlights();
  }

  /* ==========================================================================
     USER CONTROLS & GAMEPLAY LOGIC
     ========================================================================== */

  inputDigit(num) {
    this.ensureGameStarted();
    if (!this.selectedCell || this.isPaused) return;
    const { row, col } = this.selectedCell;

    // Fixed initial clues cannot be changed
    if (this.initialGrid[row][col] !== 0) return;

    const currentVal = this.currentGrid[row][col];
    const currentNotes = new Set(this.notesGrid[row][col]);

    if (this.isPencilMode) {
      // Toggle candidate note
      if (currentVal !== 0) return; // cannot add notes if cell has a number

      this.saveHistoryState();
      if (currentNotes.has(num)) {
        this.notesGrid[row][col].delete(num);
      } else {
        this.notesGrid[row][col].add(num);
      }
    } else {
      // Input final number
      if (currentVal === num) return; // Same number

      this.saveHistoryState();
      this.currentGrid[row][col] = num;
      this.notesGrid[row][col].clear();

      // Check error
      if (num !== this.solution[row][col]) {
        this.mistakes++;
        this.soundFX.playError();
        this.updateStatsDisplay();
        if (this.mistakes >= this.maxMistakes) {
          this.triggerGameOver();
          return;
        }
      } else {
        this.soundFX.playPlace();
        // Clear this note from same row, col, and box for other cells
        this.autoClearNotes(row, col, num);
        this.checkLineCompletions(row, col);
      }

      // Check victory
      this.checkWinCondition();
    }

    this.renderCell(row, col);
    this.updateHighlights();
    this.updateNumpadCounts();
    this.saveGameState();
  }

  eraseSelected() {
    this.ensureGameStarted();
    if (!this.selectedCell || this.isPaused) return;
    const { row, col } = this.selectedCell;

    if (this.initialGrid[row][col] !== 0) return;
    if (this.currentGrid[row][col] === 0 && this.notesGrid[row][col].size === 0) return;

    this.saveHistoryState();
    this.currentGrid[row][col] = 0;
    this.notesGrid[row][col].clear();

    this.renderCell(row, col);
    this.updateHighlights();
    this.updateNumpadCounts();
    this.saveGameState();
  }

  togglePencilMode() {
    this.isPencilMode = !this.isPencilMode;
    this.notesBtn.classList.toggle('active', this.isPencilMode);
    this.notesIndicator.textContent = this.isPencilMode ? 'ON' : 'OFF';
  }

  giveHint() {
    this.ensureGameStarted();
    if (this.isPaused) return;
    
    // Find unrevealed or incorrect cells
    const emptyOrIncorrect = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.initialGrid[r][c] === 0 && this.currentGrid[r][c] !== this.solution[r][c]) {
          emptyOrIncorrect.push({ row: r, col: c });
        }
      }
    }

    if (emptyOrIncorrect.length === 0) return;

    // Pick one cell (prioritize currently selected cell if empty/incorrect)
    let target = emptyOrIncorrect[Math.floor(Math.random() * emptyOrIncorrect.length)];
    if (this.selectedCell) {
      const match = emptyOrIncorrect.find(
        item => item.row === this.selectedCell.row && item.col === this.selectedCell.col
      );
      if (match) target = match;
    }

    const { row, col } = target;
    this.saveHistoryState();
    this.currentGrid[row][col] = this.solution[row][col];
    this.notesGrid[row][col].clear();

    this.selectCell(row, col);
    this.renderCell(row, col);
    
    const cellEl = this.boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cellEl) {
      cellEl.classList.add('hint');
      setTimeout(() => cellEl.classList.remove('hint'), 1200);
    }

    this.autoClearNotes(row, col, this.solution[row][col]);
    this.checkLineCompletions(row, col);
    this.updateNumpadCounts();
    this.checkWinCondition();
    this.saveGameState();
  }

  autoClearNotes(row, col, num) {
    for (let i = 0; i < 9; i++) {
      this.notesGrid[row][i].delete(num);
      this.notesGrid[i][col].delete(num);
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        this.notesGrid[boxRow + r][boxCol + c].delete(num);
      }
    }
  }

  saveHistoryState() {
    const snap = {
      grid: this.currentGrid.map(row => [...row]),
      notes: this.notesGrid.map(row => row.map(set => new Set(set))),
      mistakes: this.mistakes
    };
    this.history.push(snap);
    if (this.history.length > 30) this.history.shift();
  }

  undo() {
    if (this.history.length === 0 || this.isPaused) return;
    const last = this.history.pop();
    this.currentGrid = last.grid;
    this.notesGrid = last.notes;
    this.mistakes = last.mistakes;

    this.reevaluateCompletions();
    this.renderBoard();
    this.updateHighlights();
    this.updateStatsDisplay();
    this.updateNumpadCounts();
    this.saveGameState();
  }

  checkLineCompletions(row, col) {
    if (!this.completedRows) this.completedRows = new Set();
    if (!this.completedCols) this.completedCols = new Set();
    if (!this.completedBoxes) this.completedBoxes = new Set();

    const cellsToShine = new Set();

    // Check Row
    if (!this.completedRows.has(row)) {
      let rowComplete = true;
      for (let c = 0; c < 9; c++) {
        if (this.currentGrid[row][c] === 0 || this.currentGrid[row][c] !== this.solution[row][c]) {
          rowComplete = false;
          break;
        }
      }
      if (rowComplete) {
        this.completedRows.add(row);
        for (let c = 0; c < 9; c++) {
          cellsToShine.add(`${row}-${c}`);
        }
      }
    }

    // Check Column
    if (!this.completedCols.has(col)) {
      let colComplete = true;
      for (let r = 0; r < 9; r++) {
        if (this.currentGrid[r][col] === 0 || this.currentGrid[r][col] !== this.solution[r][col]) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) {
        this.completedCols.add(col);
        for (let r = 0; r < 9; r++) {
          cellsToShine.add(`${r}-${col}`);
        }
      }
    }

    // Check 3x3 Box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);

    if (!this.completedBoxes.has(boxIndex)) {
      let boxComplete = true;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const currR = boxRow + r;
          const currC = boxCol + c;
          if (this.currentGrid[currR][currC] === 0 || this.currentGrid[currR][currC] !== this.solution[currR][currC]) {
            boxComplete = false;
            break;
          }
        }
        if (!boxComplete) break;
      }
      if (boxComplete) {
        this.completedBoxes.add(boxIndex);
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            cellsToShine.add(`${boxRow + r}-${boxCol + c}`);
          }
        }
      }
    }

    if (cellsToShine.size > 0) {
      this.shineCompletedCells(cellsToShine);
    }
  }

  shineCompletedCells(cellKeySet) {
    this.soundFX.playShine();
    cellKeySet.forEach(key => {
      const [r, c] = key.split('-');
      const cellEl = this.boardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      if (cellEl) {
        cellEl.classList.remove('completion-shine');
        void cellEl.offsetWidth;
        cellEl.classList.add('completion-shine');
        setTimeout(() => {
          cellEl.classList.remove('completion-shine');
        }, 900);
      }
    });
  }

  reevaluateCompletions() {
    if (!this.completedRows) this.completedRows = new Set();
    if (!this.completedCols) this.completedCols = new Set();
    if (!this.completedBoxes) this.completedBoxes = new Set();

    this.completedRows.clear();
    this.completedCols.clear();
    this.completedBoxes.clear();

    for (let r = 0; r < 9; r++) {
      let rowComplete = true;
      for (let c = 0; c < 9; c++) {
        if (this.currentGrid[r][c] === 0 || this.currentGrid[r][c] !== this.solution[r][c]) {
          rowComplete = false;
          break;
        }
      }
      if (rowComplete) this.completedRows.add(r);
    }

    for (let c = 0; c < 9; c++) {
      let colComplete = true;
      for (let r = 0; r < 9; r++) {
        if (this.currentGrid[r][c] === 0 || this.currentGrid[r][c] !== this.solution[r][c]) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) this.completedCols.add(c);
    }

    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const boxIndex = br * 3 + bc;
        let boxComplete = true;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const currR = br * 3 + r;
            const currC = bc * 3 + c;
            if (this.currentGrid[currR][currC] === 0 || this.currentGrid[currR][currC] !== this.solution[currR][currC]) {
              boxComplete = false;
              break;
            }
          }
          if (!boxComplete) break;
        }
        if (boxComplete) this.completedBoxes.add(boxIndex);
      }
    }
  }

  renderCell(row, col) {
    const cell = this.boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;

    cell.className = 'cell';
    cell.dataset.row = row;
    cell.dataset.col = col;
    cell.innerHTML = '';

    const val = this.currentGrid[row][col];
    const isGiven = this.initialGrid[row][col] !== 0;

    if (isGiven) {
      cell.classList.add('given');
      cell.textContent = val;
    } else if (val !== 0) {
      cell.classList.add('user-input');
      cell.textContent = val;
      if (val !== this.solution[row][col]) {
        cell.classList.add('error');
      }
    } else {
      const notes = this.notesGrid[row][col];
      if (notes && notes.size > 0) {
        cell.appendChild(this.createNotesGrid(notes));
      }
    }
  }

  updateNumpadCounts() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = this.currentGrid[r][c];
        if (val >= 1 && val <= 9 && val === this.solution[r][c]) {
          counts[val]++;
        }
      }
    }

    for (let i = 1; i <= 9; i++) {
      const remaining = 9 - counts[i];
      const btn = this.numpadEl.querySelector(`[data-value="${i}"]`);
      if (btn) {
        if (remaining === 0) {
          btn.classList.add('completed');
        } else {
          btn.classList.remove('completed');
        }
      }
    }
  }

  handleKeyDown(e) {
    if (this.isPaused) return;

    // Arrow Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (!this.selectedCell) {
        this.selectCell(0, 0);
        return;
      }
      let { row, col } = this.selectedCell;
      if (e.key === 'ArrowUp') row = (row - 1 + 9) % 9;
      if (e.key === 'ArrowDown') row = (row + 1) % 9;
      if (e.key === 'ArrowLeft') col = (col - 1 + 9) % 9;
      if (e.key === 'ArrowRight') col = (col + 1) % 9;
      this.selectCell(row, col);
      return;
    }

    // Numbers 1-9
    if (e.key >= '1' && e.key <= '9') {
      this.inputDigit(parseInt(e.key, 10));
      return;
    }

    // Erase
    if (e.key === 'Backspace' || e.key === 'Delete') {
      this.eraseSelected();
      return;
    }

    // Note mode shortcut 'N'
    if (e.key === 'n' || e.key === 'N') {
      this.togglePencilMode();
      return;
    }

    // Undo shortcut Ctrl+Z or 'U'
    if (((e.ctrlKey || e.metaKey) && e.key === 'z') || e.key === 'u' || e.key === 'U') {
      this.undo();
      return;
    }

    // Hint shortcut 'H'
    if (e.key === 'h' || e.key === 'H') {
      this.giveHint();
      return;
    }

    // Pause shortcut 'P'
    if (e.key === 'p' || e.key === 'P') {
      this.togglePause();
      return;
    }
  }

  /* ==========================================================================
     TIMER & GAME STATE PERSISTENCE
     ========================================================================== */

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.timerSeconds++;
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer() {
    this.stopTimer();
    this.timerSeconds = 0;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
    const secs = (this.timerSeconds % 60).toString().padStart(2, '0');
    this.timerTextEl.textContent = `${mins}:${secs}`;
  }

  togglePause(forceState) {
    if (!this.gameStarted) {
      this.ensureGameStarted();
    }
    this.isPaused = forceState !== undefined ? forceState : !this.isPaused;
    
    if (this.isPaused) {
      this.pauseOverlay.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
      this.playIcon.classList.remove('hidden');
    } else {
      this.pauseOverlay.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
      this.playIcon.classList.add('hidden');
    }
  }

  updateStatsDisplay() {
    this.mistakesEl.textContent = `${this.mistakes} / ${this.maxMistakes}`;
    this.difficultySelect.value = this.difficulty;
  }

  checkWinCondition() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.currentGrid[r][c] !== this.solution[r][c]) {
          return false;
        }
      }
    }

    // Solved!
    this.stopTimer();
    this.winDifficulty.textContent = this.difficulty.toUpperCase();
    this.winTime.textContent = this.timerTextEl.textContent;
    this.winMistakes.textContent = this.mistakes;

    setTimeout(() => {
      this.winModal.classList.remove('hidden');
    }, 300);

    localStorage.removeItem('sudoku_pro_saved_game');
    return true;
  }

  triggerGameOver() {
    this.stopTimer();
    if (this.gameOverDifficulty) this.gameOverDifficulty.textContent = this.difficulty.toUpperCase();
    if (this.gameOverTime) this.gameOverTime.textContent = this.timerTextEl.textContent;
    this.isPaused = true;
    setTimeout(() => {
      if (this.gameOverModal) this.gameOverModal.classList.remove('hidden');
    }, 300);
    localStorage.removeItem('sudoku_pro_saved_game');
  }

  toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme', !isLight);
    localStorage.setItem('sudoku_pro_theme', isLight ? 'light' : 'dark');
  }

  toggleSound() {
    const muted = this.soundFX.toggleMute();
    if (this.soundOnIcon && this.soundOffIcon) {
      this.soundOnIcon.classList.toggle('hidden', muted);
      this.soundOffIcon.classList.toggle('hidden', !muted);
    }
  }

  saveGameState() {
    const state = {
      difficulty: this.difficulty,
      initialGrid: this.initialGrid,
      currentGrid: this.currentGrid,
      solution: this.solution,
      notesGrid: this.notesGrid.map(row => row.map(set => Array.from(set))),
      mistakes: this.mistakes,
      timerSeconds: this.timerSeconds
    };
    localStorage.setItem('sudoku_pro_saved_game', JSON.stringify(state));
  }

  loadGameState() {
    const savedTheme = localStorage.getItem('sudoku_pro_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }

    const saved = localStorage.getItem('sudoku_pro_saved_game');
    if (!saved) return false;

    try {
      const state = JSON.parse(saved);
      this.difficulty = state.difficulty || 'medium';
      this.initialGrid = state.initialGrid;
      this.currentGrid = state.currentGrid;
      this.solution = state.solution;
      this.notesGrid = state.notesGrid.map(row => row.map(arr => new Set(arr)));
      this.mistakes = state.mistakes || 0;
      this.timerSeconds = state.timerSeconds || 0;

      this.gameStarted = false;
      this.stopTimer();
      this.updateTimerDisplay();
      if (this.startOverlay) {
        this.startOverlay.classList.remove('hidden');
        this.startOverlay.style.display = 'flex';
      }
      this.renderBoard();
      this.updateStatsDisplay();
      this.updateNumpadCounts();
      return true;
    } catch (e) {
      console.error('Failed to parse saved game state', e);
      return false;
    }
  }
}

// Initialize on DOM load
if (typeof window !== 'undefined') {
  window.SudokuGame = SudokuGame;
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new SudokuGame();
});
