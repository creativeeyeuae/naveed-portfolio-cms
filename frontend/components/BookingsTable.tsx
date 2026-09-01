"use client";

export interface BookingRow {
  id: string;
  clientName: string;
  email: string;
  serviceType?: string;
  eventDate?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

const statusColors: Record<BookingRow["status"], string> = {
  pending: "text-yellow-400",
  confirmed: "text-blue-400",
  completed: "text-green-400",
  cancelled: "text-red-400",
};

export function BookingsTable({
  bookings,
  onStatusChange,
}: {
  bookings: BookingRow[];
  onStatusChange: (id: string, status: BookingRow["status"]) => void;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-white/50">
        <tr>
          <th className="py-2">Client</th>
          <th className="py-2">Service</th>
          <th className="py-2">Event Date</th>
          <th className="py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => (
          <tr key={b.id} className="border-t border-white/10">
            <td className="py-3">
              <p>{b.clientName}</p>
              <p className="text-white/40">{b.email}</p>
            </td>
            <td className="py-3">{b.serviceType ?? "—"}</td>
            <td className="py-3">{b.eventDate ? new Date(b.eventDate).toLocaleDateString() : "—"}</td>
            <td className="py-3">
              <select
                value={b.status}
                onChange={(e) => onStatusChange(b.id, e.target.value as BookingRow["status"])}
                className={`rounded bg-white/5 px-2 py-1 ${statusColors[b.status]}`}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
