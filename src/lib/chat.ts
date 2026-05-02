import { supabase } from './supabase';

export interface UnreadChatSummary {
  id: string;
  order_id: string;
  sender_name: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

export async function getUnreadChatCounts(orderIds: string[], userId: string) {
  const counts: Record<string, number> = {};
  const latestByOrder: Record<string, UnreadChatSummary> = {};

  if (orderIds.length === 0) return { counts, latestByOrder };

  const { data: messages, error } = await supabase
    .from('order_messages')
    .select('id, order_id, sender_id, sender_name, message, attachment_url, created_at')
    .in('order_id', orderIds)
    .neq('sender_id', userId)
    .order('created_at', { ascending: true });

  if (error || !messages || messages.length === 0) return { counts, latestByOrder };

  const messageIds = messages.map((message) => message.id);
  const { data: reads } = await supabase
    .from('order_message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', messageIds);

  const readMessageIds = new Set((reads || []).map((read) => read.message_id));

  messages.forEach((message) => {
    if (readMessageIds.has(message.id)) return;
    counts[message.order_id] = (counts[message.order_id] || 0) + 1;
    latestByOrder[message.order_id] = {
      id: message.id,
      order_id: message.order_id,
      sender_name: message.sender_name,
      message: message.message,
      attachment_url: message.attachment_url,
      created_at: message.created_at,
    };
  });

  return { counts, latestByOrder };
}

export async function markOrderMessagesRead(orderId: string, userId: string) {
  const { data: messages, error } = await supabase
    .from('order_messages')
    .select('id')
    .eq('order_id', orderId)
    .neq('sender_id', userId);

  if (error || !messages || messages.length === 0) return;

  await supabase
    .from('order_message_reads')
    .upsert(
      messages.map((message) => ({
        message_id: message.id,
        user_id: userId,
      })),
      { onConflict: 'message_id,user_id' }
    );
}
