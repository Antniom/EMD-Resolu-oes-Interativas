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
    this.name = 'Engenharia Assistida por Computador (EAC)';

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

    // Create the outer wrapper layout
    const layout = document.createElement('div');
    layout.className = 'flex flex-col gap-6 w-full animate-fade-in';

    // 1. Header Toolbar Panel (Card-style top control bar)
    const headerPanel = document.createElement('div');
    headerPanel.className = 'card flex flex-col xl:flex-row justify-between items-center gap-4 bg-[var(--bg-card)] border border-[var(--panel-border)] p-4 rounded-2xl shadow-sm';

    // Left section: Select subType + Workspace Tabs
    const leftSection = document.createElement('div');
    leftSection.className = 'flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-start';

    // Structural subType selectors
    const subTypeSelect = document.createElement('select');
    subTypeSelect.id = 'subtype-selector';
    subTypeSelect.className = 'select-input text-sm py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';
    subTypeSelect.innerHTML = `
      <option value="barra2d">Treliças (Barras 2D)</option>
      <option value="viga">Vigas (Flexão 1D)</option>
      <option value="mola">Sistemas de Molas</option>
      <option value="vigabarra2d">Pórticos (Viga-Barra 2D)</option>
    `;
    subTypeSelect.value = this.subType;
    leftSection.appendChild(subTypeSelect);

    // Sebenta Exercises Select
    const exSelect = document.createElement('select');
    exSelect.id = 'sebenta-selector';
    exSelect.className = 'select-input text-sm py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';
    exSelect.innerHTML = `
      <option value="">-- Escolher Exercício Sebenta --</option>
      <option value="ex1">Exercício 1 (Treliça AD-BD-CD)</option>
      <option value="ex2">Exercício 2 (Treliça Tripé)</option>
      <option value="ex3">Exercício 3 (Treliça Teto C)</option>
      <option value="ex4">Exercício 4 (Treliça Apoio Inclinado 30º)</option>
      <option value="ex5">Exercício 5 (Treliça Apoio Inclinado -20º)</option>
      <option value="ex6">Exercício 6 (Treliça Apoios Deslizantes)</option>
      <option value="ex7">Exercício 7 (Viga Carga Linear)</option>
      <option value="ex8">Exercício 8 (Viga Simétrica 2L)</option>
      <option value="ex9">Exercício 9 (Viga Carga Triangular)</option>
      <option value="ex10">Exercício 10 (Pórtico Concentrada + Uniforme)</option>
      <option value="ex11">Exercício 11 (Pórtico Perpendicular + Triangular)</option>
      <option value="ex12">Exercício 12 (Pórtico Carga Polinomial)</option>
      <option value="ex13">Exercício 13 (Viga Bi-Engastada 2 El.)</option>
      <option value="ex14">Exercício 14 (Sistema de Molas 1D)</option>
      <option value="ex15">Exercício 15 (Pórtico Cargas Complexas)</option>
    `;
    exSelect.onchange = (e) => {
      const exId = e.target.value;
      if (exId) {
        this.loadSebentaExercise(exId);
        subTypeSelect.value = this.subType;
      }
    };
    leftSection.appendChild(exSelect);

    const divider = document.createElement('div');
    divider.className = 'hidden md:block w-[1px] h-6 bg-[var(--panel-border)]';
    leftSection.appendChild(divider);

    // Tab buttons for Workspace (Visual 2D / Table / Resolution)
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

    const resolutionTabBtn = document.createElement('button');
    resolutionTabBtn.className = 'tab-btn';
    resolutionTabBtn.innerText = 'Resolução Detalhada';
    resolutionTabBtn.id = 'tab-resolution-btn';

    wsTabs.appendChild(editorTabBtn);
    wsTabs.appendChild(tableTabBtn);
    wsTabs.appendChild(resolutionTabBtn);
    leftSection.appendChild(wsTabs);
    headerPanel.appendChild(leftSection);

    // Right section: Storage controls row
    const rightSection = document.createElement('div');
    rightSection.className = 'flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end';

    // Storage Name Input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Nome do exercício...';
    nameInput.className = 'w-44 bg-[var(--bg-card)] border border-[var(--panel-border)] focus:border-[var(--accent)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none shadow-sm';
    rightSection.appendChild(nameInput);

    // Save Button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-secondary py-1.5 px-3 text-xs font-semibold shadow-sm';
    saveBtn.innerText = 'Gravar';
    rightSection.appendChild(saveBtn);

    // Load Select
    const select = document.createElement('select');
    select.className = 'w-48 bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] text-xs py-1.5 px-3 rounded-lg outline-none shadow-sm';
    rightSection.appendChild(select);

    // Load Button
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-secondary py-1.5 px-3 text-xs font-semibold shadow-sm';
    loadBtn.innerText = 'Carregar';
    rightSection.appendChild(loadBtn);

    headerPanel.appendChild(rightSection);
    layout.appendChild(headerPanel);

    // 2. Active content area
    const contentArea = document.createElement('div');
    contentArea.className = 'w-full min-h-[500px] flex flex-col relative';

    // Panel 1: Canvas Editor Panel
    const editorPanel = document.createElement('div');
    editorPanel.className = 'w-full flex flex-col glass-panel rounded-2xl overflow-hidden h-[600px]';
    editorPanel.id = 'panel-editor';
    const toolbar = this.createEditorToolbar();
    editorPanel.appendChild(toolbar);
    const canvas = document.createElement('canvas');
    canvas.className = 'flex-1 bg-[#FAF8F5] block outline-none cursor-crosshair';
    editorPanel.appendChild(canvas);
    contentArea.appendChild(editorPanel);

    // Panel 2: Table Spreadsheet Panel
    const tablePanel = document.createElement('div');
    tablePanel.className = 'w-full glass-panel rounded-2xl p-4 overflow-y-auto hidden min-h-[400px] bg-[var(--bg-card)]';
    tablePanel.id = 'panel-table';
    contentArea.appendChild(tablePanel);

    // Panel 3: Step-by-Step Resolution Panel
    const resolutionPanel = document.createElement('div');
    resolutionPanel.className = 'w-full flex flex-col gap-4 hidden';
    resolutionPanel.id = 'panel-resolution';

    // Top options selector pills inside resolution panel
    const optBar = document.createElement('div');
    optBar.className = 'flex flex-col gap-2 p-4 bg-[var(--bg-card)] border border-[var(--panel-border)] rounded-2xl shadow-sm';
    
    const optTitle = document.createElement('h4');
    optTitle.className = 'text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1';
    optTitle.innerText = 'Selecione o Resultado a Analisar:';
    optBar.appendChild(optTitle);

    const optList = document.createElement('div');
    optList.id = 'options-pills-list';
    optList.className = 'flex flex-wrap gap-2';
    optBar.appendChild(optList);

    const subOptContainer = document.createElement('div');
    subOptContainer.id = 'sub-options-container';
    optBar.appendChild(subOptContainer);

    resolutionPanel.appendChild(optBar);

    // Step-by-step resolution card
    const resolutionCard = document.createElement('div');
    resolutionCard.className = 'glass-panel rounded-2xl p-6 bg-[var(--bg-card)] border border-[var(--panel-border)] shadow-sm flex flex-col gap-4';
    
    const resTitle = document.createElement('h3');
    resTitle.className = 'text-lg font-bold text-[var(--text-primary)] border-b border-[var(--panel-border)] pb-2 flex justify-between items-center';
    resTitle.innerHTML = '<span>Resolução Passo a Passo</span><span class="text-xs font-normal text-[var(--text-tertiary)]">M.F.E.</span>';
    resolutionCard.appendChild(resTitle);

    const resOutput = document.createElement('div');
    resOutput.id = 'resolution-output';
    resOutput.className = 'text-[var(--text-primary)] space-y-4 text-sm leading-relaxed';
    resolutionCard.appendChild(resOutput);

    resolutionPanel.appendChild(resolutionCard);
    contentArea.appendChild(resolutionPanel);

    layout.appendChild(contentArea);
    this.container.appendChild(layout);

    // Initialize Canvas Editor instance
    this.editor = new EacEditor(canvas, (nodes, elements, forces) => {
      this.nodes = nodes;
      this.elements = elements;
      this.forces = forces;
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
      if (this.editor) {
        this.editor.setModel(this.nodes, this.elements, this.forces);
      }
      this.solveSilently();
    });

    // Storage bindings
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
    loadBtn.onclick = () => {
      const name = select.value;
      if (name) {
        const state = loadExercise(this.id, name);
        if (state) {
          this.loadState(state);
        }
      }
    };
    this.updateSavedList(select);

    // Tab bindings
    editorTabBtn.onclick = () => {
      editorTabBtn.classList.add('active');
      tableTabBtn.classList.remove('active');
      resolutionTabBtn.classList.remove('active');
      editorPanel.classList.remove('hidden');
      tablePanel.classList.add('hidden');
      resolutionPanel.classList.add('hidden');
      this.editor.resizeCanvas();
    };

    tableTabBtn.onclick = () => {
      tableTabBtn.classList.add('active');
      editorTabBtn.classList.remove('active');
      resolutionTabBtn.classList.remove('active');
      tablePanel.classList.remove('hidden');
      editorPanel.classList.add('hidden');
      resolutionPanel.classList.add('hidden');
      this.mcInput.setModel(this.subType, this.nodes, this.elements, this.forces);
    };

    resolutionTabBtn.onclick = () => {
      resolutionTabBtn.classList.add('active');
      editorTabBtn.classList.remove('active');
      tableTabBtn.classList.remove('active');
      resolutionPanel.classList.remove('hidden');
      editorPanel.classList.add('hidden');
      tablePanel.classList.add('hidden');
      this.solve();
    };

    subTypeSelect.onchange = (e) => {
      this.subType = e.target.value;
      this.loadDefaultModel();
      this.solve();
      this.renderWorkspace();
    };

    // Render initial workspace and resolve
    this.renderWorkspace();
    this.solve();

    // Defer canvas resizing to ensure parent bounding client dimensions are fully layouted
    setTimeout(() => {
      if (this.editor) this.editor.resizeCanvas();
    }, 50);
  }

  renderWorkspace() {
    this.updateOptionsList();
    if (this.editor) {
      this.editor.setModel(this.nodes, this.elements, this.forces);
    }
  }

  updateOptionsList() {
    const list = this.container.querySelector('#options-pills-list');
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
      btn.className = `btn py-1.5 px-4 text-xs rounded-full border transition-all ${
        this.activeOption === opt.id 
          ? 'bg-[var(--accent)] border-[var(--accent)] text-white font-medium shadow-sm' 
          : 'bg-[var(--bg-card)] border-[var(--panel-border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
      }`;
      btn.innerText = opt.label;
      btn.onclick = () => {
        this.activeOption = opt.id;
        this.updateOptionsList();
        this.renderSubOptions(opt.id);
        this.solve();
      };
      list.appendChild(btn);
    });

    this.renderSubOptions(this.activeOption);
  }

  renderSubOptions(optionId) {
    const container = this.container.querySelector('#sub-options-container');
    if (!container) return;
    container.innerHTML = '';

    if (optionId === 3 && (this.subType === 'barra2d' || this.subType === 'viga')) {
      const panel = document.createElement('div');
      panel.id = 'sub-options-panel';
      panel.className = 'mt-2 p-3 bg-[var(--bg-main)] border border-[var(--panel-border)] rounded-xl flex items-center gap-4 text-xs';

      const barSelect = document.createElement('div');
      barSelect.className = 'flex items-center gap-2';
      barSelect.innerHTML = `<span class="text-[var(--text-secondary)] font-medium">Elemento:</span>`;
      
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
      xInput.className = 'flex items-center gap-2';
      xInput.innerHTML = `<span class="text-[var(--text-secondary)] font-medium">Coordenada x (coef. de L):</span>`;
      
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

      container.appendChild(panel);
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
        el.th1 = ang - (n1.angle || 0);
        el.th2 = ang - (n2.angle || 0);
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

  solve() {
    this.solveSilently();

    const output = this.container.querySelector('#resolution-output');
    if (!output) return;

    if (!this.solvedResult || this.solvedResult.error) {
      output.innerHTML = `<div class="p-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-center font-medium">
        Problema singular ou graus de liberdade insuficientes. Complete a estrutura aplicando apoios convenientes.
      </div>`;
      return;
    }

    output.innerHTML = '';

    // Render step-by-step stiffness matrix assembly
    const kSection = document.createElement('div');
    kSection.className = 'p-4 bg-[var(--bg-main)] border border-[var(--panel-border)] rounded-xl space-y-2';
    kSection.innerHTML = '<h4 class="font-semibold text-[var(--text-primary)] mb-2">1. Matriz de Rigidez do Sistema</h4>';
    const kOutput = document.createElement('div');
    kOutput.className = 'space-y-1 font-mono text-[11px] text-[var(--text-primary)]';
    this.solvedResult.steps.slice(0, 15).forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'my-1 overflow-x-auto';
      if (line.startsWith('$$') && line.endsWith('$$')) {
        const math = line.slice(2, -2).trim();
        if (window.katex) {
          try {
            lineDiv.innerHTML = window.katex.renderToString(math, { displayMode: false, throwOnError: false });
          } catch(e) {
            lineDiv.innerText = line;
          }
        } else {
          lineDiv.innerText = line;
        }
      } else {
        renderLaTeXText(line, lineDiv);
      }
      kOutput.appendChild(lineDiv);
    });
    if (this.solvedResult.steps.length > 15) {
      kOutput.innerHTML += `<div class="text-[var(--text-tertiary)] italic mt-1">+ ${this.solvedResult.steps.length - 15} termos de rigidez assemblados...</div>`;
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
        header.className = level === 3 
          ? 'text-base font-bold text-[var(--text-primary)] mt-6 mb-2 border-b border-[var(--panel-border)]/40 pb-1' 
          : 'text-sm font-semibold text-[var(--text-secondary)] mt-4 mb-1';
        renderLaTeXText(text, header);
        resSection.appendChild(header);
      } else if (block.startsWith('$$')) {
        const math = block.slice(2, -2).trim();
        const div = document.createElement('div');
        div.className = 'my-4 overflow-x-auto text-center py-2';
        
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
        li.className = 'text-xs text-[var(--text-secondary)] pl-4 relative before:content-["•"] before:absolute before:left-1 before:text-[var(--accent)]';
        renderLaTeXText(text, li);
        resSection.appendChild(li);
      } else {
        const p = document.createElement('p');
        p.className = 'text-xs text-[var(--text-secondary)] leading-relaxed';
        renderLaTeXText(block, p);
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
    const subTypeSelect = this.container.querySelector('#subtype-selector');
    if (subTypeSelect) subTypeSelect.value = this.subType;

    this.renderWorkspace();
    this.solve();
  }

  loadSebentaExercise(exId) {
    if (!exId) return;

    if (exId === 'ex1') {
      this.subType = 'barra2d';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'pinned', angle: 0 },
        { id: 2, x: 2, y: 0, support: 'pinned', angle: 0 },
        { id: 3, x: 2, y: 2, support: 'pinned', angle: 0 },
        { id: 4, x: 0, y: 2, support: 'none', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'bar', n1: 1, n2: 4, E: 1, A: 1, L: 2, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'bar', n1: 2, n2: 4, E: 2, A: 1, L: 2.828, p0: 0, pL: 0, py: '' },
        { id: 3, type: 'bar', n1: 3, n2: 4, E: 3, A: 1, L: 2, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 4, px: 2, py: -1, m: 0 }
      ];
    } else if (exId === 'ex2') {
      this.subType = 'barra2d';
      this.nodes = [
        { id: 1, x: -1, y: 0, support: 'pinned', angle: 0 },
        { id: 2, x: 0, y: 0, support: 'pinned', angle: 0 },
        { id: 3, x: 1, y: 0, support: 'pinned', angle: 0 },
        { id: 4, x: 0, y: 2, support: 'none', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'bar', n1: 1, n2: 4, E: 1, A: 1, L: 2.236, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'bar', n1: 2, n2: 4, E: 1, A: 1, L: 2, p0: 0, pL: 0, py: '' },
        { id: 3, type: 'bar', n1: 3, n2: 4, E: 1, A: 1, L: 2.236, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 4, px: -1, py: -1, m: 0 }
      ];
    } else if (exId === 'ex3') {
      this.subType = 'barra2d';
      this.nodes = [
        { id: 1, x: -1, y: 2, support: 'pinned', angle: 0 },
        { id: 2, x: 1, y: 2, support: 'pinned', angle: 0 },
        { id: 3, x: 0, y: -2, support: 'pinned', angle: 0 },
        { id: 4, x: 0, y: 0, support: 'none', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'bar', n1: 4, n2: 3, E: 1, A: 1, L: 2, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'bar', n1: 4, n2: 1, E: 1, A: 1, L: 2.236, p0: 0, pL: 0, py: '' },
        { id: 3, type: 'bar', n1: 4, n2: 2, E: 1, A: 1, L: 2.236, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 4, px: -1, py: -2, m: 0 }
      ];
    } else if (exId === 'ex4') {
      this.subType = 'barra2d';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'rollerX', angle: 30 },
        { id: 2, x: 1, y: 2, support: 'none', angle: 0 },
        { id: 3, x: 2, y: 0, support: 'pinned', angle: 0 },
        { id: 4, x: 3, y: 2, support: 'pinned', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'bar', n1: 1, n2: 2, E: 1, A: 1, L: 2.236, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'bar', n1: 3, n2: 2, E: 1, A: 1, L: 2.236, p0: 0, pL: 0, py: '' },
        { id: 3, type: 'bar', n1: 2, n2: 4, E: 2, A: 1, L: 2, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 2, px: 3, py: 2, m: 0 }
      ];
    } else if (exId === 'ex5') {
      this.subType = 'barra2d';
      this.nodes = [
        { id: 1, x: -1, y: 2, support: 'pinned', angle: 0 },
        { id: 2, x: 0, y: 0, support: 'none', angle: 0 },
        { id: 3, x: 1, y: 0, support: 'rollerX', angle: -20 },
        { id: 4, x: 0, y: -2, support: 'pinned', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'bar', n1: 1, n2: 2, E: 1, A: 1, L: 2.236, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'bar', n1: 4, n2: 2, E: 1, A: 1, L: 2, p0: 0, pL: 0, py: '' },
        { id: 3, type: 'bar', n1: 2, n2: 3, E: 2, A: 1, L: 1, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 2, px: 1.879, py: 0.684, m: 0 }
      ];
    } else if (exId === 'ex6') {
      this.subType = 'barra2d';
      this.nodes = [
        { id: 1, x: 2, y: 4, support: 'pinned', angle: 0 },
        { id: 2, x: 0, y: 2, support: 'rollerX', angle: 90 },
        { id: 3, x: 0, y: 0, support: 'rollerY', angle: 0 },
        { id: 4, x: 2, y: 2, support: 'rollerX', angle: 90 }
      ];
      this.elements = [
        { id: 1, type: 'bar', n1: 3, n2: 2, E: 1, A: 1, L: 2, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'bar', n1: 4, n2: 1, E: 1, A: 1, L: 2, p0: 0, pL: 0, py: '' },
        { id: 3, type: 'bar', n1: 2, n2: 1, E: 1, A: 1, L: 2.828, p0: 0, pL: 0, py: '' },
        { id: 4, type: 'bar', n1: 3, n2: 4, E: 1, A: 1, L: 2.828, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 3, px: -3, py: 0, m: 0 },
        { node: 4, px: 0, py: -1, m: 0 }
      ];
    } else if (exId === 'ex7') {
      this.subType = 'viga';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 4, y: 0, support: 'pinned', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'beam', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 4, p0: -0.5, pL: -1, py: '' }
      ];
      this.forces = [];
    } else if (exId === 'ex8') {
      this.subType = 'viga';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'pinned', angle: 0 },
        { id: 2, x: 2, y: 0, support: 'none', angle: 0 },
        { id: 3, x: 4, y: 0, support: 'pinned', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'beam', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 2, p0: 0, pL: -1, py: '' },
        { id: 2, type: 'beam', n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, p0: -1, pL: 0, py: '' }
      ];
      this.forces = [];
    } else if (exId === 'ex9') {
      this.subType = 'viga';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 4, y: 0, support: 'pinned', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'beam', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 4, p0: 0, pL: -1, py: '' }
      ];
      this.forces = [];
    } else if (exId === 'ex10') {
      this.subType = 'vigabarra2d';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 0.5, y: 0.5, support: 'none', angle: 0 },
        { id: 3, x: 1, y: 1, support: 'none', angle: 0 },
        { id: 4, x: 3, y: 1, support: 'fixed', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'frame', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 0.707, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'frame', n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 0.707, p0: 0, pL: 0, py: '' },
        { id: 3, type: 'frame', n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 2, p0: -1, pL: -1, py: '' }
      ];
      this.forces = [
        { node: 2, px: 0, py: -1, m: 0 }
      ];
    } else if (exId === 'ex11') {
      this.subType = 'vigabarra2d';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 1, y: 1, support: 'none', angle: 0 },
        { id: 3, x: 3, y: 1, support: 'none', angle: 0 },
        { id: 4, x: 3, y: 0, support: 'rollerY', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'frame', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.414, p0: -1, pL: -1, py: '' },
        { id: 2, type: 'frame', n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, p0: 0, pL: -1, py: '' },
        { id: 3, type: 'frame', n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [];
    } else if (exId === 'ex12') {
      this.subType = 'vigabarra2d';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 0.5, y: 1, support: 'none', angle: 0 },
        { id: 3, x: 1.5, y: 1, support: 'none', angle: 0 },
        { id: 4, x: 2, y: 0, support: 'fixed', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'frame', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.118, p0: 0, pL: 1, py: '' },
        { id: 2, type: 'frame', n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 1, p0: 0, pL: -1, py: 'x^3' },
        { id: 3, type: 'frame', n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1.118, p0: 1, pL: 1, py: '' }
      ];
      this.forces = [];
    } else if (exId === 'ex13') {
      this.subType = 'viga';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 2, y: 0, support: 'none', angle: 0 },
        { id: 3, x: 4, y: 0, support: 'fixed', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'beam', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 2, p0: 3, pL: 3, py: '' },
        { id: 2, type: 'beam', n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, p0: 3, pL: 2, py: '' }
      ];
      this.forces = [];
    } else if (exId === 'ex14') {
      this.subType = 'mola';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'pinned', angle: 0 },
        { id: 2, x: 1.5, y: 0, support: 'none', angle: 0 },
        { id: 3, x: 3.0, y: 0, support: 'none', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'spring', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 0, p0: 0, pL: 0, py: '' },
        { id: 2, type: 'spring', n1: 2, n2: 3, E: 2, A: 1, I: 1, L: 0, p0: 0, pL: 0, py: '' }
      ];
      this.forces = [
        { node: 2, px: 1, py: 0, m: 0 },
        { node: 3, px: 1, py: 0, m: 0 }
      ];
    } else if (exId === 'ex15') {
      this.subType = 'vigabarra2d';
      this.nodes = [
        { id: 1, x: 0, y: 0, support: 'fixed', angle: 0 },
        { id: 2, x: 1, y: -1, support: 'none', angle: 0 },
        { id: 3, x: 3, y: -1, support: 'none', angle: 0 },
        { id: 4, x: 3, y: -2, support: 'fixed', angle: 0 }
      ];
      this.elements = [
        { id: 1, type: 'frame', n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.414, p0: 0, pL: -2, py: '' },
        { id: 2, type: 'frame', n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, p0: 0, pL: -2, py: 'x^2' },
        { id: 3, type: 'frame', n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, p0: -3, pL: -3, py: '' }
      ];
      this.forces = [];
    }

    this.renderWorkspace();
    this.solve();
  }

  getHelpText() {
    return `
### Engenharia Assistida por Computador (EAC)

Este módulo permite resolver e visualizar sistemas estruturais elásticos pelo Método dos Elementos Finitos (M.E.F.):
- **Sistemas de Molas:** Molas 1D elásticas lineares.
- **Treliças (Barras 2D):** Elementos articulados sob esforços puramente axiais.
- **Vigas:** Flexão de vigas sob carregamento transversal (Euler-Bernoulli).
- **Pórticos (Viga-Barra 2D):** Pórticos rígidos planos sob flexão, corte e esforço axial combinados.

#### Instruções de Utilização:
1. **Modelar (Aba 1):** Use as ferramentas para desenhar nós e elementos. Adicione apoios e forças convenientes.
2. **Matriz de Código (Aba 2):** Inspecione a tabela de conectividade (m.c.) e cargas nodais geradas, ou digite os graus de liberdade diretamente para sincronizar.
3. **Resolução Detalhada (Aba 3):** Escolha o resultado pretendido (Deslocamentos, Esforços ou Vibrações) para obter os passos completos detalhados em fórmulas matemáticas.
    `;
  }
}

// Inline LaTeX parsing helper to render math formulas mixed with normal text
function renderLaTeXText(text, containerElement) {
  if (!window.katex) {
    containerElement.innerText = text;
    return;
  }
  
  const parts = text.split('$');
  containerElement.innerHTML = '';
  
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const span = document.createElement('span');
      try {
        span.innerHTML = window.katex.renderToString(part, { displayMode: false, throwOnError: false });
      } catch (e) {
        span.innerText = `$${part}$`;
      }
      containerElement.appendChild(span);
    } else {
      const node = document.createTextNode(part);
      containerElement.appendChild(node);
    }
  });
}
