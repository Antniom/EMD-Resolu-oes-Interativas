// Interactive 2D HTML5 Canvas Editor for Mecânica Aplicada (Applied Mechanics)

export class MecAplicadaEditor {
  constructor(canvasElement, onChange) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.onChange = onChange;

    // Subject/Problem State
    this.type = 'vibracoes'; // vibracoes, quatro_barras, biela_manivela, barra_deslizante, disco_rolante
    
    // Vibrations state model
    this.barLength = 2.0;
    this.barMass = 5.0;
    this.pivotX = 0.5;
    this.springs = [];
    this.dampers = [];
    this.masses = [];
    this.force = { x: 2.0, F0: 0.0, w: 0.0, type: 'sin' };
    
    // 4-Bar & Slider-Crank
    this.r1 = 0.1; this.r2 = 0.3; this.r3 = 0.3; this.r4 = 0.2;
    this.m1 = 0.5; this.m2 = 1.5; this.m4 = 1.0; this.mp = 0.82;
    this.w1 = 2.0;
    
    // Sliding Rod
    this.L = 2.0;
    this.theta = 60;
    this.w = 1.5;
    
    // Rolling Disk
    this.R = 0.4;
    this.vG = 2.0;
    this.aG = 1.0;
    this.rP = 0.4;
    this.thetaP = 45;

    // Animation state
    this.isAnimating = false;
    this.animationTime = 0;
    this.animationFrameId = null;
    
    this.solvedResult = null;
    this.hoveredItem = null;
    this.selectedItem = null;
    this.draggedItem = null;
    
    this.mousePos = { x: 0, y: 0 };
    this.gridSize = 120;
    this.origin = { x: 150, y: 250 };
    
    this.onSelect = null;
    this.initEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 600;
    this.canvas.height = rect.height || 450;
    
    if (this.type === 'vibracoes') {
      this.origin = { x: 120, y: 220 };
      this.gridSize = Math.min(180, (this.canvas.width - 200) / this.barLength);
    } else if (this.type === 'quatro_barras') {
      this.gridSize = 350;
      this.origin = {
        x: this.canvas.width / 2 - (this.r3 * this.gridSize) / 2,
        y: this.canvas.height / 2 + 100
      };
    } else if (this.type === 'biela_manivela') {
      this.gridSize = 400;
      this.origin = {
        x: this.canvas.width / 2 - 120,
        y: this.canvas.height / 2 + 50
      };
    } else if (this.type === 'barra_deslizante') {
      this.gridSize = 160;
      this.origin = { x: 150, y: 350 };
    } else { // disco_rolante
      this.gridSize = 350;
      this.origin = { x: this.canvas.width / 2 - 100, y: 280 };
    }
    
