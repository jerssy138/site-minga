import os
import sqlite3

from flask import g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PRODUCTS = [
    {"id": 1, "name": "Veste Holographique Nexus", "category": "Extérieur", "gender": "Omni", "price": 480, "size": "M", "color": "Holographique", "popularity": 98, "image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80", "tag": "Bestseller 2026", "description": "Veste à fibres optiques réactives changeant de spectre lumineux selon les mouvements."},
    {"id": 2, "name": "Tunique Cyber-Minimaliste", "category": "Haute Couture", "gender": "Feminine", "price": 290, "size": "S", "color": "Noir Onyx", "popularity": 88, "image": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80", "tag": "Édition Limitée", "description": "Coupe asymétrique en nanotextile respirant, conçue pour l'urbain moderne."},
    {"id": 3, "name": "Pantalon Spatial En Titane", "category": "Bas", "gender": "Masculine", "price": 350, "size": "L", "color": "Argent Métallique", "popularity": 92, "image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80", "tag": "Nouveau", "description": "Finition métallisée argentée avec régulation thermique intégrée."},
    {"id": 4, "name": "Combinaison Néo-Tokyo", "category": "Pièce Unique", "gender": "Feminine", "price": 620, "size": "M", "color": "Cyan Néo", "popularity": 95, "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80", "tag": "Tendance Cyber", "description": "Combinaison intégrale avec liserés lumineux cyan et coutures étanches."},
    {"id": 5, "name": "Cape Solaire Quantique", "category": "Extérieur", "gender": "Omni", "price": 890, "size": "Unique", "color": "Or Solaire", "popularity": 99, "image": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=80", "tag": "Haute Performance", "description": "Cape majestueuse aux reflets dorés captant l'énergie solaire ambiante."},
    {"id": 6, "name": "Blouse Fluorescente Aether", "category": "Haut", "gender": "Feminine", "price": 210, "size": "XS", "color": "Violet Profond", "popularity": 76, "image": "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=600&auto=format&fit=crop&q=80", "tag": "Bio-Textile", "description": "Tissu souple imprégné de pigments bioluminescents violets."},
    {"id": 7, "name": "Manteau Synthétique Boréal", "category": "Extérieur", "gender": "Masculine", "price": 750, "size": "XL", "color": "Blanc Pur", "popularity": 84, "image": "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80", "tag": "Hiver 2026", "description": "Manteau enveloppant blanc immaculé avec isolation thermique active."},
    {"id": 8, "name": "Robe Nanotextile Éthérée", "category": "Haute Couture", "gender": "Feminine", "price": 540, "size": "S", "color": "Holographique", "popularity": 91, "image": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop&q=80", "tag": "Exclusif", "description": "Robe vaporeuse qui réagit aux fréquences sonores de l'environnement."},
    {"id": 9, "name": "Costume Asymétrique Cyber-Executive", "category": "Haute Couture", "gender": "Masculine", "price": 780, "size": "L", "color": "Bleu Nuit", "popularity": 89, "image": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80", "tag": "Business 2026", "description": "Tailleur pantalon ajusté avec nanofilaments conducteurs intégrés."},
    {"id": 10, "name": "Blouson Aviateur Gravitationnel", "category": "Extérieur", "gender": "Masculine", "price": 610, "size": "M", "color": "Noir Onyx", "popularity": 94, "image": "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=600&auto=format&fit=crop&q=80", "tag": "Populaire", "description": "Blouson matelassé haute résistance à mémoire de forme."},
    {"id": 11, "name": "Ensemble Urbain Minimalist Néo", "category": "Bas", "gender": "Omni", "price": 430, "size": "M", "color": "Argent Métallique", "popularity": 87, "image": "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=600&auto=format&fit=crop&q=80", "tag": "Tendance", "description": "Confort absolu et design épuré pour les déplacements en zone urbaine."},
    {"id": 12, "name": "Chemise Fluide Solaire Lumina", "category": "Haut", "gender": "Omni", "price": 260, "size": "S", "color": "Blanc Pur", "popularity": 82, "image": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80", "tag": "Nouveau", "description": "Chemise aérienne tissée avec des micro-capteurs de lumière solaire."}
]


def db_path():
    return os.environ.get("DB_PATH", os.path.join(BASE_DIR, "lumiere.db"))


def connect():
    conn = sqlite3.connect(db_path(), isolation_level=None, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def get_db():
    if "db" not in g:
        g.db = connect()
    return g.db


def close_db(_error=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    conn = connect()
    with open(os.path.join(BASE_DIR, "schema.sql"), encoding="utf-8") as f:
        conn.executescript(f.read())
    if conn.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        conn.execute("BEGIN")
        conn.executemany(
            "INSERT INTO products (id, name, category, gender, price, size, color, popularity, image, tag, description) "
            "VALUES (:id, :name, :category, :gender, :price, :size, :color, :popularity, :image, :tag, :description)",
            PRODUCTS,
        )
        conn.execute("COMMIT")
    conn.close()