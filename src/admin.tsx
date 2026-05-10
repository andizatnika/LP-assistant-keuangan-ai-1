import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  User
} from "firebase/auth";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";

const ADMIN_EMAIL = "andyzatnika92@gmail.com"; 

function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, active: 0, total: 0 });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email === ADMIN_EMAIL) {
        setUser(u);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(allUsers);
      
      const counts = allUsers.reduce((acc: any, curr: any) => {
        if (curr.status === "pending") acc.pending++;
        if (curr.status === "active") acc.active++;
        acc.total++;
        return acc;
      }, { pending: 0, active: 0, total: 0 });
      setStats(counts);
    });

    return () => unsub();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email !== ADMIN_EMAIL) {
      alert("Hanya admin yang diperbolehkan masuk.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
    } catch (err: any) {
      alert("Login gagal: " + err.message);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      // Yearly or Lifetime? 
      // User requested "Life time saja", but their prompt said "expiresAt = now + 365"
      // I will prioritize the "Life time" request from the chat message.
      await updateDoc(userRef, {
        status: "active",
        approvedAt: serverTimestamp(),
        expiresAt: null // Lifetime
      });
      alert("User diaktifkan (Lifetime)!");
    } catch (err: any) {
      alert("Gagal mengaktifkan: " + err.message);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        status: "rejected"
      });
      alert("User ditolak.");
    } catch (err: any) {
      alert("Gagal menolak: " + err.message);
    }
  };

  if (authLoading) return <div style={{ padding: "50px", textAlign: "center" }}>Memuat...</div>;

  if (!user) {
    return (
      <div style={{ maxWidth: "400px", margin: "100px auto", padding: "30px", backgroundColor: "white", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Admin Login</h2>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input 
            type="email" 
            placeholder="Email Admin" 
            value={loginForm.email} 
            onChange={e => setLoginForm({...loginForm, email: e.target.value})}
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: "10px", borderRadius: "5px", border: "none", backgroundColor: "#10B981", color: "white", fontWeight: "bold", cursor: "pointer" }}>
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ flex: 1 }}>Panel Admin - Verifikasi Pembayaran</h1>
        <div>
          <span style={{ marginRight: "15px", fontSize: "14px", color: "#666" }}>{user.email}</span>
          <button onClick={() => signOut(auth)} style={{ padding: "8px 15px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div style={{ flex: 1, backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Pending</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#F59E0B" }}>{stats.pending}</div>
        </div>
        <div style={{ flex: 1, backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Aktif</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#10B981" }}>{stats.active}</div>
        </div>
        <div style={{ flex: 1, backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Total User</div>
          <div style={{ fontSize: "32px", fontWeight: "bold" }}>{stats.total}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: "15px" }}>Daftar Menunggu Persetujuan</h2>
      <div style={{ backgroundColor: "white", borderRadius: "10px", overflow: "hidden", marginBottom: "40px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #eee", textAlign: "left" }}>
              <th style={{ padding: "12px" }}>Nama</th>
              <th style={{ padding: "12px" }}>Email</th>
              <th style={{ padding: "12px" }}>Bukti</th>
              <th style={{ padding: "12px" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.status === "pending").map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>{u.name}</td>
                <td style={{ padding: "12px" }}>{u.email}</td>
                <td style={{ padding: "12px" }}>
                  <a href={u.proofUrl} target="_blank" rel="noreferrer" style={{ color: "#10B981", textDecoration: "none" }}>Lihat Bukti</a>
                </td>
                <td style={{ padding: "12px" }}>
                  <button onClick={() => handleApprove(u.id)} style={{ padding: "5px 10px", backgroundColor: "#10B981", color: "white", border: "none", borderRadius: "3px", marginRight: "5px", cursor: "pointer" }}>Aktifkan</button>
                  <button onClick={() => handleReject(u.id)} style={{ padding: "5px 10px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>Tolak</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.filter(u => u.status === "pending").length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>Tidak ada data pending.</div>}
      </div>

      <h2 style={{ marginBottom: "15px" }}>User Aktif</h2>
      <div style={{ backgroundColor: "white", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #eee", textAlign: "left" }}>
              <th style={{ padding: "12px" }}>Nama</th>
              <th style={{ padding: "12px" }}>Email</th>
              <th style={{ padding: "12px" }}>Status</th>
              <th style={{ padding: "12px" }}>Hingga</th>
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.status === "active").map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>{u.name}</td>
                <td style={{ padding: "12px" }}>{u.email}</td>
                <td style={{ padding: "12px" }}>
                   <span style={{ fontSize: "12px", backgroundColor: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "10px" }}>Aktif</span>
                </td>
                <td style={{ padding: "12px" }}>{u.expiresAt ? new Date(u.expiresAt.seconds * 1000).toLocaleDateString() : "Life Time"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

console.log("Admin entry point loaded");
const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(<AdminPanel />);
    console.log("Admin React rendered");
  } catch (err) {
    console.error("React Render Error (Admin):", err);
    rootElement.innerHTML = `<div style="color:red; padding:20px;">Gagal memuat Admin Panel. Silakan muat ulang halaman.</div>`;
  }
} else {
  console.error("Root element not found");
}
