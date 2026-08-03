-- =======================================================
-- FIX DUPLICATE CARTS YANG BIKIN CHECKOUT MACET
-- Jalankan di Supabase SQL Editor.
-- =======================================================
--
-- Masalah:
--   getOrCreateCart() di lib/cart.ts cek dulu "carts" milik user, baru insert
--   kalau belum ada. Kalau dua request datang hampir bersamaan (mis. badge
--   cart di header dan halaman /cart sama-sama mount), keduanya bisa gagal
--   menemukan cart yang sudah ada lalu sama-sama INSERT -- dan karena tabel
--   `carts` tidak punya constraint UNIQUE di user_id, keduanya lolos begitu
--   saja. Kode retry-nya (isUniqueViolation di getOrCreateCart) sebenarnya
--   sudah mengasumsikan constraint ini ada, tapi constraint-nya memang belum
--   pernah dibuat di schema.
--
--   Akibatnya sebagian user punya lebih dari satu baris di `carts`. Query di
--   lib/shipping-cart.ts (dipakai /api/shipping/rates dan /api/orders/create)
--   sebelumnya pakai .maybeSingle() tanpa order/limit -- begitu ada 2 baris,
--   Supabase menolak dengan error, error itu diabaikan, dan cart-nya kebaca
--   sebagai "kosong". Efeknya: ongkir gagal dihitung ("Cart is empty") dan
--   tombol checkout macet permanen, padahal keranjang user jelas-jelas ada
--   isinya. Sisi kode sudah diperbaiki (loadCartLines sekarang ambil cart
--   terbaru per user, sama seperti getOrCreateCart) -- fix di bawah ini
--   membereskan data yang sudah kadung dobel dan mencegahnya terulang.
--
-- Perbaikan di bawah: gabungkan cart_items dari cart duplikat ke cart yang
-- paling baru per user, hapus cart duplikatnya, lalu pasang constraint UNIQUE
-- supaya baris dobel tidak bisa terbentuk lagi.
-- =======================================================

BEGIN;

-- Step 1: pindahkan cart_items dari cart lama ke cart terbaru milik user yang
-- sama, lewati item yang sudah ada di cart terbaru (produk+size+color sama)
-- supaya tidak bentrok dengan UNIQUE(cart_id, product_id, size, color).
WITH ranked_carts AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM carts
),
keep_cart AS (
  SELECT user_id, id AS keep_id FROM ranked_carts WHERE rn = 1
),
dup_carts AS (
  SELECT id AS dup_id, user_id FROM ranked_carts WHERE rn > 1
)
UPDATE cart_items ci
SET cart_id = kc.keep_id
FROM dup_carts dc
JOIN keep_cart kc ON kc.user_id = dc.user_id
WHERE ci.cart_id = dc.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM cart_items existing
    WHERE existing.cart_id = kc.keep_id
      AND existing.product_id = ci.product_id
      AND existing.size IS NOT DISTINCT FROM ci.size
      AND existing.color IS NOT DISTINCT FROM ci.color
  );

-- Step 2: hapus cart duplikat (cascade otomatis membuang cart_items sisa yang
-- tadi dilewati di step 1 karena bentrok).
WITH ranked_carts AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM carts
)
DELETE FROM carts WHERE id IN (SELECT id FROM ranked_carts WHERE rn > 1);

-- Step 3: cegah duplikat terbentuk lagi.
ALTER TABLE carts ADD CONSTRAINT carts_user_id_unique UNIQUE (user_id);

COMMIT;

-- =======================================================
-- VERIFIKASI
-- =======================================================

-- Harus mengembalikan 0 baris.
SELECT user_id, COUNT(*) AS jumlah_cart
FROM carts
GROUP BY user_id
HAVING COUNT(*) > 1;
