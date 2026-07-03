import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pass    = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pass && confirm && pass !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'wb-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  form: FormGroup;
  loading = signal(false);
  error   = signal('');

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(2)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm:  ['', Validators.required]
    }, { validators: passwordsMatch });
  }

  get username() { return this.form.get('username')!; }
  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }
  get confirm()  { return this.form.get('confirm')!; }
  get mismatch() { return this.form.errors?.['mismatch'] && this.confirm.touched; }

  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.register(
      this.email.value.trim(),
      this.username.value.trim(),
      this.password.value
    ).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(err.error?.error || 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
