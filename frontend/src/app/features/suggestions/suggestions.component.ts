import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuggestionDbService } from '../../core/services/suggestion-db.service';
import { SuggestionItem } from '../../core/services/offline-db.service';

type CreateType = 'folder' | 'file';

interface Crumb { id: number | null; name: string; }

@Component({
  selector: 'wb-suggestions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suggestions.component.html',
  styleUrl: './suggestions.component.css'
})
export class SuggestionsComponent implements OnInit {

  // ── Directory state ───────────────────────────
  path    = signal<Crumb[]>([]);                   // breadcrumb trail
  items   = signal<SuggestionItem[]>([]);
  loading = signal(false);

  currentFolderId = computed<number | null>(() => {
    const p = this.path();
    return p.length > 0 ? p[p.length - 1].id : null;
  });

  // ── File editor state ─────────────────────────
  openFile    = signal<SuggestionItem | null>(null);
  editContent = signal('');
  saved       = signal(false);   // brief "Saved ✓" flash
  saving      = signal(false);

  // ── Create sheet state ────────────────────────
  showCreate  = signal(false);
  createType  = signal<CreateType>('file');
  createName  = signal('');
  creating    = signal(false);
  createError = signal('');

  // ── Rename sheet state ────────────────────────
  renameTarget = signal<SuggestionItem | null>(null);
  renameName   = signal('');

  constructor(private db: SuggestionDbService) {}

  ngOnInit() { this.load(); }

  // ── Load current directory ────────────────────
  async load() {
    this.loading.set(true);
    this.items.set(await this.db.getChildren(this.currentFolderId()));
    this.loading.set(false);
  }

  // ── Navigation ────────────────────────────────
  navigateInto(folder: SuggestionItem) {
    this.path.update(p => [...p, { id: folder.id!, name: folder.name }]);
    this.load();
  }

  navigateTo(index: number) {
    // index -1 = root, otherwise slice to that breadcrumb
    this.path.update(p => index < 0 ? [] : p.slice(0, index + 1));
    this.load();
  }

  // ── File editor ───────────────────────────────
  openEditor(file: SuggestionItem) {
    this.openFile.set(file);
    this.editContent.set(file.content);
    this.saved.set(false);
  }

  closeEditor() {
    this.openFile.set(null);
  }

  onContentInput(event: Event) {
    this.editContent.set((event.target as HTMLTextAreaElement).value);
    this.saved.set(false);
  }

  async saveFile() {
    const file = this.openFile();
    if (!file?.id) return;
    this.saving.set(true);
    await this.db.saveContent(file.id, this.editContent());
    this.saving.set(false);
    this.saved.set(true);
    // Update local signal so re-opening shows fresh content
    this.openFile.set({ ...file, content: this.editContent() });
    setTimeout(() => this.saved.set(false), 2000);
  }

  // ── Create ────────────────────────────────────
  openCreate() {
    this.createName.set('');
    this.createError.set('');
    this.createType.set('file');
    this.showCreate.set(true);
  }

  closeCreate() { this.showCreate.set(false); }

  async createItem() {
    const name = this.createName().trim();
    if (!name) { this.createError.set('Please enter a name.'); return; }

    // Check for duplicate name in current folder
    const existing = this.items().find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) { this.createError.set('A file or folder with that name already exists.'); return; }

    this.creating.set(true);
    await this.db.create({
      name,
      type:      this.createType(),
      parent_id: this.currentFolderId(),
      content:   ''
    });
    this.creating.set(false);
    this.showCreate.set(false);
    await this.load();
  }

  // ── Rename ────────────────────────────────────
  openRename(item: SuggestionItem, event: Event) {
    event.stopPropagation();
    this.renameTarget.set(item);
    this.renameName.set(item.name);
  }

  closeRename() { this.renameTarget.set(null); }

  async confirmRename() {
    const name = this.renameName().trim();
    const target = this.renameTarget();
    if (!name || !target?.id) return;
    await this.db.rename(target.id, name);
    this.closeRename();
    await this.load();
    // If the renamed item is the currently open file, refresh
    if (this.openFile()?.id === target.id) {
      this.openFile.update(f => f ? { ...f, name } : f);
    }
  }

  // ── Delete ────────────────────────────────────
  async deleteItem(item: SuggestionItem, event: Event) {
    event.stopPropagation();
    const label = item.type === 'folder'
      ? `Delete folder "${item.name}" and everything inside?`
      : `Delete file "${item.name}"?`;
    if (!confirm(label)) return;
    await this.db.deleteItem(item.id!);
    await this.load();
  }

  // ── Helpers ───────────────────────────────────
  fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  onRenameInput(e: Event)  { this.renameName.set((e.target as HTMLInputElement).value); }
  onCreateInput(e: Event)  { this.createName.set((e.target as HTMLInputElement).value);
                              this.createError.set(''); }
}
