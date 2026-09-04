import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  // Redis Client：Node.js 和 Redis Server 通信的客户端，负责发 GET/SET/DEL 等命令。
  private readonly client: RedisClientType;
  private ready = false;

  constructor(configService: ConfigService) {
    const url = configService.getOrThrow<string>('REDIS_URL');
    // createClient({ url })：按 REDIS_URL 创建客户端，此时还没真正连上 Redis。
    this.client = createClient({ url });
    this.client.on('ready', () => {
      this.ready = true;
    });
    this.client.on('end', () => {
      this.ready = false;
    });
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis client error: ${error.message || error}`);
    });
  }

  // OnModuleInit：NestJS 在当前 Module 初始化完成后调用。
  // 适合建立 Redis/数据库等外部连接，不要在 constructor 里 await 网络 I/O。
  async onModuleInit() {
    try {
      // connect()：建立到 Redis Server 的 TCP 连接。node-redis 必须显式调用，不会在 createClient 后自动连上。
      await this.client.connect();
      this.ready = true;
    } catch (error) {
      this.ready = false;
      const message = error instanceof Error ? error.message : String(error);
      // 缓存是性能层：启动连不上 Redis 不阻止 Nest 启动，查询会降级走 MySQL。
      this.logger.warn(`Redis connect failed, cache degraded: ${message}`);
    }
  }

  // OnModuleDestroy：应用关闭时调用，适合释放连接，避免进程退出后连接残留。
  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
    this.ready = false;
  }

  private ensureReady() {
    if (!this.ready || !this.client.isOpen) {
      throw new Error('Redis unavailable');
    }
  }

  // GET：根据 key 读取字符串值。key 不存在或已过期时返回 null（不是字符串 "null"）。
  async get(key: string): Promise<string | null> {
    this.ensureReady();
    return this.client.get(key);
  }

  // SET：写入 key/value。ttlSeconds 对应 Redis EX，到期后 Redis 自动过期删除。
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.ensureReady();
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, {
        expiration: { type: 'EX', value: ttlSeconds },
      });
      return;
    }
    await this.client.set(key, value);
  }

  // DEL：删除缓存。数据库更新/删除成功后用它做 Cache Invalidation。
  async del(key: string): Promise<void> {
    this.ensureReady();
    await this.client.del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}
