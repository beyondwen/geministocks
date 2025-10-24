import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { XIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

// --- Checkout Form Component (Internal to PaymentModal) ---

interface CheckoutFormProps {
    onPaymentSuccess: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onPaymentSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { t } = useI18n();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href.split('#')[0],
            },
            redirect: 'if_required',
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message || t('paymentModal.error.default'));
            } else {
                setMessage(t('paymentModal.error.unexpected'));
            }
        } else {
            // Payment succeeded
            onPaymentSuccess();
        }

        setIsLoading(false);
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <PaymentElement id="payment-element" />
            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="w-full relative mt-6 inline-flex items-center justify-center px-8 py-3 btn-premium text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span id="button-text" className="relative z-10">
                    {isLoading ? t('paymentModal.processing') : t('paymentModal.payButton')}
                </span>
            </button>
            {message && <div id="payment-message" className="mt-4 text-center text-sm text-red-600">{message}</div>}
        </form>
    );
};

// --- Main Payment Modal Component ---

const stripePromise = loadStripe('pk_live_51SLkDTAno007qBWiwQFrVm9bGvHeryJexkhUjPjphsWH4Mj8kXeX4YXWHiJMHnUJQWkjSHeGKSQqZYnLfj9Pcj1d00ySdebNaM');

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentSuccess }) => {
  const { t } = useI18n();
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError('');
      fetch('/api/create-payment-intent', { method: 'POST' })
        .then((res) => {
          if (!res.ok) {
            return res.json().then(err => Promise.reject(err.error?.message || 'Failed to initialize payment.'));
          }
          return res.json();
        })
        .then((data) => {
            setClientSecret(data.clientSecret)
        })
        .catch((err) => {
            console.error("Payment intent error:", err);
            setError(typeof err === 'string' ? err : 'Could not connect to payment service. Please try again later.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const appearance: StripeElementsOptions['appearance'] = {
    theme: 'stripe',
    variables: {
        colorPrimary: '#8B5CF6',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
  };
  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose} role="dialog" aria-modal="true"
    >
      <div
        className="glass-refined bg-white/80 p-8 max-w-md w-full text-left relative animate-reveal-scale rounded-2xl shadow-floating"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100/80"
          aria-label={t('paymentModal.close')}
        >
          <XIcon className="w-6 h-6" />
        </button>

        <h2 id="payment-modal-title" className="text-2xl font-bold text-slate-800 mb-2">
          {t('paymentModal.title')}
        </h2>
        <p className="text-slate-600 mb-6">
          {t('paymentModal.description')}
        </p>
        
        {isLoading && <div className="text-center py-8">{t('paymentModal.loading')}</div>}
        {error && <div className="text-center py-4 text-red-600 bg-red-50/80 p-3 rounded-lg">{error}</div>}
        
        {clientSecret && !isLoading && !error && (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm onPaymentSuccess={onPaymentSuccess} />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
