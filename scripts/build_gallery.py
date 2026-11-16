#!/usr/bin/env python3
"""Genere docs/gallery.html : galerie de captures (images embarquees en data URI)."""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCREENS = ROOT / "docs" / "screens"
LOGO = ROOT / "frontend" / "assets" / "logo.png"

SECTIONS = [
    ("Connexion & identité", "Le logo de l’association est affiché dès la connexion ; nom, slogan et couleurs sont modifiables par l’administrateur.", [
        ("01-login", "Connexion — logo et palette issus du logo de l’association"),
        ("15-login-sombre", "Connexion en thème sombre"),
    ]),
    ("Vérification du trésorier", "Le membre soumet sa cotisation dans l’assistance. Le trésorier la vérifie, confirme qu’il a bien perçu l’argent (avec référence de reçu) puis valide — la validation est bloquée tant que la perception n’est pas confirmée.", [
        ("18-tresorier-cotisations-a-traiter", "File du trésorier : membre + assistance pour chaque cotisation à traiter"),
        ("19-tresorier-verification", "Fiche de vérification : cotisation, mode de paiement, référence déclarée"),
        ("20-tresorier-perception", "Confirmation de la perception de l’argent + référence du reçu"),
        ("21-tresorier-validation", "Cotisation validée, compteur du membre incrémenté"),
    ]),
    ("Espace administrateur", "Tableau de bord, assistances, cotisations, demandes et profil.", [
        ("02-accueil-admin", "Tableau de bord administrateur"),
        ("03-assistances-admin", "Assistances (événements) et filtres"),
        ("04-assistance-detail", "Détail d’une assistance : collecte, participants, cotisations"),
        ("05-cloturer-assistance", "Clôture par le gestionnaire (date de clôture)"),
        ("06-cotisations-admin", "Cotisations de l’utilisateur connecté"),
        ("07-demandes-admin", "Demandes d’assistance à traiter"),
        ("08-profil-admin", "Profil, langue, thème, espace administration"),
    ]),
    ("Administration", "Membres, rôles & permissions, types d’assistance, paramètres, journal d’audit.", [
        ("09-membres", "Liste des membres avec cycle d’assistance"),
        ("10-membre-detail", "Fiche membre : réinitialisation, remise à zéro du cycle"),
        ("11-roles", "Rôles & permissions (création de rôle avec attribution des permissions)"),
        ("12-types", "Types d’assistance (créés par les rôles autorisés)"),
        ("13-parametres", "Paramètres : nom, logo, couleurs du logo, règles de solidarité"),
        ("14-audit", "Journal d’audit"),
    ]),
    ("Espace membre", "Première connexion, cotisation à une assistance, éligibilité, historique.", [
        ("22-premiere-connexion-membre", "Première connexion : changement de mot de passe obligatoire"),
        ("23-changement-mot-de-passe", "Choix du nouveau mot de passe"),
        ("24-accueil-membre", "Accueil : cycle de solidarité, statistiques, assistance en cours"),
        ("25-assistances-membre", "Assistances ouvertes"),
        ("26-assistance-membre", "Détail d’une assistance pour le membre"),
        ("27-cotiser", "Soumission de la cotisation (montant, mode, référence)"),
        ("28-assistance-cotisee", "Cotisation soumise — en attente de vérification du trésorier"),
        ("29-demandes-membre", "Demandes du membre et éligibilité"),
        ("30-demande-bloquee", "Demande bloquée : seuil d’assistances non atteint"),
        ("31-cotisations-membre", "Mes cotisations"),
        ("32-profil-membre", "Profil du membre"),
    ]),
    ("Demande d’assistance", "Un membre éligible (2/2 assistances) soumet une demande ; le gestionnaire l’examine.", [
        ("36-demande-nouvelle", "Nouvelle demande : type, motif, éligibilité vérifiée"),
        ("37-demande-envoyee", "Demande envoyée"),
    ]),
    ("Thème sombre", "Thème clair / sombre, mémorisé par utilisateur.", [
        ("16-accueil-sombre", "Tableau de bord en thème sombre"),
        ("17-assistances-sombre", "Assistances en thème sombre"),
    ]),
    ("Version anglaise", "Bascule français / anglais sur toute l’interface.", [
        ("33-profil-english", "Profil en anglais"),
        ("34-accueil-english", "Tableau de bord en anglais"),
        ("35-assistances-english", "Assistances en anglais"),
    ]),
]


