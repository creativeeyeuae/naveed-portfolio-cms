"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useState } from "react";

const schema = z.object({
  clientName: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  serviceType: z.string().optional(),
  eventDate: z.string().optional(),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    await api.bookings.create(data);
    setSubmitted(true);
  };

  return (
    <section className="pt-28">
      <div className="mx-auto max-w-xl px-6 pb-20">
        <h1 className="mb-2 font-serif text-4xl">Get in Touch</h1>
        <p className="mb-8 text-white/70">
          Tell us about your project and we&apos;ll get back to you shortly. For
          anything urgent, reach us directly on{" "}
          <a href="https://wa.me/971581174911" className="text-gold">WhatsApp</a>.
        </p>

        {submitted ? (
          <p className="text-gold">Thanks — your message has been sent. We&apos;ll be in touch soon.</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input {...register("clientName")} placeholder="Full name" className="w-full rounded bg-white/5 px-4 py-3" />
            {errors.clientName && <p className="text-sm text-red-400">{errors.clientName.message}</p>}

            <input {...register("email")} placeholder="Email" className="w-full rounded bg-white/5 px-4 py-3" />
            {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}

            <input {...register("phone")} placeholder="Phone (optional)" className="w-full rounded bg-white/5 px-4 py-3" />
            <input {...register("serviceType")} placeholder="Service (e.g. Editorial Photography)" className="w-full rounded bg-white/5 px-4 py-3" />
            <input {...register("eventDate")} type="date" className="w-full rounded bg-white/5 px-4 py-3" />
            <textarea {...register("message")} placeholder="Tell us about your project" rows={5} className="w-full rounded bg-white/5 px-4 py-3" />

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-gold px-6 py-3 font-medium text-ink hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
