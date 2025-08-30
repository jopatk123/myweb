// 拆分后的贪吃蛇游戏服务
import { RoomManagerService } from '../multiplayer/room-manager.service.js';
import { SnakeRoomModel } from '../../models/snake-room.model.js';
import { SnakePlayerModel } from '../../models/snake-player.model.js';
import { SnakeGameRecordModel } from '../../models/snake-game-record.model.js';
import { createInitialSnake, updateSharedGameTick } from './shared-mode.logic.js';
import { initCompetitivePlayers, updateCompetitiveGameTick, generateCompetitiveFoods } from './competitive-mode.logic.js';

export class SnakeGameService extends RoomManagerService {
  constructor(wsService){
    super(wsService, SnakeRoomModel, SnakePlayerModel, { gameType:'snake', defaultGameConfig:{ maxPlayers:999, minPlayers:1, gameSpeed:150, timeout:3000 }});
    this.voteTimers = new Map();
    this.SNAKE_CONFIG = { VOTE_TIMEOUT:80, GAME_SPEED:100, BOARD_SIZE:20, INITIAL_SNAKE_LENGTH:3 };
    // 自动清理：周期扫描并清理长时间无活动或无玩家的房间（间隔 1 分钟）
    if(!SnakeGameService._autoCleanup){
      SnakeGameService._autoCleanup = true;
      setInterval(()=>{ try { this.autoCleanupStaleRooms(); } catch(e){ console.error('蛇房间自动清理失败', e); } }, 60*1000);
    }
  }

  // ---- 创建 / 初始化 ----
  createSnakeRoom(sessionId, playerName, mode, gameSettings={}){
    const roomData = { mode, max_players: mode==='shared'?999:2, status:'waiting' };
    const gameConfig = { board_size:this.SNAKE_CONFIG.BOARD_SIZE, game_speed:this.SNAKE_CONFIG.GAME_SPEED, vote_timeout:this.SNAKE_CONFIG.VOTE_TIMEOUT, ...gameSettings };
    return this.createRoom(sessionId, playerName, roomData, gameConfig);
  }

  initGameState(roomId, mode, config={}){
    const gameState = { mode, status:'waiting', votes:{}, voteStartTime:null, createdAt:Date.now(), config:{...this.SNAKE_CONFIG,...config} };
    if(mode==='shared') { gameState.sharedSnake = createInitialSnake(this.SNAKE_CONFIG.BOARD_SIZE); gameState.food = this.generateFood(gameState.sharedSnake.body); }
    if(mode==='competitive'){ gameState.snakes={}; gameState.foods=[]; }
    this.gameStates.set(roomId, gameState);
    return gameState;
  }

  // ---- 通用工具 ----
  generateFood(exclude=[]) { return this.generateRandomPosition(this.SNAKE_CONFIG.BOARD_SIZE, exclude); }
  isValidDirectionChange(cur, next){ const opp={up:'down',down:'up',left:'right',right:'left'}; return opp[cur]!==next; }
  checkSelfCollision(head, body){ return body.some(seg=>seg.x===head.x && seg.y===head.y); }

