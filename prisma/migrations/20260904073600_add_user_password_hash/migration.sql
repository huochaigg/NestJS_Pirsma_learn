-- 已有 User 没有 passwordHash。直接 ADD NOT NULL 且无 DEFAULT 会失败。
-- 先给旧行占位 Hash（不能当正式登录密码），再去掉 DEFAULT，新用户必须显式写入。

-- 添加 passwordHash 列
ALTER TABLE `User` ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL DEFAULT '$2b$10$FsWVgPS8kOSkVQCumoMxtu.j2HdjCUtFGexU2fvLi2wM1jX/Qogme';

-- 去掉默认值
ALTER TABLE `User` ALTER `passwordHash` DROP DEFAULT;
