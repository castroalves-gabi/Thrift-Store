create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  brand text not null default '',
  audience text not null check (audience in ('feminino', 'masculino', 'infantil', 'unissex')),
  category text not null,
  size text not null,
  measurements text not null default '',
  condition text not null check (condition in ('novo', 'otimo', 'bom', 'marcas-de-uso')),
  condition_details text not null default '',
  price_cents integer not null check (price_cents > 0),
  stock integer not null default 0 check (stock >= 0),
  weight_kg numeric(8, 3) not null check (weight_kg > 0),
  length_cm numeric(8, 2) not null check (length_cm > 0),
  width_cm numeric(8, 2) not null check (width_cm > 0),
  height_cm numeric(8, 2) not null check (height_cm > 0),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_public_catalog_idx
  on public.products (audience, category, active)
  where active and stock > 0;

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0),
  min_subtotal_cents integer not null default 0 check (min_subtotal_cents >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemptions integer not null default 0 check (redemptions >= 0),
  reserved_redemptions integer not null default 0 check (reserved_redemptions >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 10000)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  public_token_hash text not null unique,
  fulfillment_method text not null check (fulfillment_method in ('shipping', 'pickup', 'local_delivery')),
  postal_code text,
  shipping_address jsonb not null default '{}'::jsonb,
  shipping_service jsonb,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  local_delivery_pending boolean not null default false,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'rejected', 'expired', 'refunded')),
  fulfillment_status text not null default 'awaiting_payment'
    check (fulfillment_status in ('awaiting_payment', 'awaiting_delivery_quote', 'awaiting_shipment', 'ready_for_pickup', 'in_transit', 'delivered', 'cancelled')),
  coupon_id uuid references public.coupons (id),
  inventory_reserved_until timestamptz not null default (now() + interval '20 minutes'),
  mp_preference_id text,
  mp_init_point text,
  mp_payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_slug text not null,
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity > 0)
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.looks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null default '',
  image_path text,
  product_ids uuid[] not null default '{}',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

create trigger orders_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

create function public.release_expired_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_order record;
  released_count integer := 0;
begin
  for expired_order in
    select id, coupon_id
    from public.orders
    where payment_status = 'pending'
      and inventory_reserved_until < now()
    for update skip locked
  loop
    update public.products p
    set stock = p.stock + i.quantity
    from public.order_items i
    where i.order_id = expired_order.id and p.id = i.product_id;

    if expired_order.coupon_id is not null then
      update public.coupons
      set reserved_redemptions = greatest(0, reserved_redemptions - 1)
      where id = expired_order.coupon_id;
    end if;

    update public.orders
    set payment_status = 'expired', fulfillment_status = 'cancelled'
    where id = expired_order.id;
    released_count := released_count + 1;
  end loop;
  return released_count;
end;
$$;

create function public.create_pending_order(
  p_idempotency_key text,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_public_token_hash text,
  p_fulfillment_method text,
  p_postal_code text,
  p_shipping_address jsonb,
  p_shipping_service jsonb,
  p_shipping_cents integer,
  p_local_delivery_pending boolean,
  p_coupon_code text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order public.orders%rowtype;
  current_product public.products%rowtype;
  current_coupon public.coupons%rowtype;
  order_id uuid;
  item jsonb;
  item_quantity integer;
  subtotal integer := 0;
  discount integer := 0;
  total integer;
  reserved_coupon_id uuid;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 16 then
    raise exception 'Chave de idempotência inválida';
  end if;

  perform public.release_expired_orders();

  select * into existing_order
  from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if existing_order.public_token_hash <> p_public_token_hash then
      raise exception 'Chave de idempotência já utilizada';
    end if;
    return jsonb_build_object(
      'id', existing_order.id,
      'total_cents', existing_order.total_cents,
      'buyer_email', existing_order.buyer_email,
      'payment_status', existing_order.payment_status,
      'mp_preference_id', existing_order.mp_preference_id,
      'mp_init_point', existing_order.mp_init_point,
      'local_delivery_pending', existing_order.local_delivery_pending
    );
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'O pedido não possui itens';
  end if;
  if p_fulfillment_method not in ('shipping', 'pickup', 'local_delivery') then
    raise exception 'Forma de entrega inválida';
  end if;
  if p_shipping_cents < 0 or (p_fulfillment_method <> 'shipping' and p_shipping_cents <> 0) then
    raise exception 'Valor de frete inválido';
  end if;

  order_id := gen_random_uuid();
  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item->>'quantity')::integer;
    if item_quantity <= 0 then
      raise exception 'Quantidade inválida';
    end if;

    select * into current_product
    from public.products
    where id = (item->>'id')::uuid and active
    for update;
    if not found or current_product.stock < item_quantity then
      raise exception 'Uma peça ficou indisponível. Atualize o carrinho.';
    end if;

    update public.products set stock = stock - item_quantity where id = current_product.id;
    subtotal := subtotal + current_product.price_cents * item_quantity;
  end loop;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into current_coupon
    from public.coupons
    where code = upper(trim(p_coupon_code))
      and active
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at > now())
    for update;
    if not found
      or subtotal < current_coupon.min_subtotal_cents
      or (
        current_coupon.max_redemptions is not null
        and current_coupon.redemptions + current_coupon.reserved_redemptions >= current_coupon.max_redemptions
      )
    then
      raise exception 'Cupom inválido ou indisponível';
    end if;

    discount := case
      when current_coupon.kind = 'percent'
        then floor(subtotal * current_coupon.value / 10000.0)::integer
      else least(current_coupon.value, subtotal)
    end;
    reserved_coupon_id := current_coupon.id;
    update public.coupons
    set reserved_redemptions = reserved_redemptions + 1
    where id = current_coupon.id;
  end if;

  total := subtotal - discount + p_shipping_cents;
  insert into public.orders (
    id, idempotency_key, buyer_name, buyer_email, buyer_phone, public_token_hash,
    fulfillment_method, postal_code, shipping_address, shipping_service, subtotal_cents,
    shipping_cents, discount_cents, total_cents, local_delivery_pending,
    coupon_id
  ) values (
    order_id, p_idempotency_key, trim(p_buyer_name), lower(trim(p_buyer_email)),
    regexp_replace(p_buyer_phone, '\D', '', 'g'), p_public_token_hash, p_fulfillment_method,
    p_postal_code, coalesce(p_shipping_address, '{}'::jsonb), p_shipping_service,
    subtotal, p_shipping_cents, discount,
    total, p_local_delivery_pending, reserved_coupon_id
  );

  for item in select value from jsonb_array_elements(p_items)
  loop
    select * into current_product
    from public.products
    where id = (item->>'id')::uuid;
    insert into public.order_items (
      order_id, product_id, product_name, product_slug, unit_price_cents, quantity
    ) values (
      order_id, current_product.id, current_product.name, current_product.slug,
      current_product.price_cents, (item->>'quantity')::integer
    );
  end loop;

  return jsonb_build_object(
    'id', order_id,
    'subtotal_cents', subtotal,
    'shipping_cents', p_shipping_cents,
    'discount_cents', discount,
    'total_cents', total,
    'buyer_email', lower(trim(p_buyer_email)),
    'payment_status', 'pending',
    'local_delivery_pending', p_local_delivery_pending
  );
