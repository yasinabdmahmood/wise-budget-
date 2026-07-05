import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'wb-pending',
  standalone: true,
  imports: [CommonModule],
  template: `<div style="padding:24px;text-align:center;color:#6b7280">Coming in Step 5…</div>`
})
export class PendingComponent {}
