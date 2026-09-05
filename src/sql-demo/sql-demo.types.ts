// Raw SQL 不会像 prisma.user.findUnique() 那样自动给出完整 Model 类型。
// 必须自己描述结果行；写错字段名要到运行时才发现。不要用 any。
export type SqlUserRow = {
  id: number;
  name: string;
  email: string;
  age: number | null;
  role: string;
};

export type SqlOrderDetailRow = {
  orderId: number;
  orderNo: string;
  amount: number;
  quantity: number;
  status: string;
  userName: string;
  productName: string;
};

export type SqlOrderStatusRow = {
  status: string;
  count: number;
  totalAmount: number;
};

export type SqlUserOrderStatRow = {
  userId: number;
  name: string;
  orderCount: number;
  totalAmount: number;
};
