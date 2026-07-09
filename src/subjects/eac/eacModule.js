// EAC (Estruturas de Alma Cheia) Subject Module
// Implements visual editing, table input, solving, and math rendering for EAC

import { SubjectTemplate } from '../subjectTemplate.js';
import { EacEditor } from './editor.js';
import { EacMcInput } from './mcInput.js';
import { solveEac } from './solver.js';
import { saveExercise, loadExercise, listExercises } from '../../core/storage.js';

export class EacModule extends SubjectTemplate {
  constructor(containerElement, onModelChange) {
    super(containerElement, onModelChange);
    this.id = 'eac';
    this.name = 'Estruturas de Alma Cheia (EAC)';

    // State
    this.subType = 'barra2d'; // barra2d, viga, mola, vigabarra2d
    this.activeOption = 1; // 1: displacements, 2: stresses/efforts, 3: deflection along bar, 4: critical zone, 5: vibrations
    
    this.activeBar = 1; // selected bar for detail options
    this.activeX = 0.5; // selected x coordinate along bar

    // Component instances
    this.editor = null;
    this.mcInput = null;
    
    // Loaded structure definitions
    this.nodes = [];
    this.elements = [];
    this.forces = [];
    
    // Solver output
    this.solvedResult = null;
  }

  initialize() {
    this.container.innerHTML = '';

    // Set default exercise based on subType
    this.loadDefaultModel();

    // Create dual-column UI shell
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch';

    // Left column: workspace (editor or table)
    const leftCol = document.createElement('div');
    leftCol.className = 'lg:col-span-7 flex flex-col gap-4';

    // Tab buttons for Workspace (Editor / Table)
    const wsHeader = document.createElement('div');
    wsHeader.className = 'flex justify-between items-center bg-[var(--bg-main)] p-1.5 rounded-xl border border-[var(--panel-border)]';

    const wsTabs = document.createElement('div');
    wsTabs.className = 'flex gap-2';

    const editorTabBtn = document.createElement('button');
    editorTabBtn.className = 'tab-btn active';
    editorTabBtn.innerText = 'Modelador Visual 2D';
    editorTabBtn.id = 'tab-editor-btn';

    const tableTabBtn = document.createElement('button');
    tableTabBtn.className = 'tab-btn';
    tableTabBtn.innerText = 'Matriz de Código (m.c.)';
    tableTabBtn.id = 'tab-table-btn';

    wsTabs.appendChild(editorTabBtn);
    wsTabs.appendChild(tableTabBtn);
    wsHeader.appendChild(wsTabs);

    // Structural subType selectors
    const subTypeSelect = document.createElement('select');
    subTypeSelect.className = 'select-input text-sm py-1 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';
    subTypeSelect.innerHTML = `
      <option value="barra2d">Treliças (Barras 2D)</option>
      <option value="viga">Vigas (Flexão 1D)</option>
      <option value="mola">Sistemas de Molas</option>
      <option value="vigabarra2d">Pórticos (Viga-Barra 2D)</option>
    `;
    subTypeSelect.value = this.subType;
    subTypeSelect.onchange = (e) => {
      this.subType = e.target.value;
      this.loadDefaultModel();
      this.solve();
      this.renderWorkspace();
    };
    wsHeader.appendChild(subTypeSelect);
    leftCol.appendChild(wsHeader);

    // Workspace panels container
    const wsContent = document.createElement('div');
    wsContent.className = 'flex-1 min-h-[460px] relative glass-panel rounded-2xl overflow-hidden';
    
    // Editor Panel
    const editorPanel = document.createElement('div');
    editorPanel.className = 'absolute inset-0 flex flex-col';
    editorPanel.id = 'panel-editor';
    
    // Add editor toolbar
    const toolbar = this.createEditorToolbar();
    editorPanel.appendChild(toolbar);

    const canvas = document.createElement('canvas');
    canvas.className = 'flex-1 bg-[#FAF8F5] block outline-none cursor-crosshair';
    editorPanel.appendChild(canvas);
    wsContent.appendChild(editorPanel);

    // Table Input Panel
    const tablePanel = document.createElement('div');
    tablePanel.className = 'absolute inset-0 overflow-y-auto p-4 hidden';
    tablePanel.id = 'panel-table';
    wsContent.appendChild(tablePanel);

    leftCol.appendChild(wsContent);
    grid.appendChild(leftCol);

    // Right column: resolution, options, storage
    const rightCol = document.createElement('div');
    rightCol.className = 'lg:col-span-5 flex flex-col gap-4';

    // Resolution options card
    const optionsCard = document.createElement('div');
    optionsCard.className = 'glass-panel rounded-2xl p-4 flex flex-col gap-3';
    
    const optTitle = document.createElement('h3');
    optTitle.className = 'text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1';
    optTitle.innerText = 'Resultados a Visualizar';
    optionsCard.appendChild(optTitle);

    const optList = document.createElement('div');
    optList.className = 'flex flex-col gap-2';
    optionsCard.appendChild(optList);

    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'btn btn-primary w-full mt-2 py-2.5 font-semibold';
    resolveBtn.innerText = 'Calcular Exercício';
    resolveBtn.onclick = () => this.solve();
    optionsCard.appendChild(resolveBtn);

    rightCol.appendChild(optionsCard);

    // Storage card
    const storageCard = this.createStoragePanel();
    rightCol.appendChild(storageCard);

    // Resolution output panel
    const resolutionCard = document.createElement('div');
    resolutionCard.className = 'flex-1 glass-panel rounded-2xl p-5 overflow-y-auto min-h-[300px] flex flex-col gap-4';
    resolutionCard.id = 'resolution-card';
    
    const resTitle = document.createElement('h3');
    resTitle.className = 'text-lg font-bold text-[var(--text-primary)] border-b border-[var(--panel-border)] pb-2 flex justify-between items-center';
    resTitle.innerHTML = '<span>Resolução Passo a Passo</span><span class="text-xs font-normal text-[var(--text-tertiary)]">M.F.E.</span>';
    resolutionCard.appendChild(resTitle);

    const resOutput = document.createElement('div');
    resOutput.id = 'resolution-output';
    resOutput.className = 'text-[var(--text-primary)] space-y-4 text-sm leading-relaxed';
    resolutionCard.appendChild(resOutput);

    rightCol.appendChild(resolutionCard);
    grid.appendChild(rightCol);

    this.container.appendChild(grid);

    // Initialize Canvas Editor instance
    this.editor = new EacEditor(canvas, (nodes, elements, forces) => {
      this.nodes = nodes;
      this.elements = elements;
      this.forces = forces;
      // sync to table if table panel is open, or it will sync on tab open
      if (this.mcInput) {
        this.mcInput.setModel(this.subType, this.nodes, this.elements, this.forces);
      }
      this.solveSilently();
    });
    this.editor.setModel(this.nodes, this.elements, this.forces);

    // Initialize m.c. input helper
    this.mcInput = new EacMcInput(tablePanel, (nodes, elements, forces) => {
      this.nodes = nodes;
      this.elements = elements;
      this.forces = forces;
      // Sync to editor canvas
      if (this.editor) {
        this.editor.setModel(this.nodes, this.elements, this.forces);
      }
      this.solveSilently();
    });

    // Tab bindings
    editorTabBtn.onclick = () => {
      editorTabBtn.classList.add('active');
      tableTabBtn.classList.remove('active');
      editorPanel.classList.remove('hidden');
      tablePanel.classList.add('hidden');
      this.editor.resizeCanvas();
    };

    tableTabBtn.onclick = () => {
      tableTabBtn.classList.add('active');
      editorTabBtn.classList.remove('active');
      tablePanel.classList.remove('hidden');
      editorPanel.classList.add('hidden');
      this.mcInput.setModel(this.subType, this.nodes, this.elements, this.forces);
    };

    // Render workspace tabs and resolve initially
    this.renderWorkspace();
    this.solve();
  }

