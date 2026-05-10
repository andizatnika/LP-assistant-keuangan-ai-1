import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./lib/firebase";
import { Eye, EyeOff, Copy, Check, Upload, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const BANK_ACCOUNTS = [
  { id: 'bri', name: 'BRI', color: '#003087', rek: '009201001828567', an: 'ANDI ZATNIKA' },
  { id: 'mandiri', name: 'Mandiri', color: '#FFD700', text: '#003D79', rek: '1820004264586', an: 'ANDI ZATNIKA' },
  { id: 'bca', name: 'BCA', color: '#006CB7', rek: '0383175779', an: 'HANA SUNDARI PUTRI' }
];

function SubscribePage() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", whatsapp: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError("File terlalu besar. Maksimal 5MB.");
        return;
      }
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Step 1: Validation
    if (!formData.name) return setError("Nama Lengkap wajib diisi");
    if (!formData.email) return setError("Alamat Email wajib diisi");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setError("Format email tidak valid");
    if (formData.password.length < 8) return setError("Password minimal 8 karakter");
    if (!formData.whatsapp) return setError("Nomor WhatsApp wajib diisi");
    if (!file) return setError("Silakan upload bukti transfer dahulu");

    setLoading(true);

    try {
      // Step 2: Create Firebase Auth Account
      const authResult = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = authResult.user.uid;

      // Upload Proof to Storage
      let proofUrl = "";
      if (file) {
        const storageRef = ref(storage, `proofs/${uid}`);
        await uploadBytes(storageRef, file);
        proofUrl = await getDownloadURL(storageRef);
      }

      // Step 3: Save to Firestore 'users'
      await setDoc(doc(db, "users", uid), {
        name: formData.name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        role: 'user',
        isVerified: false,
        status: 'pending_approval',
        subscriptionType: 'lifetime',
        amount: 99000,
        proofUrl: proofUrl,
        createdAt: serverTimestamp(),
        approvedAt: null,
        approvedBy: null
      });

      // Step 4: Open WhatsApp
      const now = new Date();
      const tgl = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const waMessage = `Halo Admin Assistant Keuangan AI 👋\n\nSaya ingin mendaftarkan akun baru dan sudah melakukan pembayaran.\n\n*DATA PENDAFTAR:*\n👤 Nama: ${formData.name}\n📧 Email: ${formData.email}\n📱 WhatsApp: ${formData.whatsapp}\n\n*INFO PEMBAYARAN:*\n💰 Nominal: Rp 99.000\n📅 Tanggal: ${tgl}\n🕐 Waktu: ${jam}\n\nBukti transfer sudah saya upload di form pendaftaran.\nMohon segera diverifikasi dan akun saya diaktifkan.\n\nTerima kasih 🙏`;

      window.open(`https://wa.me/6283892802483?text=${encodeURIComponent(waMessage)}`, '_blank');

      // Step 5: Show Success View
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email ini sudah terdaftar, silakan gunakan email lain");
      } else {
        setError("Terjadi kesalahan: " + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0B2818] p-8 md:p-12 rounded-3xl border border-emerald-500/20 shadow-2xl max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="font-heading text-3xl font-bold mb-4">Pendaftaran Berhasil! 🎉</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            Akun kamu sudah terdaftar dan menunggu verifikasi admin. Kami akan mengaktifkan akun ke email <strong className="text-white">{formData.email}</strong> dalam 1×24 jam setelah pembayaran dikonfirmasi.
          </p>
          <div className="bg-black/30 p-4 rounded-xl text-sm text-gray-400 mb-8 border border-white/5">
            Sambil menunggu, simpan email dan password yang kamu daftarkan.
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full transition"
          >
            Menuju Halaman Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12 md:py-20">
      {/* HEADER */}
      <div className="text-center mb-12">
        <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
          Assistant Keuangan <span className="text-emerald-500">AI</span>
        </h1>
        <p className="text-gray-400 text-lg">Satu langkah menuju kebebasan finansialmu</p>
      </div>

      {/* [2] FORM PENDAFTARAN */}
      <div className="bg-[#0B2818] rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl mb-8">
        <h3 className="font-heading text-xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          Form Pendaftaran
        </h3>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 ml-1">Nama Lengkap</label>
            <input 
              type="text"
              placeholder="Masukkan nama lengkap Anda"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 ml-1">Alamat Email</label>
            <input 
              type="email"
              placeholder="contoh@email.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition pr-12"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 ml-1">Nomor WhatsApp</label>
            <input 
              type="tel"
              placeholder="0812xxxx (Aktif WhatsApp)"
              value={formData.whatsapp}
              onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 ml-1">Upload Bukti Transfer</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-white/5 transition group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              
              {filePreview ? (
                <div className="relative inline-block">
                  <img src={filePreview} alt="Preview" className="max-h-48 rounded-lg mb-2 mx-auto shadow-lg" />
                  <p className="text-xs text-emerald-400 font-medium">Klik untuk ganti file</p>
                </div>
              ) : (
                <div className="py-4">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                    <Upload className="text-gray-400 group-hover:text-emerald-400" />
                  </div>
                  <p className="text-gray-400 text-sm">Klik untuk upload bukti transfer</p>
                  <p className="text-gray-500 text-xs mt-1">Format: JPG, PNG (Max 5MB)</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* [3] INFO REKENING PEMBAYARAN */}
      <div className="bg-[#0B2818] rounded-3xl p-6 md:p-8 border border-amber-500/20 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 bg-amber-500/10 rounded-bl-3xl">
          <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">INFO PEMBAYARAN</span>
        </div>

        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">TRANSFER KE SALAH SATU REKENING BERIKUT</p>
          <h2 className="font-heading text-6xl md:text-7xl font-extrabold text-amber-500 mb-2 drop-shadow-lg">
            Rp 99.000
          </h2>
          <p className="text-emerald-400 font-semibold mb-8 flex items-center justify-center gap-2">
            <Check size={18} /> Akses seumur hidup • Bayar sekali, pakai selamanya
          </p>
        </div>

        <div className="space-y-4">
          {BANK_ACCOUNTS.map((bank) => (
            <div key={bank.id} className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span 
                    className="px-3 py-1 rounded-md text-[11px] font-extrabold text-white" 
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.name}
                  </span>
                  <span className="text-white font-mono text-lg font-bold tracking-wider">{bank.rek}</span>
                </div>
                <p className="text-gray-500 text-xs pl-1 uppercase tracking-tight">A/N {bank.an}</p>
              </div>
              <button 
                onClick={() => copyToClipboard(bank.rek, bank.id)}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  copied === bank.id ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                {copied === bank.id ? <Check size={16} /> : <Copy size={16} />}
                {copied === bank.id ? 'Tersalin' : 'Salin Rekening'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* [4] TOMBOL CTA */}
      <div className="space-y-4">
        <button 
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-[#25D366] hover:bg-[#20bd5b] text-white flex items-center justify-center gap-3 py-5 rounded-full font-heading font-extrabold text-xl shadow-[0_10px_25px_rgba(37,211,102,0.3)] transition transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
          ) : (
            <>
              <MessageCircle fill="currentColor" className="text-white" />
              Konfirmasi Pembayaran via WhatsApp →
            </>
          )}
        </button>
        <div className="text-center space-y-1">
          <p className="text-gray-500 text-xs">
            Admin akan memverifikasi pembayaran dan mengaktifkan akun dalam 1×24 jam
          </p>
          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600">
            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
            <span>Enskripsi keamanan data 256-bit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(<SubscribePage />);
  } catch (err) {
    console.error("React Render Error (Subscribe):", err);
    rootElement.innerHTML = `<div style="color:red; padding:20px;">Gagal memuat aplikasi. Silakan muat ulang halaman.</div>`;
  }
}
