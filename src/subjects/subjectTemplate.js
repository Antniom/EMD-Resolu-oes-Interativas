// Template class interface for future subjects
// To add a new subject, inherit from this template class,
// implement the required methods, and register it in src/main.js

export class SubjectTemplate {
  constructor(containerElement, onModelChange) {
    this.container = containerElement;
    this.onModelChange = onModelChange; // callback to inform shell of changes
    this.id = 'template';
    this.name = 'Subject Name Template';
  }

  // Initialize the workspace (create HTML layout, bind events, initialize editors)
  initialize() {
    console.warn(`initialize() not implemented in subject: ${this.id}`);
    this.container.innerHTML = `<div class="p-6 text-slate-400">Subject ${this.name} Workspace</div>`;
  }

  // Clean up timers, window event listeners, canvas animations, etc.
  destroy() {
    // Override in subclass
  }

  // Returns a JSON-serializable state representing the current problem definition
  saveState() {
    console.warn(`saveState() not implemented in subject: ${this.id}`);
    return {};
  }

  // Loads a saved JSON state into the subject editors and triggers a re-solve
  loadState(state) {
    console.warn(`loadState() not implemented in subject: ${this.id}`);
  }

  // Optional: returns details for a help/documentation tab
  getHelpText() {
    return `### Como usar o assunto ${this.name}\n\nInstruções de uso.`;
  }
}
