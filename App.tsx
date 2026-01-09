
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChessPiece from './components/ChessPiece';
import Dashboard from './components/Dashboard';
import { INITIAL_BOARD, BOARD_THEMES, COOLDOWN_DURATION } from './constants';
import { Piece, BoardState, Square, GameStats, UserPreferences, GameStatus, GameMode, GameSession, PieceColor, MoveRecord } from './types';
import { isMoveLegal, isInsufficientMaterial, isKingInCheck } from './services/chessLogic';
import confetti from 'canvas-confetti';

type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

const STORAGE_KEYS = {
  STATS: 'zchess_stats_v1',
  PREFS: 'zchess_prefs_v1'
};

// Configuración de dificultad escalada exponencialmente
// EASY: Antiguo modo HARD (aprox 750ms decisión, 1500ms cooldown)
// NORMAL: Escala ~2.5x (300ms decisión, 600ms cooldown)
// HARD: Escala extrema (100ms decisión, 200ms cooldown)
const AI_CONFIG = {
  EASY: { interval: 750, cooldown: 1500 },
  NORMAL: { interval: 300, cooldown: 600 },
  HARD: { interval: 100, cooldown: 200 },
};

const App: React.FC = () => {
  // --- State Initialization with LocalStorage ---
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STATS);
    return saved ? JSON.parse(saved) : {
      elo: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      fastestCheckmate: 0,
    };
  });

  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFS);
    return saved ? JSON.parse(saved) : {
      username: 'ZenMaster',
      boardTheme: 'neon',
      pieceSet: 'standard',
      cooldownTime: COOLDOWN_DURATION,
      showMoveHints: true,
    };
  });

  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [view, setView] = useState<'lobby' | 'game' | 'stats' | 'settings' | 'waiting' | 'difficulty'>('lobby');
  const [session, setSession] = useState<GameSession | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [gameTime, setGameTime] = useState(0);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastAIMoveTo, setLastAIMoveTo] = useState<Square | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('NORMAL');
  
  // Track check status
  const [whiteInCheck, setWhiteInCheck] = useState(false);
  const [blackInCheck, setBlackInCheck] = useState(false);
  
  const historyContainerRef = useRef<HTMLDivElement>(null);

  const playerColor = 'w';

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
  }, [prefs]);

  // Update check status whenever board changes
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
      setWhiteInCheck(isKingInCheck(board, 'w'));
      setBlackInCheck(isKingInCheck(board, 'b'));
    } else {
      setWhiteInCheck(false);
      setBlackInCheck(false);
    }
  }, [board, gameStatus]);

  // Temporizador de juego
  useEffect(() => {
    let interval: any;
    if (view === 'game' && gameStatus === GameStatus.PLAYING) {
      interval = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, gameStatus]);

  // Limpiar resaltado de IA después de un tiempo
  useEffect(() => {
    if (lastAIMoveTo) {
      const timer = setTimeout(() => setLastAIMoveTo(null), 800);
      return () => clearTimeout(timer);
    }
  }, [lastAIMoveTo]);

  // Scroll automático del historial
  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
    }
  }, [moveHistory, showHistory]);

  // Lógica de IA
  useEffect(() => {
    if (view === 'game' && session?.mode === 'IA' && gameStatus === GameStatus.PLAYING) {
      const currentSpeed = AI_CONFIG[aiDifficulty].interval;
      const aiInterval = setInterval(() => {
        makeAIMove();
      }, currentSpeed); 
      return () => clearInterval(aiInterval);
    }
  }, [view, session, gameStatus, board, aiDifficulty]);

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const makeAIMove = () => {
    const blackPieces: {piece: Piece, pos: Square}[] = [];
    board.forEach((row, r) => row.forEach((p, f) => {
      if (p && p.color === 'b' && p.cooldownUntil <= Date.now()) {
        blackPieces.push({ piece: p, pos: { rank: r, file: f } });
      }
    }));
    if (blackPieces.length === 0) return;
    const randomPiece = blackPieces[Math.floor(Math.random() * blackPieces.length)];
    const possibleMoves: Square[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (isMoveLegal(randomPiece.piece.type, 'b', randomPiece.pos, { rank: r, file: f }, board)) {
          possibleMoves.push({ rank: r, file: f });
        }
      }
    }
    if (possibleMoves.length > 0) {
      const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      setLastAIMoveTo(move);
      executeMove(randomPiece.pos, move);
    }
  };

  const executeMove = (from: Square, to: Square) => {
    const sourcePiece = board[from.rank][from.file];
    const targetPiece = board[to.rank][to.file];
    if (!sourcePiece) return;

    const newMove: MoveRecord = {
      pieceType: sourcePiece.type,
      pieceColor: sourcePiece.color,
      from,
      to,
      timestamp: Date.now()
    };
    setMoveHistory(prev => [...prev, newMove]);

    const newBoard = board.map(row => [...row]);
    
    if (targetPiece?.type === 'k') {
      setGameStatus(GameStatus.CHECKMATE);
      const isWinner = sourcePiece.color === 'w';
      setWinner(sourcePiece.color);
      if (isWinner) triggerConfetti();
      setStats(prev => ({ 
        ...prev, 
        elo: isWinner ? prev.elo + 25 : Math.max(0, prev.elo - 25),
        wins: isWinner ? prev.wins + 1 : prev.wins, 
        losses: !isWinner ? prev.losses + 1 : prev.losses 
      }));
    }

    const aiCooldown = AI_CONFIG[aiDifficulty].cooldown;
    const finalCooldown = sourcePiece.color === 'b' ? aiCooldown : prefs.cooldownTime;
    
    newBoard[to.rank][to.file] = { ...sourcePiece, cooldownUntil: Date.now() + finalCooldown };
    newBoard[from.rank][from.file] = null;

    if (gameStatus === GameStatus.PLAYING && isInsufficientMaterial(newBoard)) {
      setGameStatus(GameStatus.DRAW);
      setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
    }
    
    setBoard(newBoard);
  };

  const handleSquareClick = (rank: number, file: number) => {
    if (gameStatus !== GameStatus.PLAYING) return;
    const piece = board[rank][file];
    const targetSquare = { rank, file };
    if (selectedSquare) {
      const sourcePiece = board[selectedSquare.rank][selectedSquare.file];
      if (sourcePiece && sourcePiece.cooldownUntil <= Date.now() && isMoveLegal(sourcePiece.type, sourcePiece.color, selectedSquare, targetSquare, board)) {
        executeMove(selectedSquare, targetSquare);
        setSelectedSquare(null);
      } else if (piece && piece.color === playerColor) {
        setSelectedSquare(targetSquare);
      } else {
        setSelectedSquare(null);
      }
    } else {
      if (piece && piece.color === playerColor) {
        setSelectedSquare(targetSquare);
      }
    }
  };

  const startDifficultySelect = () => setView('difficulty');

  const startIAMode = (difficulty: AIDifficulty) => {
    setAiDifficulty(difficulty);
    setGameTime(0);
    setBoard(INITIAL_BOARD());
    setMoveHistory([]);
    setWinner(null);
    setLastAIMoveTo(null);
    setGameStatus(GameStatus.PLAYING);
    setSession({ mode: 'IA', isHost: true, opponentName: `Z-Bot (${difficulty})` });
    setView('game');
  };

  const createOnlineRoom = () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameTime(0);
    setSession({ mode: 'ONLINE', isHost: true, roomId: newId, opponentName: 'Esperando...' });
    setView('waiting');
  };

  const joinOnlineRoom = () => {
    if (roomCodeInput.length < 4) return;
    setGameTime(0);
    setBoard(INITIAL_BOARD());
    setMoveHistory([]);
    setWinner(null);
    setLastAIMoveTo(null);
    setGameStatus(GameStatus.PLAYING);
    setSession({ mode: 'ONLINE', isHost: false, roomId: roomCodeInput, opponentName: 'Anfitrión' });
    setView('game');
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/#join=${session?.roomId}`;
    navigator.clipboard.writeText(link);
    alert('¡Enlace de invitación copiado!');
  };

  const resetGame = () => {
    setGameTime(0);
    setBoard(INITIAL_BOARD());
    setWinner(null);
    setMoveHistory([]);
    setLastAIMoveTo(null);
    setGameStatus(GameStatus.PLAYING);
    setSelectedSquare(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toAlgebraic = (s: Square) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return `${files[s.file]}${8 - s.rank}`;
  };

  const getPieceIcon = (type: string) => {
    const icons: any = { p: 'fa-chess-pawn', r: 'fa-chess-rook', n: 'fa-chess-knight', b: 'fa-chess-bishop', q: 'fa-chess-queen', k: 'fa-chess-king' };
    return icons[type] || 'fa-chess';
  };

  const theme = BOARD_THEMES[prefs.boardTheme];

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Navigation */}
      <nav className="w-full max-w-5xl flex justify-between items-center mb-8 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
        <h1 className="text-xl md:text-2xl font-orbitron font-bold flex items-center gap-2 cursor-pointer" onClick={() => setView('lobby')}>
          <i className="fas fa-chess text-cyan-500"></i>
          <span>Z-CHESS</span>
          <span className="text-[10px] md:text-xs font-inter font-normal text-slate-500 tracking-normal ml-1">por David Azcona Alonso</span>
        </h1>
        <div className="flex gap-4">
          <button onClick={() => setView('lobby')} className={`px-4 py-2 rounded-lg transition ${view === 'lobby' ? 'bg-cyan-600' : 'hover:bg-slate-800 text-slate-400'}`} title="Inicio"><i className="fas fa-home"></i></button>
          <button onClick={() => setView('stats')} className={`px-4 py-2 rounded-lg transition ${view === 'stats' ? 'bg-cyan-600' : 'hover:bg-slate-800 text-slate-400'}`} title="Estadísticas"><i className="fas fa-chart-line"></i></button>
          <button onClick={() => setView('settings')} className={`px-4 py-2 rounded-lg transition ${view === 'settings' ? 'bg-cyan-600' : 'hover:bg-slate-800 text-slate-400'}`} title="Ajustes"><i className="fas fa-cog"></i></button>
        </div>
      </nav>

      <main className="w-full max-w-6xl">
        {view === 'lobby' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-orbitron font-bold mb-4 bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent tracking-tighter text-center uppercase">ELIGE TU BATALLA</h2>
              <p className="text-slate-400">Ajedrez en tiempo real sin turnos. Velocidad y estrategia pura.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div onClick={startDifficultySelect} className="group relative bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-cyan-500 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-900/20 overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><i className="fas fa-brain text-8xl"></i></div>
                <h3 className="text-2xl font-orbitron font-bold mb-4 text-cyan-400">DESAFÍO IA</h3>
                <p className="text-slate-400 mb-6">Entrena contra el Z-Bot. Un oponente implacable que no se cansa.</p>
                <button className="bg-cyan-600 group-hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition">Jugar ahora</button>
              </div>
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col justify-between transition-all">
                <div>
                  <h3 className="text-2xl font-orbitron font-bold mb-4 text-indigo-400">MULTIJUGADOR</h3>
                  <p className="text-slate-400 mb-6">Enfréntate a amigos o desconocidos en el campo de batalla global.</p>
                  <div className="space-y-4">
                    <button onClick={createOnlineRoom} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"><i className="fas fa-plus-circle"></i> Crear Sala</button>
                    <div className="relative">
                      <input type="text" placeholder="Código de sala..." value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white" />
                      <button onClick={joinOnlineRoom} className="absolute right-2 top-2 bg-slate-800 hover:bg-slate-700 px-4 py-1 rounded-lg text-sm text-white">Unirse</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'difficulty' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300 text-center">
            <h2 className="text-4xl font-orbitron font-bold mb-8 text-cyan-400">SELECCIONA DIFICULTAD</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              <button onClick={() => startIAMode('EASY')} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-emerald-500 transition-all hover:scale-105 group">
                <i className="fas fa-seedling text-4xl text-emerald-500 mb-4 group-hover:animate-bounce"></i>
                <h3 className="text-xl font-bold mb-2">FÁCIL</h3>
                <p className="text-slate-500 text-sm">Z-Bot es ágil. (Anteriormente difícil).</p>
              </button>
              <button onClick={() => startIAMode('NORMAL')} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-cyan-500 transition-all hover:scale-105 group">
                <i className="fas fa-bolt text-4xl text-cyan-500 mb-4 group-hover:animate-pulse"></i>
                <h3 className="text-xl font-bold mb-2">NORMAL</h3>
                <p className="text-slate-500 text-sm">Velocidad de rayo. Reflejos de combate superiores.</p>
              </button>
              <button onClick={() => startIAMode('HARD')} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-rose-500 transition-all hover:scale-105 group">
                <i className="fas fa-fire text-4xl text-rose-500 mb-4 group-hover:animate-ping"></i>
                <h3 className="text-xl font-bold mb-2">DIFÍCIL</h3>
                <p className="text-slate-500 text-sm">Maestro del Kung Fu. Prácticamente instantáneo.</p>
              </button>
            </div>
            <button onClick={() => setView('lobby')} className="mt-12 text-slate-500 hover:text-white transition uppercase text-xs font-bold tracking-widest"><i className="fas fa-arrow-left mr-2"></i> Volver al menú</button>
          </div>
        )}

        {view === 'waiting' && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8"></div>
            <h2 className="text-3xl font-orbitron font-bold mb-2">ESPERANDO OPONENTE</h2>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
              <p className="text-xs uppercase text-slate-500 font-bold tracking-widest mb-2">Código de la Sala</p>
              <div className="text-4xl font-mono font-bold text-white mb-6 tracking-widest">{session?.roomId}</div>
              <div className="flex flex-col gap-3">
                <button onClick={copyRoomLink} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl transition flex items-center justify-center gap-2"><i className="fas fa-link"></i> Copiar Enlace</button>
                {session?.isHost && (
                  <button onClick={() => { setGameTime(0); setBoard(INITIAL_BOARD()); setMoveHistory([]); setWinner(null); setGameStatus(GameStatus.PLAYING); setView('game'); }} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl transition font-bold flex items-center justify-center gap-2"><i className="fas fa-play"></i> EMPEZAR BATALLA</button>
                )}
              </div>
            </div>
            <button onClick={() => setView('lobby')} className="mt-8 text-slate-500 hover:text-white transition">Cancelar y volver</button>
          </div>
        )}

        {view === 'game' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full aspect-square max-w-[600px] border-8 border-slate-800 rounded-lg shadow-2xl relative overflow-hidden">
                {board.map((row, r) => (
                  <div key={r} className="flex h-[12.5%] w-full">
                    {row.map((piece, f) => {
                      const isDark = (r + f) % 2 === 1;
                      const isSelected = selectedSquare?.rank === r && selectedSquare?.file === f;
                      const isLastAIMove = lastAIMoveTo?.rank === r && lastAIMoveTo?.file === f;
                      const squareClass = isDark ? theme.dark : theme.light;
                      
                      // Check detection visual warning
                      const isKingUnderAttack = piece?.type === 'k' && ((piece.color === 'w' && whiteInCheck) || (piece.color === 'b' && blackInCheck));
                      
                      let isLegalMoveHint = false;
                      if (prefs.showMoveHints && selectedSquare) {
                        const sourcePiece = board[selectedSquare.rank][selectedSquare.file];
                        if (sourcePiece && isMoveLegal(sourcePiece.type, sourcePiece.color, selectedSquare, { rank: r, file: f }, board)) {
                           isLegalMoveHint = true;
                        }
                      }

                      return (
                        <div key={`${r}-${f}`} onClick={() => handleSquareClick(r, f)} className={`relative flex-1 h-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${squareClass} ${isSelected ? 'ring-4 ring-inset ring-yellow-400 z-20 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''} ${isLastAIMove ? 'ai-move-highlight' : ''} ${isKingUnderAttack ? 'check-warning z-10' : ''}`}>
                          {piece ? (
                            <>
                              <ChessPiece 
                                type={piece.type} 
                                color={piece.color} 
                                cooldownUntil={piece.cooldownUntil} 
                                totalCooldown={piece.color === 'b' ? AI_CONFIG[aiDifficulty].cooldown : prefs.cooldownTime} 
                                pieceSet={prefs.pieceSet} 
                              />
                              {isLegalMoveHint && <div className="move-hint-capture"></div>}
                            </>
                          ) : (
                            isLegalMoveHint && <div className="move-hint-dot"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {gameStatus !== GameStatus.PLAYING && (
                  <div className="absolute inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300 backdrop-blur-md">
                    {gameStatus === GameStatus.DRAW ? (
                      <div className="flex items-center gap-8 mb-8">
                         <i className="fas fa-chess-king text-6xl text-slate-100 opacity-80 drop-shadow-lg"></i>
                         <h2 className="text-6xl font-orbitron font-bold draw-glow tracking-tighter uppercase">TABLAS</h2>
                         <i className="fas fa-chess-king text-6xl text-slate-800 opacity-80 drop-shadow-lg"></i>
                      </div>
                    ) : winner === 'w' ? (
                      <><h2 className="text-6xl font-orbitron font-bold text-yellow-400 mb-4 victory-glow animate-bounce tracking-tighter uppercase">VICTORIA</h2><p className="text-2xl text-yellow-100 mb-8 font-semibold tracking-wide">¡Has conquistado el reino!</p></>
                    ) : (
                      <><h2 className="text-5xl font-orbitron font-bold text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] tracking-tighter uppercase">GAME OVER</h2><p className="text-xl text-slate-200 mb-8">El Rey ha sido capturado.</p></>
                    )}
                    <div className="flex gap-4">
                      <button onClick={resetGame} className={`px-8 py-3 rounded-xl font-bold transition shadow-lg ${winner === 'w' ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : gameStatus === GameStatus.DRAW ? 'bg-amber-900 hover:bg-amber-800 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>Nueva Partida</button>
                      <button onClick={() => setView('lobby')} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold transition">Salir al Lobby</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4 flex flex-col h-full">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex-shrink-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-orbitron text-slate-400 uppercase">SALA: {session?.roomId || session?.mode}</h3>
                  <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold animate-pulse">LIVE</div>
                </div>
                <div className="space-y-3">
                  <div className={`flex justify-between items-center bg-slate-950 p-4 rounded-xl border transition-colors ${whiteInCheck ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-slate-800'} shadow-inner`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-xs">P1</div>
                        <span className="font-semibold text-sm">{prefs.username} (Blancas)</span>
                        {whiteInCheck && <span className="bg-red-500 text-[10px] text-white px-2 py-0.5 rounded font-bold animate-pulse">JAQUE</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 ml-11"><i className="fas fa-stopwatch"></i><span className="font-mono">{formatTime(gameTime)}</span></div>
                    </div>
                    <span className="font-mono text-cyan-400 text-lg">{stats.elo}</span>
                  </div>
                  <div className={`flex justify-between items-center bg-slate-950 p-4 rounded-xl border transition-colors ${blackInCheck ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-slate-800'} shadow-inner`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs">P2</div>
                        <span className="font-semibold text-sm">{session?.opponentName}</span>
                        {blackInCheck && <span className="bg-red-500 text-[10px] text-white px-2 py-0.5 rounded font-bold animate-pulse">JAQUE</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 ml-11"><i className="fas fa-stopwatch"></i><span className="font-mono">{formatTime(gameTime)}</span></div>
                    </div>
                    <span className="font-mono text-slate-500 text-lg">????</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden transition-all duration-300">
                <button onClick={() => setShowHistory(!showHistory)} className="w-full p-4 flex items-center justify-between hover:bg-slate-800 transition text-xs uppercase font-bold tracking-widest text-slate-400">
                  <div className="flex items-center gap-2"><i className="fas fa-history text-indigo-400"></i> Historial de Movimientos <span className="ml-2 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-500">{moveHistory.length}</span></div>
                  <i className={`fas fa-chevron-${showHistory ? 'up' : 'down'} transition-transform`}></i>
                </button>
                {showHistory && (
                  <div ref={historyContainerRef} className="p-4 pt-0 flex-grow overflow-y-auto max-h-[250px] custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                    {moveHistory.length === 0 ? <div className="py-8 flex items-center justify-center text-slate-600 text-sm italic">No hay movimientos aún...</div> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {moveHistory.map((move, idx) => (
                          <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border text-sm ${move.pieceColor === 'w' ? 'bg-slate-800/50 border-cyan-900/30' : 'bg-slate-950/50 border-slate-800'}`}>
                            <span className="text-slate-500 text-[10px] font-mono">#{idx + 1}</span><i className={`fas ${getPieceIcon(move.pieceType)} ${move.pieceColor === 'w' ? 'text-white' : 'text-slate-400'}`}></i><span className="font-bold">→ {toAlgebraic(move.to)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 flex-shrink-0">
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setView('lobby')} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-xs font-bold uppercase tracking-wider text-white">Abandonar</button>
                   <button onClick={resetGame} className="py-2 px-4 bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50 rounded-xl border border-cyan-800/30 transition text-xs font-bold uppercase tracking-wider">Reiniciar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {view === 'stats' && <Dashboard stats={stats} />}
        {view === 'settings' && (
           <div className="lg:col-span-12 max-w-2xl mx-auto w-full bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl animate-in fade-in duration-300">
            <h2 className="text-2xl font-orbitron mb-8 flex items-center gap-2"><i className="fas fa-sliders-h text-cyan-500"></i> PERSONALIZACIÓN</h2>
            <div className="space-y-10">
              <section>
                <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2"><i className="fas fa-id-badge text-indigo-400"></i> Perfil de Jugador</h3>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><i className="fas fa-user-tag text-slate-500 group-focus-within:text-cyan-400 transition-colors"></i></div>
                  <input type="text" value={prefs.username} maxLength={20} onChange={(e) => setPrefs(p => ({ ...p, username: e.target.value }))} placeholder="Escribe tu nombre de usuario..." className="w-full bg-slate-950 border border-slate-800 text-white pl-11 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-semibold" />
                </div>
              </section>
              <section>
                <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-4">Estilo Visual del Tablero</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(Object.keys(BOARD_THEMES) as Array<keyof typeof BOARD_THEMES>).map(t => (
                    <button key={t} onClick={() => setPrefs(p => ({ ...p, boardTheme: t }))} className={`p-4 rounded-xl border-2 transition ${prefs.boardTheme === t ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 hover:bg-slate-800'}`}><div className="flex gap-1 mb-2"><div className={`w-4 h-4 rounded ${BOARD_THEMES[t].light}`}></div><div className={`w-4 h-4 rounded ${BOARD_THEMES[t].dark}`}></div></div><span className="capitalize text-sm">{t}</span></button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-4">Ayudas Visuales</h3>
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex flex-col"><span className="font-bold text-slate-200">Sugerencias de Movimiento</span><span className="text-xs text-slate-500">Muestra los cuadros legales al seleccionar una pieza.</span></div>
                  <button onClick={() => setPrefs(p => ({ ...p, showMoveHints: !p.showMoveHints }))} className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex items-center px-1 ${prefs.showMoveHints ? 'bg-cyan-600' : 'bg-slate-700'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${prefs.showMoveHints ? 'translate-x-7' : 'translate-x-0'}`}></div></button>
                </div>
              </section>
              <section>
                <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-4">Conjunto de Piezas</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(['standard', 'medieval', 'modern'] as const).map(set => (
                    <button key={set} onClick={() => setPrefs(p => ({ ...p, pieceSet: set }))} className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${prefs.pieceSet === set ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 hover:bg-slate-800'}`}><i className={`fas fa-chess-knight text-2xl ${set === 'modern' ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : set === 'medieval' ? 'text-amber-100' : 'text-white'}`}></i><span className="capitalize text-sm">{set}</span></button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-4">Velocidad de Enfriamiento (Dificultad)</h3>
                <div className="flex items-center gap-6">
                  <input type="range" min="1000" max="8000" step="500" value={prefs.cooldownTime} onChange={(e) => setPrefs(p => ({ ...p, cooldownTime: parseInt(e.target.value) }))} className="flex-1 accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                  <div className="w-20 text-center"><span className="text-2xl font-bold font-mono text-cyan-400">{(prefs.cooldownTime / 1000).toFixed(1)}s</span></div>
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">Un cooldown más bajo hace el juego mucho más rápido y caótico.</p>
              </section>
            </div>
            <div className="mt-12 flex justify-end">
              <button onClick={() => setView('lobby')} className="bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-3 rounded-xl font-bold shadow-lg transition active:scale-95 uppercase tracking-widest">Guardar Cambios</button>
            </div>
          </div>
        )}
      </main>
      <footer className="mt-auto pt-12 pb-4 text-slate-600 text-[10px] uppercase tracking-widest flex flex-col items-center gap-2">
        <p>&copy; 2024 Z-CHESS - KUNG FU STYLE COMBAT ENGINE</p>
      </footer>
    </div>
  );
};

export default App;
