import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  constructor(private swUpdate: SwUpdate) {
    if (!swUpdate.isEnabled) return;

    // Auto-reload when a new version is activated
    swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        // Reload immediately — user gets fresh files silently
        document.location.reload();
      });

    // Check for updates every 5 minutes
    setInterval(() => swUpdate.checkForUpdate(), 5 * 60 * 1000);

    // Also check immediately on startup
    swUpdate.checkForUpdate();
  }
}
