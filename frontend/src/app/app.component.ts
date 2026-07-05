import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdateService } from './core/services/app-update.service';

@Component({
  selector: 'wb-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class AppComponent {
  // Injecting starts the update watcher
  constructor(private _update: AppUpdateService) {}
}
