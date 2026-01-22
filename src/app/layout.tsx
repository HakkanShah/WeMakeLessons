import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google"; // Kid friendly fonts
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { VoiceProvider } from "@/context/VoiceContext";
import { Toaster } from "react-hot-toast";
import NavigationSounds from "@/components/NavigationSounds";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: '--font-fredoka' });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: '--font-nunito' });

export const metadata: Metadata = {
  title: "WeMakeLessons",
  description: "AI-Powered Course Generator",
  openGraph: {
    title: "WeMakeLessons",
    description: "AI-Powered Course Generator",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WeMakeLessons - AI-Powered Course Generator",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WeMakeLessons",
    description: "AI-Powered Course Generator",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${nunito.variable} font-sans antialiased bg-yellow-50`}>
        <AuthProvider>
          <VoiceProvider>
            <NavigationSounds>
              {children}
            </NavigationSounds>
            <Toaster
              position="top-center"
              toastOptions={{
                className: 'border-4 border-black font-black text-xl shadow-[4px_4px_0px_0px_#000]',
                style: {
                  padding: '16px',
                  color: '#000',
                },
                success: {
                  style: {
                    background: '#dcfce7', // Green-100
                    border: '3px solid #000',
                  },
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: 'white',
                  },
                },
                error: {
                  style: {
                    background: '#fee2e2', // Red-100
                    border: '3px solid #000',
                  },
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: 'white',
                  },
                },
              }}
            />
          </VoiceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
