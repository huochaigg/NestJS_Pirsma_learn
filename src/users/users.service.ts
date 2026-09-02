import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface User {
  id: number;
  name: string;
  age: number;
}

// @Injectable()：V1 已学过。声明本类可被 NestJS DI 容器管理，注册到 providers 后才能注入。
@Injectable()
export class UsersService {
  // PrismaService 来自 PrismaModule.exports，所以这里可以注入。
  // V4 只接数据库链路，内存 CRUD 先保留，V5 再整体迁到 Prisma。
  constructor(private readonly prisma: PrismaService) {}

  private users: User[] = [
    { id: 1, name: 'Tom', age: 20 },
    { id: 2, name: 'Jerry', age: 22 },
    { id: 3, name: 'Kun', age: 25 },
  ];

  findAll(): User[] {
    return this.users;
  }

  getDatabaseUsers() {
    // this.prisma：注入进来的 PrismaService（本质是 PrismaClient）。
    // .user：根据 schema 里的 model User 自动生成的模型客户端。
    // .findMany()：查询多条 User 数据。where/select/include 放到 V5 再学。
    return this.prisma.user.findMany();
  }

  findOne(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  search(keyword: string): User[] {
    return this.users.filter((user) => user.name.includes(keyword));
  }

  create(user: { name: string; age: number }): User {
    const id =
      this.users.length === 0
        ? 1
        : Math.max(...this.users.map((item) => item.id)) + 1;
    const created: User = { id, name: user.name, age: user.age };
    this.users.push(created);
    return created;
  }

  update(id: number, user: { name?: string; age?: number }): User | undefined {
    const found = this.findOne(id);
    if (!found) {
      return undefined;
    }
    if (user.name !== undefined) {
      found.name = user.name;
    }
    if (user.age !== undefined) {
      found.age = user.age;
    }
    return found;
  }

  remove(id: number): User | undefined {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return undefined;
    }
    const [removed] = this.users.splice(index, 1);
    return removed;
  }
}
