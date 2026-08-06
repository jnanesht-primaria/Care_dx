// frontend/src/pages/receptionist/components/Billing.jsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getInvoice } from '../../../api/receptionist';
import './billing.css';

const Billing = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking') || '';
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInvoice = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await getInvoice(bookingId);
      setInvoice(res.data);
    } catch (err) {
      alert('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (bookingId) fetchInvoice();
  }, [bookingId]);

  return (
    <div>
      <h2>Billing / Invoice</h2>
      {invoice ? (
        <div>
          <h3>Booking #{invoice.booking.id}</h3>
          <p>Patient: {invoice.patient?.first_name} {invoice.patient?.last_name}</p>
          <p>Total: ₹{invoice.booking.total_amount}</p>
          <p>Paid: ₹{invoice.booking.paid_amount}</p>
          <p>Balance: ₹{invoice.booking.balance}</p>
          <p>Payment Mode: {invoice.booking.payment_mode}</p>
          <p>Status: {invoice.booking.status}</p>
          <h4>Tests</h4>
          <ul>
            {invoice.booking.items.map(item => (
              <li key={item.id}>{item.test_name} - ₹{item.final_price}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Enter booking ID in URL parameter ?booking=123</p>
      )}
    </div>
  );
};

export default Billing;