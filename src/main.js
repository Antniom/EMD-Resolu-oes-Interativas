// Main application entry point and subject router

import { EacModule } from './subjects/eac/eacModule.js';

// Registered Subjects List
// To add a new subject, import its module, add its entry here, and it will automatically appear in the dashboard!
const SUBJECTS = [
  { id: 'eac', name: 'Estruturas de Alma Cheia (EAC)', class: EacModule }
];

let activeSubjectInstance = null;
let currentSubjectId = 'eac';

function renderAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-glow)] selection:text-[var(--accent)]">
      <!-- Top navbar header -->
      <header class="h-16 px-6 border-b border-[var(--panel-border)] bg-[var(--bg-card)]/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-[var(--text-primary)] flex items-center justify-center font-bold text-white shadow-md">Σ</div>
          <span class="font-display font-bold text-lg tracking-tight text-[var(--text-primary)]">EMD Resoluções Interativas</span>
        </div>
        <div class="flex items-center gap-4">
          <!-- Subject Selector -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-[var(--text-secondary)] font-medium">Disciplina:</span>
            <select id="subject-selector" class="bg-[var(--bg-card)] border border-[var(--panel-border)] rounded-lg text-xs py-1 px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] cursor-pointer">
              ${SUBJECTS.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('')}
            </select>
          </div>
          <button id="help-btn" class="w-8 h-8 rounded-full border border-[var(--panel-border)] bg-[var(--bg-card)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] flex items-center justify-center text-[var(--text-secondary)] text-sm transition-all shadow-sm">?</button>
        </div>
      </header>

      <!-- Main workspace -->
      <main class="flex-1 p-6 overflow-y-auto max-w-[1400px] w-full mx-auto" id="subject-workspace">
        <!-- Loaded Subject Workspace gets rendered here -->
      </main>

      <!-- Help Modal -->
      <div id="help-modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center hidden opacity-0 transition-opacity duration-300">
        <div class="bg-[var(--bg-card)] border border-[var(--panel-border)] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative animate-fade-in">
          <button id="close-help-btn" class="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl font-bold">&times;</button>
          <div id="help-content" class="prose max-h-[500px] overflow-y-auto text-[var(--text-secondary)] text-sm space-y-4 pr-2">
            <!-- Dynamic help text gets rendered here -->
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="h-10 border-t border-[var(--panel-border)] bg-[var(--bg-card)]/40 flex items-center justify-center text-[10px] text-[var(--text-tertiary)]">
        &copy; 2026 EMD Resolucoes Interativas. Pair-programmed with Gemini.
      </footer>
    </div>
  `;

  // Bind Events
  const selector = document.getElementById('subject-selector');
  selector.value = currentSubjectId;
  selector.onchange = (e) => {
    switchSubject(e.target.value);
  };

  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('close-help-btn');

  helpBtn.onclick = () => {
    const helpContent = document.getElementById('help-content');
    if (activeSubjectInstance && helpContent) {
      // Very basic markdown parser for help text
      const rawText = activeSubjectInstance.getHelpText();
      helpContent.innerHTML = rawText
        .replace(/### (.*)/g, '<h3 class="text-lg font-bold text-slate-200 mt-4 mb-2">$1</h3>')
        .replace(/#### (.*)/g, '<h4 class="text-sm font-semibold text-slate-300 mt-3 mb-1">$1</h4>')
        .replace(/\- (.*)/g, '<li class="ml-4 list-disc text-slate-400">$1</li>')
        .replace(/(\n)/g, '<br>');
    }
    helpModal.classList.remove('hidden');
    setTimeout(() => helpModal.classList.add('opacity-100'), 50);
  };

  const closeHelp = () => {
    helpModal.classList.remove('opacity-100');
    setTimeout(() => helpModal.classList.add('hidden'), 300);
  };
  closeHelpBtn.onclick = closeHelp;
  helpModal.onclick = (e) => {
    if (e.target === helpModal) closeHelp();
  };
}

function switchSubject(subjectId) {
  if (activeSubjectInstance) {
    activeSubjectInstance.destroy();
  }

  currentSubjectId = subjectId;
  const subject = SUBJECTS.find(sub => sub.id === subjectId);
  if (!subject) return;

  const workspace = document.getElementById('subject-workspace');
  if (workspace) {
    activeSubjectInstance = new subject.class(workspace);
    activeSubjectInstance.initialize();
  }
}

// Boot the application
function bootApp() {
  const app = document.getElementById('app');
  if (!app) {
    // If DOM is not fully ready, wait for it
    document.addEventListener('DOMContentLoaded', () => {
      const appRetry = document.getElementById('app');
      if (appRetry) {
        renderAppShell();
        switchSubject(currentSubjectId);
      } else {
        console.error("EMD Resolucoes: Elemento #app nao encontrado no DOM.");
      }
    });
    return;
  }
  renderAppShell();
  switchSubject(currentSubjectId);
}

bootApp();
