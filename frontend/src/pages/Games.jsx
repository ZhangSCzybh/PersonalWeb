import { useState, useEffect, useCallback, useRef } from 'react';
import './Games.css';

export default function Games() {
  const [activeGame, setActiveGame] = useState(null);
  const [moles, setMoles] = useState([]);
  const pageRef = useRef(null);

  const spawnMole = useCallback(() => {
    if (!pageRef.current || activeGame) return;
    const rect = pageRef.current.getBoundingClientRect();
    const x = Math.random() * (rect.width - 60) + 30;
    const y = Math.random() * (rect.height - 60) + 30;
    const id = Date.now() + Math.random();
    setMoles(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setMoles(prev => prev.filter(m => m.id !== id));
    }, 2000);
  }, [activeGame]);

  useEffect(() => {
    if (activeGame) return;
    const interval = setInterval(spawnMole, 1500);
    return () => clearInterval(interval);
  }, [spawnMole, activeGame]);

  const handleMoleClick = (e, id) => {
    e.stopPropagation();
    setMoles(prev => prev.filter(m => m.id !== id));
    const rect = e.currentTarget.getBoundingClientRect();
    const clickEffect = { id: `effect-${id}`, x: rect.left + rect.width / 2, y: rect.top };
    document.dispatchEvent(new CustomEvent('moleWhacked', { detail: clickEffect }));
  };
  
  return (
    <div className="games-page" ref={pageRef}>
      {!activeGame ? (
        <>
          <div className="games-header">
            <h1>游戏中心</h1>
            <p>选择你喜欢的游戏开始玩吧！</p>
          </div>
          <div className="games-grid">
            <div className="game-card" style={{ '--accent-color': '#8BC34A' }} onClick={() => setActiveGame('whack')}>
              <div className="game-icon">🐹</div>
              <h3>打地鼠</h3>
              <p>敲打地鼠得分</p>
              <button className="play-btn">开始游戏</button>
            </div>
            <div className="game-card" style={{ '--accent-color': '#4CAF50' }} onClick={() => setActiveGame('snake')}>
              <div className="game-icon">🐍</div>
              <h3>贪吃蛇</h3>
              <p>经典贪吃蛇游戏</p>
              <button className="play-btn">开始游戏</button>
            </div>
            <div className="game-card" style={{ '--accent-color': '#2196F3' }} onClick={() => setActiveGame('tetris')}>
              <div className="game-icon">🧱</div>
              <h3>俄罗斯方块</h3>
              <p>益智俄罗斯方块</p>
              <button className="play-btn">开始游戏</button>
            </div>
            <div className="game-card" style={{ '--accent-color': '#607D8B' }} onClick={() => setActiveGame('minesweeper')}>
              <div className="game-icon">💣</div>
              <h3>扫雷</h3>
              <p>经典扫雷游戏</p>
              <button className="play-btn">开始游戏</button>
            </div>
          </div>
          {moles.map(mole => (
            <div
              key={mole.id}
              className="floating-mole"
              style={{ left: mole.x, top: mole.y }}
              onClick={(e) => handleMoleClick(e, mole.id)}
            >
              🐹
            </div>
          ))}
        </>
      ) : activeGame === 'whack' ? (
        <WhackAMole onBack={() => setActiveGame(null)} />
      ) : activeGame === 'tetris' ? (
        <Tetris onBack={() => setActiveGame(null)} />
      ) : activeGame === 'snake' ? (
        <SnakeGame onBack={() => setActiveGame(null)} />
      ) : activeGame === 'minesweeper' ? (
        <Minesweeper onBack={() => setActiveGame(null)} />
      ) : (
        <ComingSoon game={activeGame} onBack={() => setActiveGame(null)} />
      )}
    </div>
  );
}