  // ---- 投票（共享模式） ----
  handleVote(roomId, sessionId, direction){
    const gs = this.getGameState(roomId); if(!gs || gs.mode!=='shared' || gs.status!=='playing') return;
    const player = SnakePlayerModel.findByRoomAndSession(roomId, sessionId); if(!player) return;
    gs.votes[sessionId] = { direction, player_name: player.player_name, player_color: player.player_color, timestamp: Date.now() };
    const onlinePlayers = SnakePlayerModel.findOnlineByRoomId(roomId) || []; const single = onlinePlayers.length===1;
    if(single && gs.sharedSnake){ if(this.isValidDirectionChange(gs.sharedSnake.direction, direction)){ gs.sharedSnake.nextDirection = direction; gs.sharedSnake.isWaitingForFirstVote=false; } gs.votes={}; gs.voteStartTime=null; if(this.voteTimers.has(roomId)){ clearTimeout(this.voteTimers.get(roomId)); this.voteTimers.delete(roomId);} this.broadcastToRoom(roomId,'game_update',{room_id:roomId,game_state:gs,shared_snake:gs.sharedSnake,food:gs.food}); return; }
    if(gs.sharedSnake && gs.sharedSnake.isWaitingForFirstVote){ if(this.isValidDirectionChange(gs.sharedSnake.direction, direction)){ gs.sharedSnake.nextDirection=direction; } }
    this.broadcastToRoom(roomId,'vote_updated',{room_id:roomId,votes:gs.votes});
    if(!gs.voteStartTime) this.startVoteTimer(roomId);
    try { const totalOnline = onlinePlayers.length; const voteCount = Object.keys(gs.votes).length; if(totalOnline>1 && voteCount===totalOnline){ if(this.voteTimers.has(roomId)){ clearTimeout(this.voteTimers.get(roomId)); this.voteTimers.delete(roomId);} this.processVotes(roomId); } } catch(e){ }
  }
  startVoteTimer(roomId){ const gs=this.getGameState(roomId); if(!gs) return; gs.voteStartTime=Date.now(); const timeout=gs.config?.vote_timeout??this.SNAKE_CONFIG.VOTE_TIMEOUT; const t=setTimeout(()=>this.processVotes(roomId), timeout); this.voteTimers.set(roomId,t); }
  processVotes(roomId){ const gs=this.getGameState(roomId); if(!gs||!gs.sharedSnake) return; const counts={}; Object.values(gs.votes).forEach(v=>{ counts[v.direction]=(counts[v.direction]||0)+1; }); let win=gs.sharedSnake.direction, max=0; Object.entries(counts).forEach(([d,c])=>{ if(c>max){ max=c; win=d; } }); if(this.isValidDirectionChange(gs.sharedSnake.direction, win)) gs.sharedSnake.nextDirection=win; gs.votes={}; gs.voteStartTime=null; if(this.voteTimers.has(roomId)){ clearTimeout(this.voteTimers.get(roomId)); this.voteTimers.delete(roomId);} this.broadcastToRoom(roomId,'game_update',{room_id:roomId,game_state:gs,shared_snake:gs.sharedSnake,food:gs.food}); }

  // ---- 游戏主流程 ----
  startGame(roomId, hostSessionId=null){
    const room = SnakeRoomModel.findById(roomId); if(!room) throw new Error('房间不存在'); if(room.status==='playing') return {success:true, players: SnakePlayerModel.findOnlineByRoomId(roomId)};
    if(hostSessionId && room.created_by !== hostSessionId) throw new Error('只有房主可以开始游戏');
    const players = SnakePlayerModel.findOnlineByRoomId(roomId); if(players.length===0) throw new Error('房间内没有玩家');
    if(room.mode==='competitive'){ const ready=players.filter(p=>p.is_ready); if(ready.length!==players.length || players.length<2) throw new Error('竞技模式需要至少2名玩家且所有玩家都准备就绪'); }
    let gs = this.getGameState(roomId); if(!gs) throw new Error('游戏状态不存在'); if(gs.status==='finished'){ this.initGameState(roomId, room.mode); gs=this.getGameState(roomId); }
    if(this.gameTimers.has(roomId)) return {success:true, players};
    SnakeRoomModel.update(roomId,{ status:'playing' }); this.updateGameState(roomId,{ status:'playing', startTime: Date.now() }); gs.playerCount=players.length;
    if(gs.mode==='shared'){ if(players.length===1 && gs.sharedSnake){ gs.sharedSnake.isWaitingForFirstVote=false; gs.votes={}; gs.voteStartTime=null; } this.startSharedLoop(roomId); }
    else if(gs.mode==='competitive'){ initCompetitivePlayers(this, roomId, players); this.startCompetitiveLoop(roomId); }
    this.broadcastToRoom(roomId,'game_started',{ room_id:roomId, game_state:this.getGameState(roomId), players });
    return { success:true, players };
  }

