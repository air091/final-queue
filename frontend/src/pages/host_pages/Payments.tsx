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
  type PaymentPlayer,
} from "../../lib/host";

type PricingDraft = {
  entranceFee: string;
  perMatchFee: string;
  currency: PaymentCurrency;
};

type PlayerPaymentDraft = {
  amountPaid: string;
};

const CURRENCY_OPTIONS: PaymentCurrency[] = ["PHP", "USD", "EUR"];

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
            amountPaid: String(player.payment.amountPaid),
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

  const getNextPaymentStatus = (amountPaid: number) =>
    amountPaid > 0 ? "paid" : "unpaid";

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
    const nextAmountPaid = toAmount(draft.amountPaid);
    const nextStatus = getNextPaymentStatus(nextAmountPaid);

    updatePaymentsData((current) =>
      withUpdatedPlayer(current, hostedPlayerId, (player) => ({
        ...player,
        paymentStatus: nextStatus,
        payment: {
          ...player.payment,
          amountPaid: nextAmountPaid,
          balance: getPaymentBalance(
            player.payment.amountExpected,
            nextAmountPaid,
          ),
          status: nextStatus,
        },
      })),
    );

    try {
      const response = await api.post(
        `/api/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}/payment`,
        {
          amountPaid: nextAmountPaid,
        },
      );

      const savedPaymentId = response.data.payment?.id ?? null;
      if (savedPaymentId) {
        updatePaymentsData((current) =>
          withUpdatedPlayer(current, hostedPlayerId, (player) => ({
            ...player,
            payment: {
              ...player.payment,
              id: savedPaymentId,
            },
          })),
        );
      }
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
    <div className="grid gap-5">
      {/* HEADER */}
      <header className="rounded-3xl border border-orange-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
            💳
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
              Host Finance
            </p>

            <h3 className="text-2xl font-bold text-[var(--color-text)]">
              Payments
            </h3>
          </div>
        </div>

        <p className="mt-3 text-sm text-stone-500">
          Set badminton match pricing and manage player payments.
        </p>
      </header>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* PRICING */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <header className="mb-5">
          <h4 className="text-lg font-semibold text-[var(--color-text)]">
            Pricing
          </h4>

          <p className="mt-1 text-sm text-stone-500">
            Configure entrance and match fees.
          </p>
        </header>

        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-stone-700">Entrance fee</span>

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
              className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-stone-700">Per match fee</span>

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
              className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-stone-700">Currency</span>

            <select
              value={pricingDraft.currency}
              onChange={(event) =>
                setPricingDraft((current) => ({
                  ...current,
                  currency: event.target.value as PaymentCurrency,
                }))
              }
              className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
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
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              isSavingPricing
                ? "cursor-not-allowed bg-stone-200 text-stone-400"
                : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
            }`}
          >
            {isSavingPricing ? "Saving..." : "Save pricing"}
          </button>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <header className="mb-5">
          <h4 className="text-lg font-semibold text-[var(--color-text)]">
            Payment Summary
          </h4>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Total expected
            </p>

            <p className="mt-2 text-xl font-bold text-[var(--color-text)]">
              {formatMoney(
                paymentsData.summary.totalExpected,
                paymentsData.pricing.currency,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Total paid
            </p>

            <p className="mt-2 text-xl font-bold text-emerald-600">
              {formatMoney(
                paymentsData.summary.totalPaid,
                paymentsData.pricing.currency,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Outstanding
            </p>

            <p className="mt-2 text-xl font-bold text-red-500">
              {formatMoney(
                paymentsData.summary.totalOutstanding,
                paymentsData.pricing.currency,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Paid players
            </p>

            <p className="mt-2 text-xl font-bold text-[var(--color-text)]">
              {paymentsData.summary.paidCount}/
              {paymentsData.summary.totalPlayers}
            </p>
          </div>
        </div>
      </section>

      {/* PLAYERS TABLE */}
      <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <header className="border-b border-orange-100 px-5 py-4">
          <h4 className="text-lg font-semibold text-[var(--color-text)]">
            Player Payments
          </h4>

          <p className="mt-1 text-sm text-stone-500">
            Track and update badminton match payments.
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-orange-50/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Player
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Host status
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Games
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Expected
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Paid
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Balance
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paymentsData.players.length > 0 ? (
                paymentsData.players.map((player) => {
                  const draft = playerDrafts[player.id];

                  const expectedAmount =
                    paymentsData.pricing.entranceFee +
                    paymentsData.pricing.perMatchFee * player.gamesPlayed;

                  const paidAmount = toAmount(
                    draft?.amountPaid ?? String(player.payment.amountPaid),
                  );

                  const balance = Math.max(0, expectedAmount - paidAmount);

                  return (
                    <tr
                      key={player.id}
                      className="border-t border-orange-100 transition hover:bg-orange-50/30"
                    >
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-text)]">
                            {player.player.username}
                          </span>

                          {player.player.isStatic && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                              Static
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-stone-600">
                        {player.status}
                      </td>

                      <td className="px-4 py-4 text-sm text-stone-600">
                        {player.gamesPlayed}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-[var(--color-text)]">
                        {formatMoney(
                          paymentsData.pricing.entranceFee +
                            paymentsData.pricing.perMatchFee *
                              player.gamesPlayed,
                          paymentsData.pricing.currency,
                        )}
                      </td>

                      <td className="px-4 py-4">
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
                                  amountPaid: String(player.payment.amountPaid),
                                }),
                                amountPaid: event.target.value,
                              },
                            }))
                          }
                          className="w-28 rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                        />
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-red-500">
                        {formatMoney(balance, paymentsData.pricing.currency)}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            void handleSavePlayerPayment(player.id)
                          }
                          disabled={savingPlayerId === player.id}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                            savingPlayerId === player.id
                              ? "cursor-not-allowed bg-stone-200 text-stone-400"
                              : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
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
                    className="px-4 py-10 text-center text-sm text-stone-500"
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
