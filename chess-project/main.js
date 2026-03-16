/**
 * main.js - Application Entry Point for Chess
 */

document.addEventListener('DOMContentLoaded', () => {
    let board, ai, ui;
    let gameMode = 'pvai';
    let difficulty = 2;
    let timers = { white: 600, black: 600 };
    let timerInterval = null;
    let socket = null;
    let myColor = null;
    let roomCode = null;

    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const diffSelection = document.getElementById('difficulty-selection');
    const onlineSelection = document.getElementById('online-selection');
    const modeSelection = document.getElementById('mode-selection');
    
    const initSocket = (serverIp) => {
        if (socket) socket.disconnect();
        
        let url;
        if (serverIp) {
            if (!serverIp.startsWith('http')) {
                const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
                const isLocal = serverIp.includes('localhost') || serverIp.includes('127.0.0.1') || serverIp.startsWith('192.168.') || serverIp.startsWith('172.');
                const port = isLocal ? ':3000' : '';
                url = `${protocol}://${serverIp}${port}`;
            } else {
                url = serverIp;
            }
        } else {
            url = window.location.origin;
        }
        
        console.log("Connecting to:", url);
        socket = io(url);

        socket.on('connect', () => {
            document.getElementById('online-room-actions').classList.remove('hidden');
            document.getElementById('connectBtn').textContent = "Đã Kết Nối ✓";
            document.getElementById('connectBtn').style.background = "#2ecc71";
            document.getElementById('serverIpInput').disabled = true;
        });

        socket.on('connect_error', () => {
            alert("Không thể kết nối tới Server. Hãy kiểm tra lại địa chỉ!");
            socket.disconnect();
            socket = null;
        });

        socket.on('roomCreated', (data) => {
            roomCode = data.roomCode;
            myColor = data.color;
            initGame(); // Go to board view immediately
            showLobby();
        });

        socket.on('roomJoined', (data) => {
            roomCode = data.roomCode;
            myColor = data.color;
            initGame(); // Go to board view immediately
            showLobby();
        });

        socket.on('playerJoined', () => {
            document.getElementById('lobbyStatus').textContent = "Đối thủ đã vào phòng. Hãy nhấn Sẵn sàng!";
        });

        socket.on('readyUpdate', (data) => {
            const meReady = myColor === 'white' ? data.whiteReady : data.blackReady;
            const oppReady = myColor === 'white' ? data.blackReady : data.whiteReady;
            
            updateLobbyStatus('status-me', meReady);
            updateLobbyStatus('status-opponent', oppReady);
        });

        socket.on('startGame', (data) => {
            document.getElementById('lobby-overlay').classList.add('hidden');
            document.getElementById('gameStatus').textContent = `TRẬN ĐẤU BẮT ĐẦU - Bạn là quân ${myColor === 'white' ? 'TRẮNG' : 'ĐEN'}`;
            startTimer(); // Only start timer when game actually starts
        });

        socket.on('moveMade', (move) => {
            const piece = board.grid[move.sr][move.sc];
            board.movePiece(move.sr, move.sc, move.tr, move.tc);
            if (move.promotion) board.promote(move.tr, move.tc, move.promotion);
            ui.addMoveToLog(move.sr, move.sc, move.tr, move.tc, piece);
            afterMove(true); 
        });

        socket.on('error', (msg) => alert(msg));
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const updateTimerUI = () => {
        const timerEls = {
            white: document.getElementById('white-timer'),
            black: document.getElementById('black-timer'),
            boxes: {
                white: document.getElementById('white-timer-box'),
                black: document.getElementById('black-timer-box')
            }
        };
        timerEls.white.textContent = formatTime(timers.white);
        timerEls.black.textContent = formatTime(timers.black);
        
        timerEls.boxes.white.classList.toggle('active', board.turn === 'white');
        timerEls.boxes.black.classList.toggle('active', board.turn === 'black');
    };

    const startTimer = () => {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (board.isGameOver()) {
                clearInterval(timerInterval);
                return;
            }
            
            timers[board.turn]--;
            updateTimerUI();

            if (timers[board.turn] <= 0) {
                clearInterval(timerInterval);
                const winner = board.turn === 'white' ? 'ĐEN' : 'TRẮNG';
                document.getElementById('gameStatus').textContent = `HẾT GIỜ! ${winner} THẮNG`;
                ui.boardEl.style.pointerEvents = 'none';
            }
        }, 1000);
    };

    const showLobby = () => {
        document.getElementById('lobby-overlay').classList.remove('hidden');
        document.getElementById('status-me').querySelector('span').textContent = "Chưa sẵn sàng";
        document.getElementById('status-opponent').querySelector('span').textContent = "Chưa sẵn sàng";
        
        document.getElementById('readyBtn').onclick = () => {
            socket.emit('playerReady', { roomCode });
            document.getElementById('readyBtn').disabled = true;
            document.getElementById('readyBtn').textContent = "Đã Sẵn Sàng";
        };
    };

    const updateLobbyStatus = (id, ready) => {
        const span = document.getElementById(id).querySelector('span');
        span.textContent = ready ? "Đã Sẵn Sàng" : "Chưa sẵn sàng";
        span.className = ready ? "is-ready" : "";
    };

    const initGame = () => {
        board = new ChessBoard();
        ai = new ChessAI(board);
        ui = new UIController(board, handleMove);
        
        timers = { white: 600, black: 600 };
        updateTimerUI();
        
        // If not online or game hasn't started, don't start timer yet
        if (gameMode !== 'online') {
            startTimer();
        }

        let modeDisplay = 'Người vs Máy';
        if (gameMode === 'pvp') modeDisplay = 'Người vs Người';
        if (gameMode === 'online') modeDisplay = `Online (Phòng: ${roomCode})`;
        
        document.getElementById('displayMode').textContent = modeDisplay;
        const diffGroup = document.getElementById('displayDiffGroup');
        
        if (gameMode === 'pvai') {
            diffGroup.classList.remove('hidden');
            const diffNames = { "1": "Dễ", "2": "Trung bình", "3": "Khó" };
            document.getElementById('displayDiff').textContent = diffNames[difficulty];
        } else {
            diffGroup.classList.add('hidden');
        }

        startScreen.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        ui.updateEvalBar(0);
        
        if (ui.audioCtx && ui.audioCtx.state === 'suspended') ui.audioCtx.resume();
        
        // Setup control listeners
        document.getElementById('hintBtn').onclick = () => {
            const hintMove = ai.getBestMove(board.turn, 2);
            ui.showHint(hintMove);
        };

        document.getElementById('undoBtn').onclick = () => {
            if (gameMode === 'online') return alert("Không thể hoàn tác trong trận đấu Online!");
            board.undo();
            if (gameMode === 'pvai') board.undo();
            
            ui.boardEl.style.pointerEvents = 'auto';
            ui.render();
            ui.updateEvalBar(ai.evaluate());
            updateTimerUI();
            startTimer();
        };

        document.getElementById('restartBtn').onclick = () => {
            if (confirm("Thoát ván đấu hiện tại và về menu chính?")) {
                clearInterval(timerInterval);
                location.reload();
            }
        };
    };

    const handleMove = (sr, sc, tr, tc) => {
        if (gameMode === 'online' && board.turn !== myColor) return;

        const piece = board.grid[sr][sc];
        const result = board.movePiece(sr, sc, tr, tc);
        
        if (result.promotion) {
            ui.showPromotion((type) => {
                board.promote(result.r, result.c, type);
                ui.addMoveToLog(sr, sc, tr, tc, piece);
                if (gameMode === 'online') {
                    socket.emit('makeMove', { roomCode, move: { sr, sc, tr, tc, promotion: type } });
                }
                afterMove();
            });
        } else {
            ui.addMoveToLog(sr, sc, tr, tc, piece);
            if (gameMode === 'online') {
                socket.emit('makeMove', { roomCode, move: { sr, sc, tr, tc } });
            }
            afterMove();
        }
    };

    const afterMove = (isRemote = false) => {
        ui.render();
        ui.updateEvalBar(ai.evaluate());
        updateTimerUI();
        
        if (board.isInCheck(board.turn)) ui.playSound('check');

        if (board.isGameOver()) {
            clearInterval(timerInterval);
            return;
        }

        if (gameMode === 'pvai' && board.turn === 'black') {
            document.getElementById('gameStatus').textContent = "AI đang suy nghĩ...";
            ui.boardEl.style.pointerEvents = 'none';

            setTimeout(() => {
                const bestMove = ai.getBestMove('black', difficulty);
                if (bestMove) {
                    const aiPiece = board.grid[bestMove.sr][bestMove.sc];
                    const aiResult = board.movePiece(bestMove.sr, bestMove.sc, bestMove.tr, bestMove.tc);
                    if (aiResult.promotion) board.promote(aiResult.r, aiResult.c, 'Q');
                    ui.addMoveToLog(bestMove.sr, bestMove.sc, bestMove.tr, bestMove.tc, aiPiece);
                }
                
                ui.boardEl.style.pointerEvents = 'auto';
                ui.render();
                ui.updateEvalBar(ai.evaluate());
                updateTimerUI();
            }, 500);
        }
    };

    // Menu Listeners
    document.getElementById('pvpModeBtn').onclick = () => {
        gameMode = 'pvp';
        initGame();
    };

    document.getElementById('pvaiModeBtn').onclick = () => {
        gameMode = 'pvai';
        modeSelection.classList.add('hidden');
        diffSelection.classList.remove('hidden');
    };

    document.getElementById('onlineModeBtn').onclick = () => {
        gameMode = 'online';
        modeSelection.classList.add('hidden');
        onlineSelection.classList.remove('hidden');
        
        // Reset UI state
        document.getElementById('online-room-actions').classList.add('hidden');
        document.getElementById('connectBtn').textContent = "Kết nối Server";
        document.getElementById('connectBtn').style.background = "";
        document.getElementById('serverIpInput').disabled = false;

        // Auto-detect and connect if on web
        const currentHost = window.location.hostname;
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && currentHost !== '') {
            document.getElementById('serverIpInput').value = currentHost;
            initSocket(); // Auto connect to own host
        }
    };

    document.getElementById('connectBtn').onclick = () => {
        const ip = document.getElementById('serverIpInput').value.trim();
        if (ip) {
            initSocket(ip);
        } else {
            alert("Vui lòng nhập IP Server!");
        }
    };

    document.getElementById('createRoomBtn').onclick = () => {
        socket.emit('createRoom');
    };

    document.getElementById('joinRoomBtn').onclick = () => {
        const code = document.getElementById('roomInput').value;
        if (code.length === 6) {
            socket.emit('joinRoom', code);
        } else {
            alert("Mã phòng phải có 6 chữ số!");
        }
    };

    document.getElementById('backBtn').onclick = () => {
        diffSelection.classList.add('hidden');
        modeSelection.classList.remove('hidden');
    };

    document.getElementById('backFromOnlineBtn').onclick = () => {
        onlineSelection.classList.add('hidden');
        modeSelection.classList.remove('hidden');
    };

    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.onclick = () => {
            difficulty = parseInt(btn.dataset.value);
            initGame();
        };
    });
});
