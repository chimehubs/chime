import { motion } from 'motion/react';
import { Download, FileText, X } from 'lucide-react';
import type { Transaction } from '../../../services/supabaseDbService';

const RECEIPT_BG_IMAGE =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTW0xpVlB9mskBiyDXt8ojNC_16hHsuzVZJmQ&s';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  fallbackCurrency?: string;
  onClose: () => void;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function formatAmount(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

export default function TransactionDetailsModal({
  isOpen,
  transaction,
  fallbackCurrency = 'USD',
  onClose,
}: TransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null;

  const currency = transaction.currency || fallbackCurrency;
  const amountValue = Number(transaction.amount || 0);
  const isDebit = transaction.type === 'debit';
  const signedAmount = `${isDebit ? '-' : '+'}${formatAmount(Math.abs(amountValue), currency)}`;
  const txDate = transaction.created_at ? new Date(transaction.created_at) : new Date();
  const senderName = (transaction.metadata as any)?.sender_name || '';
  const senderBank = (transaction.metadata as any)?.sender_bank || '';

  const details = [
    { label: 'Transaction ID', value: transaction.id || 'N/A' },
    { label: 'Type', value: transaction.type?.toUpperCase() || 'N/A' },
    { label: 'Status', value: transaction.status?.toUpperCase() || 'N/A' },
    { label: 'Description', value: transaction.description || 'N/A' },
    { label: 'Currency', value: currency },
    { label: 'Date', value: txDate.toLocaleDateString() },
    { label: 'Time', value: txDate.toLocaleTimeString() },
    { label: 'From', value: senderName ? `${senderName}${senderBank ? ` (${senderBank})` : ''}` : 'N/A' },
    { label: 'Account Ref', value: transaction.account_id || 'N/A' },
  ];

  const handleDownloadImage = async () => {
    const width = 1080;
    const height = 1400;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    try {
      const bg = await loadImage(RECEIPT_BG_IMAGE);
      ctx.globalAlpha = 0.1;
      ctx.drawImage(bg, 0, 0, width, height);
      ctx.globalAlpha = 1;
    } catch {
      // Continue without background image if CORS blocks it.
    }

    ctx.fillStyle = '#052e2b';
    ctx.font = 'bold 52px Manrope, Arial';
    ctx.fillText('Transaction Receipt', 80, 120);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 64px Manrope, Arial';
    ctx.fillText(signedAmount, 80, 230);

    ctx.font = '28px Manrope, Arial';
    let y = 320;
    details.forEach((row) => {
      ctx.fillStyle = '#475569';
      ctx.fillText(`${row.label}:`, 80, y);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(String(row.value), 360, y);
      y += 62;
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `receipt-${transaction.id?.slice(0, 8) || 'transaction'}.png`;
    link.click();
  };

  const handleDownloadPdf = () => {
    const receiptHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; }
            .receipt { width: 760px; margin: 24px auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #dbe7e2; position: relative; }
            .bg { position: absolute; inset: 0; background-image: url('${RECEIPT_BG_IMAGE}'); background-size: cover; background-position: center; opacity: 0.09; }
            .content { position: relative; z-index: 1; padding: 28px; }
            h1 { margin: 0 0 8px; color: #052e2b; font-size: 30px; }
            .amount { font-size: 38px; font-weight: 700; color: ${isDebit ? '#dc2626' : '#059669'}; margin-bottom: 20px; }
            .row { display: flex; border-bottom: 1px solid #e2e8f0; padding: 10px 0; }
            .label { width: 220px; color: #64748b; font-weight: 600; }
            .value { flex: 1; color: #0f172a; word-break: break-word; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="bg"></div>
            <div class="content">
              <h1>Transaction Receipt</h1>
              <div class="amount">${escapeHtml(signedAmount)}</div>
              ${details
                .map(
                  (d) =>
                    `<div class="row"><div class="label">${escapeHtml(d.label)}</div><div class="value">${escapeHtml(
                      String(d.value),
                    )}</div></div>`,
                )
                .join('')}
            </div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] bg-black/55 p-4 flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[#d7ebe4] bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-[#00b388] to-[#009f7a] px-5 py-4 text-white">
          <div>
            <h3 className="text-lg font-semibold">Transaction Details</h3>
            <p className="text-xs text-white/85">Tap download to save receipt</p>
          </div>
          <button onClick={onClose} title="Close" className="rounded-full p-1.5 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 rounded-xl bg-[#f2faf7] border border-[#d7ebe4] p-4">
            <p className="text-xs text-[#5f7a72]">Amount</p>
            <p className={`text-3xl font-bold ${isDebit ? 'text-red-600' : 'text-[#059669]'}`}>{signedAmount}</p>
          </div>

          <div className="space-y-2 mb-5">
            {details.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className="text-sm font-medium text-slate-800 text-right break-all">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadImage}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7ebe4] bg-[#f8fcfa] px-3 py-2 text-sm font-medium text-[#0f172a] hover:bg-[#eef8f4]"
            >
              <Download className="h-4 w-4" />
              Download Image
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00b388] px-3 py-2 text-sm font-medium text-white hover:bg-[#009670]"
            >
              <FileText className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

