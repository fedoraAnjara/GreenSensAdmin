import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata = {
  title: "GreenSense Admin",
  description: "Dashboard administrateur GreenSense",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}