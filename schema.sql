CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    gender      TEXT    NOT NULL CHECK (gender IN ('Omni', 'Masculine', 'Feminine')),
    price       INTEGER NOT NULL CHECK (price > 0),
    size        TEXT    NOT NULL CHECK (size IN ('XS', 'S', 'M', 'L', 'XL', 'Unique')),
    color       TEXT    NOT NULL,
    popularity  INTEGER NOT NULL DEFAULT 50 CHECK (popularity BETWEEN 0 AND 100),
    image       TEXT    NOT NULL,
    tag         TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    ref            TEXT    NOT NULL UNIQUE,
    customer_name  TEXT,
    customer_email TEXT,
    total          INTEGER NOT NULL CHECK (total >= 0),
    status         TEXT    NOT NULL DEFAULT 'processed'
        CHECK (status IN ('processed', 'shipped', 'delivered', 'cancelled')),
    created_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    name       TEXT    NOT NULL,
    price      INTEGER NOT NULL,
    quantity   INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS rate_hits (
    bucket TEXT    NOT NULL,
    ip     TEXT    NOT NULL,
    ts     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_filter ON products(active, gender, price);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_items_order     ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_rate_hits       ON rate_hits(bucket, ip, ts);