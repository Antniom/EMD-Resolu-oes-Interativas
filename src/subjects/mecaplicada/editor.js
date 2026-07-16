// Interactive 2D HTML5 Canvas Editor for Mecânica Aplicada (Applied Mechanics)
// Supports visual element selection, dragging to resize parameters, and joint configuration

// Helper function to draw rounded rectangles on canvas safely for older browser compatibility
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class MecAplicadaEditor {
  constructor(canvasElement, onChange, onSelect) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    // Callbacks to sync with module coordinator
    this.onChange = onChange;
    this.onSelect = onSelect; // function(selectedItem)

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
    
    // Selection and Drag-and-Drop state
    this.hoveredItem = null;
    this.selectedItem = null;
    this.draggedItem = null;
    
    this.mousePos = { x: 0, y: 0 };
    this.gridSize = 120;
    this.origin = { x: 150, y: 250 };
    
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
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      const hit = this.checkHitTest(mx, my);
      if (hit) {
        this.selectedItem = hit;
        this.draggedItem = hit;
        if (this.onSelect) this.onSelect(hit);
      } else {
        this.selectedItem = null;
        if (this.onSelect) this.onSelect(null);
      }
      this.draw();
    };

    const handleMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.mousePos = { x: mx, y: my };
      
      if (this.draggedItem) {
        // Dragging logic depending on type
        if (this.type === 'vibracoes') {
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
        } else if (this.type === 'quatro_barras' || this.type === 'biela_manivela') {
          // Adjust linkage coordinates visually
          if (this.draggedItem.type === 'joint_A') {
            const dx = mx - this.origin.x;
            const dy = this.origin.y - my; // invert Y
            this.r1 = parseFloat(Math.max(0.02, Math.sqrt(dx*dx + dy*dy) / this.gridSize).toFixed(2));
            
            // Sync angle theta1
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            this.theta = parseFloat(angle.toFixed(0));
            
            if (this.onChange) {
              this.onChange({ r1: this.r1, theta1: this.theta });
            }
          } else if (this.draggedItem.type === 'joint_B') {
            if (this.type === 'biela_manivela') {
              // B moves horizontally. Dragging B changes r2 (coupler length)
              const dx = mx - (this.origin.x + this.r1 * Math.cos(this.theta * Math.PI / 180) * this.gridSize);
              const dy = this.r1 * Math.sin(this.theta * Math.PI / 180) * this.gridSize;
              this.r2 = parseFloat(Math.max(0.05, Math.sqrt(dx*dx + dy*dy) / this.gridSize).toFixed(2));
              
              if (this.onChange) this.onChange({ r2: this.r2 });
            } else {
              // 4-Bar: B is pinned to follower, dragging B resizes follower r4 and coupler r2
              const dx_D = mx - (this.origin.x + this.r3 * this.gridSize);
              const dy_D = this.origin.y - my;
              this.r4 = parseFloat(Math.max(0.02, Math.sqrt(dx_D*dx_D + dy_D*dy_D) / this.gridSize).toFixed(2));
              
              const dx_A = mx - (this.origin.x + this.r1 * Math.cos(this.theta * Math.PI / 180) * this.gridSize);
              const dy_A = my - (this.origin.y - this.r1 * Math.sin(this.theta * Math.PI / 180) * this.gridSize);
              this.r2 = parseFloat(Math.max(0.02, Math.sqrt(dx_A*dx_A + dy_A*dy_A) / this.gridSize).toFixed(2));

              if (this.onChange) this.onChange({ r4: this.r4, r2: this.r2 });
            }
          } else if (this.draggedItem.type === 'joint_D' && this.type === 'quatro_barras') {
            const dx = mx - this.origin.x;
            this.r3 = parseFloat(Math.max(0.02, dx / this.gridSize).toFixed(2));
            if (this.onChange) this.onChange({ r3: this.r3 });
          }
        } else if (this.type === 'barra_deslizante') {
          if (this.draggedItem.type === 'slider_A') {
            const dx = mx - this.origin.x;
            const newTheta = Math.acos(Math.max(-1, Math.min(1, (dx / this.gridSize) / this.L))) * 180 / Math.PI;
            if (!isNaN(newTheta) && newTheta >= 5 && newTheta <= 85) {
              this.theta = parseFloat(newTheta.toFixed(1));
              if (this.onChange) this.onChange({ theta: this.theta });
            }
          } else if (this.draggedItem.type === 'slider_B') {
            const dy = this.origin.y - my;
            const newTheta = Math.asin(Math.max(-1, Math.min(1, (dy / this.gridSize) / this.L))) * 180 / Math.PI;
            if (!isNaN(newTheta) && newTheta >= 5 && newTheta <= 85) {
              this.theta = parseFloat(newTheta.toFixed(1));
              if (this.onChange) this.onChange({ theta: this.theta });
            }
          } else if (this.draggedItem.type === 'rod_tip') {
            // Drag to resize rod length L
            const dx = mx - this.origin.x;
            const dy = this.origin.y - my;
            this.L = parseFloat(Math.max(0.5, Math.sqrt(dx*dx + dy*dy) / this.gridSize).toFixed(2));
            if (this.onChange) this.onChange({ L: this.L });
          }
        } else if (this.type === 'disco_rolante') {
          const center_cx = this.origin.x + 150;
          const center_cy = this.origin.y - this.R * this.gridSize;

          if (this.draggedItem.type === 'point_P') {
            const dx = mx - center_cx;
            const dy = center_cy - my;
            this.rP = parseFloat(Math.max(0, Math.min(this.R, Math.sqrt(dx*dx + dy*dy) / this.gridSize)).toFixed(2));
            
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            this.thetaP = parseFloat(angle.toFixed(0));
            
            if (this.onChange) this.onChange({ rP: this.rP, thetaP: this.thetaP });
          } else if (this.draggedItem.type === 'disk_rim') {
            const dx = mx - center_cx;
            const dy = center_cy - my;
            this.R = parseFloat(Math.max(0.1, Math.sqrt(dx*dx + dy*dy) / this.gridSize).toFixed(2));
            
            if (this.onChange) this.onChange({ R: this.R });
          } else if (this.draggedItem.type === 'vel_arrow') {
            // Drag the velocity vector arrow to increase/decrease vG speed
            const dx = mx - center_cx;
            this.vG = parseFloat(Math.max(-5.0, Math.min(5.0, dx / (0.15 * this.gridSize / 2.0))).toFixed(1));
            if (this.onChange) this.onChange({ vG: this.vG });
          }
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
      this.draw();
    };

    const handleMouseUp = () => {
      this.draggedItem = null;
      this.draw();
    };

    this.canvas.addEventListener('mousedown', handleMouseDown);
    this.canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    this.canvas.addEventListener('resize', () => this.resizeCanvas());
  }

  checkHitTest(mx, my) {
    const size = 15;
    
    if (this.type === 'vibracoes') {
      // Pivot
      const px = this.origin.x + this.pivotX * this.gridSize;
      const py = this.origin.y;
      if (Math.abs(mx - px) < size && my >= py && my <= py + 25) {
        return { type: 'pivot', id: 'main' };
      }
      
      // Springs
      for (let s of this.springs) {
        const sx = this.origin.x + s.x * this.gridSize;
        const sy = this.origin.y;
        if (Math.abs(mx - sx) < size && my >= sy && my <= sy + 50) {
          return { type: 'spring', id: s.id, x: s.x, k: s.k };
        }
      }
      
      // Dampers
      for (let d of this.dampers) {
        const dx = this.origin.x + d.x * this.gridSize;
        const dy = this.origin.y;
        if (Math.abs(mx - dx) < size && my >= dy && my <= dy + 50) {
          return { type: 'damper', id: d.id, x: d.x, c: d.c };
        }
      }
      
      // Masses
      for (let m of this.masses) {
        const sx = this.origin.x + m.x * this.gridSize;
        const sy = this.origin.y - 12;
        if (Math.abs(mx - sx) < size && Math.abs(my - sy) < size) {
          return { type: 'mass', id: m.id, x: m.x, m: m.m };
        }
      }
      
      // Force
      const fx = this.origin.x + this.force.x * this.gridSize;
      const fy = this.origin.y;
      if (Math.abs(mx - fx) < size && my >= fy - 70 && my <= fy) {
        return { type: 'force', id: 'main', x: this.force.x, F0: this.force.F0, w: this.force.w, forceType: this.force.type };
      }

      // Hit test the Bar itself
      const barLeft = this.origin.x;
      const barRight = this.origin.x + this.barLength * this.gridSize;
      if (mx >= barLeft && mx <= barRight && Math.abs(my - this.origin.y) < 12) {
        return { type: 'bar', id: 'main', barMass: this.barMass, barLength: this.barLength };
      }
    } else if (this.type === 'quatro_barras' || this.type === 'biela_manivela') {
      let t1 = 45 * Math.PI / 180;
      if (this.solvedResult && this.solvedResult.results) {
        t1 = this.solvedResult.results.t1;
      }
      const O_x = this.origin.x;
      const O_y = this.origin.y;
      const xA = O_x + this.r1 * Math.cos(t1) * this.gridSize;
      const yA = O_y - this.r1 * Math.sin(t1) * this.gridSize;
      const xD = O_x + this.r3 * this.gridSize;
      const yD = O_y;
      
      const t2 = this.solvedResult && this.solvedResult.results ? this.solvedResult.results.t2 : 0;
      const xB = xA + this.r2 * Math.cos(t2) * this.gridSize;
      const yB = yA - this.r2 * Math.sin(t2) * this.gridSize;

      // Hit test pins
      if (Math.abs(mx - xA) < size && Math.abs(my - yA) < size) {
        return { type: 'joint_A', r1: this.r1, theta1: this.theta };
      }
      if (Math.abs(mx - xB) < size && Math.abs(my - yB) < size) {
        return { type: 'joint_B', r2: this.r2, r4: this.r4 };
      }
      if (this.type === 'quatro_barras' && Math.abs(mx - xD) < size && Math.abs(my - yD) < size) {
        return { type: 'joint_D', r3: this.r3 };
      }

      // Hit linkage body to edit link properties
      if (mx >= Math.min(O_x, xD) - 30 && mx <= Math.max(O_x, xD) + 30 && my >= Math.min(yA, yB) - 30 && my <= O_y + 40) {
        return { type: 'linkage', r1: this.r1, r2: this.r2, r3: this.r3, r4: this.r4, m1: this.m1, m2: this.m2, m4: this.m4, mp: this.mp, w1: this.w1 };
      }
    } else if (this.type === 'barra_deslizante') {
      const t = this.theta * Math.PI / 180;
      const O_x = this.origin.x;
      const O_y = this.origin.y;
      const xA = O_x + this.L * Math.cos(t) * this.gridSize;
      const yA = O_y;
      const xB = O_x;
      const yB = O_y - this.L * Math.sin(t) * this.gridSize;

      if (Math.abs(mx - xA) < size && Math.abs(my - yA) < size) {
        return { type: 'slider_A', L: this.L, theta: this.theta };
      }
      if (Math.abs(mx - xB) < size && Math.abs(my - yB) < size) {
        return { type: 'slider_B', L: this.L, theta: this.theta };
      }
      
      // Check if clicked the tip of the rod to drag-resize it
      const xG = (xA + xB) / 2;
      const yG = (yA + yB) / 2;
      if (Math.abs(mx - xG) < size && Math.abs(my - yG) < size) {
        return { type: 'rod_tip', L: this.L };
      }

      // Hit rod body
      const dist = this.pointToSegmentDistance(mx, my, xA, yA, xB, yB);
      if (dist < 12) {
        return { type: 'rod', L: this.L, theta: this.theta, w: this.w };
      }
    } else if (this.type === 'disco_rolante') {
      const center_cx = this.origin.x + 150;
      const center_cy = this.origin.y - this.R * this.gridSize;
      
      // Point P
      const rot = this.isAnimating ? (this.animationTime * (this.vG / this.R)) : 0;
      const tP = this.thetaP * Math.PI / 180 + rot;
      const rP_px = this.rP * this.gridSize;
      const P_cx = center_cx + rP_px * Math.cos(tP);
      const P_cy = center_cy - rP_px * Math.sin(tP);

      if (Math.abs(mx - P_cx) < size && Math.abs(my - P_cy) < size) {
        return { type: 'point_P', rP: this.rP, thetaP: this.thetaP };
      }

      // Center G
      if (Math.abs(mx - center_cx) < size && Math.abs(my - center_cy) < size) {
        return { type: 'center_G', R: this.R, vG: this.vG, aG: this.aG };
      }

      // Velocity Arrow Tip
      const arrowScale = 0.15 * this.gridSize / 2.0;
      const vG_arrow_tip_x = center_cx + this.vG * arrowScale;
      if (Math.abs(mx - vG_arrow_tip_x) < size && Math.abs(my - center_cy) < size) {
        return { type: 'vel_arrow', vG: this.vG };
      }

      // Rim (Outer boundary)
      const dist_center = Math.sqrt(Math.pow(mx - center_cx, 2) + Math.pow(my - center_cy, 2));
      if (Math.abs(dist_center - this.R * this.gridSize) < 12) {
        return { type: 'disk_rim', R: this.R };
      }

      // Disk body
      if (dist_center < this.R * this.gridSize) {
        return { type: 'disk', R: this.R, vG: this.vG, aG: this.aG };
      }
    }

    return null;
  }

  pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(Math.pow(px - (x1 + t * (x2 - x1)), 2) + Math.pow(py - (y1 + t * (y2 - y1)), 2));
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#F0EEE1';
    ctx.lineWidth = 1;
    const spacing = 40;
    for (let x = 0; x < this.canvas.width; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
    }
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
    
    // Draw rigid bar using drawRoundRect
    const barLeft = -this.pivotX * this.gridSize;
    const isBarSelected = this.isItemActive('bar', 'main');
    ctx.fillStyle = isBarSelected === 'selected' ? '#D96C53' : (isBarSelected === 'hovered' ? '#d8816c' : '#C05B42');
    ctx.strokeStyle = isBarSelected !== 'none' ? '#191919' : '#565656';
    ctx.lineWidth = isBarSelected !== 'none' ? 5 : 4;
    drawRoundRect(ctx, barLeft, -8, this.barLength * this.gridSize, 16, 4); ctx.fill(); ctx.stroke();
    
    const G_x = (this.barLength / 2 - this.pivotX) * this.gridSize;
    ctx.fillStyle = '#191919'; ctx.beginPath(); ctx.arc(G_x, 0, 5, 0, 2*Math.PI); ctx.fill();

    this.masses.forEach(m => {
      const mx = (m.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('mass', m.id);
      ctx.fillStyle = isActive === 'selected' ? '#BC4749' : (isActive === 'hovered' ? '#d96c53' : '#191919');
      ctx.strokeStyle = '#191919'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(mx - 12, -24, 24, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = '9px Inter'; ctx.fillText(`${m.m}kg`, mx - 10, -13);
    });

    this.springs.forEach(s => {
      const sx = (s.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('spring', s.id);
      ctx.save(); ctx.translate(sx, 8); this.drawSpring(0, 0, 48, isActive); ctx.restore();
    });

    this.dampers.forEach(d => {
      const dx = (d.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('damper', d.id);
      ctx.save(); ctx.translate(dx, 8); this.drawDamper(0, 0, 48, isActive); ctx.restore();
    });

    if (this.force.F0 > 0) {
      const fx = (this.force.x - this.pivotX) * this.gridSize;
      const isActive = this.isItemActive('force', 'main');
      let f_scale = this.isAnimating ? Math.sin(this.force.w * this.animationTime) : 1.0;
      const arrowLength = 50 * f_scale;
      if (Math.abs(arrowLength) > 5) {
        this.drawArrow(fx, -10, fx, -10 - arrowLength, isActive !== 'none' ? '#BC4749' : '#2D6A4F', isActive !== 'none' ? 4 : 2.5);
      }
    }

    ctx.restore();
    
    // Main hinge pivot
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

    // Selected state linkage outline
    const isLinkageSelected = this.isItemActive('linkage', 'none') === 'selected';

    ctx.strokeStyle = isLinkageSelected ? '#D96C53' : '#191919';
    ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(O_x, O_y); ctx.lineTo(xA, yA); ctx.stroke(); // Crank

    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke(); // Coupler

    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(xD, yD); ctx.lineTo(xB, yB); ctx.stroke(); // Follower

    // Draw active draggable joint circles
    const joints = [
      { name: 'joint_A', x: xA, y: yA },
      { name: 'joint_B', x: xB, y: yB },
      { name: 'joint_D', x: xD, y: yD }
    ];

    joints.forEach(j => {
      const activeState = this.isItemActive(j.name, 'none');
      ctx.fillStyle = activeState === 'selected' ? '#D96C53' : (activeState === 'hovered' ? '#d8816c' : '#ffffff');
      ctx.strokeStyle = activeState !== 'none' ? '#191919' : '#565656';
      ctx.lineWidth = activeState !== 'none' ? 4 : 2.5;
      ctx.beginPath(); ctx.arc(j.x, j.y, 8, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
    });

    ctx.fillStyle = '#191919'; ctx.font = 'bold 10px Inter';
    ctx.fillText('A', xA - 12, yA - 12);
    ctx.fillText('B', xB + 10, yB - 12);
    ctx.fillText('D', xD + 10, yD + 12);
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

    // Selected link outline
    const isLinkageSelected = this.isItemActive('linkage', 'none') === 'selected';

    ctx.strokeStyle = isLinkageSelected ? '#D96C53' : '#191919';
    ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(O_x, O_y); ctx.lineTo(xA, yA); ctx.stroke(); // Crank

    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke(); // Biela

    // Piston - safe roundRect drawing
    ctx.fillStyle = '#FAFAFA'; ctx.strokeStyle = '#191919'; ctx.lineWidth = 2.5;
    drawRoundRect(ctx, xB - 24, yB - 14, 48, 28, 4); ctx.fill(); ctx.stroke();

    // Draggable Pin A
    const activeStateA = this.isItemActive('joint_A', 'none');
    ctx.fillStyle = activeStateA === 'selected' ? '#D96C53' : (activeStateA === 'hovered' ? '#d8816c' : '#ffffff');
    ctx.strokeStyle = activeStateA !== 'none' ? '#191919' : '#565656';
    ctx.lineWidth = activeStateA !== 'none' ? 4 : 2.5;
    ctx.beginPath(); ctx.arc(xA, yA, 8, 0, 2*Math.PI); ctx.fill(); ctx.stroke();

    // Draggable Piston Pin B
    const activeStateB = this.isItemActive('joint_B', 'none');
    ctx.fillStyle = activeStateB === 'selected' ? '#D96C53' : (activeStateB === 'hovered' ? '#d8816c' : '#ffffff');
    ctx.strokeStyle = activeStateB !== 'none' ? '#191919' : '#565656';
    ctx.lineWidth = activeStateB !== 'none' ? 4 : 2.5;
    ctx.beginPath(); ctx.arc(xB, yB, 8, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
  }

  drawBarraDeslizante() {
    const ctx = this.ctx;
    let t = this.theta * Math.PI / 180;
    
    if (this.isAnimating) {
      const cycle = (this.animationTime * 0.5) % 2.0;
      const progress = cycle > 1.0 ? 2.0 - cycle : cycle;
      t = (85 - progress * 80) * Math.PI / 180;
    }

    const O_x = this.origin.x;
    const O_y = this.origin.y;

    const xA = O_x + this.L * Math.cos(t) * this.gridSize;
    const yA = O_y;
    const xB = O_x;
    const yB = O_y - this.L * Math.sin(t) * this.gridSize;

    // Guides
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(O_x, O_y - this.L * this.gridSize - 40); ctx.lineTo(O_x, O_y); ctx.lineTo(O_x + this.L * this.gridSize + 40, O_y);
    ctx.stroke();

    // Space Centrode Arc
    ctx.strokeStyle = 'rgba(188, 71, 73, 0.2)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(O_x, O_y, this.L * this.gridSize, -Math.PI/2, 0); ctx.stroke();
    ctx.setLineDash([]);

    // CIR
    const cir_x = xA;
    const cir_y = yB;
    ctx.strokeStyle = '#BC4749'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(cir_x, cir_y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xB, yB); ctx.lineTo(cir_x, cir_y); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#BC4749'; ctx.beginPath(); ctx.arc(cir_x, cir_y, 6, 0, 2*Math.PI); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 10px Inter'; ctx.fillText('C.I.R.', cir_x + 8, cir_y - 4);

    // Rod
    const isRodSelected = this.isItemActive('rod', 'none') === 'selected';
    ctx.strokeStyle = isRodSelected ? '#D96C53' : '#191919';
    ctx.fillStyle = '#D96C53'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke();

    // Center G
    const xG = (xA + xB) / 2;
    const yG = (yA + yB) / 2;
    ctx.fillStyle = '#191919'; ctx.beginPath(); ctx.arc(xG, yG, 4, 0, 2*Math.PI); ctx.fill();

    // Resize tip handle (rod_tip)
    const activeStateTip = this.isItemActive('rod_tip', 'none');
    ctx.fillStyle = activeStateTip === 'selected' ? '#D96C53' : (activeStateTip === 'hovered' ? '#d8816c' : '#ffffff');
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(xG, yG, 7, 0, 2*Math.PI); ctx.fill(); ctx.stroke();

    // Draggable Sliders A and B - safe roundRect drawing
    const activeStateA = this.isItemActive('slider_A', 'none');
    ctx.fillStyle = activeStateA === 'selected' ? '#D96C53' : (activeStateA === 'hovered' ? '#d8816c' : '#ffffff');
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 2;
    drawRoundRect(ctx, xA - 12, yA - 6, 24, 12, 2); ctx.fill(); ctx.stroke();

    const activeStateB = this.isItemActive('slider_B', 'none');
    ctx.fillStyle = activeStateB === 'selected' ? '#D96C53' : (activeStateB === 'hovered' ? '#d8816c' : '#ffffff');
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 2;
    drawRoundRect(ctx, xB - 6, yB - 12, 12, 24, 2); ctx.fill(); ctx.stroke();
  }

  drawDiscoRolante() {
    const ctx = this.ctx;
    const R_px = this.R * this.gridSize;
    const groundY = this.origin.y;
    
    let dx = 0;
    if (this.isAnimating) {
      const cycle = this.animationTime % 4.0;
      dx = (cycle / 4.0) * (this.canvas.width - 250) - 100;
    }
    const center_cx = this.origin.x + dx + 150;
    const center_cy = groundY - R_px;

    const CIR_cx = center_cx;
    const CIR_cy = groundY;

    // Ground
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(this.canvas.width, groundY); ctx.stroke();

    // Draggable wheel body (rim)
    const isDiskSelected = this.isItemActive('disk', 'none') === 'selected' || this.isItemActive('disk_rim', 'none') === 'selected';
    ctx.strokeStyle = isDiskSelected ? '#D96C53' : '#191919';
    ctx.fillStyle = '#F5F3E7'; ctx.lineWidth = isDiskSelected ? 5.5 : 3.5;
    ctx.beginPath(); ctx.arc(center_cx, center_cy, R_px, 0, 2*Math.PI); ctx.fill(); ctx.stroke();

    let rot = this.isAnimating ? (dx / R_px) : 0;
    ctx.strokeStyle = 'rgba(25, 25, 25, 0.2)'; ctx.lineWidth = 1.5;
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(center_cx, center_cy);
      ctx.lineTo(center_cx + R_px * Math.cos(angle + rot), center_cy + R_px * Math.sin(angle + rot));
      ctx.stroke();
    }

    // Draggable G center
    const activeStateG = this.isItemActive('center_G', 'none');
    ctx.fillStyle = activeStateG === 'selected' ? '#D96C53' : (activeStateG === 'hovered' ? '#d8816c' : '#191919');
    ctx.beginPath(); ctx.arc(center_cx, center_cy, 6, 0, 2*Math.PI); ctx.fill();

    // Contact point C (CIR)
    ctx.fillStyle = '#BC4749'; ctx.beginPath(); ctx.arc(CIR_cx, CIR_cy, 6, 0, 2*Math.PI); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();

    // Point P
    const tP = this.thetaP * Math.PI / 180 + rot;
    const rP_px = this.rP * this.gridSize;
    const P_cx = center_cx + rP_px * Math.cos(tP);
    const P_cy = center_cy - rP_px * Math.sin(tP);

    // Connecting CIR to P
    ctx.strokeStyle = 'rgba(188, 71, 73, 0.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(CIR_cx, CIR_cy); ctx.lineTo(P_cx, P_cy); ctx.stroke();
    ctx.setLineDash([]);

    // Draw Draggable Point P
    const activeStateP = this.isItemActive('point_P', 'none');
    ctx.fillStyle = activeStateP === 'selected' ? '#D96C53' : (activeStateP === 'hovered' ? '#d8816c' : '#ffffff');
    ctx.strokeStyle = '#191919'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P_cx, P_cy, 7, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#191919'; ctx.font = 'bold 10px Inter'; ctx.fillText('P', P_cx + 8, P_cy - 4);

    // Draggable Velocity arrow vG
    const arrowScale = 0.15 * this.gridSize / 2.0;
    const vG_scaled = this.vG * arrowScale;
    const activeStateVel = this.isItemActive('vel_arrow', 'none');
    
    this.drawArrow(center_cx, center_cy, center_cx + vG_scaled, center_cy, activeStateVel !== 'none' ? '#BC4749' : '#2D6A4F', activeStateVel !== 'none' ? 4 : 2.5);
    ctx.fillStyle = '#2D6A4F'; ctx.fillText('v_G', center_cx + vG_scaled + 5, center_cy - 5);
  }

  isItemActive(type, id) {
    if (this.selectedItem && this.selectedItem.type === type && (id === 'none' || this.selectedItem.id === id)) return 'selected';
    if (this.hoveredItem && this.hoveredItem.type === type && (id === 'none' || this.hoveredItem.id === id)) return 'hovered';
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
