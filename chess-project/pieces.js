/**
 * pieces.js - Object Oriented Chess Pieces
 */

const PIECE_TYPES = {
    P: 'Pawn', R: 'Rook', N: 'Knight', B: 'Bishop', Q: 'Queen', K: 'King'
};

const PIECE_SYMBOLS = {
    white: { P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔' },
    black: { P: '♟', R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚' }
};

class Piece {
    constructor(color, type) {
        this.color = color; // 'white' or 'black'
        this.type = type;   // 'P', 'R', 'N', 'B', 'Q', 'K'
        this.symbol = PIECE_SYMBOLS[color][type];
        this.hasMoved = false;
    }

    getValidMoves(board, currentPos) {
        // To be implemented by subclasses
        return [];
    }
}

class Pawn extends Piece {
    constructor(color) { super(color, 'P'); }
    getValidMoves(board, [r, c]) {
        const moves = [];
        const dir = this.color === 'white' ? -1 : 1;
        const startRow = this.color === 'white' ? 6 : 1;

        // Forward
        if (board.isEmpty(r + dir, c)) {
            moves.push([r + dir, c]);
            if (r === startRow && board.isEmpty(r + 2 * dir, c)) {
                moves.push([r + 2 * dir, c]);
            }
        }

        // Captures
        for (let dc of [-1, 1]) {
            if (board.isEnemy(r + dir, c + dc, this.color)) {
                moves.push([r + dir, c + dc]);
            }
        }
        
        // Note: En Passant would be handled in board.js
        return moves;
    }
}

class Rook extends Piece {
    constructor(color) { super(color, 'R'); }
    getValidMoves(board, pos) {
        return board.getSlidingMoves(pos, [[0,1], [0,-1], [1,0], [-1,0]], this.color);
    }
}

class Knight extends Piece {
    constructor(color) { super(color, 'N'); }
    getValidMoves(board, [r, c]) {
        const moves = [];
        const offsets = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
        for (let [dr, dc] of offsets) {
            if (board.isInside(r + dr, c + dc) && !board.isAlly(r + dr, c + dc, this.color)) {
                moves.push([r + dr, c + dc]);
            }
        }
        return moves;
    }
}

class Bishop extends Piece {
    constructor(color) { super(color, 'B'); }
    getValidMoves(board, pos) {
        return board.getSlidingMoves(pos, [[1,1], [1,-1], [-1,1], [-1,-1]], this.color);
    }
}

class Queen extends Piece {
    constructor(color) { super(color, 'Q'); }
    getValidMoves(board, pos) {
        return board.getSlidingMoves(pos, [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]], this.color);
    }
}

class King extends Piece {
    constructor(color) { super(color, 'K'); }
    getValidMoves(board, [r, c]) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                if (board.isInside(r + dr, c + dc) && !board.isAlly(r + dr, c + dc, this.color)) {
                    moves.push([r + dr, c + dc]);
                }
            }
        }
        // Note: Castling would be handled in board.js
        return moves;
    }
}