  startSharedLoop(roomId){ if(this.gameTimers.has(roomId)) return; setTimeout(()=>{ if(this.gameTimers.has(roomId)) return; const loop=setInterval(()=>updateSharedGameTick(this, roomId), this.SNAKE_CONFIG.GAME_SPEED); this.gameTimers.set(roomId, loop); },1000); }
  startCompetitiveLoop(roomId){ const tick=()=>{ const gs=this.getGameState(roomId); if(!gs||gs.mode!=='competitive') return; if(gs.status!=='playing'){ this.gameTimers.delete(roomId); return; } updateCompetitiveGameTick(this, roomId); const latest=this.getGameState(roomId); if(latest && latest.status==='playing'){ this.gameTimers.set(roomId, setTimeout(tick, this.SNAKE_CONFIG.GAME_SPEED)); } else { this.gameTimers.delete(roomId);} }; if(this.gameTimers.has(roomId)){ clearTimeout(this.gameTimers.get(roomId)); this.gameTimers.delete(roomId);} this.gameTimers.set(roomId, setTimeout(tick, this.SNAKE_CONFIG.GAME_SPEED)); }

  handleCompetitiveMove(roomId, sessionId, direction){ const gs=this.getGameState(roomId); if(!gs||gs.mode!=='competitive') return; const snake=gs.snakes?.[sessionId]; if(!snake||snake.gameOver) return; const opp={up:'down',down:'up',left:'right',right:'left'}; if(opp[snake.direction]===direction) return; snake.nextDirection=direction; }

  endGame(roomId, reason='finished'){
    const gs=this.getGameState(roomId); if(!gs) return; if(this.gameTimers.has(roomId)){ clearInterval(this.gameTimers.get(roomId)); this.gameTimers.delete(roomId);} if(this.voteTimers.has(roomId)){ clearTimeout(this.voteTimers.get(roomId)); this.voteTimers.delete(roomId);} this.updateGameState(roomId,{ status:'finished', endTime: Date.now(), endReason: reason }); SnakeRoomModel.update(roomId,{ status:'waiting' }); this.saveGameRecord(roomId, gs, reason); this.broadcastToRoom(roomId,'game_ended',{ room_id:roomId, reason, final_score: gs.sharedSnake?.score||0, game_state: gs, winner: gs.winner||null });
  }

  saveGameRecord(roomId, gs, reason){ try { const room=SnakeRoomModel.findById(roomId); if(!room) return; const players=SnakePlayerModel.findByRoomId(roomId); const finalScore=gs.sharedSnake?.score||0; const duration=gs.startTime? (Date.now()-gs.startTime):0; if(gs.mode==='shared'){ players.forEach(p=>{ SnakeGameRecordModel.create({ room_id:roomId, mode:gs.mode, winner_session_id:p.session_id, winner_score:finalScore, game_duration:duration, end_reason:reason, player_count:players.length }); }); } } catch(e){ console.error('保存游戏记录失败', e); } }

  cleanupGameResources(roomId){ super.cleanupGameResources(roomId); if(this.voteTimers.has(roomId)){ clearTimeout(this.voteTimers.get(roomId)); this.voteTimers.delete(roomId);} }

  // ---- 自动清理逻辑 ----
  autoCleanupStaleRooms(){
    const now=Date.now();
    const rooms = SnakeRoomModel.getActiveRooms();
    let removed=0; const stale=[];
    rooms.forEach(r=>{
      const gs=this.getGameState(r.id);
      const online = SnakePlayerModel.getPlayerCount(r.id);
      const updatedAt = r.updated_at ? new Date(r.updated_at).getTime() : now;
      const idleMs = now - updatedAt;
      const empty = online===0;
      const longFinished = gs && gs.status==='finished' && idleMs>5*60*1000; // 结束5分钟后仍未重开
      const idleTooLong = idleMs > 30*60*1000; // 30分钟无更新
      if(empty || longFinished || idleTooLong){
        this.cleanupGameResources(r.id);
        SnakeRoomModel.delete(r.id);
        removed++; stale.push({id:r.id, empty, longFinished, idleMs});
      }
    });
    if(removed>0){ this.wsService.broadcast('snake_room_list_updated'); console.log(`自动清理 ${removed} 个蛇房间`, stale); }
  }

  async leaveRoom(sessionId, roomId){
    const result = await super.leaveRoom(sessionId, roomId);
    const remaining = await this.PlayerModel.getPlayerCount(roomId);
    if(remaining===0){ this.cleanupGameResources(roomId); SnakeRoomModel.delete(roomId); this.wsService.broadcast('snake_room_list_updated'); }
    return result;
  }
}
