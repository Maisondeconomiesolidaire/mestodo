# Mes Todo

Gestion interne des projets, chantiers, tâches et notes de suivi.

## Développement

```bash
npm install
npm run dev
```

Le backend Convex est partagé avec les autres applications GroupeMES. Sa source
canonique reste `/Users/salem/mesoutils/convex` ; ne modifiez pas la copie
locale et ne lancez jamais `convex dev` depuis ce dépôt.

## Vérifications

```bash
npm run typecheck
npm run build
npx tsc -p convex/tsconfig.json --noEmit
```
