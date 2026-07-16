// Main module for Mecânica Aplicada (Applied Mechanics)
// Orchestrates visual editing, numeric inputs, solvers, and KaTeX detailed resolutions

import { SubjectTemplate } from '../subjectTemplate.js';
import { MecAplicadaEditor } from './editor.js';
import { solveMecAplicada } from './solver.js';

export class MecAplicadaModule extends SubjectTemplate {
  constructor(containerElement, onModelChange) {
    super(containerElement, onModelChange);
    this.id = 'mecaplicada';
    this.name = 'Mecânica Aplicada';

    // State Model
    this.subType = 'vibracoes'; // vibracoes, quatro_barras
    this.activeTab = 'editor';  // editor, inputs, resolution

    // 1-DOF Vibrations model state
    this.vibracoesModel = {
      barLength: 2.0,
      barMass: 6.0,
      pivotX: 0.5,
      springs: [{ id: 1, x: 2.0, k: 250 }],
      dampers: [{ id: 1, x: 0.0, c: 15 }],
      masses: [],
      force: { x: 2.0, F0: 10, w: 5, type: 'sin' },
      x0: 10, // degrees
      v0: 0   // rad/s
    };

    // 4-Bar Linkage model state
    this.quatroBarrasModel = {
      r1: 0.1,
      r2: 0.3,
      r3: 0.3,
      r4: 0.2,
      m1: 0.5,
      m2: 1.5,
      m4: 1.0,
      w1: 2.0,
      assemblyMode: 'open',
      theta1: 45 // active calculation angle (deg)
    };

    // Physics solved result
    this.solvedResult = null;

    // Component instances
    this.editor = null;
    this.chartCanvas = null;
    this.chartCtx = null;
  }

