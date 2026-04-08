/**
 * 3D Chess — Full game with AI opponent
 *
 * - 3D board + piece models (cylinder/cone/sphere based)
 * - Full legal move generation (all piece types, castling, en passant, promotion)
 * - Click-to-select, highlighted legal moves
 * - AI opponent (minimax with alpha-beta, depth 3)
 * - Captured pieces display
 * - Move history
 * - Check / checkmate / stalemate detection
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════ CHESS ENGINE (minimal but correct) ═══════════ */

const EMPTY = 0;
const WP=1,WN=2,WB=3,WR=4,WQ=5,WK=6;
const BP=7,BN=8,BB=9,BR=10,BQ=11,BK=12;

const PIECE_NAMES = { [WP]:'P',[WN]:'N',[WB]:'B',[WR]:'R',[WQ]:'Q',[WK]:'K',[BP]:'p',[BN]:'n',[BB]:'b',[BR]:'r',[BQ]:'q',[BK]:'k' };
const PIECE_VALUES = { [WP]:100,[WN]:320,[WB]:330,[WR]:500,[WQ]:900,[WK]:20000,[BP]:-100,[BN]:-320,[BB]:-330,[BR]:-500,[BQ]:-900,[BK]:-20000 };

function initBoard() {
  const b = Array(64).fill(EMPTY);
  [WR,WN,WB,WQ,WK,WB,WN,WR].forEach((p,i) => { b[i]=p; b[56+i]=[BR,BN,BB,BQ,BK,BB,BN,BR][i]; });
  for(let i=0;i<8;i++){b[8+i]=WP;b[48+i]=BP;}
  return b;
}

function isWhite(p){return p>=1&&p<=6;}
function isBlack(p){return p>=7&&p<=12;}
function isColor(p,white){return white?isWhite(p):isBlack(p);}
function isEnemy(p,white){return white?isBlack(p):isWhite(p);}

function rc(sq){return[sq>>3,sq&7];}
function sq(r,c){return r*8+c;}
function onBoard(r,c){return r>=0&&r<8&&c>=0&&c<8;}

function generateMoves(board,white,castling,enPassant){
  const moves=[];
  const add=(from,to,flags)=>moves.push({from,to,flags:flags||0});

  for(let i=0;i<64;i++){
    const p=board[i];
    if(!isColor(p,white))continue;
    const[r,c]=rc(i);
    const type=white?p:p-6;

    if(type===1){// Pawn
      const dir=white?1:-1;
      const startRow=white?1:6;
      const promoRow=white?7:0;
      const fwd=sq(r+dir,c);
      if(onBoard(r+dir,c)&&board[fwd]===EMPTY){
        if(r+dir===promoRow){add(i,fwd,4);}// promotion
        else{add(i,fwd);if(r===startRow&&board[sq(r+dir*2,c)]===EMPTY)add(i,sq(r+dir*2,c),1);}// double push
      }
      for(const dc of[-1,1]){
        if(!onBoard(r+dir,c+dc))continue;
        const to=sq(r+dir,c+dc);
        if(isEnemy(board[to],white)){r+dir===promoRow?add(i,to,4):add(i,to);}
        if(to===enPassant)add(i,to,2);// en passant
      }
    }else if(type===2){// Knight
      for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
        if(!onBoard(r+dr,c+dc))continue;const to=sq(r+dr,c+dc);
        if(!isColor(board[to],white))add(i,to);
      }
    }else if(type===6){// King
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(dr===0&&dc===0)continue;if(!onBoard(r+dr,c+dc))continue;
        const to=sq(r+dr,c+dc);if(!isColor(board[to],white))add(i,to);
      }
      // Castling
      const row=white?0:7;
      if(r===row&&c===4){
        const ks=white?'K':'k',qs=white?'Q':'q';
        if(castling.includes(ks)&&board[sq(row,5)]===EMPTY&&board[sq(row,6)]===EMPTY)add(i,sq(row,6),3);
        if(castling.includes(qs)&&board[sq(row,3)]===EMPTY&&board[sq(row,2)]===EMPTY&&board[sq(row,1)]===EMPTY)add(i,sq(row,2),3);
      }
    }else{// Bishop/Rook/Queen slides
      const dirs=type===3?[[-1,-1],[-1,1],[1,-1],[1,1]]:type===4?[[-1,0],[1,0],[0,-1],[0,1]]:[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      for(const[dr,dc]of dirs){
        let nr=r+dr,nc=c+dc;
        while(onBoard(nr,nc)){
          const to=sq(nr,nc);
          if(isColor(board[to],white))break;
          add(i,to);if(isEnemy(board[to],white))break;
          nr+=dr;nc+=dc;
        }
      }
    }
  }
  return moves;
}