def data_uri(path: pathlib.Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def main() -> None:
    logo = data_uri(LOGO) if LOGO.exists() else ""
    parts = [
        """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Makénéné Solidarité — galerie de captures</title>
<style>
  :root { --navy:#14313C; --rose:#D9577A; --green:#2F7A5B; --sand:#A9703F; --bg:#FAF4F2; --surface:#fff; --muted:#6C7B80; --border:#EADCD8; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: var(--bg); color:#152228; }
  header { background: var(--navy); color:#fff; padding: 34px 22px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; }
  header img { width:74px; height:74px; border-radius:18px; border:2px solid rgba(255,255,255,.35); }
  header h1 { margin:0; font-size:26px; letter-spacing:-.4px; }
  header p { margin:6px 0 0; color:#F8C0E8; font-size:14px; }
  main { max-width: 1500px; margin: 0 auto; padding: 26px 18px 60px; }
  section { margin-bottom: 42px; }
  h2 { font-size:20px; margin: 0 0 4px; color: var(--navy); }
  section > p { margin: 0 0 18px; color: var(--muted); font-size:14px; max-width: 900px; line-height:1.55; }
  .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 18px; }
  figure { margin:0; background: var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:0 6px 18px rgba(20,49,60,.06); }
  figure img { width:100%; display:block; }
  figcaption { padding: 10px 12px; font-size:12.5px; color: var(--muted); border-top:1px solid var(--border); line-height:1.45; }
  .intro { background: var(--surface); border:1px solid var(--border); border-radius:16px; padding:18px 20px; margin-bottom:30px; font-size:14px; line-height:1.6; }
  .intro b { color: var(--navy); }
  .pill { display:inline-block; background:#FBE4EA; color:var(--rose); border-radius:999px; padding:3px 10px; font-size:12px; font-weight:700; margin-right:6px; }
  footer { text-align:center; color: var(--muted); font-size:12.5px; padding: 10px 20px 40px; }
</style>
</head>
<body>
<header>
  """ + (f'<img src="{logo}" alt="logo" />' if logo else "") + """
  <div>
    <h1>Makénéné Solidarité</h1>
    <p>Galerie de captures — application web Vue.js + Laravel + PostgreSQL</p>
  </div>
</header>
<main>
  <div class="intro">
    <span class="pill">Nouveau</span><b>Vérification du trésorier</b> — le membre soumet sa cotisation dans l’assistance, le trésorier vérifie la cotisation de ce membre dans l’assistance, confirme qu’il a <b>effectivement perçu l’argent</b> puis valide. La validation est refusée tant que la perception n’est pas confirmée (HTTP 400).<br>
    <span class="pill">Identité</span>Couleurs extraites du logo : bleu pétrole <code>#14313C</code>, rose hibiscus <code>#D9577A</code>, vert feuille <code>#2F7A5B</code>. Nom, logo et couleurs restent modifiables par l’administrateur.
  </div>
"""
    ]

    for title, desc, shots in SECTIONS:
        parts.append(f"  <section>\n    <h2>{title}</h2>\n    <p>{desc}</p>\n    <div class=\"grid\">\n")
        for slug, caption in shots:
            path = SCREENS / f"{slug}.png"
            if not path.exists():
                print("⚠ manquant:", path.name)
                continue
            parts.append(
                f'      <figure><img src="{data_uri(path)}" alt="{caption}" loading="lazy" />'
                f'<figcaption><b>{slug.split("-")[0]}</b> · {caption}</figcaption></figure>\n'
            )
        parts.append("    </div>\n  </section>\n")

    parts.append("  <footer>Captures générées automatiquement sur l’application réelle (390 × 844 px, Playwright).</footer>\n</main>\n</body>\n</html>\n")

    out = ROOT / "docs" / "gallery.html"
    out.write_text("".join(parts), encoding="utf-8")
    print("écrit:", out, f"({out.stat().st_size/1e6:.1f} Mo)")


if __name__ == "__main__":
    main()
