import { useState } from "react";
import { MessageData, UserData } from "../types";
import { fetchWithPrefix } from "../utils/api";

type ReportType = "spam" | "violent" | "other";
type BaseReport = "chat" | "conversation";

type Reportable = MessageData | UserData;

interface ReportModalProps {
  reporterId: number | null,
  resourceId: number | null,
  baseReport: BaseReport,
  reportItem: Reportable | null;
  onClose: (msg?: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ reporterId, resourceId, baseReport, reportItem, onClose }) => {
  const [reportType, setReportType] = useState<ReportType>("spam");
  const [message, setMessage] = useState("");

  if (!reportItem) return null;

  // discriminazione semplice
  const isMessage = (item: Reportable): item is MessageData =>
    (item as MessageData).message !== undefined;

  const handleSubmit = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;


    let text_response: string = ''

    try {

      if (isMessage(reportItem)) {
        // invio report messaggio
        const response_json = await fetchWithPrefix(`/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reporter_id: reporterId,
            reported_user_id: reportItem.user_id,
            type: reportType,
            message: reportItem.message,
            description: message || null,
            token,
            resource_id: resourceId,
            baseReport,
          }),
        });
        text_response = response_json.message
      } else {
        // invio report utente
        const response_json = await fetchWithPrefix(`/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reporter_id: reporterId,
            reported_user_id: reportItem.id,
            type: reportType,
            description: message || null,
            token,
          }),
        });
        text_response = response_json.message
      }
    } catch (err) {
      console.error(err);
    }

    setReportType("spam")
    setMessage("")
    onClose(text_response);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20" onClick={() => onClose()}>
      <div className="bg-white p-6 rounded-lg shadow-lg w-96" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">
          Report {isMessage(reportItem) ? "message" : `user: ${reportItem.nickname}`}
        </h2>
        {/* Tipo di report */}
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          className="w-full px-3 py-2 border rounded-md mb-4"
        >
          <option value="spam">Spam</option>
          <option value="porn">Porn</option>
          <option value="violent">Violent</option>
          <option value="altro">Other</option>
        </select>
        {/* Messaggio opzionale */}
        <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a description (optional)"
            rows={3}
            className="w-full px-3 py-2 border rounded-md mb-4"
          />
        <div className="flex justify-end gap-2">
          <button onClick={() => onClose()} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
          <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded-md">Send</button>
        </div>
      </div>
    </div>
  );
};