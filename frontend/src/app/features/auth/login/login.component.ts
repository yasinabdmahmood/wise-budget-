import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'wb-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error   = signal('');

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email.value.trim(), this.password.value).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(err.error?.error || 'Login failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
