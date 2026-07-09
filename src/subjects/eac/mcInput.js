// Connectivity Matrix (m.c.) Spreadsheet Table Input for EAC

export class EacMcInput {
  constructor(containerElement, onChange) {
    this.container = containerElement;
    this.onChange = onChange;
    this.type = 'barra2d';
    this.nodes = [];
    this.elements = [];
    this.forces = [];
    this.activeOption = 1;
  }

  setModel(type, nodes, elements, forces) {
    this.type = type;
    this.nodes = nodes || [];
    this.elements = elements || [];
    this.forces = forces || [];
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    
    // Renders spreadsheet layout
    const wrapper = document.createElement('div');
    wrapper.className = 'mc-grid-wrapper';

    // 1. Title section
    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold mb-3 text-slate-200';
    title.innerText = 'Matriz de Código (m.c.) & Propriedades';
    wrapper.appendChild(title);

    // 2. Main Connectivity Table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'overflow-x-auto mb-6 glass-panel rounded-xl p-2';
    
    const table = this.createConnectivityTable();
    tableContainer.appendChild(table);
    wrapper.appendChild(tableContainer);

    // 3. Action Buttons for table
    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-3 mb-6';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.innerText = '+ Adicionar Elemento';
    addBtn.onclick = () => this.addElementRow();
    btnRow.appendChild(addBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-danger';
    clearBtn.innerText = 'Limpar Tudo';
    clearBtn.onclick = () => this.clearAll();
    btnRow.appendChild(clearBtn);
    
    wrapper.appendChild(btnRow);

    // 4. Force/Nodal Table
    const forceTitle = document.createElement('h3');
    forceTitle.className = 'text-lg font-semibold mb-3 text-slate-200';
    forceTitle.innerText = 'Forças e Momentos Nodais Aplicados';
    wrapper.appendChild(forceTitle);

    const forceTableContainer = document.createElement('div');
    forceTableContainer.className = 'overflow-x-auto glass-panel rounded-xl p-2';
    const forceTable = this.createForceTable();
    forceTableContainer.appendChild(forceTable);
    wrapper.appendChild(forceTableContainer);

    this.container.appendChild(wrapper);
  }

  createConnectivityTable() {
    const table = document.createElement('table');
    table.className = 'mc-table w-full text-left border-collapse';

    // Header columns based on structure type
    let cols = [];
    if (this.type === 'mola') {
      cols = ['Elemento', 'Nó i (U1)', 'Nó j (U2)', 'Rigidez k'];
    } else if (this.type === 'barra2d') {
      cols = ['M.E.', 'U1', 'V1', 'U2', 'V2', 'θ1 (°)', 'θ2 (°)', 'Compr. L', 'Rigidez E', 'Área A'];
    } else if (this.type === 'viga') {
      cols = ['Elemento', 'v1', 'θ1', 'v2', 'θ2', 'Compr. L', 'E', 'Inércia I', 'Área A'];
    } else if (this.type === 'vigabarra2d') {
      cols = ['M.E.', 'u1', 'v1', 'θ1', 'u2', 'v2', 'θ2', 'Compr. L', 'E', 'Área A', 'Inércia I', 'Ângulo θ (°)'];
    }

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'border-b border-slate-700 text-slate-400 font-semibold';
    cols.forEach(col => {
      const th = document.createElement('th');
      th.className = 'p-3 text-xs uppercase tracking-wider';
      th.innerText = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.elements.forEach((el, index) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-800 hover:bg-slate-800/40 transition-colors';

      // Columns cell builders
      const cells = [];

      // 1. Element index label
      const tdIdx = document.createElement('td');
      tdIdx.className = 'p-3 font-semibold text-slate-300';
      tdIdx.innerText = `(${index + 1})`;
      cells.push(tdIdx);

      // Element-specific columns mapping
      const dofs = el.dofs || [];
      if (this.type === 'mola') {
        cells.push(this.createInputCell(el.n1, 'number', (val) => el.n1 = parseInt(val) || 0));
        cells.push(this.createInputCell(el.n2, 'number', (val) => el.n2 = parseInt(val) || 0));
        cells.push(this.createInputCell(el.k || el.E || 1, 'number', (val) => el.k = el.E = parseFloat(val) || 0));
      } else if (this.type === 'barra2d') {
        for (let i = 0; i < 4; i++) {
          cells.push(this.createDofInputCell(dofs[i], (val) => this.setElementDof(el, i, val)));
        }
        cells.push(this.createInputCell(el.th1 !== undefined ? el.th1 : (el.theta || 0), 'number', (val) => el.th1 = el.theta = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.th2 !== undefined ? el.th2 : (el.theta || 0), 'number', (val) => el.th2 = el.theta = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.L || 1, 'number', (val) => el.L = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.E || 1, 'number', (val) => el.E = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.A || 1, 'number', (val) => el.A = parseFloat(val) || 0));
      } else if (this.type === 'viga') {
        for (let i = 0; i < 4; i++) {
          cells.push(this.createDofInputCell(dofs[i], (val) => this.setElementDof(el, i, val)));
        }
        cells.push(this.createInputCell(el.L || 1, 'number', (val) => el.L = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.E || 1, 'number', (val) => el.E = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.I || 1, 'number', (val) => el.I = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.A || 1, 'number', (val) => el.A = parseFloat(val) || 0));
      } else if (this.type === 'vigabarra2d') {
        for (let i = 0; i < 6; i++) {
          cells.push(this.createDofInputCell(dofs[i], (val) => this.setElementDof(el, i, val)));
        }
        cells.push(this.createInputCell(el.L || 1, 'number', (val) => el.L = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.E || 1, 'number', (val) => el.E = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.A || 1, 'number', (val) => el.A = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.I || 1, 'number', (val) => el.I = parseFloat(val) || 0));
        cells.push(this.createInputCell(el.theta || 0, 'number', (val) => el.theta = parseFloat(val) || 0));
      }

      // Delete action button cell
      const tdDel = document.createElement('td');
      tdDel.className = 'p-3 text-right';
      const delBtn = document.createElement('button');
      delBtn.className = 'text-rose-500 hover:text-rose-400 font-bold p-1 text-sm';
      delBtn.innerHTML = '&times;';
      delBtn.onclick = () => this.deleteElementRow(index);
      tdDel.appendChild(delBtn);
      cells.push(tdDel);

      cells.forEach(c => tr.appendChild(c));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  }

  createForceTable() {
    const table = document.createElement('table');
    table.className = 'mc-table w-full text-left border-collapse';

    const maxNodes = this.nodes.length;
    if (maxNodes === 0) {
      const p = document.createElement('p');
      p.className = 'text-slate-500 p-4 text-center';
      p.innerText = 'Crie nós no editor 2D para aplicar forças.';
      return p;
    }

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'border-b border-slate-700 text-slate-400 font-semibold';
    
    const cols = ['Nó', 'Força Horizontal Px', 'Força Vertical Py', 'Momento M'];
    cols.forEach(col => {
      const th = document.createElement('th');
      th.className = 'p-3 text-xs uppercase tracking-wider';
      th.innerText = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.nodes.forEach(node => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-800 hover:bg-slate-800/40 transition-colors';

      let force = this.forces.find(f => f.node === node.id);
      if (!force) {
        force = { node: node.id, px: 0, py: 0, m: 0 };
        this.forces.push(force);
      }

      const tdNode = document.createElement('td');
      tdNode.className = 'p-3 font-semibold text-slate-300';
      tdNode.innerText = `Nó ${node.id}`;
      tr.appendChild(tdNode);

      tr.appendChild(this.createInputCell(force.px, 'number', (val) => {
        force.px = parseFloat(val) || 0;
        this.triggerChange();
      }));
      tr.appendChild(this.createInputCell(force.py, 'number', (val) => {
        force.py = parseFloat(val) || 0;
        this.triggerChange();
      }));
      tr.appendChild(this.createInputCell(force.m, 'number', (val) => {
        force.m = parseFloat(val) || 0;
        this.triggerChange();
      }));

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  }

  createInputCell(val, type, callback) {
    const td = document.createElement('td');
    td.className = 'p-2';
    const input = document.createElement('input');
    input.type = type;
    input.value = val === undefined ? '' : val;
    input.className = 'w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded px-2 py-1 text-slate-200 outline-none text-sm';
    input.onchange = (e) => {
      callback(e.target.value);
      this.triggerChange();
    };
    td.appendChild(input);
    return td;
  }

  createDofInputCell(val, callback) {
    const td = document.createElement('td');
    td.className = 'p-2';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = (val === undefined || val === 0) ? '-' : val;
    input.className = 'w-16 bg-slate-900 border border-slate-800 focus:border-sky-500 rounded px-2 py-1 text-slate-200 outline-none text-center text-sm';
    input.onchange = (e) => {
      let v = e.target.value.trim();
      if (v === '-' || v === '') {
        callback(0);
      } else {
        callback(parseInt(v) || 0);
      }
      this.triggerChange();
    };
    td.appendChild(input);
    return td;
  }

  setElementDof(el, idx, val) {
    el.dofs = el.dofs || [0, 0, 0, 0, 0, 0];
    el.dofs[idx] = val;
    this.syncNodeSupportsFromDofs();
  }

  // Auto-deduce node supports from Connectivity Matrix (m.c.) DOFs
  syncNodeSupportsFromDofs() {
    // Generate nodes list dynamically if editing m.c. table adds undefined node indices
    const nodeDofs = {}; // nodeId -> array of constraints
    this.elements.forEach(el => {
      const dofs = el.dofs || [];
      const n1 = el.n1 || 1;
      const n2 = el.n2 || 2;

      // Group dofs by node
      if (this.type === 'barra2d') {
        nodeDofs[n1] = nodeDofs[n1] || [dofs[0], dofs[1]];
        nodeDofs[n2] = nodeDofs[n2] || [dofs[2], dofs[3]];
      } else if (this.type === 'viga') {
        nodeDofs[n1] = nodeDofs[n1] || [0, dofs[0], dofs[1]]; // vertical, rot
        nodeDofs[n2] = nodeDofs[n2] || [0, dofs[2], dofs[3]];
      } else if (this.type === 'vigabarra2d') {
        nodeDofs[n1] = nodeDofs[n1] || [dofs[0], dofs[1], dofs[2]];
        nodeDofs[n2] = nodeDofs[n2] || [dofs[3], dofs[4], dofs[5]];
      }
    });

    // Update node supports
    for (let id in nodeDofs) {
      const nid = parseInt(id);
      let node = this.nodes.find(n => n.id === nid);
      if (!node) {
        // Create node on the fly
        node = { id: nid, x: nid - 1, y: 0, support: 'none', angle: 0 };
        this.nodes.push(node);
      }

      const d = nodeDofs[id];
      if (this.type === 'barra2d') {
        // 2 active coordinates [u, v]
        if (d[0] === 0 && d[1] === 0) node.support = 'pinned';
        else if (d[0] > 0 && d[1] === 0) node.support = 'rollerY';
        else if (d[0] === 0 && d[1] > 0) node.support = 'rollerX';
        else node.support = 'none';
      } else if (this.type === 'viga') {
        // [u, v, rot] - note: u is 0 for beams
        const v = d[1];
        const r = d[2];
        if (v === 0 && r === 0) node.support = 'fixed';
        else if (v === 0 && r > 0) node.support = 'pinned'; // constrained vertical deflection
        else if (v > 0 && r === 0) node.support = 'none'; // free vertical, constrained rotation is rare but none is default
        else node.support = 'none';
      } else if (this.type === 'vigabarra2d') {
        // 3 active coords [u, v, rot]
        if (d[0] === 0 && d[1] === 0 && d[2] === 0) node.support = 'fixed';
        else if (d[0] === 0 && d[1] === 0 && d[2] > 0) node.support = 'pinned';
        else if (d[0] > 0 && d[1] === 0 && d[2] > 0) node.support = 'rollerY';
        else if (d[0] === 0 && d[1] > 0 && d[2] > 0) node.support = 'rollerX';
        else node.support = 'none';
      }
    }
  }

  addElementRow() {
    const newId = this.elements.length > 0 ? Math.max(...this.elements.map(el => el.id)) + 1 : 1;
    let newEl = {
      id: newId,
      type: this.type === 'mola' ? 'spring' : (this.type === 'viga' ? 'beam' : (this.type === 'vigabarra2d' ? 'frame' : 'bar')),
      n1: 1,
      n2: 2,
      dofs: this.type === 'vigabarra2d' ? [0, 0, 0, 0, 0, 0] : [0, 0, 0, 0],
      E: 1, A: 1, I: 1, L: 1, p0: 0, pL: 0, py: ''
    };
    
    // Auto populate default nodes if they don't exist
    if (this.nodes.length < 2) {
      if (this.nodes.length === 0) this.nodes.push({ id: 1, x: 0, y: 0, support: 'none', angle: 0 });
      if (this.nodes.length === 1) this.nodes.push({ id: 2, x: 1, y: 0, support: 'none', angle: 0 });
    }

    newEl.n1 = this.nodes[0].id;
    newEl.n2 = this.nodes[1].id;

    this.elements.push(newEl);
    this.syncNodeSupportsFromDofs();
    this.triggerChange();
    this.render();
  }

  deleteElementRow(index) {
    this.elements.splice(index, 1);
    this.triggerChange();
    this.render();
  }

  clearAll() {
    this.elements = [];
    this.nodes = [];
    this.forces = [];
    this.triggerChange();
    this.render();
  }

  triggerChange() {
    if (this.onChange) {
      this.onChange(this.nodes, this.elements, this.forces);
    }
  }
}