function inCheck(board,white){
  let kingSq=-1;
  const kingPiece=white?WK:BK;
  for(let i=0;i<64;i++)if(board[i]===kingPiece){kingSq=i;break;}
  if(kingSq===-1)return true;
  const enemy=generateMoves(board,!white,'',null);
  return enemy.some(m=>m.to===kingSq);
}

function makeMove(board,move,castling,enPassant){
  const b=[...board];
  const p=b[move.from];
  b[move.to]=p;b[move.from]=EMPTY;
  let newCastling=castling;
  let newEP=null;

  if(move.flags===1){// double pawn push
    const white=isWhite(p);
    newEP=sq(rc(move.from)[0]+(white?1:-1),rc(move.from)[1]);
  }
  if(move.flags===2){// en passant capture
    const white=isWhite(p);
    b[sq(rc(move.to)[0]+(white?-1:1),rc(move.to)[1])]=EMPTY;
  }
  if(move.flags===3){// castling
    const[r]=rc(move.to);
    if(rc(move.to)[1]===6){b[sq(r,5)]=b[sq(r,7)];b[sq(r,7)]=EMPTY;}// kingside
    else{b[sq(r,3)]=b[sq(r,0)];b[sq(r,0)]=EMPTY;}// queenside
  }
  if(move.flags===4){// promotion
    b[move.to]=isWhite(p)?WQ:BQ;
  }
  // Update castling rights
  if(p===WK)newCastling=newCastling.replace(/[KQ]/g,'');
  if(p===BK)newCastling=newCastling.replace(/[kq]/g,'');
  if(move.from===0||move.to===0)newCastling=newCastling.replace('Q','');
  if(move.from===7||move.to===7)newCastling=newCastling.replace('K','');
  if(move.from===56||move.to===56)newCastling=newCastling.replace('q','');
  if(move.from===63||move.to===63)newCastling=newCastling.replace('k','');

  return{board:b,castling:newCastling,enPassant:newEP};
}

function getLegalMoves(board,white,castling,enPassant){
  const pseudo=generateMoves(board,white,castling,enPassant);
  return pseudo.filter(m=>{
    const{board:b}=makeMove(board,m,castling,enPassant);
    return!inCheck(b,white);
  });
}

function evaluate(board){
  let score=0;
  for(let i=0;i<64;i++){
    const p=board[i];
    if(p!==EMPTY)score+=PIECE_VALUES[p]||0;
  }
  return score;
}

function minimax(board,depth,alpha,beta,white,castling,enPassant){
  if(depth===0)return{score:evaluate(board)};
  const moves=getLegalMoves(board,white,castling,enPassant);
  if(moves.length===0){
    if(inCheck(board,white))return{score:white?-99999:99999};
    return{score:0};// stalemate
  }
  let bestMove=moves[0];
  if(white){
    let maxEval=-Infinity;
    for(const m of moves){
      const{board:b,castling:c,enPassant:ep}=makeMove(board,m,castling,enPassant);
      const{score}=minimax(b,depth-1,alpha,beta,false,c,ep);
      if(score>maxEval){maxEval=score;bestMove=m;}
      alpha=Math.max(alpha,score);if(beta<=alpha)break;
    }
    return{score:maxEval,move:bestMove};
  }else{
    let minEval=Infinity;
    for(const m of moves){
      const{board:b,castling:c,enPassant:ep}=makeMove(board,m,castling,enPassant);
      const{score}=minimax(b,depth-1,alpha,beta,true,c,ep);
      if(score<minEval){minEval=score;bestMove=m;}
      beta=Math.min(beta,score);if(beta<=alpha)break;
    }
    return{score:minEval,move:bestMove};
  }
}

