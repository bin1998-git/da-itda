const TOSS_API = 'https://api.tosspayments.com/v1/payments';

function authHeader() {
  const key = process.env.TOSS_SECRET_KEY!;
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}

export interface TossResult {
  ok: boolean;
  status?: string;
  message?: string;
}

export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossResult> {
  const res = await fetch(`${TOSS_API}/confirm`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, message: data.message ?? '결제 승인에 실패했습니다.' };
  return { ok: true, status: data.status };
}

export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number,
): Promise<TossResult> {
  const res = await fetch(`${TOSS_API}/${paymentKey}/cancel`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(cancelAmount != null ? { cancelReason, cancelAmount } : { cancelReason }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, message: data.message ?? '결제 취소에 실패했습니다.' };
  return { ok: true, status: data.status };
}
