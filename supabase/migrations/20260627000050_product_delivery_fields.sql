alter table products
  add column if not exists delivery_type   text,
  add column if not exists packaging_type  text,
  add column if not exists sales_unit      text;
