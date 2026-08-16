import type { Metadata, Viewport } from "next";
import { getSchool, themeVars } from "@/lib/school";
import { getCurrentUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { LanguageProvider } from "@/lib/i18n/client";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const school = await getSchool();
  const name = school?.name ?? "School MIS";
  return {
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description:
      school?.motto ??
      "A modern GES-accredited school — crèche to senior high school. Results checker, admissions and more.",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.svg", type: "image/svg+xml" }],
      apple: "/icons/icon-192.png",
    },
    appleWebApp: { capable: true, statusBarStyle: "default", title: name },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const school = await getSchool();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: school?.primaryColor ?? "#047857",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const school = await getSchool();
  const vars = themeVars(school);
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: vars }} />
        {/* Apply the saved UI theme before first paint so reloads don't flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ui-theme');if(t==='dark'||t==='gold'||t==='ocean'||t==='royal')document.documentElement.setAttribute('data-ui-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <LanguageProvider>
          <ToastProvider>
            <SiteNavbar school={school} />
            <main>{children}</main>
            <SiteFooter school={school} isDeveloper={user?.role.name === "developer"} />
            <ChatWidget school={school} />
            <PwaRegister />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
