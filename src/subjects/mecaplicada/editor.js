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
    this.speedMultiplier = 0.1; // Default 10x slower
    
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
    this.animationTime += (1 / fps) * this.speedMultiplier;
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

  drawVibracoes() {
    const ctx = this.ctx;
    let theta = 0;
    let dtheta = 0;
    if (this.isAnimating && this.solvedResult && this.solvedResult.trajectory) {
      const traj = this.solvedResult.trajectory;
      const totalDuration = 8.0;
      const t = this.animationTime % totalDuration;
      const stepIdx = Math.floor((t / totalDuration) * traj.length) % traj.length;
      const trajPt = traj[stepIdx];
      theta = trajPt.theta;
      dtheta = trajPt.dtheta || 0;
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

    // Draw rigid bar and masses inside the rotated coordinate system
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(theta);
    
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

    ctx.restore(); // Restore back to global coordinate system!

    // Draw dynamic angles text overlay next to the pivot
    ctx.fillStyle = '#191919'; ctx.font = 'bold 10px Inter';
    ctx.fillText(`\u03b8 = ${(theta * 180 / Math.PI).toFixed(2)}\u00b0`, px - 35, py - 35);
    ctx.fillStyle = '#C05B42';
    ctx.fillText(`\u03c9 = ${dtheta.toFixed(2)} rad/s`, px - 45, py - 22);

    // Draw springs in global coordinates (vertically connected from bar to ground line)
    this.springs.forEach(s => {
      const d = (s.x - this.pivotX) * this.gridSize;
      // Rotated attachment coordinates on the bottom edge of the bar
      const x_attach = px + d * Math.cos(theta) - 8 * Math.sin(theta);
      const y_attach = py + d * Math.sin(theta) + 8 * Math.cos(theta);
      const y_ground = this.origin.y + 60;
      const h = y_ground - y_attach;
      
      const isActive = this.isItemActive('spring', s.id);
      this.drawSpring(x_attach, y_attach, h, isActive);

      // Draw Spring Force Vector Arrow
      const forceVal = -s.k * d * theta / this.gridSize;
      this.drawForceVector(x_attach, y_attach, 0, forceVal, '#D96C53', `Fk=${forceVal.toFixed(1)} N`);
    });

    // Draw dampers in global coordinates
    this.dampers.forEach(d_item => {
      const d = (d_item.x - this.pivotX) * this.gridSize;
      // Rotated attachment coordinates on the bottom edge of the bar
      const x_attach = px + d * Math.cos(theta) - 8 * Math.sin(theta);
      const y_attach = py + d * Math.sin(theta) + 8 * Math.cos(theta);
      const y_ground = this.origin.y + 60;
      const h = y_ground - y_attach;

      const isActive = this.isItemActive('damper', d_item.id);
      this.drawDamper(x_attach, y_attach, h, isActive);

      // Draw Damper Force Vector Arrow
      const forceVal = -d_item.c * d * dtheta / this.gridSize;
      this.drawForceVector(x_attach, y_attach, 0, forceVal, '#2A9D8F', `Fc=${forceVal.toFixed(1)} N`);
    });

    // Draw harmonic force in global coordinates
    if (this.force.F0 > 0) {
      const d = (this.force.x - this.pivotX) * this.gridSize;
      const x_attach = px + d * Math.cos(theta) + 8 * Math.sin(theta);
      const y_attach = py + d * Math.sin(theta) - 8 * Math.cos(theta); // Top edge of the bar
      
      const isActive = this.isItemActive('force', 'main');
      let f_scale = this.isAnimating ? Math.sin(this.force.w * this.animationTime) : 1.0;
      const arrowLength = 50 * f_scale;
      const forceVal = this.force.F0 * f_scale;
      if (Math.abs(arrowLength) > 5) {
        this.drawArrow(x_attach, y_attach, x_attach, y_attach - arrowLength, isActive !== 'none' ? '#BC4749' : '#2D6A4F', isActive !== 'none' ? 4 : 2.5);
        ctx.fillStyle = '#2D6A4F'; ctx.font = 'bold 9px Inter';
        ctx.fillText(`F(t)=${forceVal.toFixed(1)} N`, x_attach + 8, y_attach - arrowLength);
      }
    }
    
    // Main hinge pivot circle
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#191919'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
  }

  drawQuatroBarras() {
    const ctx = this.ctx;
    let t1 = 45 * Math.PI / 180;
    let step = null;

    if (this.isAnimating) {
      t1 = this.animationTime * this.w1;
    } else if (this.solvedResult && this.solvedResult.results) {
      t1 = this.solvedResult.results.t1;
    }

    // Lookup matching step from solver trajectory for detailed reaction force values
    if (this.solvedResult && this.solvedResult.trajectory) {
      const traj = this.solvedResult.trajectory;
      const currentDeg = (t1 * 180 / Math.PI) % 360;
      let minDiff = Infinity;
      traj.forEach(pt => {
        const diff = Math.abs(pt.theta1Deg - currentDeg);
        if (diff < minDiff) { minDiff = diff; step = pt; }
      });
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
    
    const t2 = step ? step.t2 : (this.solvedResult && this.solvedResult.results ? this.solvedResult.results.t2 : 0);
    const xB = xA + this.r2 * Math.cos(t2) * this.gridSize;
    const yB = yA - this.r2 * Math.sin(t2) * this.gridSize;
    const t4 = step ? step.t4 : (this.solvedResult && this.solvedResult.results ? this.solvedResult.results.t4 : 0);

    // Draw CIR lines & dot
    if (step && step.CIR) {
      const cir_x = O_x + step.CIR.x * this.gridSize;
      const cir_y = O_y - step.CIR.y * this.gridSize;

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

    // Overlay Angles
    this.drawAngleArc(O_x, O_y, 0, t1, 30, `\u03b81=${(t1 * 180 / Math.PI).toFixed(0)}\u00b0`);
    this.drawAngleArc(xD, yD, 0, t4, 30, `\u03b84=${(t4 * 180 / Math.PI).toFixed(0)}\u00b0`);

    // Draw Reaction Forces & Input Torque overlay from Trajectory Step
    if (step && step.forces) {
      const f = step.forces;
      // Reactions on supports
      this.drawForceVector(O_x, O_y, f.Ox, f.Oy, '#2A9D8F', `FO=(${f.Ox.toFixed(0)},${f.Oy.toFixed(0)})N`);
      this.drawForceVector(xD, yD, f.Dx, f.Dy, '#2A9D8F', `FD=(${f.Dx.toFixed(0)},${f.Dy.toFixed(0)})N`);
      // Reactions at pin joints
      this.drawForceVector(xA, yA, f.Ax, f.Ay, '#D96C53', `FA=${Math.sqrt(f.Ax*f.Ax+f.Ay*f.Ay).toFixed(0)}N`);
      this.drawForceVector(xB, yB, f.Bx, f.By, '#D96C53', `FB=${Math.sqrt(f.Bx*f.Bx+f.By*f.By).toFixed(0)}N`);
      // Input motor torque curved arrow
      this.drawCurvedArrow(O_x, O_y, 45, '#E76F51', `M=${f.M.toFixed(2)} N\u00b7m`);
    }

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
    let step = null;

    if (this.isAnimating) {
      t1 = this.animationTime * this.w1;
    } else if (this.solvedResult && this.solvedResult.results) {
      t1 = this.solvedResult.results.t1;
    }

    if (this.solvedResult && this.solvedResult.trajectory) {
      const traj = this.solvedResult.trajectory;
      const currentDeg = (t1 * 180 / Math.PI) % 360;
      let minDiff = Infinity;
      traj.forEach(pt => {
        const diff = Math.abs(pt.theta1Deg - currentDeg);
        if (diff < minDiff) { minDiff = diff; step = pt; }
      });
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
    if (step && step.CIR) {
      const cir_x = O_x + step.CIR.x * this.gridSize;
      const cir_y = O_y - step.CIR.y * this.gridSize;

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

    // Overlay Crank angle
    this.drawAngleArc(O_x, O_y, 0, t1, 25, `\u03b81=${(t1 * 180 / Math.PI).toFixed(0)}\u00b0`);

    // Draw dynamic reactions and velocities from trajectory step
    if (step && step.forces) {
      const f = step.forces;
      // Reactions on crank support O
      this.drawForceVector(O_x, O_y, f.Ox, f.Oy, '#2A9D8F', `FO=(${f.Ox.toFixed(0)},${f.Oy.toFixed(0)})N`);
      // Reactions at pins A and B
      this.drawForceVector(xA, yA, f.Ax, f.Ay, '#D96C53', `FA=${Math.sqrt(f.Ax*f.Ax+f.Ay*f.Ay).toFixed(0)}N`);
      this.drawForceVector(xB, yB, f.Bx, f.By, '#D96C53', `FB=${Math.sqrt(f.Bx*f.Bx+f.By*f.By).toFixed(0)}N`);
      // Normal wall reaction on piston B
      this.drawForceVector(xB, yB, 0, f.N, '#2D6A4F', `N=${f.N.toFixed(0)}N`);
      // Motor torque curved arrow
      this.drawCurvedArrow(O_x, O_y, 40, '#E76F51', `M=${f.M.toFixed(1)} N\u00b7m`);
      
      // Velocities and accelerations at B (Piston)
      const v_scale = 15;
      const a_scale = 0.5;
      // Piston horizontal velocity vector arrow
      this.drawArrow(xB, yB, xB + step.vB * v_scale, yB, '#2D6A4F', 2.0);
      ctx.fillStyle = '#2D6A4F'; ctx.font = 'bold 9px Inter';
      ctx.fillText(`vB=${step.vB.toFixed(2)} m/s`, xB + step.vB * v_scale + 5, yB - 6);
      
      // Piston horizontal acceleration vector arrow
      this.drawArrow(xB, yB + 6, xB + step.aB * a_scale, yB + 6, '#BC4749', 2.0);
      ctx.fillStyle = '#BC4749';
      ctx.fillText(`aB=${step.aB.toFixed(1)} m/s\u00b2`, xB + step.aB * a_scale + 5, yB + 14);
    }

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

    // Overlay Rod Angles and Rod speed
    this.drawAngleArc(O_x, O_y, 0, t, 40, `\u03b8=${(t * 180 / Math.PI).toFixed(0)}\u00b0`);

    // Dynamically calculate and draw velocities
    const vA = -this.L * this.w * Math.sin(t);
    const vB = this.L * this.w * Math.cos(t);

    const v_scale = 35;
    this.drawArrow(xA, yA, xA + vA * v_scale, yA, '#2D6A4F', 2.0);
    ctx.fillStyle = '#2D6A4F'; ctx.font = 'bold 9px Inter';
    ctx.fillText(`vA=${vA.toFixed(2)} m/s`, xA + vA * v_scale - 15, yA - 10);

    this.drawArrow(xB, yB, xB, yB - vB * v_scale, '#2D6A4F', 2.0);
    ctx.fillText(`vB=${vB.toFixed(2)} m/s`, xB + 10, yB - vB * v_scale);

    // Overlay reaction forces (Sem atrito: NA perpendicular to floor, NB perpendicular to wall)
    if (this.solvedResult && this.solvedResult.results) {
      const NA = this.solvedResult.results.NA;
      const NB = this.solvedResult.results.NB;
      this.drawForceVector(xA, yA, 0, NA, '#2A9D8F', `NA=${NA.toFixed(1)} N`);
      this.drawForceVector(xB, yB, NB, 0, '#2A9D8F', `NB=${NB.toFixed(1)} N`);
    }

    ctx.fillStyle = '#C05B42'; ctx.font = 'bold 10px Inter';
    ctx.fillText(`\u03c9 = -${this.w.toFixed(1)} rad/s`, xG - 30, yG - 15);
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
    ctx.font = 'bold 9px Inter'; ctx.fillStyle = '#BC4749';
    ctx.fillText('C (CIR, vC=0)', CIR_cx + 8, CIR_cy - 4);

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
    ctx.fillStyle = '#2D6A4F'; ctx.font = 'bold 9px Inter';
    ctx.fillText(`v_G=${this.vG.toFixed(1)} m/s`, center_cx + vG_scaled + 5, center_cy - 5);

    // Calculate and draw velocity arrow for Point P (direction perp to CP line)
    const w_val = -this.vG / this.R; // Angular velocity (clockwise is negative)
    const dx_P = P_cx - CIR_cx;
    const dy_P = P_cy - CIR_cy;
    // vP vector: vG + w x rGP. Since pure roll: vP = w x rCP.
    // In screen coordinates: vP_x = -w * (P_cy - CIR_cy) / gridSize, vP_y = -w * (P_cx - CIR_cx) / gridSize
    const vP_x = -w_val * (CIR_cy - P_cy) / this.gridSize;
    const vP_y = w_val * (P_cx - CIR_cx) / this.gridSize;
    const vP_mag = Math.sqrt(vP_x*vP_x + vP_y*vP_y);

    const vP_scale = 30; // Scale factor for vector arrow
    this.drawArrow(P_cx, P_cy, P_cx + vP_x * vP_scale, P_cy - vP_y * vP_scale, '#2D6A4F', 2.0);
    ctx.fillStyle = '#2D6A4F'; ctx.fillText(`vP=${vP_mag.toFixed(2)} m/s`, P_cx + vP_x * vP_scale + 5, P_cy - vP_y * vP_scale);

    // Show angular speed
    ctx.fillStyle = '#C05B42'; ctx.font = 'bold 10px Inter';
    ctx.fillText(`\u03c9 = ${w_val.toFixed(2)} rad/s`, center_cx - 40, center_cy - 20);
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

  drawForceVector(x, y, vx, vy, color, label) {
    const len = Math.sqrt(vx*vx + vy*vy);
    if (len < 0.1) return;
    
    // Scale vectors so they are visually clear (between 25 and 75 pixels)
    const displayLen = Math.min(75, Math.max(25, len * 0.6));
    const angle = Math.atan2(vy, vx);
    const toX = x + displayLen * Math.cos(angle);
    const toY = y - displayLen * Math.sin(angle); // invert Y for screen coords
    
    this.drawArrow(x, y, toX, toY, color, 2.5);
    
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = 'bold 9px Inter';
    ctx.fillText(label, toX + 5, toY - 2);
  }

  drawAngleArc(x, y, startAngle, endAngle, radius, label) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#BC4749'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, -startAngle, -endAngle, startAngle > endAngle);
    ctx.stroke();
    
    // Draw text label near the middle of the arc
    const mid = (startAngle + endAngle) / 2;
    const tx = x + (radius + 12) * Math.cos(mid);
    const ty = y - (radius + 12) * Math.sin(mid);
    ctx.fillStyle = '#BC4749';
    ctx.font = 'bold 9px Inter';
    ctx.fillText(label, tx - 12, ty + 3);
  }

  drawCurvedArrow(x, y, radius, color, label) {
    const ctx = this.ctx;
    ctx.strokeStyle = color; ctx.lineWidth = 2.0;
    ctx.beginPath();
    // draw a 3/4 circle arc around center x, y
    ctx.arc(x, y, radius, -Math.PI / 6, Math.PI / 2 + Math.PI / 6);
    ctx.stroke();
    
    // Draw arrow head at end of arc
    const tx = x + radius * Math.cos(Math.PI / 2 + Math.PI / 6);
    const ty = y + radius * Math.sin(Math.PI / 2 + Math.PI / 6);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, 2*Math.PI); ctx.fill();

    ctx.font = 'bold 9px Inter';
    ctx.fillText(label, x - radius - 5, y - radius - 4);
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
