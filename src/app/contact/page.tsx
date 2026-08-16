import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSchool } from "@/lib/school";
import { ContactForm } from "@/components/site/contact-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const school = await getSchool();
  const mapSrc = school?.mapLat && school?.mapLng
    ? `https://www.google.com/maps?q=${school.mapLat},${school.mapLng}&z=15&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(school?.locationName ?? "Kumasi, Ghana")}&z=14&output=embed`;

  return (
    <div>
      <section className="bg-slate-900 py-20 text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Get In Touch</p>
          <h1 className="mt-2 text-4xl font-bold">Contact Us</h1>
          <p className="mt-3 max-w-xl text-slate-300">We'd love to hear from you — questions, visits or feedback.</p>
        </div>
      </section>

      <section className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5">
          {[
            { icon: MapPin, title: "Address", lines: [school?.address, `${school?.district}, ${school?.region}`].filter(Boolean) as string[] },
            { icon: Phone, title: "Phone / WhatsApp", lines: [school?.phone].filter(Boolean) as string[] },
            { icon: Mail, title: "Email", lines: [school?.email].filter(Boolean) as string[] },
            { icon: Clock, title: "Office Hours", lines: ["Mon–Fri: 7:30 AM – 4:30 PM", "Sat: 9:00 AM – 12:00 PM"] },
          ].map((c) => (
            <div key={c.title} className="card flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <c.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{c.title}</h3>
                {c.lines.map((l) => (
                  <p key={l} className="mt-0.5 text-sm text-slate-500">{l}</p>
                ))}
              </div>
            </div>
          ))}
          <iframe
            title="School location map"
            src={mapSrc}
            className="h-64 w-full rounded-2xl border-0 shadow-card"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold text-ink">Send Us a Message</h2>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
