import { supabase } from './supabase';

const PRODUCT_IMAGES_BUCKET = 'product-images';
const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';

/**
 * Upload a product image to Supabase Storage
 * @returns Public URL of the uploaded image
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${productId}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
        });

    if (error) {
        // If bucket doesn't exist, give a helpful message
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
            throw new Error(
                'Storage bucket "product-images" belum dibuat. Silakan buat bucket di Supabase Dashboard > Storage, atau jalankan SQL setup.'
            );
        }
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

/**
 * Upload an image attachment for order chat/payment proof.
 * @returns Public URL of the uploaded image
 */
export async function uploadChatImage(file: File, orderId: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const filePath = `orders/${orderId}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

    const { data, error } = await supabase.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
        });

    if (error) {
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
            throw new Error(
                'Storage bucket "chat-attachments" belum dibuat. Jalankan setup storage chat di Supabase terlebih dahulu.'
            );
        }
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

/**
 * Delete a product image from Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
    try {
        const url = new URL(imageUrl);
        // Extract path after /object/public/product-images/
        const pathMatch = url.pathname.match(/\/object\/public\/product-images\/(.+)/);
        if (!pathMatch) {
            // Legacy Filebase URL or unknown format — skip deletion
            console.warn('Skipping delete for non-Supabase image URL:', imageUrl);
            return;
        }
        const filePath = decodeURIComponent(pathMatch[1]);

        const { error } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([filePath]);

        if (error) {
            console.error('Failed to delete image:', error);
        }
    } catch (err) {
        console.error('Failed to delete image:', err);
    }
}

/**
 * Upload a promo banner image to Supabase Storage
 */
export async function uploadBannerImage(file: File, bannerId: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `banners/${bannerId}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
        });

    if (error) {
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

/**
 * Delete a promo banner image from Supabase Storage
 */
export async function deleteBannerImage(imageUrl: string): Promise<void> {
    try {
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/object\/public\/product-images\/(.+)/);
        if (!pathMatch) return;
        
        const filePath = decodeURIComponent(pathMatch[1]);
        const { error } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([filePath]);

        if (error) console.error('Failed to delete banner image:', error);
    } catch (err) {
        console.error('Failed to delete banner image:', err);
    }
}
