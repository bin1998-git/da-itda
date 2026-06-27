alter table public.products
  add column if not exists weight        text,
  add column if not exists origin        text,
  add column if not exists storage_method text,
  add column if not exists expiry_info   text,
  add column if not exists allergen_info text;
