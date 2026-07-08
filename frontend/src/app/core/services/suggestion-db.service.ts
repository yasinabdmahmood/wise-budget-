import { Injectable } from '@angular/core';
import { OfflineDbService, SuggestionItem } from './offline-db.service';

@Injectable({ providedIn: 'root' })
export class SuggestionDbService {
  constructor(private db: OfflineDbService) {}

  /** Get all direct children of a folder (null = root). Folders first, then files, both alphabetical. */
  async getChildren(parent_id: number | null): Promise<SuggestionItem[]> {
    const all = await this.db.suggestionItems.toArray();
    return all
      .filter(i => i.parent_id === parent_id)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  /** Get a single item by id. */
  getItem(id: number): Promise<SuggestionItem | undefined> {
    return this.db.suggestionItems.get(id);
  }

  /** Create a new folder or file and return its new id. */
  async create(item: Omit<SuggestionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date().toISOString();
    return this.db.suggestionItems.add({ ...item, createdAt: now, updatedAt: now });
  }

  /** Save updated text content to a file. */
  async saveContent(id: number, content: string): Promise<void> {
    await this.db.suggestionItems.update(id, { content, updatedAt: new Date().toISOString() });
  }

  /** Rename a folder or file. */
  async rename(id: number, name: string): Promise<void> {
    await this.db.suggestionItems.update(id, { name, updatedAt: new Date().toISOString() });
  }

  /** Delete an item. If it is a folder, recursively deletes all descendants first. */
  async deleteItem(id: number): Promise<void> {
    const item = await this.db.suggestionItems.get(id);
    if (!item) return;
    if (item.type === 'folder') {
      await this.deleteChildrenOf(id);
    }
    await this.db.suggestionItems.delete(id);
  }

  private async deleteChildrenOf(folderId: number): Promise<void> {
    const all = await this.db.suggestionItems.toArray();
    const children = all.filter(i => i.parent_id === folderId);
    for (const child of children) {
      if (child.type === 'folder' && child.id != null) {
        await this.deleteChildrenOf(child.id);
      }
      await this.db.suggestionItems.delete(child.id!);
    }
  }
}