  renderWorkspace() {
    this.updateOptionsList();
    if (this.editor) {
      this.editor.setModel(this.nodes, this.elements, this.forces);
    }
  }

  updateOptionsList() {
    const list = this.container.querySelector('.flex.flex-col.gap-2');
    if (!list) return;

    let options = [
      { id: 1, label: 'Deslocamentos Nodais' },
      { id: 2, label: 'Esforço Normal / Tensões axial' },
      { id: 3, label: 'Deslocamento ao longo da barra' },
      { id: 4, label: 'Zona crítica (|σ| máximo)' },
      { id: 5, label: 'Frequências e Modos de vibração' }
    ];

    if (this.subType === 'viga') {
      options = [
        { id: 1, label: 'Deslocamentos e Rotações nodais' },
        { id: 2, label: 'Esforços e Momentos flectores' },
        { id: 3, label: 'Deslocamento e Rotação ao longo da viga' },
        { id: 5, label: 'Frequências e Modos de vibração' }
      ];
    } else if (this.subType === 'mola') {
      options = [
        { id: 1, label: 'Deslocamentos nodais' },
        { id: 2, label: 'Esforço nas molas' },
        { id: 5, label: 'Frequências e Modos de vibração' }
      ];
    } else if (this.subType === 'vigabarra2d') {
      options = [
        { id: 1, label: 'Deslocamentos e Rotações nodais' },
        { id: 2, label: 'Esforços (axial, corte, momento)' }
      ];
    }

    list.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `btn flex justify-between items-center text-left py-2 px-3 text-sm rounded-lg transition-all border ${
        this.activeOption === opt.id 
          ? 'bg-[var(--accent-glow)] border-[var(--accent)] text-[var(--accent-strong)] font-medium' 
          : 'bg-[var(--bg-card)] border-[var(--panel-border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]'
      }`;
      btn.innerHTML = `<span>${opt.label}</span>${this.activeOption === opt.id ? '<span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>' : ''}`;
      btn.onclick = () => {
        this.activeOption = opt.id;
        this.updateOptionsList();
        // check if sub-option inputs (activeBar or activeX) are needed
        this.renderSubOptions(opt.id);
        this.solve();
      };
      list.appendChild(btn);
    });

    this.renderSubOptions(this.activeOption);
  }

  renderSubOptions(optionId) {
    const list = this.container.querySelector('.flex.flex-col.gap-2');
    const existingSub = this.container.querySelector('#sub-options-panel');
    if (existingSub) existingSub.remove();

    if (optionId === 3 && (this.subType === 'barra2d' || this.subType === 'viga')) {
      const panel = document.createElement('div');
      panel.id = 'sub-options-panel';
      panel.className = 'mt-2 p-3 bg-[var(--bg-main)] border border-[var(--panel-border)] rounded-xl flex flex-col gap-2';

      const barSelect = document.createElement('div');
      barSelect.className = 'flex justify-between items-center';
      barSelect.innerHTML = `<span class="text-xs text-[var(--text-secondary)]">Selecionar elemento:</span>`;
      
      const select = document.createElement('select');
      select.className = 'select-input text-xs py-0.5 px-2 bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] rounded';
      this.elements.forEach((el, index) => {
        if (el.type !== 'spring') {
          select.innerHTML += `<option value="${index+1}">Elemento ${index+1}</option>`;
        }
      });
      select.value = this.activeBar;
      select.onchange = (e) => {
        this.activeBar = parseInt(e.target.value) || 1;
        this.solve();
      };
      barSelect.appendChild(select);
      panel.appendChild(barSelect);

      const xInput = document.createElement('div');
      xInput.className = 'flex justify-between items-center';
      xInput.innerHTML = `<span class="text-xs text-[var(--text-secondary)]">Coordenada x (coef. de L):</span>`;
      
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.1';
      input.min = '0';
      input.max = '2';
      input.value = this.activeX;
      input.className = 'w-16 text-center text-xs py-0.5 bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] rounded outline-none';
      input.onchange = (e) => {
        this.activeX = parseFloat(e.target.value) || 0.5;
        this.solve();
      };
      xInput.appendChild(input);
      panel.appendChild(xInput);

      list.appendChild(panel);
    }
  }

  createEditorToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'flex flex-wrap gap-1 p-2 bg-[var(--bg-main)] border-b border-[var(--panel-border)] items-center justify-between';

    const tools = [
      { id: 'select', label: 'Seleção', icon: '⬈' },
      { id: 'divider' },
      { id: 'node', label: 'Nó', icon: '●' },
      { id: 'bar', label: 'Barra 2D', icon: '╱' },
      { id: 'beam', label: 'Viga', icon: '▬' },
      { id: 'spring', label: 'Mola', icon: '⌇' },
      { id: 'frame', label: 'Frame', icon: '☲' },
      { id: 'divider' },
      { id: 'support_fixed', label: 'Encastrado', icon: '◫' },
      { id: 'support_pinned', label: 'Apoio Fixo', icon: '▲' },
      { id: 'support_rollerY', label: 'Apoio Móvel Y', icon: '⏏' },
      { id: 'support_rollerX', label: 'Apoio Móvel X', icon: '▷' },
      { id: 'divider' },
      { id: 'force_point', label: 'Força P', icon: '↓' },
      { id: 'force_moment', label: 'Momento M', icon: '↻' },
      { id: 'force_dist', label: 'Distribuída p', icon: '⬇⬇' }
    ];

    const group = document.createElement('div');
    group.className = 'flex flex-wrap gap-1 items-center';

    tools.forEach(t => {
      if (t.id === 'divider') {
        const div = document.createElement('div');
        div.className = 'w-[1px] h-6 bg-[var(--panel-border)] mx-1';
        group.appendChild(div);
        return;
      }

      const btn = document.createElement('button');
      btn.className = `tool-btn px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1.5 ${
        this.editor && this.editor.tool === t.id 
          ? 'bg-[var(--accent-glow)] border border-[var(--accent)] text-[var(--accent-strong)] font-medium' 
          : 'bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]'
      }`;
      btn.innerHTML = `<span class="text-sm font-semibold">${t.icon}</span> ${t.label}`;
      btn.onclick = () => {
        this.editor.tool = t.id;
        group.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('bg-[var(--accent-glow)]', 'border-[var(--accent)]', 'text-[var(--accent-strong)]', 'font-medium'));
        group.querySelectorAll('.tool-btn').forEach(b => b.classList.add('bg-[var(--bg-card)]', 'border-[var(--panel-border)]', 'text-[var(--text-secondary)]'));
        btn.classList.remove('bg-[var(--bg-card)]', 'border-[var(--panel-border)]', 'text-[var(--text-secondary)]');
        btn.classList.add('bg-[var(--accent-glow)]', 'border-[var(--accent)]', 'text-[var(--accent-strong)]', 'font-medium');
      };
      group.appendChild(btn);
    });

    toolbar.appendChild(group);

    // Inclined Support Rotator Input
    const anglePanel = document.createElement('div');
    anglePanel.className = 'flex gap-2 items-center text-xs text-[var(--text-secondary)]';
    anglePanel.innerHTML = `<span>Ângulo Apoio:</span>`;
    const angleInput = document.createElement('input');
    angleInput.type = 'number';
    angleInput.value = 0;
    angleInput.className = 'w-12 text-center py-0.5 bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] rounded';
    angleInput.onchange = (e) => {
      const val = parseFloat(e.target.value) || 0;
      if (this.editor) this.editor.selectedSupportAngle = val;
    };
    anglePanel.appendChild(angleInput);
    toolbar.appendChild(anglePanel);

    return toolbar;
  }

  createStoragePanel() {
    const card = document.createElement('div');
    card.className = 'glass-panel rounded-2xl p-4 flex flex-col gap-3';

    const title = document.createElement('h3');
    title.className = 'text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1';
    title.innerText = 'Gravar & Carregar Problemas';
    card.appendChild(title);

    const inputRow = document.createElement('div');
    inputRow.className = 'flex gap-2';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Nome do exercício...';
    nameInput.className = 'flex-1 bg-[var(--bg-card)] border border-[var(--panel-border)] focus:border-[var(--accent)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none';
    inputRow.appendChild(nameInput);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-secondary py-1.5 px-4 text-sm font-medium';
    saveBtn.innerText = 'Gravar';
    saveBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (name) {
        const state = this.saveState();
        const res = saveExercise(this.id, name, state);
        if (res.success) {
          nameInput.value = '';
          this.updateSavedList(select);
        }
      }
    };
    inputRow.appendChild(saveBtn);
    card.appendChild(inputRow);

    // List saved select dropdown
    const loadRow = document.createElement('div');
    loadRow.className = 'flex gap-2';

    const select = document.createElement('select');
    select.className = 'flex-1 bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm py-1.5 px-3 rounded-lg outline-none';
    loadRow.appendChild(select);

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-secondary py-1.5 px-4 text-sm font-medium';
    loadBtn.innerText = 'Carregar';
    loadBtn.onclick = () => {
      const name = select.value;
      if (name) {
        const state = loadExercise(this.id, name);
        if (state) {
          this.loadState(state);
        }
      }
    };
    loadRow.appendChild(loadBtn);
    card.appendChild(loadRow);

    this.updateSavedList(select);

    return card;
  }

  updateSavedList(select) {
    const list = listExercises(this.id);
    select.innerHTML = '<option value="">-- Carregar gravados --</option>';
    list.forEach(name => {
      select.innerHTML += `<option value="${name}">${name}</option>`;
    });
  }

  // Pre-load default structural exercises
  loadDefaultModel() {
    if (this.subType === 'barra2d') {
      // Treliça Exercício 1
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'pinned', angle: 0 },
        { id: 2, x: 2, y: 0, support: 'pinned', angle: 0 },
        { id: 3, x: 2, y: 2, support: 'pinned', angle: 0 },
        { id: 4, x: 0, y: 2, support: 'none', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'bar', n1: 1, n2: 4, dofs: [0, 0, 1, 2], E: 1, A: 1, L: 2, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'bar', n1: 2, n2: 4, dofs: [0, 0, 1, 2], E: 2, A: 1, L: 2.828, p0: 0, pL: 0, py: '' }, // theta = -45
        { id: 3, type: 'bar', n1: 3, n2: 4, dofs: [0, 0, 1, 2], E: 3, A: 1, L: 2, p0: 0, pL: 0, py: '' } // theta = 0
      ];
      this.forces = [
        { node: 4, px: 2, py: -1, m: 0 } // Point load 2P, -P at Node D (4)
      ];
    } else if (this.subType === 'viga') {
      // Simple Beam Exercício 7/8 representation
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 2, y: 0, support: 'none', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'beam', n1: 1, n2: 2, dofs: [0, 0, 0, 1], E: 1, A: 1, I: 1, L: 2, p0: -5, pL: -5, py: '' } // uniform distributed load
      ];
      this.forces = [];
    } else if (this.subType === 'mola') {
      // Springs System Exercício 14 representation
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'pinned', angle: 0 },
        { id: 2, x: 1.5, y: 0, support: 'none', angle: 0 },
        { id: 3, x: 3, y: 0, support: 'none', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'spring', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 0, p0: 0, pL: 0, py: '' }, // spring 1
        { id: 2, type: 'spring', n1: 2, n2: 3, E: 2, A: 1, I: 1, L: 0, p0: 0, pL: 0, py: '' }  // spring 2
      ];
      this.forces = [
        { node: 2, px: 0, py: -1, m: 0 }, // mass 1 load
        { node: 3, px: 0, py: -1, m: 0 }  // mass 2 load
      ];
    } else if (this.subType === 'vigabarra2d') {
      // Portal frame default example
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 0, y: 2, support: 'none', angle: 0 },
        { id: 3, x: 3, y: 2, support: 'none', angle: 0 },
        { id: 4, x: 3, y: 0, support: 'fixed', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'frame', n1: 1, n2: 2, dofs: [0, 0, 0, 1, 2, 3], E: 1, A: 1, I: 1, L: 2, theta: 90, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'frame', n1: 2, n2: 3, dofs: [1, 2, 3, 4, 5, 6], E: 1, A: 1, I: 1, L: 3, theta: 0, p0: -2, pL: -2, py: '' },
        { id: 3, type: 'frame', n1: 3, n2: 4, dofs: [4, 5, 6, 0, 0, 0], E: 1, A: 1, I: 1, L: 2, theta: -90, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 2, px: 5, py: 0, m: 0 } // side load on portal
      ];
    }
  }

  // Pre-calculate degrees of freedom (DOFs) numbering dynamically
  numberDofs() {
    let nextDof = 1;

    // Constrained DOFs get 0, free DOFs get sequential integers
    this.nodes.forEach(node => {
      node.dofIndices = [0, 0, 0]; // dx, dy, rot

      if (this.subType === 'mola') {
        // 1D axial displacement along X
        if (node.id > 1) { // Node 1 is the fixed wall (dof=0)
          node.dofIndices[0] = nextDof++;
        }
      } else if (this.subType === 'barra2d') {
        // 2D Truss: horizontal and vertical displacements
        if (node.support === 'none') {
          node.dofIndices[0] = nextDof++;
          node.dofIndices[1] = nextDof++;
        } else if (node.support === 'pinned') {
          node.dofIndices[0] = 0;
          node.dofIndices[1] = 0;
        } else if (node.support === 'rollerY') {
          node.dofIndices[0] = nextDof++; // free horizontal
          node.dofIndices[1] = 0;         // constrained vertical
        } else if (node.support === 'rollerX') {
          node.dofIndices[0] = 0;         // constrained horizontal
          node.dofIndices[1] = nextDof++; // free vertical
        }
      } else if (this.subType === 'viga') {
        // Beam: vertical displacement and rotation
        if (node.support === 'fixed') {
          node.dofIndices[1] = 0; // vertical constrained
          node.dofIndices[2] = 0; // rotation constrained
        } else if (node.support === 'pinned') {
          node.dofIndices[1] = 0; // vertical constrained
          node.dofIndices[2] = nextDof++; // rotation free
        } else {
          node.dofIndices[1] = nextDof++;
          node.dofIndices[2] = nextDof++;
        }
      } else if (this.subType === 'vigabarra2d') {
        // Frame: dx, dy, rotation
        if (node.support === 'fixed') {
          node.dofIndices[0] = 0;
          node.dofIndices[1] = 0;
          node.dofIndices[2] = 0;
        } else if (node.support === 'pinned') {
          node.dofIndices[0] = 0;
          node.dofIndices[1] = 0;
          node.dofIndices[2] = nextDof++;
        } else if (node.support === 'rollerY') {
          node.dofIndices[0] = nextDof++;
          node.dofIndices[1] = 0;
          node.dofIndices[2] = nextDof++;
        } else if (node.support === 'rollerX') {
          node.dofIndices[0] = 0;
          node.dofIndices[1] = nextDof++;
          node.dofIndices[2] = nextDof++;
        } else {
          node.dofIndices[0] = nextDof++;
          node.dofIndices[1] = nextDof++;
          node.dofIndices[2] = nextDof++;
        }
      }
    });

    const totalDof = nextDof - 1;

    // Apply DOF indices to element connectivity
    this.elements.forEach(el => {
      const n1 = this.nodes.find(n => n.id === el.n1);
      const n2 = this.nodes.find(n => n.id === el.n2);
      if (!n1 || !n2) return;

      // Auto-compute element length from coordinates if L not overridden
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy);
      if (el.L === 0 || !el.L) {
        el.L = parseFloat(dist.toFixed(3));
      }

      if (this.subType === 'mola') {
        el.dofs = [n1.dofIndices[0], n2.dofIndices[0]];
      } else if (this.subType === 'barra2d') {
        el.dofs = [n1.dofIndices[0], n1.dofIndices[1], n2.dofIndices[0], n2.dofIndices[1]];
        // Auto compute element angles
        const ang = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
        el.theta = ang;
        el.th1 = n1.angle || 0;
        el.th2 = n2.angle || 0;
      } else if (this.subType === 'viga') {
        el.dofs = [n1.dofIndices[1], n1.dofIndices[2], n2.dofIndices[1], n2.dofIndices[2]];
      } else if (this.subType === 'vigabarra2d') {
        el.dofs = [
          n1.dofIndices[0], n1.dofIndices[1], n1.dofIndices[2],
          n2.dofIndices[0], n2.dofIndices[1], n2.dofIndices[2]
        ];
        const ang = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
        el.theta = ang;
      }
    });

    return totalDof;
  }

  // Pre-solve silently when drawing to keep vibration anim arrays synchronized
  solveSilently() {
    const totalDof = this.numberDofs();
    const state = {
      type: this.subType,
      nMass: this.nodes.length,
      nSpring: this.elements.filter(el => el.type === 'spring').length,
      springs: this.elements.filter(el => el.type === 'spring').map(el => ({
        i: this.nodes.indexOf(this.nodes.find(n => n.id === el.n1)),
        j: this.nodes.indexOf(this.nodes.find(n => n.id === el.n2)),
        k: el.E
      })),
      masses: this.nodes.map(n => ({ m: 1 })), // default mass 1
      nBar: this.elements.length,
      nDof: totalDof,
      bars: this.elements,
      nElem: this.elements.length,
      elems: this.elements,
      forces: this.buildForcesVector(totalDof),
      activeOption: this.activeOption,
      activeBar: this.activeBar,
      activeX: this.activeX
    };

    try {
      this.solvedResult = solveEac(state);
      if (this.editor && this.solvedResult) {
        // Feed vibration eigenvalues and eigenvectors to editor animator
        if (this.activeOption === 5) {
          this.editor.setAnimationMode(0, this.solvedResult.modeShapes);
        } else {
          this.editor.setAnimationMode(null, []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Primary solving routine, compiling LaTeX step descriptions to UI
  solve() {
    this.solveSilently();

    const output = this.container.querySelector('#resolution-output');
    if (!output) return;

    if (!this.solvedResult || this.solvedResult.error) {
      output.innerHTML = `<div class="p-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-center">
        Problema singular ou graus de liberdade insuficientes. Complete a estrutura aplicando apoios convenientes.
      </div>`;
      return;
    }

    output.innerHTML = '';

    // Render step-by-step stiffness matrix assembly
    const kSection = document.createElement('div');
    kSection.className = 'p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2';
    kSection.innerHTML = '<h4 class="font-semibold text-slate-200 mb-2">1. Matriz de Rigidez do Sistema</h4>';
    const kOutput = document.createElement('div');
    kOutput.className = 'space-y-1 font-mono text-xs text-sky-300';
    this.solvedResult.steps.slice(0, 15).forEach(line => {
      kOutput.innerHTML += `<div>${line}</div>`;
    });
    if (this.solvedResult.steps.length > 15) {
      kOutput.innerHTML += `<div class="text-slate-500 italic mt-1">+ ${this.solvedResult.steps.length - 15} termos de rigidez assemblados...</div>`;
    }
    kSection.appendChild(kOutput);
    output.appendChild(kSection);

    // Render active option steps (LaTeX equations)
    const resSection = document.createElement('div');
    resSection.className = 'space-y-4';
    
    this.solvedResult.resolution.forEach(block => {
      if (block.startsWith('###') || block.startsWith('####')) {
        const level = block.startsWith('####') ? 4 : 3;
        const text = block.replace(/#/g, '').trim();
        const header = document.createElement(`h${level}`);
        header.className = level === 3 ? 'text-base font-bold text-slate-200 mt-4' : 'text-sm font-semibold text-slate-400 mt-2';
        header.innerText = text;
        resSection.appendChild(header);
      } else if (block.startsWith('$$')) {
        const math = block.slice(2, -2).trim();
        const div = document.createElement('div');
        div.className = 'my-3 overflow-x-auto text-center';
        
        if (window.katex) {
          try {
            div.innerHTML = window.katex.renderToString(math, { displayMode: true, throwOnError: false });
          } catch(e) {
            div.innerText = block;
          }
        } else {
          div.innerText = block;
        }
        resSection.appendChild(div);
      } else if (block.startsWith('*') || block.startsWith('-')) {
        const text = block.substring(1).trim();
        const li = document.createElement('div');
        li.className = 'text-xs text-slate-400 pl-4 relative before:content-["•"] before:absolute before:left-1 before:text-sky-500';
        li.innerText = text;
        resSection.appendChild(li);
      } else {
        const p = document.createElement('p');
        p.className = 'text-xs text-slate-400';
        p.innerText = block;
        resSection.appendChild(p);
      }
    });

    output.appendChild(resSection);
  }

  buildForcesVector(totalDof) {
    const fVec = new Array(totalDof).fill(0);
    this.forces.forEach(f => {
      const node = this.nodes.find(n => n.id === f.node);
      if (!node) return;

      const dofs = node.dofIndices || [0, 0, 0];
      if (this.subType === 'mola') {
        if (dofs[0] > 0 && dofs[0] <= totalDof) fVec[dofs[0] - 1] = f.px || f.py || 0; // vertical/horizontal 1D
      } else if (this.subType === 'barra2d') {
        if (dofs[0] > 0 && dofs[0] <= totalDof) fVec[dofs[0] - 1] = f.px;
        if (dofs[1] > 0 && dofs[1] <= totalDof) fVec[dofs[1] - 1] = f.py;
      } else if (this.subType === 'viga') {
        if (dofs[1] > 0 && dofs[1] <= totalDof) fVec[dofs[1] - 1] = f.py; // vertical deflection
        if (dofs[2] > 0 && dofs[2] <= totalDof) fVec[dofs[2] - 1] = f.m;  // rotation moment
      } else if (this.subType === 'vigabarra2d') {
        if (dofs[0] > 0 && dofs[0] <= totalDof) fVec[dofs[0] - 1] = f.px;
        if (dofs[1] > 0 && dofs[1] <= totalDof) fVec[dofs[1] - 1] = f.py;
        if (dofs[2] > 0 && dofs[2] <= totalDof) fVec[dofs[2] - 1] = f.m;
      }
    });
    return fVec;
  }

  saveState() {
    return {
      subType: this.subType,
      activeOption: this.activeOption,
      nodes: this.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, support: n.support, angle: n.angle })),
      elements: this.elements.map(el => ({
        id: el.id, type: el.type, n1: el.n1, n2: el.n2,
        E: el.E, A: el.A, I: el.I, L: el.L, theta: el.theta,
        p0: el.p0, pL: el.pL, py: el.py
      })),
      forces: this.forces
    };
  }

  loadState(state) {
    if (!state) return;
    this.subType = state.subType || 'barra2d';
    this.activeOption = state.activeOption || 1;
    this.nodes = state.nodes || [];
    this.elements = state.elements || [];
    this.forces = state.forces || [];

    // Sync subType select element in UI
    const subTypeSelect = this.container.querySelector('select');
    if (subTypeSelect) subTypeSelect.value = this.subType;

    this.renderWorkspace();
    this.solve();
  }

  getHelpText() {
    return `
### Estruturas de Alma Cheia (EAC)

Este módulo permite resolver sistemas estruturais compostos por:
- **Sistemas de Molas:** Barras unidimensionais elásticas lineares.
- **Treliças (Barras 2D):** Elementos articulados sob forças axiais (tração/compressão).
- **Vigas:** Elementos de viga plana sob flexão elástica de Euler-Bernoulli.
- **Pórticos (Viga-Barra 2D):** Combinação de flexão e esforços axiais.

#### Como construir o modelo:
1. Adicione os **Nós** com as coordenadas cartesianas adequadas.
2. Adicione os **Elementos** ligando os nós.
3. Configure os **Apoios** (Encastrado, Fixo, Móvel vertical/horizontal, ou Inclined).
4. Aplique as **Cargas** nodais (Força P, Momento M) ou distribuídas (p) nas vigas.
5. Selecione a aba **Resolução** e o tipo de resultado pretendido.
    `;
  }
}