function WhackAMole({ onBack }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [moles, setMoles] = useState(Array(9).fill(false));
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const randomMole = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * 9);
    setMoles(prev => {
      const newMoles = Array(9).fill(false);
      newMoles[randomIndex] = true;
      return newMoles;
    });
  }, []);

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const moleInterval = setInterval(randomMole, 800);
    return () => clearInterval(moleInterval);
  }, [isPlaying, gameOver, randomMole]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          setIsPlaying(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, gameOver]);

  const handleWhack = (index) => {
    if (!isPlaying || gameOver) return;
    if (moles[index]) {
      setScore(prev => prev + 10);
      setMoles(prev => {
        const newMoles = [...prev];
        newMoles[index] = false;
        return newMoles;
      });
    }
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    setMoles(Array(9).fill(false));
  };

  return (
    <div className="whack-container">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <div className="whack-header">
        <h2>打地鼠</h2>
        <div className="whack-stats">
          <span>得分: {score}</span>
          <span>时间: {timeLeft}秒</span>
        </div>
      </div>
      {!isPlaying && !gameOver && <button className="start-btn" onClick={startGame}>开始游戏</button>}
      {gameOver && (
        <div className="game-over">
          <h3>游戏结束!</h3>
          <p>最终得分: {score}</p>
          <button className="start-btn" onClick={startGame}>再来一局</button>
        </div>
      )}
      <div className="whack-grid">
        {moles.map((isMole, index) => (
          <div key={index} className={`whack-hole ${isMole ? 'active' : ''}`} onClick={() => handleWhack(index)}>
            {isMole && <span className="mole">🐹</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tetris({ onBack }) {
  const [board, setBoard] = useState(() => Array(20).fill(null).map(() => Array(10).fill(0)));
  const [currentPiece, setCurrentPiece] = useState(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const boardRef = useRef(null);

  const tetrominos = [
    { shape: [[1,1,1,1]], color: '#00f0f0' },
    { shape: [[1,1],[1,1]], color: '#f0f000' },
    { shape: [[1,1,1],[0,0,1]], color: '#a000f0' },
    { shape: [[1,1,1],[1,0,0]], color: '#f0a000' },
    { shape: [[1,1,0],[0,1,1]], color: '#00f000' },
    { shape: [[0,1,1],[1,1,0]], color: '#f00000' },
    { shape: [[1,1,1],[0,1,0]], color: '#0000f0' },
  ];

  const newPiece = useCallback(() => {
    const random = tetrominos[Math.floor(Math.random() * tetrominos.length)];
    return {
      shape: random.shape,
      color: random.color,
      x: 3,
      y: 0
    };
  }, []);

  const isValid = (piece, board, offsetX = 0, offsetY = 0) => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const newX = piece.x + c + offsetX;
          const newY = piece.y + r + offsetY;
          if (newX < 0 || newX >= 10 || newY >= 20 || (newY >= 0 && board[newY][newX])) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const rotate = (piece) => {
    const rotated = {
      ...piece,
      shape: piece.shape[0].map((_, i) => piece.shape.map(row => row[i]).reverse())
    };
    if (isValid(rotated, board)) return rotated;
    return piece;
  };

  const placePiece = useCallback(() => {
    const newBoard = board.map(row => [...row]);
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const y = currentPiece.y + r;
          const x = currentPiece.x + c;
          if (y >= 0) newBoard[y][x] = currentPiece.color;
        }
      }
    }
    
    let linesCleared = 0;
    for (let r = 19; r >= 0; r--) {
      if (newBoard[r].every(cell => cell !== 0)) {
        newBoard.splice(r, 1);
        newBoard.unshift(Array(10).fill(0));
        linesCleared++;
        r++;
      }
    }
    
    if (linesCleared > 0) {
      setScore(prev => prev + linesCleared * 100 * linesCleared);
    }
    
    setBoard(newBoard);
    
    const nextPiece = newPiece();
    if (!isValid(nextPiece, newBoard)) {
      setGameOver(true);
      setIsPlaying(false);
    } else {
      setCurrentPiece(nextPiece);
    }
  }, [board, currentPiece, newPiece]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const interval = setInterval(() => {
      if (isValid(currentPiece, board, 0, 1)) {
        setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
      } else {
        placePiece();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, gameOver, currentPiece, board, placePiece]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || gameOver) return;
      if (e.key === 'ArrowLeft') {
        if (isValid(currentPiece, board, -1, 0)) {
          setCurrentPiece(prev => prev ? { ...prev, x: prev.x - 1 } : null);
        }
      } else if (e.key === 'ArrowRight') {
        if (isValid(currentPiece, board, 1, 0)) {
          setCurrentPiece(prev => prev ? { ...prev, x: prev.x + 1 } : null);
        }
      } else if (e.key === 'ArrowDown') {
        if (isValid(currentPiece, board, 0, 1)) {
          setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
        }
      } else if (e.key === 'ArrowUp') {
        setCurrentPiece(rotate(currentPiece));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, currentPiece, board]);

  const startGame = () => {
    setBoard(Array(20).fill(null).map(() => Array(10).fill(0)));
    setCurrentPiece(newPiece());
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const displayBoard = board.map(row => [...row]);
  if (currentPiece) {
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const y = currentPiece.y + r;
          const x = currentPiece.x + c;
          if (y >= 0 && y < 20 && x >= 0 && x < 10) {
            displayBoard[y][x] = currentPiece.color;
          }
        }
      }
    }
  }

  return (
    <div className="tetris-container">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <div className="tetris-header">
        <h2>俄罗斯方块</h2>
        <div className="tetris-stats">得分: {score}</div>
      </div>
      {!isPlaying && !gameOver && <button className="start-btn" onClick={startGame}>开始游戏</button>}
      {gameOver && (
        <div className="game-over">
          <h3>游戏结束!</h3>
          <p>最终得分: {score}</p>
          <button className="start-btn" onClick={startGame}>再来一局</button>
        </div>
      )}
      <div className="tetris-board">
        {displayBoard.map((row, y) => (
          <div key={y} className="tetris-row">
            {row.map((cell, x) => (
              <div key={x} className="tetris-cell" style={{ backgroundColor: cell || '#1a1a2e' }} />
            ))}
          </div>
        ))}
      </div>
      <p className="tetris-hint">↑ 旋转 | ← → 移动 | ↓ 加速</p>
    </div>
  );
}

function Minesweeper({ onBack }) {
  const ROWS = 9;
  const COLS = 9;
  const MINES = 10;

  const [board, setBoard] = useState(() => initializeBoard());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [firstClick, setFirstClick] = useState(true);

  function initializeBoard() {
    return Array(ROWS).fill(null).map(() =>
      Array(COLS).fill({ revealed: false, flagged: false, mine: false, count: 0 })
    );
  }

  const placeMines = (excludeRow, excludeCol) => {
    const newBoard = initializeBoard();
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!newBoard[r][c].mine && (Math.abs(r - excludeRow) > 1 || Math.abs(c - excludeCol) > 1)) {
        newBoard[r][c] = { ...newBoard[r][c], mine: true };
        minesPlaced++;
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!newBoard[r][c].mine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newBoard[nr][nc].mine) count++;
            }
          }
          newBoard[r][c] = { ...newBoard[r][c], count };
        }
      }
    }
    return newBoard;
  };

  const reveal = (r, c, currentBoard) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return currentBoard;
    if (currentBoard[r][c].revealed || currentBoard[r][c].flagged) return currentBoard;
    
    const newBoard = currentBoard.map(row => row.map(cell => ({ ...cell })));
    newBoard[r][c].revealed = true;
    
    if (newBoard[r][c].mine) {
      setGameOver(true);
      return newBoard;
    }
    
    if (newBoard[r][c].count === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) {
            reveal(r + dr, c + dc, newBoard);
          }
        }
      }
    }
    
    let revealedCount = 0;
    for (let row of newBoard) {
      for (let cell of row) {
        if (cell.revealed && !cell.mine) revealedCount++;
      }
    }
    if (revealedCount === ROWS * COLS - MINES) {
      setWon(true);
    }
    
    return newBoard;
  };

  const handleClick = (r, c) => {
    if (gameOver || won || board[r][c].flagged || board[r][c].revealed) return;
    
    let newBoard;
    if (firstClick) {
      newBoard = placeMines(r, c);
      setFirstClick(false);
    } else {
      newBoard = board.map(row => row.map(cell => ({ ...cell })));
    }
    
    newBoard = reveal(r, c, newBoard);
    setBoard(newBoard);
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameOver || won || board[r][c].revealed) return;
    
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    newBoard[r][c].flagged = !newBoard[r][c].flagged;
    setBoard(newBoard);
  };

  const restart = () => {
    setBoard(initializeBoard());
    setGameOver(false);
    setWon(false);
    setFirstClick(true);
  };

  const getNumberColor = (count) => {
    const colors = ['', '#1976D2', '#388E3C', '#D32F2F', '#7B1FA2', '#FF8F00', '#0097A7', '#424242', '#000'];
    return colors[count] || '#000';
  };

  return (
    <div className="minesweeper-container">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <div className="minesweeper-header">
        <h2>扫雷</h2>
        <div className="minesweeper-stats">
          💣 {MINES - board.flat().filter(c => c.flagged).length}
        </div>
      </div>
      <button className="restart-btn" onClick={restart}>重新开始</button>
      {gameOver && <div className="game-over"><h3>💥 游戏结束!</h3></div>}
      {won && <div className="minesweeper-won"><h3>🎉 你赢了!</h3></div>}
      <div className="minesweeper-board">
        {board.map((row, r) => (
          <div key={r} className="minesweeper-row">
            {row.map((cell, c) => (
              <div
                key={c}
                className={`minesweeper-cell ${cell.revealed ? 'revealed' : ''} ${cell.mine && gameOver ? 'mine' : ''}`}
                onClick={() => handleClick(r, c)}
                onContextMenu={(e) => handleRightClick(e, r, c)}
              >
                {cell.flagged && !cell.revealed ? '🚩' : cell.revealed ? (cell.mine ? '💣' : cell.count > 0 ? <span style={{ color: getNumberColor(cell.count) }}>{cell.count}</span> : '') : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="minesweeper-hint">左键点击翻开，右键标记地雷</p>
    </div>
  );
}

function SnakeGame({ onBack }) {
  const [snake, setSnake] = useState([[10, 10], [10, 11], [10, 12]]);
  const [food, setFood] = useState([15, 15]);
  const [direction, setDirection] = useState('up');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const boardSize = 20;

  const generateFood = () => {
    const newFood = [
      Math.floor(Math.random() * boardSize),
      Math.floor(Math.random() * boardSize)
    ];
    if (snake.some(s => s[0] === newFood[0] && s[1] === newFood[1])) {
      return generateFood();
    }
    return newFood;
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const moveSnake = setInterval(() => {
      setSnake(prev => {
        const head = [...prev[0]];
        if (direction === 'up') head[0]--;
        if (direction === 'down') head[0]++;
        if (direction === 'left') head[1]--;
        if (direction === 'right') head[1]++;
        
        if (head[0] < 0 || head[0] >= boardSize || head[1] < 0 || head[1] >= boardSize) {
          setGameOver(true);
          setIsPlaying(false);
          return prev;
        }
        
        if (prev.some(s => s[0] === head[0] && s[1] === head[1])) {
          setGameOver(true);
          setIsPlaying(false);
          return prev;
        }
        
        const newSnake = [head, ...prev];
        if (head[0] === food[0] && head[1] === food[1]) {
          setScore(s => s + 10);
          setFood(generateFood());
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, 150);
    return () => clearInterval(moveSnake);
  }, [isPlaying, gameOver, direction, food]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || gameOver) return;
      const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (dirs[e.key]) {
        const newDir = dirs[e.key];
        if (newDir !== direction && 
            !((newDir === 'up' && direction === 'down') || 
               (newDir === 'down' && direction === 'up') ||
               (newDir === 'left' && direction === 'right') ||
               (newDir === 'right' && direction === 'left'))) {
          setDirection(newDir);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, direction]);

  const startGame = () => {
    setSnake([[10, 10], [10, 11], [10, 12]]);
    setFood(generateFood());
    setDirection('up');
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="snake-container">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <div className="snake-header">
        <h2>贪吃蛇</h2>
        <div className="snake-stats">得分: {score}</div>
      </div>
      {!isPlaying && !gameOver && <button className="start-btn" onClick={startGame}>开始游戏</button>}
      {gameOver && (
        <div className="game-over">
          <h3>游戏结束!</h3>
          <p>最终得分: {score}</p>
          <button className="start-btn" onClick={startGame}>再来一局</button>
        </div>
      )}
      <div className="snake-board">
        {Array(boardSize).fill(null).map((_, r) => (
          <div key={r} className="snake-row">
            {Array(boardSize).fill(null).map((_, c) => {
              const isSnake = snake.some(s => s[0] === r && s[1] === c);
              const isHead = snake[0][0] === r && snake[0][1] === c;
              const isFood = food[0] === r && food[1] === c;
              return (
                <div key={c} className={`snake-cell ${isHead ? 'snake-head' : isSnake ? 'snake-body' : isFood ? 'food' : ''}`}>
                  {isFood && '🍎'}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="snake-hint">↑ ↓ ← → 控制方向</p>
    </div>
  );
}

function ComingSoon({ game, onBack }) {
  return (
    <div className="coming-soon">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <h2>{game}</h2>
      <p>即将推出，尽情期待！</p>
      <div className="coming-soon-icon">🚧</div>
    </div>
  );
}
