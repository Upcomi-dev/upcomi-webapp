This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Alertes email des propositions d’événements

Après l’enregistrement complet d’une proposition depuis le formulaire public,
une alerte est envoyée à `dev@upcomi.cc` via Resend. L’envoi est
effectué côté serveur après la réponse au formulaire, avec `after()` de Next.js.

Configurer uniquement la clé API dans `.env.local` en développement et dans
les variables d’environnement du serveur en production :

```dotenv
RESEND_API_KEY=re_your_api_key
```

- Créer une clé API autorisée à envoyer des emails dans Resend. Cette clé est
  privée : ne pas utiliser le préfixe `NEXT_PUBLIC_` ni committer sa valeur.
- L’expéditeur est `Upcomi <onboarding@resend.dev>`. Aucun domaine personnalisé
  n’est nécessaire pour envoyer à `dev@upcomi.cc`, l’adresse du compte Resend. Resend
  refuse les autres destinataires avec cet expéditeur, même pour une alerte
  interne : [restriction du domaine resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
- Les adresses d’expédition et de destination sont définies dans le module
  `src/lib/email/event-proposal-notification.ts`. Sur un environnement de test,
  ne pas renseigner la clé API pour éviter de déclencher des alertes réelles.
- L’email contient le résumé de la proposition et un lien vers
  `https://app.upcomi.cc/admin?tab=proposals`, qui nécessite une connexion admin.
- Si la clé API manque, l’envoi est ignoré avec un avertissement serveur.
  Les erreurs Resend ou réseau sont journalisées avec l’identifiant de
  l’événement ; la proposition reste enregistrée et le formulaire confirme
  son succès. Aucune relance automatique ni confirmation email au proposant.

Pour vérifier la réception, soumettre une proposition de test sur un environnement
de test configuré, puis contrôler la boîte du destinataire et le journal Resend.
Les tests isolés du flux et des erreurs s’exécutent avec `npm run test:proposal-email`
(Node.js 20 ou ultérieur), sans connexion Supabase ni envoi d’email réel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
