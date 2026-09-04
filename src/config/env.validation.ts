import * as Joi from 'joi';

// Joi.object()：描述“环境变量必须长什么样”的校验表。
// 交给 ConfigModule.validationSchema 后，应用启动时就会检查；配错直接失败。
export const envValidationSchema = Joi.object({
  // NODE_ENV：部署环境标记。只认识这三个值，先建立概念，业务代码不要到处判断它。
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  // PORT：HTTP 监听端口。Joi.number() 会把 .env 里的字符串 "4070" 转成 number。
  PORT: Joi.number().port().default(4070),
  // DATABASE_URL：Nest 运行时和 Prisma CLI 都需要它。缺失不能给弱默认值。
  DATABASE_URL: Joi.string().required(),
  // JWT_SECRET：签名密钥。必填且足够长；禁止 JWT_SECRET || 'secret' 这种弱兜底。
  JWT_SECRET: Joi.string().min(32).required(),
  // JWT_EXPIRES_IN：例如 1h、30m。具体格式由 jsonwebtoken/ms 解析。
  JWT_EXPIRES_IN: Joi.string().required(),
  // LEARNING_API_KEY：V15 ApiKeyGuard 用的学习密钥。
  LEARNING_API_KEY: Joi.string().min(8).required(),
  // REDIS_URL：Redis 连接地址，例如 redis://localhost:6379。必填，不要在代码里写死。
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
});
