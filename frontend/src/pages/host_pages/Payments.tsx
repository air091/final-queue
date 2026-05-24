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
  type PaymentStatus,
  type PaymentPlayer,
} from "../../lib/host";
import { AArrowDown, AArrowUp, Gamepad, MoveDown, MoveUp } from "lucide-react";

type PricingDraft = {
  entranceFee: string;
  perMatchFee: string;
  currency: PaymentCurrency;
};

type PaymentStatusFilter = "all" | PaymentStatus;
type SortDirection = "asc" | "desc";
type PaymentPlayerSortField = "name" | "games";

const CURRENCY_OPTIONS: PaymentCurrency[] = ["PHP", "USD", "EUR"];
const FALLBACK_PROFILE_URL = "https://image.pngaaa.com/189/734189-middle.png";

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
  const { paymentsData, setPaymentsData, refreshHostData, playerSearchTerm } =
    useHostData();
  const [pricingDraft, setPricingDraft] = useState<PricingDraft>({
    entranceFee: "0",
    perMatchFee: "0",
    currency: "PHP",
  });
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("all");
  const [nameSortDirection, setNameSortDirection] =
    useState<SortDirection>("asc");
  const [gamesSortDirection, setGamesSortDirection] =
    useState<SortDirection>("desc");
  const [primarySortField, setPrimarySortField] =
    useState<PaymentPlayerSortField>("name");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPricingDraft({
      entranceFee: String(paymentsData.pricing.entranceFee),
      perMatchFee: String(paymentsData.pricing.perMatchFee),
      currency: paymentsData.pricing.currency,
    });
  }, [paymentsData]);

  const updatePaymentsData = (
    updater: (current: HostPaymentsData) => HostPaymentsData,
  ) => {
    setPaymentsData((current) => updater(current));
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

  const handleUpdatePlayerPaymentStatus = async (
    hostedPlayerId: string,
    nextStatus: PaymentStatus,
  ) => {
    if (!communityId || !hostId) return;

    const currentPlayer = paymentsData.players.find(
      (player) => player.id === hostedPlayerId,
    );
    if (!currentPlayer) return;

    setSavingPlayerId(hostedPlayerId);
    setError(null);
    const previousPaymentsData = paymentsData;
    const nextAmountPaid =
      nextStatus === "paid" ? currentPlayer.payment.amountExpected : 0;

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
          paymentStatus: nextStatus,
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
              amountPaid: Number(
                response.data.payment?.amountPaid ?? player.payment.amountPaid,
              ),
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

  const togglePaymentPlayerSort = (field: PaymentPlayerSortField) => {
    setPrimarySortField(field);

    if (field === "name") {
      setNameSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setGamesSortDirection((currentDirection) =>
      currentDirection === "asc" ? "desc" : "asc",
    );
  };

  const comparePaymentPlayers = (
    firstPlayer: PaymentPlayer,
    secondPlayer: PaymentPlayer,
    field: PaymentPlayerSortField,
  ) => {
    if (field === "games") {
      const gamesMultiplier = gamesSortDirection === "asc" ? 1 : -1;
      return (
        (firstPlayer.gamesPlayed - secondPlayer.gamesPlayed) * gamesMultiplier
      );
    }

    const nameMultiplier = nameSortDirection === "asc" ? 1 : -1;
    return (
      firstPlayer.player.username.localeCompare(
        secondPlayer.player.username,
        undefined,
        { sensitivity: "base" },
      ) * nameMultiplier
    );
  };

  const normalizedPlayerSearchTerm = playerSearchTerm.trim().toLowerCase();
  const filteredPaymentPlayers = paymentsData.players
    .filter((player) => {
      const matchesPaymentStatus =
        paymentStatusFilter === "all" ||
        player.paymentStatus === paymentStatusFilter;
      const matchesSearch =
        normalizedPlayerSearchTerm === "" ||
        player.player.username
          .toLowerCase()
          .includes(normalizedPlayerSearchTerm);

      return matchesPaymentStatus && matchesSearch;
    })
    .sort((firstPlayer, secondPlayer) => {
      const secondarySortField =
        primarySortField === "name" ? "games" : "name";
      const primaryResult = comparePaymentPlayers(
        firstPlayer,
        secondPlayer,
        primarySortField,
      );

      if (primaryResult !== 0) return primaryResult;

      return comparePaymentPlayers(
        firstPlayer,
        secondPlayer,
        secondarySortField,
      );
    });

  return (
    <div className="grid gap-5 p-2">
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
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
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
          <div>
            <h4 className="text-lg font-semibold text-[var(--color-text)]">
              Player Payments
            </h4>

            <p className="mt-1 text-sm text-stone-500">
              Track and update badminton match payments.
            </p>
          </div>
          <div className="flex items-center gap-x-3">
            {/* filters */}
            <div className="flex items-center gap-x-3">
              {/* paid & unpaid */}
              <select
                name="paid"
                value={paymentStatusFilter}
                onChange={(event) =>
                  setPaymentStatusFilter(
                    event.target.value as PaymentStatusFilter,
                  )
                }
                className="border rounded-full px-3 py-1 outline-orange-100 border-orange-100 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>

              {/* more letters */}
              <button
                type="button"
                title="Sort by player name"
                aria-pressed={primarySortField === "name"}
                onClick={() => togglePaymentPlayerSort("name")}
                className={`flex items-center border rounded-full px-3 py-1 outline-orange-100 border-orange-100 cursor-pointer transition hover:bg-orange-50 ${
                  primarySortField === "name" ? "bg-orange-50" : ""
                }`}
              >
                {nameSortDirection === "desc" ? (
                  <AArrowDown size={24} />
                ) : (
                  <AArrowUp size={24} />
                )}
              </button>

              {/* more games */}
              <button
                type="button"
                title="Sort by games played"
                aria-pressed={primarySortField === "games"}
                onClick={() => togglePaymentPlayerSort("games")}
                className={`flex items-center border rounded-full px-3 py-1 outline-orange-100 border-orange-100 cursor-pointer transition hover:bg-orange-50 ${
                  primarySortField === "games" ? "bg-orange-50" : ""
                }`}
              >
                <Gamepad size={24} />
                {gamesSortDirection === "desc" ? (
                  <MoveUp size={14} />
                ) : (
                  <MoveDown size={14} />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ===================== DESKTOP TABLE (md+) ===================== */}
        <div className="hidden md:block overflow-x-auto">
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
                  Status
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredPaymentPlayers.length > 0 ? (
                filteredPaymentPlayers.map((player) => {
                  const nextStatus =
                    player.paymentStatus === "paid" ? "unpaid" : "paid";

                  return (
                    <tr
                      key={player.id}
                      className="border-t border-orange-100 hover:bg-orange-50/30"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-[var(--color-text)]">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-orange-100 bg-orange-50">
                            <img
                              src={
                                player.player.profileUrl || FALLBACK_PROFILE_URL
                              }
                              alt={player.player.username}
                              className="block h-full w-full rounded-full object-cover object-center"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span>{player.player.username}</span>

                            {player.player.isStatic && (
                              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                                Static
                              </span>
                            )}
                          </div>
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
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            player.paymentStatus === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {player.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdatePlayerPaymentStatus(
                              player.id,
                              nextStatus,
                            )
                          }
                          disabled={savingPlayerId === player.id}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer text-white transition ${
                            nextStatus === "paid"
                              ? "bg-[var(--color-primary)] hover:bg-[var(--color-accent)]"
                              : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          {savingPlayerId === player.id
                            ? "Saving..."
                            : nextStatus === "paid"
                              ? "Mark as Paid"
                              : "Mark as Unpaid"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-stone-500"
                  >
                    {normalizedPlayerSearchTerm
                      ? "No players match your search."
                      : "No players available for payments."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ===================== MOBILE CARDS (< md) ===================== */}
        <div className="grid gap-3 p-4 md:hidden">
          {filteredPaymentPlayers.length > 0 ? (
            filteredPaymentPlayers.map((player) => {
              const expectedAmount =
                paymentsData.pricing.entranceFee +
                paymentsData.pricing.perMatchFee * player.gamesPlayed;
              const nextStatus =
                player.paymentStatus === "paid" ? "unpaid" : "paid";

              return (
                <div
                  key={player.id}
                  className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full border border-orange-100 bg-orange-50">
                        <img
                          src={player.player.profileUrl || FALLBACK_PROFILE_URL}
                          alt={player.player.username}
                          className="block h-full w-full rounded-full object-cover object-center"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span>{player.player.username}</span>

                        {player.player.isStatic && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                            Static
                          </span>
                        )}
                      </div>
                    </div>

                    {player.player.isStatic && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        Static
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-stone-500">
                    {player.status} • {player.gamesPlayed} games
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-stone-500 text-xs">Expected</p>
                      <p className="font-medium">
                        {formatMoney(
                          expectedAmount,
                          paymentsData.pricing.currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-stone-500 text-xs">Status</p>
                      <p
                        className={`font-semibold ${
                          player.paymentStatus === "paid"
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      >
                        {player.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdatePlayerPaymentStatus(
                          player.id,
                          nextStatus,
                        )
                      }
                      disabled={savingPlayerId === player.id}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer text-white transition ${
                        nextStatus === "paid"
                          ? "bg-[var(--color-primary)] hover:bg-[var(--color-accent)]"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {savingPlayerId === player.id
                        ? "Saving..."
                        : nextStatus === "paid"
                          ? "Mark as Paid"
                          : "Mark as Unpaid"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-stone-500 py-8">
              {normalizedPlayerSearchTerm
                ? "No players match your search."
                : "No players available for payments."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
