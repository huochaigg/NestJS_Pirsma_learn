import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
  age: number;
}

// @Injectable()：V1 已学过。声明本类可被 NestJS DI 容器管理，注册到 providers 后才能注入。
@Injectable()
export class UsersService {
  private users: User[] = [
    { id: 1, name: 'Tom', age: 20 },
    { id: 2, name: 'Jerry', age: 22 },
    { id: 3, name: 'Kun', age: 25 },
  ];

  findAll(): User[] {
    return this.users;
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
