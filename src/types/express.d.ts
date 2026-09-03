import 'express';

// 扩展 Express Request 类型，让 req.requestId 有类型，不必写成 any。
// Express 5 的 Request 定义在 express-serve-static-core 里，所以要 augment 这个模块。
// 这只是类型声明，运行时赋值发生在 LoggerMiddleware。
declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}
