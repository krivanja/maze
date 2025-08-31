// Maze Game Implementation
// Author: KRIVANJA
(() => {
  const canvas = document.getElementById('mazeCanvas');
  const ctx = canvas.getContext('2d');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const generateBtn = document.getElementById('generateBtn');
  const solveBtn = document.getElementById('solveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const timeStat = document.getElementById('timeStat');
  const movesStat = document.getElementById('movesStat');

  // State
  let cols = parseInt(widthInput.value, 10);
  let rows = parseInt(heightInput.value, 10);
  let cellSize = 24;  // dynamic scaling later
  let maze = null;
  let player = { c: 0, r: 0 };
  let goal = { c: cols - 1, r: rows - 1 };
  let showSolution = false;
  let solutionPath = [];
  let started = false;
  let startTime = 0;
  let timerInterval = null;
  let moves = 0;

  const DIRS = [
    { dc: 0, dr: -1, wall: 'top', opposite: 'bottom' },
    { dc: 1, dr: 0, wall: 'right', opposite: 'left' },
    { dc: 0, dr: 1, wall: 'bottom', opposite: 'top' },
    { dc: -1, dr: 0, wall: 'left', opposite: 'right' }
  ];

  function init() {
    generateMaze();
    attachEvents();
    loop();
  }

  function attachEvents() {
    generateBtn.addEventListener('click', () => {
      cols = clamp(parseInt(widthInput.value, 10), 5, 100);
      rows = clamp(parseInt(heightInput.value, 10), 5, 100);
      regenerate();
    });

    solveBtn.addEventListener('click', () => {
      showSolution = !showSolution;
      solveBtn.classList.toggle('active', showSolution);
    });

    resetBtn.addEventListener('click', resetPlayer);

    window.addEventListener('keydown', handleKey);
    setupTouchButtons();
    setupSwipe(canvas);

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

  function resetPlayer() {
    player.c = 0; player.r = 0;
    moves = 0;
    movesStat.textContent = "Moves: 0";
    started = false;
    stopTimer();
    updateTimerDisplay(0);
  }

  function regenerate() {
    stopTimer();
    started = false;
    updateTimerDisplay(0);
    moves = 0;
    movesStat.textContent = "Moves: 0";
    showSolution = false;
    solveBtn.classList.remove('active');
    generateMaze();
  }

  function startTimerIfNeeded() {
    if (!started) {
      started = true;
      startTime = performance.now();
      timerInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        updateTimerDisplay(elapsed);
      }, 100);
    }
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay(seconds) {
    timeStat.textContent = `Time: ${seconds.toFixed(1)}s`;
  }

  function handleKey(e) {
    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
    };
    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      movePlayer(dir);
    }
  }

  function setupTouchButtons() {
    document.querySelectorAll('.dpad').forEach(btn => {
      btn.addEventListener('click', () => movePlayer(btn.dataset.dir));
    });
  }

  // Simple swipe detection
  function setupSwipe(el) {
    let startX=0,startY=0,tracking=false;
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        tracking = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }, {passive:true});
    el.addEventListener('touchmove', ()=>{}, {passive:true});
    el.addEventListener('touchend', e => {
      if (!tracking) return;
      tracking = false;
      const endX = (e.changedTouches[0]||{}).clientX;
      const endY = (e.changedTouches[0]||{}).clientY;
      const dx = endX - startX;
      const dy = endY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if (Math.max(absX,absY) < 24) return; // threshold
      if (absX > absY) {
        movePlayer(dx>0 ? 'right' : 'left');
      } else {
        movePlayer(dy>0 ? 'down' : 'up');
      }
    });
  }

  function movePlayer(direction) {
    startTimerIfNeeded();
    const dirObj = {
      up: DIRS[0],
      right: DIRS[1],
      down: DIRS[2],
      left: DIRS[3]
    }[direction];

    if (!dirObj) return;
    const cell = maze[player.r][player.c];
    if (!cell.walls[dirObj.wall]) {
      player.c += dirObj.dc;
      player.r += dirObj.dr;
      moves++;
      movesStat.textContent = `Moves: ${moves}`;
      if (player.c === goal.c && player.r === goal.r) {
        stopTimer();
        flashGoal();
      }
    }
  }

  function flashGoal() {
    // Simple effect: pulse border
    let flashes = 0;
    const interval = setInterval(() => {
      flashes++;
      canvas.classList.toggle('won');
      if (flashes >= 8) {
        canvas.classList.remove('won');
        clearInterval(interval);
      }
    }, 130);
  }

  // Maze generation (Recursive Backtracker)
  function generateMaze() {
    maze = [];
    for (let r=0;r<rows;r++){
      maze[r]=[];
      for (let c=0;c<cols;c++){
        maze[r][c] = {
          c, r,
            // walls object: true means wall present
          walls: { top:true, right:true, bottom:true, left:true },
          visited:false
        };
      }
    }
    goal = { c: cols - 1, r: rows - 1 };
    player = { c: 0, r: 0 };

    const stack = [];
    let current = maze[0][0];
    current.visited = true;
    let visitedCount = 1;
    const total = cols * rows;

    while (visitedCount < total) {
      const neighbors = [];
      for (const d of DIRS) {
        const nc = current.c + d.dc;
        const nr = current.r + d.dr;
        if (nr>=0 && nr<rows && nc>=0 && nc<cols && !maze[nr][nc].visited) {
          neighbors.push({ cell: maze[nr][nc], dir: d });
        }
      }
      if (neighbors.length) {
        const pick = neighbors[Math.floor(Math.random()*neighbors.length)];
        // Remove walls
        current.walls[pick.dir.wall] = false;
        pick.cell.walls[pick.dir.opposite] = false;
        stack.push(current);
        current = pick.cell;
        current.visited = true;
        visitedCount++;
      } else if (stack.length) {
        current = stack.pop();
      }
    }

    // Clean visited marks
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) maze[r][c].visited = false;

    // Precompute solution path shortest (BFS)
    solutionPath = computeShortestPath();

    resizeCanvas();
  }

  // BFS for shortest path, returns array of {c,r}
  function computeShortestPath() {
    const queue = [];
    const visited = new Set();
    const startKey = '0,0';
    queue.push({ c:0, r:0, path:[{c:0,r:0}] });
    visited.add(startKey);

    while (queue.length) {
      const {c,r,path} = queue.shift();
      if (c === goal.c && r === goal.r) {
        return path;
      }
      const cell = maze[r][c];
      for (const d of DIRS) {
        if (!cell.walls[d.wall]) {
          const nc = c + d.dc;
          const nr = r + d.dr;
            if (nr>=0 && nr<rows && nc>=0 && nc<cols) {
            const key = `${nc},${nr}`;
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({ c:nc, r:nr, path: path.concat([{c:nc,r:nr}]) });
            }
          }
        }
      }
    }
    return [];
  }

  function resizeCanvas() {
    // Choose cell size to fit container
    const wrapper = document.getElementById('canvasWrapper');
    const maxW = Math.min(wrapper.clientWidth - 16, window.innerWidth - 32);
    const maxH = Math.min(window.innerHeight - 220, 800);
    // Find largest cellSize meeting both
    const sizeW = Math.floor(maxW / cols);
    const sizeH = Math.floor(maxH / rows);
    cellSize = Math.max(6, Math.min(sizeW, sizeH));
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.lineWidth = Math.max(2, cellSize * 0.18);
    ctx.lineCap = 'square';
    ctx.strokeStyle = '#36424f';
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Optional solution path
    if (showSolution && solutionPath.length) {
      const pathColor = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
      pathColor.addColorStop(0,'#ffcc4d');
      pathColor.addColorStop(1,'#ff7f50');
      ctx.lineWidth = Math.max(2, cellSize * 0.35);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const first = solutionPath[0];
      ctx.moveTo(first.c*cellSize + cellSize/2, first.r*cellSize + cellSize/2);
      for (let i=1;i<solutionPath.length;i++){
        const p = solutionPath[i];
        ctx.lineTo(p.c*cellSize + cellSize/2, p.r*cellSize + cellSize/2);
      }
      ctx.strokeStyle = pathColor;
      ctx.stroke();
    }

    // Draw cells walls
    ctx.strokeStyle = '#677383';
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        const x = c*cellSize;
        const y = r*cellSize;
        const cell = maze[r][c];
        ctx.beginPath();
        if (cell.walls.top) {
          ctx.moveTo(x,y); ctx.lineTo(x+cellSize,y);
        }
        if (cell.walls.right) {
          ctx.moveTo(x+cellSize,y); ctx.lineTo(x+cellSize,y+cellSize);
        }
        if (cell.walls.bottom) {
          ctx.moveTo(x,y+cellSize); ctx.lineTo(x+cellSize,y+cellSize);
        }
        if (cell.walls.left) {
          ctx.moveTo(x,y); ctx.lineTo(x,y+cellSize);
        }
        ctx.stroke();
      }
    }

    // Start cell highlight
    drawCellRect(0,0,'#203b28');
    // Goal cell highlight
    drawCellRect(goal.c, goal.r, '#40282a');
    // Goal pulse border
    drawGoalPulse();

    // Player
    drawPlayer();

    if (player.c === goal.c && player.r === goal.r) {
      drawWinOverlay();
    }
  }

  function drawCellRect(c,r,color) {
    const pad = 1;
    ctx.fillStyle = color;
    ctx.fillRect(c*cellSize+pad, r*cellSize+pad, cellSize-2*pad, cellSize-2*pad);
  }

  function drawPlayer() {
    const t = performance.now() / 400;
    const pulse = (Math.sin(t)+1)/2;
    const size = cellSize * (0.55 + 0.1*pulse);
    const x = player.c*cellSize + (cellSize - size)/2;
    const y = player.r*cellSize + (cellSize - size)/2;
    const gradient = ctx.createRadialGradient(
      x+size*0.5, y+size*0.5, size*0.1,
      x+size*0.5, y+size*0.5, size*0.7
    );
    gradient.addColorStop(0, '#4ac37d');
    gradient.addColorStop(1, '#1d5535');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x,y,size,size, Math.min(8,size*0.25)) :
      ctx.rect(x,y,size,size);
    ctx.fill();
    ctx.strokeStyle = '#72e6a5';
    ctx.lineWidth = Math.max(1, cellSize*0.06);
    ctx.stroke();
  }

  function drawGoalPulse() {
    const t = performance.now() / 500;
    const pulse = (Math.sin(t)+1)/2;
    const size = cellSize * (0.65 + 0.15*pulse);
    const x = goal.c*cellSize + (cellSize - size)/2;
    const y = goal.r*cellSize + (cellSize - size)/2;
    ctx.save();
    const g = ctx.createLinearGradient(x,y,x+size,y+size);
    g.addColorStop(0,'#ff5c64');
    g.addColorStop(1,'#ff9d57');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x,y,size,size, Math.min(10,size*0.3)) :
      ctx.rect(x,y,size,size);
    ctx.fill();
    ctx.restore();
  }

  function drawWinOverlay() {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = `${Math.max(20, cellSize*1.2)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe082';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('You Win!', canvas.width/2, canvas.height/2);
    ctx.font = `${Math.max(14, cellSize*0.6)}px system-ui, sans-serif`;
    ctx.fillStyle = '#e6e6e6';
    const elapsed = started ? (performance.now()-startTime)/1000 : 0;
    ctx.fillText(`Time: ${elapsed.toFixed(2)}s  Moves: ${moves}`, canvas.width/2, canvas.height/2 + cellSize*1.2);
    ctx.restore();
  }

  function loop() {
    draw();
    requestAnimationFrame(loop);
  }

  // Polyfill roundRect if needed
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
      if (typeof r === 'number') r = {tl:r,tr:r,br:r,bl:r};
      else {
        r = Object.assign({tl:0,tr:0,br:0,bl:0}, r);
      }
      this.beginPath();
      this.moveTo(x + r.tl, y);
      this.lineTo(x + w - r.tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
      this.lineTo(x + w, y + h - r.br);
      this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
      this.lineTo(x + r.bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
      this.lineTo(x, y + r.tl);
      this.quadraticCurveTo(x, y, x + r.tl, y);
      this.closePath();
      return this;
    };
  }

  // Start
  init();
})();
