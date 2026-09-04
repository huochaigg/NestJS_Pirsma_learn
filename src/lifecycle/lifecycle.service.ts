import { Injectable } from '@nestjs/common';

@Injectable()
export class LifecycleService {
  ping() {
    console.log('[lifecycle] Service');
    return { ok: true };
  }
}
