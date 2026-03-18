import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import ImageAnnouncementBar from './ImageAnnouncementBar';
import { FLOW_ANNOUNCEMENT_SLIDES } from './announcementSlides';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { uploadFileToStorage } from '../../../services/supabaseClient';

const addMethods = [
  { key: 'bank', label: 'Bank Transfer' },
  { key: 'paypal', label: 'PayPal' },
  { key: 'giftcard', label: 'Gift Card' },
];

export default function AddMoney() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFilePreview, setProofFilePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'declined' | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

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
      const draft = await supabaseDbService.getDraft(user.id, 'add_money');
      if (draft?.payload) {
        setStep(draft.payload.step || 1);
        setMethod(draft.payload.method || '');
        setAmount(draft.payload.amount || '');
        setVerificationStatus(draft.payload.verificationStatus || null);
        setDeclineReason(draft.payload.declineReason || '');
        setPendingTransactionId(draft.payload.pendingTransactionId || null);
        setHasDraft(true);
      }
    };
    loadDraft();
  }, [user?.id]);

  // Admin deposit details should come from a secure backend or environment config.
  // Removed demo hardcoded values for production readiness.
  const adminDetails = {
    bank: '',
    account: '',
    name: '',
    paypal: '',
    giftcard: '',
  };

  const handleMethodNext = () => {
    if (!method) return alert('Select a method');
    setStep(2);
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
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      setError('Enter a valid amount');
      return;
    }
    if (numAmount < 500) {
      setError('Minimum add is $500');
      return;
    }
    if (numAmount > 2000000) {
      setError('Maximum add is $2,000,000');
      return;
    }
    setStep(3);
  };
  const handleCopyAccount = () => {
    let details = '';
    if (method === 'bank') details = `${adminDetails.account} - ${adminDetails.bank} - ${adminDetails.name}`;
    else if (method === 'paypal') details = adminDetails.paypal;
    else details = adminDetails.giftcard;
    navigator.clipboard.writeText(details);
    alert('Account details copied!');
  };
  const handleNextToProof = () => setStep(4);
  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSubmitProof = async () => {
    if (!proofFile) return alert('Upload a payment proof');
    setUploading(true);
    const account = user?.id ? await supabaseDbService.getAccountByUser(user.id) : null;
    if (!account || !user?.id) {
      setUploading(false);
      setError('Account not found. Please create your account first.');
      return;
    }
    let evidenceUrl: string | null = null;
    try {
      const path = `${user.id}/add-money/${Date.now()}-${proofFile.name}`;
      evidenceUrl = await uploadFileToStorage('payment-evidence', path, proofFile);
    } catch {
      evidenceUrl = null;
    }
    const amountValue = parseFloat(amount);
    const pendingTx = await supabaseDbService.createTransaction({
      user_id: user.id,
      account_id: account.id,
      type: 'credit',
      amount: amountValue,
      description: `Add money via ${method || 'transfer'}`,
      currency: account.currency,
      status: 'pending',
      metadata: {
        evidence_url: evidenceUrl,
        evidence_name: proofFile.name,
        evidence_type: proofFile.type,
        method: method || 'transfer',
      },
    });
    if (pendingTx?.id) {
      setPendingTransactionId(pendingTx.id);
      await supabaseDbService.createActivity({
        user_id: user.id,
        type: 'credit',
        description: 'Add money request submitted',
        amount: amountValue,
      });
    }
    setTimeout(() => {
      setUploading(false);
      setStep(5);
      setVerificationStatus('pending');
    }, 1200);
  };
  // Notification logic for admin actions
  const handleAdminApprove = async () => {
    setVerificationStatus('approved');
    if (pendingTransactionId) {
      await supabaseDbService.updateTransaction(pendingTransactionId, { status: 'completed' });
    }
    if (user?.id) {
      await supabaseDbService.createNotification({
        user_id: user.id,
        title: 'Add Money Approved',
        message: 'Your add money request has been approved.',
        type: 'approved',
        read: false,
        path: '/activity',
      });
      await supabaseDbService.deleteDraft(user.id, 'add_money');
      setHasDraft(false);
    }
    setTimeout(() => setStep(6), 1200);
  };
  const handleAdminDecline = async () => {
    const reason = prompt('Enter reason for decline:');
    setDeclineReason(reason || 'No reason provided');
    setVerificationStatus('declined');
    if (pendingTransactionId) {
      await supabaseDbService.updateTransaction(pendingTransactionId, { status: 'failed' });
    }
    if (user?.id) {
      await supabaseDbService.createNotification({
        user_id: user.id,
        title: 'Add Money Declined',
        message: `Your add money request was declined. Reason: ${reason || 'No reason provided'}`,
        type: 'declined',
        read: false,
        path: '/activity',
      });
      await supabaseDbService.deleteDraft(user.id, 'add_money');
      setHasDraft(false);
    }
    setTimeout(() => setStep(6), 1200);
  };

  // Handle navigation with prompt
  const handleBack = () => {
    if (step > 1 && (amount || proofFile)) {
      setShowPrompt(true);
      setPendingNavigate(step === 1 ? '/dashboard' : null);
    } else {
      step === 1 ? navigate('/dashboard') : setStep(step - 1);
    }
  };
  const handleCancel = () => {
    setShowPrompt(true);
    setPendingNavigate('/dashboard');
  };
  const handlePromptSave = () => {
    setShowPrompt(false);
    if (user?.id) {
      supabaseDbService.upsertDraft(user.id, 'add_money', {
        step,
        method,
        amount,
        verificationStatus,
        declineReason,
        pendingTransactionId
      });
      setHasDraft(true);
    }
    if (pendingNavigate) navigate(pendingNavigate);
  };
  const handlePromptDiscard = () => {
    setShowPrompt(false);
    if (user?.id) {
      supabaseDbService.deleteDraft(user.id, 'add_money');
      setHasDraft(false);
    }
    // Reset all component state to initial values
    setStep(1);
    setMethod('');
    setAmount('');
    setError('');
    setProofFile(null);
    setProofFilePreview('');
    setVerificationStatus(null);
    setDeclineReason('');
    setPendingNavigate(null);
    if (pendingNavigate) navigate(pendingNavigate);
  };

  const handleAddMoreMoney = () => {
    if (user?.id) {
      supabaseDbService.deleteDraft(user.id, 'add_money');
      setHasDraft(false);
    }
    // Reset all component state to initial values
    setStep(1);
    setMethod('');
    setAmount('');
    setError('');
    setProofFile(null);
    setProofFilePreview('');
    setVerificationStatus(null);
    setDeclineReason('');
    setPendingNavigate(null);
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
      <AccountCreationModal
        isOpen={showAccountCreationModal}
        onClose={() => setShowAccountCreationModal(false)}
        onSuccess={() => {
          setShowAccountCreationModal(false);
          setShowAccountCreationPrompt(false);
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4"
      >
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
            <h1 className="text-xl font-semibold">Add Money</h1>
            <p className="text-sm text-muted-foreground">Step {step} of 6</p>
          </div>
        </div>
      </motion.div>

      {/* Progress */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-[#00b388]' : 'bg-muted'}`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pb-2">
        <ImageAnnouncementBar items={FLOW_ANNOUNCEMENT_SLIDES} className="h-[92px]" />
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {/* Step 1: Select method */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <h2 className="text-2xl mb-2 font-semibold">Select Add Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {addMethods.map((m) => (
                <Card key={m.key} className={`p-6 cursor-pointer border-2 relative ${method === m.key ? 'border-[#00b388]' : ''}`} onClick={() => setMethod(m.key)}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{m.label}</span>
                    {method === m.key && <span className="px-2 py-0.5 rounded-full bg-[#00b388] text-white text-xs">Selected</span>}
                  </div>
                  {hasDraft && m.key === 'bank' && (
                    <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-600 animate-pulse" title="Draft saved"></span>
                  )}
                </Card>
              ))}
            </div>
            <Button onClick={handleMethodNext} className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white shadow-md hover:shadow-lg">Next</Button>
            <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
          </motion.div>
        )}

        {/* Step 2: Enter amount */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <h2 className="text-2xl font-semibold mb-2">Enter amount</h2>
            <p className="text-sm text-muted-foreground">Minimum $500 - Maximum $2,000,000</p>
            <Card className="bg-white border rounded-xl p-6 mt-6">
              <Label className="text-sm text-muted-foreground mb-2 block">Add Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-semibold text-muted-foreground">$</span>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={handleAmountChange} 
                  className="text-4xl font-semibold border-0 bg-transparent tabular-nums focus-visible:ring-0 flex-1 shadow-sm focus:shadow-md" 
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-6">
                {[500, 1000, 5000].map((preset) => (
                  <Button 
                    key={preset} 
                    variant="outline" 
                    className="h-10 rounded-lg border border-border text-sm font-medium shadow-sm hover:shadow-md" 
                    onClick={() => handlePreset(preset)}
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
              {error && <div className="mt-4 p-3 rounded-lg bg-[#fee2e2] border border-red-200 text-xs text-red-900">{error}</div>}
            </Card>
            <Button 
              onClick={handleAmountNext} 
              disabled={!(parseFloat(amount) >= 500 && parseFloat(amount) <= 2000000)} 
              className="mt-6 w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              Continue
            </Button>
            <Button onClick={handleCancel} variant="outline" className="w-full h-10 shadow-sm hover:shadow-md">Cancel</Button>
          </motion.div>
        )}

        {/* Step 3: Show admin-provided details */}
        {step === 3 && (
          method === 'giftcard' ? (
            (() => { setStep(4); return null; })()
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
              <h2 className="text-2xl mb-2 font-semibold">Payment Details</h2>
              <div className="p-4 rounded-lg bg-[#e6f9f4] border border-[#00b388]/20">
                <p className="text-sm text-gray-700">
                  These are our default account details to fund your Chimahub account. Send your payment to the details below to complete your add money transaction.
                </p>
              </div>
              <Card className="p-6 space-y-2">
                {method === 'bank' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Account Number:</span>
                      <span>{adminDetails.account}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Bank Name:</span>
                      <span>{adminDetails.bank}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Account Name:</span>
                      <span>{adminDetails.name}</span>
                    </div>
                  </>
                )}
                {method === 'paypal' && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">PayPal Email:</span>
                    <span>{adminDetails.paypal}</span>
                  </div>
                )}
              </Card>
              <Button onClick={handleCopyAccount} className="w-full h-10 mb-2 shadow-sm hover:shadow-md">Copy Details</Button>
              <Button onClick={handleNextToProof} className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white shadow-md hover:shadow-lg">Next</Button>
              <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
            </motion.div>
          )
        )}

        {/* Step 4: Upload payment proof */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
            <h2 className="text-2xl mb-2 font-semibold">{method === 'giftcard' ? 'Upload Gift Card Screenshot' : 'Upload Payment Proof'}</h2>
            <Card className="p-6 flex flex-col items-center gap-6 bg-muted/50">
              <div className="w-16 h-16 rounded-full bg-[#e6f9f4] flex items-center justify-center mb-2">
                {/* ...existing icon... */}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold mb-1">
                  {method === 'giftcard' ? 'Please upload a clear screenshot or photo of the gift card.' : 'Attach your payment receipt'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {method === 'giftcard' ? 'Accepted formats: JPG, PNG, PDF. You may upload up to 7 files at a time.' : 'Accepted formats: JPG, PNG, PDF. Please ensure the receipt clearly shows transaction details.'}
                </p>
              </div>
              <input
                id="proof-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleProofUpload}
                className="mb-4"
                title={method === 'giftcard' ? 'Upload gift card screenshot' : 'Upload payment proof'}
                placeholder={method === 'giftcard' ? 'Upload gift card screenshot' : 'Upload payment proof'}
                multiple={method === 'giftcard'}
                max={method === 'giftcard' ? 7 : undefined}
              />
              {proofFilePreview && (
                <div className="w-full mb-4">
                  <img src={proofFilePreview} alt="Payment proof preview" className="max-h-64 rounded-lg object-contain mx-auto border border-border" />
                  <p className="text-sm text-center text-gray-600 mt-2">{proofFile?.name}</p>
                </div>
              )}
              <Button onClick={handleSubmitProof} disabled={uploading} className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white shadow-md hover:shadow-lg">{uploading ? 'Uploading...' : method === 'giftcard' ? 'Submit Gift Card' : 'Submit Proof'}</Button>
              <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Under verification screen */}
        {step === 5 && verificationStatus === 'pending' && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="w-24 h-24 rounded-full bg-[#e6f9f4] flex items-center justify-center mb-8">
                <div className="w-12 h-12 border-4 border-[#00b388] border-t-transparent rounded-full animate-spin"></div>
              </motion.div>
              <h2 className="text-3xl font-bold mb-4 text-gray-800">Payment Under Verification</h2>
              <Card className="p-6 mb-8 max-w-md bg-[#f0fdf4] border border-[#00b388]/20">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Thank you for submitting your payment proof. Your transaction is currently under review.
                </p>
                <div className="bg-white p-4 rounded-lg border border-[#00b388]/10 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Estimated verification time</p>
                  <p className="text-2xl font-bold text-[#00b388]">10 - 30 minutes</p>
                </div>
                <p className="text-sm text-gray-600">
                  You will receive a notification once the process is complete.
                </p>
              </Card>
            </motion.div>
            <Button onClick={() => navigate('/dashboard')} className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium shadow-md hover:shadow-lg">Back to Dashboard</Button>
            <Button onClick={handleAddMoreMoney} className="w-full h-12 mt-3 bg-white hover:bg-gray-50 text-[#00b388] font-medium border-2 border-[#00b388] shadow-md hover:shadow-lg">Add More Money</Button>
          </>
        )}

        {/* Step 6: Result screen */}
        {step === 6 && verificationStatus === 'approved' && (
          <>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="w-20 h-20 rounded-full bg-[#e6f9f4] flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-[#00b388]" />
              </motion.div>
              <h2 className="text-2xl mb-2 font-semibold">Add Successful</h2>
              <p className="text-muted-foreground mb-8 max-w-sm">Your add of ${amount} has been completed. Funds will reflect in your balance soon.</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-[#00b388] hover:bg-[#009670] text-white px-8 shadow-md hover:shadow-lg">Back to Dashboard</Button>
            </motion.div>
            <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
          </>
        )}
        {step === 6 && verificationStatus === 'declined' && (
          <>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <X className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl mb-2 font-semibold">Add Declined</h2>
              <p className="text-muted-foreground mb-4 max-w-sm">Reason: {declineReason}</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-[#00b388] hover:bg-[#009670] text-white px-8 shadow-md hover:shadow-lg">Back to Dashboard</Button>
            </motion.div>
            <Button onClick={handleCancel} variant="outline" className="w-full h-10 mt-2 shadow-sm hover:shadow-md">Cancel</Button>
          </>
        )}
      </div>
    {/* Save/Cancel Draft Prompt */}
    {showPrompt && (
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">Save your draft?</h2>
          <p className="text-muted-foreground mb-6">You have an unfinished add money transaction. Would you like to save it as a draft or discard it?</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handlePromptSave} className="bg-[#00b388] text-white shadow-md hover:shadow-lg">Save Draft</Button>
            <Button onClick={handlePromptDiscard} variant="outline" className="shadow-sm hover:shadow-md">Discard Draft</Button>
          </div>
        </Card>
      </div>
    )}
    </div>
  );
}
