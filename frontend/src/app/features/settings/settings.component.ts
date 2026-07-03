import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

function passwordsMatch(g: AbstractControl): ValidationErrors | null {
  const p = g.get('newPassword')?.value;
  const c = g.get('confirmPassword')?.value;
  return p && c && p !== c ? { mismatch: true } : null;
}

@Component({
  selector: 'wb-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  user = this.auth.currentUser;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  savingProfile  = signal(false);
  savingPassword = signal(false);
  profileMsg  = signal('');
  passwordMsg = signal('');
  profileErr  = signal('');
  passwordErr = signal('');

  showConfirm = signal(false);   // logout confirm dialog

  readonly APP_VERSION = '1.0.0';

  constructor(private auth: AuthService, private api: ApiService, private fb: FormBuilder) {}

  ngOnInit() {
    this.profileForm = this.fb.group({
      username: [this.user()?.username || '', [Validators.required, Validators.minLength(2)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword:  ['', Validators.required],
      newPassword:      ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword:  ['', Validators.required]
    }, { validators: passwordsMatch });
  }

  saveProfile() {
    if (this.profileForm.invalid || this.savingProfile()) return;
    this.profileErr.set(''); this.profileMsg.set('');
    this.savingProfile.set(true);
    this.api.updateMe({ username: this.profileForm.value.username }).subscribe({
      next:  (r) => { this.auth.patchUser({ username: r.user.username }); this.profileMsg.set('Username updated!'); this.savingProfile.set(false); },
      error: (e) => { this.profileErr.set(e.error?.error || 'Update failed'); this.savingProfile.set(false); }
    });
  }

  savePassword() {
    if (this.passwordForm.invalid || this.savingPassword()) return;
    this.passwordErr.set(''); this.passwordMsg.set('');
    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.api.updateMe({ currentPassword, newPassword }).subscribe({
      next:  () => {
        this.passwordMsg.set('Password changed!');
        this.passwordForm.reset();
        this.savingPassword.set(false);
      },
      error: (e) => { this.passwordErr.set(e.error?.error || 'Change failed'); this.savingPassword.set(false); }
    });
  }

  confirmLogout() { this.showConfirm.set(true); }
  cancelLogout()  { this.showConfirm.set(false); }
  logout()        { this.auth.logout(); }
}
