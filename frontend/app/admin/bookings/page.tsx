"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { api } from "@/lib/api";
import { BookingsTable, type BookingRow } from "@/components/BookingsTable";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const getToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const loadBookings = async () => {
    const token = await getToken();
    const list = (await api.bookings.list(token)) as BookingRow[];
    setBookings(list);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleStatusChange = async (id: string, status: BookingRow["status"]) => {
    const token = await getToken();
    await api.bookings.updateStatus(id, status, token);
    await loadBookings();
  };

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl">Bookings</h1>
      <BookingsTable bookings={bookings} onStatusChange={handleStatusChange} />
    </div>
  );
}
