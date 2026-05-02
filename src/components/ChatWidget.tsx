import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon, Loader2, MessageCircle, Send, X, Reply } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { markOrderMessagesRead } from '../lib/chat';
import { uploadChatImage } from '../lib/filebase';

interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface ChatWidgetProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onReadChange?: () => void;
}

export default function ChatWidget({ orderId, isOpen, onClose, onReadChange }: ChatWidgetProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onReadChangeRef = useRef(onReadChange);

  useEffect(() => {
    onReadChangeRef.current = onReadChange;
  }, [onReadChange]);

  const isAtBottom = () => {
    if (!messagesContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  };

  const parseMessageText = (rawText: string) => {
    if (rawText.includes('|||REPLY_CTX|||')) {
      const parts = rawText.split('|||REPLY_CTX|||');
      try {
        const ctx = JSON.parse(parts[0]);
        return { replyCtx: ctx, text: parts.slice(1).join('|||REPLY_CTX|||').trim() };
      } catch (e) {
        return { replyCtx: null, text: rawText };
      }
    }
    return { replyCtx: null, text: rawText };
  };

  useEffect(() => {
    if (!isOpen || !orderId) return;

    fetchMessages();

    // Gunakan Supabase Realtime (WebSocket) untuk chat yang instan
    const channel = supabase
      .channel(`chat_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const wasAtBottom = isAtBottom();
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          if (wasAtBottom) {
            setTimeout(scrollToBottom, 100);
          }

          // Tandai sudah dibaca jika pengirimnya bukan kita
          if (user && newMessage.sender_id !== user.id) {
            markOrderMessagesRead(orderId, user.id).then(() => {
              onReadChangeRef.current?.();
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, orderId, user]);



  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
      if (user) {
        await markOrderMessagesRead(orderId, user.id);
        onReadChangeRef.current?.();
      }
    }
    setLoading(false);
  };

  const clearSelectedImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = (file: File | undefined) => {
    setError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 5 MB.');
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const sendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if ((!trimmedMessage && !selectedImage) || !user) return;

    setSending(true);
    setError('');
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentName: string | null = null;

      if (selectedImage) {
        attachmentUrl = await uploadChatImage(selectedImage, orderId);
        attachmentType = selectedImage.type;
        attachmentName = selectedImage.name;
      }

      let finalMessage = trimmedMessage || (selectedImage ? 'Bukti pembayaran' : '');
      if (replyTo) {
        const ctx = {
          sender: replyTo.sender_name,
          text: parseMessageText(replyTo.message).text.substring(0, 60)
        };
        finalMessage = JSON.stringify(ctx) + '|||REPLY_CTX|||' + finalMessage;
      }

      const { error: sendError } = await supabase.from('order_messages').insert([{
        order_id: orderId,
        sender_id: user.id,
        sender_name: user.name || user.email,
        sender_role: user.role,
        message: finalMessage,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        attachment_name: attachmentName,
      }]);

      if (sendError) throw sendError;

      setNewMessage('');
      clearSelectedImage();
      setReplyTo(null);
      await fetchMessages();
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesan.');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hari ini';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  // Group messages by date
  const messagesByDate: { [key: string]: ChatMessage[] } = {};
  messages.forEach(msg => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!messagesByDate[dateKey]) messagesByDate[dateKey] = [];
    messagesByDate[dateKey].push(msg);
  });

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ width: '100vw', height: '100dvh' }} onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md h-[80vh] sm:h-[70vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-padang-600 to-spice-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Chat Pesanan</h3>
              <p className="text-white/70 text-xs">{messages.length} pesan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-gradient-to-b from-padang-50/50 to-white">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-padang-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 bg-padang-100 rounded-2xl flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-padang-300" />
              </div>
              <p className="text-padang-500 font-medium text-sm">Belum ada pesan</p>
              <p className="text-padang-400 text-xs mt-1">Mulai percakapan untuk pesanan ini</p>
            </div>
          ) : (
            Object.entries(messagesByDate).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="flex items-center justify-center my-3">
                  <span className="bg-padang-100 text-padang-600 text-xs font-medium px-3 py-1 rounded-full">
                    {formatDate(msgs[0].created_at)}
                  </span>
                </div>
                {msgs.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isMe ? 'order-2' : ''}`}>
                        {!isMe && (
                          <p className="text-xs text-padang-500 font-semibold mb-0.5 ml-1">
                            {msg.sender_name} {msg.sender_role !== 'pelanggan' && (
                              <span className="text-padang-400">• Toko</span>
                            )}
                          </p>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isMe
                            ? 'bg-gradient-to-r from-padang-600 to-padang-700 text-white rounded-br-md'
                            : 'bg-white text-padang-900 border border-padang-100 shadow-sm rounded-bl-md'
                        }`}>
                          {msg.attachment_url && msg.attachment_type?.startsWith('image/') && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: msg.attachment_url!, name: msg.attachment_name || 'Bukti pembayaran' })}
                              className="block mb-2 overflow-hidden rounded-xl border border-white/20 bg-black/5"
                              title={msg.attachment_name || 'Bukti pembayaran'}
                            >
                              <img
                                src={msg.attachment_url}
                                alt={msg.attachment_name || 'Bukti pembayaran'}
                                className="max-h-56 w-full object-cover"
                                loading="lazy"
                              />
                            </button>
                          )}
                          {/* Reply Context */}
                          {parseMessageText(msg.message).replyCtx && (
                            <div className={`mb-2 pl-3 py-1.5 border-l-4 text-xs rounded-r-lg ${isMe ? 'bg-black/10 border-white/40' : 'bg-padang-50 border-padang-300'}`}>
                              <p className="font-bold opacity-80">{parseMessageText(msg.message).replyCtx.sender}</p>
                              <p className="opacity-70 line-clamp-2">{parseMessageText(msg.message).replyCtx.text}</p>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{parseMessageText(msg.message).text}</p>
                          <div className={`flex items-center justify-end gap-2 mt-1 ${isMe ? 'text-white/60' : 'text-padang-400'}`}>
                            <p className="text-xs">
                              {formatTime(msg.created_at)}
                            </p>
                            <button onClick={() => setReplyTo(msg)} className="hover:text-padang-600 transition-colors" title="Balas">
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-padang-100 p-3 bg-white flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-start justify-between bg-padang-50 border border-padang-200 p-2 rounded-xl text-sm">
              <div className="min-w-0 flex-1 pl-2 border-l-2 border-padang-400">
                <p className="font-bold text-padang-700 text-xs">{replyTo.sender_name}</p>
                <p className="text-padang-500 text-xs truncate">{parseMessageText(replyTo.message).text}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-padang-200 rounded-lg text-padang-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {imagePreviewUrl && (
            <div className="mb-3 rounded-xl border border-padang-100 bg-padang-50 p-2">
              <div className="flex items-start gap-3">
                <img src={imagePreviewUrl} alt="Preview Foto" className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-padang-800 truncate">{selectedImage?.name}</p>
                  <p className="text-[11px] text-padang-500 mt-0.5">Foto siap dikirim</p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  className="p-1.5 text-padang-500 hover:text-spice-600 hover:bg-white rounded-lg transition-colors"
                  title="Hapus gambar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="mb-2 text-xs text-spice-600">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageSelect(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="w-10 h-10 bg-padang-100 text-padang-700 rounded-xl flex items-center justify-center hover:bg-padang-200 transition-all disabled:opacity-50"
              title="Kirim gambar"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              className="flex-1 px-4 py-2.5 bg-white text-padang-900 placeholder:text-padang-400 border border-padang-200 rounded-xl text-sm focus:ring-2 focus:ring-padang-500 focus:border-padang-500 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || sending}
              className="w-10 h-10 bg-gradient-to-r from-padang-600 to-spice-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-full w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-padang-800 shadow-lg hover:bg-padang-50"
              title="Tutup preview"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[80dvh] w-full object-contain bg-black"
              />
              <div className="px-4 py-3">
                <p className="truncate text-sm font-semibold text-padang-900">{previewImage.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
