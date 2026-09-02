import { Injectable } from '@nestjs/common';

// @Injectable()：声明这个类可以作为 Provider，被 NestJS 的依赖注入容器管理。
// 把它注册到 Module.providers 后，就可以被 Controller 或其他 Provider 注入使用。
// 这里使用它，是为了让 AppController 通过 constructor 拿到 AppService，而不是自己 new。
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello NestJS V1';
  }
}
