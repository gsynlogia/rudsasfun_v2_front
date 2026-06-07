import InvoicesAndPayments from '@/components/profile/InvoicesAndPayments';

/**
 * Invoices and Payments Page
 * Displays user's invoices and payment history
 */
export default function InvoicesPage() {
  return (
    <>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Faktury i płatności
      </h2>
      <InvoicesAndPayments />
    </>
  );
}