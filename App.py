import hmac
import os
import re
import secrets
import time
from functools import wraps

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request, send_from_directory
from itsdangerous import BadSignature, URLSafeTimedSerializer

import db

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
SECRET_KEY = os.environ.get("SECRET_KEY", "")
if not ADMIN_PASSWORD or len(SECRET_KEY) < 16:
    raise SystemExit("Configure ADMIN_PASSWORD et SECRET_KEY (16 caractères minimum) dans le fichier .env")

app = Flask(__name__, static_folder="static", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 50_000
app.json.ensure_ascii = False
app.json.sort_keys = False
app.teardown_appcontext(db.close_db)
signer = URLSafeTimedSerializer(SECRET_KEY, salt="lumiere-admin")
db.init_db()

GENDERS = {"Omni", "Masculine", "Feminine"}
SIZES = {"XS", "S", "M", "L", "XL", "Unique"}
STATUSES = {"processed", "shipped", "delivered", "cancelled"}
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
URL_RE = re.compile(r"^(https://|/)[^\s\"'<>]{1,300}$")
REF_RE = re.compile(r"^LUM-[A-F0-9]{8}$")
BAD_TEXT_RE = re.compile(r"[<>\"`]")

PRODUCT_COLUMNS = "id, name, category, gender, price, size, color, popularity, image, tag, description"


@app.after_request
def secure_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    resp.headers["Referrer-Policy"] = "same-origin"
    return resp


def err(message, code=400):
    return jsonify(error=message), code


def clean(value, maximum):
    return value.strip()[:maximum] if isinstance(value, str) else ""


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def is_int(value):
    return type(value) is int


def rate_limit(bucket, maximum, window):
    conn = db.get_db()
    ip = request.remote_addr or "0"
    now = int(time.time())
    conn.execute("DELETE FROM rate_hits WHERE ts < ?", (now - 3600,))
    hits = conn.execute(
        "SELECT COUNT(*) FROM rate_hits WHERE bucket = ? AND ip = ? AND ts > ?",
        (bucket, ip, now - window),
    ).fetchone()[0]
    if hits >= maximum:
        return err("Trop de requêtes, réessaie plus tard.", 429)
    conn.execute("INSERT INTO rate_hits (bucket, ip, ts) VALUES (?, ?, ?)", (bucket, ip, now))
    return None


def admin_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return err("Non autorisé", 401)
        try:
            signer.loads(header[7:], max_age=8 * 3600)
        except BadSignature:
            return err("Non autorisé", 401)
        return view(*args, **kwargs)

    return wrapper


@app.get("/")
def home():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/api/products")
def list_products():
    rows = db.get_db().execute(
        f"SELECT {PRODUCT_COLUMNS} FROM products WHERE active = 1 ORDER BY id"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/products/<int:product_id>")
def get_product(product_id):
    row = db.get_db().execute(
        f"SELECT {PRODUCT_COLUMNS} FROM products WHERE id = ? AND active = 1", (product_id,)
    ).fetchone()
    return jsonify(dict(row)) if row else err("Produit introuvable", 404)


@app.post("/api/orders")
def create_order():
    limited = rate_limit("orders", 10, 900)
    if limited:
        return limited

    data = body()
    items = data.get("items")
    if not isinstance(items, list) or not items or len(items) > 50:
        return err("Panier vide ou invalide.")

    customer = data.get("customer") if isinstance(data.get("customer"), dict) else {}
    name = clean(customer.get("name"), 80) or None
    email = clean(customer.get("email"), 120).lower() or None
    if name and BAD_TEXT_RE.search(name):
        return err("Nom invalide.")
    if email and not EMAIL_RE.match(email):
        return err("Email invalide.")

    wanted = {}
    for item in items:
        if not isinstance(item, dict) or not is_int(item.get("id")) or not is_int(item.get("quantity")):
            return err("Article invalide.")
        if not 1 <= item["quantity"] <= 20:
            return err("Quantité invalide.")
        wanted[item["id"]] = wanted.get(item["id"], 0) + item["quantity"]
    if any(q > 20 for q in wanted.values()):
        return err("Quantité invalide.")

    conn = db.get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        lines = []
        total = 0
        for product_id, quantity in wanted.items():
            product = conn.execute(
                "SELECT id, name, price FROM products WHERE id = ? AND active = 1", (product_id,)
            ).fetchone()
            if not product:
                raise ValueError("Produit introuvable.")
            total += product["price"] * quantity
            lines.append((product, quantity))

        ref = "LUM-" + secrets.token_hex(4).upper()
        cur = conn.execute(
            "INSERT INTO orders (ref, customer_name, customer_email, total) VALUES (?, ?, ?, ?)",
            (ref, name, email, total),
        )
        conn.executemany(
            "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
            [(cur.lastrowid, p["id"], p["name"], p["price"], q) for p, q in lines],
        )
        conn.execute("COMMIT")
    except ValueError as exc:
        conn.execute("ROLLBACK")
        return err(str(exc))
    except Exception:
        conn.execute("ROLLBACK")
        raise

    return jsonify(ref=ref, total=total, status="processed"), 201


@app.get("/api/orders/<ref>")
def order_status(ref):
    if not REF_RE.match(ref):
        return err("Commande introuvable", 404)
    row = db.get_db().execute(
        "SELECT ref, status, total, created_at FROM orders WHERE ref = ?", (ref,)
    ).fetchone()
    return jsonify(dict(row)) if row else err("Commande introuvable", 404)


@app.post("/api/admin/login")
def admin_login():
    limited = rate_limit("login", 5, 900)
    if limited:
        return limited
    password = body().get("password")
    if not isinstance(password, str) or not hmac.compare_digest(
        password.encode("utf-8"), ADMIN_PASSWORD.encode("utf-8")
    ):
        return err("Mot de passe incorrect.", 401)
    return jsonify(token=signer.dumps({"role": "admin"}))


@app.get("/api/admin/orders")
@admin_required
def admin_orders():
    conn = db.get_db()
    orders = [dict(r) for r in conn.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 200")]
    for order in orders:
        order["items"] = [
            dict(r) for r in conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order["id"],))
        ]
    return jsonify(orders)


@app.patch("/api/admin/orders/<ref>/status")
@admin_required
def admin_order_status(ref):
    status = body().get("status")
    if status not in STATUSES or not REF_RE.match(ref):
        return err("Statut invalide.")
    updated = db.get_db().execute("UPDATE orders SET status = ? WHERE ref = ?", (status, ref))
    return jsonify(ok=True) if updated.rowcount else err("Commande introuvable", 404)


def parse_product(data):
    fields = {}
    for key, maximum in (("name", 100), ("category", 40), ("color", 40), ("tag", 40), ("description", 300)):
        value = clean(data.get(key), maximum)
        if BAD_TEXT_RE.search(value):
            return None, f"Champ « {key} » invalide."
        fields[key] = value
    if not fields["name"] or not fields["category"] or not fields["color"]:
        return None, "Nom, catégorie et couleur requis."
    if data.get("gender") not in GENDERS:
        return None, "Genre invalide."
    if data.get("size") not in SIZES:
        return None, "Taille invalide."
    price, popularity = data.get("price"), data.get("popularity", 50)
    if not is_int(price) or not 1 <= price <= 100000:
        return None, "Prix invalide."
    if not is_int(popularity) or not 0 <= popularity <= 100:
        return None, "Popularité invalide."
    image = data.get("image")
    if not isinstance(image, str) or not URL_RE.match(image):
        return None, "Image invalide (https://… ou /chemin)."
    fields.update(gender=data["gender"], size=data["size"], price=price, popularity=popularity, image=image)
    return fields, None


@app.post("/api/admin/products")
@admin_required
def admin_create_product():
    product, problem = parse_product(body())
    if problem:
        return err(problem)
    cur = db.get_db().execute(
        "INSERT INTO products (name, category, gender, price, size, color, popularity, image, tag, description) "
        "VALUES (:name, :category, :gender, :price, :size, :color, :popularity, :image, :tag, :description)",
        product,
    )
    return jsonify(id=cur.lastrowid), 201


@app.put("/api/admin/products/<int:product_id>")
@admin_required
def admin_update_product(product_id):
    product, problem = parse_product(body())
    if problem:
        return err(problem)
    updated = db.get_db().execute(
        "UPDATE products SET name = :name, category = :category, gender = :gender, price = :price, "
        "size = :size, color = :color, popularity = :popularity, image = :image, tag = :tag, "
        "description = :description WHERE id = :id",
        {**product, "id": product_id},
    )
    return jsonify(ok=True) if updated.rowcount else err("Produit introuvable", 404)


@app.delete("/api/admin/products/<int:product_id>")
@admin_required
def admin_delete_product(product_id):
    updated = db.get_db().execute("UPDATE products SET active = 0 WHERE id = ?", (product_id,))
    return jsonify(ok=True) if updated.rowcount else err("Produit introuvable", 404)


@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith("/api/"):
        return err("Route inconnue", 404)
    return "Page introuvable", 404


@app.errorhandler(405)
def bad_method(_e):
    return err("Méthode non autorisée", 405)


@app.errorhandler(413)
def too_big(_e):
    return err("Requête trop volumineuse", 413)


@app.errorhandler(500)
def server_error(_e):
    return err("Erreur serveur", 500)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), debug=False)