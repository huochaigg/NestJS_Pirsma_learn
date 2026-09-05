import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';

type RequestStore = {
  requestId: string;
};

@Injectable()
export class RequestContextService {
  // AsyncLocalStorage：在同一条异步调用链里保存数据。
  // 同一个 HTTP 请求即使经历 await Redis/Prisma，Service 仍能读到这份 requestId，
  // 不必每个函数都手动传参。它只在当前 Nest 进程内有效，不是跨服务的 traceId。
  private static readonly storage = new AsyncLocalStorage<RequestStore>();

  run(requestId: string, next: () => void) {
    RequestContextService.storage.run({ requestId }, next);
  }

  getRequestId(): string {
    return RequestContextService.peek();
  }

  static peek(): string {
    return RequestContextService.storage.getStore()?.requestId ?? '-';
  }

  // Nest 内置 Logger 输出的仍是字符串。字段按 requestId/action 排好，方便以后改成 JSON 接 ELK。
  // 这叫结构化日志思维：{ level, timestamp, requestId, context, action, message }。
  prefix(message: string): string {
    return `[requestId=${this.getRequestId()}] ${message}`;
  }
}
