import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeService } from '../services';
import { BsPrinter, BsArrowLeft } from 'react-icons/bs';

export default function ReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feeService.getReceipt(id)
      .then(r => setReceipt(r.data.data))
      .catch(() => { toast.error('Receipt not found'); navigate('/payments'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!receipt) return null;

  const { payment, member, feeRecord, institute } = receipt;

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}><BsArrowLeft /> Back</button>
        <button className="btn btn-primary" onClick={() => window.print()}><BsPrinter /> Print Receipt</button>
      </div>

      <div className="receipt-container">
        <div className="receipt-header">
          <div className="receipt-logo">{institute?.name || 'Xenotrack'}</div>
          {institute?.address && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{institute.address}</div>}
          {institute?.phone && <div style={{ fontSize: 12, color: '#6B7280' }}>{institute.phone}</div>}
          <div className="receipt-title">Payment Receipt</div>
        </div>

        {/* Payment info */}
        <div className="receipt-grid">
          <div>
            <div className="receipt-label">Receipt Number</div>
            <div className="receipt-value" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{payment.receipt_number}</div>
          </div>
          <div>
            <div className="receipt-label">Payment Date</div>
            <div className="receipt-value">{payment.payment_date}</div>
          </div>
          <div>
            <div className="receipt-label">Member Name</div>
            <div className="receipt-value" style={{ fontWeight: 600 }}>{member.full_name}</div>
          </div>
          <div>
            <div className="receipt-label">Member Code</div>
            <div className="receipt-value">{member.member_code}</div>
          </div>
          {member.phone && <div>
            <div className="receipt-label">Phone</div>
            <div className="receipt-value">{member.phone}</div>
          </div>}
          <div>
            <div className="receipt-label">Billing Period</div>
            <div className="receipt-value">{feeRecord.billing_period_label}</div>
          </div>
          <div>
            <div className="receipt-label">Payment Method</div>
            <div className="receipt-value" style={{ textTransform: 'capitalize' }}>{payment.payment_method?.replace('_', ' ')}</div>
          </div>
          {payment.transaction_ref && <div>
            <div className="receipt-label">Transaction Ref.</div>
            <div className="receipt-value">{payment.transaction_ref}</div>
          </div>}
        </div>

        {/* Amount breakdown */}
        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 16px', margin: '16px 0', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#6B7280' }}>Original Amount</span>
            <span>₹{parseFloat(feeRecord.original_amount || 0).toLocaleString()}</span>
          </div>
          {parseFloat(feeRecord.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#6B7280' }}>Discount</span>
              <span style={{ color: '#10B981' }}>- ₹{parseFloat(feeRecord.discount_amount).toLocaleString()}</span>
            </div>
          )}
          {parseFloat(feeRecord.late_fee_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#6B7280' }}>Late Fee</span>
              <span style={{ color: '#EF4444' }}>+ ₹{parseFloat(feeRecord.late_fee_amount).toLocaleString()}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total Due</span>
            <span>₹{parseFloat(feeRecord.final_amount || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Amount paid */}
        <div className="receipt-total">
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>Amount Paid</div>
          <div className="receipt-amount">₹{parseFloat(payment.amount).toLocaleString()}</div>
        </div>

        {/* Balance */}
        {parseFloat(feeRecord.outstanding_balance) > 0 && (
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
            Outstanding Balance: ₹{parseFloat(feeRecord.outstanding_balance).toLocaleString()}
          </div>
        )}

        {payment.notes && (
          <div style={{ marginTop: 16, fontSize: 12, color: '#6B7280', textAlign: 'center' }}>Notes: {payment.notes}</div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#9CA3AF', borderTop: '1px dashed #E2E8F0', paddingTop: 16 }}>
          Thank you for your payment!<br />
          This is a computer-generated receipt.
        </div>
      </div>
    </div>
  );
}
