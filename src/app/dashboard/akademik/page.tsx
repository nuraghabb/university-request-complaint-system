"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Petition {
  id: number;
  trackingCode: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const STATUS_COLORS: Record<string, string> = {
  EMAIL_PENDING: "#ffa500",
  RECEIVED: "#0066cc",
  IN_REVIEW: "#9933ff",
  ANSWERED: "#00aa00",
  CLOSED: "#999",
  REJECTED: "#cc0000",
};

export default function AcademicDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) {
          router.push("/ogrenci-akademisyen-giris");
          return;
        }
        const data = await response.json();
        setUser(data.user);

        // Fetch petitions
        const petResponse = await fetch("/api/petitions", {
          credentials: "include",
        });
        if (petResponse.ok) {
          const petData = await petResponse.json();
          setPetitions(petData.petitions || []);
        }
      } catch {
        router.push("/ogrenci-akademisyen-giris");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}>Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1>Akademisyen Paneli</h1>
          <p>Dilekçelerinizi yönetin</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Çıkış Yap
        </button>
      </header>

      <div style={styles.content}>
        <div style={styles.welcome}>
          <h2>Hoşgeldiniz, {user.firstName} {user.lastName}</h2>
          <p>E-posta: {user.email}</p>
        </div>

        <div style={styles.actionButtons}>
          <button
            style={styles.button}
            onClick={() => router.push("/basvuru-misafir")}
          >
            ➕ Yeni Dilekçe Oluştur
          </button>
          <button
            style={styles.button}
            onClick={() => router.push("/basvuru-takip")}
          >
            🔍 Dilekçe Takip Et
          </button>
        </div>

        <div style={styles.section}>
          <h3>Başvurularınız ({petitions.length})</h3>
          {petitions.length === 0 ? (
            <div style={styles.empty}>
              <p>Henüz başvuru bulunmamaktadır.</p>
            </div>
          ) : (
            <div style={styles.petitionList}>
              {petitions.map((petition) => (
                <div key={petition.id} style={styles.petitionItem}>
                  <div>
                    <div style={styles.petitionCode}>{petition.trackingCode}</div>
                    <div style={styles.petitionSubject}>{petition.subject}</div>
                    <div style={styles.petitionDate}>
                      {new Date(petition.createdAt).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: STATUS_COLORS[petition.status] || "#999",
                    }}
                  >
                    {petition.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#0066cc",
    color: "white",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutBtn: {
    padding: "8px 16px",
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    cursor: "pointer",
  },
  content: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "32px 24px",
  },
  welcome: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "24px",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },
  button: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#0066cc",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  section: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
  },
  empty: {
    padding: "32px",
    textAlign: "center",
    color: "#999",
  },
  petitionList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  petitionItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  petitionCode: {
    fontSize: "12px",
    color: "#999",
    fontFamily: "monospace",
  },
  petitionSubject: {
    fontSize: "14px",
    fontWeight: "600",
    margin: "4px 0",
  },
  petitionDate: {
    fontSize: "12px",
    color: "#999",
  },
  statusBadge: {
    padding: "6px 12px",
    color: "white",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "600",
  },
  spinner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
};
