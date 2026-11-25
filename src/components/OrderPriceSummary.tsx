import { formatServicePrice } from '@/lib/formatting';

export function OrderPriceSummary({
  serviceName,
  garmentPrice,
  pickupFee,
  returnFee,
  showOutbound,
  showCod,
}: {
  serviceName: string;
  garmentPrice: number;
  pickupFee: number;
  returnFee: number;
  showOutbound: boolean;
  showCod: boolean;
}) {
  const total = garmentPrice + pickupFee + returnFee;
  const cod = garmentPrice + returnFee;
  return (
    <div className="order-price-summary">
      <div className="price-summary-row"><span>Selected Service</span><strong>{serviceName}</strong></div>
      <div className="price-summary-row"><span>Tailoring Price</span><strong>{formatServicePrice(garmentPrice)}</strong></div>
      {showOutbound && <div className="price-summary-row"><span>Delivery to Tailor</span><strong>{formatServicePrice(pickupFee)}</strong></div>}
      <div className="price-summary-row"><span>Return Delivery</span><strong>{formatServicePrice(returnFee)}</strong></div>
      <div className="price-summary-total"><span>Estimated Total</span><strong>{formatServicePrice(total)}</strong></div>
      {showCod && (
        <div className="cod-explanation">
          <p><strong>Payment Flow</strong></p>
          <p>The outbound delivery fee may need to be paid separately when sending the sample and fabric.</p>
          <p>Estimated COD on return parcel: <strong>{formatServicePrice(cod)}</strong></p>
          <p className="muted">COD availability requires an eligible courier and merchant arrangement. Karigor does not collect payment or guarantee courier COD support.</p>
        </div>
      )}
    </div>
  );
}