end;
$$;

create function public.cancel_pending_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
begin
  select * into current_order from public.orders where id = p_order_id for update;
  if not found or current_order.payment_status <> 'pending' then
    return false;
  end if;

  update public.products p
  set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = current_order.id and p.id = i.product_id;
  if current_order.coupon_id is not null then
    update public.coupons
    set reserved_redemptions = greatest(0, reserved_redemptions - 1)
    where id = current_order.coupon_id;
  end if;
  update public.orders
  set payment_status = 'rejected', fulfillment_status = 'cancelled'
  where id = current_order.id;
  return true;
end;
$$;

create function public.confirm_paid_order(
  p_order_id uuid,
  p_payment_id text,
  p_amount_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
begin
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then
    return false;
  end if;
  if current_order.payment_status = 'paid' then
    return current_order.mp_payment_id = p_payment_id;
  end if;
  if current_order.payment_status <> 'pending'
    or current_order.total_cents <> p_amount_cents
    or current_order.inventory_reserved_until < now()
  then
    return false;
  end if;

  update public.orders
  set payment_status = 'paid',
      fulfillment_status = case
        when local_delivery_pending then 'awaiting_delivery_quote'
        when fulfillment_method = 'pickup' then 'ready_for_pickup'
        else 'awaiting_shipment'
      end,
      mp_payment_id = p_payment_id
  where id = current_order.id;

  if current_order.coupon_id is not null then
    update public.coupons
    set reserved_redemptions = greatest(0, reserved_redemptions - 1),
        redemptions = redemptions + 1
    where id = current_order.coupon_id;
  end if;
  return true;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.looks enable row level security;

create policy "Profiles are readable by their owner" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "Admins manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can read available products" on public.products
  for select using (active and stock > 0);
create policy "Admins manage products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage coupons" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins read orders" on public.orders
  for select using (public.is_admin());
create policy "Admins read order items" on public.order_items
  for select using (public.is_admin());
create policy "Admins manage site settings" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can read active looks" on public.looks
  for select using (active);
create policy "Admins manage looks" on public.looks
  for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'product-images';

create policy "Public can read product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Admins can upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins can update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins can delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

revoke all on function public.release_expired_orders() from public, anon, authenticated;
revoke all on function public.create_pending_order(text,text,text,text,text,text,text,jsonb,jsonb,integer,boolean,text,jsonb) from public, anon, authenticated;
revoke all on function public.cancel_pending_order(uuid) from public, anon, authenticated;
revoke all on function public.confirm_paid_order(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.release_expired_orders() to service_role;
grant execute on function public.create_pending_order(text,text,text,text,text,text,text,jsonb,jsonb,integer,boolean,text,jsonb) to service_role;
grant execute on function public.cancel_pending_order(uuid) to service_role;
grant execute on function public.confirm_paid_order(uuid,text,integer) to service_role;
