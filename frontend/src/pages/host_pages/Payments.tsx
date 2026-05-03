import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type PaymentCurrency = "PHP" | "USD" | "EUR";
type PaymentStatus =
  | "unpaid"
  | "pending"
  | "partial"
  | "paid"
  | "failed"
  | "refunded"
  | "waived";
type PaymentMethod = "cash" | "ewallet";

type PaymentPlayer = {
  id: string;
  status: "accepted" | "banned";
  paymentStatus: PaymentStatus;
  player: {
    username: string;
    isStatic: boolean;
  };
  payment: {
    id: string | null;
    amountExpected: number;
    amountPaid: number;
    balance: number;
    currency: PaymentCurrency;
    status: PaymentStatus;
    method: PaymentMethod | null;
  };
};

type PaymentsSummary = {
  totalPlayers: number;
  totalExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  waivedCount: number;
  refundedCount: number;
};

type PaymentsData = {
  pricing: {
    id: string | null;
    entranceFee: number;
    perMatchFee: number;
    currency: PaymentCurrency;
  };
  summary: PaymentsSummary;
  players: PaymentPlayer[];
};

type PricingDraft = {
  entranceFee: string;
  perMatchFee: string;
  currency: PaymentCurrency;
};

type PlayerPaymentDraft = {
  amountExpected: string;
  amountPaid: string;
  status: PaymentStatus;
  method: PaymentMethod | "";
};

const INITIAL_SUMMARY: PaymentsSummary = {
  totalPlayers: 0,
  totalExpected: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  paidCount: 0,
  partialCount: 0,
  unpaidCount: 0,
  waivedCount: 0,
  refundedCount: 0,
};

const CURRENCY_OPTIONS: PaymentCurrency[] = ["PHP", "USD", "EUR"];
const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  "unpaid",
  "pending",
  "partial",
  "paid",
  "failed",
  "refunded",
  "waived",
];
const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ["cash", "ewallet"];

const formatMoney = (amount: number, currency: PaymentCurrency) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);

const toAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export default function Payments() {
  const { communityId, hostId } = useParams();
  const [paymentsData, setPaymentsData] = useState<PaymentsData | null>(null);
  const [pricingDraft, setPricingDraft] = useState<PricingDraft>({
    entranceFee: "0",
    perMatchFee: "0",
    currency: "PHP",
  });
  const [playerDrafts, setPlayerDrafts] = useState<
    Record<string, PlayerPaymentDraft>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = async () => {
    if (!communityId || !hostId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/payments`,
        { withCredentials: true },
      );

      const nextData = response.data as {
        pricing: PaymentsData["pricing"];
        summary: PaymentsSummary;
        players: PaymentPlayer[];
      };

      setPaymentsData(nextData);
      setPricingDraft({
        entranceFee: String(nextData.pricing.entranceFee),
        perMatchFee: String(nextData.pricing.perMatchFee),
        currency: nextData.pricing.currency,
      });
      setPlayerDrafts(
        Object.fromEntries(
          nextData.players.map((player) => [
            player.id,
            {
              amountExpected: String(player.payment.amountExpected),
              amountPaid: String(player.payment.amountPaid),
              status: player.payment.status,
              method: player.payment.method ?? "",
            },
          ]),
        ),
      );
    } catch (loadError) {
      setError("Unable to load payments.");

      if (axios.isAxiosError(loadError))
        console.error(loadError.response?.data ?? loadError);
      else console.error(loadError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, [communityId, hostId]);

  const handleSavePricing = async () => {
    if (!communityId || !hostId) return;

    setIsSavingPricing(true);
    setError(null);

    try {
      await axios.patch(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/payments/pricing`,
        {
          entranceFee: toAmount(pricingDraft.entranceFee),
          perMatchFee: toAmount(pricingDraft.perMatchFee),
          currency: pricingDraft.currency,
        },
        { withCredentials: true },
      );

      await loadPayments();
    } catch (saveError) {
      setError("Unable to save pricing.");

      if (axios.isAxiosError(saveError))
        console.error(saveError.response?.data ?? saveError);
      else console.error(saveError);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleSavePlayerPayment = async (hostedPlayerId: string) => {
    if (!communityId || !hostId) return;

    const draft = playerDrafts[hostedPlayerId];
    if (!draft) return;

    setSavingPlayerId(hostedPlayerId);
    setError(null);

    try {
      await axios.patch(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/payments/${hostedPlayerId}`,
        {
          amountExpected: toAmount(draft.amountExpected),
          amountPaid: toAmount(draft.amountPaid),
          status: draft.status,
          method: draft.method || null,
        },
        { withCredentials: true },
      );

      await loadPayments();
    } catch (saveError) {
      setError("Unable to save player payment.");

      if (axios.isAxiosError(saveError))
        console.error(saveError.response?.data ?? saveError);
      else console.error(saveError);
    } finally {
      setSavingPlayerId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-stone-600">Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-1">
      <header>
        <h3>Payments</h3>
        <p className="text-sm text-stone-500">
          Set host pricing and update player payment status.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <header className="mb-3">
          <h4 className="font-semibold">Pricing</h4>
        </header>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            <span>Entrance fee</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={pricingDraft.entranceFee}
              onChange={(event) =>
                setPricingDraft((current) => ({
                  ...current,
                  entranceFee: event.target.value,
                }))
              }
              className="rounded-md border px-3 py-1.5"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Per match fee</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={pricingDraft.perMatchFee}
              onChange={(event) =>
                setPricingDraft((current) => ({
                  ...current,
                  perMatchFee: event.target.value,
                }))
              }
              className="rounded-md border px-3 py-1.5"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Currency</span>
            <select
              value={pricingDraft.currency}
              onChange={(event) =>
                setPricingDraft((current) => ({
                  ...current,
                  currency: event.target.value as PaymentCurrency,
                }))
              }
              className="rounded-md border px-3 py-1.5"
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleSavePricing()}
            disabled={isSavingPricing}
            className={`rounded-md px-3 py-1.5 text-sm text-white ${
              isSavingPricing
                ? "cursor-not-allowed bg-stone-400"
                : "cursor-pointer bg-stone-800 hover:bg-stone-700"
            }`}
          >
            {isSavingPricing ? "Saving..." : "Save pricing"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <header className="mb-3">
          <h4 className="font-semibold">Summary</h4>
        </header>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-stone-500">Total expected</p>
            <p className="font-semibold">
              {formatMoney(
                paymentsData?.summary.totalExpected ?? 0,
                paymentsData?.pricing.currency ?? "PHP",
              )}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-stone-500">Total paid</p>
            <p className="font-semibold">
              {formatMoney(
                paymentsData?.summary.totalPaid ?? 0,
                paymentsData?.pricing.currency ?? "PHP",
              )}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-stone-500">Outstanding</p>
            <p className="font-semibold">
              {formatMoney(
                paymentsData?.summary.totalOutstanding ?? 0,
                paymentsData?.pricing.currency ?? "PHP",
              )}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-stone-500">Paid players</p>
            <p className="font-semibold">
              {paymentsData?.summary.paidCount ?? INITIAL_SUMMARY.paidCount}/
              {paymentsData?.summary.totalPlayers ?? INITIAL_SUMMARY.totalPlayers}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <header className="mb-3">
          <h4 className="font-semibold">Players</h4>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Player
                </th>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Host status
                </th>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Payment status
                </th>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Expected
                </th>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Paid
                </th>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Method
                </th>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Balance
                </th>
                <th className="px-2 py-2 text-left text-sm font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paymentsData && paymentsData.players.length > 0 ? (
                paymentsData.players.map((player) => {
                  const draft = playerDrafts[player.id];
                  const expectedAmount = toAmount(
                    draft?.amountExpected ?? String(player.payment.amountExpected),
                  );
                  const paidAmount = toAmount(
                    draft?.amountPaid ?? String(player.payment.amountPaid),
                  );
                  const balance = Math.max(0, expectedAmount - paidAmount);

                  return (
                    <tr key={player.id} className="border-t border-stone-200">
                      <td className="px-2 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{player.player.username}</span>
                          {player.player.isStatic && (
                            <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] text-stone-700">
                              Static
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-sm">{player.status}</td>
                      <td className="px-2 py-2">
                        <select
                          value={draft?.status ?? player.payment.status}
                          onChange={(event) =>
                            setPlayerDrafts((current) => ({
                              ...current,
                              [player.id]: {
                                ...(current[player.id] ?? {
                                  amountExpected: String(
                                    player.payment.amountExpected,
                                  ),
                                  amountPaid: String(player.payment.amountPaid),
                                  status: player.payment.status,
                                  method: player.payment.method ?? "",
                                }),
                                status: event.target.value as PaymentStatus,
                              },
                            }))
                          }
                          className="rounded-md border px-2 py-1 text-sm"
                        >
                          {PAYMENT_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            draft?.amountExpected ??
                            String(player.payment.amountExpected)
                          }
                          onChange={(event) =>
                            setPlayerDrafts((current) => ({
                              ...current,
                              [player.id]: {
                                ...(current[player.id] ?? {
                                  amountExpected: String(
                                    player.payment.amountExpected,
                                  ),
                                  amountPaid: String(player.payment.amountPaid),
                                  status: player.payment.status,
                                  method: player.payment.method ?? "",
                                }),
                                amountExpected: event.target.value,
                              },
                            }))
                          }
                          className="w-[112px] rounded-md border px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            draft?.amountPaid ?? String(player.payment.amountPaid)
                          }
                          onChange={(event) =>
                            setPlayerDrafts((current) => ({
                              ...current,
                              [player.id]: {
                                ...(current[player.id] ?? {
                                  amountExpected: String(
                                    player.payment.amountExpected,
                                  ),
                                  amountPaid: String(player.payment.amountPaid),
                                  status: player.payment.status,
                                  method: player.payment.method ?? "",
                                }),
                                amountPaid: event.target.value,
                              },
                            }))
                          }
                          className="w-[112px] rounded-md border px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={draft?.method ?? player.payment.method ?? ""}
                          onChange={(event) =>
                            setPlayerDrafts((current) => ({
                              ...current,
                              [player.id]: {
                                ...(current[player.id] ?? {
                                  amountExpected: String(
                                    player.payment.amountExpected,
                                  ),
                                  amountPaid: String(player.payment.amountPaid),
                                  status: player.payment.status,
                                  method: player.payment.method ?? "",
                                }),
                                method: event.target.value as PaymentMethod | "",
                              },
                            }))
                          }
                          className="rounded-md border px-2 py-1 text-sm"
                        >
                          <option value="">None</option>
                          {PAYMENT_METHOD_OPTIONS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {formatMoney(
                          balance,
                          paymentsData.pricing.currency,
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => void handleSavePlayerPayment(player.id)}
                          disabled={savingPlayerId === player.id}
                          className={`rounded-md px-3 py-1 text-sm text-white ${
                            savingPlayerId === player.id
                              ? "cursor-not-allowed bg-stone-400"
                              : "cursor-pointer bg-stone-800 hover:bg-stone-700"
                          }`}
                        >
                          {savingPlayerId === player.id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-2 py-4 text-center text-sm text-stone-500"
                  >
                    No players available for payments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
