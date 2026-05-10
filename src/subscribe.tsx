import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./lib/firebase";

const BANK_ACCOUNTS = [
  { name: 'Bank BRI', rek: '009201001828567', an: 'ANDI ZATNIKA' },
  { name: 'Bank Mandiri', rek: '1820004264586', an: 'ANDI ZATNIKA' },
  { name: 'Bank BCA', rek: '0383175779', an: 'HANA SUNDARI PUTRI' }
];

function SubscribePage() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Silakan upload bukti transfer dahulu.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // 1. Create Account
      const authResult = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = authResult.user.uid;

      // 2. Upload Proof
      const storageRef = ref(storage, `proofs/${uid}`);
      await uploadBytes(storageRef, file);
      
      // 3. Get Download URL
      const proofUrl = await getDownloadURL(storageRef);

      // 4. Save to Firestore
      await setDoc(doc(db, "users", uid), {
        name: formData.name,
        email: formData.email,
        status: "pending",
        proofUrl: proofUrl,
        isLifetime: true, // Specific request: lifetime
        createdAt: serverTimestamp(),
        expiresAt: null, // Lifetime means no expiration
        approvedAt: null
      });

      setMessage("Pendaftaran berhasil! Akun aktif dalam 1x24 jam.");
      setFormData({ name: "", email: "", password: "" });
      setFile(null);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar. Silakan gunakan email lain atau hubungi admin.");
      } else {
        setError("Terjadi kesalahan: " + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#0B2818", borderRadius: "15px", color: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px", color: "#10B981" }}>Daftar Assistant Keuangan AI</h2>
      
      <div style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px" }}>
        <p style={{ fontWeight: "bold", color: "#F59E0B", marginBottom: "10px" }}>Info Rekening Pembayaran (Lifetime Access):</p>
        {BANK_ACCOUNTS.map((bank, i) => (
          <div key={i} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
            <strong>{bank.name}</strong><br/>
            Rek: {bank.rek}<br/>
            A/N: {bank.an}
          </div>
        ))}
        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "10px" }}>*Investasi sekali bayar Rp 99.000 untuk akses seumur hidup.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input 
          placeholder="Nama Lengkap" 
          required 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #2d2d2d", backgroundColor: "#1a1a1a", color: "white" }} 
        />
        <input 
          type="email" 
          placeholder="Email" 
          required 
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #2d2d2d", backgroundColor: "#1a1a1a", color: "white" }} 
        />
        <input 
          type="password" 
          placeholder="Password (min 8 karakter)" 
          required 
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #2d2d2d", backgroundColor: "#1a1a1a", color: "white" }} 
        />
        
        <label style={{ fontSize: "14px", color: "#9ca3af" }}>Upload Bukti Transfer (Max 5MB):</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          style={{ color: "#9ca3af" }}
        />

        {error && <div style={{ color: "#ef4444", fontSize: "14px" }}>{error}</div>}
        {message && <div style={{ color: "#10B981", fontSize: "14px", fontWeight: "bold" }}>{message}</div>}

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: "15px", 
            borderRadius: "8px", 
            border: "none", 
            backgroundColor: loading ? "#064e3b" : "#10B981", 
            color: "#0B2818", 
            fontWeight: "bold", 
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "10px"
          }}
        >
          {loading ? "Memproses..." : "DAFTAR SEKARANG"}
        </button>
      </form>
    </div>
  );
}

console.log("Subscribe entry point loaded");
const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(<SubscribePage />);
    console.log("Subscribe React rendered");
  } catch (err) {
    console.error("React Render Error (Subscribe):", err);
    rootElement.innerHTML = `<div style="color:red; padding:20px;">Gagal memuat aplikasi. Silakan muat ulang halaman.</div>`;
  }
} else {
  console.error("Root element not found");
}