  // Predefined classroom exercises
  loadPreset(presetId) {
    if (presetId === 'vib_tp1_2223') {
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 2.0,
        barMass: 6.0,
        pivotX: 0.5,
        springs: [{ id: 1, x: 2.0, k: 250 }],
        dampers: [{ id: 1, x: 0.0, c: 15 }], // damper at left end A
        masses: [],
        force: { x: 2.0, F0: 10, w: 5, type: 'sin' },
        x0: 10,
        v0: 0
      };
    } else if (presetId === 'vib_tp1_1415') {
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 1.5,
        barMass: 4.0,
        pivotX: 0.4,
        springs: [{ id: 1, x: 1.5, k: 500 }],
        dampers: [{ id: 1, x: 0.8, c: 20 }],
        masses: [{ id: 1, x: 1.5, m: 3.0 }],
        force: { x: 1.5, F0: 25, w: 3.5, type: 'sin' },
        x0: 15,
        v0: 0.5
      };
    } else if (presetId === 'vib_undamped') {
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 2.0,
        barMass: 5.0,
        pivotX: 0.0, // hinged at left end
        springs: [{ id: 1, x: 2.0, k: 300 }],
        dampers: [],
        masses: [],
        force: { x: 2.0, F0: 0, w: 0, type: 'sin' },
        x0: 8,
        v0: 0
      };
    } else if (presetId === 'vib_overdamped') {
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 2.0,
        barMass: 5.0,
        pivotX: 0.5,
        springs: [{ id: 1, x: 2.0, k: 100 }],
        dampers: [{ id: 1, x: 2.0, c: 120 }], // high damping
        masses: [],
        force: { x: 2.0, F0: 0, w: 0, type: 'sin' },
        x0: 20,
        v0: 0
      };
    } else if (presetId === 'link_tp2_2122') {
      this.subType = 'quatro_barras';
      this.quatroBarrasModel = {
        r1: 0.10,
        r2: 0.30,
        r3: 0.30,
        r4: 0.20,
        m1: 0.5,
        m2: 1.5,
        m4: 1.0,
        w1: 1.5, // 1.5 rad/s clockwise in poster, let's use +1.5
        assemblyMode: 'crossed',
        theta1: 45
      };
    } else if (presetId === 'link_grashof') {
      this.subType = 'quatro_barras';
      this.quatroBarrasModel = {
        r1: 0.08,
        r2: 0.25,
        r3: 0.30,
        r4: 0.20,
        m1: 0.4,
        m2: 1.2,
        m4: 0.8,
        w1: 3.0,
        assemblyMode: 'open',
        theta1: 30
      };
    }
    
    // Sync UI selector
    const subTypeSelect = document.getElementById('subtype-selector');
    if (subTypeSelect) subTypeSelect.value = this.subType;
    
    this.solveAndRefresh();
  }

  initialize() {
    this.container.innerHTML = '';

    // Create main outer layout wrapper
    const layout = document.createElement('div');
    layout.className = 'flex flex-col gap-6 w-full animate-fade-in';

    // 1. Header Toolbar
    const headerPanel = document.createElement('div');
    headerPanel.className = 'card flex flex-col xl:flex-row justify-between items-center gap-4 bg-[var(--bg-card)] border border-[var(--panel-border)] p-4 rounded-2xl shadow-sm';

    const leftSection = document.createElement('div');
    leftSection.className = 'flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-start';

    // Subject/Subtype Selector
    const subTypeSelect = document.createElement('select');
    subTypeSelect.id = 'subtype-selector';
    subTypeSelect.className = 'select-input text-sm py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';
    subTypeSelect.innerHTML = `
      <option value="vibracoes">Vibrações Mecânicas (1 G.D.L.)</option>
      <option value="quatro_barras">Mecanismo de 4 Barras</option>
    `;
    subTypeSelect.value = this.subType;
    subTypeSelect.onchange = (e) => {
      this.subType = e.target.value;
      this.solveAndRefresh();
    };
    leftSection.appendChild(subTypeSelect);

    // Preset exercises list
    const presetSelect = document.createElement('select');
    presetSelect.id = 'preset-selector';
    presetSelect.className = 'select-input text-sm py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';
    presetSelect.innerHTML = `
      <option value="">-- Carregar Exercício Resolvido --</option>
      <option value="vib_tp1_2223">PL 1: Vibrações Barra (2022/2023)</option>
      <option value="vib_tp1_1415">PL 1: Vibrações Complexas (2014/2015)</option>
      <option value="vib_undamped">Vibração Livre Não Amortecida (c=0)</option>
      <option value="vib_overdamped">Vibração Livre Sobreamortecida (c > cc)</option>
      <option value="link_tp2_2122">PL 2: Mecanismo de 4 Barras (2021/2022)</option>
      <option value="link_grashof">Mecanismo Manivela-Balancim (Grashof)</option>
    `;
    presetSelect.onchange = (e) => {
      const presetId = e.target.value;
      if (presetId) {
        this.loadPreset(presetId);
        presetSelect.value = ''; // reset selection
      }
    };
    leftSection.appendChild(presetSelect);

    const divider = document.createElement('div');
    divider.className = 'hidden md:block w-[1px] h-6 bg-[var(--panel-border)]';
    leftSection.appendChild(divider);

    // Workspace Tabs
    const tabs = document.createElement('div');
    tabs.className = 'flex gap-2';

    const editorTabBtn = document.createElement('button');
    editorTabBtn.className = `tab-btn ${this.activeTab === 'editor' ? 'active' : ''}`;
    editorTabBtn.innerText = 'Editor Visual 2D';
    editorTabBtn.onclick = () => this.switchTab('editor');

    const inputsTabBtn = document.createElement('button');
    inputsTabBtn.className = `tab-btn ${this.activeTab === 'inputs' ? 'active' : ''}`;
    inputsTabBtn.innerText = 'Parâmetros / Propriedades';
    inputsTabBtn.onclick = () => this.switchTab('inputs');

    const resTabBtn = document.createElement('button');
    resTabBtn.className = `tab-btn ${this.activeTab === 'resolution' ? 'active' : ''}`;
    resTabBtn.innerText = 'Resolução Detalhada';
    resTabBtn.onclick = () => this.switchTab('resolution');

    tabs.appendChild(editorTabBtn);
    tabs.appendChild(inputsTabBtn);
    tabs.appendChild(resTabBtn);
    leftSection.appendChild(tabs);
    headerPanel.appendChild(leftSection);
    
    // Playback control row
    const rightSection = document.createElement('div');
    rightSection.className = 'flex items-center gap-3 w-full xl:w-auto justify-end';

    const playBtn = document.createElement('button');
    playBtn.id = 'play-btn';
    playBtn.className = 'btn btn-primary py-1.5 px-4 text-xs font-semibold shadow-sm';
    playBtn.innerText = 'Animar';
    playBtn.onclick = () => this.togglePlayback();
    rightSection.appendChild(playBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-secondary py-1.5 px-4 text-xs font-semibold shadow-sm';
    resetBtn.innerText = 'Reiniciar';
    resetBtn.onclick = () => this.resetAnimation();
    rightSection.appendChild(resetBtn);

    headerPanel.appendChild(rightSection);
    layout.appendChild(headerPanel);

    // 2. Active Workspace Areas (Splits left visual/inputs and right summary/plot panels)
    const splitWorkspace = document.createElement('div');
    splitWorkspace.className = 'flex flex-col lg:flex-row gap-6 w-full items-stretch';

    // Left workspace main area
    const mainWorkspaceArea = document.createElement('div');
    mainWorkspaceArea.className = 'flex-1 flex flex-col min-h-[500px] relative';

    // Tab Panel 1: Canvas Editor
    const editorPanel = document.createElement('div');
    editorPanel.className = `w-full flex-col glass-panel rounded-2xl overflow-hidden h-[500px] bg-white ${this.activeTab === 'editor' ? 'flex' : 'hidden'}`;
    editorPanel.id = 'panel-editor';

    // Toolbar for editor (adding forces, springs, dampers)
    const editorToolbar = document.createElement('div');
    editorToolbar.className = 'flex items-center gap-3 p-3 border-b border-[var(--panel-border)] bg-[#fafafa] text-xs';
    editorToolbar.id = 'editor-toolbar-actions';
    editorPanel.appendChild(editorToolbar);

    const canvas = document.createElement('canvas');
    canvas.className = 'flex-1 bg-[#FAF8F5] block outline-none cursor-crosshair';
    editorPanel.appendChild(canvas);
    mainWorkspaceArea.appendChild(editorPanel);

    // Tab Panel 2: Spreadsheet Forms
    const inputsPanel = document.createElement('div');
    inputsPanel.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${this.activeTab === 'inputs' ? 'block' : 'hidden'} min-h-[500px] bg-white`;
    inputsPanel.id = 'panel-inputs';
    mainWorkspaceArea.appendChild(inputsPanel);

    // Tab Panel 3: KaTeX Step-by-Step Resolution
    const resolutionPanel = document.createElement('div');
    resolutionPanel.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${this.activeTab === 'resolution' ? 'block' : 'hidden'} min-h-[500px] bg-white`;
    resolutionPanel.id = 'panel-resolution';
    mainWorkspaceArea.appendChild(resolutionPanel);

    splitWorkspace.appendChild(mainWorkspaceArea);

    // Right Sidebar: Real-time Plot & Dynamic Summary results
    const sidebar = document.createElement('div');
    sidebar.className = 'w-full lg:w-[380px] flex flex-col gap-6 items-stretch';

    // Live Chart Card
    const chartCard = document.createElement('div');
    chartCard.className = 'glass-panel rounded-2xl p-4 bg-white border border-[var(--panel-border)] flex flex-col gap-3 h-[240px]';
    const chartTitle = document.createElement('h4');
    chartTitle.className = 'text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--panel-border)] pb-2';
    chartTitle.id = 'chart-title';
    chartTitle.innerText = 'Gráfico de Simulação';
    chartCard.appendChild(chartTitle);

    const plotCanvas = document.createElement('canvas');
    plotCanvas.className = 'flex-1 block w-full bg-white';
    plotCanvas.id = 'chart-canvas';
    chartCard.appendChild(plotCanvas);
    sidebar.appendChild(chartCard);

    // Summary Card
    const summaryCard = document.createElement('div');
    summaryCard.className = 'glass-panel rounded-2xl p-5 bg-white border border-[var(--panel-border)] flex flex-col gap-4 flex-1';
    
    const summaryTitle = document.createElement('h4');
    summaryTitle.className = 'text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--panel-border)] pb-2';
    summaryTitle.innerText = 'Resultados Calculados';
    summaryCard.appendChild(summaryTitle);

    const summaryContent = document.createElement('div');
    summaryContent.id = 'results-summary';
    summaryContent.className = 'text-xs text-[var(--text-primary)] space-y-3';
    summaryCard.appendChild(summaryContent);

    sidebar.appendChild(summaryCard);
    splitWorkspace.appendChild(sidebar);

    layout.appendChild(splitWorkspace);
    this.container.appendChild(layout);

    // Initializing instances
    this.editor = new MecAplicadaEditor(canvas, (updatedCoords) => {
      // Callback from canvas dragging to sync parameters
      if (this.subType === 'vibracoes') {
        Object.assign(this.vibracoesModel, updatedCoords);
      }
      this.solveSilently();
    });

    this.chartCanvas = plotCanvas;
    this.chartCtx = plotCanvas.getContext('2d');

    // Run first physics solve
    this.solveAndRefresh();
  }

  destroy() {
    if (this.editor) {
      this.editor.stopAnimation();
    }
  }

  // Switch tabs
  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Update button states
    const buttons = this.container.querySelectorAll('.tab-btn');
    buttons.forEach((btn, idx) => {
      btn.classList.remove('active');
      if (idx === 0 && tabId === 'editor') btn.classList.add('active');
      if (idx === 1 && tabId === 'inputs') btn.classList.add('active');
      if (idx === 2 && tabId === 'resolution') btn.classList.add('active');
    });

    // Update panels visibility
    const panelEditor = document.getElementById('panel-editor');
    const panelInputs = document.getElementById('panel-inputs');
    const panelResolution = document.getElementById('panel-resolution');

    if (panelEditor) panelEditor.className = `w-full flex-col glass-panel rounded-2xl overflow-hidden h-[500px] bg-white ${tabId === 'editor' ? 'flex' : 'hidden'}`;
    if (panelInputs) panelInputs.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${tabId === 'inputs' ? 'block' : 'hidden'} min-h-[500px] bg-white`;
    if (panelResolution) panelResolution.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${tabId === 'resolution' ? 'block' : 'hidden'} min-h-[500px] bg-white`;

    // Redraw if switching to editor
    if (tabId === 'editor' && this.editor) {
      this.editor.resizeCanvas();
    }

    if (tabId === 'inputs') {
      this.renderInputsTab();
    } else if (tabId === 'resolution') {
      this.renderResolutionTab();
    }
  }

  // Solves physics and refreshes the canvas, inputs, side graph, and results summary
  solveAndRefresh() {
    const activeModel = this.subType === 'vibracoes' ? this.vibracoesModel : this.quatroBarrasModel;
    const solveState = {
      type: this.subType,
      ...activeModel
    };

    // Call physics solver
    const solved = solveMecAplicada(solveState);
    this.solvedResult = solved;

    // Load into canvas editor
    if (this.editor) {
      this.editor.setModel(solveState, solved);
    }

    // Refresh right sidebar content and graphs
    this.renderResultsSummary();
    this.drawChart();

    // Re-render inputs and resolution if they are active
    if (this.activeTab === 'inputs') {
      this.renderInputsTab();
    } else if (this.activeTab === 'resolution') {
      this.renderResolutionTab();
    }

    // Update play button text state
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.innerText = (this.editor && this.editor.isAnimating) ? 'Pausar' : 'Animar';
    }

    // Inform shell of state changes (for save/restore)
    if (this.onModelChange) {
      this.onModelChange();
    }
  }

  // Same as solveAndRefresh but doesn't trigger tab UI redraws to avoid performance stutter on drags
  solveSilently() {
    const activeModel = this.subType === 'vibracoes' ? this.vibracoesModel : this.quatroBarrasModel;
    const solveState = {
      type: this.subType,
      ...activeModel
    };

    const solved = solveMecAplicada(solveState);
    this.solvedResult = solved;

    if (this.editor) {
      this.editor.solvedResult = solved;
    }
    this.renderResultsSummary();
    this.drawChart();
  }

  togglePlayback() {
    if (!this.editor) return;
    const playBtn = document.getElementById('play-btn');
    
    if (this.editor.isAnimating) {
      this.editor.stopAnimation();
      if (playBtn) playBtn.innerText = 'Animar';
    } else {
      this.editor.startAnimation();
      if (playBtn) playBtn.innerText = 'Pausar';
    }
  }

  resetAnimation() {
    if (this.editor) {
      this.editor.stopAnimation();
      this.editor.animationTime = 0;
      this.editor.draw();
    }
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.innerText = 'Animar';
  }

  // Tab 2 Content: Forms and Parameter lists
  renderInputsTab() {
    const container = document.getElementById('panel-inputs');
    if (!container) return;

    if (this.subType === 'vibracoes') {
      this.renderVibracoesInputs(container);
    } else {
      this.renderQuatroBarrasInputs(container);
    }
  }

  renderVibracoesInputs(container) {
    const v = this.vibracoesModel;
    container.innerHTML = `
      <div class="flex flex-col gap-6 text-sm text-[var(--text-primary)]">
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 flex items-center justify-between">
          <span>Parâmetros Dinâmicos da Barra e Apoio</span>
          <span class="text-xs font-normal text-slate-400">1 G.D.L.</span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Comprimento da Barra (L) [m]</label>
            <input type="number" id="input-barLength" value="${v.barLength}" step="0.1" min="0.5" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Massa da Barra (m) [kg]</label>
            <input type="number" id="input-barMass" value="${v.barMass}" step="0.5" min="0.1" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Coordenada Apoio Pivot O (x_O) [m]</label>
            <input type="number" id="input-pivotX" value="${v.pivotX}" step="0.05" min="0" max="${v.barLength}" class="input-field">
          </div>
        </div>

        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 mt-4">Condições Iniciais e Excitação Forçada</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ângulo Inicial (\\theta_0) [graus]</label>
            <input type="number" id="input-x0" value="${v.x0}" step="1" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Velocidade Angular Inic. (v_0) [rad/s]</label>
            <input type="number" id="input-v0" value="${v.v0}" step="0.1" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Força Amplitude (F_0) [N]</label>
            <input type="number" id="input-F0" value="${v.force.F0}" step="1" min="0" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Freq. Força (\\omega_f) [rad/s]</label>
            <input type="number" id="input-wf" value="${v.force.w}" step="0.5" min="0" class="input-field">
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Posição da Força (x_F) [m]</label>
            <input type="number" id="input-forceX" value="${v.force.x}" step="0.05" min="0" max="${v.barLength}" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tipo da Força Externa</label>
            <select id="input-forceType" class="select-input">
              <option value="sin" ${v.force.type === 'sin' ? 'selected' : ''}>Seno - A sin(\\omega_f t)</option>
              <option value="cos" ${v.force.type === 'cos' ? 'selected' : ''}>Cosseno - A cos(\\omega_f t)</option>
            </select>
          </div>
        </div>

        <div class="flex justify-between items-center border-b border-[var(--panel-border)] pb-2 mt-4">
          <h3 class="text-base font-bold">Molas Acopladas</h3>
          <button id="add-spring-btn" class="btn btn-secondary py-1 px-3 text-xs font-medium">+ Adicionar Mola</button>
        </div>
        <div id="springs-table-container"></div>

        <div class="flex justify-between items-center border-b border-[var(--panel-border)] pb-2 mt-4">
          <h3 class="text-base font-bold">Amortecedores Acoplados</h3>
          <button id="add-damper-btn" class="btn btn-secondary py-1 px-3 text-xs font-medium">+ Adicionar Amortecedor</button>
        </div>
        <div id="dampers-table-container"></div>

        <div class="flex justify-between items-center border-b border-[var(--panel-border)] pb-2 mt-4">
          <h3 class="text-base font-bold">Massas Pontuais Adicionais</h3>
          <button id="add-mass-btn" class="btn btn-secondary py-1 px-3 text-xs font-medium">+ Adicionar Massa</button>
        </div>
        <div id="masses-table-container"></div>
      </div>
    `;

    // Render lists tables
    this.renderVibracoesTables();

    // Bind events
    const bindVal = (id, target, key, isFloat = true) => {
      const el = document.getElementById(id);
      if (el) el.onchange = (e) => {
        target[key] = isFloat ? parseFloat(e.target.value) : e.target.value;
        this.solveAndRefresh();
      };
    };

    bindVal('input-barLength', this.vibracoesModel, 'barLength');
    bindVal('input-barMass', this.vibracoesModel, 'barMass');
    bindVal('input-pivotX', this.vibracoesModel, 'pivotX');
    bindVal('input-x0', this.vibracoesModel, 'x0');
    bindVal('input-v0', this.vibracoesModel, 'v0');
    bindVal('input-F0', this.vibracoesModel.force, 'F0');
    bindVal('input-wf', this.vibracoesModel.force, 'w');
    bindVal('input-forceX', this.vibracoesModel.force, 'x');
    bindVal('input-forceType', this.vibracoesModel.force, 'type', false);

    const addSpringBtn = document.getElementById('add-spring-btn');
    if (addSpringBtn) addSpringBtn.onclick = () => {
      const nextId = this.vibracoesModel.springs.length > 0 ? Math.max(...this.vibracoesModel.springs.map(s => s.id)) + 1 : 1;
      this.vibracoesModel.springs.push({ id: nextId, x: parseFloat((this.vibracoesModel.barLength / 2).toFixed(2)), k: 250 });
      this.solveAndRefresh();
    };

    const addDamperBtn = document.getElementById('add-damper-btn');
    if (addDamperBtn) addDamperBtn.onclick = () => {
      const nextId = this.vibracoesModel.dampers.length > 0 ? Math.max(...this.vibracoesModel.dampers.map(d => d.id)) + 1 : 1;
      this.vibracoesModel.dampers.push({ id: nextId, x: parseFloat((this.vibracoesModel.barLength / 2).toFixed(2)), c: 15 });
      this.solveAndRefresh();
    };

    const addMassBtn = document.getElementById('add-mass-btn');
    if (addMassBtn) addMassBtn.onclick = () => {
      const nextId = this.vibracoesModel.masses.length > 0 ? Math.max(...this.vibracoesModel.masses.map(m => m.id)) + 1 : 1;
      this.vibracoesModel.masses.push({ id: nextId, x: parseFloat((this.vibracoesModel.barLength / 2).toFixed(2)), m: 2.0 });
      this.solveAndRefresh();
    };
  }

  renderVibracoesTables() {
    const v = this.vibracoesModel;
    
    // Springs
    const springsContainer = document.getElementById('springs-table-container');
    if (springsContainer) {
      if (v.springs.length === 0) {
        springsContainer.innerHTML = `<div class="p-4 text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg text-center">Nenhuma mola acoplada. O sistema está sem rigidez.</div>`;
      } else {
        let html = `
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="border-b border-[var(--panel-border)] text-[var(--text-secondary)] font-medium">
                <th class="py-2">ID</th>
                <th class="py-2">Posição x_k [m]</th>
                <th class="py-2">Constante de Rigidez k [N/m]</th>
                <th class="py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
        `;
        v.springs.forEach(s => {
          html += `
            <tr class="border-b border-[var(--panel-border)]">
              <td class="py-2 font-medium">Mola #${s.id}</td>
              <td class="py-2">
                <input type="number" value="${s.x}" step="0.05" min="0" max="${v.barLength}" class="input-table w-24 py-1" id="spring-x-${s.id}">
              </td>
              <td class="py-2">
                <input type="number" value="${s.k}" step="10" min="1" class="input-table w-32 py-1" id="spring-k-${s.id}">
              </td>
              <td class="py-2 text-right">
                <button class="text-xs text-[var(--danger)] hover:underline" id="spring-del-${s.id}">Remover</button>
              </td>
            </tr>
          `;
        });
        html += `</tbody></table>`;
        springsContainer.innerHTML = html;

        // Bind spring edits
        v.springs.forEach(s => {
          document.getElementById(`spring-x-${s.id}`).onchange = (e) => {
            s.x = parseFloat(e.target.value);
            this.solveAndRefresh();
          };
          document.getElementById(`spring-k-${s.id}`).onchange = (e) => {
            s.k = parseFloat(e.target.value);
            this.solveAndRefresh();
          };
          document.getElementById(`spring-del-${s.id}`).onclick = () => {
            v.springs = v.springs.filter(item => item.id !== s.id);
            this.solveAndRefresh();
          };
        });
      }
    }

    // Dampers
    const dampersContainer = document.getElementById('dampers-table-container');
    if (dampersContainer) {
      if (v.dampers.length === 0) {
        dampersContainer.innerHTML = `<div class="p-4 text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg text-center">Nenhum amortecedor acoplado. Vibração livre sem amortecimento.</div>`;
      } else {
        let html = `
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="border-b border-[var(--panel-border)] text-[var(--text-secondary)] font-medium">
                <th class="py-2">ID</th>
                <th class="py-2">Posição x_c [m]</th>
                <th class="py-2">Constante Amortecimento c [N·s/m]</th>
                <th class="py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
        `;
        v.dampers.forEach(d => {
          html += `
            <tr class="border-b border-[var(--panel-border)]">
              <td class="py-2 font-medium">Amortecedor #${d.id}</td>
              <td class="py-2">
                <input type="number" value="${d.x}" step="0.05" min="0" max="${v.barLength}" class="input-table w-24 py-1" id="damper-x-${d.id}">
              </td>
              <td class="py-2">
                <input type="number" value="${d.c}" step="1" min="0.1" class="input-table w-32 py-1" id="damper-c-${d.id}">
              </td>
              <td class="py-2 text-right">
                <button class="text-xs text-[var(--danger)] hover:underline" id="damper-del-${d.id}">Remover</button>
              </td>
            </tr>
          `;
        });
        html += `</tbody></table>`;
        dampersContainer.innerHTML = html;

        // Bind damper edits
        v.dampers.forEach(d => {
          document.getElementById(`damper-x-${d.id}`).onchange = (e) => {
            d.x = parseFloat(e.target.value);
            this.solveAndRefresh();
          };
          document.getElementById(`damper-c-${d.id}`).onchange = (e) => {
            d.c = parseFloat(e.target.value);
            this.solveAndRefresh();
          };
          document.getElementById(`damper-del-${d.id}`).onclick = () => {
            v.dampers = v.dampers.filter(item => item.id !== d.id);
            this.solveAndRefresh();
          };
        });
      }
    }

    // Masses
    const massesContainer = document.getElementById('masses-table-container');
    if (massesContainer) {
      if (v.masses.length === 0) {
        massesContainer.innerHTML = `<div class="p-4 text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg text-center">Nenhuma massa adicional acoplada. Apenas inércia da barra rígida.</div>`;
      } else {
        let html = `
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="border-b border-[var(--panel-border)] text-[var(--text-secondary)] font-medium">
                <th class="py-2">ID</th>
                <th class="py-2">Posição x_m [m]</th>
                <th class="py-2">Massa Adicional m [kg]</th>
                <th class="py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
        `;
        v.masses.forEach(m => {
          html += `
            <tr class="border-b border-[var(--panel-border)]">
              <td class="py-2 font-medium">Massa #${m.id}</td>
              <td class="py-2">
                <input type="number" value="${m.x}" step="0.05" min="0" max="${v.barLength}" class="input-table w-24 py-1" id="mass-x-${m.id}">
              </td>
              <td class="py-2">
                <input type="number" value="${m.m}" step="0.1" min="0.1" class="input-table w-32 py-1" id="mass-m-${m.id}">
              </td>
              <td class="py-2 text-right">
                <button class="text-xs text-[var(--danger)] hover:underline" id="mass-del-${m.id}">Remover</button>
              </td>
            </tr>
          `;
        });
        html += `</tbody></table>`;
        massesContainer.innerHTML = html;

        // Bind mass edits
        v.masses.forEach(m => {
          document.getElementById(`mass-x-${m.id}`).onchange = (e) => {
            m.x = parseFloat(e.target.value);
            this.solveAndRefresh();
          };
          document.getElementById(`mass-m-${m.id}`).onchange = (e) => {
            m.m = parseFloat(e.target.value);
            this.solveAndRefresh();
          };
          document.getElementById(`mass-del-${m.id}`).onclick = () => {
            v.masses = v.masses.filter(item => item.id !== m.id);
            this.solveAndRefresh();
          };
        });
      }
    }
  }

  renderQuatroBarrasInputs(container) {
    const q = this.quatroBarrasModel;
    container.innerHTML = `
      <div class="flex flex-col gap-6 text-sm text-[var(--text-primary)]">
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 flex items-center justify-between">
          <span>Comprimentos das Barras do Mecanismo</span>
          <span class="text-xs font-normal text-slate-400">Cinemática Plana</span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Manivela Motora (r1) [m]</label>
            <input type="number" id="input-r1" value="${q.r1}" step="0.01" min="0.01" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Biela Acopladora (r2) [m]</label>
            <input type="number" id="input-r2" value="${q.r2}" step="0.01" min="0.01" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Barra Fixa Apoios (r3) [m]</label>
            <input type="number" id="input-r3" value="${q.r3}" step="0.01" min="0.01" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Balancim Seguidor (r4) [m]</label>
            <input type="number" id="input-r4" value="${q.r4}" step="0.01" min="0.01" class="input-field">
          </div>
        </div>

        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 mt-4">Massas dos Elementos (Barras Homogéneas)</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Massa Manivela (m1) [kg]</label>
            <input type="number" id="input-m1" value="${q.m1}" step="0.1" min="0.05" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Massa Biela (m2) [kg]</label>
            <input type="number" id="input-m2" value="${q.m2}" step="0.1" min="0.05" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Massa Balancim (m4) [kg]</label>
            <input type="number" id="input-m4" value="${q.m4}" step="0.1" min="0.05" class="input-field">
          </div>
        </div>

        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 mt-4">Velocidade e Modo de Montagem</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Velocidade Manivela (\\omega_1) [rad/s]</label>
            <input type="number" id="input-w1" value="${q.w1}" step="0.5" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Configuração de Montagem</label>
            <select id="input-assemblyMode" class="select-input">
              <option value="open" ${q.assemblyMode === 'open' ? 'selected' : ''}>Configuração Aberta (Open)</option>
              <option value="crossed" ${q.assemblyMode === 'crossed' ? 'selected' : ''}>Configuração Cruzada (Crossed)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ângulo da Manivela Selecionado (\\theta_1) [°]</label>
            <input type="number" id="input-theta1-num" value="${q.theta1}" min="0" max="360" class="input-field">
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ajuste de Ângulo (\\theta_1) no Ciclo</label>
          <div class="flex items-center gap-4">
            <input type="range" id="input-theta1-range" min="0" max="360" value="${q.theta1}" class="flex-1 accent-[var(--accent)] cursor-pointer">
            <span class="w-12 text-xs text-right font-semibold">${q.theta1}°</span>
          </div>
        </div>
      </div>
    `;

    // Bind inputs
    const bindVal = (id, target, key, isFloat = true) => {
      const el = document.getElementById(id);
      if (el) el.onchange = (e) => {
        target[key] = isFloat ? parseFloat(e.target.value) : e.target.value;
        this.solveAndRefresh();
      };
    };

    bindVal('input-r1', this.quatroBarrasModel, 'r1');
    bindVal('input-r2', this.quatroBarrasModel, 'r2');
    bindVal('input-r3', this.quatroBarrasModel, 'r3');
    bindVal('input-r4', this.quatroBarrasModel, 'r4');
    bindVal('input-m1', this.quatroBarrasModel, 'm1');
    bindVal('input-m2', this.quatroBarrasModel, 'm2');
    bindVal('input-m4', this.quatroBarrasModel, 'm4');
    bindVal('input-w1', this.quatroBarrasModel, 'w1');
    bindVal('input-assemblyMode', this.quatroBarrasModel, 'assemblyMode', false);

    const theta1Num = document.getElementById('input-theta1-num');
    const theta1Range = document.getElementById('input-theta1-range');

    if (theta1Num && theta1Range) {
      theta1Num.oninput = (e) => {
        let val = parseInt(e.target.value) || 0;
        val = Math.max(0, Math.min(360, val));
        this.quatroBarrasModel.theta1 = val;
        theta1Range.value = val;
        this.solveAndRefresh();
      };
      theta1Range.oninput = (e) => {
        let val = parseInt(e.target.value);
        this.quatroBarrasModel.theta1 = val;
        theta1Num.value = val;
        this.solveAndRefresh();
      };
    }
  }

  // Tab 3 Content: Detailed formulas rendered via KaTeX
  renderResolutionTab() {
    const container = document.getElementById('panel-resolution');
    if (!container) return;

    if (!this.solvedResult) {
      container.innerHTML = `<div class="p-6 text-sm text-slate-400">Clique em Carregar ou Resolva o exercício para visualizar a resolução passo a passo.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        <h3 class="text-lg font-bold border-b border-[var(--panel-border)] pb-2">Passo a Passo Detalhado (KaTeX)</h3>
        <div id="katex-render-area" class="space-y-6 leading-relaxed text-sm text-[var(--text-primary)]">
          <!-- Dynamic resolution gets injected here -->
        </div>
      </div>
    `;

    const renderArea = document.getElementById('katex-render-area');
    if (renderArea && window.katex) {
      // Custom basic markdown parser + KaTeX formula injector
      const rawLines = this.solvedResult.resolutionMarkdown.split('\n');
      let html = '';
      
      rawLines.forEach(line => {
        if (line.startsWith('### ')) {
          html += `<h4 class="text-base font-bold text-[var(--text-primary)] mt-6 mb-2 border-b border-dashed border-[var(--panel-border)] pb-1">${line.substring(4)}</h4>`;
        } else if (line.startsWith('- ')) {
          html += `<p class="ml-4 list-disc my-1">${line.substring(2)}</p>`;
        } else if (line.startsWith('$$') && line.endsWith('$$')) {
          // Display equation
          const formula = line.substring(2, line.length - 2);
          try {
            const mathHtml = window.katex.renderToString(formula, { displayMode: true, throwOnError: false });
            html += `<div class="my-4 overflow-x-auto">${mathHtml}</div>`;
          } catch(e) {
            html += `<pre class="my-4 p-2 bg-red-50 text-red-500 rounded">${formula}</pre>`;
          }
        } else {
          // Inline equation parsing
          let inlineParsed = line;
          const inlineRegex = /\$(.*?)\$/g;
          let match;
          while ((match = inlineRegex.exec(line)) !== null) {
            const formula = match[1];
            try {
              const mathHtml = window.katex.renderToString(formula, { displayMode: false, throwOnError: false });
              inlineParsed = inlineParsed.replace(`$${formula}$`, mathHtml);
            } catch(e) {}
          }
          html += `<p class="my-2">${inlineParsed}</p>`;
        }
      });
      
      renderArea.innerHTML = html;
    } else if (renderArea) {
      renderArea.innerHTML = `<div class="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-xs">Aviso: Biblioteca KaTeX não carregada. Mostrando texto original:<br><pre class="mt-2 text-slate-600 overflow-x-auto whitespace-pre-wrap">${this.solvedResult.resolutionMarkdown}</pre></div>`;
    }
  }

  // Right sidebar Results text
  renderResultsSummary() {
    const summaryContainer = document.getElementById('results-summary');
    if (!summaryContainer) return;

    if (!this.solvedResult || !this.solvedResult.success) {
      summaryContainer.innerHTML = `<div class="p-3 text-red-600 bg-red-50 border border-red-200 rounded-lg text-xs">${this.solvedResult ? this.solvedResult.error : 'Ocorreu um erro no cálculo.'}</div>`;
      return;
    }

    if (this.subType === 'vibracoes') {
      const r = this.solvedResult.results;
      summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-y-3 gap-x-2 border-b border-[var(--panel-border)] pb-3">
          <div><span class="text-[var(--text-secondary)]">Inércia Eq. (Ieq):</span></div>
          <div class="text-right font-semibold"><span>${r.I_eq.toFixed(4)} kg·m²</span></div>
          
          <div><span class="text-[var(--text-secondary)]">Rigidez Eq. (keq):</span></div>
          <div class="text-right font-semibold"><span>${r.k_eq.toFixed(2)} N·m/rad</span></div>
          
          <div><span class="text-[var(--text-secondary)]">Amortec. Eq. (ceq):</span></div>
          <div class="text-right font-semibold"><span>${r.c_eq.toFixed(2)} N·m·s/rad</span></div>
          
          <div><span class="text-[var(--text-secondary)]">Excitação (M0):</span></div>
          <div class="text-right font-semibold"><span>${r.M_0.toFixed(2)} N·m</span></div>
        </div>

        <div class="grid grid-cols-2 gap-y-3 gap-x-2 border-b border-[var(--panel-border)] pb-3 mt-3">
          <div><span class="text-[var(--text-secondary)]">Freq. Natural (\u03c9n):</span></div>
          <div class="text-right font-semibold"><span>${r.w_n.toFixed(3)} rad/s</span></div>
          
          <div><span class="text-[var(--text-secondary)]">Freq. Natural (fn):</span></div>
          <div class="text-right font-semibold"><span>${r.f_n.toFixed(3)} Hz</span></div>
          
          <div><span class="text-[var(--text-secondary)]">Amortec. Crítico:</span></div>
          <div class="text-right font-semibold"><span>${r.c_crit.toFixed(3)} N·m·s</span></div>
          
          <div><span class="text-[var(--text-secondary)]">Razão Damping (\u03b6):</span></div>
          <div class="text-right font-semibold"><span>${r.zeta.toFixed(4)}</span></div>
        </div>

        <div class="pt-1 text-xs">
          <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-[var(--panel-border)]">
            <span class="font-medium text-[var(--text-secondary)]">Tipo Sistema:</span>
            <span class="font-bold text-[var(--accent)] uppercase tracking-wide">${r.dampingType}</span>
          </div>
          ${r.Theta_ss > 0 ? `
            <div class="flex justify-between items-center mt-2 bg-slate-50 p-2 rounded-lg border border-[var(--panel-border)]">
              <span class="font-medium text-[var(--text-secondary)]">Amplitude Regime:</span>
              <span class="font-bold text-[var(--success)]">${r.Theta_ss_deg.toFixed(4)}°</span>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      const r = this.solvedResult.results;
      const f = r.forces;
      summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px]">
          <div><span class="text-[var(--text-secondary)]">Ângulo Manivela (\u03b81):</span></div>
          <div class="text-right font-semibold"><span>${this.quatroBarrasModel.theta1}°</span></div>
          
          <div><span class="text-[var(--text-secondary)]">Veloc. Manivela (\u03c91):</span></div>
          <div class="text-right font-semibold"><span>${this.quatroBarrasModel.w1.toFixed(2)} rad/s</span></div>

          <div><span class="text-[var(--text-secondary)]">\u03b82 (Acoplador):</span></div>
          <div class="text-right font-semibold"><span>${r.t2Deg.toFixed(2)}°</span></div>
          
          <div><span class="text-[var(--text-secondary)]">\u03b84 (Balancim):</span></div>
          <div class="text-right font-semibold"><span>${r.t4Deg.toFixed(2)}°</span></div>
        </div>

        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px] mt-2">
          <div><span class="text-[var(--text-secondary)]">\u03c92 (Acoplador):</span></div>
          <div class="text-right font-semibold"><span>${r.w2.toFixed(3)} rad/s</span></div>
          
          <div><span class="text-[var(--text-secondary)]">\u03c94 (Balancim):</span></div>
          <div class="text-right font-semibold"><span>${r.w4.toFixed(3)} rad/s</span></div>
          
          <div><span class="text-[var(--text-secondary)]">\u03b12 (Acel. Acoplador):</span></div>
          <div class="text-right font-semibold"><span>${r.a2.toFixed(3)} rad/s²</span></div>
          
          <div><span class="text-[var(--text-secondary)]">\u03b14 (Acel. Balancim):</span></div>
          <div class="text-right font-semibold font-mono"><span>${r.a4.toFixed(3)} rad/s²</span></div>
        </div>

        ${f ? `
          <div class="text-[11px] space-y-1.5 pt-2">
            <div class="font-bold text-slate-500 uppercase tracking-wide text-[10px] mb-1">Reações de Apoio nos Pinos:</div>
            
            <div class="flex justify-between">
              <span class="text-[var(--text-secondary)]">Hinge O (Ox, Oy):</span>
              <span class="font-semibold">${f.Ox.toFixed(1)}, ${f.Oy.toFixed(1)} N</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--text-secondary)]">Joint A (Ax, Ay):</span>
              <span class="font-semibold">${f.Ax.toFixed(1)}, ${f.Ay.toFixed(1)} N</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--text-secondary)]">Joint B (Bx, By):</span>
              <span class="font-semibold">${f.Bx.toFixed(1)}, ${f.By.toFixed(1)} N</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--text-secondary)]">Hinge D (Dx, Dy):</span>
              <span class="font-semibold">${f.Dx.toFixed(1)}, ${f.Dy.toFixed(1)} N</span>
            </div>
            
            <div class="flex justify-between border-t border-[var(--panel-border)] pt-2 mt-2 font-bold text-xs">
              <span class="text-[var(--text-secondary)]">Binário Motor (M):</span>
              <span class="text-[var(--accent)] font-mono">${f.M.toFixed(3)} N·m</span>
            </div>
          </div>
        ` : ''}
      `;
    }
  }

  // Draw chart in the right sidebar panel
  drawChart() {
    if (!this.chartCanvas || !this.chartCtx || !this.solvedResult || !this.solvedResult.trajectory) return;
    
    const ctx = this.chartCtx;
    const traj = this.solvedResult.trajectory;
    const w = this.chartCanvas.width = this.chartCanvas.parentElement.getBoundingClientRect().width || 340;
    const h = this.chartCanvas.height = 180;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw boundary border box
    ctx.strokeStyle = '#E0DEC8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
    
    // Chart Title
    const chartTitleText = document.getElementById('chart-title');
    if (chartTitleText) {
      chartTitleText.innerText = this.subType === 'vibracoes' ? 'Ângulo de Oscilação \u03b8(t) vs t' : 'Velocidades Angulares \u03c9 vs \u03b81';
    }

    if (this.subType === 'vibracoes') {
      // Find min/max of theta
      const angles = traj.map(pt => pt.thetaDeg);
      let minVal = Math.min(...angles);
      let maxVal = Math.max(...angles);
      const span = maxVal - minVal;
      
      // Add padding to range
      const padding = span > 0.1 ? span * 0.15 : 1.0;
      minVal -= padding;
      maxVal += padding;
      
      // Plot grid lines
      ctx.strokeStyle = '#f3f1e9';
      ctx.lineWidth = 1;
      
      // Horizontal 0 line
      const zeroY = h - ((0 - minVal) / (maxVal - minVal)) * h;
      if (zeroY >= 0 && zeroY <= h) {
        ctx.strokeStyle = '#8f8f8f';
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(w, zeroY);
        ctx.stroke();
      }

      // Draw Curve
      ctx.strokeStyle = '#C05B42'; // Burnt orange line
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      
      for (let i = 0; i < traj.length; i++) {
        const pt = traj[i];
        const cx = (i / (traj.length - 1)) * w;
        const cy = h - ((pt.thetaDeg - minVal) / (maxVal - minVal)) * h;
        
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // If animating, draw a red dot showing current time
      if (this.editor && this.editor.isAnimating) {
        const totalDuration = 8.0;
        const t = this.editor.animationTime % totalDuration;
        const t_ratio = t / totalDuration;
        const dotX = t_ratio * w;
        
        const ptIdx = Math.floor(t_ratio * traj.length) % traj.length;
        const pt = traj[ptIdx];
        const dotY = h - ((pt.thetaDeg - minVal) / (maxVal - minVal)) * h;
        
        ctx.fillStyle = '#D96C53';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, 2*Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw text values limits
      ctx.fillStyle = '#8f8f8f';
      ctx.font = '9px Inter';
      ctx.fillText(`${maxVal.toFixed(1)}°`, 5, 12);
      ctx.fillText(`${minVal.toFixed(1)}°`, 5, h - 6);
      
    } else {
      // 4-Bar: Plot w2 and w4 vs crank angle
      // Filter out steps where linkage is locked
      const validSteps = traj.filter(pt => pt.success);
      if (validSteps.length === 0) return;
      
      const w2_vals = validSteps.map(pt => pt.w2);
      const w4_vals = validSteps.map(pt => pt.w4);
      
      let minVal = Math.min(...w2_vals, ...w4_vals);
      let maxVal = Math.max(...w2_vals, ...w4_vals);
      const span = maxVal - minVal;
      const padding = span > 0.1 ? span * 0.15 : 1.0;
      minVal -= padding;
      maxVal += padding;

      // Draw zero line
      const zeroY = h - ((0 - minVal) / (maxVal - minVal)) * h;
      if (zeroY >= 0 && zeroY <= h) {
        ctx.strokeStyle = '#8f8f8f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(w, zeroY);
        ctx.stroke();
      }

      // Draw w2 (coupler) curve in Burnt Orange
      ctx.strokeStyle = '#D96C53';
      ctx.lineWidth = 2;
      ctx.beginPath();
      validSteps.forEach((pt, i) => {
        const cx = (i / (validSteps.length - 1)) * w;
        const cy = h - ((pt.w2 - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Draw w4 (follower) curve in Ochre
      ctx.strokeStyle = '#D08C60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      validSteps.forEach((pt, i) => {
        const cx = (i / (validSteps.length - 1)) * w;
        const cy = h - ((pt.w4 - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Draw vertical indicator line for current crank angle
      let currentAngle = (this.quatroBarrasModel.theta1 || 0) * Math.PI / 180;
      if (this.editor && this.editor.isAnimating) {
        currentAngle = this.editor.animationTime * this.w1;
      }
      
      const angleRatio = (currentAngle % (2 * Math.PI)) / (2 * Math.PI);
      const cursorX = angleRatio * w;
      
      ctx.strokeStyle = '#191919';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, h);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Legend
      ctx.fillStyle = '#D96C53';
      ctx.fillRect(w - 70, 10, 10, 6);
      ctx.fillStyle = '#191919';
      ctx.font = '8px Inter';
      ctx.fillText('\u03c92 (Acopl)', w - 55, 16);

      ctx.fillStyle = '#D08C60';
      ctx.fillRect(w - 70, 22, 10, 6);
      ctx.fillStyle = '#191919';
      ctx.fillText('\u03c94 (Balanc)', w - 55, 28);

      // Label limits
      ctx.fillStyle = '#8f8f8f';
      ctx.font = '9px Inter';
      ctx.fillText(`${maxVal.toFixed(1)} rad/s`, 5, 12);
      ctx.fillText(`${minVal.toFixed(1)} rad/s`, 5, h - 6);
    }
  }

  // Save/Restore State methods
  saveState() {
    return {
      subType: this.subType,
      vibracoesModel: this.vibracoesModel,
      quatroBarrasModel: this.quatroBarrasModel
    };
  }

  loadState(state) {
    if (!state) return;
    this.subType = state.subType || 'vibracoes';
    if (state.vibracoesModel) this.vibracoesModel = state.vibracoesModel;
    if (state.quatroBarrasModel) this.quatroBarrasModel = state.quatroBarrasModel;
    
    // Sync select dropdown in header
    const select = document.getElementById('subtype-selector');
    if (select) select.value = this.subType;
    
    this.solveAndRefresh();
  }

  getHelpText() {
    return `### Como usar o módulo de Mecânica Aplicada

Este laboratório interativo permite criar e estudar dois problemas fundamentais da mecânica clássica plana:

#### 1. Sistemas Vibratórios (1 G.D.L.)
- **Editor Visual**: Use o mouse para selecionar e arrastar elementos como o Apoio Pivot $O$, Molas, Amortecedores e a Força Harmónica ao longo da barra rígida.
- **Inserir Componentes**: Adicione novas molas ($k$), amortecedores ($c$) e massas pontuais ($m$) diretamente na aba **Parâmetros / Propriedades**.
- **Equações e Resposta**: Calcule a inércia, rigidez e amortecimentos equivalentes. Na aba **Resolução Detalhada**, você pode verificar o passo a passo com equações KaTeX.
- **Simulação**: Dê play na animação para ver a oscilação da barra rígida sob as condições iniciais e o gráfico dinâmico de $\\theta(t)$ em tempo real.

#### 2. Mecanismo de 4 Barras
- **Parâmetros**: Defina as dimensões das barras (Manivela $r_1$, Biela $r_2$, Apoios $r_3$ e Balancim $r_4$).
- **Velocidades e Forças**: O solver determina posições angulares, velocidades e acelerações de todas as articulações. Também calcula as forças de reação em todos os pinos de apoio e o binário motor.
- **Gráficos**: Veja a evolução das velocidades angulares ao longo do ciclo completo de rotação da manivela.
- **Modos de Montagem**: Altere entre configuração Aberta e Cruzada para verificar o comportamento dinâmico.`;
  }
}
