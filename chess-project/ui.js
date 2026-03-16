/**
 * ui.js - Chess UI Controller
 */

class UIController {
    constructor(board, onMove) {
        this.board = board;
        this.onMove = onMove;
        this.boardEl = document.getElementById('chess-board');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.statusBox = document.getElementById('gameStatus');
        this.moveLog = document.getElementById('moveLog');
        this.capturedWhite = document.getElementById('captured-white');
        this.capturedBlack = document.getElementById('captured-black');
        this.promotionOverlay = document.getElementById('promotion-overlay');
        this.evalFill = document.getElementById('eval-fill');
        this.evalScore = document.getElementById('eval-score');
        
        this.selectedSquare = null;
        this.render();
    }

    render() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.r = r;
                square.dataset.c = c;
                
                const piece = this.board.grid[r][c];
                if (piece) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = `piece ${piece.color}`;
                    pieceEl.textContent = piece.symbol;
                    square.appendChild(pieceEl);
                }

                square.onclick = () => this.handleSquareClick(r, c);
                this.boardEl.appendChild(square);
            }
        }
        this.renderCaptured();
        this.updateStatus();
        this.highlight();
    }

    playSound(type) {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        if (type === 'check') {
            const playPulse = (freq, startTime, duration, volume) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(volume, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const now = this.audioCtx.currentTime;
            const tempo = 0.12;
            playPulse(250, now, 0.1, 0.1);
            playPulse(250, now + tempo, 0.1, 0.1);
            playPulse(250, now + tempo * 2, 0.1, 0.1);
            playPulse(500, now + tempo * 3, 0.2, 0.15);
        }
    }

    updateEvalBar(score) {
        // Score is from White perspective for UI (negative means white winning)
        // Convert score into percentage (0-100)
        // Neutral (score 0) = 50%
        // Score of 10 (one pawn) = +/- 5%
        const scoreVal = -score / 10; // Positive = white better
        let percent = 50 + (scoreVal * 5);
        percent = Math.max(5, Math.min(95, percent));
        
        this.evalFill.style.height = `${percent}%`;
        this.evalScore.textContent = (scoreVal > 0 ? '+' : '') + scoreVal.toFixed(1);
    }

    showHint(move) {
        if (!move) return;
        const sq = this.boardEl.querySelector(`[data-r="${move.sr}"][data-c="${move.sc}"]`);
        const targetSq = this.boardEl.querySelector(`[data-r="${move.tr}"][data-c="${move.tc}"]`);
        sq.classList.add('hint');
        targetSq.classList.add('hint');
        
        setTimeout(() => {
            sq.classList.remove('hint');
            targetSq.classList.remove('hint');
        }, 3000);
    }

    renderCaptured() {
        this.capturedWhite.innerHTML = this.board.captured.white
            .map(p => `<span>${p.symbol}</span>`).join('');
        this.capturedBlack.innerHTML = this.board.captured.black
            .map(p => `<span>${p.symbol}</span>`).join('');
    }

    handleSquareClick(r, c) {
        // Find current game mode from internal display if not passed
        const displayMode = document.getElementById('displayMode').textContent;
        const isPvAI = displayMode.includes('Máy');
        
        if (isPvAI && this.board.turn === 'black') return; 

        if (this.selectedSquare) {
            const [sr, sc] = this.selectedSquare;
            const legalMoves = this.board.getLegalMoves(sr, sc);
            const isLegal = legalMoves.some(([tr, tc]) => tr === r && tc === c);

            if (isLegal) {
                this.onMove(sr, sc, r, c);
                this.selectedSquare = null;
            } else {
                // Change selection or deselect
                if (this.board.grid[r][c]?.color === this.board.turn) {
                    this.selectedSquare = [r, c];
                } else {
                    this.selectedSquare = null;
                }
            }
        } else {
            if (this.board.grid[r][c]?.color === this.board.turn) {
                this.selectedSquare = [r, c];
            }
        }
        this.highlight();
    }

    highlight() {
        // Clear highlights
        document.querySelectorAll('.square').forEach(s => {
            s.classList.remove('selected', 'possible-move', 'check-warning');
        });

        // Highlight King if in check
        const inCheck = this.board.isInCheck(this.board.turn);
        if (inCheck) {
            // Find King
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = this.board.grid[r][c];
                    if (piece?.type === 'K' && piece.color === this.board.turn) {
                        const kingSq = this.boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
                        kingSq.classList.add('check-warning');
                    }
                }
            }
        }

        if (this.selectedSquare) {
            const [r, c] = this.selectedSquare;
            const sq = this.boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
            sq.classList.add('selected');

            const legalMoves = this.board.getLegalMoves(r, c);
            legalMoves.forEach(([tr, tc]) => {
                const targetSq = this.boardEl.querySelector(`[data-r="${tr}"][data-c="${tc}"]`);
                targetSq.classList.add('possible-move');
            });
        }
    }

    updateStatus() {
        const turnText = this.board.turn === 'white' ? 'TRẮNG ĐI' : 'ĐEN ĐI';
        this.turnIndicator.innerHTML = `<span class="dot" style="background: ${this.board.turn === 'white' ? '#fff' : '#000'}"></span> ${turnText}`;
        
        const inCheck = this.board.isInCheck(this.board.turn);
        const isGameOver = this.board.isGameOver();

        if (isGameOver) {
            if (inCheck) {
                this.statusBox.textContent = `CHIẾU BÍ! ${this.board.turn === 'white' ? 'ĐEN' : 'TRẮNG'} THẮNG`;
                this.statusBox.style.color = "#e74c3c";
            } else if (this.board.halfMoveClock >= 100) {
                this.statusBox.textContent = "HÒA CỜ (QUY TẮC 50 NƯỚC)";
                this.statusBox.style.color = "#f1c40f";
            } else if (this.board.isInsufficientMaterial()) {
                this.statusBox.textContent = "HÒA CỜ (KHÔNG ĐỦ LỰC LƯỢNG)";
                this.statusBox.style.color = "#f1c40f";
            } else {
                this.statusBox.textContent = "HÒA CỜ (STALEMATE)";
                this.statusBox.style.color = "#f1c40f";
            }
        } else if (inCheck) {
            this.statusBox.textContent = "Đang bị CHIẾU!";
            this.statusBox.style.color = "#e74c3c";
        } else {
            this.statusBox.textContent = "Đang chơi...";
            this.statusBox.style.color = "#fff";
        }
    }

    showPromotion(onSelect) {
        this.promotionOverlay.classList.remove('hidden');
        const buttons = this.promotionOverlay.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.onclick = () => {
                this.promotionOverlay.classList.add('hidden');
                onSelect(btn.dataset.piece);
            };
        });
    }

    addMoveToLog(sr, sc, tr, tc, piece) {
        const notation = `${piece.symbol}${String.fromCharCode(97+sc)}${8-sr} → ${String.fromCharCode(97+tc)}${8-tr}`;
        const entry = document.createElement('div');
        entry.textContent = notation;
        this.moveLog.prepend(entry);
    }
}
