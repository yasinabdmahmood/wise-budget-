import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Category } from '../../core/models';

@Component({
  selector: 'wb-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {
  allCategories = signal<Category[]>([]);
  loading  = signal(true);
  saving   = signal(false);
  error    = signal('');
  showSheet = signal(false);
  editTarget = signal<Category | null>(null);
  activeTab  = signal<'expense' | 'income'>('expense');
  showEmojiPicker = signal(false);

  form!: FormGroup;

  readonly EMOJIS = [
    '🍔','🛒','🍽️','☕','🏠','🏡','🔧','🛋️','🚗','⛽','🚌','🚕',
    '🏥','💊','🏋️','📚','🎓','💻','🛍️','👗','📱','🎬','📺','🎮',
    '✈️','💡','⚡','💧','📡','📞','💼','📈','🏢','🎁','💰','💵',
    '🏦','💳','🏧','📦','🎉','💹','🏘️','🌐','🔑','🎵','⚽','🐶',
    '🌸','🍕','🧾','🚀','💎','🧴','👶','🐱','🎨','🏖️','🎓','🔬'
  ];

  // Tree: expense root categories with children
  expenseTree = computed(() =>
    this.allCategories().filter(c => c.type === 'expense' && c.parent_id === null)
      .map(p => ({ ...p, children: this.allCategories().filter(c => c.parent_id === p.id) }))
  );

  incomeTree = computed(() =>
    this.allCategories().filter(c => c.type === 'income' && c.parent_id === null)
      .map(p => ({ ...p, children: this.allCategories().filter(c => c.parent_id === p.id) }))
  );

  // Active tab tree (replaces @let in template — not available in Angular 17)
  activeTree = computed(() =>
    this.activeTab() === 'expense' ? this.expenseTree() : this.incomeTree()
  );

  // Parents available for child assignment (same type, flat list)
  parentOptions = computed(() =>
    this.allCategories().filter(c => c.type === this.activeTab() && c.parent_id === null)
  );

  constructor(private api: ApiService, private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      name:      ['', [Validators.required, Validators.minLength(2)]],
      logo:      ['📦'],
      parent_id: [null],
      type:      [this.activeTab()]
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getCategories(undefined, true).subscribe({
      next:  r => { this.allCategories.set(r.categories); this.loading.set(false); },
      error: () => { this.error.set('Failed to load categories'); this.loading.set(false); }
    });
  }

  setTab(t: 'expense' | 'income') {
    this.activeTab.set(t);
    this.form.patchValue({ type: t, parent_id: null });
  }

  openAdd() {
    this.editTarget.set(null);
    this.form.reset({ name: '', logo: '📦', parent_id: null, type: this.activeTab() });
    this.showSheet.set(true);
  }

  openEdit(c: Category) {
    if (c.user_id === null) return; // system category — read-only
    this.editTarget.set(c);
    this.form.patchValue({ name: c.name, logo: c.logo, parent_id: c.parent_id, type: c.type });
    this.showSheet.set(true);
  }

  pickEmoji(e: string) {
    this.form.patchValue({ logo: e });
    this.showEmojiPicker.set(false);
  }

  submit() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const val = this.form.value;
    const req = this.editTarget()
      ? this.api.updateCategory(this.editTarget()!.id, val)
      : this.api.createCategory(val);
    req.subscribe({
      next:  () => { this.showSheet.set(false); this.load(); this.saving.set(false); },
      error: (e) => { this.error.set(e.error?.error || 'Save failed'); this.saving.set(false); }
    });
  }

  delete(c: Category) {
    if (c.user_id === null) return;
    if (!confirm(`Delete "${c.name}"?`)) return;
    this.api.deleteCategory(c.id).subscribe({
      next:  () => this.load(),
      error: () => this.error.set('Delete failed')
    });
  }

  isSystem(c: Category) { return c.user_id === null; }
  closeSheet() { this.showSheet.set(false); this.showEmojiPicker.set(false); }
}