    this.draw();
  }

  setModel(state, solvedResult) {
    this.type = state.type || 'vibracoes';
    
    this.barLength = parseFloat(state.barLength) || 2.0;
    this.barMass = parseFloat(state.barMass) || 5.0;
    this.pivotX = parseFloat(state.pivotX) || 0.5;
    this.springs = state.springs || [];
    this.dampers = state.dampers || [];
    this.masses = state.masses || [];
    this.force = state.force || { x: 2.0, F0: 0.0, w: 0.0, type: 'sin' };
    
    this.r1 = parseFloat(state.r1) || 0.1;
    this.r2 = parseFloat(state.r2) || 0.3;
    this.r3 = parseFloat(state.r3) || 0.3;
    this.r4 = parseFloat(state.r4) || 0.2;
    this.m1 = parseFloat(state.m1) || 0.5;
    this.m2 = parseFloat(state.m2) || 1.5;
    this.m4 = parseFloat(state.m4) || 1.0;
    this.mp = parseFloat(state.mp) || 0.82;
    this.w1 = parseFloat(state.w1) || 2.0;

    this.L = parseFloat(state.L) || 2.0;
    this.theta = parseFloat(state.theta) || 60;
    this.w = parseFloat(state.w) || 1.5;

    this.R = parseFloat(state.R) || 0.4;
    this.vG = parseFloat(state.vG) || 2.0;
    this.aG = parseFloat(state.aG) || 1.0;
    this.rP = parseFloat(state.rP) || 0.4;
    this.thetaP = parseFloat(state.thetaP) || 45;
    
    this.solvedResult = solvedResult;
    this.resizeCanvas();
  }

  startAnimation() {
    this.isAnimating = true;
    this.animationTime = 0;
    if (!this.animationFrameId) {
      this.animate();
    }
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.draw();
  }

  animate() {
    if (!this.isAnimating) return;
    const fps = 60;
    this.animationTime += 1 / fps;
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  initEvents() {
    const handleMouseDown = (e) => {
      if (this.type !== 'vibracoes') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = this.checkHitTest(mx, my);
      if (hit) {
        this.selectedItem = hit;
        this.draggedItem = hit;
      } else {
        this.selectedItem = null;
      }
      this.draw();
    };

    const handleMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.mousePos = { x: mx, y: my };
      
      if (this.draggedItem) {
        const barX = (mx - this.origin.x) / this.gridSize;
        const boundedX = Math.max(0, Math.min(this.barLength, barX));
        
        if (this.draggedItem.type === 'pivot') {
          this.pivotX = parseFloat(boundedX.toFixed(2));
        } else if (this.draggedItem.type === 'spring') {
          const item = this.springs.find(s => s.id === this.draggedItem.id);
          if (item) item.x = parseFloat(boundedX.toFixed(2));
        } else if (this.draggedItem.type === 'damper') {
          const item = this.dampers.find(d => d.id === this.draggedItem.id);
          if (item) item.x = parseFloat(boundedX.toFixed(2));
        } else if (this.draggedItem.type === 'mass') {
          const item = this.masses.find(m => m.id === this.draggedItem.id);
          if (item) item.x = parseFloat(boundedX.toFixed(2));
        } else if (this.draggedItem.type === 'force') {
          this.force.x = parseFloat(boundedX.toFixed(2));
        }
        
        if (this.onChange) {
          this.onChange({
            pivotX: this.pivotX,
            springs: this.springs,
            dampers: this.dampers,
            masses: this.masses,
            force: this.force
          });
        }
      } else {
        const hit = this.checkHitTest(mx, my);
        if (hit) {
          this.hoveredItem = hit;
          this.canvas.style.cursor = 'pointer';
        } else {
          this.hoveredItem = null;
          this.canvas.style.cursor = 'default';
        }
      }
    };

    const handleMouseUp = () => {
      this.draggedItem = null;
      this.draw();
    };

    this.canvas.addEventListener('mousedown', handleMouseDown);
    this.canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  checkHitTest(mx, my) {
    if (this.type !== 'vibracoes') return null;
    const size = 18;
    const px = this.origin.x + this.pivotX * this.gridSize;
    const py = this.origin.y;
    if (mx >= px - size && mx <= px + size && my >= py && my <= py + size + 10) {
      return { type: 'pivot', id: 'main' };
    }
    return null;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
    
    if (this.type === 'vibracoes') {
      this.drawVibracoes();
    } else if (this.type === 'quatro_barras') {
      this.drawQuatroBarras();
    } else if (this.type === 'biela_manivela') {
      this.drawBielaManivela();
    } else if (this.type === 'barra_deslizante') {
      this.drawBarraDeslizante();
    } else if (this.type === 'disco_rolante') {
      this.drawDiscoRolante();
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = '#EAE8D4';
    this.ctx.lineWidth = 1;
    const spacing = 40;
    for (let x = 0; x < this.canvas.width; x += spacing) {
      this.ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += spacing) {
      this.ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
    }
  }

  drawVibracoes() {
    const ctx = this.ctx;
    let theta = 0;
    if (this.isAnimating && this.solvedResult && this.solvedResult.trajectory) {
      const traj = this.solvedResult.trajectory;
      const totalDuration = 8.0;
      const t = this.animationTime % totalDuration;
      const stepIdx = Math.floor((t / totalDuration) * traj.length) % traj.length;
      theta = traj[stepIdx].theta;
    }

    ctx.save();
    ctx.strokeStyle = '#8f8f8f'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.origin.x - 30, this.origin.y + 60);
    ctx.lineTo(this.origin.x + this.barLength * this.gridSize + 30, this.origin.y + 60);
    ctx.stroke();
    
    const px = this.origin.x + this.pivotX * this.gridSize;
    const py = this.origin.y;
    this.drawSupport(px, py, this.isItemActive('pivot', 'main'));

    ctx.translate(px, py);
    ctx.rotate(theta);
    
    const barLeft = -this.pivotX * this.gridSize;
    ctx.fillStyle = '#C05B42'; ctx.strokeStyle = '#191919'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(barLeft, -8, this.barLength * this.gridSize, 16, 4); ctx.fill(); ctx.stroke();
    
    const G_x = (this.barLength / 2 - this.pivotX) * this.gridSize;
    ctx.fillStyle = '#191919'; ctx.beginPath(); ctx.arc(G_x, 0, 5, 0, 2*Math.PI); ctx.fill();

    this.masses.forEach(m => {
      const mx = (m.x - this.pivotX) * this.gridSize;
      ctx.fillStyle = '#191919'; ctx.strokeStyle = '#191919'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(mx - 12, -24, 24, 16); ctx.fill(); ctx.stroke();
    });

    this.springs.forEach(s => {
      const sx = (s.x - this.pivotX) * this.gridSize;
      ctx.save(); ctx.translate(sx, 8); this.drawSpring(0, 0, 48, 'none'); ctx.restore();
    });

    this.dampers.forEach(d => {
      const dx = (d.x - this.pivotX) * this.gridSize;
      ctx.save(); ctx.translate(dx, 8); this.drawDamper(0, 0, 48, 'none'); ctx.restore();
    });

    if (this.force.F0 > 0) {
      const fx = (this.force.x - this.pivotX) * this.gridSize;
      let f_scale = this.isAnimating ? Math.sin(this.force.w * this.animationTime) : 1.0;
      const arrowLength = 50 * f_scale;
      if (Math.abs(arrowLength) > 5) {
        this.drawArrow(fx, -10, fx, -10 - arrowLength, '#2D6A4F', 3);
      }
    }

    ctx.restore();
    
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#191919'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
  }

  drawQuatroBarras() {
    const ctx = this.ctx;
    let t1 = 45 * Math.PI / 180;
    if (this.isAnimating) {
      t1 = this.animationTime * this.w1;
    } else if (this.solvedResult && this.solvedResult.results) {
      t1 = this.solvedResult.results.t1;
    }

    const O_x = this.origin.x;
    const O_y = this.origin.y;
    const xA = O_x + this.r1 * Math.cos(t1) * this.gridSize;
    const yA = O_y - this.r1 * Math.sin(t1) * this.gridSize;
    const xD = O_x + this.r3 * this.gridSize;
    const yD = O_y;
    
    const d = Math.sqrt(Math.pow(xD - xA, 2) + Math.pow(yD - yA, 2));
    if (d > this.r2 + this.r4 || d < Math.abs(this.r2 - this.r4)) {
      this.drawLockedState(O_x, O_y, xD, yD, xA, yA);
      return;
    }
    
    const t2 = this.solvedResult && this.solvedResult.results ? this.solvedResult.results.t2 : 0;
    const xB = xA + this.r2 * Math.cos(t2) * this.gridSize;
    const yB = yA - this.r2 * Math.sin(t2) * this.gridSize;
    const t4 = this.solvedResult && this.solvedResult.results ? this.solvedResult.results.t4 : 0;

    // Draw CIR lines & dot
    if (this.solvedResult && this.solvedResult.results && this.solvedResult.results.CIR) {
      const cir_model = this.solvedResult.results.CIR;
      const cir_x = O_x + cir_model.x * this.gridSize;
      const cir_y = O_y - cir_model.y * this.gridSize;

      ctx.strokeStyle = '#BC4749'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(O_x, O_y); ctx.lineTo(cir_x, cir_y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xD, yD); ctx.lineTo(cir_x, cir_y); ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#BC4749'; ctx.beginPath(); ctx.arc(cir_x, cir_y, 6, 0, 2*Math.PI); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = 'bold 10px Inter'; ctx.fillText('C.I.R.', cir_x + 8, cir_y - 4);
    }

    this.drawSupport(O_x, O_y, 'none');
    this.drawSupport(xD, yD, 'none');

    ctx.strokeStyle = '#191919';
    ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(O_x, O_y); ctx.lineTo(xA, yA); ctx.stroke();

    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke();

    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(xD, yD); ctx.lineTo(xB, yB); ctx.stroke();

    ctx.fillStyle = '#ffffff'; ctx.lineWidth = 3;
    [[O_x, O_y], [xA, yA], [xB, yB], [xD, yD]].forEach(pin => {
      ctx.beginPath(); ctx.arc(pin[0], pin[1], 5, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
    });

    // Draw Velocity vectors (Green)
    if (this.solvedResult && this.solvedResult.results) {
      const r = this.solvedResult.results;
      const vAx = -this.w1 * this.r1 * Math.sin(t1) * this.gridSize;
      const vAy = -this.w1 * this.r1 * Math.cos(t1) * this.gridSize;
      this.drawArrow(xA, yA, xA + vAx * 0.1, yA + vAy * 0.1, '#2D6A4F', 2.5);

      const vBx = -r.w4 * this.r4 * Math.sin(t4) * this.gridSize;
      const vBy = -r.w4 * this.r4 * Math.cos(t4) * this.gridSize;
      this.drawArrow(xB, yB, xB + vBx * 0.1, yB + vBy * 0.1, '#2D6A4F', 2.5);
    }
  }

  drawBielaManivela() {
    const ctx = this.ctx;
    let t1 = 90 * Math.PI / 180;
    if (this.isAnimating) {
      t1 = this.animationTime * this.w1;
    } else if (this.solvedResult && this.solvedResult.results) {
      t1 = this.solvedResult.results.t1;
    }

    const O_x = this.origin.x;
    const O_y = this.origin.y;
    const xA = O_x + this.r1 * Math.cos(t1) * this.gridSize;
    const yA = O_y - this.r1 * Math.sin(t1) * this.gridSize;
    
    const sin_t2 = -(this.r1 * Math.sin(t1)) / this.r2;
    if (Math.abs(sin_t2) > 1.0) return;
    
    const t2 = Math.asin(sin_t2);
    const xB = xA + this.r2 * Math.cos(t2) * this.gridSize;
    const yB = O_y;

    // Track sleeve
    ctx.strokeStyle = '#E0DEC8'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(O_x - 50, O_y - 20); ctx.lineTo(O_x + (this.r1+this.r2)*this.gridSize + 80, O_y - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(O_x - 50, O_y + 20); ctx.lineTo(O_x + (this.r1+this.r2)*this.gridSize + 80, O_y + 20); ctx.stroke();
    ctx.setLineDash([]);

    // CIR
    if (this.solvedResult && this.solvedResult.results && this.solvedResult.results.CIR) {
      const cir_model = this.solvedResult.results.CIR;
      const cir_x = O_x + cir_model.x * this.gridSize;
      const cir_y = O_y - cir_model.y * this.gridSize;

      ctx.strokeStyle = '#BC4749'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(O_x, O_y); ctx.lineTo(cir_x, cir_y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xB, yB); ctx.lineTo(cir_x, cir_y); ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#BC4749'; ctx.beginPath(); ctx.arc(cir_x, cir_y, 6, 0, 2*Math.PI); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    this.drawSupport(O_x, O_y, 'none');

    ctx.strokeStyle = '#191919';
    ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(O_x, O_y); ctx.lineTo(xA, yA); ctx.stroke();

    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke();

    ctx.fillStyle = '#FAFAFA'; ctx.strokeStyle = '#191919'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(xB - 24, yB - 14, 48, 28, 4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ffffff'; ctx.lineWidth = 3;
    [[O_x, O_y], [xA, yA], [xB, yB]].forEach(pin => {
      ctx.beginPath(); ctx.arc(pin[0], pin[1], 5, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
    });

    if (this.solvedResult && this.solvedResult.results) {
      const r = this.solvedResult.results;
      const vAx = -this.w1 * this.r1 * Math.sin(t1) * this.gridSize;
      const vAy = -this.w1 * this.r1 * Math.cos(t1) * this.gridSize;
      this.drawArrow(xA, yA, xA + vAx * 0.1, yA + vAy * 0.1, '#2D6A4F', 2.5);

      const vBx = r.vB * this.gridSize;
      if (Math.abs(vBx) > 5) {
        this.drawArrow(xB, yB, xB + vBx * 0.1, yB, '#2D6A4F', 2.5);
      }
    }
  }

  // Draw Sliding Rod (Barra Deslizante)
  drawBarraDeslizante() {
    const ctx = this.ctx;
    let t = this.theta * Math.PI / 180;
    
    if (this.isAnimating) {
      // Loop angle from 85 deg down to 5 deg and back
      const cycle = (this.animationTime * 0.5) % 2.0; // 4 seconds full back-forth
      const progress = cycle > 1.0 ? 2.0 - cycle : cycle;
      t = (85 - progress * 80) * Math.PI / 180;
    } else if (this.solvedResult && this.solvedResult.results) {
      t = this.solvedResult.results.theta * Math.PI / 180;
    }

    const O_x = this.origin.x;
    const O_y = this.origin.y;

    const xA = O_x + this.L * Math.cos(t) * this.gridSize;
    const yA = O_y;
    const xB = O_x;
    const yB = O_y - this.L * Math.sin(t) * this.gridSize;

    // Draw Wall & Floor guides
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(O_x, O_y - this.L * this.gridSize - 40);
    ctx.lineTo(O_x, O_y);
    ctx.lineTo(O_x + this.L * this.gridSize + 40, O_y);
    ctx.stroke();

    // Floor hatching lines
    ctx.strokeStyle = '#E0DEC8'; ctx.lineWidth = 1;
    for (let i = 0; i < this.L * this.gridSize + 40; i += 15) {
      ctx.beginPath(); ctx.moveTo(O_x + i, O_y); ctx.lineTo(O_x + i - 8, O_y + 8); ctx.stroke();
    }
    // Wall hatching lines
    for (let i = 0; i < this.L * this.gridSize + 40; i += 15) {
      ctx.beginPath(); ctx.moveTo(O_x, O_y - i); ctx.lineTo(O_x - 8, O_y - i - 8); ctx.stroke();
    }

    // Space Centrode Arc (Dashed circle quadrant)
    ctx.strokeStyle = 'rgba(188, 71, 73, 0.2)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(O_x, O_y, this.L * this.gridSize, -Math.PI/2, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw CIR projections
    const cir_x = xA;
    const cir_y = yB;
    ctx.strokeStyle = '#BC4749'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(cir_x, cir_y); ctx.stroke(); // vertical from A
    ctx.beginPath(); ctx.moveTo(xB, yB); ctx.lineTo(cir_x, cir_y); ctx.stroke(); // horizontal from B
    ctx.setLineDash([]);

    // Draw CIR Dot
    ctx.fillStyle = '#BC4749'; ctx.beginPath(); ctx.arc(cir_x, cir_y, 6, 0, 2*Math.PI); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 10px Inter'; ctx.fillText('C.I.R.', cir_x + 8, cir_y - 4);

    // Draw Rod AB
    ctx.strokeStyle = '#191919'; ctx.fillStyle = '#D96C53'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke();

    // Center of Mass G
    const xG = (xA + xB) / 2;
    const yG = (yA + yB) / 2;
    ctx.fillStyle = '#191919'; ctx.beginPath(); ctx.arc(xG, yG, 4, 0, 2*Math.PI); ctx.fill();
    ctx.font = '9px Inter'; ctx.fillText('G', xG + 6, yG - 4);

    // Draw Sliders A and B
    ctx.fillStyle = '#FAFAFA'; ctx.strokeStyle = '#191919'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(xA - 12, yA - 6, 24, 12, 2); ctx.fill(); ctx.stroke(); // A slider
    ctx.beginPath(); ctx.roundRect(xB - 6, yB - 12, 12, 24, 2); ctx.fill(); ctx.stroke(); // B slider

    // Linear Velocity Vectors (Green)
    const w_val = this.w;
    const vA_scaled = -this.L * w_val * Math.sin(t) * this.gridSize * 0.15;
    const vB_scaled = this.L * w_val * Math.cos(t) * this.gridSize * 0.15;

    if (Math.abs(vA_scaled) > 3) {
      this.drawArrow(xA, yA, xA + vA_scaled, yA, '#2D6A4F', 2.5);
      ctx.fillStyle = '#2D6A4F'; ctx.fillText('v_A', xA + vA_scaled + (vA_scaled > 0 ? 5 : -20), yA - 8);
    }
    if (Math.abs(vB_scaled) > 3) {
      this.drawArrow(xB, yB, xB, yB - vB_scaled, '#2D6A4F', 2.5); // note yB is inverted in canvas, so positive velocity goes UP (negative canvas Y)
      ctx.fillStyle = '#2D6A4F'; ctx.fillText('v_B', xB + 10, yB - vB_scaled);
    }

    ctx.fillStyle = '#191919';
    ctx.font = 'bold 12px Inter';
    ctx.fillText(`Barra Deslizante: L = ${this.L}m, \\theta = ${Math.round(t * 180 / Math.PI)}°`, 16, 24);
    ctx.fillText(`Velocidade Angular \\omega = ${this.w} rad/s`, 16, 42);
  }

  // Draw Rolling Disk (Disco Rolante)
  drawDiscoRolante() {
    const ctx = this.ctx;
    const R_px = this.R * this.gridSize;

    // Ground position
    const groundY = this.origin.y;
    
    // Horizontal center displacement during animation
    let dx = 0;
    if (this.isAnimating) {
      const cycle = this.animationTime % 4.0;
      dx = (cycle / 4.0) * (this.canvas.width - 250) - 100;
    }
    const center_cx = this.origin.x + dx + 150;
    const center_cy = groundY - R_px;

    // Contact point (CIR)
    const CIR_cx = center_cx;
    const CIR_cy = groundY;

    // Draw Ground Support
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(this.canvas.width, groundY); ctx.stroke();
    ctx.strokeStyle = '#E0DEC8'; ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width; i += 15) {
      ctx.beginPath(); ctx.moveTo(i, groundY); ctx.lineTo(i - 8, groundY + 8); ctx.stroke();
    }

    // Draw Circle Wheel
    ctx.strokeStyle = '#191919'; ctx.fillStyle = '#F5F3E7'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(center_cx, center_cy, R_px, 0, 2*Math.PI); ctx.fill(); ctx.stroke();

    // Spokes to visualize rotation
    let rot = 0;
    if (this.isAnimating) {
      rot = (dx / R_px); // dx = theta * R => theta = dx / R
    } else if (this.solvedResult && this.solvedResult.results) {
      rot = 0; // static
    }
    
    ctx.strokeStyle = 'rgba(25, 25, 25, 0.2)'; ctx.lineWidth = 1.5;
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(center_cx, center_cy);
      ctx.lineTo(center_cx + R_px * Math.cos(angle + rot), center_cy + R_px * Math.sin(angle + rot));
      ctx.stroke();
    }

    // Center point G
    ctx.fillStyle = '#191919'; ctx.beginPath(); ctx.arc(center_cx, center_cy, 5, 0, 2*Math.PI); ctx.fill();
    ctx.font = 'bold 9px Inter'; ctx.fillText('G', center_cx - 3, center_cy - 9);

    // Contact point C (CIR)
    ctx.fillStyle = '#BC4749'; ctx.beginPath(); ctx.arc(CIR_cx, CIR_cy, 6, 0, 2*Math.PI); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 10px Inter'; ctx.fillText('C.I.R.', CIR_cx + 8, CIR_cy - 4);

    // Selected Point P
    const tP = this.thetaP * Math.PI / 180 + rot;
    const rP_px = this.rP * this.gridSize;
    const P_cx = center_cx + rP_px * Math.cos(tP);
    const P_cy = center_cy - rP_px * Math.sin(tP); // canvas Y inverts model Y

    ctx.fillStyle = '#D96C53'; ctx.beginPath(); ctx.arc(P_cx, P_cy, 5, 0, 2*Math.PI); ctx.fill();
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 10px Inter'; ctx.fillText('P', P_cx + 8, P_cy - 4);

    // Line CP (connecting CIR and P)
    ctx.strokeStyle = 'rgba(188, 71, 73, 0.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(CIR_cx, CIR_cy); ctx.lineTo(P_cx, P_cy); ctx.stroke();
    ctx.setLineDash([]);

    // Velocity Vector of P (perpendicular to CP)
    const w_val = this.vG / this.R;
    const vPx = this.vG - w_val * this.rP * Math.sin(tP - rot); // relative to rotation
    const vPy = w_val * this.rP * Math.cos(tP - rot);
    
    // Scale velocity vectors for display
    const arrowScale = 0.15 * this.gridSize / 2.0;
    const vG_scaled = this.vG * arrowScale;
    this.drawArrow(center_cx, center_cy, center_cx + vG_scaled, center_cy, '#2D6A4F', 2.5); // Center velocity
    ctx.fillStyle = '#2D6A4F'; ctx.fillText('v_G', center_cx + vG_scaled + 5, center_cy - 5);

    // Velocity vector at P
    const dist_CP = Math.sqrt(Math.pow(P_cx - CIR_cx, 2) + Math.pow(P_cy - CIR_cy, 2)) / this.gridSize;
    const vP_mag = w_val * dist_CP;
    
    // The velocity of P is perpendicular to CP, pointing in direction of rotation
    const angle_CP = Math.atan2(P_cy - CIR_cy, P_cx - CIR_cx);
    const vP_angle = angle_CP + Math.PI / 2;
    const vPx_draw = vP_mag * Math.cos(vP_angle) * arrowScale;
    const vPy_draw = vP_mag * Math.sin(vP_angle) * arrowScale;
    
    if (vP_mag > 0.05) {
      this.drawArrow(P_cx, P_cy, P_cx + vPx_draw, P_cy + vPy_draw, '#2D6A4F', 2.5);
      ctx.fillStyle = '#2D6A4F'; ctx.fillText('v_P', P_cx + vPx_draw + 5, P_cy + vPy_draw - 5);
    }

    ctx.fillStyle = '#191919';
    ctx.font = 'bold 12px Inter';
    ctx.fillText(`Disco Rolante: R = ${this.R}m, Massa = ${this.solvedResult?.results.m || 10}kg`, 16, 24);
    ctx.fillText(`Velocidade Centro vG = ${this.vG} m/s`, 16, 42);
  }

  isItemActive(type, id) {
    if (this.selectedItem && this.selectedItem.type === type && this.selectedItem.id === id) return 'selected';
    if (this.hoveredItem && this.hoveredItem.type === type && this.hoveredItem.id === id) return 'hovered';
    return 'none';
  }

  drawSpring(x, y, h, activeState) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = activeState === 'selected' ? '#D96C53' : (activeState === 'hovered' ? '#c45b42' : '#191919');
    ctx.lineWidth = activeState !== 'none' ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 8);
    const coils = 6;
    const coilH = (h - 16) / coils;
    const w = 12;
    for (let i = 0; i < coils; i++) {
      const cy = 8 + i * coilH;
      ctx.lineTo(w, cy + coilH * 0.25); ctx.lineTo(-w, cy + coilH * 0.75);
    }
    ctx.lineTo(0, h - 8); ctx.lineTo(0, h); ctx.stroke();
    ctx.fillStyle = '#8f8f8f'; ctx.fillRect(-10, h, 20, 3);
    ctx.restore();
  }

  drawDamper(x, y, h, activeState) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = activeState === 'selected' ? '#D96C53' : (activeState === 'hovered' ? '#c45b42' : '#191919');
    ctx.lineWidth = activeState !== 'none' ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.moveTo(-10, 16); ctx.lineTo(10, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-12, 40); ctx.lineTo(12, 40); ctx.lineTo(12, 12);
    ctx.moveTo(0, 40); ctx.lineTo(0, h); ctx.stroke();
    ctx.fillStyle = '#8f8f8f'; ctx.fillRect(-10, h, 20, 3);
    ctx.restore();
  }

  drawSupport(x, y, activeState) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = activeState === 'selected' ? 'rgba(217,108,83,0.2)' : (activeState === 'hovered' ? 'rgba(196,91,66,0.1)' : '#EBEBE2');
    ctx.strokeStyle = activeState !== 'none' ? '#D96C53' : '#191919';
    ctx.lineWidth = activeState !== 'none' ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 16, y + 25); ctx.lineTo(x + 16, y + 25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 22, y + 26); ctx.lineTo(x + 22, y + 26); ctx.stroke();
    ctx.restore();
  }

  drawArrow(fromX, fromY, toX, toY, color, width) {
    const ctx = this.ctx;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLen = 8;
    ctx.beginPath(); ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI/6), toY - headLen * Math.sin(angle - Math.PI/6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI/6), toY - headLen * Math.sin(angle + Math.PI/6));
    ctx.closePath(); ctx.fill();
  }

  drawLockedState(O_x, O_y, xD, yD, xA, yA) {
    const ctx = this.ctx;
    this.drawSupport(O_x, O_y, 'none');
    this.drawSupport(xD, yD, 'none');
    ctx.strokeStyle = '#BC4749'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(O_x, O_y); ctx.lineTo(xD, yD); ctx.stroke();
    ctx.fillStyle = '#BC4749'; ctx.font = 'bold 14px Inter';
    ctx.fillText('CRITÉRIO DE MONTAGEM VIOLADO (TRAVADO)', this.canvas.width / 2 - 150, 40);
  }
}
