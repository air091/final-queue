import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import { api } from "../../lib/api";
import {
  buildPaymentsSummary,
  getPaymentBalance,
  type HostPaymentsData,
  type PaymentCurrency,
  type PaymentMethod,
  type PaymentPlayer,
  type PaymentStatus,
} from "../../lib/host";

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

const CURRENCY_OPTIONS: PaymentCurrency[] = ["PHP", "USD", "EUR"];
const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["unpaid", "paid"];
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
  const { paymentsData, setPaymentsData, refreshHostData } = useHostData();
  const [pricingDraft, setPricingDraft] = useState<PricingDraft>({
    entranceFee: "0",
    perMatchFee: "0",
    currency: "PHP",
  });
  const [playerDrafts, setPlayerDrafts] = useState<
    Record<string, PlayerPaymentDraft>
  >({});
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPricingDraft({
      entranceFee: String(paymentsData.pricing.entranceFee),
      perMatchFee: String(paymentsData.pricing.perMatchFee),
      currency: paymentsData.pricing.currency,
    });
    setPlayerDrafts(
      Object.fromEntries(
        paymentsData.players.map((player) => [
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
  }, [paymentsData]);

  const updatePaymentsData = (
    updater: (current: HostPaymentsData) => HostPaymentsData,
  ) => {
    setPaymentsData((current) => updater(current));
  };

  const getNextPaymentStatus = ({
    explicitStatus,
    amountExpected,
    amountPaid,
  }: {
    explicitStatus: PaymentStatus;
    amountExpected: number;
    amountPaid: number;
  }) => {
    if (
      explicitStatus === "failed" ||
      explicitStatus === "refunded" ||
      explicitStatus === "waived" ||
      explicitStatus === "pending"
    ) {
      return explicitStatus;
    }

    if (amountExpected <= 0 && amountPaid <= 0) return explicitStatus;
    if (amountPaid <= 0) return "unpaid";
    if (amountPaid < amountExpected) return "partial";
    return "paid";
  };

  const withUpdatedPlayer = (
    current: HostPaymentsData,
    hostedPlayerId: string,
    transform: (player: PaymentPlayer) => PaymentPlayer,
  ) => {
    const players = current.players.map((player) =>
      player.id === hostedPlayerId ? transform(player) : player,
    );

    return {
      ...current,
      players,
      summary: buildPaymentsSummary(players),
    };
  };

  const handleSavePricing = async () => {
    if (!communityId || !hostId) return;

    setIsSavingPricing(true);
    setError(null);
    const previousPaymentsData = paymentsData;
    const nextPricing = {
      ...paymentsData.pricing,
      entranceFee: toAmount(pricingDraft.entranceFee),
      perMatchFee: toAmount(pricingDraft.perMatchFee),
      currency: pricingDraft.currency,
    };

    updatePaymentsData((current) => {
      const players = current.players.map((player) => {
        if (player.payment.id) {
          return {
            ...player,
            payment: {
              ...player.payment,
              currency: nextPricing.currency,
            },
          };
        }

        const amountExpected =
          nextPricing.entranceFee +
          nextPricing.perMatchFee * player.gamesPlayed;

        return {
          ...player,
          payment: {
            ...player.payment,
            amountExpected,
            balance: getPaymentBalance(
              amountExpected,
              player.payment.amountPaid,
            ),
            currency: nextPricing.currency,
          },
        };
      });

      return {
        ...current,
        pricing: nextPricing,
        players,
        summary: buildPaymentsSummary(players),
      };
    });

    try {
      await api.patch(
        `/api/community/${communityId}/hosts/${hostId}/payments/pricing`,
        {
          entranceFee: toAmount(pricingDraft.entranceFee),
          perMatchFee: toAmount(pricingDraft.perMatchFee),
          currency: pricingDraft.currency,
        },
      );
    } catch (saveError) {
      setPaymentsData(previousPaymentsData);
      setError("Unable to save pricing.");

      if (axios.isAxiosError(saveError))
        console.error(saveError.response?.data ?? saveError);
      else console.error(saveError);

      await refreshHostData();
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
    const previousPaymentsData = paymentsData;
    const nextAmountExpected = toAmount(draft.amountExpected);
    const nextAmountPaid = toAmount(draft.amountPaid);
    const nextStatus = getNextPaymentStatus({
      explicitStatus: draft.status,
      amountExpected: nextAmountExpected,
      amountPaid: nextAmountPaid,
    });

    updatePaymentsData((current) =>
      withUpdatedPlayer(current, hostedPlayerId, (player) => ({
        ...player,
        paymentStatus: nextStatus,
        payment: {
          ...player.payment,
          amountExpected: nextAmountExpected,
          amountPaid: nextAmountPaid,
          balance: getPaymentBalance(nextAmountExpected, nextAmountPaid),
          status: nextStatus,
          method: draft.method || null,
        },
      })),
    );

    try {
      await api.patch(
        `/api/community/${communityId}/hosts/${hostId}/payments/${hostedPlayerId}`,
        {
          amountExpected: toAmount(draft.amountExpected),
          amountPaid: toAmount(draft.amountPaid),
          status: draft.status,
          method: draft.method || null,
        },
      );
    } catch (saveError) {
      setPaymentsData(previousPaymentsData);
      setError("Unable to save player payment.");

      if (axios.isAxiosError(saveError))
        console.error(saveError.response?.data ?? saveError);
      else console.error(saveError);

      await refreshHostData();
    } finally {
      setSavingPlayerId(null);
    }
  };

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
                paymentsData.summary.totalExpected,
                paymentsData.pricing.currency,
              )}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-stone-500">Total paid</p>
            <p className="font-semibold">
              {formatMoney(
                paymentsData.summary.totalPaid,
                paymentsData.pricing.currency,
              )}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-stone-500">Outstanding</p>
            <p className="font-semibold">
              {formatMoney(
                paymentsData.summary.totalOutstanding,
                paymentsData.pricing.currency,
              )}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-stone-500">Paid players</p>
            <p className="font-semibold">
              {paymentsData.summary.paidCount}/
              {paymentsData.summary.totalPlayers}
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
                  Games
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
              {paymentsData.players.length > 0 ? (
                paymentsData.players.map((player) => {
                  const draft = playerDrafts[player.id];
                  const expectedAmount = toAmount(
                    draft?.amountExpected ??
                      String(player.payment.amountExpected),
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
                      <td className="px-2 py-2 text-sm">
                        {player.gamesPlayed}
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
                            draft?.amountPaid ??
                            String(player.payment.amountPaid)
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
                                method: event.target.value as
                                  | PaymentMethod
                                  | "",
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
                        {formatMoney(balance, paymentsData.pricing.currency)}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleSavePlayerPayment(player.id)
                          }
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
                    colSpan={9}
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
