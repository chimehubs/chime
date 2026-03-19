import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import './SendMoney.module.css';

export default function SendMoney() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState({ name: '', account: '', bank: '', remark: '' });
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [loadingCount, setLoadingCount] = useState(1);
  const [showLoading, setShowLoading] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);

  // Check account creation status
  useEffect(() => {
    if (user?.status === 'UNREGISTERED') {
      setShowAccountCreationPrompt(true);
    } else {
      setShowAccountCreationPrompt(false);
      setShowAccountCreationModal(false);
    }
  }, [user?.status]);

  useEffect(() => {
    const loadDraft = async () => {
      if (!user?.id) return;
      const draft = await supabaseDbService.getDraft(user.id, 'send_money');
      if (draft?.payload) {
        setStep(draft.payload.step || 1);
        setAmount(draft.payload.amount || '');
        setRecipient(draft.payload.recipient || { name: '', account: '', bank: '', remark: '' });
        setHasDraft(true);
      }
    };
    loadDraft();
  }, [user?.id]);

  // Handle navigation with prompt
  const handleBack = () => {
    if (step > 1 && (amount || recipient.name)) {
      setShowPrompt(true);
      setPendingNavigate(step === 1 ? '/dashboard' : null);
    } else {
      step === 1 ? navigate('/dashboard') : setStep(step - 1);
    }
  };

  const handleCancel = () => {
    if (step > 1 && (amount || recipient.name)) {
      setShowPrompt(true);
      setPendingNavigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handlePromptSave = () => {
    setShowPrompt(false);
    if (user?.id) {
      supabaseDbService.upsertDraft(user.id, 'send_money', { step, amount, recipient });
      setHasDraft(true);
    }
    if (pendingNavigate) navigate(pendingNavigate);
  };

  const handlePromptDiscard = () => {
    setShowPrompt(false);
    if (user?.id) {
      supabaseDbService.deleteDraft(user.id, 'send_money');
      setHasDraft(false);
    }
    // Reset all component state to initial values
    setStep(1);
    setAmount('');
    setRecipient({ name: '', account: '', bank: '', remark: '' });
    setError('');
    setCode('');
    setLoadingCount(1);
    setShowLoading(false);
    setShowFail(false);
    setPendingNavigate(null);
    if (pendingNavigate) navigate(pendingNavigate);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setError('');
  };
  const handlePreset = (val: number) => {
    setAmount(val.toString());
    setError('');
  };
  const handleAmountNext = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 100 || amt > 2000000) {
      setError('Amount must be between $100 and $2,000,000');
      return;
    }
    setStep(2);
  };

  // Step 2: Recipient Details
  const handleRecipientChange = (field: string, value: string) => {
    setRecipient((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleReview = () => {
    if (!recipient.name || !recipient.account || !recipient.bank) return;
    setStep(3);
  };

  // Step 3: Review & Confirm
  const handleSend = async () => {
    setStep(4);
    setShowLoading(true);
    setLoadingCount(1);
    if (user?.id) {
      const account = await supabaseDbService.getAccountByUser(user.id);
      if (account) {
        const pendingTx = await supabaseDbService.createTransaction({
          user_id: user.id,
          account_id: account.id,
          type: 'debit',
          amount: parseFloat(amount),
          description: `Transfer to ${recipient.name || 'Recipient'}`,
          currency: account.currency,
          status: 'pending',
        });
        if (pendingTx?.id) setPendingTransactionId(pendingTx.id);
      }
    }
    let interval = setInterval(() => {
      setLoadingCount((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          setShowLoading(false);
          setShowFail(true);
          setStep(5);
          return 99;
        }
        return prev + 1;
      });
    }, 60);
  };

  // Step 5: Verification
  const handleVerify = async () => {
    if (code.length !== 6) return;

    const correctPin = '937388';
    if (code !== correctPin) {
      setError('Incorrect PIN. Please contact Customer Care to get your 6-digit PIN.');
      setCode('');
      if (pendingTransactionId) {
        await supabaseDbService.updateTransaction(pendingTransactionId, { status: 'failed' });
      }
      return;
    }

    if (pendingTransactionId) {
      await supabaseDbService.updateTransaction(pendingTransactionId, { status: 'completed' });
    }
    if (user?.id) {
      await supabaseDbService.createActivity({
        user_id: user.id,
        type: 'debit',
        description: `Transfer to ${recipient.name || 'Recipient'}`,
        amount: parseFloat(amount),
      });
      await supabaseDbService.createNotification({
        user_id: user.id,
        title: 'Transfer Completed',
        message: `You sent ${amount} to ${recipient.name || 'Recipient'}.`,
        type: 'success',
        read: false,
        path: '/activity',
      });
      await supabaseDbService.deleteDraft(user.id, 'send_money');
      setHasDraft(false);
    }

    alert('✓ Transfer Successful! Your money has been sent.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Account Creation Prompt - Shield feature access until user completes account creation */}
      <AccountCreationPrompt
        isOpen={showAccountCreationPrompt}
        onClose={() => setShowAccountCreationPrompt(false)}
        onStartCreation={() => {
          setShowAccountCreationPrompt(false);
          setShowAccountCreationModal(true);
        }}
      />

      {/* Save/Cancel Draft Prompt */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <Card className="p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-semibold mb-4">Save your draft?</h2>
            <p className="text-muted-foreground mb-6">You have an unfinished money transfer. Would you like to save it as a draft or discard it?</p>
            <div className="flex flex-col gap-3 justify-center">
              <Button onClick={handlePromptSave} className="bg-[#00b388] text-white shadow-md hover:shadow-lg">Save Draft</Button>
              <Button onClick={handlePromptDiscard} variant="outline" className="shadow-sm hover:shadow-md">Discard Draft</Button>
            </div>
          </Card>
        </div>
      )}
      <AccountCreationModal
        isOpen={showAccountCreationModal}
        onClose={() => setShowAccountCreationModal(false)}
        onSuccess={() => {
          setShowAccountCreationModal(false);
          setShowAccountCreationPrompt(false);
        }}
      />

      {/* Sticky Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <motion.button 
            onClick={handleBack}
            whileHover={{ scale: 1.1, rotate: -10 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#FFE5E5' }}
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#FF6B6B' }} />
          </motion.button>
          <div>
            <h1 className="text-xl font-semibold">Send Money</h1>
            {step <= 3 && <p className="text-sm text-muted-foreground">Step {step} of 3</p>}
          </div>
        </div>
      </motion.div>
      {/* Progress Bar */}
      {step <= 3 && (
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-[#00b388]' : 'bg-muted'}`} />
            ))}
          </div>
        </div>
      )}
      {/* Content Area */}
      <div className="px-6 pb-24 max-w-xl mx-auto">
        {/* Step 1: Enter Amount */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <h2 className="text-2xl font-semibold mb-2">Enter amount</h2>
            <p className="text-sm text-muted-foreground">Minimum $100 - Maximum $2,000,000</p>
            <Card className="bg-white border rounded-xl p-6 mt-6">
              <Label className="text-sm text-muted-foreground mb-2">Transfer Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-semibold text-muted-foreground">$</span>
                <Input type="number" placeholder="0.00" value={amount} onChange={handleAmountChange} className="text-4xl font-semibold border-0 bg-transparent tabular-nums focus-visible:ring-0 flex-1 shadow-sm focus:shadow-md" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-6">
                {[500, 1000, 5000].map((preset) => (
                  <Button key={preset} variant="outline" className="h-10 rounded-lg border border-border text-sm font-medium shadow-sm hover:shadow-md" onClick={() => handlePreset(preset)}>${preset}</Button>
                ))}
              </div>
              {error && <div className="mt-4 p-3 rounded-lg bg-[#fee2e2] border border-red-200 text-xs text-red-900">{error}</div>}
            </Card>
            <Button onClick={handleAmountNext} disabled={!(parseFloat(amount) >= 100 && parseFloat(amount) <= 2000000)} className="mt-6 w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg">Continue</Button>
            <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
          </motion.div>
        )}
        {/* Step 2: Recipient Details */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <h2 className="text-2xl font-semibold mb-2">Recipient details</h2>
            <p className="text-sm text-muted-foreground">Enter the recipient's information</p>
            <Card className="bg-white border rounded-xl p-6 mt-6">
              <div className="p-4 rounded-lg bg-[#e6f9f4] border border-[#00b388]/20 text-center text-sm font-semibold tabular-nums mb-4">Sending ${parseFloat(amount).toLocaleString()}</div>
              <Label className="text-sm font-medium mb-2">Recipient Name</Label>
              <Input type="text" placeholder="John Doe" value={recipient.name} onChange={e => handleRecipientChange('name', e.target.value)} className="h-12 bg-[#f9fafb] border-0 rounded-lg px-3 text-sm mb-4" />
              <Label className="text-sm font-medium mb-2">Account Number</Label>
              <Input type="text" placeholder="1234567890" value={recipient.account} onChange={e => handleRecipientChange('account', e.target.value)} className="h-12 bg-[#f9fafb] border-0 rounded-lg px-3 text-sm mb-4 tabular-nums" />
              <Label className="text-sm font-medium mb-2">Bank Name</Label>
              <Input type="text" placeholder="Chase Bank" value={recipient.bank} onChange={e => handleRecipientChange('bank', e.target.value)} className="h-12 bg-[#f9fafb] border-0 rounded-lg px-3 text-sm mb-4" />
              <Label className="text-sm font-medium mb-2">Remark</Label>
              <Input type="text" placeholder="Purpose of transfer (optional)" value={recipient.remark} onChange={e => handleRecipientChange('remark', e.target.value)} className="h-12 bg-[#f9fafb] border-0 rounded-lg px-3 text-sm mb-4" />
            </Card>
            <Button onClick={handleReview} disabled={!recipient.name || !recipient.account || !recipient.bank} className="mt-6 w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg">Review Transfer</Button>
            <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
          </motion.div>
        )}
        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <h2 className="text-2xl font-semibold mb-2">Review & Confirm</h2>
            <p className="text-sm text-muted-foreground">Please confirm the recipient details</p>
            <Card className="bg-white border rounded-xl p-6 mt-6">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-2xl font-bold text-[#00b388] tabular-nums">${parseFloat(amount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span className="text-sm text-muted-foreground">Recipient Name</span>
                <span className="text-sm font-semibold">{recipient.name}</span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span className="text-sm text-muted-foreground">Account Number</span>
                <span className="text-sm font-semibold tabular-nums">{recipient.account}</span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span className="text-sm text-muted-foreground">Bank</span>
                <span className="text-sm font-semibold">{recipient.bank}</span>
              </div>
              {recipient.remark && (
                <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                  <span className="text-sm text-muted-foreground">Remark</span>
                  <span className="text-sm font-medium">{recipient.remark}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">From Account</span>
                <span className="text-sm font-semibold">Chimehubs Checking</span>
              </div>
            </Card>
            <div className="mt-6 p-4 rounded-lg bg-[#fef3c7] border border-amber-200 text-xs text-amber-900">Please verify all recipient details carefully before confirming this transfer.</div>
            <Button onClick={handleSend} className="mt-6 w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium rounded-lg shadow-md hover:shadow-lg">Send Money</Button>
            <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
          </motion.div>
        )}
        {/* Step 4: Loading Animation */}
        {step === 4 && showLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative w-32 h-32 mb-6">
              <svg width="128" height="128">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                <circle cx="64" cy="64" r="56" stroke="#00b388" strokeWidth="8" fill="none" strokeDasharray="351.86" strokeDashoffset={351.86 * (1 - loadingCount / 99)} strokeLinecap="round" className="sendmoney-svg-progress" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold tabular-nums">{loadingCount}</span>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Processing Transaction</h2>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </motion.div>
        )}
        {/* Step 5: Transaction Failed - Verification Required */}
        {step === 5 && showFail && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="space-y-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-full bg-[#fee2e2] flex items-center justify-center mb-4">
              <X className="w-10 h-10 text-[#ef4444]" />
            </div>
            <h2 className="text-2xl font-semibold text-red-600 mb-2">Transaction Failed</h2>
            <p className="text-sm text-muted-foreground max-w-xs">Additional verification required to complete this transfer</p>
            <Card className="mt-6 bg-white border rounded-xl p-6 text-center">
              <div className="p-4 rounded-lg bg-[#fef3c7] border border-amber-200 mb-4 text-center">
                <div className="text-sm font-semibold text-amber-900 mb-1">6-Digit PIN Required</div>
                <div className="text-xs text-amber-900">Enter your 6-digit PIN provided by Customer Care to complete this transfer.</div>
              </div>
              <Label className="text-sm font-medium mb-2 text-center">6-Digit Verification Code</Label>
              {error && <div className="p-3 rounded-lg bg-[#fee2e2] border border-red-200 text-xs text-red-900 mb-4 text-left">{error}</div>}
              <Input type="text" maxLength={6} pattern="\d{6}" placeholder="000000" value={code} onChange={e => {setCode(e.target.value.replace(/[^0-9]/g, '')); if(error) setError('');}} className="h-14 bg-[#f9fafb] border-0 rounded-lg px-3 text-2xl font-semibold tracking-widest tabular-nums text-center mb-4 shadow-sm focus:shadow-md" />
              <Button onClick={handleVerify} disabled={code.length !== 6} className="mt-4 w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg">Verify & Complete Transfer</Button>
            </Card>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">Don't have your verification code?</p>
              <Button variant="outline" className="w-full h-12 border-2 border-border rounded-lg flex items-center justify-center gap-2 text-center shadow-sm hover:shadow-md" onClick={() => navigate('/chat', { state: { from: '/send-money' } })}>
                {/* MessageCircle icon */}
                <span className="text-sm font-medium">Contact Customer Care to Get Your 6-Digit PIN</span>
              </Button>
              <Button variant="ghost" className="mt-4 w-full py-3 text-sm text-muted-foreground hover:text-foreground text-center shadow-sm hover:shadow-md" onClick={() => navigate('/dashboard')}>Cancel Transfer</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}





