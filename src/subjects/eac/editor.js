// Interactive 2D HTML5 Canvas Structural Editor for EAC

export class EacEditor {
  constructor(canvasElement, onChange) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.onChange = onChange;

    // Model state
    this.nodes = [];     // { id, x, y, support: 'none'|'fixed'|'pinned'|'rollerY'|'rollerX'|'inclined', angle: 0, rx: 0, ry: 0, rt: 0 }
    this.elements = [];  // { id, type: 'spring'|'bar'|'beam'|'frame', n1: id, n2: id, E, A, I, L, p0, pL, py }
    this.forces = [];    // { node: id, px: 0, py: 0, m: 0 }

    // Editor UI state
    this.tool = 'select'; // select, node, bar, beam, spring, frame, support_fixed, support_pinned, support_roller, force_point, force_moment, force_dist
    this.selectedNodeId = null;
    this.selectedElementId = null;
    this.draggedNodeId = null;
    this.isDrawing = false;
    this.drawStartNodeId = null;
    this.mousePos = { x: 0, y: 0 };

    // Support properties
    this.selectedSupportType = 'fixed';
    this.selectedSupportAngle = 0;
    this.selectedSupportSpringK = 1;

    // Grid settings
    this.gridSize = 40;  // 1 meter = 40 pixels
    this.snapToGrid = true;
    this.origin = { x: 100, y: 300 }; // offset coordinate origin

    // Animation state for vibration modes
    this.animationModeIdx = null; // null for no animation, 0, 1, 2 for modes
    this.animationAmplitude = 30; // pixels of max deflection
    this.animationTime = 0;
    this.animationFrameId = null;
    this.modeShapes = []; // array of mode vectors

