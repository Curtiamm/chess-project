/**
 * ai.js - Minimax Chess AI
 */

class ChessAI {
    constructor(board) {
        this.board = board;
        this.pieceValues = { P: 10, N: 30, B: 30, R: 50, Q: 90, K: 900 };
        
        // Piece Square Tables (Simplified)
        this.pawnPST = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];
    }

    evaluate() {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board.grid[r][c];
                if (p) {
                    let val = this.pieceValues[p.type];
                    // Add positional bonus for pawns
                    if (p.type === 'P') {
                        val += (p.color === 'white' ? this.pawnPST[r][c] : this.pawnPST[7-r][c]) / 10;
                    }
                    score += p.color === 'white' ? -val : val; 
                }
            }
        }
        return score;
    }

    getBestMove(color, depth = 2) {
        const moves = this.getAllLegalMoves(color);
        if (moves.length === 0) return null;

        const isMax = color === 'black'; // AI (Black) maximizes
        let bestScore = isMax ? -Infinity : Infinity;
        let bestMove = null;

        for (let move of moves) {
            this.makeVirtualMove(move);
            let score = this.minimax(depth - 1, -10000, 10000, !isMax);
            this.undoVirtualMove(move);

            if (isMax) {
                if (score > bestScore) { bestScore = score; bestMove = move; }
            } else {
                if (score < bestScore) { bestScore = score; bestMove = move; }
            }
        }
        return bestMove;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) return this.evaluate();

        const moves = this.getAllLegalMoves(isMaximizing ? 'black' : 'white');
        if (moves.length === 0) return isMaximizing ? -9000 : 9000;

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (let move of moves) {
                this.makeVirtualMove(move);
                maxScore = Math.max(maxScore, this.minimax(depth - 1, alpha, beta, false));
                this.undoVirtualMove(move);
                alpha = Math.max(alpha, maxScore);
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (let move of moves) {
                this.makeVirtualMove(move);
                minScore = Math.min(minScore, this.minimax(depth - 1, alpha, beta, true));
                this.undoVirtualMove(move);
                beta = Math.min(beta, minScore);
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }

    getAllLegalMoves(color) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board.grid[r][c];
                if (p && p.color === color) {
                    const pMoves = this.board.getLegalMoves(r, c);
                    pMoves.forEach(([tr, tc]) => {
                        const target = this.board.grid[tr][tc];
                        let score = 0;
                        if (target) {
                            score = 10 * this.pieceValues[target.type] - this.pieceValues[p.type];
                        }
                        moves.push({ sr: r, sc: c, tr, tc, score });
                    });
                }
            }
        }
        // Sort moves by score (greedy approach for alpha-beta efficiency)
        return moves.sort((a, b) => b.score - a.score);
    }

    makeVirtualMove(m) {
        m.captured = this.board.grid[m.tr][m.tc];
        this.board.grid[m.tr][m.tc] = this.board.grid[m.sr][m.sc];
        this.board.grid[m.sr][m.sc] = null;
        this.board.turn = this.board.turn === 'white' ? 'black' : 'white';
    }

    undoVirtualMove(m) {
        this.board.grid[m.sr][m.sc] = this.board.grid[m.tr][m.tc];
        this.board.grid[m.tr][m.tc] = m.captured;
        this.board.turn = this.board.turn === 'white' ? 'black' : 'white';
    }
}
