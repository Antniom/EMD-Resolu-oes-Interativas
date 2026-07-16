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
    this.subType = 'vibracoes'; // vibracoes, quatro_barras, biela_manivela, barra_deslizante, disco_rolante
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
      x0: 10,
      v0: 0
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
      theta1: 45
    };

    // Slider-Crank (Biela-Manivela) model state
    this.bielaManivelaModel = {
      r1: 0.05,
      r2: 0.18,
      m1: 0.5,
      m2: 1.5,
      mp: 0.82,
      w1: 314.16,
      theta1: 90
    };

    // Sliding Rod (Barra Deslizante) model state
    this.barraDeslizanteModel = {
      L: 2.0,
      theta: 60,
      w: 1.5,
      m: 3.0
    };

    // Rolling Disk (Disco Rolante) model state
    this.discoRolanteModel = {
      R: 0.4,
      vG: 2.0,
      aG: 1.0,
      rP: 0.4,
      thetaP: 45,
      m: 10.0
    };

    // Physics solved result
    this.solvedResult = null;

    // Component instances
    this.editor = null;
    this.chartCanvas = null;
    this.chartCtx = null;
  }

  loadPreset(presetId) {
    if (presetId === 'vib_tp1_2223') {
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 2.0,
        barMass: 6.0,
        pivotX: 0.5,
        springs: [{ id: 1, x: 2.0, k: 250 }],
        dampers: [{ id: 1, x: 0.0, c: 15 }],
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
        pivotX: 0.0,
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
        dampers: [{ id: 1, x: 2.0, c: 120 }],
        masses: [],
        force: { x: 2.0, F0: 0, w: 0, type: 'sin' },
        x0: 20,
        v0: 0
      };
    } else if (presetId === 'link_tp2_2122') {
      this.subType = 'quatro_barras';
      this.quatroBarrasModel = {
        r1: 0.10, r2: 0.30, r3: 0.30, r4: 0.20,
        m1: 0.5, m2: 1.5, m4: 1.0,
        w1: 1.5,
        assemblyMode: 'crossed',
        theta1: 45
      };
    } else if (presetId === 'link_grashof') {
      this.subType = 'quatro_barras';
      this.quatroBarrasModel = {
        r1: 0.08, r2: 0.25, r3: 0.30, r4: 0.20,
        m1: 0.4, m2: 1.2, m4: 0.8,
        w1: 3.0,
        assemblyMode: 'open',
        theta1: 30
      };
    } else if (presetId === 'bm_combustion') {
      this.subType = 'biela_manivela';
      this.bielaManivelaModel = {
        r1: 0.05, r2: 0.18, m1: 0.5, m2: 1.5, mp: 0.82,
        w1: 314.16,
        theta1: 90
      };
    } else if (presetId === 'bm_tambor') {
      this.subType = 'biela_manivela';
      this.bielaManivelaModel = {
        r1: 0.05, r2: 0.18, m1: 0.5, m2: 1.5, mp: 50.0,
        w1: 0.5236,
        theta1: 45
      };
    } else if (presetId === 'bd_exame') {
      this.subType = 'barra_deslizante';
      this.barraDeslizanteModel = {
        L: 2.0,
        theta: 60,
        w: 1.5,
        m: 3.0
      };
    } else if (presetId === 'dr_exame') {
      this.subType = 'disco_rolante';
      this.discoRolanteModel = {
        R: 0.4,
        vG: 2.0,
        aG: 1.0,
        rP: 0.4,
        thetaP: 45,
        m: 10.0
      };
    }
    
    const subTypeSelect = document.getElementById('subtype-selector');
    if (subTypeSelect) subTypeSelect.value = this.subType;
    
    this.solveAndRefresh();
  }

  initialize() {
    this.container.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'flex flex-col gap-6 w-full animate-fade-in';

    // 1. Header Toolbar
    const headerPanel = document.createElement('div');
    headerPanel.className = 'card flex flex-col xl:flex-row justify-between items-center gap-4 bg-[var(--bg-card)] border border-[var(--panel-border)] p-4 rounded-2xl shadow-sm';

    const leftSection = document.createElement('div');
    leftSection.className = 'flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-start';

    // Subtype Selector
    const subTypeSelect = document.createElement('select');
    subTypeSelect.id = 'subtype-selector';
    subTypeSelect.className = 'select-input text-sm py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';
    subTypeSelect.innerHTML = `
      <option value="vibracoes">Vibrações Mecânicas (1 G.D.L.)</option>
      <option value="quatro_barras">Mecanismo de 4 Barras</option>
      <option value="biela_manivela">Mecanismo Biela-Manivela</option>
      <option value="barra_deslizante">Cinemática: Barra Deslizante (C.I.R.)</option>
      <option value="disco_rolante">Cinemática: Disco Rolante (C.I.R.)</option>
    `;
    subTypeSelect.value = this.subType;
    subTypeSelect.onchange = (e) => {
      this.subType = e.target.value;
      this.solveAndRefresh();
    };
    leftSection.appendChild(subTypeSelect);

    // Preset Selector
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
      <option value="bm_combustion">Exame: Motor Combustão (3000 RPM)</option>
      <option value="bm_tambor">Ficha: Biela-Manivela-Tambor (5 RPM)</option>
      <option value="bd_exame">Exame PE1: Barra Deslizante (L=2m, w=1.5rad/s)</option>
      <option value="dr_exame">Exame PE1: Roda Rolante (R=0.4m, vG=2m/s)</option>
    `;
    presetSelect.onchange = (e) => {
      const presetId = e.target.value;
      if (presetId) {
        this.loadPreset(presetId);
        presetSelect.value = '';
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
    
    // Playback buttons
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

    // Workspace Layout
    const splitWorkspace = document.createElement('div');
    splitWorkspace.className = 'flex flex-col lg:flex-row gap-6 w-full items-stretch';

    // Left workspace main area
    const mainWorkspaceArea = document.createElement('div');
    mainWorkspaceArea.className = 'flex-1 flex flex-col min-h-[500px] relative';

    // Panel 1: Canvas Editor
    const editorPanel = document.createElement('div');
    editorPanel.className = `w-full flex-col glass-panel rounded-2xl overflow-hidden h-[500px] bg-white ${this.activeTab === 'editor' ? 'flex' : 'hidden'}`;
    editorPanel.id = 'panel-editor';

    const editorToolbar = document.createElement('div');
    editorToolbar.className = 'flex items-center gap-3 p-3 border-b border-[var(--panel-border)] bg-[#fafafa] text-xs';
    editorToolbar.id = 'editor-toolbar-actions';
    editorPanel.appendChild(editorToolbar);

    const canvas = document.createElement('canvas');
    canvas.className = 'flex-1 bg-[#FAF8F5] block outline-none cursor-crosshair';
    editorPanel.appendChild(canvas);
    mainWorkspaceArea.appendChild(editorPanel);

    // Panel 2: Spreadsheet Forms
    const inputsPanel = document.createElement('div');
    inputsPanel.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${this.activeTab === 'inputs' ? 'block' : 'hidden'} min-h-[500px] bg-white`;
    inputsPanel.id = 'panel-inputs';
    mainWorkspaceArea.appendChild(inputsPanel);

    // Panel 3: Resolution
    const resolutionPanel = document.createElement('div');
    resolutionPanel.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${this.activeTab === 'resolution' ? 'block' : 'hidden'} min-h-[500px] bg-white`;
    resolutionPanel.id = 'panel-resolution';
    mainWorkspaceArea.appendChild(resolutionPanel);

    splitWorkspace.appendChild(mainWorkspaceArea);

    // Right Sidebar
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
      if (this.subType === 'vibracoes') {
        Object.assign(this.vibracoesModel, updatedCoords);
      }
      this.solveSilently();
    });

    this.chartCanvas = plotCanvas;
    this.chartCtx = plotCanvas.getContext('2d');

    this.solveAndRefresh();
  }

  destroy() {
    if (this.editor) {
      this.editor.stopAnimation();
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    
    const buttons = this.container.querySelectorAll('.tab-btn');
    buttons.forEach((btn, idx) => {
      btn.classList.remove('active');
      if (idx === 0 && tabId === 'editor') btn.classList.add('active');
      if (idx === 1 && tabId === 'inputs') btn.classList.add('active');
      if (idx === 2 && tabId === 'resolution') btn.classList.add('active');
    });

    const panelEditor = document.getElementById('panel-editor');
    const panelInputs = document.getElementById('panel-inputs');
    const panelResolution = document.getElementById('panel-resolution');

    if (panelEditor) panelEditor.className = `w-full flex-col glass-panel rounded-2xl overflow-hidden h-[500px] bg-white ${tabId === 'editor' ? 'flex' : 'hidden'}`;
    if (panelInputs) panelInputs.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${tabId === 'inputs' ? 'block' : 'hidden'} min-h-[500px] bg-white`;
    if (panelResolution) panelResolution.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${tabId === 'resolution' ? 'block' : 'hidden'} min-h-[500px] bg-white`;

    if (tabId === 'editor' && this.editor) {
      this.editor.resizeCanvas();
    }

    if (tabId === 'inputs') {
      this.renderInputsTab();
    } else if (tabId === 'resolution') {
      this.renderResolutionTab();
    }
  }

  solveAndRefresh() {
    let activeModel = this.vibracoesModel;
    if (this.subType === 'quatro_barras') activeModel = this.quatroBarrasModel;
    if (this.subType === 'biela_manivela') activeModel = this.bielaManivelaModel;
    if (this.subType === 'barra_deslizante') activeModel = this.barraDeslizanteModel;
    if (this.subType === 'disco_rolante') activeModel = this.discoRolanteModel;

    const solveState = {
      type: this.subType,
      ...activeModel
    };

    const solved = solveMecAplicada(solveState);
    this.solvedResult = solved;

    if (this.editor) {
      this.editor.setModel(solveState, solved);
    }

    this.renderResultsSummary();
    this.drawChart();

    if (this.activeTab === 'inputs') {
      this.renderInputsTab();
    } else if (this.activeTab === 'resolution') {
      this.renderResolutionTab();
    }

    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.innerText = (this.editor && this.editor.isAnimating) ? 'Pausar' : 'Animar';
    }

    if (this.onModelChange) {
      this.onModelChange();
    }
  }

  solveSilently() {
    let activeModel = this.vibracoesModel;
    if (this.subType === 'quatro_barras') activeModel = this.quatroBarrasModel;
    if (this.subType === 'biela_manivela') activeModel = this.bielaManivelaModel;
    if (this.subType === 'barra_deslizante') activeModel = this.barraDeslizanteModel;
    if (this.subType === 'disco_rolante') activeModel = this.discoRolanteModel;

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

  renderInputsTab() {
    const container = document.getElementById('panel-inputs');
    if (!container) return;

    if (this.subType === 'vibracoes') {
      this.renderVibracoesInputs(container);
    } else if (this.subType === 'quatro_barras') {
      this.renderQuatroBarrasInputs(container);
    } else if (this.subType === 'biela_manivela') {
      this.renderBielaManivelaInputs(container);
    } else if (this.subType === 'barra_deslizante') {
      this.renderBarraDeslizanteInputs(container);
    } else if (this.subType === 'disco_rolante') {
      this.renderDiscoRolanteInputs(container);
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
      </div>
    `;

    this.renderVibracoesTables();

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
  }

  renderVibracoesTables() {
    const v = this.vibracoesModel;
    const springsContainer = document.getElementById('springs-table-container');
    if (springsContainer) {
      if (v.springs.length === 0) {
        springsContainer.innerHTML = `<div class="p-4 text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg text-center">Nenhuma mola acoplada.</div>`;
      } else {
        let html = `<table class="w-full text-xs text-left border-collapse"><thead><tr class="border-b border-[var(--panel-border)] text-[var(--text-secondary)] font-medium"><th class="py-2">ID</th><th class="py-2">Posição x_k [m]</th><th class="py-2">Rigidez k [N/m]</th><th class="py-2 text-right">Ação</th></tr></thead><tbody>`;
        v.springs.forEach(s => {
          html += `<tr class="border-b border-[var(--panel-border)]"><td class="py-2 font-medium">Mola #${s.id}</td><td class="py-2"><input type="number" value="${s.x}" step="0.05" min="0" max="${v.barLength}" class="input-table w-24 py-1" id="spring-x-${s.id}"></td><td class="py-2"><input type="number" value="${s.k}" step="10" min="1" class="input-table w-32 py-1" id="spring-k-${s.id}"></td><td class="py-2 text-right"><button class="text-xs text-[var(--danger)] hover:underline" id="spring-del-${s.id}">Remover</button></td></tr>`;
        });
        html += `</tbody></table>`;
        springsContainer.innerHTML = html;
        v.springs.forEach(s => {
          document.getElementById(`spring-x-${s.id}`).onchange = (e) => { s.x = parseFloat(e.target.value); this.solveAndRefresh(); };
          document.getElementById(`spring-k-${s.id}`).onchange = (e) => { s.k = parseFloat(e.target.value); this.solveAndRefresh(); };
          document.getElementById(`spring-del-${s.id}`).onclick = () => { v.springs = v.springs.filter(item => item.id !== s.id); this.solveAndRefresh(); };
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
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Manivela Motora (r1) [m]</label><input type="number" id="input-r1" value="${q.r1}" step="0.01" min="0.01" class="input-field"></div>
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Biela Acopladora (r2) [m]</label><input type="number" id="input-r2" value="${q.r2}" step="0.01" min="0.01" class="input-field"></div>
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Barra Fixa Apoios (r3) [m]</label><input type="number" id="input-r3" value="${q.r3}" step="0.01" min="0.01" class="input-field"></div>
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Balancim Seguidor (r4) [m]</label><input type="number" id="input-r4" value="${q.r4}" step="0.01" min="0.01" class="input-field"></div>
        </div>
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 mt-4">Velocidade e Modo de Montagem</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Velocidade Manivela (\\omega_1) [rad/s]</label><input type="number" id="input-w1" value="${q.w1}" step="0.5" class="input-field"></div>
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Configuração de Montagem</label><select id="input-assemblyMode" class="select-input"><option value="open" ${q.assemblyMode === 'open' ? 'selected' : ''}>Configuração Aberta (Open)</option><option value="crossed" ${q.assemblyMode === 'crossed' ? 'selected' : ''}>Configuração Cruzada (Crossed)</option></select></div>
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ângulo da Manivela Selecionado (\\theta_1) [°]</label><input type="number" id="input-theta1-num" value="${q.theta1}" min="0" max="360" class="input-field"></div>
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
    bindVal('input-w1', this.quatroBarrasModel, 'w1');
    bindVal('input-assemblyMode', this.quatroBarrasModel, 'assemblyMode', false);

    const theta1Num = document.getElementById('input-theta1-num');
    const theta1Range = document.getElementById('input-theta1-range');

    if (theta1Num && theta1Range) {
      theta1Num.oninput = (e) => {
        let val = parseInt(e.target.value) || 0;
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

  renderBielaManivelaInputs(container) {
    const bm = this.bielaManivelaModel;
    container.innerHTML = `
      <div class="flex flex-col gap-6 text-sm text-[var(--text-primary)]">
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 flex items-center justify-between">
          <span>Comprimentos das Barras (Slider-Crank)</span>
          <span class="text-xs font-normal text-slate-400">Biela-Manivela</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Comprimento Manivela (r1) [m]</label><input type="number" id="input-bm-r1" value="${bm.r1}" step="0.01" min="0.01" class="input-field"></div>
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Comprimento Biela (r2) [m]</label><input type="number" id="input-bm-r2" value="${bm.r2}" step="0.01" min="0.01" class="input-field"></div>
        </div>
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 mt-4">Velocidade e Posição da Manivela</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Velocidade Angular (\\omega_1) [rad/s]</label><input type="number" id="input-bm-w1" value="${bm.w1}" step="5" class="input-field"></div>
          <div><label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ângulo Manivela (\\theta_1) [°]</label><input type="number" id="input-bm-theta1-num" value="${bm.theta1}" min="0" max="360" class="input-field"></div>
        </div>
      </div>
    `;

    const bindVal = (id, target, key, isFloat = true) => {
      const el = document.getElementById(id);
      if (el) el.onchange = (e) => {
        target[key] = isFloat ? parseFloat(e.target.value) : e.target.value;
        this.solveAndRefresh();
      };
    };

    bindVal('input-bm-r1', this.bielaManivelaModel, 'r1');
    bindVal('input-bm-r2', this.bielaManivelaModel, 'r2');
    bindVal('input-bm-w1', this.bielaManivelaModel, 'w1');

    const theta1Num = document.getElementById('input-bm-theta1-num');
    if (theta1Num) {
      theta1Num.oninput = (e) => {
        let val = parseInt(e.target.value) || 0;
        this.bielaManivelaModel.theta1 = val;
        this.solveAndRefresh();
      };
    }
  }

  renderBarraDeslizanteInputs(container) {
    const bd = this.barraDeslizanteModel;
    container.innerHTML = `
      <div class="flex flex-col gap-6 text-sm text-[var(--text-primary)]">
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2">
          <span>Parâmetros da Barra Deslizante</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Comprimento da Barra (L) [m]</label>
            <input type="number" id="input-bd-L" value="${bd.L}" step="0.1" min="0.5" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Massa da Barra (m) [kg]</label>
            <input type="number" id="input-bd-m" value="${bd.m}" step="0.5" min="0.1" class="input-field">
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Velocidade Angular (\\omega) [rad/s]</label>
            <input type="number" id="input-bd-w" value="${bd.w}" step="0.1" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ângulo da Barra (\\theta) [°]</label>
            <input type="number" id="input-bd-theta" value="${bd.theta}" min="5" max="85" class="input-field">
          </div>
        </div>
      </div>
    `;

    const bindVal = (id, target, key) => {
      const el = document.getElementById(id);
      if (el) el.onchange = (e) => {
        target[key] = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
    };

    bindVal('input-bd-L', this.barraDeslizanteModel, 'L');
    bindVal('input-bd-m', this.barraDeslizanteModel, 'm');
    bindVal('input-bd-w', this.barraDeslizanteModel, 'w');
    bindVal('input-bd-theta', this.barraDeslizanteModel, 'theta');
  }

  renderDiscoRolanteInputs(container) {
    const dr = this.discoRolanteModel;
    container.innerHTML = `
      <div class="flex flex-col gap-6 text-sm text-[var(--text-primary)]">
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2">
          <span>Parâmetros do Disco Rolante (Sem Escorregar)</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Raio do Disco (R) [m]</label>
            <input type="number" id="input-dr-R" value="${dr.R}" step="0.05" min="0.05" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Velocidade do Centro (vG) [m/s]</label>
            <input type="number" id="input-dr-vG" value="${dr.vG}" step="0.1" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Aceleração do Centro (aG) [m/s²]</label>
            <input type="number" id="input-dr-aG" value="${dr.aG}" step="0.1" class="input-field">
          </div>
        </div>
        <h3 class="text-base font-bold border-b border-[var(--panel-border)] pb-2 mt-4">Ponto Genérico P</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Raio Posição P (rP) [m]</label>
            <input type="number" id="input-dr-rP" value="${dr.rP}" step="0.05" min="0" max="${dr.R}" class="input-field">
          </div>
          <div>
            <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ângulo Posição P (\\theta_P) [°]</label>
            <input type="number" id="input-dr-thetaP" value="${dr.thetaP}" min="0" max="360" class="input-field">
          </div>
        </div>
      </div>
    `;

    const bindVal = (id, target, key) => {
      const el = document.getElementById(id);
      if (el) el.onchange = (e) => {
        target[key] = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
    };

    bindVal('input-dr-R', this.discoRolanteModel, 'R');
    bindVal('input-dr-vG', this.discoRolanteModel, 'vG');
    bindVal('input-dr-aG', this.discoRolanteModel, 'aG');
    bindVal('input-dr-rP', this.discoRolanteModel, 'rP');
    bindVal('input-dr-thetaP', this.discoRolanteModel, 'thetaP');
  }

  renderResultsSummary() {
    const summaryContainer = document.getElementById('results-summary');
    if (!summaryContainer) return;

    if (!this.solvedResult || !this.solvedResult.success) {
      summaryContainer.innerHTML = `<div class="p-3 text-red-600 bg-red-50 border border-red-200 rounded-lg text-xs">${this.solvedResult ? this.solvedResult.error : 'Erro.'}</div>`;
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
        </div>
        <div class="grid grid-cols-2 gap-y-3 gap-x-2 border-b border-[var(--panel-border)] pb-3 mt-3">
          <div><span class="text-[var(--text-secondary)]">Freq. Natural (\u03c9n):</span></div>
          <div class="text-right font-semibold"><span>${r.w_n.toFixed(3)} rad/s</span></div>
          <div><span class="text-[var(--text-secondary)]">Razão Damping (\u03b6):</span></div>
          <div class="text-right font-semibold"><span>${r.zeta.toFixed(4)}</span></div>
        </div>
        <div class="pt-2 text-xs">
          <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-[var(--panel-border)]">
            <span class="font-medium text-[var(--text-secondary)]">Tipo Sistema:</span>
            <span class="font-bold text-[var(--accent)] uppercase">${r.dampingType}</span>
          </div>
        </div>
      `;
    } else if (this.subType === 'quatro_barras') {
      const r = this.solvedResult.results;
      summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px]">
          <div><span class="text-[var(--text-secondary)]">\u03b82 (Acoplador):</span></div><div class="text-right font-semibold"><span>${r.t2Deg.toFixed(2)}°</span></div>
          <div><span class="text-[var(--text-secondary)]">\u03b84 (Balancim):</span></div><div class="text-right font-semibold"><span>${r.t4Deg.toFixed(2)}°</span></div>
        </div>
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px] mt-2">
          <div><span class="text-[var(--text-secondary)]">\u03c92 (Acoplador):</span></div><div class="text-right font-semibold"><span>${r.w2.toFixed(3)} rad/s</span></div>
          <div><span class="text-[var(--text-secondary)]">\u03c94 (Balancim):</span></div><div class="text-right font-semibold"><span>${r.w4.toFixed(3)} rad/s</span></div>
          <div><span class="text-[var(--text-secondary)]">C.I.R. da Biela:</span></div><div class="text-right font-semibold text-[10px]">${r.CIR ? `(${r.CIR.x.toFixed(2)}, ${r.CIR.y.toFixed(2)})m` : 'Infinito'}</div>
        </div>
      `;
    } else if (this.subType === 'biela_manivela') {
      const r = this.solvedResult.results;
      const f = r.forces;
      summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px]">
          <div><span class="text-[var(--text-secondary)]">Curso xB:</span></div><div class="text-right font-semibold"><span>${(r.xB * 100).toFixed(2)} cm</span></div>
          <div><span class="text-[var(--text-secondary)]">Veloc. vB:</span></div><div class="text-right font-semibold"><span>${r.vB.toFixed(3)} m/s</span></div>
          <div><span class="text-[var(--text-secondary)]">Acel. aB:</span></div><div class="text-right font-semibold font-mono text-red-500"><span>${r.aB.toFixed(2)} m/s²</span></div>
        </div>
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px] mt-2">
          <div><span class="text-[var(--text-secondary)]">C.I.R. da Biela:</span></div><div class="text-right font-semibold text-[10px]">${r.CIR ? `(${r.CIR.x.toFixed(3)}, ${r.CIR.y.toFixed(3)})m` : 'Infinito'}</div>
        </div>
      `;
    } else if (this.subType === 'barra_deslizante') {
      const r = this.solvedResult.results;
      summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px]">
          <div><span class="text-[var(--text-secondary)]">Posição A (Chão):</span></div><div class="text-right font-semibold"><span>(${r.xA.toFixed(3)}, 0) m</span></div>
          <div><span class="text-[var(--text-secondary)]">Posição B (Parede):</span></div><div class="text-right font-semibold"><span>(0, ${r.yB.toFixed(3)}) m</span></div>
          <div><span class="text-[var(--text-secondary)]">C.I.R. da Barra:</span></div><div class="text-right font-semibold text-[var(--accent)]"><span>(${r.CIR.x.toFixed(3)}, ${r.CIR.y.toFixed(3)}) m</span></div>
        </div>
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px] mt-2">
          <div><span class="text-[var(--text-secondary)]">Velocidade vA:</span></div><div class="text-right font-semibold"><span>${r.vA.toFixed(3)} m/s</span></div>
          <div><span class="text-[var(--text-secondary)]">Velocidade vB:</span></div><div class="text-right font-semibold"><span>${r.vB.toFixed(3)} m/s</span></div>
        </div>
        <div class="text-[11px] space-y-1 pt-2">
          <div class="font-bold text-slate-500 uppercase text-[10px] mb-1">Reações de Apoio (Sem Atrito):</div>
          <div class="flex justify-between"><span>Normal Parede (NA):</span><span class="font-semibold">${r.NA.toFixed(2)} N</span></div>
          <div class="flex justify-between"><span>Normal Chão (NB):</span><span class="font-semibold">${r.NB.toFixed(2)} N</span></div>
        </div>
      `;
    } else if (this.subType === 'disco_rolante') {
      const r = this.solvedResult.results;
      summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px]">
          <div><span class="text(--text-secondary)">Veloc. Angular (\u03c9):</span></div><div class="text-right font-semibold"><span>${r.w.toFixed(2)} rad/s</span></div>
          <div><span class="text-[var(--text-secondary)]">Acel. Angular (\u03b1):</span></div><div class="text-right font-semibold"><span>${r.alpha.toFixed(2)} rad/s²</span></div>
          <div><span class="text-[var(--text-secondary)]">Acel. Contacto C:</span></div><div class="text-right font-semibold"><span>(0, ${r.aCy.toFixed(2)}) m/s²</span></div>
        </div>
        <div class="text-[11px] space-y-1.5 pt-2">
          <div class="font-bold text-slate-500 uppercase text-[10px] mb-1">Cinemática no Ponto P:</div>
          <div class="flex justify-between"><span>Posição P:</span><span class="font-semibold">(${r.xP.toFixed(2)}, ${r.yP.toFixed(2)}) m</span></div>
          <div class="flex justify-between"><span>Velocidade vP:</span><span class="font-semibold text-green-700">${r.vP.toFixed(3)} m/s</span></div>
          <div class="flex justify-between"><span>Aceleração aP:</span><span class="font-semibold">${r.aP.toFixed(3)} m/s²</span></div>
        </div>
      `;
    }
  }

  drawChart() {
    if (!this.chartCanvas || !this.chartCtx || !this.solvedResult || !this.solvedResult.trajectory) return;
    
    const ctx = this.chartCtx;
    const traj = this.solvedResult.trajectory;
    const w = this.chartCanvas.width = this.chartCanvas.parentElement.getBoundingClientRect().width || 340;
    const h = this.chartCanvas.height = 180;
    
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#E0DEC8'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, w, h);
    
    const chartTitleText = document.getElementById('chart-title');

    if (this.subType === 'vibracoes') {
      if (chartTitleText) chartTitleText.innerText = 'Ângulo de Oscilação \u03b8(t) vs t';
      const angles = traj.map(pt => pt.thetaDeg);
      let minVal = Math.min(...angles), maxVal = Math.max(...angles);
      const span = maxVal - minVal;
      const padding = span > 0.1 ? span * 0.15 : 1.0;
      minVal -= padding; maxVal += padding;
      
      const zeroY = h - ((0 - minVal) / (maxVal - minVal)) * h;
      if (zeroY >= 0 && zeroY <= h) {
        ctx.strokeStyle = '#8f8f8f'; ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
      }

      ctx.strokeStyle = '#C05B42'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i < traj.length; i++) {
        const cx = (i / (traj.length - 1)) * w;
        const cy = h - ((traj[i].thetaDeg - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    } else if (this.subType === 'quatro_barras') {
      if (chartTitleText) chartTitleText.innerText = 'Velocidades Angulares \u03c9 vs \u03b81';
      const validSteps = traj.filter(pt => pt.success);
      if (validSteps.length === 0) return;
      const w2_vals = validSteps.map(pt => pt.w2), w4_vals = validSteps.map(pt => pt.w4);
      let minVal = Math.min(...w2_vals, ...w4_vals), maxVal = Math.max(...w2_vals, ...w4_vals);
      const span = maxVal - minVal;
      const padding = span > 0.1 ? span * 0.15 : 1.0;
      minVal -= padding; maxVal += padding;

      ctx.strokeStyle = '#D96C53'; ctx.lineWidth = 2; ctx.beginPath();
      validSteps.forEach((pt, i) => {
        const cx = (i / (validSteps.length - 1)) * w;
        const cy = h - ((pt.w2 - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    } else if (this.subType === 'biela_manivela') {
      if (chartTitleText) chartTitleText.innerText = 'Velocidade do Pistão vB (m/s) vs \u03b81';
      const validSteps = traj.filter(pt => pt.success);
      if (validSteps.length === 0) return;
      const v_vals = validSteps.map(pt => pt.vB);
      let minVal = Math.min(...v_vals), maxVal = Math.max(...v_vals);
      const span = maxVal - minVal;
      const padding = span > 0.1 ? span * 0.15 : 1.0;
      minVal -= padding; maxVal += padding;

      ctx.strokeStyle = '#2D6A4F'; ctx.lineWidth = 2.5; ctx.beginPath();
      validSteps.forEach((pt, i) => {
        const cx = (i / (validSteps.length - 1)) * w;
        const cy = h - ((pt.vB - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    } else if (this.subType === 'barra_deslizante') {
      if (chartTitleText) chartTitleText.innerText = 'Velocidades vA (Vermelho) e vB (Verde) vs \u03b8';
      const vA_vals = traj.map(pt => pt.vA), vB_vals = traj.map(pt => pt.vB);
      let minVal = Math.min(...vA_vals, ...vB_vals), maxVal = Math.max(...vA_vals, ...vB_vals);
      
      ctx.strokeStyle = '#C05B42'; ctx.lineWidth = 2; ctx.beginPath();
      traj.forEach((pt, i) => {
        const cx = (i / (traj.length - 1)) * w;
        const cy = h - ((pt.vA - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      ctx.strokeStyle = '#2D6A4F'; ctx.lineWidth = 2; ctx.beginPath();
      traj.forEach((pt, i) => {
        const cx = (i / (traj.length - 1)) * w;
        const cy = h - ((pt.vB - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    } else if (this.subType === 'disco_rolante') {
      if (chartTitleText) chartTitleText.innerText = 'Velocidade do Ponto P (vP) vs \u03b8P';
      const v_vals = traj.map(pt => pt.vB);
      let minVal = Math.min(...v_vals), maxVal = Math.max(...v_vals);
      
      ctx.strokeStyle = '#2D6A4F'; ctx.lineWidth = 2.5; ctx.beginPath();
      traj.forEach((pt, i) => {
        const cx = (i / (traj.length - 1)) * w;
        const cy = h - ((pt.vB - minVal) / (maxVal - minVal)) * h;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    }
  }

  saveState() {
    return {
      subType: this.subType,
      vibracoesModel: this.vibracoesModel,
      quatroBarrasModel: this.quatroBarrasModel,
      bielaManivelaModel: this.bielaManivelaModel,
      barraDeslizanteModel: this.barraDeslizanteModel,
      discoRolanteModel: this.discoRolanteModel
    };
  }

  loadState(state) {
    if (!state) return;
    this.subType = state.subType || 'vibracoes';
    if (state.vibracoesModel) this.vibracoesModel = state.vibracoesModel;
    if (state.quatroBarrasModel) this.quatroBarrasModel = state.quatroBarrasModel;
    if (state.bielaManivelaModel) this.bielaManivelaModel = state.bielaManivelaModel;
    if (state.barraDeslizanteModel) this.barraDeslizanteModel = state.barraDeslizanteModel;
    if (state.discoRolanteModel) this.discoRolanteModel = state.discoRolanteModel;
    
    const select = document.getElementById('subtype-selector');
    if (select) select.value = this.subType;
    
    this.solveAndRefresh();
  }

  getHelpText() {
    return `### Como usar o módulo de Mecânica Aplicada

Este laboratório interativo permite criar e estudar problemas da mecânica clássica plana:

#### 1. Sistemas Vibratórios (1 G.D.L.)
- Defina parâmetros físicos (massa, comprimento da barra rígida, pivot de rotação) e acople molas, amortecedores e forças oscilatórias.

#### 2. Mecanismos (4 Barras e Biela-Manivela)
- Estudo cinemático e dinâmico de conexões articuladas planas. Exibe posições, velocidades, acelerações, forças de junta e o **C.I.R.**.

#### 3. Cinemática e C.I.R. Geral (Barra Deslizante e Roda Rolante)
- **Barra Deslizante**: Roda que desliza pela parede e pelo chão. Mostra o C.I.R. no canto superior e a curva circular descrita pela Base (Space Centrode).
- **Disco Rolante**: Mostra a velocidade zero do contacto com o solo (CIR), a aceleração radial centrípeta do ponto de contacto, e as velocidades relativas de qualquer ponto $P$.`;
  }
}