    this.initEvents();
    this.resizeCanvas();
  }

  // Set up model data from external source
  setModel(nodes, elements, forces) {
    this.nodes = nodes || [];
    this.elements = elements || [];
    this.forces = forces || [];
    this.selectedNodeId = null;
    this.selectedElementId = null;
    this.draw();
  }

  setAnimationMode(modeIdx, modeShapes) {
    this.animationModeIdx = modeIdx;
    this.modeShapes = modeShapes || [];
    if (this.animationModeIdx !== null && this.animationModeIdx >= 0) {
      if (!this.animationFrameId) {
        this.animate();
      }
    } else {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.draw();
    }
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 600;
    this.canvas.height = rect.height || 400;
    this.draw();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Coordinate transforms
  canvasToModel(cx, cy) {
    let mx = (cx - this.origin.x) / this.gridSize;
    let my = -(cy - this.origin.y) / this.gridSize; // Y-up in mechanics
    if (this.snapToGrid) {
      mx = Math.round(mx * 2) / 2; // snap to 0.5m grid
      my = Math.round(my * 2) / 2;
    }
    return { x: mx, y: my };
  }

  modelToCanvas(mx, my) {
    const cx = this.origin.x + mx * this.gridSize;
    const cy = this.origin.y - my * this.gridSize;
    return { x: cx, y: cy };
  }

  // Hit tests
  getNodeAt(cx, cy) {
    const threshold = 12;
    for (let node of this.nodes) {
      const { x, y } = this.modelToCanvas(node.x, node.y);
      const dist = Math.hypot(cx - x, cy - y);
      if (dist < threshold) return node.id;
    }
    return null;
  }

  getElementAt(cx, cy) {
    const threshold = 8;
    for (let el of this.elements) {
      const n1 = this.nodes.find(n => n.id === el.n1);
      const n2 = this.nodes.find(n => n.id === el.n2);
      if (!n1 || !n2) continue;

      const p1 = this.modelToCanvas(n1.x, n1.y);
      const p2 = this.modelToCanvas(n2.x, n2.y);

      // Distance from point to line segment
      const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) ** 2;
      if (l2 === 0) continue;

      let t = ((cx - p1.x) * (p2.x - p1.x) + (cy - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const dist = Math.hypot(cx - (p1.x + t * (p2.x - p1.x)), cy - (p1.y + t * (p2.y - p1.y)));

      if (dist < threshold) return el.id;
    }
    return null;
  }

  // Event handlers
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const { x, y } = this.canvasToModel(cx, cy);

    const hitNode = this.getNodeAt(cx, cy);

    if (e.button === 0) { // Left click
      if (this.tool === 'select') {
        if (hitNode) {
          this.selectedNodeId = hitNode;
          this.selectedElementId = null;
          this.draggedNodeId = hitNode;
        } else {
          const hitEl = this.getElementAt(cx, cy);
          if (hitEl) {
            this.selectedElementId = hitEl;
            this.selectedNodeId = null;
          } else {
            this.selectedNodeId = null;
            this.selectedElementId = null;
          }
        }
      } else if (this.tool === 'node') {
        if (!hitNode) {
          const newId = this.nodes.length > 0 ? Math.max(...this.nodes.map(n => n.id)) + 1 : 1;
          this.nodes.push({ id: newId, x, y, support: 'none', angle: 0 });
          this.selectedNodeId = newId;
          this.triggerChange();
        }
      } else if (['bar', 'beam', 'spring', 'frame'].includes(this.tool)) {
        if (hitNode) {
          this.isDrawing = true;
          this.drawStartNodeId = hitNode;
        }
      } else if (this.tool.startsWith('support_')) {
        if (hitNode) {
          const type = this.tool.substring('support_'.length);
          const node = this.nodes.find(n => n.id === hitNode);
          if (node) {
            node.support = node.support === type ? 'none' : type;
            node.angle = this.selectedSupportAngle;
            node.kSpring = this.selectedSupportSpringK;
            this.triggerChange();
          }
        }
      } else if (this.tool === 'force_point') {
        if (hitNode) {
          let force = this.forces.find(f => f.node === hitNode);
          if (!force) {
            force = { node: hitNode, px: 0, py: 0, m: 0 };
            this.forces.push(force);
          }
          // Default: toggle vertical force
          force.py = force.py !== 0 ? 0 : -10; // defaults to -10 (downward)
          this.triggerChange();
        }
      } else if (this.tool === 'force_moment') {
        if (hitNode) {
          let force = this.forces.find(f => f.node === hitNode);
          if (!force) {
            force = { node: hitNode, px: 0, py: 0, m: 0 };
            this.forces.push(force);
          }
          force.m = force.m !== 0 ? 0 : 5; // defaults to 5 (counter-clockwise)
          this.triggerChange();
        }
      } else if (this.tool === 'force_dist') {
        const hitEl = this.getElementAt(cx, cy);
        if (hitEl) {
          const el = this.elements.find(el => el.id === hitEl);
          if (el && el.type !== 'spring') {
            el.p0 = el.p0 ? 0 : -5; // Toggle distributed load
            el.pL = el.p0;
            this.triggerChange();
          }
        }
      }
    } else if (e.button === 2) { // Right click delete
      if (hitNode) {
        this.deleteNode(hitNode);
      } else {
        const hitEl = this.getElementAt(cx, cy);
        if (hitEl) this.deleteElement(hitEl);
      }
    }
    this.draw();
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;

    if (this.draggedNodeId) {
      const { x, y } = this.canvasToModel(this.mousePos.x, this.mousePos.y);
      const node = this.nodes.find(n => n.id === this.draggedNodeId);
      if (node) {
        node.x = x;
        node.y = y;
        this.triggerChange();
      }
    }
    this.draw();
  }

  onMouseUp(e) {
    if (this.isDrawing && this.drawStartNodeId) {
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const hitNode = this.getNodeAt(cx, cy);

      if (hitNode && hitNode !== this.drawStartNodeId) {
        // Prevent duplicate elements
        const duplicate = this.elements.find(el => 
          (el.n1 === this.drawStartNodeId && el.n2 === hitNode) || 
          (el.n2 === this.drawStartNodeId && el.n1 === hitNode)
        );

        if (!duplicate) {
          const newId = this.elements.length > 0 ? Math.max(...this.elements.map(el => el.id)) + 1 : 1;
          this.elements.push({
            id: newId,
            type: this.tool,
            n1: this.drawStartNodeId,
            n2: hitNode,
            E: 1, A: 1, I: 1, L: 0, p0: 0, pL: 0, py: ''
          });
          this.selectedElementId = newId;
          this.triggerChange();
        }
      }
    }
    this.draggedNodeId = null;
    this.isDrawing = false;
    this.drawStartNodeId = null;
    this.draw();
  }

  deleteNode(id) {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.elements = this.elements.filter(el => el.n1 !== id && el.n2 !== id);
    this.forces = this.forces.filter(f => f.node !== id);
    if (this.selectedNodeId === id) this.selectedNodeId = null;
    this.triggerChange();
  }

  deleteElement(id) {
    this.elements = this.elements.filter(el => el.id !== id);
    if (this.selectedElementId === id) this.selectedElementId = null;
    this.triggerChange();
  }

  triggerChange() {
    if (this.onChange) {
      this.onChange(this.nodes, this.elements, this.forces);
    }
  }

  // Animation loop
  animate() {
    this.animationTime += 0.05;
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  // Drawing routines
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background grid
    this.drawGrid();

    // Draw elements
    this.elements.forEach(el => this.drawElement(el));

    // Draw distributed forces
    this.elements.forEach(el => this.drawDistributedForce(el));

    // Draw node supports
    this.nodes.forEach(node => this.drawSupport(node));

    // Draw point forces and moments
    this.forces.forEach(f => this.drawPointForce(f));

    // Draw nodes
    this.nodes.forEach(node => this.drawNode(node));

    // Draw temp connection line while drawing
    if (this.isDrawing && this.drawStartNodeId) {
      const startNode = this.nodes.find(n => n.id === this.drawStartNodeId);
      if (startNode) {
        const p1 = this.modelToCanvas(startNode.x, startNode.y);
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }
  }

  drawGrid() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    // Draw vertical grid lines
    const startX = this.origin.x % this.gridSize;
    for (let x = startX; x < w; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }

    // Draw horizontal grid lines
    const startY = this.origin.y % this.gridSize;
    for (let y = startY; y < h; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // Draw axes
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1.5;

    // X Axis
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.origin.y);
    this.ctx.lineTo(w, this.origin.y);
    this.ctx.stroke();

    // Y Axis
    this.ctx.beginPath();
    this.ctx.moveTo(this.origin.x, 0);
    this.ctx.lineTo(this.origin.x, h);
    this.ctx.stroke();
  }

  getNodePositionAnimated(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    if (this.animationModeIdx === null || this.animationModeIdx < 0 || this.modeShapes.length <= this.animationModeIdx) {
      return this.modelToCanvas(node.x, node.y);
    }

    // Vibration mode vector offsets
    const phi = this.modeShapes[this.animationModeIdx];
    if (!phi) return this.modelToCanvas(node.x, node.y);

    // Map active DOFs back to node degrees of freedom
    // In our simplified animator, let's assume global node displacement DOFs match sequence
    // Node index mapping: Node index in this.nodes.
    // For 2D Bars: Node 1 has DOFs, Node 2 has DOFs etc.
    // Actually, to make it perfectly robust, let's use a simpler heuristic for animation:
    // If the solver solved active DOFs, we match them:
    // Let's check node's indices.
    const nodeIndex = this.nodes.indexOf(node);
    let dx = 0, dy = 0;

    // Heuristics based on structural type:
    // In Barra2D: node has dofs. By looking at the active model DOFs or node index:
    // Since we know the global active DOFs are mapped, a simpler way is to map the node index
    // directly. E.g. node 1 -> DOFs (1,2), node 2 -> DOFs (3,4) etc.
    // Let's assume DOFs are sequential: 2 DOFs per node (u, v) for Barra2D / Springs / Vigas.
    // Let's look up elements to see how DOFs are numbered.
    // To make it robust:
    // If nDof is 2 (e.g. Exercise 1), only node D (node 4) is free (active dofs 1, 2)
    // So phi[0] is Node 4 u, phi[1] is Node 4 v.
    // Let's find node's active DOFs. Let's look at elements `dofs` array!
    let dofs = [0, 0, 0]; // x, y, rot
    for (let el of this.elements) {
      if (el.n1 === nodeId) {
        dofs = el.dofs.slice(0, 3);
        break;
      }
      if (el.n2 === nodeId) {
        dofs = el.dofs.slice(2, 5); // wait, for beams and bars, dofs are 4 entries, frame is 6
        if (el.type === 'frame') dofs = el.dofs.slice(3, 6);
        else if (el.type === 'bar') dofs = [el.dofs[2], el.dofs[3], 0];
        else if (el.type === 'beam') dofs = [0, el.dofs[2], el.dofs[3]];
        break;
      }
    }

    if (dofs[0] > 0 && dofs[0] <= phi.length) dx = phi[dofs[0] - 1];
    if (dofs[1] > 0 && dofs[1] <= phi.length) dy = phi[dofs[1] - 1];
    // In Vigas, vertical deflection is DOF[0] or DOF[2]. For our standard nodes, we map Y offset:
    if (dy === 0 && dofs[0] === 0 && dofs[1] > 0 && dofs[1] <= phi.length) {
      dy = phi[dofs[1] - 1]; // e.g. for Vigas, DOF 1 is vertical displacement
    }

    const t = Math.sin(this.animationTime);
    const canvasNode = this.modelToCanvas(node.x, node.y);
    return {
      x: canvasNode.x + dx * this.animationAmplitude * t,
      y: canvasNode.y - dy * this.animationAmplitude * t // subtract since canvas Y is down
    };
  }

  drawNode(node) {
    const { x, y } = this.getNodePositionAnimated(node.id);
    const isSelected = this.selectedNodeId === node.id;

    this.ctx.beginPath();
    this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
    this.ctx.fillStyle = isSelected ? '#a3e635' : '#1e293b'; // Neon green if selected, dark slate otherwise
    this.ctx.strokeStyle = isSelected ? '#ffffff' : '#38bdf8'; // Electric blue border
    this.ctx.lineWidth = 2.5;
    this.ctx.fill();
    this.ctx.stroke();

    // Node label
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '10px Inter';
    this.ctx.fillText(`N${node.id}`, x + 10, y - 8);
  }

  drawElement(el) {
    const n1 = this.nodes.find(n => n.id === el.n1);
    const n2 = this.nodes.find(n => n.id === el.n2);
    if (!n1 || !n2) return;

    const p1 = this.getNodePositionAnimated(n1.id);
    const p2 = this.getNodePositionAnimated(n2.id);

    const isSelected = this.selectedElementId === el.id;

    this.ctx.beginPath();
    this.ctx.strokeStyle = isSelected ? '#a3e635' : (el.type === 'spring' ? '#fbbf24' : '#e2e8f0');

    if (el.type === 'spring') {
      // Draw spring zig-zag
      this.drawSpringBetween(p1.x, p1.y, p2.x, p2.y);
    } else if (el.type === 'bar') {
      this.ctx.lineWidth = 3;
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    } else if (el.type === 'beam') {
      this.ctx.lineWidth = 6;
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    } else if (el.type === 'frame') {
      // Draw double line for frame element
      this.ctx.lineWidth = 5;
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
      this.ctx.strokeStyle = '#0f172a';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
  }

  drawSpringBetween(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    this.ctx.save();
    this.ctx.translate(x1, y1);
    this.ctx.rotate(angle);

    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);

    const segments = 10;
    const segW = len / segments;
    const segH = 10;

    this.ctx.lineTo(segW, 0);
    for (let i = 1; i < segments - 1; i++) {
      const sx = i * segW;
      const sy = (i % 2 === 0) ? -segH : segH;
      this.ctx.lineTo(sx + segW / 2, sy);
    }
    this.ctx.lineTo((segments - 1) * segW, 0);
    this.ctx.lineTo(len, 0);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawSupport(node) {
    if (node.support === 'none') return;

    const { x, y } = this.getNodePositionAnimated(node.id);
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(node.angle * Math.PI / 180);

    this.ctx.strokeStyle = '#38bdf8'; // Electric blue
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    this.ctx.lineWidth = 2;

    if (node.support === 'fixed') {
      // Fixed clamp hatching
      this.ctx.beginPath();
      this.ctx.moveTo(0, -15);
      this.ctx.lineTo(0, 15);
      this.ctx.stroke();

      this.ctx.beginPath();
      for (let i = -15; i <= 15; i += 6) {
        this.ctx.moveTo(0, i);
        this.ctx.lineTo(-6, i - 6);
      }
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      this.ctx.stroke();
    } else if (node.support === 'pinned') {
      // Pinned triangle support
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-12, -10);
      this.ctx.lineTo(-12, 10);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Hatching line behind
      this.ctx.beginPath();
      this.ctx.moveTo(-12, -15);
      this.ctx.lineTo(-12, 15);
      this.ctx.stroke();
      this.ctx.beginPath();
      for (let i = -15; i <= 15; i += 6) {
        this.ctx.moveTo(-12, i);
        this.ctx.lineTo(-17, i - 4);
      }
      this.ctx.stroke();
    } else if (node.support === 'rollerY') {
      // Roller Y (horizontal roller, constrains vertical Y)
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-12, -10);
      this.ctx.lineTo(-12, 10);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Draw rollers (circles)
      this.ctx.beginPath();
      this.ctx.arc(-15, -6, 3, 0, 2 * Math.PI);
      this.ctx.arc(-15, 6, 3, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Hatching ground line
      this.ctx.beginPath();
      this.ctx.moveTo(-18, -15);
      this.ctx.lineTo(-18, 15);
      this.ctx.stroke();
    } else if (node.support === 'rollerX') {
      // Roller X (vertical roller, constrains horizontal X)
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-10, -12);
      this.ctx.lineTo(10, -12);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(-6, -15, 3, 0, 2 * Math.PI);
      this.ctx.arc(6, -15, 3, 0, 2 * Math.PI);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(-15, -18);
      this.ctx.lineTo(15, -18);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawPointForce(f) {
    const node = this.nodes.find(n => n.id === f.node);
    if (!node) return;

    const { x, y } = this.getNodePositionAnimated(node.id);

    this.ctx.lineWidth = 2.5;

    // Draw horizontal force Px
    if (f.px && f.px !== 0) {
      this.ctx.strokeStyle = '#f43f5e'; // Hot pink for force
      this.ctx.fillStyle = '#f43f5e';
      const dir = f.px > 0 ? 1 : -1;
      const startX = x - dir * 40;

      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(x - dir * 6, y);
      this.ctx.stroke();

      // Arrowhead
      this.ctx.beginPath();
      this.ctx.moveTo(x - dir * 6, y);
      this.ctx.lineTo(x - dir * 14, y - 5);
      this.ctx.lineTo(x - dir * 14, y + 5);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.font = 'bold 11px Inter';
      this.ctx.fillText(`${f.px > 0 ? '' : '-'}${Math.abs(f.px)}P`, startX, y - 8);
    }

    // Draw vertical force Py
    if (f.py && f.py !== 0) {
      this.ctx.strokeStyle = '#f43f5e';
      this.ctx.fillStyle = '#f43f5e';
      const dir = f.py > 0 ? 1 : -1; // up is positive, but canvas Y is down
      const startY = y + dir * 40; // reverse direction in canvas coords

      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, y + dir * 6);
      this.ctx.stroke();

      // Arrowhead
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + dir * 6);
      this.ctx.lineTo(x - 5, y + dir * 14);
      this.ctx.lineTo(x + 5, y + dir * 14);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.font = 'bold 11px Inter';
      this.ctx.fillText(`${f.py > 0 ? '' : '-'}${Math.abs(f.py)}P`, x + 8, startY);
    }

    // Draw moment
    if (f.m && f.m !== 0) {
      this.ctx.strokeStyle = '#ec4899'; // Magenta
      this.ctx.fillStyle = '#ec4899';
      const isCCW = f.m > 0;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 16, 0.25 * Math.PI, 1.75 * Math.PI, !isCCW);
      this.ctx.stroke();

      // Arrow head at end of arc
      this.ctx.save();
      this.ctx.translate(x + 16 * Math.cos(1.75 * Math.PI), y + 16 * Math.sin(1.75 * Math.PI));
      this.ctx.rotate((isCCW ? 45 : -45) * Math.PI / 180);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-6, -3);
      this.ctx.lineTo(-6, 3);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.font = 'bold 11px Inter';
      this.ctx.fillText(`${f.m}M`, x - 25, y - 22);
    }
  }

  drawDistributedForce(el) {
    if (el.type === 'spring' || (!el.p0 && !el.pL)) return;

    const n1 = this.nodes.find(n => n.id === el.n1);
    const n2 = this.nodes.find(n => n.id === el.n2);
    if (!n1 || !n2) return;

    const p1 = this.getNodePositionAnimated(n1.id);
    const p2 = this.getNodePositionAnimated(n2.id);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const load0 = el.p0 || 0;
    const loadL = el.pL || 0;
    if (load0 === 0 && loadL === 0) return;

    this.ctx.save();
    this.ctx.translate(p1.x, p1.y);
    this.ctx.rotate(angle);

    this.ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)'; // Semi-transparent pink
    this.ctx.lineWidth = 1.5;

    // Draw distributed profile line
    const loadScale = 5; // pixels per load unit
    const h0 = -load0 * loadScale;
    const hL = -loadL * loadScale;

    this.ctx.beginPath();
    this.ctx.moveTo(0, h0);
    this.ctx.lineTo(len, hL);
    this.ctx.stroke();

    // Fill polygon
    this.ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(0, h0);
    this.ctx.lineTo(len, hL);
    this.ctx.lineTo(len, 0);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw little load arrows
    const numArrows = Math.max(3, Math.floor(len / 20));
    for (let i = 0; i <= numArrows; i++) {
      const t = i / numArrows;
      const x = t * len;
      const h = h0 + t * (hL - h0);

      this.ctx.beginPath();
      this.ctx.moveTo(x, h);
      this.ctx.lineTo(x, 0);
      this.ctx.stroke();

      // Arrow head pointing to element
      const dir = h > 0 ? 1 : -1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x - 3, dir * 5);
      this.ctx.lineTo(x + 3, dir * 5);
      this.ctx.closePath();
      this.ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      this.ctx.fill();
    }

    // Draw label
    this.ctx.fillStyle = '#f43f5e';
    this.ctx.font = '10px Inter';
    const midX = len / 2;
    const midH = (h0 + hL) / 2;
    this.ctx.fillText(`p(x)`, midX - 10, midH - 6);

    this.ctx.restore();
  }
}
