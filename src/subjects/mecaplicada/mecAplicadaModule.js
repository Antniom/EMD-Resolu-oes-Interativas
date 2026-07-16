// Main coordinator module for Mecânica Aplicada (Applied Mechanics)
// Orchestrates visual editing, canvas overlays, physics solvers, and KaTeX detailed resolutions

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
    this.activeTab = 'editor';  // editor, resolution

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

    // Selected visual item
    this.selectedElement = null;

    // Component instances
    this.editor = null;
    this.chartCanvas = null;
    this.chartCtx = null;
  }

  loadPreset(presetId) {
    if (presetId === 'vib_pe1_2223') {
      // Exame PE1 2022/23: Questão 5
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 4.0, barMass: 30.0, pivotX: 0.0,
        springs: [{ id: 1, x: 3.0, k: 800 }, { id: 2, x: 4.0, k: 360 }],
        dampers: [{ id: 1, x: 3.0, c: 20 }],
        masses: [],
        force: { x: 4.0, F0: 50, w: 15, type: 'sin' },
        x0: 0, v0: 1.0
      };
    } else if (presetId === 'vib_en_2122') {
      // Exame Normal 2021/22: Questão 2 (Oscilador Amortecido)
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 2.0, barMass: 3.0, pivotX: 1.0,
        springs: [{ id: 1, x: 2.0, k: 20 }],
        dampers: [{ id: 1, x: 2.0, c: 7 }],
        masses: [],
        force: { x: 2.0, F0: 4.0, w: 5.0, type: 'sin' },
        x0: 5.15, v0: 0
      };
    } else if (presetId === 'vib_freq_1213') {
      // Frequência 2012/13: Vibração Livre
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 2.0, barMass: 10.0, pivotX: 0.5,
        springs: [{ id: 1, x: 2.0, k: 400 }],
        dampers: [{ id: 1, x: 1.5, c: 30 }],
        masses: [],
        force: { x: 2.0, F0: 0, w: 0, type: 'sin' },
        x0: 10, v0: 0
      };
    } else if (presetId === 'vib_en_1819') {
      // Exame Normal 2018/19: Regime Transitório e Permanente
      this.subType = 'vibracoes';
      this.vibracoesModel = {
        barLength: 3.0, barMass: 15.0, pivotX: 1.0,
        springs: [{ id: 1, x: 3.0, k: 900 }],
        dampers: [{ id: 1, x: 2.0, c: 45 }],
        masses: [],
        force: { x: 3.0, F0: 100, w: 8, type: 'sin' },
        x0: 15, v0: 0.5
      };
    } else if (presetId === 'link_pl2_2122') {
      // PL2 2021/22: Avanço de Grashof (Crossed)
      this.subType = 'quatro_barras';
      this.quatroBarrasModel = {
        r1: 0.10, r2: 0.30, r3: 0.30, r4: 0.20,
        m1: 0.5, m2: 1.5, m4: 1.0,
        w1: 1.5, assemblyMode: 'crossed', theta1: 45
      };
    } else if (presetId === 'link_pl2_2223') {
      // PL2 2022/23: Mecanismo de Avanço Intermitente (Open)
      this.subType = 'quatro_barras';
      this.quatroBarrasModel = {
        r1: 0.08, r2: 0.25, r3: 0.30, r4: 0.20,
        m1: 0.4, m2: 1.2, m4: 0.8,
        w1: 3.0, assemblyMode: 'open', theta1: 30
      };
    } else if (presetId === 'link_en_1920') {
      // Exame 2019/20: Mecanismo Articulado
      this.subType = 'quatro_barras';
      this.quatroBarrasModel = {
        r1: 0.12, r2: 0.35, r3: 0.40, r4: 0.25,
        m1: 0.5, m2: 1.5, m4: 1.0,
        w1: 5.0, assemblyMode: 'open', theta1: 60
      };
    } else if (presetId === 'bm_en_2122') {
      // Exame Normal 2021/22: Motor Combustão Tambor (500 RPM)
      this.subType = 'biela_manivela';
      this.bielaManivelaModel = {
        r1: 0.05, r2: 0.18, m1: 0.5, m2: 1.5, mp: 0.82,
        w1: 52.36, theta1: 45
      };
    } else if (presetId === 'bm_slide_daniela') {
      // PL2 2023/24: Motor Biela-Manivela-Tambor (5 RPM)
      this.subType = 'biela_manivela';
      this.bielaManivelaModel = {
        r1: 0.05, r2: 0.18, m1: 0.5, m2: 1.5, mp: 50.0,
        w1: 0.5236, theta1: 60
      };
    } else if (presetId === 'bm_er_13') {
      // Exame Recurso 2013: Compressor Monocilíndrico (1500 RPM)
      this.subType = 'biela_manivela';
      this.bielaManivelaModel = {
        r1: 0.04, r2: 0.15, m1: 0.4, m2: 1.0, mp: 0.5,
        w1: 157.08, theta1: 90
      };
    } else if (presetId === 'bd_pe1_2223') {
      // Exame PE1 2022/23: Barra Deslizante (L=2.0m, w=1.5rad/s)
      this.subType = 'barra_deslizante';
      this.barraDeslizanteModel = { L: 2.0, theta: 60, w: 1.5, m: 3.0 };
    } else if (presetId === 'bd_er_16') {
      // Exame Recurso 2016: Barra Apoios Deslizantes (L=1.5m, w=2.0rad/s)
      this.subType = 'barra_deslizante';
      this.barraDeslizanteModel = { L: 1.5, theta: 45, w: 2.0, m: 5.0 };
    } else if (presetId === 'dr_pe1_2223') {
      // Exame PE1 2022/23: Roda Rolante (R=0.4m, vG=2m/s, aG=1m/s²)
      this.subType = 'disco_rolante';
      this.discoRolanteModel = { R: 0.4, vG: 2.0, aG: 1.0, rP: 0.4, thetaP: 45, m: 10.0 };
    } else if (presetId === 'dr_freq_1112') {
      // Frequência 2011/12: Cilindro em Rolamento Puro (R=0.3m, vG=1.5m/s)
      this.subType = 'disco_rolante';
      this.discoRolanteModel = { R: 0.3, vG: 1.5, aG: 0.5, rP: 0.2, thetaP: 90, m: 8.0 };
    }
    
    const subTypeSelect = document.getElementById('subtype-selector');
    if (subTypeSelect) subTypeSelect.value = this.subType;
    
    this.selectedElement = null;
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
      this.selectedElement = null;
      this.solveAndRefresh();
    };
    leftSection.appendChild(subTypeSelect);

    // Preset Selector (Grouped by exam worksheets)
    const presetSelect = document.createElement('select');
    presetSelect.id = 'preset-selector';
    presetSelect.className = 'select-input text-sm py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';
    presetSelect.innerHTML = `
      <option value="">-- Carregar Exercício de Exame --</option>
      <optgroup label="Vibrações Mecânicas">
        <option value="vib_pe1_2223">Exame PE1 2022/23: Barra Oscilante (Q5)</option>
        <option value="vib_en_2122">Exame Normal 2021/22: Amortecedor (Q2)</option>
        <option value="vib_en_1819">Exame Normal 2018/19: Excitação Forçada</option>
        <option value="vib_freq_1213">Frequência 2012/13: Regime Livre</option>
      </optgroup>
      <optgroup label="Mecanismo de 4 Barras">
        <option value="link_pl2_2223">PL2 2022/23: Avanço Intermitente (Open)</option>
        <option value="link_pl2_2122">PL2 2021/22: Avanço de Grashof (Crossed)</option>
        <option value="link_en_1920">Exame Normal 2019/20: Articulado</option>
      </optgroup>
      <optgroup label="Mecanismo Biela-Manivela">
        <option value="bm_en_2122">Exame Normal 2021/22: Motor (500 RPM)</option>
        <option value="bm_slide_daniela">PL2 2023/24: Motor-Tambor (5 RPM)</option>
        <option value="bm_er_13">Exame Recurso 2013: Compressor (1500 RPM)</option>
      </optgroup>
      <optgroup label="Barra Deslizante (C.I.R.)">
        <option value="bd_pe1_2223">Exame PE1 2022/23: Barra L=2.0m, w=1.5rad/s</option>
        <option value="bd_er_16">Exame Recurso 2016: Barra L=1.5m, w=2rad/s</option>
      </optgroup>
      <optgroup label="Disco Rolante (C.I.R.)">
        <option value="dr_pe1_2223">Exame PE1 2022/23: Roda R=0.4m, vG=2m/s</option>
        <option value="dr_freq_1112">Frequência 2011/12: Roda R=0.3m, vG=1.5m/s</option>
      </optgroup>
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
    editorTabBtn.innerText = 'Simulação Interativa';
    editorTabBtn.onclick = () => this.switchTab('editor');

    const resTabBtn = document.createElement('button');
    resTabBtn.className = `tab-btn ${this.activeTab === 'resolution' ? 'active' : ''}`;
    resTabBtn.innerText = 'Resolução Detalhada';
    resTabBtn.onclick = () => this.switchTab('resolution');

    tabs.appendChild(editorTabBtn);
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

    // Workspace main
    const splitWorkspace = document.createElement('div');
    splitWorkspace.className = 'flex flex-col lg:flex-row gap-6 w-full items-stretch';

    const mainWorkspaceArea = document.createElement('div');
    mainWorkspaceArea.className = 'flex-1 flex flex-col min-h-[500px] relative';

    // Panel 1: Canvas Editor
    const editorPanel = document.createElement('div');
    editorPanel.className = `w-full flex-col glass-panel rounded-2xl overflow-hidden h-[500px] bg-white relative ${this.activeTab === 'editor' ? 'flex' : 'hidden'}`;
    editorPanel.id = 'panel-editor';

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'flex-1 bg-[#FAF8F5] block outline-none cursor-crosshair';
    editorPanel.appendChild(canvas);

    // Floating Property Inspector DOM
    const inspector = document.createElement('div');
    inspector.id = 'editor-inspector';
    inspector.className = 'absolute bottom-4 left-4 right-4 glass-panel p-4 bg-white/95 rounded-xl border border-[var(--panel-border)] shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between z-10 transition-all';
    editorPanel.appendChild(inspector);

    mainWorkspaceArea.appendChild(editorPanel);

    // Panel 2: KaTeX Step-by-Step Resolution
    const resolutionPanel = document.createElement('div');
    resolutionPanel.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${this.activeTab === 'resolution' ? 'block' : 'hidden'} min-h-[500px] bg-white`;
    resolutionPanel.id = 'panel-resolution';
    mainWorkspaceArea.appendChild(resolutionPanel);

    splitWorkspace.appendChild(mainWorkspaceArea);

    // Right Sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'w-full lg:w-[380px] flex flex-col gap-6 items-stretch';

    // Live Chart
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

    // Initialize Editor
    this.editor = new MecAplicadaEditor(canvas, 
      (updatedCoords) => {
        if (this.subType === 'vibracoes') {
          Object.assign(this.vibracoesModel, updatedCoords);
        } else if (this.subType === 'quatro_barras') {
          Object.assign(this.quatroBarrasModel, updatedCoords);
        } else if (this.subType === 'biela_manivela') {
          Object.assign(this.bielaManivelaModel, updatedCoords);
        } else if (this.subType === 'barra_deslizante') {
          Object.assign(this.barraDeslizanteModel, updatedCoords);
        } else if (this.subType === 'disco_rolante') {
          Object.assign(this.discoRolanteModel, updatedCoords);
        }
        this.solveSilently();
        this.updateInspectorContent();
      },
      (selectedItem) => {
        this.selectedElement = selectedItem;
        this.updateInspectorContent();
      }
    );

    this.chartCanvas = plotCanvas;
    this.chartCtx = plotCanvas.getContext('2d');

    this.solveAndRefresh();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    const buttons = this.container.querySelectorAll('.tab-btn');
    buttons.forEach((btn, idx) => {
      btn.classList.remove('active');
      if (idx === 0 && tabId === 'editor') btn.classList.add('active');
      if (idx === 1 && tabId === 'resolution') btn.classList.add('active');
    });

    const panelEditor = document.getElementById('panel-editor');
    const panelResolution = document.getElementById('panel-resolution');

    if (panelEditor) panelEditor.className = `w-full flex-col glass-panel rounded-2xl overflow-hidden h-[500px] bg-white relative ${tabId === 'editor' ? 'flex' : 'hidden'}`;
    if (panelResolution) panelResolution.className = `w-full glass-panel rounded-2xl p-6 overflow-y-auto ${tabId === 'resolution' ? 'block' : 'hidden'} min-h-[500px] bg-white`;

    if (tabId === 'editor' && this.editor) {
      this.editor.resizeCanvas();
      this.updateInspectorContent();
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
    this.updateInspectorContent();

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

  updateInspectorContent() {
    const container = document.getElementById('editor-inspector');
    if (!container) return;

    if (!this.selectedElement) {
      let addToolbarHtml = '';
      if (this.subType === 'vibracoes') {
        addToolbarHtml = `
          <div class="flex items-center gap-2 mt-2 md:mt-0">
            <button id="ins-add-spring" class="btn btn-secondary py-1 px-3 text-[11px] font-medium">+ Mola</button>
            <button id="ins-add-damper" class="btn btn-secondary py-1 px-3 text-[11px] font-medium">+ Amortecedor</button>
            <button id="ins-add-mass" class="btn btn-secondary py-1 px-3 text-[11px] font-medium">+ Massa</button>
          </div>
        `;
      }
      container.innerHTML = `
        <div class="text-[11px] text-[var(--text-secondary)] font-medium">
          💡 Clique em qualquer elemento (barra, apoios, molas, articulações) na tela para alterar as suas propriedades.
        </div>
        ${addToolbarHtml}
      `;

      if (this.subType === 'vibracoes') {
        document.getElementById('ins-add-spring').onclick = () => {
          const nextId = this.vibracoesModel.springs.length > 0 ? Math.max(...this.vibracoesModel.springs.map(s => s.id)) + 1 : 1;
          this.vibracoesModel.springs.push({ id: nextId, x: parseFloat((this.vibracoesModel.barLength / 2).toFixed(2)), k: 250 });
          this.solveAndRefresh();
        };
        document.getElementById('ins-add-damper').onclick = () => {
          const nextId = this.vibracoesModel.dampers.length > 0 ? Math.max(...this.vibracoesModel.dampers.map(d => d.id)) + 1 : 1;
          this.vibracoesModel.dampers.push({ id: nextId, x: parseFloat((this.vibracoesModel.barLength / 2).toFixed(2)), c: 15 });
          this.solveAndRefresh();
        };
        document.getElementById('ins-add-mass').onclick = () => {
          const nextId = this.vibracoesModel.masses.length > 0 ? Math.max(...this.vibracoesModel.masses.map(m => m.id)) + 1 : 1;
          this.vibracoesModel.masses.push({ id: nextId, x: parseFloat((this.vibracoesModel.barLength / 2).toFixed(2)), m: 2.0 });
          this.solveAndRefresh();
        };
      }
      return;
    }

    const sel = this.selectedElement;
    
    if (sel.type === 'spring') {
      const spring = this.vibracoesModel.springs.find(s => s.id === sel.id);
      if (!spring) { this.selectedElement = null; this.updateInspectorContent(); return; }
      
      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-[var(--accent)]">Propriedades da Mola #${spring.id}</div>
          <div class="flex-1 flex items-center gap-3 w-full">
            <span class="text-[10px] text-slate-400">Rigidez k:</span>
            <input type="range" id="ins-k-range" min="10" max="1000" step="10" value="${spring.k}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
            <span class="text-xs font-bold w-16">${spring.k} N/m</span>
          </div>
          <div class="text-[10px] text-slate-400">Posição x: <span class="font-bold text-slate-700">${spring.x}m</span></div>
          <button id="ins-delete-btn" class="btn btn-secondary py-1 px-3 text-[11px] text-[var(--danger)] border-[var(--danger)]/30 font-medium">Excluir</button>
        </div>
      `;
      
      document.getElementById('ins-k-range').oninput = (e) => {
        spring.k = parseInt(e.target.value);
        this.solveSilently();
        this.solveAndRefresh();
      };
      document.getElementById('ins-delete-btn').onclick = () => {
        this.vibracoesModel.springs = this.vibracoesModel.springs.filter(s => s.id !== spring.id);
        this.selectedElement = null;
        this.solveAndRefresh();
      };
    }
    
    else if (sel.type === 'damper') {
      const damper = this.vibracoesModel.dampers.find(d => d.id === sel.id);
      if (!damper) { this.selectedElement = null; this.updateInspectorContent(); return; }

      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-[var(--accent)]">Propriedades do Amortecedor #${damper.id}</div>
          <div class="flex-1 flex items-center gap-3 w-full">
            <span class="text-[10px] text-slate-400">Amortecimento c:</span>
            <input type="range" id="ins-c-range" min="1" max="150" step="1" value="${damper.c}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
            <span class="text-xs font-bold w-16">${damper.c} Ns/m</span>
          </div>
          <div class="text-[10px] text-slate-400">Posição x: <span class="font-bold text-slate-700">${damper.x}m</span></div>
          <button id="ins-delete-btn" class="btn btn-secondary py-1 px-3 text-[11px] text-[var(--danger)] border-[var(--danger)]/30 font-medium">Excluir</button>
        </div>
      `;
      
      document.getElementById('ins-c-range').oninput = (e) => {
        damper.c = parseFloat(e.target.value);
        this.solveSilently();
        this.solveAndRefresh();
      };
      document.getElementById('ins-delete-btn').onclick = () => {
        this.vibracoesModel.dampers = this.vibracoesModel.dampers.filter(d => d.id !== damper.id);
        this.selectedElement = null;
        this.solveAndRefresh();
      };
    }

    else if (sel.type === 'mass') {
      const mass = this.vibracoesModel.masses.find(m => m.id === sel.id);
      if (!mass) { this.selectedElement = null; this.updateInspectorContent(); return; }

      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-[var(--accent)]">Massa Adicional #${mass.id}</div>
          <div class="flex-1 flex items-center gap-3 w-full">
            <span class="text-[10px] text-slate-400">Massa m:</span>
            <input type="range" id="ins-m-range" min="0.1" max="15" step="0.1" value="${mass.m}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
            <span class="text-xs font-bold w-16">${mass.m} kg</span>
          </div>
          <div class="text-[10px] text-slate-400">Posição x: <span class="font-bold text-slate-700">${mass.x}m</span></div>
          <button id="ins-delete-btn" class="btn btn-secondary py-1 px-3 text-[11px] text-[var(--danger)] border-[var(--danger)]/30 font-medium">Excluir</button>
        </div>
      `;
      
      document.getElementById('ins-m-range').oninput = (e) => {
        mass.m = parseFloat(e.target.value);
        this.solveSilently();
        this.solveAndRefresh();
      };
      document.getElementById('ins-delete-btn').onclick = () => {
        this.vibracoesModel.masses = this.vibracoesModel.masses.filter(m => m.id !== mass.id);
        this.selectedElement = null;
        this.solveAndRefresh();
      };
    }

    else if (sel.type === 'bar') {
      const v = this.vibracoesModel;
      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-[var(--text-primary)]">Propriedades da Barra Rígida</div>
          <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Comprimento:</span>
              <input type="range" id="ins-bar-L" min="0.5" max="4.0" step="0.1" value="${v.barLength}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${v.barLength}m</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Massa:</span>
              <input type="range" id="ins-bar-m" min="0.5" max="50" step="0.5" value="${v.barMass}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${v.barMass}kg</span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('ins-bar-L').oninput = (e) => {
        v.barLength = parseFloat(e.target.value);
        if (v.pivotX > v.barLength) v.pivotX = v.barLength;
        this.solveAndRefresh();
      };
      document.getElementById('ins-bar-m').oninput = (e) => {
        v.barMass = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
    }

    else if (sel.type === 'force') {
      const f = this.vibracoesModel.force;
      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-green-700">Força Harmónica F(t)</div>
          <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Força F0:</span>
              <input type="range" id="ins-force-F0" min="0" max="150" step="5" value="${f.F0}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${f.F0} N</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Frequência \u03c9f:</span>
              <input type="range" id="ins-force-wf" min="0" max="30" step="0.5" value="${f.w}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${f.w} rad/s</span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('ins-force-F0').oninput = (e) => {
        f.F0 = parseInt(e.target.value);
        this.solveAndRefresh();
      };
      document.getElementById('ins-force-wf').oninput = (e) => {
        f.w = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
    }

    else if (sel.type.startsWith('joint_') || sel.type === 'linkage') {
      const is4Bar = this.subType === 'quatro_barras';
      const m = is4Bar ? this.quatroBarrasModel : this.bielaManivelaModel;
      
      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-[var(--text-primary)]">Mecanismo (${is4Bar ? '4 Barras' : 'Biela-Manivela'})</div>
          <div class="flex-1 flex flex-wrap gap-4 w-full items-center justify-between">
            <div class="flex items-center gap-2 flex-1 min-w-[150px]">
              <span class="text-[10px] text-slate-400">Veloc. \u03c91:</span>
              <input type="range" id="ins-link-w1" min="0" max="100" step="0.5" value="${is4Bar ? m.w1 : (m.w1 / 10).toFixed(1)}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-16">${is4Bar ? m.w1.toFixed(1) : (m.w1/10).toFixed(1)} rad/s</span>
            </div>
            ${is4Bar ? `
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-400">Montagem:</span>
                <select id="ins-link-mode" class="select-input py-0.5 px-2 text-xs w-28">
                  <option value="open" ${m.assemblyMode === 'open' ? 'selected' : ''}>Aberta</option>
                  <option value="crossed" ${m.assemblyMode === 'crossed' ? 'selected' : ''}>Cruzada</option>
                </select>
              </div>
            ` : `
              <div class="text-[10px] text-slate-400 font-medium">💡 Arraste o pino A para alterar o raio r1, ou o pistão B para alterar r2.</div>
            `}
          </div>
        </div>
      `;

      const w1Range = document.getElementById('ins-link-w1');
      if (w1Range) w1Range.oninput = (e) => {
        const val = parseFloat(e.target.value);
        m.w1 = is4Bar ? val : val * 10;
        this.solveAndRefresh();
      };
      
      const modeSelect = document.getElementById('ins-link-mode');
      if (modeSelect) modeSelect.onchange = (e) => {
        m.assemblyMode = e.target.value;
        this.solveAndRefresh();
      };
    }

    else if (sel.type.startsWith('slider_') || sel.type === 'rod' || sel.type === 'rod_tip') {
      const m = this.barraDeslizanteModel;
      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-[var(--accent)]">Propriedades da Barra Deslizante</div>
          <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Veloc. w:</span>
              <input type="range" id="ins-bd-w" min="0.1" max="5.0" step="0.1" value="${m.w}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${m.w.toFixed(1)} rad/s</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Massa m:</span>
              <input type="range" id="ins-bd-m" min="0.5" max="15.0" step="0.5" value="${m.m}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${m.m.toFixed(1)} kg</span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('ins-bd-w').oninput = (e) => {
        m.w = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
      document.getElementById('ins-bd-m').oninput = (e) => {
        m.m = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
    }

    else if (sel.type.startsWith('disk') || sel.type === 'center_G' || sel.type === 'point_P' || sel.type === 'vel_arrow') {
      const m = this.discoRolanteModel;
      container.innerHTML = `
        <div class="flex flex-col md:flex-row items-center gap-4 w-full">
          <div class="text-xs font-bold text-[var(--text-primary)]">Parâmetros da Roda Rolante</div>
          <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Acel. aG:</span>
              <input type="range" id="ins-dr-aG" min="-3" max="3" step="0.2" value="${m.aG}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${m.aG.toFixed(1)} m/s²</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400">Massa m:</span>
              <input type="range" id="ins-dr-m" min="1.0" max="30.0" step="1.0" value="${m.m}" class="flex-1 accent-[var(--accent)] cursor-pointer h-1.5">
              <span class="text-xs font-bold w-12">${m.m.toFixed(0)} kg</span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('ins-dr-aG').oninput = (e) => {
        m.aG = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
      document.getElementById('ins-dr-m').oninput = (e) => {
        m.m = parseFloat(e.target.value);
        this.solveAndRefresh();
      };
    }
  }

  renderResolutionTab() {
    const container = document.getElementById('panel-resolution');
    if (!container) return;

    if (!this.solvedResult) {
      container.innerHTML = `<div class="p-6 text-sm text-slate-400">Resolva o exercício para visualizar a resolução passo a passo.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        <h3 class="text-lg font-bold border-b border-[var(--panel-border)] pb-2">Passo a Passo Detalhado (KaTeX)</h3>
        <div id="katex-render-area" class="space-y-6 leading-relaxed text-sm text-[var(--text-primary)]">
        </div>
      </div>
    `;

    const renderArea = document.getElementById('katex-render-area');
    if (renderArea && window.katex) {
      const rawLines = this.solvedResult.resolutionMarkdown.split('\n');
      let html = '';
      
      rawLines.forEach(line => {
        if (line.startsWith('### ')) {
          html += `<h4 class="text-base font-bold text-[var(--text-primary)] mt-6 mb-2 border-b border-dashed border-[var(--panel-border)] pb-1">${line.substring(4)}</h4>`;
        } else if (line.startsWith('- ')) {
          html += `<p class="ml-4 list-disc my-1">${line.substring(2)}</p>`;
        } else if (line.startsWith('$$') && line.endsWith('$$')) {
          const formula = line.substring(2, line.length - 2);
          try {
            const mathHtml = window.katex.renderToString(formula, { displayMode: true, throwOnError: false });
            html += `<div class="my-4 overflow-x-auto">${mathHtml}</div>`;
          } catch(e) {
            html += `<pre class="my-4 p-2 bg-red-50 text-red-500 rounded">${formula}</pre>`;
          }
        } else {
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
      renderArea.innerHTML = `<div class="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-xs">KaTeX indisponível.</div>`;
    }
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
          <div><span class="text-[var(--text-secondary)]">Amortec. Eq. (ceq):</span></div>
          <div class="text-right font-semibold"><span>${r.c_eq.toFixed(2)} N·m·s/rad</span></div>
        </div>
        <div class="grid grid-cols-2 gap-y-3 gap-x-2 border-b border-[var(--panel-border)] pb-3 mt-3">
          <div><span class="text-[var(--text-secondary)]">Freq. Natural (fn):</span></div>
          <div class="text-right font-semibold"><span>${r.f_n.toFixed(3)} Hz</span></div>
          <div><span class="text-[var(--text-secondary)]">Razão Damping (\u03b6):</span></div>
          <div class="text-right font-semibold"><span>${r.zeta.toFixed(4)}</span></div>
        </div>
        <div class="pt-2 text-xs">
          <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-[var(--panel-border)]">
            <span class="font-medium text-[var(--text-secondary)]">Tipo Sistema:</span>
            <span class="font-bold text-[var(--accent)] uppercase tracking-wider">${r.dampingType}</span>
          </div>
        </div>
      `;
    } else if (this.subType === 'quatro_barras') {
      const r = this.solvedResult.results;
      const f = r.forces;
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
        ${f ? `
          <div class="text-[11px] space-y-1.5 pt-2">
            <div class="font-bold text-slate-500 uppercase text-[10px] mb-1">Reações de Apoio nos Pinos:</div>
            <div class="flex justify-between"><span>Hinge O (Ox, Oy):</span><span class="font-semibold">${f.Ox.toFixed(1)}, ${f.Oy.toFixed(1)} N</span></div>
            <div class="flex justify-between"><span>Joint A (Ax, Ay):</span><span class="font-semibold">${f.Ax.toFixed(1)}, ${f.Ay.toFixed(1)} N</span></div>
            <div class="flex justify-between"><span>Joint B (Bx, By):</span><span class="font-semibold">${f.Bx.toFixed(1)}, ${f.By.toFixed(1)} N</span></div>
            <div class="flex justify-between font-bold border-t border-[var(--panel-border)] pt-2 mt-2"><span>Binário Motor (M):</span><span class="text-[var(--accent)] font-mono">${f.M.toFixed(3)} N·m</span></div>
          </div>
        ` : ''}
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
        ${f ? `
          <div class="text-[11px] space-y-1.5 pt-2">
            <div class="font-bold text-slate-500 uppercase text-[10px] mb-1">Reações de Apoio nos Pinos:</div>
            <div class="flex justify-between"><span>Crank Support O:</span><span class="font-semibold">${f.Ox.toFixed(1)}, ${f.Oy.toFixed(1)} N</span></div>
            <div class="flex justify-between"><span>Crankpin A (Ax, Ay):</span><span class="font-semibold">${f.Ax.toFixed(1)}, ${f.Ay.toFixed(1)} N</span></div>
            <div class="flex justify-between"><span>Wristpin B (Bx, By):</span><span class="font-semibold">${f.Bx.toFixed(1)}, ${f.By.toFixed(1)} N</span></div>
            <div class="flex justify-between font-bold border-t border-[var(--panel-border)] pt-2 mt-2"><span>Força Normal Parede:</span><span class="font-semibold text-[var(--success)]">${f.N.toFixed(1)} N</span></div>
            <div class="flex justify-between font-bold"><span>Binário Motor (M):</span><span class="text-[var(--accent)] font-mono">${f.M.toFixed(2)} N·m</span></div>
          </div>
        ` : ''}
      `;
    } else if (this.subType === 'barra_deslizante') {
      const r = this.solvedResult.results;
      summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-y-2 gap-x-2 border-b border-[var(--panel-border)] pb-2 text-[11px]">
          <div><span class="text-[var(--text-secondary)]">A (Chão):</span></div><div class="text-right font-semibold"><span>(${r.xA.toFixed(3)}, 0) m</span></div>
          <div><span class="text-[var(--text-secondary)]">B (Parede):</span></div><div class="text-right font-semibold"><span>(0, ${r.yB.toFixed(3)}) m</span></div>
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
          <div><span class="text-[var(--text-secondary)]">Veloc. Angular (\u03c9):</span></div><div class="text-right font-semibold"><span>${r.w.toFixed(2)} rad/s</span></div>
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
