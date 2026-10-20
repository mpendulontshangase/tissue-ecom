import type { BankDetails } from "@/lib/payment-config";

export function EftDetails({ bank, orderNumber }: { bank: BankDetails; orderNumber: number }) {
  const rows = [
    ["Account holder", bank.accountName],
    ["Bank", bank.bankName],
    ["Account number", bank.accountNumber],
    ["Branch code", bank.branchCode],
    ["Account type", bank.accountType],
    ["Payment reference", String(orderNumber)],
  ];

  return (
    <div className="mt-4 rounded-2xl bg-sand p-4">
      <p className="font-semibold">Pay by EFT</p>
      <p className="mt-1 text-sm leading-6 text-bark">
        Use the order number as the payment reference. The order stays awaiting payment until the transfer is marked paid.
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt className="text-bark">{label}</dt>
            <dd className="break-all font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
