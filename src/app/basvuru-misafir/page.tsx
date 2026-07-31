"use client";

import { useState } from "react";

import NewPetitionForm from "@/components/NewPetitionForm";

export default function GuestPage() {
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  function handleSuccess(message: string) {
    setShowForm(false);
    setSuccessMessage(message);
  }

  function handleNewPetition() {
    setSuccessMessage("");
    setShowForm(true);
  }

  return (
    <div
      className="login-page"
      style={{
        alignItems: "flex-start",
        paddingTop: 40,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#fff",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 56,
              marginBottom: 12,
            }}
          >
            🏛️
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Mersin Üniversitesi
          </h1>

          <p
            style={{
              opacity: 0.85,
              fontSize: 15,
            }}
          >
            Dilek, Öneri ve Başvuru Sistemi
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            {successMessage ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    marginBottom: 16,
                  }}
                >
                  ✉️
                </div>

                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  E-posta Doğrulaması Gerekli
                </h2>

                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: 20,
                    lineHeight: 1.7,
                  }}
                >
                  {successMessage}
                </p>

                <div
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: 18,
                    marginBottom: 24,
                    textAlign: "left",
                  }}
                >
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    Doğrulama bağlantısı 30 dakika süreyle geçerlidir.
                    E-posta gelen kutunuzda görünmüyorsa spam veya gereksiz
                    klasörünü de kontrol edin.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNewPetition}
                >
                  Yeni Başvuru Oluştur
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: 24,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  Mersin Üniversitesi&apos;ne kayıt olmadan dilek, öneri,
                  şikâyet, talep veya bilgi edinme başvurusu
                  oluşturabilirsiniz.
                </p>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowForm(true)}
                >
                  📝 Başvuru Oluştur
                </button>

                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    Başvurunuzun tamamlanması için e-posta adresinizi
                    doğrulamanız gerekir. Başvuru durumunuz daha sonra takip
                    kodu ve e-posta adresinizle görüntülenebilir.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <NewPetitionForm
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}