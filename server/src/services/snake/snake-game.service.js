// 拆分后的贪吃蛇游戏服务
import { RoomManagerService } from '../multiplayer/room-manager.service.js';
import { SnakeRoomModel } from '../../models/snake-room.model.js';
import { SnakePlayerModel } from '../../models/snake-player.model.js';
// Removed unused imports to silence lint warnings
import { createInitialSnake, updateSharedGameTick } from './shared-mode.logic.js';
import { updateCompetitiveGameTick } from './competitive-mode.logic.js';
import { VoteManager } from './vote-manager.js';
import { GameLifecycleManager } from './game-lifecycle.js';

export class SnakeGameService extends RoomManagerService {
  constructor(wsService){
    super(wsService, SnakeRoomModel, SnakePlayerModel, { 
      gameType: 'snake', 
      defaultGameConfig: { 
        maxPlayers: 999, 
        minPlayers: 1, 
        gameSpeed: 150, 
        timeout: 3000 
      }
    });
    
    this.SNAKE_CONFIG = { 
      VOTE_TIMEOUT: 80, 
      GAME_SPEED: 100, 
      BOARD_SIZE: 20, 
      INITIAL_SNAKE_LENGTH: 3 
    };
    
    // 初始化管理器
    this.voteManager = new VoteManager(this);
    this.lifecycleManager = new GameLifecycleManager(this);
    
    // 自动清理：周期扫描并清理长时间无活动或无玩家的房间（间隔 1 分钟）
    if(!SnakeGameService._autoCleanup){
      SnakeGameService._autoCleanup = true;
      setInterval(()=>{ 
        try { 
          this.autoCleanupStaleRooms(); 
        } catch(e){ 
          console.error('蛇房间自动清理失败', e); 
        } 
      }, 60*1000);
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
  handleVote(roomId, sessionId, direction) {
    return this.voteManager.handleVote(roomId, sessionId, direction);
  }

  startVoteTimer(roomId) {
    return this.voteManager.startVoteTimer(roomId);
  }

  processVotes(roomId) {
    return this.voteManager.processVotes(roomId);
  }

  // ---- 游戏主流程 ----
  startGame(roomId, hostSessionId = null) {
    return this.lifecycleManager.startGame(roomId, hostSessionId);
  }

  startSharedLoop(roomId){ if(this.gameTimers.has(roomId)) return; setTimeout(()=>{ if(this.gameTimers.has(roomId)) return; const loop=setInterval(()=>updateSharedGameTick(this, roomId), this.SNAKE_CONFIG.GAME_SPEED); this.gameTimers.set(roomId, loop); },1000); }
  startCompetitiveLoop(roomId){ const tick=()=>{ const gs=this.getGameState(roomId); if(!gs||gs.mode!=='competitive') return; if(gs.status!=='playing'){ this.gameTimers.delete(roomId); return; } updateCompetitiveGameTick(this, roomId); const latest=this.getGameState(roomId); if(latest && latest.status==='playing'){ this.gameTimers.set(roomId, setTimeout(tick, this.SNAKE_CONFIG.GAME_SPEED)); } else { this.gameTimers.delete(roomId);} }; if(this.gameTimers.has(roomId)){ clearTimeout(this.gameTimers.get(roomId)); this.gameTimers.delete(roomId);} this.gameTimers.set(roomId, setTimeout(tick, this.SNAKE_CONFIG.GAME_SPEED)); }

  handleCompetitiveMove(roomId, sessionId, direction){ const gs=this.getGameState(roomId); if(!gs||gs.mode!=='competitive') return; const snake=gs.snakes?.[sessionId]; if(!snake||snake.gameOver) return; const opp={up:'down',down:'up',left:'right',right:'left'}; if(opp[snake.direction]===direction) return; snake.nextDirection=direction; }

  endGame(roomId, reason = 'finished') {
    return this.lifecycleManager.endGame(roomId, reason);
  }

  cleanupGameResources(roomId) {
    super.cleanupGameResources(roomId);
    this.voteManager.cleanup(roomId);
  }

  // ---- 自动清理逻辑 ----
  autoCleanupStaleRooms(){
    const now=Date.now();
    const rooms = SnakeRoomModel.getActiveRooms();
    let removed=0; const stale=[];
    rooms.forEach(r=>{
      const gs=this.getGameState(r.id);
      const online = SnakePlayerModel.getPlayerCount(r.id);
      // 兼容 SQLite datetime('now') 返回的无时区字符串 (UTC) -> 解析为 UTC
      const parseDbTime=(ts)=>{ if(!ts) return now; let s=ts.trim(); if(/T/.test(s)===false) s=s.replace(' ', 'T'); if(!/Z$/i.test(s)) s+= 'Z'; const t=Date.parse(s); return isNaN(t)? now : t; };
      const updatedAt = r.updated_at ? parseDbTime(r.updated_at) : now;
      const idleMs = now - updatedAt;
      const empty = online===0;
      const longFinished = gs && gs.status==='finished' && idleMs>5*60*1000; // 结束5分钟后仍未重开
      const idleTooLong = idleMs > 30*60*1000; // 30分钟无更新

      let willRemove = (empty || longFinished || idleTooLong);
      // 新增保护：正在进行中的房间且有人在线，不执行清理
      if(gs && gs.status==='playing' && !empty){ willRemove=false; }
      let reason = [];
      if(empty) reason.push('empty');
      if(longFinished) reason.push('longFinished');
      if(idleTooLong) reason.push('idleTooLong');

      // 调试：如果房间状态仍是 playing 但判定 empty，记录可疑情况
      if(process.env.SNAKE_CLEANUP_DEBUG && empty && gs && gs.status==='playing'){
        console.warn('[SnakeCleanup][SUSPECT] playing 房间被视为空', {room_id:r.id, mode:r.mode, gsStatus:gs.status, online, idleMs, updated_at:r.updated_at});
      }

      if(process.env.SNAKE_CLEANUP_DEBUG && idleMs>4*60*60*1000 && idleMs<10*60*60*1000){
        console.warn('[SnakeCleanup][TZ?] 发现可能的时区偏差导致的巨大 idleMs', {room_id:r.id, idleMs, updated_at:r.updated_at, parsedUpdatedAt:new Date(updatedAt).toISOString(), nowISO:new Date(now).toISOString()});
      }

      if(process.env.SNAKE_CLEANUP_DEBUG){
        console.debug('[SnakeCleanup][CHECK]', {room_id:r.id, status:r.status, gsStatus:gs?.status, online, idleMs, updated_at:r.updated_at, willRemove, reason});
      }

      if(willRemove){
        this.cleanupGameResources(r.id);
        SnakeRoomModel.delete(r.id);
        removed++; stale.push({id:r.id, status:r.status, gsStatus:gs?.status, reason, empty, longFinished, idleMs, online});
      }
    });
    if(removed>0){
      this.wsService.broadcast('snake_room_list_updated');
      console.debug && console.debug(`自动清理 ${removed} 个蛇房间`, stale);
    }
  }

  async leaveRoom(sessionId, roomId){
    const result = await super.leaveRoom(sessionId, roomId);
    const remaining = await this.PlayerModel.getPlayerCount(roomId);
    if(remaining===0){ this.cleanupGameResources(roomId); SnakeRoomModel.delete(roomId); this.wsService.broadcast('snake_room_list_updated'); }
    return result;
  }
}
