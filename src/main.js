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
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 selection:text-sky-200">
      <!-- Top navbar header -->
      <header class="h-16 px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">Σ</div>
          <span class="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">EMD Resoluções Interativas</span>
        </div>
        <div class="flex items-center gap-4">
          <!-- Subject Selector -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-medium">Disciplina:</span>
            <select id="subject-selector" class="bg-slate-900 border border-slate-800 rounded-lg text-xs py-1 px-3 text-slate-200 outline-none focus:border-sky-500 cursor-pointer">
              ${SUBJECTS.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('')}
            </select>
          </div>
          <button id="help-btn" class="w-8 h-8 rounded-full border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 text-sm transition-all">?</button>
        </div>
      </header>

      <!-- Main workspace -->
      <main class="flex-1 p-6 overflow-y-auto max-w-[1400px] w-full mx-auto" id="subject-workspace">
        <!-- Loaded Subject Workspace gets rendered here -->
      </main>

      <!-- Help Modal -->
      <div id="help-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center hidden opacity-0 transition-opacity duration-300">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
          <button id="close-help-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xl font-bold">&times;</button>
          <div id="help-content" class="prose prose-invert max-h-[500px] overflow-y-auto text-slate-300 text-sm space-y-4 pr-2">
            <!-- Dynamic help text gets rendered here -->
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="h-10 border-t border-slate-900/80 bg-slate-950/40 flex items-center justify-center text-[10px] text-slate-600">
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
