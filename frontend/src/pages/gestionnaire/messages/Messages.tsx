"use client";

import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Mail,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  Clock,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Edit2,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Archive,
  Inbox,
  RefreshCw,
  CheckCheck,
  BarChart2,
  AlertTriangle,
  SortAsc,
} from "lucide-react";
import { useMessages } from "../../../hooks/useMessages";
import ConfirmationModal from "../../../components/shared/admin/ConfirMationModal";
import type { ContactResponseDto } from "../../../types/message.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateString: string | Date) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((today.getTime() - msgDate.getTime()) / 86_400_000);

  if (diff === 0)
    return `Aujourd'hui ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff === 1)
    return `Hier ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff < 7) return `Il y a ${diff} jours`;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusConfig(msg: ContactResponseDto) {
  if (msg.adminResponse)
    return {
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: CheckCircle,
      label: "Répondu",
      dot: "bg-emerald-500",
    };
  if (!msg.isRead)
    return {
      color: "bg-sky-100 text-sky-700 border-sky-200",
      icon: Mail,
      label: "Non lu",
      dot: "bg-sky-500",
    };
  return {
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
    label: "En attente",
    dot: "bg-amber-500",
  };
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-none">
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function ReplyModal({
  message,
  isResponding,
  onClose,
  onSubmit,
}: {
  message: ContactResponseDto;
  isResponding: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    setShowConfirm(false);
    await onSubmit(text);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay semi-transparent */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">
                  Répondre au message
                </h3>
                <p className="text-xs text-slate-500">
                  à{" "}
                  {message.fullName !== "Anonyme"
                    ? message.fullName
                    : message.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Message original */}
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Message original
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {message.message}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(message.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {message.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Réponse existante */}
            {message.adminResponse && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />{" "}
                  Réponse précédente
                </p>
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {message.adminResponse}
                  </p>
                  {message.respondedAt && (
                    <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                      <Send className="w-3 h-3" /> Envoyée le{" "}
                      {formatDate(message.respondedAt)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Zone de réponse */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                Votre réponse
              </label>
              <textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tapez votre réponse ici..."
                maxLength={2000}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none transition-shadow"
              />
              <div className="mt-1.5 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {text.length}/2000 caractères
                </span>
                {text.length > 1800 && (
                  <span className="text-xs text-amber-600 font-medium">
                    Limite proche
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              disabled={isResponding}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              disabled={!text.trim() || isResponding}
              onClick={() => setShowConfirm(true)}
              className="flex-1 px-4 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isResponding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      <ConfirmationModal
        open={showConfirm} // Changed from isOpen
        onCancel={() => setShowConfirm(false)} // Changed from onClose
        onConfirm={handleSubmit}
        title="Confirmer l'envoi"
        content={`Cette réponse sera envoyée par email à ${message.email}.`} // Changed from message
      />
    </>
  );
}

function MessageRow({
  message,
  onMarkRead,
  onDelete,
  onPermanentDelete,
  onReply,
  showDeleted = false,
}: {
  message: ContactResponseDto;
  onMarkRead: (isRead: boolean) => void;
  onDelete: () => void;
  onPermanentDelete: () => void;
  onReply: () => void;
  showDeleted?: boolean;
}) {
  const statusConfig = getStatusConfig(message);

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${statusConfig.dot}`}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 truncate">
              {message.fullName || "Anonyme"}
            </div>
            <div className="text-sm text-slate-500 truncate">
              {message.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="text-sm text-slate-600 line-clamp-2 max-w-xs">
          {message.message}
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
        >
          <statusConfig.icon className="w-3 h-3" />
          {statusConfig.label}
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="text-sm text-slate-500">
          {formatDate(message.createdAt)}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {!message.adminResponse && (
            <button
              onClick={onReply}
              title="Répondre"
              className="w-8 h-8 flex items-center justify-center text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onMarkRead(!message.isRead)}
            title={message.isRead ? "Marquer non lu" : "Marquer lu"}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {message.isRead ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
          {showDeleted ? (
            <button
              onClick={onPermanentDelete}
              title="Supprimer définitivement"
              className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onDelete}
              title="Supprimer"
              className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Messages() {

  const {
    messages,
    stats,
    unreadCount,
    selectedMessage,
    isLoading,
    error,
    pagination,
    filters,
    refresh,
    setFilter,
    resetFilters,
    setPage,
    selectMessage,
    respond,
    markAsRead,
    remove,
    removePermanent,
    markAllAsRead,
  } = useMessages();

  const [showStats, setShowStats] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<
    string | null
  >(null);
  const [isResponding, setIsResponding] = useState(false);

  const activeFiltersCount = [
    filters.isRead !== undefined,
    filters.isReplied !== undefined,
    filters.showDeleted,
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;

  const handleReply = useCallback(
    async (text: string) => {
      if (!selectedMessage) return;
      setIsResponding(true);
      try {
        await respond(selectedMessage.id, text);
      } finally {
        setIsResponding(false);
      }
    },
    [selectedMessage, respond],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget);
    setDeleteTarget(null);
  }, [deleteTarget, remove]);

  const handlePermanentDelete = useCallback(async () => {
    if (!permanentDeleteTarget) return;
    await removePermanent(permanentDeleteTarget);
    setPermanentDeleteTarget(null);
  }, [permanentDeleteTarget, removePermanent]);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  return (
    <>
      <Helmet>
        <title>Gestion Des Messages - Paname Consulting</title>
        <meta
          name="description"
          content="Gérez les messages de contact de Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen font-sans">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 leading-none">
                    Messages
                  </h1>
                  {unreadCount > 0 && (
                    <p className="text-xs text-sky-600 font-medium mt-0.5">
                      {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStats((s) => !s)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                    showStats
                      ? "bg-sky-100 text-sky-600"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button
                  onClick={refresh}
                  className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-xs font-medium transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Stats */}
          {showStats && stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Total"
                  value={stats.total}
                  icon={Inbox}
                  color="bg-slate-100 text-slate-600"
                />
                <StatCard
                  label="Non lus"
                  value={stats.unread}
                  icon={Mail}
                  color="bg-sky-100 text-sky-600"
                />
                <StatCard
                  label="En attente"
                  value={stats.pending}
                  icon={Clock}
                  color="bg-amber-100 text-amber-600"
                />
                <StatCard
                  label="Répondus"
                  value={stats.responded}
                  icon={CheckCircle}
                  color="bg-emerald-100 text-emerald-600"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-700">
                    Taux de réponse
                  </p>
                  <p className="text-sm font-bold text-sky-600">
                    {stats.responseRate}%
                  </p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-700"
                    style={{ width: `${stats.responseRate}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Filtres */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher nom, email, message…"
                  defaultValue={filters.search}
                  onChange={(e) => setFilter({ search: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Tous", isRead: undefined, isReplied: undefined },
                { label: "Non lus", isRead: false, isReplied: undefined },
                { label: "Sans réponse", isRead: undefined, isReplied: false },
                { label: "Répondus", isRead: undefined, isReplied: true },
              ].map((f) => {
                const isActive =
                  filters.isRead === f.isRead &&
                  filters.isReplied === f.isReplied;
                return (
                  <button
                    key={f.label}
                    onClick={() =>
                      setFilter({ isRead: f.isRead, isReplied: f.isReplied })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}

              <button
                onClick={() => setFilter({ showDeleted: !filters.showDeleted })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  filters.showDeleted
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Archive className="w-3 h-3" /> Corbeille
              </button>

              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Effacer ({activeFiltersCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
              <SortAsc className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs text-slate-400">Trier par</p>
              {(["createdAt", "email"] as const).map((col) => (
                <button
                  key={col}
                  onClick={() =>
                    setFilter({
                      sortBy: col,
                      sortOrder:
                        filters.sortBy === col && filters.sortOrder === "desc"
                          ? "asc"
                          : "desc",
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    filters.sortBy === col
                      ? "bg-sky-100 text-sky-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {col === "createdAt" ? "Date" : "Email"}
                  {filters.sortBy === col &&
                    (filters.sortOrder === "desc" ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUp className="w-3 h-3" />
                    ))}
                </button>
              ))}
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
              <button
                onClick={refresh}
                className="ml-auto text-red-600 underline text-xs"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">
                  Chargement des messages…
                </p>
              </div>
            ) : !messages || messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center">
                  <Inbox className="w-8 h-8 text-sky-400" />
                </div>
                <p className="text-base font-medium text-slate-700">
                  Aucun message
                </p>
                <p className="text-sm text-slate-400 text-center max-w-xs">
                  {filters.showDeleted
                    ? "La corbeille est vide"
                    : filters.isRead === false
                      ? "Aucun message non lu"
                      : filters.isReplied === false
                        ? "Tous les messages ont une réponse"
                        : "Aucun message pour le moment"}
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="mt-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-xl text-sm font-medium hover:bg-sky-100 transition-colors"
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Expéditeur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                        Date
                      </th>
                      <th className="px-4 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <MessageRow
                        key={msg.id}
                        message={msg}
                        onMarkRead={(isRead) => markAsRead(msg.id, isRead)}
                        onDelete={() => setDeleteTarget(msg.id)}
                        onPermanentDelete={() =>
                          setPermanentDeleteTarget(msg.id)
                        }
                        onReply={() => selectMessage(msg)}
                        showDeleted={filters.showDeleted}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.page}
                </span>{" "}
                sur{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.totalPages}
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.total}
                </span>{" "}
                résultats
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage || isLoading}
                  className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-600 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={!pagination.hasNextPage || isLoading}
                  className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-600 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {selectedMessage && (
          <ReplyModal
            message={selectedMessage}
            isResponding={isResponding}
            onClose={() => selectMessage(null)}
            onSubmit={handleReply}
          />
        )}

        <ConfirmationModal
          open={!!deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Supprimer ce message ?"
          content="Cette action enverra le message dans la corbeille. Vous pourrez le restaurer ultérieurement."
        />

        <ConfirmationModal
          open={!!permanentDeleteTarget}
          onCancel={() => setPermanentDeleteTarget(null)}
          onConfirm={handlePermanentDelete}
          title="Supprimer définitivement ce message ?"
          content=" Attention : Cette action est irréversible. Le message sera définitivement supprimé et ne pourra pas être récupéré."
        />
      </div>
    </>
  );
}
