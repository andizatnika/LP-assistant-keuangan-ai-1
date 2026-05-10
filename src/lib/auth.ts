import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export function useProtectedPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        window.location.href = "/subscribe";
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // If doc doesn't exist, redirect to subscribe
          window.location.href = "/subscribe";
          return;
        }

        const userData = userSnap.data();
        
        // Redirect logic based on status
        if (userData.status !== "active") {
          if (window.location.pathname !== "/subscribe") {
            window.location.href = `/subscribe?status=${userData.status}`;
          }
        } else if (userData.expiresAt && userData.expiresAt.toDate() < new Date()) {
          if (window.location.pathname !== "/subscribe") {
            window.location.href = "/subscribe?status=expired";
          }
        }

        setUser({ ...firebaseUser, ...userData });
      } catch (error) {
        console.error("Auth Hook Error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { loading, user };
}
