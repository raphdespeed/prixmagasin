# 🛒 PrixMagasin France - Comparateur de Prix Supermarchés (GitHub Pages)

Application web 100% statique et moderne permettant de rechercher et comparer les prix de produits alimentaires entre les grandes enseignes françaises (**Carrefour**, **Auchan**, **E.Leclerc**, **Intermarché**, **Lidl**, **Monoprix**, **Super U**).

Fonctionne **entièrement côté client (Client-Side)** sans nécessiter de serveur backend : parfait pour **GitHub Pages** !

---

## 🌟 Fonctionnalités

1. **Comparateur Multi-Enseignes** :
   * Recherche instantanée par nom de produit, marque ou code-barres (ex : *Nutella, Barilla, Coca-Cola, Beurre Président...*).
   * Mise en avant automatique de l'enseigne **la moins chère** (avec pastille d'économie en € et en %).
   * Photos HD, marques et Nutri-Scores officiels.
2. **Panier Comparatif Intelligent** :
   * Tiroir "Mon Panier" permettant d'ajouter des articles et de comparer automatiquement le coût total dans chaque supermarché.
3. **100% Serverless & GitHub Pages** :
   * Ne nécessite aucun serveur Python ni base de données payante.
   * Interroge directement les APIs ouvertes Open Prices & Open Food Facts.

---

## 🚀 Déploiement sur GitHub Pages

Le projet inclut un workflow GitHub Actions automatisé (`.github/workflows/deploy.yml`).

### Étapes pour publier le site :

1. **Pousser votre code sur votre dépôt GitHub :**
   ```bash
   git add .
   git commit -m "Initial commit - Comparateur PrixMagasin"
   git push origin main
   ```

2. **Activer GitHub Pages dans votre dépôt :**
   * Allez sur votre dépôt GitHub -> **Settings** -> **Pages**.
   * Dans la section **Build and deployment** -> **Source**, sélectionnez : **GitHub Actions**.
   * C'est tout ! À chaque `git push`, GitHub construira et déploiera votre site automatiquement sur `https://<votre-pseudo>.github.io/<nom-du-depot>/`.

---

## 💻 Développement Local

Pour lancer le site sur votre machine :
```bash
cd frontend
npm install
npm run dev
```
Ouvrez [http://localhost:5173](http://localhost:5173) dans votre navigateur.
