// Interactive 2D HTML5 Canvas Editor for Mecânica Aplicada (Applied Mechanics)

export class MecAplicadaEditor {
  constructor(canvasElement, onChange) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.onChange = onChange;

    // Subject/Problem State
    this.type = 'vibracoes'; // vibracoes, quatro_barras
    
    // Vibrations state model
    this.barLength = 2.0;
    this.barMass = 5.0;
    this.pivotX = 0.5;
    this.springs = [];
    this.dampers = [];
    this.masses = [];
    this.force = { x: 2.0, F0: 0.0, w: 0.0, type: 'sin' };
    
    // 4-Bar state model
    this.r1 = 0.1;
    this.r2 = 0.3;
    this.r3 = 0.3;
    this.r4 = 0.2;
    this.w1 = 2.0;
    
    // Animation state
    this.isAnimating = false;
    this.animationTime = 0;
    this.animationFrameId = null;
    
    // Simulation outputs (from solver)
    this.solvedResult = null;
    
    // Drag & Drop / Selection UI state
    this.hoveredItem = null; // { type: 'pivot'|'spring'|'damper'|'mass'|'force', id: ... }
    this.selectedItem = null; // same format
    this.draggedItem = null;
    
    this.mousePos = { x: 0, y: 0 };
    this.gridSize = 120; // 120 pixels = 1 meter
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
    this.origin = {
      x: this.type === 'vibracoes' ? 100 : this.canvas.width / 2 - (this.r3 * this.gridSize) / 2,
      y: this.canvas.height / 2 + 50
    };
    this.draw();
  }

  // Setup state from Module
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
    this.w1 = parseFloat(state.w1) || 2.0;
    
    this.solvedResult = solvedResult;
    
    // Fit origin coordinates based on mode
    if (this.type === 'vibracoes') {
      this.origin = { x: 120, y: 220 };
      // Dynamically adjust scale
      this.gridSize = Math.min(180, (this.canvas.width - 200) / this.barLength);
    } else {
      this.gridSize = 350; // default large scale for linkages
      this.origin = {
        x: this.canvas.width / 2 - (this.r3 * this.gridSize) / 2,
        y: this.canvas.height / 2 + 100
      };
    }
    
    this.draw();
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
    
    // Increment time
    const fps = 60;
    this.animationTime += 1 / fps;
    
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  initEvents() {
    const handleMouseDown = (e) => {
      if (this.type !== 'vibracoes') return; // only drag vibrations items
      
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      const hit = this.checkHitTest(mx, my);
      if (hit) {
        this.selectedItem = hit;
        this.draggedItem = hit;
        if (this.onSelect) this.onSelect(hit.type, hit.id);
      } else {
        this.selectedItem = null;
        if (this.onSelect) this.onSelect(null, null);
      }
      this.draw();
    };

    const handleMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.mousePos = { x: mx, y: my };
      
      if (this.draggedItem) {
        // Drag item along the bar
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
        // Hover test
        const hit = this.checkHitTest(mx, my);
        if (hit) {
          if (!this.hoveredItem || this.hoveredItem.type !== hit.type || this.hoveredItem.id !== hit.id) {
            this.hoveredItem = hit;
            this.canvas.style.cursor = 'pointer';
            this.draw();
          }
        } else {
          if (this.hoveredItem) {
            this.hoveredItem = null;
            this.canvas.style.cursor = 'default';
            this.draw();
          }
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

  // Hit test checks mouse collision with components on the bar
  checkHitTest(mx, my) {
    if (this.type !== 'vibracoes') return null;
    
    const size = 18;
    // Pivot hit test
    const px = this.origin.x + this.pivotX * this.gridSize;
    const py = this.origin.y;
    if (mx >= px - size && mx <= px + size && my >= py && my <= py + size + 10) {
      return { type: 'pivot', id: 'main' };
    }
    
    // Force arrow hit test
    const fx = this.origin.x + this.force.x * this.gridSize;
    const fy = this.origin.y;
    if (Math.abs(mx - fx) < size && my >= fy - 60 && my <= fy) {
      return { type: 'force', id: 'main' };
    }
    
    // Springs hit test
    for (let s of this.springs) {
      const sx = this.origin.x + s.x * this.gridSize;
      const sy = this.origin.y;
      if (Math.abs(mx - sx) < size && my >= sy && my <= sy + 80) {
        return { type: 'spring', id: s.id };
      }
    }
    
    // Dampers hit test
    for (let d of this.dampers) {
      const dx = this.origin.x + d.x * this.gridSize;
      const dy = this.origin.y;
      if (Math.abs(mx - dx) < size && my >= dy && my <= dy + 80) {
        return { type: 'damper', id: d.id };
      }
    }
    
    // Point masses hit test
    for (let m of this.masses) {
      const mx_pos = this.origin.x + m.x * this.gridSize;
      const my_pos = this.origin.y - 12;
      if (mx >= mx_pos - 15 && mx <= mx_pos + 15 && my >= my_pos - 15 && my <= my_pos + 15) {
        return { type: 'mass', id: m.id };
      }
    }
    
    return null;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background grid
    this.drawGrid();
    
    if (this.type === 'vibracoes') {
      this.drawVibracoes();
    } else {
      this.drawQuatroBarras();
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = '#EAE8D4';
    this.ctx.lineWidth = 1;
    const spacing = 40;
    
    for (let x = 0; x < this.canvas.width; x += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  // Draw 1-DOF Vibrations System
  drawVibracoes() {
    const ctx = this.ctx;
    
    // Get current angular displacement
    let theta = 0;
    if (this.isAnimating && this.solvedResult && this.solvedResult.trajectory) {
      const traj = this.solvedResult.trajectory;
      // loop animation time
      const totalDuration = 8.0;
      const t = this.animationTime % totalDuration;
      const stepIdx = Math.floor((t / totalDuration) * traj.length) % traj.length;
      theta = traj[stepIdx].theta; // radians
    }

    ctx.save();
    
    // Draw Ground Line
    ctx.strokeStyle = '#8f8f8f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.origin.x - 30, this.origin.y + 60);
    ctx.lineTo(this.origin.x + this.barLength * this.gridSize + 30, this.origin.y + 60);
    ctx.stroke();
    
    // Draw Pivot Support O (Fixed in translation)
    const px = this.origin.x + this.pivotX * this.gridSize;
    const py = this.origin.y;
    this.drawSupport(px, py, this.isItemActive('pivot', 'main'));

    // Move drawing origin to Pivot O and rotate to draw the bar
    ctx.translate(px, py);
    ctx.rotate(theta);
    
    // Draw rigid bar (homogeneous)
    // Left end is at -pivotX, right end is at barLength - pivotX
    const barLeft = -this.pivotX * this.gridSize;
    const barRight = (this.barLength - this.pivotX) * this.gridSize;
    
    ctx.fillStyle = '#C05B42'; // Premium Burnt Orange for bar
    ctx.strokeStyle = '#191919';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(barLeft, -8, this.barLength * this.gridSize, 16, 4);
    ctx.fill();
    ctx.stroke();
    
    // Draw bar center of mass point
    const G_x = (this.barLength / 2 - this.pivotX) * this.gridSize;
    ctx.fillStyle = '#191919';
    ctx.beginPath();
    ctx.arc(G_x, 0, 5, 0, 2*Math.PI);
    ctx.fill();
    ctx.fillStyle = '#565656';
    ctx.font = '10px Inter';
    ctx.fillText('G', G_x - 3, -12);

    // Draw added point masses
    this.masses.forEach(m => {
      const mx = (m.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('mass', m.id);
      ctx.fillStyle = isActive ? '#D96C53' : '#191919';
      ctx.strokeStyle = '#191919';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(mx - 12, -24, 24, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px Inter';
      ctx.fillText(`${m.m}kg`, mx - 10, -13);
    });

    // Draw springs attached to the rotating bar
    this.springs.forEach(s => {
      const sx = (s.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('spring', s.id);
      
      // Calculate spring rotation tilt (small angle deflection)
      // Top connection rotates with the bar. Bottom connection stays flat on ground.
      // So we draw relative to bar coordinates
      ctx.save();
      ctx.translate(sx, 8);
      // We are at the bar, pointing down. The ground is at y = 60 (rotated back)
      // For visual simplicity, draw vertical spring in rotated bar coords
      this.drawSpring(0, 0, 48, isActive);
      ctx.restore();
    });

    // Draw dampers
    this.dampers.forEach(d => {
      const dx = (d.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('damper', d.id);
      ctx.save();
      ctx.translate(dx, 8);
      this.drawDamper(0, 0, 48, isActive);
      ctx.restore();
    });

    // Draw Force Vector F(t)
    if (this.force.F0 > 0) {
      const fx = (this.force.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('force', 'main');
      
      // Harmonic force magnitude changes with time
      let f_scale = 1.0;
      if (this.isAnimating) {
        f_scale = Math.sin(this.force.w * this.animationTime);
      }
      
      const arrowLength = 50 * f_scale;
      if (Math.abs(arrowLength) > 5) {
        this.drawArrow(fx, -10, fx, -10 - arrowLength, isActive ? '#D96C53' : '#2D6A4F', 3);
        ctx.fillStyle = '#191919';
        ctx.font = '10px Inter';
        ctx.fillText('F(t)', fx + 6, -10 - arrowLength/2);
      }
    }

    ctx.restore();
    
    // Draw Pivot Point pin O on top of everything
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#191919';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, 2*Math.PI);
    ctx.fill();
    ctx.stroke();

    // Text labels overlay
    ctx.fillStyle = '#191919';
    ctx.font = 'bold 12px Inter';
    ctx.fillText(`Apoio O: x = ${this.pivotX}m`, 16, 24);
    ctx.fillText(`Massa Barra: ${this.barMass}kg, Comprimento: ${this.barLength}m`, 16, 42);
    
    if (this.isAnimating && this.solvedResult && this.solvedResult.results) {
      const r = this.solvedResult.results;
      ctx.fillText(`Frequência Natural: ${r.f_n.toFixed(2)} Hz`, 16, this.canvas.height - 40);
      ctx.fillText(`Amortecimento: ${r.dampingType} (\\zeta = ${r.zeta.toFixed(3)})`, 16, this.canvas.height - 20);
    }
  }

  isItemActive(type, id) {
    if (this.selectedItem && this.selectedItem.type === type && this.selectedItem.id === id) return 'selected';
    if (this.hoveredItem && this.hoveredItem.type === type && this.hoveredItem.id === id) return 'hovered';
    return 'none';
  }

  drawSpring(x, y, h, activeState) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    
    ctx.strokeStyle = activeState === 'selected' ? '#D96C53' : (activeState === 'hovered' ? '#c45b42' : '#191919');
    ctx.lineWidth = activeState !== 'none' ? 3 : 2;
    
    // Spring vertical rod parts and coils
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 8);
    
    const coils = 6;
    const coilH = (h - 16) / coils;
    const w = 12;
    for (let i = 0; i < coils; i++) {
      const cy = 8 + i * coilH;
      ctx.lineTo(w, cy + coilH * 0.25);
      ctx.lineTo(-w, cy + coilH * 0.75);
    }
    
    ctx.lineTo(0, h - 8);
    ctx.lineTo(0, h);
    ctx.stroke();
    
    // Ground cap at bottom
    ctx.fillStyle = '#8f8f8f';
    ctx.fillRect(-10, h, 20, 3);
    
    ctx.restore();
  }

  drawDamper(x, y, h, activeState) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    
    ctx.strokeStyle = activeState === 'selected' ? '#D96C53' : (activeState === 'hovered' ? '#c45b42' : '#191919');
    ctx.lineWidth = activeState !== 'none' ? 3 : 2;
    
    // Top piston rod
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 16);
    // Piston head
    ctx.moveTo(-10, 16);
    ctx.lineTo(10, 16);
    ctx.stroke();
    
    // Bottom Cylinder casing
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.lineTo(-12, 40);
    ctx.lineTo(12, 40);
    ctx.lineTo(12, 12);
    
    ctx.moveTo(0, 40);
    ctx.lineTo(0, h);
    ctx.stroke();
    
    // Ground cap
    ctx.fillStyle = '#8f8f8f';
    ctx.fillRect(-10, h, 20, 3);
    
    ctx.restore();
  }

  drawSupport(x, y, activeState) {
    const ctx = this.ctx;
    ctx.save();
    
    ctx.fillStyle = activeState === 'selected' ? 'rgba(217,108,83,0.2)' : (activeState === 'hovered' ? 'rgba(196,91,66,0.1)' : '#EBEBE2');
    ctx.strokeStyle = activeState !== 'none' ? '#D96C53' : '#191919';
    ctx.lineWidth = activeState !== 'none' ? 3 : 2;
    
    // Triangle support pivot
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 16, y + 25);
    ctx.lineTo(x + 16, y + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Hatch lines under ground base
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 26);
    ctx.lineTo(x + 22, y + 26);
    ctx.stroke();
    
    ctx.restore();
  }

  drawArrow(fromX, fromY, toX, toY, color, width) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    
    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Arrow head
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLen = 8;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI/6), toY - headLen * Math.sin(angle - Math.PI/6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI/6), toY - headLen * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
  }

  // Draw 4-Bar Planar Mechanism
  drawQuatroBarras() {
    const ctx = this.ctx;
    
    // Determine current crank angle theta1
    let t1 = (activeTheta1Deg || 45) * Math.PI / 180;
    if (this.isAnimating) {
      t1 = this.animationTime * this.w1;
    }
    
    // Solve kinematics at t1
    // Ground hinges: O=(0,0), D=(r3,0)
    const O_x = this.origin.x;
    const O_y = this.origin.y;
    
    const xA = O_x + this.r1 * Math.cos(t1) * this.gridSize;
    const yA = O_y - this.r1 * Math.sin(t1) * this.gridSize; // Y axis points down in Canvas
    
    const xD = O_x + this.r3 * this.gridSize;
    const yD = O_y;
    
    // Kinematic solver logic
    const d = Math.sqrt(Math.pow(xD - xA, 2) + Math.pow(yD - yA, 2));
    const r2_px = this.r2 * this.gridSize;
    const r4_px = this.r4 * this.gridSize;
    
    if (d > r2_px + r4_px || d < Math.abs(r2_px - r4_px)) {
      // Locked state, draw ground pivots and warn
      this.drawLockedState(O_x, O_y, xD, yD, xA, yA);
      return;
    }
    
    const gamma = Math.atan2(yD - yA, xD - xA);
    const cos_alpha = (r2_px * r2_px + d * d - r4_px * r4_px) / (2 * r2_px * d);
    const alpha_A = Math.acos(Math.max(-1, Math.min(1, cos_alpha)));
    
    let t2 = gamma - alpha_A;
    if (this.solvedResult && this.solvedResult.results) {
      // Align with solver's chosen assembly mode
      // If we are animating, let's solve kinematics inline consistently
    }
    
    const xB = xA + r2_px * Math.cos(t2);
    const yB = yA + r2_px * Math.sin(t2);
    
    const t4 = Math.atan2(yB - yD, xB - xD);

    // Draw Ground Pivot supports O and D
    this.drawSupport(O_x, O_y, 'none');
    this.drawSupport(xD, yD, 'none');

    // Draw Links
    // Link 1 (crank OA)
    ctx.strokeStyle = '#191919';
    ctx.fillStyle = '#2D6A4F'; // Green for Crank
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(O_x, O_y);
    ctx.lineTo(xA, yA);
    ctx.stroke();

    // Link 2 (coupler AB)
    ctx.fillStyle = '#D96C53'; // Burnt Orange for Coupler
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(xA, yA);
    ctx.lineTo(xB, yB);
    ctx.stroke();

    // Link 4 (follower DB)
    ctx.fillStyle = '#D08C60'; // Ochre for Follower
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(xD, yD);
    ctx.lineTo(xB, yB);
    ctx.stroke();

    // Joint Pins
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 3;
    const pins = [[O_x, O_y], [xA, yA], [xB, yB], [xD, yD]];
    pins.forEach(pin => {
      ctx.beginPath();
      ctx.arc(pin[0], pin[1], 5, 0, 2*Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Labels
    ctx.fillStyle = '#191919';
    ctx.font = '10px Inter';
    ctx.fillText('O', O_x - 12, O_y + 12);
    ctx.fillText('A', xA - 12, yA - 12);
    ctx.fillText('B', xB + 10, yB - 12);
    ctx.fillText('D', xD + 10, yD + 12);

    // Draw Velocity and Acceleration vectors at A and B
    // We compute velocities and accelerations using solver functions or simple derivative approximation
    // Let's compute them numerically/analytically to draw them!
    const theta1_active = t1;
    const det_vel = r2_px * r4_px * Math.sin(t2 - t4);
    if (Math.abs(det_vel) > 1e-4) {
      const w1_rad = this.w1;
      const w2_rad = (this.r1 * w1_rad * Math.sin(t4 - t1)) / (this.r2 * Math.sin(t2 - t4));
      const w4_rad = (this.r1 * w1_rad * Math.sin(t2 - t1)) / (this.r4 * Math.sin(t2 - t4));
      
      // Linear Velocity of A: v_A = w1 x r1. Magnitude: w1 * r1. Direction: perpendicular to OA.
      // v_A = (-w1 * r1 * sin(t1), w1 * r1 * cos(t1))
      const vAx = -w1_rad * this.r1 * Math.sin(t1) * this.gridSize;
      const vAy = -w1_rad * this.r1 * Math.cos(t1) * this.gridSize; // Y axis inverted in canvas
      
      // Draw Velocity Vector at A (Green)
      this.drawArrow(xA, yA, xA + vAx * 0.1, yA + vAy * 0.1, '#2D6A4F', 2.5);
      ctx.fillStyle = '#2D6A4F';
      ctx.fillText('v_A', xA + vAx * 0.1 + 5, yA + vAy * 0.1);

      // Linear Velocity of B: v_B = w4 x r4.
      // v_B = (-w4 * r4 * sin(t4), w4 * r4 * cos(t4))
      const vBx = -w4_rad * this.r4 * Math.sin(t4) * this.gridSize;
      const vBy = -w4_rad * this.r4 * Math.cos(t4) * this.gridSize;
      
      // Draw Velocity Vector at B (Green)
      this.drawArrow(xB, yB, xB + vBx * 0.1, yB + vBy * 0.1, '#2D6A4F', 2.5);
      ctx.fillStyle = '#2D6A4F';
      ctx.fillText('v_B', xB + vBx * 0.1 + 5, yB + vBy * 0.1);
    }

    // Dynamic reaction forces display overlay
    ctx.fillStyle = '#191919';
    ctx.font = 'bold 12px Inter';
    ctx.fillText(`Mecanismo de 4 Barras: \\theta_1 = ${Math.round(t1 * 180 / Math.PI % 360)}°`, 16, 24);
    ctx.fillText(`Barras: r1 = ${this.r1}m, r2 = ${this.r2}m, r3 = ${this.r3}m, r4 = ${this.r4}m`, 16, 42);
  }

  drawLockedState(O_x, O_y, xD, yD, xA, yA) {
    const ctx = this.ctx;
    // Draw supports
    this.drawSupport(O_x, O_y, 'none');
    this.drawSupport(xD, yD, 'none');
    
    // Draw ground linkage line
    ctx.strokeStyle = '#BC4749';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(O_x, O_y);
    ctx.lineTo(xD, yD);
    ctx.stroke();

    ctx.fillStyle = '#BC4749';
    ctx.font = 'bold 14px Inter';
    ctx.fillText('CRITÉRIO DE MONTAGEM VIOLADO (TRAVADO)', this.canvas.width / 2 - 150, 40);
    ctx.font = '11px Inter';
    ctx.fillStyle = '#565656';
    ctx.fillText('As barras inseridas não formam um polígono fechável para esta posição.', this.canvas.width / 2 - 170, 60);
  }
}