/* ═══════════ 3D PIECE MODELS ═══════════ */
const PIECE_GEOMETRY = {
  P:({color})=><group><mesh castShadow position={[0,0.2,0]}><sphereGeometry args={[0.18,16,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh><mesh castShadow position={[0,0.02,0]}><cylinderGeometry args={[0.22,0.25,0.04,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh></group>,
  N:({color})=><group><mesh castShadow position={[0,0.3,0]}><coneGeometry args={[0.15,0.35,8]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh><mesh castShadow position={[0,0.1,0]}><cylinderGeometry args={[0.2,0.25,0.2,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh></group>,
  B:({color})=><group><mesh castShadow position={[0,0.35,0]}><sphereGeometry args={[0.1,12,12]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh><mesh castShadow position={[0,0.18,0]}><cylinderGeometry args={[0.12,0.2,0.3,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh><mesh castShadow position={[0,0.02,0]}><cylinderGeometry args={[0.22,0.25,0.04,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh></group>,
  R:({color})=><group><mesh castShadow position={[0,0.25,0]}><boxGeometry args={[0.28,0.15,0.28]}/><meshStandardMaterial color={color} metalness={0.6} roughness={0.2}/></mesh><mesh castShadow position={[0,0.1,0]}><cylinderGeometry args={[0.18,0.22,0.2,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh></group>,
  Q:({color})=><group><mesh castShadow position={[0,0.45,0]}><sphereGeometry args={[0.1,12,12]}/><meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.1}/></mesh><mesh castShadow position={[0,0.25,0]}><cylinderGeometry args={[0.1,0.2,0.3,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh><mesh castShadow position={[0,0.05,0]}><cylinderGeometry args={[0.22,0.25,0.1,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh></group>,
  K:({color})=><group><mesh castShadow position={[0,0.5,0]}><boxGeometry args={[0.06,0.15,0.06]}/><meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.1}/></mesh><mesh castShadow position={[0,0.48,0]}><boxGeometry args={[0.15,0.06,0.06]}/><meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.1}/></mesh><mesh castShadow position={[0,0.28,0]}><cylinderGeometry args={[0.1,0.2,0.3,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh><mesh castShadow position={[0,0.06,0]}><cylinderGeometry args={[0.22,0.25,0.12,16]}/><meshStandardMaterial color={color} metalness={0.5} roughness={0.3}/></mesh></group>,
};

function ChessPiece3D({piece,position,selected,onClick}){
  const ref=useRef();
  const white=isWhite(piece);
  const type=PIECE_NAMES[piece]?.toUpperCase();
  const Geo=PIECE_GEOMETRY[type];
  const color=white?'#e8e0d0':'#2d2d2d';

  useFrame(({clock})=>{
    if(!ref.current)return;
    ref.current.position.y=selected?0.15+Math.sin(clock.getElapsedTime()*4)*0.05:0;
  });

  if(!Geo)return null;
  return(
    <group ref={ref} position={position} onClick={onClick}>
      <Geo color={color}/>
    </group>
  );
}

/* ═══════════ 3D BOARD ═══════════ */
function ChessBoard3D({board,selected,legalMoves,lastMove,onSquareClick}){
  const squares=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const i=sq(r,c);
    const isDark=(r+c)%2===0;
    const isSelected=selected===i;
    const isLegal=legalMoves.some(m=>m.to===i);
    const isLastMove=lastMove&&(lastMove.from===i||lastMove.to===i);

    let color=isDark?'#769656':'#eeeed2';
    if(isSelected)color='#f59e0b';
    else if(isLastMove)color=isDark?'#aaa23a':'#f6f669';

    squares.push(
      <group key={i} position={[c-3.5,0,r-3.5]} onClick={()=>onSquareClick(i)}>
        <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-0.05,0]}>
          <boxGeometry args={[0.95,0.95,0.1]}/>
          <meshStandardMaterial color={color} metalness={0.1} roughness={0.8}/>
        </mesh>
        {isLegal&&(
          <mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}>
            <circleGeometry args={[board[i]!==EMPTY?0.4:0.15,16]}/>
            <meshBasicMaterial color={board[i]!==EMPTY?'#ef444488':'#22c55e66'} transparent depthWrite={false}/>
          </mesh>
        )}
        {board[i]!==EMPTY&&(
          <ChessPiece3D
            piece={board[i]}
            position={[0,0,0]}
            selected={isSelected}
            onClick={()=>onSquareClick(i)}
          />
        )}
      </group>
    );
  }

  return(
    <group>
      {/* Board frame */}
      <mesh position={[0,-0.15,0]} receiveShadow>
        <boxGeometry args={[8.5,0.2,8.5]}/>
        <meshStandardMaterial color="#5c3a1e" metalness={0.3} roughness={0.6}/>
      </mesh>
      {squares}
      {/* Labels */}
      {[...'abcdefgh'].map((l,i)=>(
        <Text key={l} position={[i-3.5,-0.04,4.2]} rotation={[-Math.PI/2,0,0]} fontSize={0.2} color="#8b7355">{l}</Text>
      ))}
      {[...'12345678'].map((l,i)=>(
        <Text key={l} position={[-4.2,-0.04,i-3.5]} rotation={[-Math.PI/2,0,0]} fontSize={0.2} color="#8b7355">{l}</Text>
      ))}
    </group>
  );
}

/* ═══════════ MAIN ═══════════ */
export default function ChessApp(){
  const[board,setBoard]=useState(initBoard);
  const[white,setWhite]=useState(true);
  const[selected,setSelected]=useState(null);
  const[castling,setCastling]=useState('KQkq');
  const[enPassant,setEnPassant]=useState(null);
  const[captured,setCaptured]=useState({w:[],b:[]});
  const[history,setHistory]=useState([]);
  const[lastMove,setLastMove]=useState(null);
  const[status,setStatus]=useState('playing');// playing,check,checkmate,stalemate
  const[thinking,setThinking]=useState(false);
  const[playerColor]=useState(true);// player is white

  const legalMoves=useMemo(()=>{
    if(selected===null||!isColor(board[selected],white))return[];
    return getLegalMoves(board,white,castling,enPassant).filter(m=>m.from===selected);
  },[board,selected,white,castling,enPassant]);

  const allLegalMoves=useMemo(()=>getLegalMoves(board,white,castling,enPassant),[board,white,castling,enPassant]);

  const doMove=useCallback((move)=>{
    const capturedPiece=board[move.to];
    const{board:newBoard,castling:newC,enPassant:newEP}=makeMove(board,move,castling,enPassant);

    if(capturedPiece!==EMPTY){
      setCaptured(c=>({...c,[isWhite(capturedPiece)?'w':'b']:[...c[isWhite(capturedPiece)?'w':'b'],capturedPiece]}));
    }

    const pName=PIECE_NAMES[board[move.from]]||'?';
    const fromStr=String.fromCharCode(97+(move.from&7))+(1+(move.from>>3));
    const toStr=String.fromCharCode(97+(move.to&7))+(1+(move.to>>3));
    setHistory(h=>[...h,`${pName}${fromStr}-${toStr}`]);

    setBoard(newBoard);
    setCastling(newC);
    setEnPassant(newEP);
    setLastMove(move);
    setSelected(null);

    const nextWhite=!white;
    setWhite(nextWhite);

    // Check game state
    const nextMoves=getLegalMoves(newBoard,nextWhite,newC,newEP);
    const check=inCheck(newBoard,nextWhite);
    if(nextMoves.length===0){
      setStatus(check?'checkmate':'stalemate');
    }else if(check){
      setStatus('check');
    }else{
      setStatus('playing');
    }

    return{newBoard,newC,newEP,nextWhite};
  },[board,castling,enPassant,white]);

  const onSquareClick=useCallback((i)=>{
    if(status==='checkmate'||status==='stalemate')return;
    if(thinking)return;
    if(white!==playerColor)return;// Not player's turn

    if(selected!==null){
      const move=legalMoves.find(m=>m.to===i);
      if(move){
        const result=doMove(move);
        // AI turn
        if(result&&result.nextWhite!==playerColor&&!['checkmate','stalemate'].includes(status)){
          setThinking(true);
          setTimeout(()=>{
            const{move:aiMove}=minimax(result.newBoard,3,-Infinity,Infinity,result.nextWhite,result.newC,result.newEP);
            if(aiMove)doMove(aiMove);
            setThinking(false);
          },100);
        }
        return;
      }
    }

    if(isColor(board[i],white)){
      setSelected(i);
    }else{
      setSelected(null);
    }
  },[selected,legalMoves,board,white,doMove,status,thinking,playerColor]);

  const resetGame=()=>{
    setBoard(initBoard());setWhite(true);setSelected(null);
    setCastling('KQkq');setEnPassant(null);setCaptured({w:[],b:[]});
    setHistory([]);setLastMove(null);setStatus('playing');setThinking(false);
  };

  const PIECE_EMOJI={[WP]:'♙',[WN]:'♘',[WB]:'♗',[WR]:'♖',[WQ]:'♕',[WK]:'♔',[BP]:'♟',[BN]:'♞',[BB]:'♝',[BR]:'♜',[BQ]:'♛',[BK]:'♚'};

  return(
    <div className="relative w-screen h-screen bg-[#1a1208] overflow-hidden">
      <Canvas camera={{position:[0,8,6],fov:45}} shadows>
        <ambientLight intensity={0.3}/>
        <directionalLight position={[5,10,5]} intensity={0.7} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}/>
        <pointLight position={[-4,6,-4]} intensity={0.2} color="#fbbf24"/>

        <ChessBoard3D board={board} selected={selected} legalMoves={legalMoves} lastMove={lastMove} onSquareClick={onSquareClick}/>

        <OrbitControls enablePan={false} minDistance={6} maxDistance={15} minPolarAngle={0.3} maxPolarAngle={1.2} target={[0,0,0]}/>
        <Environment preset="apartment"/>
      </Canvas>

      {/* Side Panel */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-72 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><span className="text-2xl">♟</span> 3D Chess</h1>
          <p className="text-xs text-gray-500 mt-1">You: White — AI: Black (depth 3)</p>
        </div>

        {/* Status */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {thinking&&<span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>}
            <span className={`text-sm font-bold ${status==='checkmate'?'text-red-400':status==='check'?'text-amber-400':'text-emerald-400'}`}>
              {status==='checkmate'?`Checkmate! ${white?'Black':'White'} wins`
                :status==='stalemate'?'Stalemate — Draw'
                :status==='check'?`${white?'White':'Black'} in Check!`
                :thinking?'AI thinking...'
                :`${white?'White':'Black'} to move`}
            </span>
          </div>
        </div>

        {/* Captured */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Captured</p>
          <div className="flex gap-0.5 flex-wrap mb-1">
            {captured.b.map((p,i)=><span key={i} className="text-lg">{PIECE_EMOJI[p]}</span>)}
            {captured.b.length===0&&<span className="text-[10px] text-gray-600">—</span>}
          </div>
          <div className="flex gap-0.5 flex-wrap">
            {captured.w.map((p,i)=><span key={i} className="text-lg">{PIECE_EMOJI[p]}</span>)}
            {captured.w.length===0&&<span className="text-[10px] text-gray-600">—</span>}
          </div>
        </div>

        {/* Move history */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Moves ({history.length})</p>
          <div className="max-h-32 overflow-y-auto font-mono text-[11px] text-gray-400 space-y-0.5">
            {Array.from({length:Math.ceil(history.length/2)},(_, i)=>(
              <div key={i} className="flex gap-2">
                <span className="text-gray-600 w-5">{i+1}.</span>
                <span className="w-14">{history[i*2]||''}</span>
                <span className="w-14 text-gray-500">{history[i*2+1]||''}</span>
              </div>
            )).reverse()}
          </div>
        </div>

        <div className="p-4">
          <button onClick={resetGame} className="w-full px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-medium rounded-xl text-sm transition-colors">
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
