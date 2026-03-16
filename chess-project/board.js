/**
 * board.js - Chess Game Logic and State
 */

class ChessBoard {
    constructor() {
        this.grid = Array(8).fill(null).map(() => Array(8).fill(null));
        this.turn = 'white';
        this.history = [];
        this.captured = { white: [], black: [] };
        this.enPassantTarget = null;
        this.halfMoveClock = 0; // FIDE 50-move rule tracker
        this.initBoard();
    }

    initBoard() {
        const layout = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        for (let i = 0; i < 8; i++) {
            this.grid[0][i] = new (this.getPieceClass(layout[i]))('black');
            this.grid[1][i] = new Pawn('black');
            this.grid[6][i] = new Pawn('white');
            this.grid[7][i] = new (this.getPieceClass(layout[i]))('white');
        }
    }

    getPieceClass(type) {
        switch(type) {
            case 'R': return Rook;
            case 'N': return Knight;
            case 'B': return Bishop;
            case 'Q': return Queen;
            case 'K': return King;
            default: return Pawn;
        }
    }

    isInside(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    isEmpty(r, c) { return this.isInside(r, c) && this.grid[r][c] === null; }
    isAlly(r, c, color) { return this.isInside(r, c) && this.grid[r][c]?.color === color; }
    isEnemy(r, c, color) { return this.isInside(r, c) && this.grid[r][c] !== null && this.grid[r][c].color !== color; }

    getSlidingMoves([r, c], dirs, color) {
        const moves = [];
        for (let [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (this.isInside(nr, nc)) {
                if (this.isEmpty(nr, nc)) {
                    moves.push([nr, nc]);
                } else {
                    if (this.grid[nr][nc].color !== color) moves.push([nr, nc]);
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        return moves;
    }

    getLegalMoves(r, c) {
        const piece = this.grid[r][c];
        if (!piece || piece.color !== this.turn) return [];
        
        let moves = piece.getValidMoves(this, [r, c]);

        // Add En Passant for Pawns
        if (piece instanceof Pawn) {
            const dir = piece.color === 'white' ? -1 : 1;
            if (this.enPassantTarget) {
                const [er, ec] = this.enPassantTarget;
                if (er === r + dir && Math.abs(ec - c) === 1) {
                    moves.push([er, ec]);
                }
            }
        }

        // Add Castling for King
        if (piece instanceof King && !piece.hasMoved && !this.isInCheck(piece.color)) {
            // Kingside
            if (this.canCastle(r, c, c + 3)) moves.push([r, c + 2]);
            // Queenside
            if (this.canCastle(r, c, c - 4)) moves.push([r, c - 2]);
        }
        
        // Filter moves that leave king in check
        return moves.filter(([nr, nc]) => !this.leavesKingInCheck(r, c, nr, nc));
    }

    canCastle(kr, kc, rr) {
        const rook = this.grid[kr][rr];
        if (!(rook instanceof Rook) || rook.hasMoved) return false;
        
        const step = rr > kc ? 1 : -1;
        for (let c = kc + step; c !== rr; c += step) {
            if (this.grid[kr][c] !== null) return false;
            // FIDE: King cannot pass through squares attacked by enemy
            if (Math.abs(c - kc) <= 2 && this.isSquareAttacked(kr, c, this.grid[kr][kc].color)) return false;
        }
        return true;
    }

    isSquareAttacked(r, c, defenderColor) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = this.grid[row][col];
                if (p && p.color !== defenderColor) {
                    const moves = p.getValidMoves(this, [row, col]);
                    if (moves.some(([mr, mc]) => mr === r && mc === c)) return true;
                }
            }
        }
        return false;
    }

    leavesKingInCheck(r, c, nr, nc) {
        const tempPiece = this.grid[nr][nc];
        const movingPiece = this.grid[r][c];
        
        this.grid[nr][nc] = movingPiece;
        this.grid[r][c] = null;
        
        const inCheck = this.isInCheck(movingPiece.color);
        
        this.grid[r][c] = movingPiece;
        this.grid[nr][nc] = tempPiece;
        
        return inCheck;
    }

    isInCheck(color) {
        let kingPos = null;
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                if (this.grid[r][c] instanceof King && this.grid[r][c].color === color) {
                    kingPos = [r, c]; break;
                }
            }
            if (kingPos) break;
        }

        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const p = this.grid[r][c];
                if (p && p.color !== color) {
                    if (p.getValidMoves(this, [r, c]).some(([nr, nc]) => nr === kingPos[0] && nc === kingPos[1])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    movePiece(sr, sc, tr, tc) {
        const piece = this.grid[sr][sc];
        const capturedPiece = this.grid[tr][tc];
        let actualCaptured = capturedPiece;

        // Handle En Passant Capture
        if (piece instanceof Pawn && !capturedPiece && tc !== sc) {
            const dir = piece.color === 'white' ? 1 : -1;
            actualCaptured = this.grid[tr + dir][tc];
            this.grid[tr + dir][tc] = null;
        }

        if (actualCaptured) {
            this.captured[actualCaptured.color].push(actualCaptured);
        }

        // Handle Castling Move (King jump)
        if (piece instanceof King && Math.abs(tc - sc) === 2) {
            const rookCol = tc > sc ? 7 : 0;
            const rookDestCol = tc > sc ? tc - 1 : tc + 1;
            const rook = this.grid[sr][rookCol];
            this.grid[sr][rookDestCol] = rook;
            this.grid[sr][rookCol] = null;
            rook.hasMoved = true;
        }

        this.history.push({ 
            sr, sc, tr, tc, 
            captured: actualCaptured, 
            piece, 
            prevEP: this.enPassantTarget,
            hadMoved: piece.hasMoved,
            prevHalfMove: this.halfMoveClock
        });
        
        // Update half-move clock
        if (piece instanceof Pawn || actualCaptured) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }

        this.grid[tr][tc] = piece;
        this.grid[sr][sc] = null;
        piece.hasMoved = true;

        // Set En Passant Target for next move
        this.enPassantTarget = null;
        if (piece instanceof Pawn && Math.abs(tr - sr) === 2) {
            this.enPassantTarget = [(sr + tr) / 2, sc];
        }

        // Check for promotion
        if (piece instanceof Pawn && (tr === 0 || tr === 7)) {
            return { promotion: true, r: tr, c: tc };
        }

        this.turn = this.turn === 'white' ? 'black' : 'white';
        return { promotion: false };
    }

    promote(r, c, type) {
        const color = this.grid[r][c].color;
        this.grid[r][c] = new (this.getPieceClass(type))(color);
        this.turn = this.turn === 'white' ? 'black' : 'white';
    }

    undo() {
        if (this.history.length === 0) return;
        const last = this.history.pop();
        const { sr, sc, tr, tc, captured, piece, prevEP, hadMoved, prevHalfMove } = last;
        
        this.halfMoveClock = prevHalfMove;
        
        // Move the piece back to its original square
        this.grid[sr][sc] = piece;
        piece.hasMoved = hadMoved;

        // Handle the target square
        // Usually we clear it, unless a piece was captured there (restored below)
        this.grid[tr][tc] = null; 

        if (captured) {
            // Restore captured piece
            // For En Passant, the captured pawn is on a different row
            const isEnPassant = piece instanceof Pawn && sc !== tc && !this.grid[tr][tc];
            const capR = isEnPassant ? (piece.color === 'white' ? tr + 1 : tr - 1) : tr;
            
            this.grid[capR][tc] = captured;
            this.captured[captured.color].pop();
        }

        // Reverse Castling logic
        if (piece instanceof King && Math.abs(tc - sc) === 2) {
            const rookCol = tc > sc ? 7 : 0;
            const rookDestCol = tc > sc ? tc - 1 : tc + 1;
            const rook = this.grid[sr][rookDestCol];
            this.grid[sr][rookCol] = rook;
            this.grid[sr][rookDestCol] = null;
            rook.hasMoved = false;
        }

        this.enPassantTarget = prevEP;
        this.turn = this.turn === 'white' ? 'black' : 'white';
    }

    isGameOver() {
        // 1. Check for draws by specific rules first
        if (this.halfMoveClock >= 100) return true; // 50-move rule
        if (this.isInsufficientMaterial()) return true;

        // 2. Check if current turn player has any legal moves
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.grid[r][c];
                if (p && p.color === this.turn) {
                    if (this.getLegalMoves(r, c).length > 0) return false;
                }
            }
        }
        
        // 3. No legal moves means either Checkmate or Stalemate
        return true;
    }

    isInsufficientMaterial() {
        const whitePieces = [];
        const blackPieces = [];
        
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const p = this.grid[r][c];
                if (!p) continue;
                if (p.color === 'white') whitePieces.push({type: p.type, r, c});
                else blackPieces.push({type: p.type, r, c});
            }
        }

        // King vs King
        if (whitePieces.length === 1 && blackPieces.length === 1) return true;

        // King & Minor piece vs King
        if (whitePieces.length === 2 && blackPieces.length === 1) {
            if (whitePieces.some(p => p.type === 'B' || p.type === 'N')) return true;
        }
        if (blackPieces.length === 2 && whitePieces.length === 1) {
            if (blackPieces.some(p => p.type === 'B' || p.type === 'N')) return true;
        }

        // King & Bishop vs King & Bishop (same color squares)
        if (whitePieces.length === 2 && blackPieces.length === 2) {
            const wB = whitePieces.find(p => p.type === 'B');
            const bB = blackPieces.find(p => p.type === 'B');
            if (wB && bB) {
                const wSquareColor = (wB.r + wB.c) % 2;
                const bSquareColor = (bB.r + bB.c) % 2;
                if (wSquareColor === bSquareColor) return true;
            }
        }

        return false;
    }
}
