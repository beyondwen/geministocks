import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { XIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

type PackageId = 'pack_5_cny' | 'pack_15_cny' | 'pack_30_cny';
type SubscriptionId = 'pro_monthly_cny';
type PaymentType = 'credits' | 'subscription';

const creditPackages: { id: PackageId; credits: number; price: string; description: string; bestValue?: boolean }[] = [
    { id: 'pack_5_cny', credits: 5, price: '¥6.00', description: '' },
    { id: 'pack_15_cny', credits: 15, price: '¥15.00', description: '赠送 20%' },
    { id: 'pack_30_cny', credits: 30, price: '¥25.00', description: '赠送 40%', bestValue: true },
];

const subscriptionPackage = {
    id: 'pro_monthly_cny' as SubscriptionId,
    price: '¥25.00',
    name: 'Pro 版会员',
    features: [
        '每月自动获得 50 个信用点',
        '可使用所有分析模型',
        '未来更多 Pro 功能优先体验'
    ]
};

interface CheckoutFormProps {
    onPaymentSuccess: (creditsPurchased: number) => void;
    selectedPackage: { id: PackageId | SubscriptionId; price: string; credits?: number };
    paymentType: PaymentType;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onPaymentSuccess, selectedPackage, paymentType }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { t } = useI18n();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href.split('#')[0] },
            redirect: 'if_required',
        });

        if (error) {
            setMessage(error.message || t('paymentModal.error.default'));
        } else {
            const creditsPurchased = paymentType === 'credits' && selectedPackage.credits ? selectedPackage.credits : 50;
            onPaymentSuccess(creditsPurchased);
        }

        setIsLoading(false);
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="w-full relative mt-6 inline-flex items-center justify-center px-8 py-3 btn-premium text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span id="button-text" className="relative z-10">
                    {isLoading ? t('paymentModal.processing') : `${t('paymentModal.payButton')} ${selectedPackage.price}`}
                </span>
            </button>
            {message && <div id="payment-message" className="mt-4 text-center text-sm text-red-600">{message}</div>}
        </form>
    );
};

const stripePromise = loadStripe('pk_live_51SLkDTAno007qBWiwQFrVm9bGvHeryJexkhUjPjphsWH4Mj8kXeX4YXWHiJMHnUJQWkjSHeGKSQqZYnLfj9Pcj1d00ySdebNaM');

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (creditsPurchased: number) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentSuccess }) => {
  const { t } = useI18n();
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<PaymentType>('credits');
  const [selectedCreditPackage, setSelectedCreditPackage] = useState(creditPackages[2]);

  const selectedPackage = paymentType === 'credits' ? selectedCreditPackage : subscriptionPackage;

  useEffect(() => {
    if (isOpen) {
        setIsLoading(true);
        setError('');
        const payload = paymentType === 'credits'
            ? { packageId: selectedCreditPackage.id }
            : { subscriptionId: subscriptionPackage.id };

        fetch('/api/create-payment-intent', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error?.message || 'Failed to initialize payment.')))
        .then(data => setClientSecret(data.clientSecret))
        .catch(err => {
            console.error("Payment intent error:", err);
            setError(typeof err === 'string' ? err : 'Could not connect to payment service.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, selectedCreditPackage, paymentType]);

  if (!isOpen) return null;

  const appearance: StripeElementsOptions['appearance'] = {
    theme: 'stripe',
    variables: { colorPrimary: '#8B5CF6', borderRadius: '8px' },
  };
  const options: StripeElementsOptions = { clientSecret, appearance };

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose} role="dialog" aria-modal="true"
    >
      <div
        className="glass-refined bg-white/80 p-8 max-w-md w-full text-left relative animate-reveal-scale rounded-2xl shadow-floating"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100/80" aria-label={t('paymentModal.close')}><XIcon className="w-6 h-6" /></button>

        <h2 id="payment-modal-title" className="text-2xl font-bold text-slate-800 mb-6">{t('paymentModal.title')}</h2>
        
        <div className="flex bg-slate-100/80 p-1 rounded-full mb-6">
            <button onClick={() => setPaymentType('credits')} className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${paymentType === 'credits' ? 'bg-white shadow text-purple-600' : 'text-slate-600'}`}>购买信用点</button>
            <button onClick={() => setPaymentType('subscription')} className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${paymentType === 'subscription' ? 'bg-white shadow text-purple-600' : 'text-slate-600'}`}>订阅 Pro 版</button>
        </div>

        {paymentType === 'credits' && (
            <div className="animate-fade-in">
                <p className="text-slate-600 mb-4">{t('paymentModal.packagesTitle')}</p>
                <div className="flex justify-center gap-2 mb-6">
                    {creditPackages.map(pkg => (
                        <button
                            key={pkg.id}
                            onClick={() => setSelectedCreditPackage(pkg)}
                            className={`relative flex-1 p-3 text-center border-2 rounded-lg transition-all duration-200 ${selectedCreditPackage.id === pkg.id ? 'border-purple-500 bg-purple-50/80 scale-105 shadow-lg' : 'border-slate-200 bg-white/60 hover:border-purple-300'}`}
                        >
                            {pkg.bestValue && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">最划算</div>}
                            <p className="font-bold text-slate-800">{pkg.credits}个信用点</p>
                            <p className="text-sm text-slate-600">{pkg.price}</p>
                            {pkg.description && <p className="text-xs font-semibold text-green-600 mt-1">{pkg.description}</p>}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {paymentType === 'subscription' && (
            <div className="animate-fade-in">
                <div className="p-4 bg-purple-50/80 border-2 border-purple-200 rounded-lg">
                    <p className="font-bold text-lg text-purple-800">{subscriptionPackage.name} - {subscriptionPackage.price}/月</p>
                    <ul className="mt-2 list-disc list-inside text-sm text-slate-700 space-y-1">
                        {subscriptionPackage.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                </div>
            </div>
        )}
        
        {isLoading && <div className="text-center py-8">{t('paymentModal.loading')}</div>}
        {error && <div className="text-center py-4 text-red-600 bg-red-50/80 p-3 rounded-lg">{error}</div>}
        
        {clientSecret && !isLoading && !error && (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm onPaymentSuccess={onPaymentSuccess} selectedPackage={selectedPackage} paymentType={paymentType} />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;